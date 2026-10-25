import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { en_US, fa_IR, NzI18nService, type NzI18nInterface } from 'ng-zorro-antd/i18n';

/**
 * Owns the language of the ng-zorro controls. It sets the ng-zorro locale and
 * `lang` on the page, and it does not touch direction: whatever calls
 * `setCulture` also calls `SardanapalDirectionService.setDirection`.
 */
@Injectable({ providedIn: 'root' })
export class SardanapalNgLocaleService {
  private readonly i18n = inject(NzI18nService);
  private readonly document = inject(DOCUMENT);
  private readonly cultureSignal = signal('en');

  /** The current culture name, for example `en` or `fa-IR`. */
  readonly culture = this.cultureSignal.asReadonly();

  /** `fa` and `fa-IR` use the ng-zorro `fa_IR` locale, every other culture `en_US`. */
  static localeOf(culture: string): NzI18nInterface {
    const language = culture.trim().toLowerCase().split(/[-_]/)[0];
    return language === 'fa' ? fa_IR : en_US;
  }

  setCulture(culture: string): void {
    const value = culture.trim();
    if (!value) {
      throw new Error('Culture must not be empty.');
    }
    this.i18n.setLocale(SardanapalNgLocaleService.localeOf(value));
    this.document.documentElement.lang = value;
    this.cultureSignal.set(value);
  }
}
