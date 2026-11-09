import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import type { UserProfile } from '../../shared/types.js';
import type { ProfilePatch } from './profile.schemas.js';

export class ProfileService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(userId: string): Promise<UserProfile> {
    const profile = await this.repos.profiles.get(userId);
    if (!profile) throw AppError.notFound('Profile not found.');
    return profile;
  }

  async update(userId: string, patch: ProfilePatch): Promise<UserProfile> {
    const profile = await this.get(userId);
    const [skills, roles] = await Promise.all([
      this.repos.catalog.skills(),
      this.repos.catalog.roles(),
    ]);
    const skillIds = new Set(skills.map((s) => s.id));
    const problems: { path: string; message: string }[] = [];

    if (patch.targetRole !== undefined && !roles.some((r) => r.id === patch.targetRole)) {
      problems.push({ path: 'targetRole', message: 'Choose one of the available target roles.' });
    }
    patch.interests?.forEach((id, i) => {
      if (!skillIds.has(id))
        problems.push({ path: `interests.${i}`, message: `Unknown skill "${id}".` });
    });
    if (patch.interests && new Set(patch.interests).size !== patch.interests.length) {
      problems.push({ path: 'interests', message: 'Interests must not contain duplicates.' });
    }
    patch.skills?.forEach((s, i) => {
      if (!skillIds.has(s.skillId))
        problems.push({ path: `skills.${i}.skillId`, message: `Unknown skill "${s.skillId}".` });
    });
    if (patch.skills && new Set(patch.skills.map((s) => s.skillId)).size !== patch.skills.length) {
      problems.push({ path: 'skills', message: 'Each skill may appear only once.' });
    }
    if (problems.length > 0)
      throw AppError.validation('The profile contains invalid values.', problems);

    const timestamp = this.now().toISOString();
    const next: UserProfile = { ...profile };
    if (patch.targetRole !== undefined) next.targetRole = patch.targetRole;
    if (patch.interests !== undefined) next.interests = patch.interests;
    if (patch.weeklyHours !== undefined) next.weeklyHours = patch.weeklyHours;
    if (patch.preferredLearningStyle !== undefined)
      next.preferredLearningStyle = patch.preferredLearningStyle;
    if (patch.skills !== undefined) {
      // Keep the original timestamp for unchanged levels so "last updated" stays meaningful.
      next.skills = patch.skills.map((s) => {
        const existing = profile.skills.find((e) => e.skillId === s.skillId);
        return {
          skillId: s.skillId,
          level: s.level,
          evidenceType: 'self-assessed' as const,
          lastUpdatedAt:
            existing && existing.level === s.level ? existing.lastUpdatedAt : timestamp,
        };
      });
    }
    return this.repos.profiles.save(next);
  }
}
