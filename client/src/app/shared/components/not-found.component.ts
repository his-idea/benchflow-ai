import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="not-found">
      <img src="assets/illustrations/empty-bench.svg" alt="" width="200" height="140" />
      <h1>We can't find that page</h1>
      <p class="muted">The address may be mistyped, or the page may have moved.</p>
      <a mat-flat-button routerLink="/dashboard">Go to dashboard</a>
    </main>
  `,
  styles: `
    .not-found {
      display: grid;
      justify-items: center;
      gap: 0.75rem;
      padding: 4rem 1.5rem;
      text-align: center;
    }
  `,
})
export class NotFoundComponent {}
