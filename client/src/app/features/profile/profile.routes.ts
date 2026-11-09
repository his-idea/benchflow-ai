import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    title: 'Skill profile',
    loadComponent: () =>
      import('./pages/profile-page.component').then((m) => m.ProfilePageComponent),
  },
];
