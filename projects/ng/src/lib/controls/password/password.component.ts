import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { SardanapalTextControlBase } from '../text-control-base';

/** Single-line secret text. An emptied control gives `''`. */
@Component({
  selector: 's-password',
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  templateUrl: './password.component.html',
})
export class SardanapalPasswordComponent extends SardanapalTextControlBase {
  /** Shows the eye that reveals the text. */
  @Input({ transform: booleanAttribute }) visibilityToggle = true;
}
