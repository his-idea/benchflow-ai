import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { errorMessage } from '../http/api-error';

/** User-facing toasts. MatSnackBar announces messages to screen readers automatically. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }

  error(error: unknown): void {
    this.snackBar.open(errorMessage(error), 'Dismiss', { duration: 8000 });
  }
}
