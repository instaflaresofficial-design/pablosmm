import { NextResponse } from 'next/server';
import { getUsdToInr } from '@/lib/fx';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // Allow clearing server-side FX cache via ?clear=1 for debugging
    if (url.searchParams.get('clear') === '1') {
      clearCache('fx:usd-inr:v1');
    }
    const rate = await getUsdToInr();
    return NextResponse.json({ usdToInr: rate });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch fx' }, { status: 500 });
  }
}
