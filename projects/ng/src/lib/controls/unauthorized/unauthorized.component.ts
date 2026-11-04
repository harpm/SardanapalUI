import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';
import { NzResultModule } from 'ng-zorro-antd/result';
import type { SardanapalUnauthorizedLabels } from '../../models/models';

/**
 * Display-only 403 page. Hosts mount it on the unauthorized route that
 * `HasRoleGuard` redirects to.
 */
@Component({
  selector: 's-unauthorized',
  imports: [NzResultModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './unauthorized.component.css',
  templateUrl: './unauthorized.component.html',
})
export class SardanapalUnauthorizedComponent implements OnChanges {
  private static readonly DEFAULT_LABELS: Required<SardanapalUnauthorizedLabels> = {
    title: '403',
    message: 'You do not have permission to view this page.',
  };

  @Input() labels: SardanapalUnauthorizedLabels = {};

  protected readonly title = signal(SardanapalUnauthorizedComponent.DEFAULT_LABELS.title);
  protected readonly message = signal(SardanapalUnauthorizedComponent.DEFAULT_LABELS.message);

  ngOnChanges(changes: SimpleChanges): void {
    if ('labels' in changes) {
      this.title.set(this.label('title'));
      this.message.set(this.label('message'));
    }
  }

  private label(key: keyof SardanapalUnauthorizedLabels): string {
    return this.labels[key] ?? SardanapalUnauthorizedComponent.DEFAULT_LABELS[key];
  }
}
