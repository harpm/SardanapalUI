import { Component, signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalTextComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalTextComponent],
  template: `<s-text [value]="value()" [emptyText]="empty" />`,
})
class TextHostComponent {
  readonly value = signal<unknown>('hello');
  empty = '-';
}

describe('s-text', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the value as text', async () => {
    const fixture = await ControlTestKit.render(TextHostComponent);

    expect(fixture.nativeElement.textContent.trim()).toBe('hello');
  });

  it('shows the empty text for null and undefined', async () => {
    const fixture = await ControlTestKit.render(TextHostComponent);

    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('-');

    fixture.componentInstance.value.set(undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('-');
  });

  it('keeps zero and false', async () => {
    const fixture = await ControlTestKit.render(TextHostComponent);

    fixture.componentInstance.value.set(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('0');

    fixture.componentInstance.value.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('false');
  });

  it('formats a date in the local format', async () => {
    const fixture = await ControlTestKit.render(TextHostComponent);
    const date = new Date(2026, 0, 2, 3, 4, 5);

    fixture.componentInstance.value.set(date);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe(date.toLocaleString());
  });
});
