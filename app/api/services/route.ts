import { NextResponse } from 'next/server';
import { loadNormalizedServices } from '@/lib/smmProvider';

export const dynamic = 'force-dynamic'; // ensure no Next cache

export async function GET() {
  try {
    const data = await loadNormalizedServices();
    // Only return the essentials to the client
    return NextResponse.json({ services: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load services' }, { status: 500 });
  }
}
