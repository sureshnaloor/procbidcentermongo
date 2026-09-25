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
    const { users, profiles } = await collections();
    let user = await users.findOne({ username });
    if (user) {
      if (user.role !== 'admin') {
        await users.updateOne({ username }, { $set: { role: 'admin' } });
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const res = await users.insertOne({
        username,
        email,
        passwordHash,
        displayName: 'Super Admin',
        role: 'admin',
        createdAt: new Date(),
      });
      user = await users.findOne({ _id: res.insertedId });
      console.log(`[seed] Super admin '${username}' created.`);
    }

    if (user) {
      const existingProfile = await profiles.findOne({ userId: user._id });
      if (!existingProfile) {
        const now = new Date();
        await profiles.insertOne({
          userId: user._id,
          userType: 'admin',
          companyName: 'Super Admin',
          contactPerson: 'Super Admin',
          isVerified: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  } catch (err) {
    console.error('[seed] Failed to seed super admin:', err);
  }
}
