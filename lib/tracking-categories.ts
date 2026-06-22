import type { TrackingCategory } from '@/types'

/**
 * Visual config for each time-tracking category.
 * Categories are stored as text (not enum) in time_entries.category,
 * matching the list in database-schema.md: coding, studying, gym, admin, social_media, personal.
 *
 * Social media gets no special visual treatment — it's the same weight as any other
 * category. No guilt mechanics. See privacy-and-friend-safety.md.
 */
export const TRACKING_CATEGORY_CONFIG: Record<TrackingCategory, { label: string; color: string }> = {
  coding:       { label: 'Coding',        color: '#2DD4BF' },
  studying:     { label: 'Studying',      color: '#D9A653' },
  gym:          { label: 'Gym',           color: '#D08B68' },
  admin:        { label: 'Admin',         color: '#8B8B85' },
  social_media: { label: 'Social Media',  color: '#8B8B85' },
  personal:     { label: 'Personal',      color: '#8B8B85' },
}

export const ALL_TRACKING_CATEGORIES: TrackingCategory[] = [
  'coding', 'studying', 'gym', 'admin', 'social_media', 'personal',
]
