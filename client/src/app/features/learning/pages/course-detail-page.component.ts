import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/services/notification.service';
import { SkillCatalogStore } from '../../../core/services/skill-catalog.store';
import { IconComponent } from '../../../shared/components/icon.component';
import { RelevanceMeterComponent } from '../../../shared/components/relevance-meter.component';
import {
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import type { LoadState, RecommendedCourse } from '../../../shared/models/api.models';
import { PlanStore } from '../../learning-plan/data-access/plan.store';
import { CoursesApiService } from '../data-access/courses-api.service';
import { FeedbackApiService } from '../data-access/feedback-api.service';

@Component({
  selector: 'app-course-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    IconComponent,
    RelevanceMeterComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail-page.component.html',
  styleUrl: './course-detail-page.component.scss',
})
export class CourseDetailPageComponent implements OnInit {
  /** Bound from the :courseId route parameter (withComponentInputBinding). */
  readonly courseId = input.required<string>();

  private readonly api = inject(CoursesApiService);
  private readonly feedbackApi = inject(FeedbackApiService);
  private readonly notify = inject(NotificationService);
  protected readonly catalog = inject(SkillCatalogStore);
  protected readonly plan = inject(PlanStore);

  protected readonly rec = signal<RecommendedCourse | null>(null);
  protected readonly status = signal<LoadState>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly feedback = signal<'none' | 'sending' | 'sent'>('none');
  protected readonly inPlan = computed(() => this.plan.inPlan(this.courseId()));

  ngOnInit(): void {
    void this.catalog.load();
    void this.plan.load();
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      this.rec.set(await firstValueFrom(this.api.recommendation(this.courseId())));
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }

  protected names(ids: string[]): string[] {
    return ids.map((id) => this.catalog.skillName(id));
  }

  protected toggle(rec: RecommendedCourse): void {
    void (this.inPlan()
      ? this.plan.removeCourse(rec.course.id, rec.course.title)
      : this.plan.addCourse(rec.course.id, rec.course.title));
  }

  protected async rate(helpful: boolean): Promise<void> {
    this.feedback.set('sending');
    try {
      await firstValueFrom(
        this.feedbackApi.submit({
          targetType: 'recommendation',
          targetId: this.courseId(),
          helpful,
        }),
      );
      this.feedback.set('sent');
    } catch (e) {
      this.feedback.set('none');
      this.notify.error(e);
    }
  }
}
