import { NextResponse } from 'next/server';
import { getUsdToInr } from '@/lib/fx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rate = await getUsdToInr();
    return NextResponse.json({ usdToInr: rate });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch fx' }, { status: 500 });
  }
}
