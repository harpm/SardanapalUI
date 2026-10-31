import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { SardanapalControlBase } from '../../control-base';

/** A `Date`, or `null` when empty. Works with `ngModel`, `formControl` and `formControlName`. */
@Component({
  selector: 's-date',
  imports: [FormsModule, NzDatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }', 'nz-date-picker { width: 100%; }'],
  templateUrl: './date.component.html',
})
export class SardanapalDateComponent extends SardanapalControlBase<Date> {
  @Input() placeholder = '';
  @Input() format = 'yyyy-MM-dd';
  @Input({ transform: booleanAttribute }) showTime = false;
  @Input({ transform: booleanAttribute }) allowClear = true;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() size: 'large' | 'default' | 'small' = 'default';
  /** Dates for which this returns true cannot be chosen. */
  @Input() disabledDate: ((date: Date) => boolean) | null = null;

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.markTouched();
    }
  }
}
