import { NextResponse } from 'next/server';
import { aggregateRawServices } from '@/lib/smmProvider';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await aggregateRawServices();
    return NextResponse.json({ services: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load raw services' }, { status: 500 });
  }
}
