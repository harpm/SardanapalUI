import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { SardanapalHttpInterceptor } from '@harpm/sardanapal-client';
import { firstValueFrom } from 'rxjs';
import type { SardanapalAuthService } from './sardanapal-auth-service';

/**
 * Connects the shared `SardanapalHttpClient` to `SardanapalAuthService`. It holds
 * no token state: every decision is delegated to the auth service. Register it
 * with `client.use(...)`.
 */
export class SardanapalAuthInterceptor implements SardanapalHttpInterceptor {
  static readonly AUTH_HEADER_NAME = 'AUTH';

  constructor(private readonly auth: SardanapalAuthService) {}

  async request(config: InternalAxiosRequestConfig): Promise<void> {
    if (!config.skipRefresh && this.auth.shouldRefresh()) {
      await firstValueFrom(this.auth.$refresh());
    }

    config.headers.delete('Authorization');
    if (!config.skipAuth) {
      const token = this.auth.currentToken();
      if (token) {
        config.headers.set(SardanapalAuthInterceptor.AUTH_HEADER_NAME, token);
      }
    }
  }

  response(response: AxiosResponse): void {
    this.auth.handleResponse(response);
  }
}
