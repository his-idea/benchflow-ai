import { z } from 'zod';
import { LEARNING_STYLES } from '../../shared/types.js';

export const profilePatchSchema = z
  .object({
    targetRole: z.string().trim().min(1).max(60),
    interests: z.array(z.string().trim().min(1).max(60)).max(20),
    weeklyHours: z.number().min(0).max(40),
    preferredLearningStyle: z.enum(LEARNING_STYLES),
    skills: z
      .array(
        z.object({
          skillId: z.string().trim().min(1).max(60),
          level: z.number().int().min(0).max(5),
        }),
      )
      .max(60),
  })
  .partial()
  .strict();

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
