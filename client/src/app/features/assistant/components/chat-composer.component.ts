import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IconComponent } from '../../../shared/components/icon.component';

export const MAX_MESSAGE_LENGTH = 1000;

@Component({
  selector: 'app-chat-composer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="composer" (submit)="submit($event)">
      <mat-form-field class="grow" subscriptSizing="dynamic">
        <mat-label>Ask the Bench Assistant</mat-label>
        <textarea
          matInput
          rows="2"
          [formControl]="text"
          [maxlength]="max"
          (keydown.enter)="onEnter($event)"
          aria-describedby="composer-hint"
        ></textarea>
        <mat-hint id="composer-hint"
          >Enter to send, Shift+Enter for a new line · {{ text.value.length }}/{{ max }}</mat-hint
        >
      </mat-form-field>
      <button mat-flat-button type="submit" [disabled]="disabled() || !canSend()">
        <app-icon name="send" /> Send
      </button>
    </form>
  `,
  styles: `
    .composer {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .grow {
      flex: 1;
    }
    button {
      margin-top: 0.4rem;
    }
  `,
})
export class ChatComposerComponent {
  readonly disabled = input(false);
  readonly send = output<string>();
  protected readonly max = MAX_MESSAGE_LENGTH;
  protected readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(MAX_MESSAGE_LENGTH)],
  });
  private readonly value = signal('');

  constructor() {
    this.text.valueChanges.subscribe((v) => this.value.set(v));
  }

  protected canSend(): boolean {
    return this.value().trim().length > 0;
  }

  protected onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return;
    e.preventDefault();
    this.submit();
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const message = this.text.value.trim();
    if (!message || this.disabled()) return;
    this.send.emit(message);
    this.text.reset('');
  }
}
