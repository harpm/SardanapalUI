import { Component, signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalNotFoundComponent } from '../../../public-api';
import type { SardanapalNotFoundLabels } from '../../models/models';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalNotFoundComponent],
  template: `<s-not-found [labels]="labels()" />`,
})
class NotFoundHostComponent {
  readonly labels = signal<SardanapalNotFoundLabels>({});
}

describe('s-not-found', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the default 404 copy', async () => {
    const fixture = await ControlTestKit.render(NotFoundHostComponent);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('404');
    expect(text).toContain('The page you are looking for does not exist.');
  });

  it('overrides the English copy through labels', async () => {
    const fixture = await ControlTestKit.render(NotFoundHostComponent);

    fixture.componentInstance.labels.set({
      title: 'Missing',
      message: 'Nothing lives at this address.',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Missing');
    expect(text).toContain('Nothing lives at this address.');
  });
});
