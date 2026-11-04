import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalHasRoleGuard } from './has-role.guard';
import {
  GuardLoginPageComponent,
  GuardSecurePageComponent,
  GuardTestKit,
  GuardUnauthorizedPageComponent,
} from '../test-kit';

describe('SardanapalHasRoleGuard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    GuardTestKit.reset();
  });

  it('throws when the role is empty', () => {
    expect(() => SardanapalHasRoleGuard.for('')).toThrow('role is required.');
    expect(() => SardanapalHasRoleGuard.for('   ')).toThrow('role is required.');
  });

  it('sends an anonymous user to login with returnUrl', async () => {
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'unauthorized', component: GuardUnauthorizedPageComponent },
      {
        path: 'admin',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalHasRoleGuard.for('admin')],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/admin')).toBe('/login?returnUrl=%2Fadmin');
  });

  it('sends a signed-in user without the role to unauthorized', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn({ roles: ['viewer'] }));
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'unauthorized', component: GuardUnauthorizedPageComponent },
      {
        path: 'admin',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalHasRoleGuard.for('admin')],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/admin')).toBe('/unauthorized');
  });

  it('activates when the session has the required role', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn({ roles: ['admin'] }));
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'unauthorized', component: GuardUnauthorizedPageComponent },
      {
        path: 'admin',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalHasRoleGuard.for('admin')],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/admin')).toBe('/admin');
  });

  it('compares a numeric role as a string against claims.roles', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn({ roles: ['2'] }));
    const router = GuardTestKit.configure([
      { path: 'login', component: GuardLoginPageComponent },
      { path: 'unauthorized', component: GuardUnauthorizedPageComponent },
      {
        path: 'admin',
        component: GuardSecurePageComponent,
        canActivate: [SardanapalHasRoleGuard.for(2)],
      },
    ]);

    expect(await GuardTestKit.navigate(router, '/admin')).toBe('/admin');
  });

  it('uses a custom unauthorizedUrl from the guards options', async () => {
    GuardTestKit.auth.getSession.mockReturnValue(GuardTestKit.signedIn({ roles: ['viewer'] }));
    const router = GuardTestKit.configure(
      [
        { path: 'login', component: GuardLoginPageComponent },
        { path: 'forbidden', component: GuardUnauthorizedPageComponent },
        {
          path: 'admin',
          component: GuardSecurePageComponent,
          canActivate: [SardanapalHasRoleGuard.for('admin')],
        },
      ],
      { guards: { unauthorizedUrl: '/forbidden' } },
    );

    expect(await GuardTestKit.navigate(router, '/admin')).toBe('/forbidden');
  });
});
