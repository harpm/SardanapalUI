import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { SardanapalControlBase } from '../../control-base';

/** A number, or `null` when empty. Works with `ngModel`, `formControl` and `formControlName`. */
@Component({
  selector: 's-numeric',
  imports: [FormsModule, NzInputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  templateUrl: './numeric.component.html',
})
export class SardanapalNumericComponent extends SardanapalControlBase<number> {
  protected readonly unbounded = { min: -Infinity, max: Infinity };

  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step = 1;
  /** Digits after the decimal point. `null` keeps what the user typed. */
  @Input() precision: number | null = null;
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() size: 'large' | 'default' | 'small' = 'default';
}
