import type { CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SardanapalGuardBase } from '../guard-base';

/**
 * Allows a route when the session has a token. Anonymous users go to the
 * configured login URL with `returnUrl` set to the attempted path.
 */
export class SardanapalAuthorizeGuard extends SardanapalGuardBase {
  /** Angular's router requires a `CanActivateFn`. */
  static canActivate(): CanActivateFn {
    return (_route, state) => new SardanapalAuthorizeGuard().check(state);
  }

  private check(state: RouterStateSnapshot): boolean | UrlTree {
    return this.isSignedIn() ? true : this.loginTree(state.url);
  }
}
