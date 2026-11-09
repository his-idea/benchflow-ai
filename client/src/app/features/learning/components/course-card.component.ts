import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon.component';
import { RelevanceMeterComponent } from '../../../shared/components/relevance-meter.component';
import type { RecommendedCourse } from '../../../shared/models/api.models';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink, MatButtonModule, IconComponent, RelevanceMeterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [attr.aria-labelledby]="'course-' + rec().course.id">
      <h3 [id]="'course-' + rec().course.id">
        <a [routerLink]="['/learning', rec().course.id]">{{ rec().course.title }}</a>
      </h3>
      <p class="meta">
        {{ rec().course.provider }} · {{ rec().course.level }} ·
        {{ rec().course.durationHours }} hours
      </p>
      <div class="tags">
        @for (tag of skillNames(); track tag) {
          <span class="tag">{{ tag }}</span>
        }
      </div>
      <app-relevance-meter [score]="rec().score" [breakdown]="rec().breakdown" />
      <p class="reason">{{ rec().reasons[0] }}</p>
      <div class="actions">
        @if (inPlan()) {
          <button mat-stroked-button type="button" [disabled]="busy()" (click)="remove.emit(rec())">
            <app-icon name="remove" /> Remove<span class="visually-hidden">
              {{ rec().course.title }}</span
            >
            from plan
          </button>
        } @else {
          <button mat-flat-button type="button" [disabled]="busy()" (click)="add.emit(rec())">
            <app-icon name="add" /> Add<span class="visually-hidden">
              {{ rec().course.title }}</span
            >
            to plan
          </button>
        }
      </div>
    </article>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      height: 100%;
      padding: 1.25rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    h3 {
      margin: 0;
    }
    h3 a {
      color: var(--color-text);
      text-decoration-color: var(--color-primary);
      text-underline-offset: 3px;
    }
    .meta {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .reason {
      margin: 0;
      font-size: 0.9rem;
      flex: 1;
    }
  `,
})
export class CourseCardComponent {
  readonly rec = input.required<RecommendedCourse>();
  readonly skillNames = input<string[]>([]);
  readonly inPlan = input(false);
  readonly busy = input(false);
  readonly add = output<RecommendedCourse>();
  readonly remove = output<RecommendedCourse>();
}
