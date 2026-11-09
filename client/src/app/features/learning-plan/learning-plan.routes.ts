import { Routes } from '@angular/router';

export const LEARNING_PLAN_ROUTES: Routes = [
  {
    path: '',
    title: 'My learning plan',
    loadComponent: () => import('./pages/plan-page.component').then((m) => m.PlanPageComponent),
  },
];
