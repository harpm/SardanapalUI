import type { CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SardanapalGuardBase } from '../guard-base';

/**
 * Sends a `mustChangePassword` session to the change-password page. Anonymous
 * users go to login. Do not put this guard on the change-password route itself.
 */
export class SardanapalChangePasswordGuard extends SardanapalGuardBase {
  /** Angular's router requires a `CanActivateFn`. */
  static canActivate(): CanActivateFn {
    return (_route, state) => new SardanapalChangePasswordGuard().check(state);
  }

  private check(state: RouterStateSnapshot): boolean | UrlTree {
    const session = this.session();
    if (!this.isSignedIn(session)) {
      return this.loginTree(state.url);
    }
    if (session.mustChangePassword) {
      return this.changePasswordTree(state.url);
    }
    return true;
  }
}
