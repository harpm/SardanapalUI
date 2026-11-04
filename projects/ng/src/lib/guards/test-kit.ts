import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  RouterOutlet,
  withDisabledInitialNavigation,
  type Routes,
} from '@angular/router';
import type { Session } from '@harpm/sardanapal-identity-client';
import { vi } from 'vitest';
import { SARDANAPAL_AUTH_SERVICE, SARDANAPAL_NG_OPTIONS } from '../tokens';
import type { SardanapalNgOptions } from '../options';

/** Helpers for the guard specs. Not part of the package: `tsconfig.lib.json` leaves it out. */
export class GuardTestKit {
  static auth: { getSession: ReturnType<typeof vi.fn> };

  static reset(): void {
    GuardTestKit.auth = {
      getSession: vi.fn(() => GuardTestKit.anonymous()),
    };
  }

  static anonymous(): Session {
    return { token: null, claims: null, mustChangePassword: false };
  }

  static signedIn(options: {
    roles?: Array<string | number>;
    mustChangePassword?: boolean;
  } = {}): Session {
    const mustChangePassword = options.mustChangePassword ?? false;
    return {
      token: 't',
      claims: {
        id: '7',
        roles: (options.roles ?? []).map((role) => String(role)),
        accessRights: [],
        controllerActions: [],
        mustChangePassword,
        exp: null,
      },
      mustChangePassword,
    };
  }

  static configure(routes: Routes, options: Partial<SardanapalNgOptions> = {}): Router {
    TestBed.configureTestingModule({
      imports: [GuardHostComponent],
      providers: [
        provideRouter(routes, withDisabledInitialNavigation()),
        {
          provide: SARDANAPAL_NG_OPTIONS,
          useValue: {
            apiBaseUrl: 'http://localhost:5000',
            ...options,
          } satisfies SardanapalNgOptions,
        },
        { provide: SARDANAPAL_AUTH_SERVICE, useValue: GuardTestKit.auth },
      ],
    });
    TestBed.createComponent(GuardHostComponent).detectChanges();
    return TestBed.inject(Router);
  }

  static async navigate(router: Router, url: string): Promise<string> {
    await router.navigateByUrl(url);
    return router.url;
  }
}

@Component({
  selector: 'app-guard-secure',
  template: 'secure',
})
export class GuardSecurePageComponent {}

@Component({
  selector: 'app-guard-login',
  template: 'login',
})
export class GuardLoginPageComponent {}

@Component({
  selector: 'app-guard-change-password',
  template: 'change-password',
})
export class GuardChangePasswordPageComponent {}

@Component({
  selector: 'app-guard-unauthorized',
  template: 'unauthorized',
})
export class GuardUnauthorizedPageComponent {}

@Component({
  selector: 'app-guard-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class GuardHostComponent {
  readonly router = inject(Router);
}
