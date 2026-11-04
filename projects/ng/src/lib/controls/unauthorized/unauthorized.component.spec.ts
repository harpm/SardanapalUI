import { Component, signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalUnauthorizedComponent } from '../../../public-api';
import type { SardanapalUnauthorizedLabels } from '../../models/models';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalUnauthorizedComponent],
  template: `<s-unauthorized [labels]="labels()" />`,
})
class UnauthorizedHostComponent {
  readonly labels = signal<SardanapalUnauthorizedLabels>({});
}

describe('s-unauthorized', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the default 403 copy', async () => {
    const fixture = await ControlTestKit.render(UnauthorizedHostComponent);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('403');
    expect(text).toContain('You do not have permission to view this page.');
  });

  it('overrides the English copy through labels', async () => {
    const fixture = await ControlTestKit.render(UnauthorizedHostComponent);

    fixture.componentInstance.labels.set({
      title: 'Forbidden',
      message: 'Ask an admin for access.',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Forbidden');
    expect(text).toContain('Ask an admin for access.');
  });
});
