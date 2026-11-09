import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp } from '../../../../testing/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { expectNoA11yViolations } from '../../../../testing/a11y';
import type { UserProfile } from '../../../shared/models/api.models';
import { ProfilePageComponent } from './profile-page.component';

const profile: UserProfile = {
  id: 'u1',
  displayName: 'Alex Synthetic',
  targetRole: 'fullstack-engineer',
  interests: ['docker'],
  weeklyHours: 8,
  preferredLearningStyle: 'hands-on',
  skills: [{ skillId: 'react', level: 2, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
};
const catalog = {
  skills: [
    { id: 'react', name: 'React', category: 'Frontend', description: '' },
    { id: 'docker', name: 'Docker', category: 'DevOps', description: '' },
  ],
  roles: [{ id: 'fullstack-engineer', name: 'Full-Stack Engineer', requiredSkillIds: ['react'] }],
};

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let mock: HttpTestingController;
  const el = (): HTMLElement => fixture.nativeElement;

  /** Let awaited promise chains in the page finish, then render. whenStable() alone doesn't track them. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [provideTestHttp()],
    });
    fixture = TestBed.createComponent(ProfilePageComponent);
    mock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    mock.expectOne('/api/v1/profile/me').flush(profile);
    mock.expectOne('/api/v1/skills').flush(catalog);
    await settle();
  });
  afterEach(() => mock.verify());

  const hoursInput = (): HTMLInputElement =>
    el().querySelector('input[formcontrolname="weeklyHours"]')!;
  const setHours = async (value: string) => {
    hoursInput().value = value;
    hoursInput().dispatchEvent(new Event('input'));
    hoursInput().dispatchEvent(new Event('blur'));
    await settle();
  };
  const submit = async () => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  };

  it('fills the form from the saved profile', () => {
    expect(hoursInput().value).toBe('8');
    expect(el().querySelector('.skill-name')?.textContent).toBe('React');
  });

  it('keeps Save disabled until something changes', () => {
    const save = el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(save.disabled).toBe(true);
  });

  it('shows a clear message and does not save when weekly hours are out of range', async () => {
    await setHours('99');
    await submit();
    expect(el().textContent).toContain('Enter a number from 0 to 40.');
    mock.expectNone((r) => r.method === 'PATCH');
  });

  it('shows a required message when weekly hours are empty', async () => {
    await setHours('');
    await submit();
    expect(el().textContent).toContain('Enter your weekly hours.');
  });

  it('saves valid changes through the API', async () => {
    await setHours('12');
    await submit();
    const req = mock.expectOne((r) => r.method === 'PATCH' && r.url === '/api/v1/profile/me');
    expect(req.request.body).toEqual({
      targetRole: 'fullstack-engineer',
      interests: ['docker'],
      weeklyHours: 12,
      preferredLearningStyle: 'hands-on',
      skills: [{ skillId: 'react', level: 2 }],
    });
    req.flush({ ...profile, weeklyHours: 12 });
    await settle();
    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('lists server-side validation messages when the save is rejected', async () => {
    await setHours('12');
    await submit();
    mock
      .expectOne((r) => r.method === 'PATCH')
      .flush(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid.',
            requestId: 'r',
            details: [{ path: 'skills.0.skillId', message: 'Unknown skill "react".' }],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Unknown skill "react".');
  });

  it('has no detectable accessibility violations', async () => {
    await expectNoA11yViolations(el());
  });
});
