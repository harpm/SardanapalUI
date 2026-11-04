import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalChangePasswordGuard } from './change-password.guard';
import {
  GuardChangePasswordPageComponent,
  GuardLoginPageComponent,
  GuardSecurePageComponent,
  GuardTestKit,
} from '../test-kit';

describe('SardanapalChangePasswordGuard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    GuardTestKit.reset();
  });

  it('sends an anonymous user to login with returnUrl', async () => {
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'change-password', component: GuardChangePasswordPageComponent },
      {
        path: 'secure',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalChangePasswordGuard.canActivate()],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/secure')).toBe('/login?returnUrl=%2Fsecure');
  });

  it('sends a mustChangePassword session to change-password with returnUrl', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(
      GuardTestKit.signedIn({ mustChangePassword: true }),
    );
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'change-password', component: GuardChangePasswordPageComponent },
      {
        path: 'secure',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalChangePasswordGuard.canActivate()],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/secure')).toBe(
      '/change-password?returnUrl=%2Fsecure',
    );
  });

  it('activates when the session does not require a password change', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn());
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'change-password', component: GuardChangePasswordPageComponent },
      {
        path: 'secure',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalChangePasswordGuard.canActivate()],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/secure')).toBe('/secure');
  });

  it('uses a custom changePasswordUrl from the guards options', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(
      GuardTestKit.signedIn({ mustChangePassword: true }),
    );
    const router = GuardTestKit.configure(
      [
        { path: 'login', component: GuardLoginPageComponent },
        { path: 'reset-password', component: GuardChangePasswordPageComponent },
        {
          path: 'secure',
          component: GuardSecurePageComponent,
          canActivate: [SardanapalChangePasswordGuard.canActivate()],
        },
      ],
      { guards: { changePasswordUrl: '/reset-password' } },
    );

    expect(await GuardTestKit.navigate(router, '/secure')).toBe(
      '/reset-password?returnUrl=%2Fsecure',
    );
  });
});
