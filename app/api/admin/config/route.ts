import { NextRequest, NextResponse } from 'next/server';
import { readAdminConfig } from '@/lib/adminConfig';
import { clearCache } from '@/lib/cache';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cfg = readAdminConfig();
    return NextResponse.json(cfg);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const file = path.resolve(process.cwd(), 'admin', 'services.config.json');
    const pretty = JSON.stringify(body, null, 2);
    // Note: writing to filesystem may not persist on serverless hosts.
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, pretty, 'utf8');
    // Invalidate runtime caches so updated margins/overrides take effect immediately
    try {
      clearCache('providers:normalized:v1');
      clearCache('providers:raw:v2');
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save config' }, { status: 500 });
  }
}
