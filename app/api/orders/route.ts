import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import { getServerSession } from 'next-auth/next'

// POST /api/orders
// Expects JSON { serviceId, sourceServiceId, quantity, link }
export async function POST(req: Request) {
  try {
    const { default: authOptions } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/prisma');
    const { loadNormalizedServices } = await import('@/lib/smmProvider');
    
    const body = await req.json();
    const { serviceId, sourceServiceId, quantity, link } = body || {};

    // Require authenticated user
    const session = await getServerSession(authOptions as any) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id || session.user?.sub || 0);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session user id' }, { status: 401 });
    }

    const TOPSMM_API_KEY = process.env.TOPSMM_API_KEY || 'd47bf4c56c00880dc987c1debf729b84b86a0f2d';
    // Use v2 endpoint by default (per provider docs)
    const TOPSMM_API_URL = process.env.TOPSMM_API_URL || 'https://topsmm.in/api/v2';

    if (!TOPSMM_API_KEY) {
      return NextResponse.json({ error: 'Server not configured: missing TOPSMM_API_KEY' }, { status: 501 });
    }

    if (!serviceId && !sourceServiceId) {
      return NextResponse.json({ error: 'Missing service id' }, { status: 400 });
    }

    // Compute expected amount from normalized service data (USD per 1000)
    const services = await loadNormalizedServices();
    const svc = services.find((s) => String(s.sourceServiceId) === String(sourceServiceId) || s.id === String(serviceId));
    const qty = Number(quantity || 0);
    let amountCents = 0;
    if (svc && qty > 0) {
      // svc.ratePer1000 is USD per 1000 units. Compute USD amount and convert to cents.
      const usd = (Number(svc.ratePer1000 || 0) / 1000) * qty;
      amountCents = Math.max(0, Math.ceil(usd * 100));
    }

    // Check user wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found for user' }, { status: 402 });
    }
    if (wallet.balance < amountCents) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 402 });
    }

    // Create order record and debit wallet optimistically
    const orderRec = await prisma.order.create({
      data: {
        userId,
        serviceId: String(serviceId ?? sourceServiceId ?? ''),
        quantity: qty,
        amountCents,
        status: 'pending',
      }
    });

    // Debit wallet (simple atomic update)
    await prisma.wallet.update({ where: { userId }, data: { balance: wallet.balance - amountCents } });

    // Build provider request. The exact form depends on provider API; using a common pattern.
    const params = new URLSearchParams();
    // TOPSMM v2 expects: key, action=add, service, url, quantity
    params.append('key', TOPSMM_API_KEY);
    params.append('action', 'add');
    params.append('service', String(sourceServiceId ?? serviceId));
    params.append('quantity', String(quantity ?? 0));
    if (link) {
      // Ensure link is not double-encoded. Try to decode if needed, fall back to original.
      let decoded = String(link);
      try {
        // Only decode if it looks encoded (contains %)
        if (/%[0-9A-Fa-f]{2}/.test(decoded)) decoded = decodeURIComponent(decoded);
      } catch (e) {
        // ignore decode error and keep original
      }
      // Some provider versions expect `url`, others `link` - send both to be compatible
      params.append('url', decoded);
      params.append('link', decoded);
    }

    const endpoint = TOPSMM_API_URL;

    // Prepare a redacted log payload (do NOT log API keys)
    const entries = Array.from(params.entries());
    const redactedEntries = entries.map(([k, v]) => [k, k === 'key' ? 'REDACTED' : v]);
    const logPayload = {
      forwardedAt: new Date().toISOString(),
      endpoint,
      params: Object.fromEntries(redactedEntries),
    };
    try {
      // Console log for quick debugging
      // eslint-disable-next-line no-console
      console.log('[orders] forwarding order to provider:', JSON.stringify(logPayload));
      // Append to a local file for later inspection (one JSON per line)
      await fs.appendFile('order-forward-log.json', JSON.stringify(logPayload) + '\n');
    } catch (e) {
      // ignore logging errors
      // eslint-disable-next-line no-console
      console.warn('[orders] failed to write forward log', String(e));
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await resp.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch (e) { /* keep raw text */ }

    // Log response (redact if necessary)
    const respLog = { receivedAt: new Date().toISOString(), status: resp.status, data: data && typeof data === 'object' ? data : String(data) };
    try {
      // eslint-disable-next-line no-console
      console.log('[orders] provider response:', JSON.stringify(respLog));
      await fs.appendFile('order-forward-log.json', JSON.stringify({ response: respLog }) + '\n');
    } catch (e) {
      // ignore
    }
    // Update order with provider info
    try {
      await prisma.order.update({ where: { id: orderRec.id }, data: { providerResp: typeof data === 'object' ? data : { raw: String(data) }, providerOrderId: (data && (data as any).order) ? String((data as any).order) : undefined, status: resp.status === 200 ? 'submitted' : 'failed' } });
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('Failed to update order record', String(e));
    }

    return NextResponse.json({ status: resp.status, data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
