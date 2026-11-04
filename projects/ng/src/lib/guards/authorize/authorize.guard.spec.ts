import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalAuthorizeGuard } from './authorize.guard';
import {
  GuardChangePasswordPageComponent,
  GuardLoginPageComponent,
  GuardSecurePageComponent,
  GuardTestKit,
  GuardUnauthorizedPageComponent,
} from '../test-kit';

describe('SardanapalAuthorizeGuard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    GuardTestKit.reset();
  });

  it('sends an anonymous user to login with returnUrl', async () => {
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      {
        path: 'secure',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalAuthorizeGuard.canActivate()],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/secure')).toBe('/login?returnUrl=%2Fsecure');
  });

  it('activates when the session has a token', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn());
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      {
        path: 'secure',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalAuthorizeGuard.canActivate()],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/secure')).toBe('/secure');
  });

  it('uses a custom loginUrl from the guards options', async () => {
    const router = GuardTestKit.configure(
      [
        { path: 'sign-in', component: GuardLoginPageComponent },
        {
          path: 'secure',
          component: GuardSecurePageComponent,
          canActivate: [SardanapalAuthorizeGuard.canActivate()],
        },
        { path: 'change-password', component: GuardChangePasswordPageComponent },
        { path: 'unauthorized', component: GuardUnauthorizedPageComponent },
      ],
      { guards: { loginUrl: '/sign-in' } },
    );

    expect(await GuardTestKit.navigate(router, '/secure')).toBe('/sign-in?returnUrl=%2Fsecure');
  });
});
