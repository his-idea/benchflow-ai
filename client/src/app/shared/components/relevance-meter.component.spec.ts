import { ComponentFixture, TestBed } from '@angular/core/testing';
import { breakdown } from '../../../testing/fixtures';
import { expectNoA11yViolations } from '../../../testing/a11y';
import { RelevanceMeterComponent } from './relevance-meter.component';

describe('RelevanceMeterComponent', () => {
  let fixture: ComponentFixture<RelevanceMeterComponent>;
  const el = (): HTMLElement => fixture.nativeElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(RelevanceMeterComponent);
    fixture.componentRef.setInput('score', 85);
    fixture.componentRef.setInput('breakdown', breakdown);
    await fixture.whenStable();
  });

  it('prints the percentage as text, not only as a bar', () => {
    expect(el().textContent).toContain('85%');
    expect(el().textContent).toContain('course relevance');
  });

  it('exposes a labelled meter with the value for assistive technology', () => {
    const meter = el().querySelector('[role="meter"]')!;
    expect(meter.getAttribute('aria-valuenow')).toBe('85');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuetext')).toBe('85 percent course relevance');
    expect(meter.getAttribute('aria-label')).toBe('Course relevance');
  });

  it('draws one segment per factor, sized by its points', () => {
    const segs = el().querySelectorAll<HTMLElement>('.seg');
    expect(segs).toHaveLength(6);
    expect(segs[0]?.style.width).toBe('35%');
  });

  it('hides the written breakdown unless requested', async () => {
    expect(el().querySelector('details')).toBeNull();
    fixture.componentRef.setInput('showBreakdown', true);
    await fixture.whenStable();
    const items = [...el().querySelectorAll('details li')].map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(items).toHaveLength(6);
    expect(items[0]).toBe('Target-role skill alignment 35 of 35 points');
    expect(items[3]).toBe('Interest alignment 0 of 10 points');
  });

  it('has no detectable accessibility violations', async () => {
    fixture.componentRef.setInput('showBreakdown', true);
    await fixture.whenStable();
    await expectNoA11yViolations(el());
  });
});
