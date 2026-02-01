import GoogleProvider from 'next-auth/providers/google'
import { NextAuthOptions } from 'next-auth'

export function getAuthOptions(): NextAuthOptions {
  return {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
      async jwt({ token, user }: { token: any; user: any }) {
        if (user) {
          token.id = user.id
          token.role = user.role ?? 'user'
        }
        return token
      },
      async session({ session, token }: { session: any; token: any }) {
        if (session.user) {
          session.user.id = token.id
          session.user.role = token.role ?? 'user'
        }
        return session
      },
    },
    pages: {
      signIn: '/auth/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
}

export default getAuthOptions()
