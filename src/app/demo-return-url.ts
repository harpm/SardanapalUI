/** Picks a same-origin path from the login/change-password `returnUrl` query, else a fallback. */
export class DemoReturnUrl {
  static resolve(raw: string | null | undefined, fallback: string): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return fallback;
    }
    return raw;
  }
}
