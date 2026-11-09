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
  COURSE_LEVELS,
  COURSE_STATUSES,
  type Course,
  type CourseInput,
  type CourseLevel,
  type CourseStatus,
  type LoadState,
} from '../../../shared/models/api.models';
import { AdminApiService } from '../data-access/admin-api.service';

const atLeastOne = (c: AbstractControl<string[]>): ValidationErrors | null =>
  c.value.length > 0 ? null : { atLeastOne: true };

@Component({
  selector: 'app-admin-courses-page',
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
  templateUrl: './admin-courses-page.component.html',
  styleUrl: './admin-page.scss',
})
export class AdminCoursesPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  protected readonly catalog = inject(SkillCatalogStore);

  protected readonly levels = COURSE_LEVELS;
  protected readonly statuses = COURSE_STATUSES;
  protected readonly courses = signal<Course[]>([]);
  protected readonly status = signal<LoadState>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly statusFilter = signal('');
  /** null = form closed, 'new' = creating, otherwise the course being edited. */
  protected readonly editing = signal<Course | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    }),
    provider: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(600)],
    }),
    skillTags: new FormControl<string[]>([], { nonNullable: true, validators: [atLeastOne] }),
    prerequisites: new FormControl<string[]>([], { nonNullable: true }),
    level: new FormControl<CourseLevel>('beginner', { nonNullable: true }),
    durationHours: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.5),
      Validators.max(200),
    ]),
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^$|^https?:\/\/\S+$/i)],
    }),
    status: new FormControl<CourseStatus>('draft', { nonNullable: true }),
  });

  ngOnInit(): void {
    void this.catalog.load();
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      this.courses.set(
        (await firstValueFrom(this.api.courses(this.statusFilter() || undefined))).items,
      );
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }

  protected setFilter(value: string): void {
    this.statusFilter.set(value);
    void this.load();
  }

  protected openNew(): void {
    this.form.reset({ level: 'beginner', status: 'draft', skillTags: [], prerequisites: [] });
    this.serverErrors.set([]);
    this.editing.set('new');
  }

  protected openEdit(course: Course): void {
    this.form.reset({ ...course, url: course.url ?? '' });
    this.serverErrors.set([]);
    this.editing.set(course);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const input: CourseInput = {
      title: v.title,
      provider: v.provider,
      description: v.description,
      skillTags: v.skillTags,
      prerequisites: v.prerequisites,
      level: v.level,
      durationHours: v.durationHours as number,
      status: v.status,
      ...(v.url ? { url: v.url } : {}),
    };
    const target = this.editing();
    this.saving.set(true);
    this.serverErrors.set([]);
    try {
      if (target === 'new') {
        await firstValueFrom(this.api.createCourse(input));
        this.notify.success(`Created "${input.title}".`);
      } else if (target) {
        await firstValueFrom(this.api.updateCourse(target.id, input));
        this.notify.success(`Updated "${input.title}".`);
      }
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

  protected async remove(course: Course): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete this course?',
      message: `"${course.title}" will be permanently deleted. To keep it for existing plans, set its status to retired instead.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteCourse(course.id));
      this.notify.success(`Deleted "${course.title}".`);
      await this.load();
    } catch (e) {
      this.notify.error(e);
    }
  }
}
