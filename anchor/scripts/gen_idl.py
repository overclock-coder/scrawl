#!/usr/bin/env python3
"""Writes idl/line_futures.json (Anchor 0.30 format). Used because `anchor idl build` needs an older Rust toolchain
than the one installed; keep this in step with programs/line_futures/src/lib.rs."""
import hashlib, json, pathlib

PID = "FYHebuyTZwg2JWaHTHtRY7xCYgEHpiX1Frq98Awzkhtu"
disc = lambda kind, name: list(hashlib.sha256(f"{kind}:{name}".encode()).digest()[:8])
pk, u64, u16, i64, u8, b = "pubkey", "u64", "u16", "i64", "u8", "bool"
c32 = {"array": ["u8", 32]}

def acct(name, writable=False, signer=False, pda=None, address=None, relations=None):
    a = {"name": name}
    if writable: a["writable"] = True
    if signer: a["signer"] = True
    if pda: a["pda"] = {"seeds": pda}
    if address: a["address"] = address
    if relations: a["relations"] = relations
    return a

SYS = acct("system_program", address="11111111111111111111111111111111")
cfg_seed = [{"kind": "const", "value": list(b"config")}]
vault_seed = [{"kind": "const", "value": list(b"vault")}]
CFG = lambda w=False, rel=None: acct("config", writable=w, pda=cfg_seed, relations=rel)
VAULT = acct("vault", writable=True, pda=vault_seed)
arg = lambda n, t: {"name": n, "type": t}
ix = lambda name, accounts, args: {"name": name, "discriminator": disc("global", name), "accounts": accounts, "args": args}

instructions = [
    ix("initialize", [CFG(True), VAULT, acct("authority", True, True), SYS], [arg("settler", pk), arg("fee_bps", u16)]),
    ix("open_position", [CFG(), VAULT,
        acct("position", True, pda=[{"kind": "const", "value": list(b"position")},
                                    {"kind": "account", "path": "user"},
                                    {"kind": "arg", "path": "nonce"}]),
        acct("user", True, True), SYS],
       [arg("nonce", u64), arg("amount", u64), arg("leverage", u16), arg("prediction_commitment", c32), arg("slot_index", u8)]),
    ix("close_position", [CFG(True), VAULT,
        acct("position", True, pda=[{"kind": "const", "value": list(b"position")},
                                    {"kind": "account", "path": "position.user", "account": "Position"},
                                    {"kind": "account", "path": "position.nonce", "account": "Position"}]),
        acct("user", True), acct("settler", signer=True), SYS],
       [arg("pnl", i64), arg("actual_price_commitment", c32)]),
    ix("set_settler", [CFG(True), acct("authority", signer=True)], [arg("settler", pk)]),
    ix("set_fee_bps", [CFG(True), acct("authority", signer=True)], [arg("fee_bps", u16)]),
    ix("set_paused", [CFG(True), acct("authority", signer=True)], [arg("paused", b)]),
    ix("withdraw_fees", [CFG(True), VAULT, acct("authority", True, True), SYS], [arg("amount", u64)]),
    ix("emergency_withdraw", [CFG(True), VAULT, acct("authority", True, True), SYS], []),
]

def struct(name, fields):
    return {"name": name, "type": {"kind": "struct", "fields": [{"name": n, "type": t} for n, t in fields]}}

types = [
    struct("Config", [("authority", pk), ("settler", pk), ("fee_bps", u16), ("collected_fees", u64), ("paused", b), ("bump", u8), ("vault_bump", u8)]),
    struct("Position", [("user", pk), ("nonce", u64), ("amount", u64), ("leverage", u16), ("open_timestamp", i64),
                        ("prediction_commitment", c32), ("is_open", b), ("pnl", i64), ("actual_price_commitment", c32),
                        ("close_timestamp", i64), ("bump", u8)]),
    struct("PositionOpened", [("position", pk), ("user", pk), ("amount", u64), ("leverage", u16), ("open_timestamp", i64), ("prediction_commitment", c32)]),
    struct("PositionClosed", [("position", pk), ("user", pk), ("pnl", i64), ("payout", u64), ("actual_price_commitment", c32), ("close_timestamp", i64)]),
    struct("SettlerUpdated", [("old", pk), ("new", pk)]),
    struct("FeeUpdated", [("old", u16), ("new", u16)]),
    struct("PausedChanged", [("paused", b)]),
    struct("FeesWithdrawn", [("authority", pk), ("amount", u64)]),
]

errors = ["Paused:program is paused", "AmountBelowMinimum:amount below minimum", "InvalidLeverage:invalid leverage",
          "EmptyCommitment:empty commitment", "InvalidSlot:slot index out of range", "AlreadyClosed:position already closed",
          "NotYetClosable:position not yet closable", "PnlOutOfBounds:pnl outside the allowed range",
          "NotSettler:caller is not the settler", "NotAuthority:caller is not the authority",
          "WrongUser:account is not the position owner", "ZeroAddress:address is zero", "FeeTooHigh:fee too high",
          "InsufficientFees:insufficient collected fees", "MathOverflow:math overflow"]

idl = {
    "address": PID,
    "metadata": {"name": "line_futures", "version": "0.1.0", "spec": "0.1.0"},
    "instructions": instructions,
    "accounts": [{"name": n, "discriminator": disc("account", n)} for n in ("Config", "Position")],
    "events": [{"name": n, "discriminator": disc("event", n)} for n in ("PositionOpened", "PositionClosed", "SettlerUpdated", "FeeUpdated", "PausedChanged", "FeesWithdrawn")],
    "errors": [{"code": 6000 + i, "name": e.split(":")[0], "msg": e.split(":")[1]} for i, e in enumerate(errors)],
    "types": types,
}
out = pathlib.Path(__file__).resolve().parent.parent / "idl" / "line_futures.json"
out.write_text(json.dumps(idl, indent=2) + "\n")
print("wrote", out)
