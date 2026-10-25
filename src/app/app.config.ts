import type { ApplicationConfig } from '@angular/core';
import { SardanapalNg } from '@sardanapal/ng';

export const appConfig: ApplicationConfig = {
  providers: [SardanapalNg.providers({ apiBaseUrl: 'http://localhost:5000' })],
};
