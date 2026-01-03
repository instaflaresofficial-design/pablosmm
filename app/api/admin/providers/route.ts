import { NextRequest, NextResponse } from 'next/server';
import { readProviders, upsertProvider, removeProvider } from '@/lib/providersConfig';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = readProviders();
    // Do not expose API keys directly in list; mask them
    const safe = data.providers.map(p => ({
      ...p,
      apiKey: p.apiKey ? '••••••••' : '',
    }));
    return NextResponse.json({ providers: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read providers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.key || !body.apiUrl) {
      return NextResponse.json({ error: 'key and apiUrl are required' }, { status: 400 });
    }
    const saved = upsertProvider({
      key: String(body.key),
      name: body.name ? String(body.name) : undefined,
      apiUrl: String(body.apiUrl),
      apiKey: String(body.apiKey || ''),
      enabled: body.enabled !== false,
      currency: body.currency === 'INR' ? 'INR' : 'USD',
    });
    try { clearCache('providers:raw:v2'); clearCache('providers:normalized:v1'); } catch {}
    return NextResponse.json({ ok: true, providers: saved.providers.map(p => ({ ...p, apiKey: '••••••••' })) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save provider' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });
    const saved = removeProvider(key);
    try { clearCache('providers:raw:v2'); clearCache('providers:normalized:v1'); } catch {}
    return NextResponse.json({ ok: true, providers: saved.providers.map(p => ({ ...p, apiKey: '••••••••' })) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete provider' }, { status: 500 });
  }
}
