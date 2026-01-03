import { getCache, setCache } from './cache';

export async function getUsdToInr(): Promise<number | null> {
  const key = 'fx:usd-inr:v1';
  const cached = getCache<number>(key);
  if (cached) return cached;
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR');
    const j = await res.json();
    const rate = j?.rates?.INR;
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
      setCache(key, rate, 5 * 60 * 1000);
      return rate;
    }
  } catch {
    // ignore
  }
  return null;
}
