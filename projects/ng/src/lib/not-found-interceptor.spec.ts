import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { SardanapalHttpError } from '@harpm/sardanapal-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SARDANAPAL_HTTP_CLIENT,
  SardanapalNg,
  SardanapalNgNotFoundInterceptor,
  type SardanapalNgOptions,
} from '../public-api';

@Component({ selector: 'app-not-found-home', template: 'home' })
class NotFoundHomeComponent {}

@Component({ selector: 'app-not-found-page', template: 'not-found' })
class NotFoundPageComponent {}

class InterceptorTestKit {
  static configure(options: Partial<SardanapalNgOptions> = {}): Router {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: '', component: NotFoundHomeComponent },
            { path: 'not-found', component: NotFoundPageComponent },
            { path: 'missing', component: NotFoundPageComponent },
          ],
          withDisabledInitialNavigation(),
        ),
        SardanapalNg.providers({
          apiBaseUrl: 'http://localhost:5000',
          errorToasts: false,
          direction: { target: null },
          ...options,
        }),
      ],
    });
    return TestBed.inject(Router);
  }

  static report404(router: Router, url: string): Promise<void> {
    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Not Found', 404, null),
    );
    return vi.waitFor(() => expect(router.url).toBe(url));
  }
}

describe('SardanapalNgNotFoundInterceptor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sends a 404 to the not-found page', async () => {
    const router = InterceptorTestKit.configure();

    await InterceptorTestKit.report404(router, '/not-found');
  });

  it('leaves the page alone for other statuses', async () => {
    const router = InterceptorTestKit.configure();
    const navigate = vi.spyOn(router, 'navigateByUrl');

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Boom', 500, null),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(navigate).not.toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('uses the configured not-found url', async () => {
    const router = InterceptorTestKit.configure({ notFound: { url: '/missing' } });

    expect(TestBed.inject(SardanapalNgNotFoundInterceptor).notFoundUrl()).toBe('/missing');

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Not Found', 404, null),
    );
    await vi.waitFor(() => expect(router.url).toBe('/missing'));
  });

  it('does not navigate again when the user is already on the not-found page', async () => {
    const router = InterceptorTestKit.configure();
    await router.navigateByUrl('/not-found');

    const navigate = vi.spyOn(router, 'navigateByUrl');
    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Not Found', 404, null),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('is not registered when redirect is false', async () => {
    const router = InterceptorTestKit.configure({ notFound: { redirect: false } });

    TestBed.inject(SARDANAPAL_HTTP_CLIENT).errors.report(
      new SardanapalHttpError('Not Found', 404, null),
    );
    await TestBed.inject(ApplicationRef).whenStable();

    expect(router.url).toBe('/');
  });
});
