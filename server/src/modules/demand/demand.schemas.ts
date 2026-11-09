import { z } from 'zod';
import { DEMAND_LEVELS } from '../../shared/types.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.');

export const demandCreateSchema = z
  .object({
    skillId: z.string().trim().min(1).max(60),
    demandLevel: z.enum(DEMAND_LEVELS),
    source: z.string().trim().min(1).max(100),
    effectiveFrom: isoDate,
    effectiveTo: isoDate.nullable().default(null),
  })
  .strict();

export const demandPatchSchema = demandCreateSchema.partial().strict();

export type DemandCreate = z.infer<typeof demandCreateSchema>;
export type DemandPatch = z.infer<typeof demandPatchSchema>;
