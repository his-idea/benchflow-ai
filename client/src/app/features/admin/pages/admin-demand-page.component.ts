import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/services/notification.service';
import { SkillCatalogStore } from '../../../core/services/skill-catalog.store';
import { ConfirmService } from '../../../shared/components/confirm-dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import {
  DEMAND_LEVELS,
  type DemandInput,
  type DemandLevel,
  type DemandSignal,
  type LoadState,
} from '../../../shared/models/api.models';
import { AdminApiService } from '../data-access/admin-api.service';

/** The end date, when given, must not be before the start date. */
const dateRange = (group: AbstractControl): ValidationErrors | null => {
  const from = group.get('effectiveFrom')?.value as string;
  const to = group.get('effectiveTo')?.value as string;
  return from && to && to < from ? { dateRange: true } : null;
};

@Component({
  selector: 'app-admin-demand-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    IconComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-demand-page.component.html',
  styleUrl: './admin-page.scss',
})
export class AdminDemandPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  protected readonly catalog = inject(SkillCatalogStore);

  protected readonly levels = DEMAND_LEVELS;
  protected readonly signals = signal<DemandSignal[]>([]);
  protected readonly status = signal<LoadState>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly editing = signal<DemandSignal | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected readonly form = new FormGroup(
    {
      skillId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      demandLevel: new FormControl<DemandLevel>('medium', { nonNullable: true }),
      source: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      effectiveFrom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      effectiveTo: new FormControl('', { nonNullable: true }),
    },
    { validators: [dateRange] },
  );

  ngOnInit(): void {
    void this.catalog.load();
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      this.signals.set((await firstValueFrom(this.api.demand())).items);
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }

  protected openNew(): void {
    this.form.reset({ demandLevel: 'medium' });
    this.serverErrors.set([]);
    this.editing.set('new');
  }

  protected openEdit(s: DemandSignal): void {
    this.form.reset({ ...s, effectiveTo: s.effectiveTo ?? '' });
    this.serverErrors.set([]);
    this.editing.set(s);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const input: DemandInput = {
      skillId: v.skillId,
      demandLevel: v.demandLevel,
      source: v.source,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo || null,
    };
    const target = this.editing();
    this.saving.set(true);
    this.serverErrors.set([]);
    try {
      if (target === 'new') await firstValueFrom(this.api.createDemand(input));
      else if (target) await firstValueFrom(this.api.updateDemand(target.id, input));
      this.notify.success('Saved the demand signal. Recommendations now use it.');
      this.editing.set(null);
      await this.load();
    } catch (e) {
      if (e instanceof ApiError && e.details.length > 0)
        this.serverErrors.set(e.details.map((d) => d.message));
      else this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(s: DemandSignal): Promise<void> {
    const name = this.catalog.skillName(s.skillId);
    const ok = await this.confirm.ask({
      title: 'Delete this demand signal?',
      message: `The ${s.demandLevel} demand signal for ${name} will be removed from recommendations.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteDemand(s.id));
      this.notify.success('Deleted the demand signal.');
      await this.load();
    } catch (e) {
      this.notify.error(e);
    }
  }
}
