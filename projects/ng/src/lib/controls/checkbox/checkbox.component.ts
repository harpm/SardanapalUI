import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { SardanapalControlBase } from '../../control-base';

/** `true` or `false`. `null` from the form shows as unchecked. */
@Component({
  selector: 's-checkbox',
  imports: [FormsModule, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: inline-block; }'],
  templateUrl: './checkbox.component.html',
})
export class SardanapalCheckboxComponent extends SardanapalControlBase<boolean> {
  @Input() label = '';
  @Input({ transform: booleanAttribute }) indeterminate = false;

  protected onToggle(checked: boolean): void {
    this.updateValue(checked);
    this.markTouched();
  }
}
