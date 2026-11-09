import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp } from '../../../../testing/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../../core/services/notification.service';
import { planView } from '../../../../testing/fixtures';
import { PlanStore } from './plan.store';

describe('PlanStore', () => {
  let store: PlanStore;
  let mock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [provideTestHttp()],
    });
    store = TestBed.inject(PlanStore);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());

  const loadPlan = async (plan = planView()) => {
    const p = store.load();
    mock.expectOne('/api/v1/learning-plans/current').flush({ plan });
    await p;
  };

  it('loads the current plan and derives progress, course ids and weeks', async () => {
    await loadPlan();
    expect(store.status()).toBe('success');
    expect(store.progress()).toEqual({ completed: 1, total: 3, percent: 33 });
    expect(store.inPlan('b')).toBe(true);
    expect(store.inPlan('zzz')).toBe(false);
    expect(store.weeks().map((w) => [w.week, w.items.length, w.hours])).toEqual([
      [1, 1, 6],
      [2, 2, 12],
      [3, 0, 0],
      [4, 0, 0],
    ]);
  });

  it('handles "no plan yet"', async () => {
    const p = store.load();
    mock.expectOne('/api/v1/learning-plans/current').flush({ plan: null });
    await p;
    expect(store.plan()).toBeNull();
    expect(store.items()).toEqual([]);
    expect(store.progress().total).toBe(0);
  });

  it('reports a load failure through error state', async () => {
    const p = store.load();
    mock
      .expectOne('/api/v1/learning-plans/current')
      .flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Boom.', requestId: 'r' } },
        { status: 500, statusText: 'x' },
      );
    await p;
    expect(store.status()).toBe('error');
  });

  it('creates a plan when adding the first course', async () => {
    await loadPlan(null as never);
    const p = store.addCourse('react-fundamentals', 'React Fundamentals');
    const req = mock.expectOne('/api/v1/learning-plans');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'My four-week learning plan',
      items: [{ courseId: 'react-fundamentals' }],
    });
    req.flush(planView());
    await p;
    expect(store.plan()?.id).toBe('plan-1');
    expect(store.busy()).toBe(false);
  });

  it('adds to an existing plan', async () => {
    await loadPlan();
    const p = store.addCourse('d', 'Course D');
    const req = mock.expectOne('/api/v1/learning-plans/plan-1/items');
    expect(req.request.body).toEqual({ courseId: 'd' });
    req.flush(planView());
    await p;
  });

  it('moves an item by changing its sequence', async () => {
    await loadPlan();
    const p = store.move('i2', -1);
    const req = mock.expectOne('/api/v1/learning-plans/plan-1/items/i2');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sequence: 1 });
    req.flush(planView());
    await p;
  });

  it('updates status and week', async () => {
    await loadPlan();
    const a = store.setStatus('i2', 'in-progress');
    const statusReq = mock.expectOne('/api/v1/learning-plans/plan-1/items/i2');
    expect(statusReq.request.body).toEqual({ status: 'in-progress' });
    statusReq.flush(planView());
    await a;
    const b = store.setWeek('i2', 4);
    const weekReq = mock.expectOne('/api/v1/learning-plans/plan-1/items/i2');
    expect(weekReq.request.body).toEqual({ targetWeek: 4 });
    weekReq.flush(planView());
    await b;
  });

  it('shows a notification and keeps the plan when a change fails', async () => {
    await loadPlan();
    const spy = vi.spyOn(TestBed.inject(NotificationService), 'error');
    const p = store.removeItem('i2', 'Course B');
    mock
      .expectOne('/api/v1/learning-plans/plan-1/items/i2')
      .flush(
        { error: { code: 'NOT_FOUND', message: 'Plan item not found.', requestId: 'r' } },
        { status: 404, statusText: 'x' },
      );
    await p;
    expect(spy).toHaveBeenCalledOnce();
    expect(store.items()).toHaveLength(3);
    expect(store.busy()).toBe(false);
  });
});
