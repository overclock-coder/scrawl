use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("FYHebuyTZwg2JWaHTHtRY7xCYgEHpiX1Frq98Awzkhtu");

/// Smallest stake, in lamports (0.01 SOL).
pub const MIN_AMOUNT: u64 = 10_000_000;
pub const MAX_LEVERAGE: u16 = 100;
/// A position can be settled this many seconds after it opens.
pub const POSITION_DURATION: i64 = 60;
/// Back-to-back positions per batch (a batch is several `open_position` calls in one transaction).
pub const MAX_BATCH: u8 = 5;
pub const BPS: u64 = 10_000;
pub const MAX_FEE_BPS: u16 = 1_000;
pub const DEFAULT_FEE_BPS: u16 = 200;

pub const CONFIG_SEED: &[u8] = b"config";
pub const VAULT_SEED: &[u8] = b"vault";
pub const POSITION_SEED: &[u8] = b"position";

#[program]
pub mod line_futures {
    use super::*;

    /// One-time setup. Funds the vault with its rent-exempt minimum so payouts can never strand it below rent.
    pub fn initialize(ctx: Context<Initialize>, settler: Pubkey, fee_bps: u16) -> Result<()> {
        require!(settler != Pubkey::default(), FuturesError::ZeroAddress);
        require!(fee_bps <= MAX_FEE_BPS, FuturesError::FeeTooHigh);

        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.settler = settler;
        cfg.fee_bps = fee_bps;
        cfg.collected_fees = 0;
        cfg.paused = false;
        cfg.bump = ctx.bumps.config;
        cfg.vault_bump = ctx.bumps.vault;

        let rent = Rent::get()?.minimum_balance(0);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer { from: ctx.accounts.authority.to_account_info(), to: ctx.accounts.vault.to_account_info() },
            ),
            rent,
        )?;

        emit!(SettlerUpdated { old: Pubkey::default(), new: settler });
        Ok(())
    }

    /// Escrow `amount` lamports against a prediction. `slot_index` staggers the start by 60s per slot
    /// so a 1-5 minute batch is up to five of these in one transaction.
    pub fn open_position(
        ctx: Context<OpenPosition>,
        nonce: u64,
        amount: u64,
        leverage: u16,
        prediction_commitment: [u8; 32],
        slot_index: u8,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, FuturesError::Paused);
        require!(amount >= MIN_AMOUNT, FuturesError::AmountBelowMinimum);
        require!((1..=MAX_LEVERAGE).contains(&leverage), FuturesError::InvalidLeverage);
        require!(prediction_commitment != [0u8; 32], FuturesError::EmptyCommitment);
        require!(slot_index < MAX_BATCH, FuturesError::InvalidSlot);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer { from: ctx.accounts.user.to_account_info(), to: ctx.accounts.vault.to_account_info() },
            ),
            amount,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let open_timestamp = now
            .checked_add(i64::from(slot_index) * POSITION_DURATION)
            .ok_or(FuturesError::MathOverflow)?;

        let p = &mut ctx.accounts.position;
        p.user = ctx.accounts.user.key();
        p.nonce = nonce;
        p.amount = amount;
        p.leverage = leverage;
        p.open_timestamp = open_timestamp;
        p.prediction_commitment = prediction_commitment;
        p.is_open = true;
        p.pnl = 0;
        p.actual_price_commitment = [0u8; 32];
        p.close_timestamp = 0;
        p.bump = ctx.bumps.position;

        emit!(PositionOpened {
            position: p.key(),
            user: p.user,
            amount,
            leverage,
            open_timestamp,
            prediction_commitment,
        });
        Ok(())
    }

    /// Settler-only. Records the pnl, takes the fee on profit and pays the user what is left.
    /// Unlike a bare trusted-server call, pnl is bounded so a bad settler cannot mint more than the rules allow.
    pub fn close_position(ctx: Context<ClosePosition>, pnl: i64, actual_price_commitment: [u8; 32]) -> Result<()> {
        require!(actual_price_commitment != [0u8; 32], FuturesError::EmptyCommitment);

        let now = Clock::get()?.unix_timestamp;
        let cfg = &mut ctx.accounts.config;
        let p = &mut ctx.accounts.position;

        require!(p.is_open, FuturesError::AlreadyClosed);
        require!(
            now >= p.open_timestamp.checked_add(POSITION_DURATION).ok_or(FuturesError::MathOverflow)?,
            FuturesError::NotYetClosable
        );

        let amount = i128::from(p.amount);
        let pnl_wide = i128::from(pnl);
        require!(pnl_wide >= -amount, FuturesError::PnlOutOfBounds);
        require!(pnl_wide <= amount * i128::from(p.leverage), FuturesError::PnlOutOfBounds);

        let fee: u64 = if pnl > 0 {
            u64::try_from(pnl).map_err(|_| FuturesError::MathOverflow)?
                .checked_mul(u64::from(cfg.fee_bps))
                .ok_or(FuturesError::MathOverflow)?
                / BPS
        } else {
            0
        };
        cfg.collected_fees = cfg.collected_fees.checked_add(fee).ok_or(FuturesError::MathOverflow)?;

        let payout_wide = amount + pnl_wide - i128::from(fee);
        let payout = if payout_wide > 0 { u64::try_from(payout_wide).map_err(|_| FuturesError::MathOverflow)? } else { 0 };

        p.pnl = pnl;
        p.actual_price_commitment = actual_price_commitment;
        p.is_open = false;
        p.close_timestamp = now;

        // A loss stays in the vault; a payout of zero skips the transfer.
        if payout > 0 {
            pay_from_vault(
                &ctx.accounts.system_program,
                &ctx.accounts.vault,
                &ctx.accounts.user.to_account_info(),
                cfg.vault_bump,
                payout,
            )?;
        }

        emit!(PositionClosed {
            position: p.key(),
            user: p.user,
            pnl,
            payout,
            actual_price_commitment,
            close_timestamp: now,
        });
        Ok(())
    }

    pub fn set_settler(ctx: Context<AdminOnly>, settler: Pubkey) -> Result<()> {
        require!(settler != Pubkey::default(), FuturesError::ZeroAddress);
        let cfg = &mut ctx.accounts.config;
        let old = cfg.settler;
        cfg.settler = settler;
        emit!(SettlerUpdated { old, new: settler });
        Ok(())
    }

    pub fn set_fee_bps(ctx: Context<AdminOnly>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, FuturesError::FeeTooHigh);
        let cfg = &mut ctx.accounts.config;
        let old = cfg.fee_bps;
        cfg.fee_bps = fee_bps;
        emit!(FeeUpdated { old, new: fee_bps });
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        emit!(PausedChanged { paused });
        Ok(())
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        require!(amount <= cfg.collected_fees, FuturesError::InsufficientFees);
        cfg.collected_fees -= amount;
        pay_from_vault(
            &ctx.accounts.system_program,
            &ctx.accounts.vault,
            &ctx.accounts.authority.to_account_info(),
            cfg.vault_bump,
            amount,
        )?;
        emit!(FeesWithdrawn { authority: ctx.accounts.authority.key(), amount });
        Ok(())
    }

    /// Last resort: sweep everything above the rent-exempt minimum to the authority.
    pub fn emergency_withdraw(ctx: Context<WithdrawFees>) -> Result<()> {
        let rent = Rent::get()?.minimum_balance(0);
        let amount = ctx.accounts.vault.lamports().saturating_sub(rent);
        pay_from_vault(
            &ctx.accounts.system_program,
            &ctx.accounts.vault,
            &ctx.accounts.authority.to_account_info(),
            ctx.accounts.config.vault_bump,
            amount,
        )?;
        emit!(FeesWithdrawn { authority: ctx.accounts.authority.key(), amount });
        Ok(())
    }
}

fn pay_from_vault<'info>(
    system: &Program<'info, System>,
    vault: &SystemAccount<'info>,
    to: &AccountInfo<'info>,
    vault_bump: u8,
    amount: u64,
) -> Result<()> {
    let seeds: &[&[u8]] = &[VAULT_SEED, &[vault_bump]];
    system_program::transfer(
        CpiContext::new_with_signer(
            system.to_account_info(),
            Transfer { from: vault.to_account_info(), to: to.clone() },
            &[seeds],
        ),
        amount,
    )
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub settler: Pubkey,
    pub fee_bps: u16,
    pub collected_fees: u64,
    pub paused: bool,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub user: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub leverage: u16,
    pub open_timestamp: i64,
    pub prediction_commitment: [u8; 32],
    pub is_open: bool,
    pub pnl: i64,
    pub actual_price_commitment: [u8; 32],
    pub close_timestamp: i64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct OpenPosition<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [VAULT_SEED], bump = config.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, user.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = settler @ FuturesError::NotSettler)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [VAULT_SEED], bump = config.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [POSITION_SEED, position.user.as_ref(), &position.nonce.to_le_bytes()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
    /// CHECK: only receives lamports, and must be the position's owner.
    #[account(mut, address = position.user @ FuturesError::WrongUser)]
    pub user: AccountInfo<'info>,
    pub settler: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority @ FuturesError::NotAuthority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority @ FuturesError::NotAuthority)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [VAULT_SEED], bump = config.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct PositionOpened {
    pub position: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub leverage: u16,
    pub open_timestamp: i64,
    pub prediction_commitment: [u8; 32],
}

#[event]
pub struct PositionClosed {
    pub position: Pubkey,
    pub user: Pubkey,
    pub pnl: i64,
    pub payout: u64,
    pub actual_price_commitment: [u8; 32],
    pub close_timestamp: i64,
}

#[event]
pub struct SettlerUpdated {
    pub old: Pubkey,
    pub new: Pubkey,
}

#[event]
pub struct FeeUpdated {
    pub old: u16,
    pub new: u16,
}

#[event]
pub struct PausedChanged {
    pub paused: bool,
}

#[event]
pub struct FeesWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum FuturesError {
    #[msg("program is paused")]
    Paused,
    #[msg("amount below minimum")]
    AmountBelowMinimum,
    #[msg("invalid leverage")]
    InvalidLeverage,
    #[msg("empty commitment")]
    EmptyCommitment,
    #[msg("slot index out of range")]
    InvalidSlot,
    #[msg("position already closed")]
    AlreadyClosed,
    #[msg("position not yet closable")]
    NotYetClosable,
    #[msg("pnl outside the allowed range")]
    PnlOutOfBounds,
    #[msg("caller is not the settler")]
    NotSettler,
    #[msg("caller is not the authority")]
    NotAuthority,
    #[msg("account is not the position owner")]
    WrongUser,
    #[msg("address is zero")]
    ZeroAddress,
    #[msg("fee too high")]
    FeeTooHigh,
    #[msg("insufficient collected fees")]
    InsufficientFees,
    #[msg("math overflow")]
    MathOverflow,
}
