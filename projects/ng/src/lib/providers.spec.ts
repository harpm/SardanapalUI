import { Directionality, type Direction } from '@angular/cdk/bidi';
import { TestBed } from '@angular/core/testing';
import {
  SardanapalErrorChannel,
  SardanapalHttpClient,
  SardanapalHttpError,
} from '@sardanapal/client';
import { SardanapalAuthService } from '@sardanapal/identity-client';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzI18nService, en_US, fa_IR } from 'ng-zorro-antd/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SARDANAPAL_AUTH_SERVICE,
  SARDANAPAL_DIRECTION_SERVICE,
  SARDANAPAL_HTTP_CLIENT,
  SardanapalNg,
  SardanapalNgErrorToasts,
  SardanapalNgLocaleService,
  type SardanapalNgOptions,
} from '../public-api';

class NgTestKit {
  /** Registers the providers with the page target switched off, and spies on the toast service. */
  static configure(options: Partial<SardanapalNgOptions> = {}): { error: ReturnType<typeof vi.fn> } {
    TestBed.configureTestingModule({
      providers: [
        SardanapalNg.providers({
          apiBaseUrl: 'http://localhost:5000',
          direction: { target: null },
          ...options,
        }),
      ],
    });
    const error = vi.fn();
    TestBed.inject(NzMessageService).error = error as never;
    return { error };
  }
}

describe('SardanapalNg.providers', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('requires an api base url', () => {
    expect(() => SardanapalNg.providers({ apiBaseUrl: ' ' })).toThrow('apiBaseUrl is required.');
  });

  it('provides one shared http client and an auth service that uses it', () => {
    NgTestKit.configure();

    const http = TestBed.inject(SARDANAPAL_HTTP_CLIENT);
    const auth = TestBed.inject(SARDANAPAL_AUTH_SERVICE);

    expect(http).toBeInstanceOf(SardanapalHttpClient);
    expect(http.apiBaseUrl).toBe('http://localhost:5000');
    expect(auth).toBeInstanceOf(SardanapalAuthService);
    expect(auth.httpError$).toBe(http.httpError$);
    expect(TestBed.inject(SARDANAPAL_HTTP_CLIENT)).toBe(http);
  });

  it('passes the http and auth options through', () => {
    const errors = new SardanapalErrorChannel();
    NgTestKit.configure({ http: { errors }, auth: { refreshThresholdMinutes: 0 } });

    expect(TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors).toBe(errors);
  });

  it('provides the direction service with its options', () => {
    NgTestKit.configure({ direction: { target: null, defaultDirection: 'rtl' } });

    expect(TestBed.inject(SARDANAPAL_DIRECTION_SERVICE).getDirection()).toBe('rtl');
  });
});

describe('SardanapalNgDirectionBridge', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('starts with the current direction', () => {
    NgTestKit.configure({ direction: { target: null, defaultDirection: 'rtl' } });

    expect(TestBed.inject(Directionality).value).toBe('rtl');
  });

  it('pushes a direction change into the CDK Directionality and emits it', () => {
    NgTestKit.configure();
    const directionality = TestBed.inject(Directionality);
    const seen: Direction[] = [];
    directionality.change.subscribe((direction) => seen.push(direction));

    TestBed.inject(SARDANAPAL_DIRECTION_SERVICE).setDirection('rtl');
    TestBed.inject(SARDANAPAL_DIRECTION_SERVICE).setDirection('rtl');
    TestBed.inject(SARDANAPAL_DIRECTION_SERVICE).setDirection('ltr');

    expect(directionality.value).toBe('ltr');
    expect(seen).toEqual(['rtl', 'ltr']);
  });
});

describe('SardanapalNgErrorToasts', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('shows the error message of a failed request', () => {
    const { error } = NgTestKit.configure();

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(new SardanapalHttpError('Not Found', 404, null));

    expect(error).toHaveBeenCalledExactlyOnceWith('Not Found');
  });

  it('prefers the userMessage of an envelope body', () => {
    const { error } = NgTestKit.configure();
    const body = { isSuccess: false, statusCode: 1, userMessage: 'Name is required.' };

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(new SardanapalHttpError('Bad Request', 400, body));

    expect(error).toHaveBeenCalledExactlyOnceWith('Name is required.');
  });

  it('falls back to the error message when the envelope has a blank userMessage', () => {
    const body = { statusCode: 1, userMessage: '  ' };

    expect(SardanapalNgErrorToasts.textOf(new SardanapalHttpError('Boom', 500, body))).toBe('Boom');
  });

  it('skips a password-change 403', () => {
    const { error } = NgTestKit.configure();

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Password change required.', 403, null, true),
    );

    expect(error).not.toHaveBeenCalled();
  });

  it('shows nothing when error toasts are turned off', () => {
    const { error } = NgTestKit.configure({ errorToasts: false });

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(new SardanapalHttpError('Boom', 500, null));

    expect(error).not.toHaveBeenCalled();
  });
});

describe('SardanapalNgLocaleService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it.each([
    ['fa', fa_IR],
    ['fa-IR', fa_IR],
    ['en', en_US],
    ['de-DE', en_US],
  ] as const)('maps %s to the matching ng-zorro locale', (culture, locale) => {
    expect(SardanapalNgLocaleService.localeOf(culture)).toBe(locale);
  });

  it('sets the ng-zorro locale and lang, and leaves direction alone', () => {
    NgTestKit.configure({ direction: { target: null, defaultDirection: 'ltr' } });
    const service = TestBed.inject(SardanapalNgLocaleService);

    service.setCulture(' fa-IR ');

    expect(service.culture()).toBe('fa-IR');
    expect(TestBed.inject(NzI18nService).getLocale()).toBe(fa_IR);
    expect(document.documentElement.lang).toBe('fa-IR');
    expect(TestBed.inject(SARDANAPAL_DIRECTION_SERVICE).getDirection()).toBe('ltr');
  });

  it('rejects an empty culture without changing anything', () => {
    const service = TestBed.inject(SardanapalNgLocaleService);

    expect(() => service.setCulture('  ')).toThrow('Culture must not be empty.');
    expect(service.culture()).toBe('en');
  });
});
