/** Builds unsigned JWTs for the demo fake-session buttons. The JWT service decodes; it does not verify. */
export class DemoJwt {
  static encode(payload: Record<string, unknown>): string {
    return `${DemoJwt.part({ alg: 'none', typ: 'JWT' })}.${DemoJwt.part(payload)}.`;
  }

  private static part(value: unknown): string {
    const base64 = btoa(JSON.stringify(value));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
