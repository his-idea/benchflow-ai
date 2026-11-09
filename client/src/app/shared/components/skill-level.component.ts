import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Skill level as five pips plus text ("3 of 5"), so meaning never depends on colour. */
@Component({
  selector: 'app-skill-level',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pips" aria-hidden="true">
      @for (on of pips(); track $index) {
        <span class="pip" [class.on]="on"></span>
      }
    </span>
    <span class="text">{{ level() }} of 5</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pips {
      display: inline-flex;
      gap: 3px;
    }
    .pip {
      width: 14px;
      height: 8px;
      border: 1px solid var(--color-primary);
      border-radius: 2px;
    }
    .pip.on {
      background: var(--color-primary);
    }
    .text {
      min-width: 3.1rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
  `,
})
export class SkillLevelComponent {
  readonly level = input.required<number>();
  protected readonly pips = computed(() => [0, 1, 2, 3, 4].map((i) => i < this.level()));
}
