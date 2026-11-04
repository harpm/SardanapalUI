import { inject } from '@angular/core';
import { Router, type UrlTree } from '@angular/router';
import type { SardanapalAuthService, Session } from '@harpm/sardanapal-identity-client';
import { SARDANAPAL_AUTH_SERVICE, SARDANAPAL_NG_OPTIONS } from '../tokens';
import type { SardanapalNgOptions } from '../options';

/**
 * Shared redirect helpers for the authorize, change-password and has-role guards.
 * Instantiated inside a `CanActivateFn` so `inject()` runs in the router context.
 */
export abstract class SardanapalGuardBase {
  protected static readonly DEFAULT_LOGIN_URL = '/login';
  protected static readonly DEFAULT_CHANGE_PASSWORD_URL = '/change-password';
  protected static readonly DEFAULT_UNAUTHORIZED_URL = '/unauthorized';

  protected readonly auth: SardanapalAuthService = inject(SARDANAPAL_AUTH_SERVICE);
  private readonly router = inject(Router);
  private readonly options: SardanapalNgOptions = inject(SARDANAPAL_NG_OPTIONS);

  protected session(): Session {
    return this.auth.getSession();
  }

  protected isSignedIn(session: Session = this.session()): boolean {
    return session.token !== null;
  }

  protected loginTree(returnUrl: string): UrlTree {
    return this.redirectTree(this.loginUrl(), returnUrl);
  }

  protected changePasswordTree(returnUrl: string): UrlTree {
    return this.redirectTree(this.changePasswordUrl(), returnUrl);
  }

  protected unauthorizedTree(): UrlTree {
    return this.router.parseUrl(this.unauthorizedUrl());
  }

  private loginUrl(): string {
    return this.options.guards?.loginUrl?.trim() || SardanapalGuardBase.DEFAULT_LOGIN_URL;
  }

  private changePasswordUrl(): string {
    return (
      this.options.guards?.changePasswordUrl?.trim() || SardanapalGuardBase.DEFAULT_CHANGE_PASSWORD_URL
    );
  }

  private unauthorizedUrl(): string {
    return (
      this.options.guards?.unauthorizedUrl?.trim() || SardanapalGuardBase.DEFAULT_UNAUTHORIZED_URL
    );
  }

  private redirectTree(path: string, returnUrl: string): UrlTree {
    const tree = this.router.parseUrl(path);
    tree.queryParams = { ...tree.queryParams, returnUrl };
    return tree;
  }
}
