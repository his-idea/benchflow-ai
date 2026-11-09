import { Routes } from '@angular/router';

export const ASSISTANT_ROUTES: Routes = [
  {
    path: '',
    title: 'Bench Assistant',
    loadComponent: () =>
      import('./pages/assistant-page.component').then((m) => m.AssistantPageComponent),
  },
];
