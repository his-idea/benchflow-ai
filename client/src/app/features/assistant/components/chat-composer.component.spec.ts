import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoA11yViolations } from '../../../../testing/a11y';
import { ChatComposerComponent } from './chat-composer.component';

describe('ChatComposerComponent', () => {
  let fixture: ComponentFixture<ChatComposerComponent>;
  let sent: string[];
  const textarea = (): HTMLTextAreaElement => fixture.nativeElement.querySelector('textarea');
  const sendButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[type="submit"]');

  const type = async (value: string) => {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(ChatComposerComponent);
    sent = [];
    fixture.componentInstance.send.subscribe((m) => sent.push(m));
    await fixture.whenStable();
  });

  it('disables Send until there is text', async () => {
    expect(sendButton().disabled).toBe(true);
    await type('   ');
    expect(sendButton().disabled).toBe(true);
    await type('hello');
    expect(sendButton().disabled).toBe(false);
  });

  it('sends the trimmed text and clears the box', async () => {
    await type('  What should I learn next?  ');
    sendButton().click();
    expect(sent).toEqual(['What should I learn next?']);
    await fixture.whenStable();
    expect(textarea().value).toBe('');
  });

  it('sends on Enter but inserts a new line on Shift+Enter', async () => {
    await type('hello');
    const shift = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
    textarea().dispatchEvent(shift);
    expect(sent).toEqual([]);
    expect(shift.defaultPrevented).toBe(false);

    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    textarea().dispatchEvent(enter);
    expect(sent).toEqual(['hello']);
    expect(enter.defaultPrevented).toBe(true);
  });

  it('does not send while disabled', async () => {
    await type('hello');
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(sendButton().disabled).toBe(true);
    textarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(sent).toEqual([]);
  });

  it('limits the message length and shows the count', async () => {
    expect(textarea().getAttribute('maxlength')).toBe('1000');
    await type('abc');
    expect(fixture.nativeElement.textContent).toContain('3/1000');
  });

  it('has no detectable accessibility violations', async () => {
    await expectNoA11yViolations(fixture.nativeElement);
  });
});
