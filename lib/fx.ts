import { getCache, setCache } from './cache';

export async function getUsdToInr(): Promise<number> {
  const key = 'fx:usd-inr:v1';
  const cached = getCache<number>(key);
  if (cached) return cached;
  const FALLBACK = 83.0;
  // Prefer OpenER (open.er-api.com) then exchangerate.host as reliable JSON sources
  try {
    const res1 = await fetch('https://open.er-api.com/v6/latest/USD');
    const j1 = await res1.json();
    const rate1 = j1?.rates?.INR;
    if (typeof rate1 === 'number' && isFinite(rate1) && rate1 > 0) {
      const rounded = Number(rate1.toFixed(2));
      setCache(key, rounded, 5 * 60 * 1000);
      return rounded;
    }
  } catch {
    // ignore
  }
  try {
    const res2 = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR');
    const j2 = await res2.json();
    const rate2 = j2?.rates?.INR;
    if (typeof rate2 === 'number' && isFinite(rate2) && rate2 > 0) {
      const rounded = Number(rate2.toFixed(2));
      setCache(key, rounded, 5 * 60 * 1000);
      return rounded;
    }
  } catch {
    // ignore
  }
  // Return fallback so server-side conversions still work when external API fails
  const roundedFallback = Number(FALLBACK.toFixed(2));
  setCache(key, roundedFallback, 5 * 60 * 1000);
  return roundedFallback;
}
