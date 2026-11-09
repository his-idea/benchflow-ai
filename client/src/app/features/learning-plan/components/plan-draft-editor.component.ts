import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IconComponent } from '../../../shared/components/icon.component';
import { PLAN_WEEKS } from '../../../shared/models/api.models';
import { PlanDraftStore } from '../data-access/plan-draft.store';
import { PlanStore } from '../data-access/plan.store';

/** Edit an assistant-generated draft (title, order, weeks, removals) before saving it as the plan. */
@Component({
  selector: 'app-plan-draft-editor',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-draft-editor.component.html',
  styleUrl: './plan-draft-editor.component.scss',
})
export class PlanDraftEditorComponent {
  protected readonly draft = inject(PlanDraftStore);
  protected readonly plan = inject(PlanStore);
  protected readonly weeks = PLAN_WEEKS;
  readonly saved = output<void>();

  protected async save(): Promise<void> {
    if (await this.draft.save()) this.saved.emit();
  }

  protected onTitle(event: Event): void {
    this.draft.setTitle((event.target as HTMLInputElement).value);
  }
}
