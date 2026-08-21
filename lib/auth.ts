import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth-config';
import { collections } from './db';
import { ensureSuperAdmin } from './seed-superadmin';
import { ensureDefaults } from './seed-defaults';

void ensureSuperAdmin();
void ensureDefaults();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const { users, profiles } = await collections();
        const user = await users.findOne({ username });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const profile = await profiles.findOne({ userId: user._id });
        const superadminUsername = process.env.SUPERADMIN_USERNAME ?? '';
        return {
          id: user._id!.toString(),
          name: user.displayName || user.username,
          email: user.email,
          username: user.username,
          displayName: user.displayName || user.username,
          role: user.role,
          isSuperAdmin: superadminUsername !== '' && user.username === superadminUsername,
          userType: profile?.userType ?? null,
        };
      },
    }),
  ],
});

