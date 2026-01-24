import NextAuth from 'next-auth'

async function handler(req: any, res: any) {
  const { default: authOptions } = await import('@/lib/auth');
  return NextAuth(authOptions as any)(req, res);
}

export { handler as GET, handler as POST }
