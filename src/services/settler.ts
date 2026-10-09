import { SETTLER_URL } from "../config";

export interface SettledResult {
  accuracy: number;
  correct: number;
  compared: number;
  pnlSol: number;
  payoutSol: number;
  actual: number[];
  signature: string;
}
export interface JobView {
  status: "pending" | "settled" | "failed";
  position: string;
  error?: string;
  result?: SettledResult;
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<{ status: number; body: T }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SETTLER_URL}${path}`, { ...init, signal: ctl.signal, headers: { "content-type": "application/json" } });
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    clearTimeout(t);
  }
}

export async function settlerOnline(): Promise<boolean> {
  try {
    const r = await call<{ ok: boolean; feedLive: boolean }>("/health", undefined, 4000);
    return r.status === 200 && r.body.ok && r.body.feedLive;
  } catch {
    return false;
  }
}

/** Hand the drawing to the settler. It checks the hash against the on-chain commitment before accepting. */
export async function registerDrawing(position: string, predicted: number[]): Promise<void> {
  let last = "settler unreachable";
  for (let i = 0; i < 3; i++) {
    try {
      const r = await call<{ error?: string }>("/positions", { method: "POST", body: JSON.stringify({ position, predicted }) });
      if (r.status === 200 || r.status === 202) return;
      last = r.body.error ?? `settler returned ${r.status}`;
      if (r.status !== 404) break; // 404 can just mean the stake transaction is not visible yet
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(last);
}

export async function jobStatus(position: string): Promise<JobView | null> {
  try {
    const r = await call<JobView>(`/positions/${position}`);
    return r.status === 200 ? r.body : null;
  } catch {
    return null;
  }
}
