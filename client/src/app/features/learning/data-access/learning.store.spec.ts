import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp } from '../../../../testing/http';
import { recommended } from '../../../../testing/fixtures';
import type { RecommendationPage } from '../../../shared/models/api.models';
import { LearningStore } from './learning.store';

const page = (over: Partial<RecommendationPage> = {}): RecommendationPage => ({
  items: [recommended()],
  total: 1,
  page: 1,
  pageSize: 9,
  nextSkill: null,
  modelVersion: 'weights-v1',
  generatedAt: '',
  disclaimer: 'x',
  ...over,
});

describe('LearningStore', () => {
  let store: LearningStore;
  let mock: HttpTestingController;
  const url = (r: { url: string }) => r.url === '/api/v1/recommendations/courses';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestHttp()] });
    store = TestBed.inject(LearningStore);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());

  it('moves from loading to success and stores the page', () => {
    store.load();
    expect(store.status()).toBe('loading');
    mock.expectOne(url).flush(page());
    expect(store.status()).toBe('success');
    expect(store.result()?.total).toBe(1);
  });

  it('sends only the filters that are set', () => {
    store.setFilters({
      search: ' react ',
      level: 'beginner',
      maxDuration: 8,
      skill: 'react',
      sort: 'title',
    });
    const req = mock.expectOne(url);
    expect(req.request.params.get('search')).toBe('react');
    expect(req.request.params.get('level')).toBe('beginner');
    expect(req.request.params.get('maxDuration')).toBe('8');
    expect(req.request.params.get('skill')).toBe('react');
    expect(req.request.params.get('sort')).toBe('title');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page());
  });

  it('omits empty filters', () => {
    store.load();
    const req = mock.expectOne(url);
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('level')).toBe(false);
    expect(req.request.params.has('maxDuration')).toBe(false);
    req.flush(page());
  });

  it('returns to page 1 when filters change but keeps the page when paging', () => {
    store.goToPage(3);
    mock.expectOne(url).flush(page({ page: 3 }));
    expect(store.page()).toBe(3);
    store.setFilters({ level: 'advanced' });
    expect(store.page()).toBe(1);
    mock.expectOne(url).flush(page());
  });

  it('cancels a stale request when filters change quickly', () => {
    store.setFilters({ search: 'a' });
    store.setFilters({ search: 'ab' });
    const [first, second] = mock.match(url);
    expect(first?.cancelled).toBe(true);
    second?.flush(page({ total: 5 }));
    expect(store.result()?.total).toBe(5);
  });

  it('exposes an error state and recovers on retry', () => {
    store.load();
    mock
      .expectOne(url)
      .flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Boom.', requestId: 'r' } },
        { status: 500, statusText: 'x' },
      );
    expect(store.status()).toBe('error');
    expect(store.error()?.message).toBe('Boom.');
    store.load();
    mock.expectOne(url).flush(page());
    expect(store.status()).toBe('success');
    expect(store.error()).toBeNull();
  });

  it('resets filters', () => {
    store.setFilters({ search: 'x' });
    mock.expectOne(url).flush(page());
    store.resetFilters();
    expect(store.filters().search).toBe('');
    mock.expectOne(url).flush(page());
  });
});
