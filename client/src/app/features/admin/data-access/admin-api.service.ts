import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';
import type {
  Course,
  CourseInput,
  DemandInput,
  DemandSignal,
  Page,
} from '../../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl;

  courses(status?: string) {
    let params = new HttpParams().set('pageSize', 100);
    if (status) params = params.set('status', status);
    return this.http.get<Page<Course>>(`${this.base}/courses`, { params });
  }
  createCourse(input: CourseInput) {
    return this.http.post<Course>(`${this.base}/courses`, input);
  }
  updateCourse(id: string, input: Partial<CourseInput>) {
    return this.http.patch<Course>(`${this.base}/courses/${id}`, input);
  }
  deleteCourse(id: string) {
    return this.http.delete<void>(`${this.base}/courses/${id}`);
  }

  demand() {
    return this.http.get<{ items: DemandSignal[] }>(`${this.base}/demand`);
  }
  createDemand(input: DemandInput) {
    return this.http.post<DemandSignal>(`${this.base}/demand`, input);
  }
  updateDemand(id: string, input: Partial<DemandInput>) {
    return this.http.patch<DemandSignal>(`${this.base}/demand/${id}`, input);
  }
  deleteDemand(id: string) {
    return this.http.delete<void>(`${this.base}/demand/${id}`);
  }
}
