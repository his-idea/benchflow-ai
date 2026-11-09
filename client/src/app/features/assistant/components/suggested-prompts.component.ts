import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

export const SUGGESTED_PROMPTS = [
  'What should I learn next?',
  'Which course best matches my profile?',
  'How do certification vouchers work?',
] as const;

@Component({
  selector: 'app-suggested-prompts',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prompts" role="group" aria-label="Suggested questions">
      @for (prompt of prompts; track prompt) {
        <button
          mat-stroked-button
          type="button"
          [disabled]="disabled()"
          (click)="pick.emit(prompt)"
        >
          {{ prompt }}
        </button>
      }
      <button mat-stroked-button type="button" [disabled]="disabled()" (click)="plan.emit()">
        Create a four-week learning plan
      </button>
    </div>
  `,
  styles: `
    .prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class SuggestedPromptsComponent {
  protected readonly prompts = SUGGESTED_PROMPTS;
  readonly disabled = input(false);
  readonly pick = output<string>();
  readonly plan = output<void>();
}
