import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ScoreFactor } from '../models/api.models';

/**
 * Course relevance meter. The number is always printed as text and the bar is a labelled meter,
 * so nothing relies on colour alone. Segments encode each factor's share of the score; the
 * expandable list gives the same information in words.
 */
@Component({
  selector: 'app-relevance-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meter">
      <div class="meter-head">
        <span class="meter-value">{{ score() }}%</span>&ngsp;<span class="meter-label"
          >course relevance</span
        >
      </div>
      <div
        class="bar"
        role="meter"
        aria-label="Course relevance"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="score()"
        [attr.aria-valuetext]="score() + ' percent course relevance'"
      >
        @for (seg of segments(); track seg.factor) {
          <span class="seg" [class]="'seg seg-' + seg.index" [style.width.%]="seg.points"></span>
        }
      </div>
      @if (showBreakdown() && breakdown().length > 0) {
        <details class="breakdown">
          <summary>How this is calculated</summary>
          <ul>
            @for (f of breakdown(); track f.factor) {
              <li>
                <span>{{ f.label }}</span
                >&ngsp;<span class="pts">{{ f.points }} of {{ f.weight * 100 }} points</span>
              </li>
            }
          </ul>
        </details>
      }
    </div>
  `,
  styles: `
    .meter-head {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .meter-value {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }
    .meter-label {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .bar {
      display: flex;
      height: 10px;
      margin-top: 0.4rem;
      background: var(--color-track);
      border-radius: 2px;
      overflow: hidden;
    }
    .seg {
      height: 100%;
      border-right: 1px solid var(--color-surface);
    }
    .seg-0 {
      background: #4c1d95;
    }
    .seg-1 {
      background: #6d28d9;
    }
    .seg-2 {
      background: repeating-linear-gradient(45deg, #7c3aed 0 3px, #a78bfa 3px 6px);
    }
    .seg-3 {
      background: #8b5cf6;
    }
    .seg-4 {
      background: repeating-linear-gradient(90deg, #a78bfa 0 3px, #c4b5fd 3px 6px);
    }
    .seg-5 {
      background: #c4b5fd;
    }
    .breakdown {
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }
    .breakdown summary {
      cursor: pointer;
      color: var(--color-primary);
      width: fit-content;
    }
    .breakdown ul {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
    }
    .breakdown li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .pts {
      color: var(--color-text-muted);
      white-space: nowrap;
    }
  `,
})
export class RelevanceMeterComponent {
  readonly score = input.required<number>();
  readonly breakdown = input<ScoreFactor[]>([]);
  readonly showBreakdown = input(false);

  protected readonly segments = computed(() =>
    this.breakdown().map((f, index) => ({ factor: f.factor, index, points: f.points })),
  );
}
