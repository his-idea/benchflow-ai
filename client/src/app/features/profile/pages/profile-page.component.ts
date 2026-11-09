import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/services/notification.service';
import { SkillCatalogStore } from '../../../core/services/skill-catalog.store';
import { IconComponent } from '../../../shared/components/icon.component';
import {
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import {
  LEARNING_STYLES,
  type LearningStyle,
  type UserProfile,
} from '../../../shared/models/api.models';
import { ProfileStore } from '../data-access/profile.store';

type SkillRow = FormGroup<{ skillId: FormControl<string>; level: FormControl<number> }>;

export const LEVEL_LABELS = ['None', 'Aware', 'Basic', 'Working', 'Advanced', 'Expert'] as const;

@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    IconComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly catalog = inject(SkillCatalogStore);
  private readonly notify = inject(NotificationService);

  protected readonly styles = LEARNING_STYLES;
  protected readonly levelChoices = LEVEL_LABELS.map((label, value) => ({ value, label }));
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected readonly form = new FormGroup({
    targetRole: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    interests: new FormControl<string[]>([], { nonNullable: true }),
    weeklyHours: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(40),
    ]),
    preferredLearningStyle: new FormControl<LearningStyle>('mixed', { nonNullable: true }),
    skills: new FormArray<SkillRow>([]),
  });

  private readonly rowIds = signal<string[]>([]);
  protected readonly addableSkills = computed(() =>
    this.catalog.skills().filter((s) => !this.rowIds().includes(s.id)),
  );
  protected readonly loading = computed(
    () => this.store.status() === 'loading' || this.catalog.status() === 'loading',
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.store.load(true), this.catalog.load()]);
    const profile = this.store.profile();
    if (profile) this.populate(profile);
  }

  protected get skillRows(): SkillRow[] {
    return this.form.controls.skills.controls;
  }

  protected reload(): void {
    void this.ngOnInit();
  }

  private populate(profile: UserProfile): void {
    const skills = this.form.controls.skills;
    skills.clear();
    for (const s of profile.skills) skills.push(this.row(s.skillId, s.level));
    this.rowIds.set(profile.skills.map((s) => s.skillId));
    this.form.patchValue({
      targetRole: profile.targetRole,
      interests: profile.interests,
      weeklyHours: profile.weeklyHours,
      preferredLearningStyle: profile.preferredLearningStyle,
    });
    this.form.markAsPristine();
    this.serverErrors.set([]);
  }

  private row(skillId: string, level: number): SkillRow {
    return new FormGroup({
      skillId: new FormControl(skillId, { nonNullable: true }),
      level: new FormControl(level, {
        nonNullable: true,
        validators: [Validators.min(0), Validators.max(5)],
      }),
    });
  }

  protected addSkill(skillId: string): void {
    if (!skillId) return;
    this.form.controls.skills.push(this.row(skillId, 1));
    this.rowIds.update((ids) => [...ids, skillId]);
    this.form.markAsDirty();
  }

  protected removeSkill(index: number): void {
    this.form.controls.skills.removeAt(index);
    this.rowIds.set(this.skillRows.map((r) => r.controls.skillId.value));
    this.form.markAsDirty();
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.serverErrors.set([]);
    try {
      const updated = await this.store.save({
        targetRole: v.targetRole,
        interests: v.interests,
        weeklyHours: v.weeklyHours as number,
        preferredLearningStyle: v.preferredLearningStyle,
        skills: v.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
      });
      this.populate(updated);
      this.notify.success('Saved your profile. Recommendations will use the new details.');
    } catch (e) {
      if (e instanceof ApiError && e.details.length > 0) {
        this.serverErrors.set(e.details.map((d) => d.message));
      } else {
        this.notify.error(e);
      }
    } finally {
      this.saving.set(false);
    }
  }
}
