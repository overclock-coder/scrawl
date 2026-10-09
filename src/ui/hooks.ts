import { useEffect, useState } from "react";
import { feed, FeedStatus } from "../services/priceFeed";

export function useFeed() {
  const [price, setPrice] = useState<number | null>(feed.last);
  const [status, setStatus] = useState<FeedStatus>(feed.status);
  useEffect(() => {
    const a = feed.onPrice((p) => setPrice(p));
    const b = feed.onStatus(setStatus);
    return () => {
      a();
      b();
    };
  }, []);
  return { price, status };
}

/** Rolling one-sample-per-second series of the live price, newest last. */
export function useSeries(length: number) {
  const [series, setSeries] = useState<(number | undefined)[]>(() => new Array(length).fill(undefined));
  useEffect(() => {
    const t = setInterval(() => {
      const p = feed.last ?? undefined;
      setSeries((s) => [...s.slice(1), p]);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return series;
}

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
export const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
