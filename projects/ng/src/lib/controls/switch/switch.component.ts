import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { SardanapalControlBase } from '../../control-base';

/** `true` or `false`. `null` from the form shows as off. */
@Component({
  selector: 's-switch',
  imports: [FormsModule, NzSwitchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: inline-block; }'],
  templateUrl: './switch.component.html',
})
export class SardanapalSwitchComponent extends SardanapalControlBase<boolean> {
  @Input() checkedText: string | null = null;
  @Input() uncheckedText: string | null = null;
  @Input() size: 'default' | 'small' = 'default';

  protected onToggle(checked: boolean): void {
    this.updateValue(checked);
    this.markTouched();
  }
}
