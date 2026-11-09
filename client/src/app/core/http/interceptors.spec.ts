import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MockAuthService } from '../auth/mock-auth.service';
import { mockRoleInterceptor } from '../auth/mock-role.interceptor';
import { ApiError } from './api-error';
import { errorInterceptor } from './error.interceptor';

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let mock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockRoleInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => mock.verify());

  it('sends the mock role header to the API only', () => {
    TestBed.inject(MockAuthService).setRole('admin');
    http.get('/api/v1/courses').subscribe();
    http.get('https://other.example.com/data').subscribe();
    expect(mock.expectOne('/api/v1/courses').request.headers.get('x-mock-role')).toBe('admin');
    expect(
      mock.expectOne('https://other.example.com/data').request.headers.has('x-mock-role'),
    ).toBe(false);
  });

  it('defaults to the employee role', () => {
    http.get('/api/v1/profile/me').subscribe();
    expect(mock.expectOne('/api/v1/profile/me').request.headers.get('x-mock-role')).toBe(
      'employee',
    );
  });

  it('turns server errors into ApiError', async () => {
    const result = firstValueFrom(http.get('/api/v1/courses/x'));
    mock
      .expectOne('/api/v1/courses/x')
      .flush(
        { error: { code: 'NOT_FOUND', message: 'Course not found.', requestId: 'req-9' } },
        { status: 404, statusText: 'Not Found' },
      );
    await expect(result).rejects.toMatchObject({
      code: 'NOT_FOUND',
      requestId: 'req-9',
      status: 404,
    });
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });

  it('turns connection failures into a friendly ApiError', async () => {
    const result = firstValueFrom(http.get('/api/v1/courses'));
    mock.expectOne('/api/v1/courses').error(new ProgressEvent('error'));
    await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
