import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

export async function POST(req: Request) {
  try {
    const { prisma } = await import('@/lib/prisma');
    const { default: authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = ((session?.user as any)?.role) || 'user'
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { userId, amount } = body || {}
    if (!userId || amount === undefined) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const amt = Number(amount)
    if (!Number.isFinite(amt) || Math.abs(amt) <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    const cents = Math.round(amt * 100)

    // Ensure wallet exists
    const wallet = await prisma.wallet.upsert({
      where: { userId: Number(userId) },
      update: { balance: { increment: cents } as any },
      create: { userId: Number(userId), balance: cents },
    })

    return NextResponse.json({ success: true, balance: wallet.balance })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
