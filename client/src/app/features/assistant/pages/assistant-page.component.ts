import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon.component';
import type { ChatEntry, SuggestedAction } from '../../../shared/models/api.models';
import { PlanDraftEditorComponent } from '../../learning-plan/components/plan-draft-editor.component';
import { PlanDraftStore } from '../../learning-plan/data-access/plan-draft.store';
import { AssistantStore } from '../data-access/assistant.store';
import { ChatComposerComponent } from '../components/chat-composer.component';
import { ChatMessageComponent } from '../components/chat-message.component';
import { SuggestedPromptsComponent } from '../components/suggested-prompts.component';

@Component({
  selector: 'app-assistant-page',
  imports: [
    MatButtonModule,
    IconComponent,
    ChatComposerComponent,
    ChatMessageComponent,
    SuggestedPromptsComponent,
    PlanDraftEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assistant-page.component.html',
  styleUrl: './assistant-page.component.scss',
})
export class AssistantPageComponent {
  protected readonly store = inject(AssistantStore);
  protected readonly drafts = inject(PlanDraftStore);
  private readonly router = inject(Router);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  constructor() {
    // Keep the newest message in view as the conversation grows.
    effect(() => {
      this.store.entries();
      this.store.sending();
      queueMicrotask(() => {
        const el = this.log()?.nativeElement;
        el?.scrollTo({ top: el.scrollHeight });
      });
    });
  }

  protected send(text: string): void {
    void this.store.send(text);
  }

  protected async runAction(action: SuggestedAction, entry: ChatEntry): Promise<void> {
    switch (action) {
      case 'Generate plan':
        await this.store.generatePlan();
        break;
      case 'View course': {
        const id = entry.recommendedCourseIds?.[0];
        await this.router.navigate(id ? ['/learning', id] : ['/learning']);
        break;
      }
      case 'Open plan':
        await this.router.navigate(['/plan']);
        break;
      case 'Update profile':
        await this.router.navigate(['/profile']);
        break;
      case 'Browse courses':
        await this.router.navigate(['/learning']);
        break;
    }
  }
}
