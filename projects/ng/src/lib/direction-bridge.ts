import { Directionality, type Direction } from '@angular/cdk/bidi';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SARDANAPAL_DIRECTION_SERVICE } from './tokens';

/**
 * Keeps the CDK `Directionality` in step with `SardanapalDirectionService`.
 * ng-zorro reads `Directionality`, so its components and overlays flip when
 * the direction changes. The CDK service reads `dir` from the page only once,
 * which is why the bridge pushes later changes into it.
 *
 * It only reacts to `directionChanged$`. It never sets a language.
 */
@Injectable({ providedIn: 'root' })
export class SardanapalNgDirectionBridge {
  private readonly directionality = inject(Directionality);

  constructor() {
    const service = inject(SARDANAPAL_DIRECTION_SERVICE);
    this.apply(service.getDirection());
    service.directionChanged$
      .pipe(takeUntilDestroyed())
      .subscribe((direction) => this.apply(direction));
  }

  private apply(direction: Direction): void {
    if (this.directionality.value === direction) {
      return;
    }
    this.directionality.valueSignal.set(direction);
    this.directionality.change.emit(direction);
  }
}
