import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, ensureProfileForUser } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  let profile = await getProfileForUser(auth.user.id);
  if (!profile && (auth.user.role === 'admin' || auth.user.isSuperAdmin)) {
    profile = await ensureProfileForUser(auth.user);
  }
  if (!profile) return NextResponse.json([]);

  const { messages, profiles } = await collections();
  const allMessages = await messages.find({
    kind: { $in: ['dm', 'offer_thread'] },
    $or: [
      { senderProfileId: profile._id! },
      { receiverProfileId: profile._id! },
    ],
  }).sort({ createdAt: -1 }).toArray();

  const conversationMap = new Map<string, typeof allMessages[0]>();
  for (const msg of allMessages) {
    const partnerId = msg.senderProfileId?.toString() === profile._id!.toString()
      ? msg.receiverProfileId?.toString()
      : msg.senderProfileId?.toString();
    if (!partnerId || conversationMap.has(partnerId)) continue;
    conversationMap.set(partnerId, msg);
  }

  const conversations = [];
  for (const [partnerId, lastMsg] of conversationMap) {
    const partner = await profiles.findOne({ _id: new ObjectId(partnerId) });
    const unreadCount = await messages.countDocuments({
      kind: { $in: ['dm', 'offer_thread'] },
      senderProfileId: new ObjectId(partnerId),
      receiverProfileId: profile._id!,
      isRead: false,
    });
    conversations.push({ partnerId, partner, lastMessage: lastMsg, unreadCount });
  }

  return NextResponse.json(conversations);
}
