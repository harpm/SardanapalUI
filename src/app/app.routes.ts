import type { Routes } from '@angular/router';
import {
  SardanapalAuthorizeGuard,
  SardanapalChangePasswordGuard,
  SardanapalHasRoleGuard,
} from '@harpm/sardanapal-ng';
import { AdminPageComponent } from './pages/admin.page';
import { ChangePasswordPageComponent } from './pages/change-password.page';
import { CheckboxPageComponent } from './pages/checkbox.page';
import { DatePageComponent } from './pages/date.page';
import { GridPageComponent } from './pages/grid.page';
import { HomePageComponent } from './pages/home.page';
import { LoginPageComponent } from './pages/login.page';
import { NumericPageComponent } from './pages/numeric.page';
import { PasswordPageComponent } from './pages/password.page';
import { SecurePageComponent } from './pages/secure.page';
import { SelectPageComponent } from './pages/select.page';
import { SwitchPageComponent } from './pages/switch.page';
import { TextAreaPageComponent } from './pages/text-area.page';
import { TextBoxPageComponent } from './pages/text-box.page';
import { TextPageComponent } from './pages/text.page';
import { UnauthorizedPageComponent } from './pages/unauthorized.page';

export const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'text', component: TextPageComponent },
  { path: 'text-box', component: TextBoxPageComponent },
  { path: 'text-area', component: TextAreaPageComponent },
  { path: 'numeric', component: NumericPageComponent },
  { path: 'select', component: SelectPageComponent },
  { path: 'date', component: DatePageComponent },
  { path: 'checkbox', component: CheckboxPageComponent },
  { path: 'switch', component: SwitchPageComponent },
  { path: 'password', component: PasswordPageComponent },
  { path: 'grid', component: GridPageComponent },
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
