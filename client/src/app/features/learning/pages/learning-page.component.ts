import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, merge } from 'rxjs';
import { SkillCatalogStore } from '../../../core/services/skill-catalog.store';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../../shared/components/state.components';
import type { CourseLevel, CourseSort, RecommendedCourse } from '../../../shared/models/api.models';
import { PlanStore } from '../../learning-plan/data-access/plan.store';
import { CourseCardComponent } from '../components/course-card.component';
import { LearningStore } from '../data-access/learning.store';

@Component({
  selector: 'app-learning-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CourseCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './learning-page.component.html',
  styleUrl: './learning-page.component.scss',
})
export class LearningPageComponent implements OnInit {
  protected readonly store = inject(LearningStore);
  protected readonly plan = inject(PlanStore);
  protected readonly catalog = inject(SkillCatalogStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly levels: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
  protected readonly durations = [
    { value: '', label: 'Any length' },
    { value: '4', label: '4 hours or less' },
    { value: '8', label: '8 hours or less' },
    { value: '12', label: '12 hours or less' },
  ];
  protected readonly sorts: { value: CourseSort; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title', label: 'Title' },
    { value: 'duration', label: 'Duration' },
  ];

  protected readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    level: new FormControl<CourseLevel | ''>('', { nonNullable: true }),
    skill: new FormControl('', { nonNullable: true }),
    maxDuration: new FormControl('', { nonNullable: true }),
    sort: new FormControl<CourseSort>('relevance', { nonNullable: true }),
  });

  protected readonly totalPages = computed(() => {
    const r = this.store.result();
    return r ? Math.max(1, Math.ceil(r.total / r.pageSize)) : 1;
  });
  protected readonly hasFilters = computed(() => {
    const f = this.store.filters();
    return !!(f.search || f.level || f.skill || f.maxDuration != null);
  });

  ngOnInit(): void {
    void this.catalog.load();
    void this.plan.load();
    // Reflect any existing filters (the store outlives the page) and fetch fresh results.
    const f = this.store.filters();
    this.form.setValue(
      {
        search: f.search,
        level: f.level,
        skill: f.skill,
        maxDuration: f.maxDuration?.toString() ?? '',
        sort: f.sort,
      },
      { emitEvent: false },
    );
    this.store.load();

    this.form.controls.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.store.setFilters({ search }));
    const c = this.form.controls;
    merge(
      c.level.valueChanges,
      c.skill.valueChanges,
      c.maxDuration.valueChanges,
      c.sort.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyNonSearch());
  }

  private applyNonSearch(): void {
    const v = this.form.getRawValue();
    this.store.setFilters({
      level: v.level,
      skill: v.skill,
      maxDuration: v.maxDuration ? Number(v.maxDuration) : null,
      sort: v.sort,
    });
  }

  protected clear(): void {
    this.form.reset(
      { search: '', level: '', skill: '', maxDuration: '', sort: 'relevance' },
      { emitEvent: false },
    );
    this.store.resetFilters();
  }

  protected skillNames(rec: RecommendedCourse): string[] {
    return rec.course.skillTags.map((id) => this.catalog.skillName(id));
  }

  protected add(rec: RecommendedCourse): void {
    void this.plan.addCourse(rec.course.id, rec.course.title);
  }

  protected remove(rec: RecommendedCourse): void {
    void this.plan.removeCourse(rec.course.id, rec.course.title);
  }
}
