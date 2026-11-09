import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'courses',
    title: 'Course administration',
    loadComponent: () =>
      import('./pages/admin-courses-page.component').then((m) => m.AdminCoursesPageComponent),
  },
  {
    path: 'demand',
    title: 'Demand administration',
    loadComponent: () =>
      import('./pages/admin-demand-page.component').then((m) => m.AdminDemandPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'courses' },
];
