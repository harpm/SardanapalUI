import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';
import { NzResultModule } from 'ng-zorro-antd/result';
import type { SardanapalNotFoundLabels } from '../../models/models';

/**
 * Display-only 404 page. Hosts mount it on the not-found route and on the
 * `**` wildcard route, and `SardanapalNgNotFoundInterceptor` sends the user
 * there when a request fails with 404.
 */
@Component({
  selector: 's-not-found',
  imports: [NzResultModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './not-found.component.css',
  templateUrl: './not-found.component.html',
})
export class SardanapalNotFoundComponent implements OnChanges {
  private static readonly DEFAULT_LABELS: Required<SardanapalNotFoundLabels> = {
    title: '404',
    message: 'The page you are looking for does not exist.',
  };

  @Input() labels: SardanapalNotFoundLabels = {};

  protected readonly title = signal(SardanapalNotFoundComponent.DEFAULT_LABELS.title);
  protected readonly message = signal(SardanapalNotFoundComponent.DEFAULT_LABELS.message);

  ngOnChanges(changes: SimpleChanges): void {
    if ('labels' in changes) {
      this.title.set(this.label('title'));
      this.message.set(this.label('message'));
    }
  }

  private label(key: keyof SardanapalNotFoundLabels): string {
    return this.labels[key] ?? SardanapalNotFoundComponent.DEFAULT_LABELS[key];
  }
}
