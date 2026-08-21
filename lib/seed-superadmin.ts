import bcrypt from 'bcryptjs';
import { collections, ensureIndexes } from './db';

let seeded = false;

export async function ensureSuperAdmin() {
  if (seeded) return;
  seeded = true;

  const username = process.env.SUPERADMIN_USERNAME;
  const password = process.env.SUPERADMIN_PASSWORD;
  const email = process.env.SUPERADMIN_EMAIL;

  if (!username || !password || !email) {
    console.warn('[seed] SUPERADMIN env vars not set — skipping super-admin seed');
    return;
  }

  try {
    await ensureIndexes();
    const { users } = await collections();
    const existing = await users.findOne({ username });
    if (existing) {
      // Ensure it has admin role
      if (existing.role !== 'admin') {
        await users.updateOne({ username }, { $set: { role: 'admin' } });
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await users.insertOne({
      username,
      email,
      passwordHash,
      displayName: 'Super Admin',
      role: 'admin',
      createdAt: new Date(),
    });
    console.log(`[seed] Super admin '${username}' created.`);
  } catch (err) {
    console.error('[seed] Failed to seed super admin:', err);
  }
}
