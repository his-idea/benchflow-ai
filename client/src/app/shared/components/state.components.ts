import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IconComponent } from './icon.component';

/** Loading placeholder. role="status" announces the label politely to assistive technology. */
@Component({
  selector: 'app-loading-state',
  imports: [MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="status">
      <mat-progress-bar mode="indeterminate" aria-label="Loading" />
      <p class="muted">{{ label() }}</p>
    </div>
  `,
  styles: `
    .state {
      padding: 2rem 0;
      max-width: 24rem;
    }
  `,
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}

/** Error panel with a retry action. role="alert" announces failures immediately. */
@Component({
  selector: 'app-error-state',
  imports: [MatButtonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="alert">
      <h2 class="state-title">{{ title() }}</h2>
      <p>{{ message() }}</p>
      @if (retryable()) {
        <button mat-stroked-button type="button" (click)="retry.emit()">
          <app-icon name="refresh" /> Try again
        </button>
      }
    </div>
  `,
  styles: `
    .state {
      padding: 1.25rem 1.5rem;
      border-left: 4px solid var(--color-error);
      background: var(--color-surface);
      max-width: 40rem;
    }
    .state-title {
      margin: 0 0 0.25rem;
      font-size: 1.125rem;
    }
  `,
})
export class ErrorStateComponent {
  readonly title = input("We couldn't load this");
  readonly message = input('Something went wrong. Please try again.');
  readonly retryable = input(true);
  readonly retry = output<void>();
}

/** Empty state: says what is missing and offers the next action through projected content. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state">
      <img src="assets/illustrations/empty-bench.svg" alt="" width="160" height="110" />
      <h2 class="state-title">{{ title() }}</h2>
      <p class="muted">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .state {
      padding: 2rem 0;
      max-width: 32rem;
    }
    .state-title {
      margin: 0.75rem 0 0.25rem;
      font-size: 1.125rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input('');
}
