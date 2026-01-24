import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import { NextAuthOptions } from 'next-auth'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = String(user.id)
        session.user.role = user.role ?? 'user'
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      try {
        // Ensure a wallet exists for new users
        await prisma.wallet.create({ data: { userId: Number(user.id), balance: 0 } });
      } catch (e) {
        // ignore if wallet already exists or other issues
        // eslint-disable-next-line no-console
        console.warn('createUser event wallet creation failed', String(e));
      }
    }
  },
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default authOptions
