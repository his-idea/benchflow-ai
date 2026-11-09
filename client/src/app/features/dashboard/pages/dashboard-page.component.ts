import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MockAuthService } from '../../../core/auth/mock-auth.service';
import { ApiError } from '../../../core/http/api-error';
import { SkillCatalogStore } from '../../../core/services/skill-catalog.store';
import {
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import { SkillLevelComponent } from '../../../shared/components/skill-level.component';
import type { LoadState, RecommendationPage } from '../../../shared/models/api.models';
import { CoursesApiService } from '../../learning/data-access/courses-api.service';
import { PlanStore } from '../../learning-plan/data-access/plan.store';
import { ProfileStore } from '../../profile/data-access/profile.store';

/** Courses at or above this relevance count as "recommended" on the dashboard. */
export const RECOMMENDED_THRESHOLD = 60;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    LoadingStateComponent,
    ErrorStateComponent,
    SkillLevelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly coursesApi = inject(CoursesApiService);
  protected readonly profileStore = inject(ProfileStore);
  protected readonly planStore = inject(PlanStore);
  protected readonly catalog = inject(SkillCatalogStore);
  protected readonly auth = inject(MockAuthService);

  protected readonly recs = signal<RecommendationPage | null>(null);
  protected readonly status = signal<LoadState>('loading');
  protected readonly error = signal<ApiError | null>(null);

  protected readonly nextSkill = computed(() => this.recs()?.nextSkill ?? null);
  protected readonly topCourse = computed(() => {
    const id = this.nextSkill()?.topCourseId;
    return this.recs()?.items.find((r) => r.course.id === id) ?? null;
  });
  protected readonly recommendedCount = computed(
    () => this.recs()?.items.filter((r) => r.score >= RECOMMENDED_THRESHOLD).length ?? 0,
  );
  protected readonly threshold = RECOMMENDED_THRESHOLD;
  protected readonly skills = computed(() =>
    [...(this.profileStore.profile()?.skills ?? [])].sort(
      (a, b) =>
        b.level - a.level ||
        this.catalog.skillName(a.skillId).localeCompare(this.catalog.skillName(b.skillId)),
    ),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      const [recs] = await Promise.all([
        firstValueFrom(this.coursesApi.recommendations({ sort: 'relevance' }, 1, 100)),
        this.profileStore.load(true),
        this.planStore.load(true),
        this.catalog.load(),
      ]);
      const failure = this.profileStore.error() ?? this.planStore.error() ?? this.catalog.error();
      if (failure) throw failure;
      this.recs.set(recs);
      this.error.set(null);
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }
}
