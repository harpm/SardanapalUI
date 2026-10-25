import { SardanapalHttpClient } from '@sardanapal/client';
import { SardanapalAuthService } from '@sardanapal/identity-client';
import { describe, expect, it } from 'vitest';
import { SardanapalNgInfo } from '../public-api';

describe('@sardanapal/ng', () => {
  it('uses the s prefix for control selectors', () => {
    expect(SardanapalNgInfo.SELECTOR_PREFIX).toBe('s');
  });

  it('resolves both client packages', () => {
    const http = new SardanapalHttpClient({ apiBaseUrl: 'http://localhost' });
    const auth = new SardanapalAuthService({ client: http });

    expect(auth.getSession().token).toBeNull();
  });
});
