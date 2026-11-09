import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp } from '../../../../testing/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { planReply, reply } from '../../../../testing/fixtures';
import { PlanDraftStore } from '../../learning-plan/data-access/plan-draft.store';
import { AssistantStore } from './assistant.store';

describe('AssistantStore', () => {
  let store: AssistantStore;
  let mock: HttpTestingController;
  const messages = '/api/v1/assistant/messages';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [provideTestHttp()],
    });
    store = TestBed.inject(AssistantStore);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());

  it('sends a message with context flags and adds both entries', async () => {
    const p = store.send('  What should I learn next?  ');
    const req = mock.expectOne(messages);
    expect(req.request.body).toEqual({
      message: 'What should I learn next?',
      context: { includeProfile: true, includeCurrentPlan: true },
    });
    expect(store.sending()).toBe(true);
    req.flush(reply());
    await p;
    expect(store.entries().map((e) => e.role)).toEqual(['user', 'assistant']);
    expect(store.entries()[1]).toMatchObject({
      text: 'Try Docker.',
      recommendedCourseIds: ['docker-for-developers'],
      fallback: false,
    });
    expect(store.conversationId()).toBe('conv-1');
    expect(store.sending()).toBe(false);
  });

  it('reuses the conversation id on the next message', async () => {
    const first = store.send('one');
    mock.expectOne(messages).flush(reply());
    await first;
    const second = store.send('two');
    const req = mock.expectOne(messages);
    expect(req.request.body.conversationId).toBe('conv-1');
    req.flush(reply());
    await second;
  });

  it('ignores blank messages and sends while another is in flight', async () => {
    await store.send('   ');
    expect(store.entries()).toEqual([]);
    const p = store.send('first');
    await store.send('second');
    expect(store.entries().filter((e) => e.role === 'user')).toHaveLength(1);
    mock.expectOne(messages).flush(reply());
    await p;
  });

  it('keeps the message on failure and retries without duplicating it', async () => {
    const p = store.send('hello there');
    mock.expectOne(messages).flush(
      {
        error: {
          code: 'ASSISTANT_UNAVAILABLE',
          message: 'The assistant is temporarily unavailable. Please try again.',
          requestId: 'req-1',
        },
      },
      { status: 503, statusText: 'x' },
    );
    await p;
    expect(store.error()?.code).toBe('ASSISTANT_UNAVAILABLE');
    expect(store.entries()).toHaveLength(1);

    const retry = store.retry();
    const retryReq = mock.expectOne(messages);
    expect(retryReq.request.body.message).toBe('hello there');
    retryReq.flush(reply());
    await retry;
    expect(store.error()).toBeNull();
    expect(store.entries().map((e) => e.role)).toEqual(['user', 'assistant']);
  });

  it('does nothing on retry when nothing failed', async () => {
    await store.retry();
    mock.expectNone(messages);
  });

  it('surfaces a rate limit as an error that can be retried', async () => {
    const p = store.send('hi');
    mock
      .expectOne(messages)
      .flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    await p;
    expect(store.error()?.code).toBe('RATE_LIMITED');
  });

  it('generates a plan draft and records the assistant description', async () => {
    const p = store.generatePlan();
    mock.expectOne('/api/v1/assistant/generate-plan').flush(planReply());
    await p;
    expect(TestBed.inject(PlanDraftStore).items()).toHaveLength(3);
    expect(store.entries().at(-1)).toMatchObject({ role: 'assistant', text: 'Here is a draft.' });
  });

  it('records a failed plan generation as a retryable error', async () => {
    const p = store.generatePlan();
    mock
      .expectOne('/api/v1/assistant/generate-plan')
      .flush(
        { error: { code: 'ASSISTANT_UNAVAILABLE', message: 'Down.', requestId: 'r' } },
        { status: 503, statusText: 'x' },
      );
    await p;
    expect(store.error()?.message).toBe('Down.');
    const retry = store.retry();
    mock.expectOne('/api/v1/assistant/generate-plan').flush(planReply());
    await retry;
    expect(store.error()).toBeNull();
  });

  it('clears the conversation', async () => {
    const p = store.send('hi');
    mock.expectOne(messages).flush(reply());
    await p;
    store.clear();
    expect(store.entries()).toEqual([]);
    expect(store.conversationId()).toBeUndefined();
  });
});
