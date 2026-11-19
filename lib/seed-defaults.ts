import { collections, ensureIndexes } from './db';
import {
  DEFAULT_TAXONOMY,
  DEFAULT_MATERIAL_GROUPS,
  DEFAULT_SERVICE_GROUPS,
  PREDEFINED_CHANNELS,
  DEFAULT_CLAUSE_TEMPLATES,
} from './constants';
import type { IMaterialServiceType } from './types';

let seeded = false;

export async function getOrCreateTaxonomyType(
  category: 'material' | 'service',
  name: string,
  description?: string
): Promise<IMaterialServiceType> {
  const { materialServiceTypes } = await collections();
  const trimmedName = name.trim();
  const existing = await materialServiceTypes.findOne({
    category,
    name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (existing) return existing;

  try {
    const result = await materialServiceTypes.insertOne({
      category,
      name: trimmedName,
      description: description?.trim() || `${trimmedName} (${category})`,
      createdAt: new Date(),
    });
    const created = await materialServiceTypes.findOne({ _id: result.insertedId });
    if (created) return created;
  } catch {
    const raced = await materialServiceTypes.findOne({
      category,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (raced) return raced;
  }
  throw new Error(`Unable to create ${category} type: ${name}`);
}

async function getOrCreateCategoryType(category: 'material' | 'service'): Promise<IMaterialServiceType> {
  const { materialServiceTypes } = await collections();
  const existing = await materialServiceTypes.findOne({ category });
  if (existing) return existing;

  const name = category === 'material' ? 'Materials' : 'Services';
  try {
    const result = await materialServiceTypes.insertOne({
      category,
      name,
      description: `Global ${name.toLowerCase()} groups`,
      createdAt: new Date(),
    });
    const created = await materialServiceTypes.findOne({ _id: result.insertedId });
    if (created) return created;
  } catch {
    const raced = await materialServiceTypes.findOne({ category });
    if (raced) return raced;
  }
  throw new Error(`Unable to create ${category} type`);
}

async function seedGroups(
  type: IMaterialServiceType,
  groups: readonly { name: string; description?: string }[]
) {
  const { materialServiceGroups } = await collections();
  for (const group of groups) {
    const exists = await materialServiceGroups.findOne({ typeId: type._id!, name: group.name });
    if (exists) continue;
    try {
      await materialServiceGroups.insertOne({
        typeId: type._id!,
        name: group.name,
        description: group.description,
        createdAt: new Date(),
      });
    } catch {
      // Unique index race — ignore
    }
  }
}

async function seedMessageChannels() {
  const { messageChannels } = await collections();
  for (const channel of PREDEFINED_CHANNELS) {
    const exists = await messageChannels.findOne({ slug: channel.slug });
    if (exists) {
      if (!exists.isSystem) {
        await messageChannels.updateOne({ _id: exists._id }, { $set: { isSystem: true, kind: channel.kind } });
      }
      continue;
    }
    try {
      await messageChannels.insertOne({
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        kind: channel.kind,
        isSystem: true,
        createdAt: new Date(),
      });
    } catch {
      // Unique slug race — ignore
    }
  }
}

async function seedClauseTemplates() {
  const { clauseTemplates } = await collections();
  const now = new Date();
  for (const tpl of DEFAULT_CLAUSE_TEMPLATES) {
    const exists = await clauseTemplates.findOne({ kind: tpl.kind, isSystem: true });
    if (exists) continue;
    try {
      await clauseTemplates.insertOne({
        kind: tpl.kind,
        title: tpl.title,
        body: tpl.body,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // unique index race
    }
  }
}

export async function ensureCategoryType(category: 'material' | 'service') {
  return getOrCreateCategoryType(category);
}

export async function ensureDefaults() {
  if (seeded) return;
  try {
    await ensureIndexes();
    // Seed multi-discipline root types and groups
    for (const tax of DEFAULT_TAXONOMY) {
      const taxType = await getOrCreateTaxonomyType(tax.category, tax.name, tax.description);
      await seedGroups(taxType, tax.groups);
    }
    // Backward compatibility for legacy default groups
    const materialType = await getOrCreateCategoryType('material');
    const serviceType = await getOrCreateCategoryType('service');
    await seedGroups(materialType, DEFAULT_MATERIAL_GROUPS);
    await seedGroups(serviceType, DEFAULT_SERVICE_GROUPS);
    await seedMessageChannels();
    await seedClauseTemplates();
    seeded = true;
  } catch (err) {
    console.error('[seed] Failed to seed defaults:', err);
  }
}
