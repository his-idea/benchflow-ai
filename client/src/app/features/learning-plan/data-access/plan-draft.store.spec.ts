import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp } from '../../../../testing/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { planReply, planView } from '../../../../testing/fixtures';
import { PlanDraftStore } from './plan-draft.store';
import { PlanStore } from './plan.store';

describe('PlanDraftStore', () => {
  let store: PlanDraftStore;
  let mock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [provideTestHttp()],
    });
    store = TestBed.inject(PlanDraftStore);
    mock = TestBed.inject(HttpTestingController);
    const p = store.generate('conv-1');
    const req = mock.expectOne('/api/v1/assistant/generate-plan');
    expect(req.request.body).toEqual({ conversationId: 'conv-1' });
    req.flush(planReply());
    await p;
  });
  afterEach(() => mock.verify());

  it('loads an editable copy of the draft', () => {
    expect(store.items().map((i) => i.courseId)).toEqual(['a', 'b', 'c']);
    expect(store.title()).toContain('Full-Stack Engineer');
    expect(store.summary()).toBe('Here is a draft.');
    expect(store.totalHours()).toBe(18);
  });

  it('reorders courses and renumbers the sequence', () => {
    store.move('c', -1);
    expect(store.items().map((i) => [i.courseId, i.sequence])).toEqual([
      ['a', 1],
      ['c', 2],
      ['b', 3],
    ]);
    store.move('a', -1);
    expect(store.items()[0]?.courseId).toBe('a');
  });

  it('changes weeks and removes courses without touching the original draft', () => {
    store.setWeek('a', 4);
    store.remove('b');
    expect(store.items().map((i) => [i.courseId, i.targetWeek, i.sequence])).toEqual([
      ['a', 4, 1],
      ['c', 3, 2],
    ]);
    expect(store.draft()?.items).toHaveLength(3);
  });

  it('does not save with a too-short title or no courses', async () => {
    store.setTitle('ab');
    expect(await store.save()).toBe(false);
    store.setTitle('A good title');
    store.items.set([]);
    expect(await store.save()).toBe(false);
  });

  it('saves the edited draft as the plan and clears the draft', async () => {
    store.setTitle('  My edited plan  ');
    store.setWeek('a', 2);
    store.remove('c');
    const p = store.save();
    const req = mock.expectOne('/api/v1/learning-plans');
    expect(req.request.body).toEqual({
      title: 'My edited plan',
      items: [
        { courseId: 'a', targetWeek: 2 },
        { courseId: 'b', targetWeek: 2 },
      ],
    });
    req.flush(planView({ title: 'My edited plan' }));
    expect(await p).toBe(true);
    expect(store.draft()).toBeNull();
    expect(TestBed.inject(PlanStore).plan()?.title).toBe('My edited plan');
  });
});
