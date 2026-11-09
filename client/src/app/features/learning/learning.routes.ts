import { Routes } from '@angular/router';

export const LEARNING_ROUTES: Routes = [
  {
    path: '',
    title: 'Upskilling Store',
    loadComponent: () =>
      import('./pages/learning-page.component').then((m) => m.LearningPageComponent),
  },
  {
    path: ':courseId',
    title: 'Course details',
    loadComponent: () =>
      import('./pages/course-detail-page.component').then((m) => m.CourseDetailPageComponent),
  },
];
