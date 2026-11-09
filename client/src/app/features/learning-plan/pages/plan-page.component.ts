import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../../shared/components/confirm-dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import {
  PLAN_ITEM_STATUSES,
  PLAN_WEEKS,
  type PlanItemStatus,
  type PlanItemView,
} from '../../../shared/models/api.models';
import { PlanDraftEditorComponent } from '../components/plan-draft-editor.component';
import { PlanDraftStore } from '../data-access/plan-draft.store';
import { PlanStore } from '../data-access/plan.store';

@Component({
  selector: 'app-plan-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
    IconComponent,
    PlanDraftEditorComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-page.component.html',
  styleUrl: './plan-page.component.scss',
})
export class PlanPageComponent implements OnInit {
  protected readonly store = inject(PlanStore);
  protected readonly drafts = inject(PlanDraftStore);
  private readonly confirm = inject(ConfirmService);

  protected readonly statuses = PLAN_ITEM_STATUSES;
  protected readonly weekChoices = PLAN_WEEKS;
  protected readonly statusLabel: Record<PlanItemStatus, string> = {
    planned: 'Planned',
    'in-progress': 'In progress',
    completed: 'Completed',
  };

  ngOnInit(): void {
    void this.store.load(true);
  }

  protected async remove(item: PlanItemView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove this course?',
      message: `"${item.courseTitle}" will be removed from your plan.`,
      confirmLabel: 'Remove',
    });
    if (ok) await this.store.removeItem(item.id, item.courseTitle);
  }

  protected async generate(): Promise<void> {
    await this.drafts.generate();
  }
}
