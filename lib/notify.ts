import { ObjectId } from 'mongodb';
import { collections } from './db';
import type { NotificationType } from './types';

export async function notify(input: {
  profileId: ObjectId;
  type: NotificationType;
  title: string;
  content?: string;
  relatedId?: ObjectId;
  relatedType?: string;
}) {
  const { notifications } = await collections();
  await notifications.insertOne({
    profileId: input.profileId,
    type: input.type,
    title: input.title,
    content: input.content,
    relatedId: input.relatedId,
    relatedType: input.relatedType,
    isRead: false,
    createdAt: new Date(),
  });
}
