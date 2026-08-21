import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // Empty providers array for Edge-compatibility in middleware
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.id = u.id;
        token.username = u.username;
        token.displayName = u.displayName;
        token.role = u.role;
        token.isSuperAdmin = u.isSuperAdmin;
        token.userType = u.userType ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).user = {
        id: token.id as string,
        username: token.username as string,
        displayName: token.displayName as string,
        email: token.email as string,
        role: token.role as string,
        isSuperAdmin: token.isSuperAdmin as boolean,
        userType: (token.userType as 'company' | 'vendor' | null) ?? null,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { auth: middlewareAuth } = NextAuth(authConfig);
