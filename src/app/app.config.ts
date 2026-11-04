import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SardanapalNg } from '@harpm/sardanapal-ng';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    SardanapalNg.providers({ apiBaseUrl: 'http://localhost:5000' }),
  ],
};
