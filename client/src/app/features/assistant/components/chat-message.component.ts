import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import type { ChatEntry, GroundingRef, SuggestedAction } from '../../../shared/models/api.models';
import { FeedbackApiService } from '../../learning/data-access/feedback-api.service';

@Component({
  selector: 'app-chat-message',
  imports: [RouterLink, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.scss',
})
export class ChatMessageComponent {
  readonly entry = input.required<ChatEntry>();
  readonly action = output<SuggestedAction>();

  private readonly feedbackApi = inject(FeedbackApiService);
  private readonly notify = inject(NotificationService);
  protected readonly feedback = signal<'none' | 'sending' | 'sent'>('none');

  protected link(ref: GroundingRef): string[] | null {
    if (ref.type === 'course') return ['/learning', ref.id];
    if (ref.type === 'plan' || ref.type === 'draft') return ['/plan'];
    if (ref.type === 'profile') return ['/profile'];
    return null;
  }

  protected async rate(helpful: boolean): Promise<void> {
    this.feedback.set('sending');
    try {
      await firstValueFrom(
        this.feedbackApi.submit({ targetType: 'assistant', targetId: this.entry().id, helpful }),
      );
      this.feedback.set('sent');
    } catch (e) {
      this.feedback.set('none');
      this.notify.error(e);
    }
  }
}
