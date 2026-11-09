import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import type { DemandSignal } from '../../shared/types.js';
import type { DemandCreate, DemandPatch } from './demand.schemas.js';

export class DemandService {
  constructor(private readonly repos: Repositories) {}

  list(): Promise<DemandSignal[]> {
    return this.repos.demand.list();
  }

  async create(input: DemandCreate): Promise<DemandSignal> {
    await this.validateSignal(input);
    return this.repos.demand.create({ id: `demand-${randomUUID()}`, ...input });
  }

  async update(id: string, patch: DemandPatch): Promise<DemandSignal> {
    const existing = await this.repos.demand.get(id);
    if (!existing) throw AppError.notFound('Demand signal not found.');
    const next: DemandSignal = {
      ...existing,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    };
    await this.validateSignal(next);
    return this.repos.demand.update(next);
  }

  async delete(id: string): Promise<void> {
    if (!(await this.repos.demand.get(id))) throw AppError.notFound('Demand signal not found.');
    await this.repos.demand.delete(id);
  }

  private async validateSignal(
    s: Pick<DemandSignal, 'skillId' | 'effectiveFrom' | 'effectiveTo'>,
  ): Promise<void> {
    const skills = await this.repos.catalog.skills();
    if (!skills.some((k) => k.id === s.skillId)) {
      throw AppError.validation('The demand signal references an unknown skill.', [
        { path: 'skillId', message: `Unknown skill "${s.skillId}".` },
      ]);
    }
    if (s.effectiveTo !== null && s.effectiveTo < s.effectiveFrom) {
      throw AppError.validation('The end date must not be before the start date.', [
        { path: 'effectiveTo', message: 'Must be on or after the start date.' },
      ]);
    }
  }
}
