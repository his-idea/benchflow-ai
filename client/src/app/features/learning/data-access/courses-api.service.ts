import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';
import type {
  CourseFilters,
  RecommendationPage,
  RecommendedCourse,
} from '../../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class CoursesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl;

  recommendations(filters: Partial<CourseFilters>, page = 1, pageSize = 12) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.level) params = params.set('level', filters.level);
    if (filters.skill) params = params.set('skill', filters.skill);
    if (filters.maxDuration != null) params = params.set('maxDuration', filters.maxDuration);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get<RecommendationPage>(`${this.base}/recommendations/courses`, { params });
  }

  recommendation(courseId: string) {
    return this.http.get<RecommendedCourse>(
      `${this.base}/recommendations/courses/${encodeURIComponent(courseId)}`,
    );
  }
}
