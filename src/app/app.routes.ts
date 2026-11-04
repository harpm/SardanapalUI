import type { Routes } from '@angular/router';
import {
  SardanapalAuthorizeGuard,
  SardanapalChangePasswordGuard,
  SardanapalHasRoleGuard,
} from '@harpm/sardanapal-ng';
import { AdminPageComponent } from './pages/admin.page';
import { ChangePasswordPageComponent } from './pages/change-password.page';
import { LoginPageComponent } from './pages/login.page';
import { PlaygroundPageComponent } from './pages/playground.page';
import { SecurePageComponent } from './pages/secure.page';
import { UnauthorizedPageComponent } from './pages/unauthorized.page';

export const appRoutes: Routes = [
  { path: '', component: PlaygroundPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'change-password', component: ChangePasswordPageComponent },
  { path: 'unauthorized', component: UnauthorizedPageComponent },
  {
    path: 'secure',
    component: SecurePageComponent,
    canActivate: [
      SardanapalAuthorizeGuard.canActivate(),
      SardanapalChangePasswordGuard.canActivate(),
    ],
  },
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [
      SardanapalAuthorizeGuard.canActivate(),
      SardanapalChangePasswordGuard.canActivate(),
      SardanapalHasRoleGuard.for('admin'),
    ],
  },
  { path: '**', redirectTo: '' },
];
