import type { CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SardanapalGuardBase } from '../guard-base';

/**
 * Allows a route when the session JWT `sd_roles` claim includes the required
 * role. Anonymous users go to login; a signed-in user without the role goes to
 * the unauthorized page.
 */
export class SardanapalHasRoleGuard extends SardanapalGuardBase {
  private constructor(private readonly requiredRole: string) {
    super();
  }

  /**
   * Builds a `CanActivateFn` for one role. The role is compared as a string
   * against `session.claims.roles` (JWT `sd_roles`).
   * Angular's router requires a `CanActivateFn`.
   */
  static for(role: string | number): CanActivateFn {
    const required = String(role).trim();
    if (!required) {
      throw new Error('role is required.');
    }
    return (_route, state) => new SardanapalHasRoleGuard(required).check(state);
  }

  private check(state: RouterStateSnapshot): boolean | UrlTree {
    const session = this.session();
    if (!this.isSignedIn(session)) {
      return this.loginTree(state.url);
    }
    const roles = session.claims?.roles ?? [];
    return roles.includes(this.requiredRole) ? true : this.unauthorizedTree();
  }
}
