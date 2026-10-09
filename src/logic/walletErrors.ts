export type WalletErrorKind = "cancelled" | "no-wallet" | "failed";

/** Backing out of a wallet surfaces as assorted transport errors; none are real failures. */
export function classifyWalletError(e: unknown): { kind: WalletErrorKind; message: string } {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  const code = (e as { code?: string })?.code;
  if (code === "ERROR_WALLET_NOT_FOUND" || /no wallet|found no installed wallet/i.test(msg))
    return { kind: "no-wallet", message: "No Solana wallet app found on this phone." };
  if (/CLOSED|declined|cancel|user rejected|AUTHORIZATION_FAILED/i.test(msg) || code === "ERROR_AUTHORIZATION_FAILED")
    return { kind: "cancelled", message: "Cancelled in wallet. You can try again." };
  return { kind: "failed", message: msg };
}
