import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import type {
  CourseFilters,
  LoadState,
  RecommendationPage,
} from '../../../shared/models/api.models';
import { CoursesApiService } from './courses-api.service';

export const DEFAULT_FILTERS: CourseFilters = {
  search: '',
  level: '',
  skill: '',
  maxDuration: null,
  sort: 'relevance',
};
const PAGE_SIZE = 9;

/** State for the Upskilling Store: filters, the current page of ranked courses, and load status. */
@Injectable({ providedIn: 'root' })
export class LearningStore {
  private readonly api = inject(CoursesApiService);
  private readonly request$ = new Subject<void>();

  readonly filters = signal<CourseFilters>({ ...DEFAULT_FILTERS });
  readonly page = signal(1);
  readonly result = signal<RecommendationPage | null>(null);
  readonly status = signal<LoadState>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly pageSize = PAGE_SIZE;

  constructor() {
    // switchMap cancels an in-flight request when filters change quickly.
    this.request$
      .pipe(
        tap(() => this.status.set('loading')),
        switchMap(() =>
          this.api.recommendations(this.filters(), this.page(), PAGE_SIZE).pipe(
            catchError((e: ApiError) => {
              this.error.set(e);
              this.status.set('error');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((page) => {
        this.result.set(page);
        this.error.set(null);
        this.status.set('success');
      });
  }

  load(): void {
    this.request$.next();
  }

  setFilters(patch: Partial<CourseFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}
