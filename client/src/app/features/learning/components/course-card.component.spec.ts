import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoA11yViolations } from '../../../../testing/a11y';
import { recommended } from '../../../../testing/fixtures';
import { CourseCardComponent } from './course-card.component';

describe('CourseCardComponent', () => {
  let fixture: ComponentFixture<CourseCardComponent>;
  const el = (): HTMLElement => fixture.nativeElement;
  const button = (): HTMLButtonElement => el().querySelector('.actions button')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(CourseCardComponent);
    fixture.componentRef.setInput('rec', recommended());
    fixture.componentRef.setInput('skillNames', ['React', 'JavaScript Fundamentals']);
    await fixture.whenStable();
  });

  it('shows the title as a link to the course details', () => {
    const link = el().querySelector('h3 a')!;
    expect(link.textContent).toBe('React Fundamentals');
    expect(link.getAttribute('href')).toBe('/learning/react-fundamentals');
  });

  it('shows the relevance as text and the first reason', () => {
    expect(el().textContent).toContain('80%');
    expect(el().textContent).toContain('Builds skills a Full-Stack Engineer often uses');
  });

  it('gives the add button an accessible name that includes the course', () => {
    expect(button().textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Add React Fundamentals to plan',
    );
  });

  it('emits add, and switches to remove when the course is in the plan', async () => {
    const added: unknown[] = [];
    fixture.componentInstance.add.subscribe((r) => added.push(r));
    button().click();
    expect(added).toHaveLength(1);

    fixture.componentRef.setInput('inPlan', true);
    await fixture.whenStable();
    const removed: unknown[] = [];
    fixture.componentInstance.remove.subscribe((r) => removed.push(r));
    expect(button().textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Remove React Fundamentals from plan',
    );
    button().click();
    expect(removed).toHaveLength(1);
  });

  it('disables the action while a plan change is in progress', async () => {
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
  });

  it('has no detectable accessibility violations', async () => {
    await expectNoA11yViolations(el());
  });
});
