# Sardanapal UI

Component library for apps that host the Sardanapal Core and Sardanapal Identity service bases. Core and Identity stay .NET class libraries. A host app exposes those bases over HTTP; this library calls that host. It never references the .NET assemblies.

The non-visual clients work from any UI framework. The `s-*` controls are Angular 22 components on ng-zorro-antd 22.

## Packages

| Package | What it is |
| --- | --- |
| `@harpm/sardanapal-client` | HTTP transport, `IResponse<T>` envelope, storage, direction, CRUD, and panel (`$getDictionary`, `$getExcel`). |
| `@harpm/sardanapal-identity-client` | Login, token cache, refresh, JWT claims, account, and OTP. Depends on `@harpm/sardanapal-client`. |
| `@harpm/sardanapal-ng` | Angular providers and the `s-*` controls. Depends on both clients. |

The packages publish to GitHub Packages (`https://npm.pkg.github.com`) as `@harpm/sardanapal-client`, `@harpm/sardanapal-identity-client`, and `@harpm/sardanapal-ng`. `Build.json` owns the version. A push to `master` builds, tests, and publishes.

A host installs with a `read:packages` token and this `.npmrc`:

```
@harpm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @harpm/sardanapal-client @harpm/sardanapal-identity-client @harpm/sardanapal-ng
```

## Commands

```bash
npm install          # see AGENTS.md Toolchain if the registry or Node version fights back
npm test
npm run build
npm start            # builds the clients, then serves the demo
```

## Clients

```ts
import { SardanapalHttpClient, SardanapalPanelClient } from '@harpm/sardanapal-client';
import { SardanapalAuthService } from '@harpm/sardanapal-identity-client';

const http = new SardanapalHttpClient({ apiBaseUrl: 'https://host/api' });
const auth = new SardanapalAuthService({ client: http });
const orders = new SardanapalPanelClient({ client: http, resource: 'orders' });

orders.$getAll({ pageIndex: 0, pageSize: 25 }).subscribe((result) => {
  if (result.isSuccess) {
    console.log(result.data?.list);
  }
});
```

The auth header is `AUTH` with the raw JWT. A failed request is reported once on `http.httpError$` as a `SardanapalHttpError`. A 2xx body with a non-zero `statusCode` is returned, not thrown — show `userMessage`.

`$getExcel` posts to `{resource}/excel` (not `get-excel`) and returns file bytes. Override the path with `endpoints.getExcel` if the host uses another route.

## Angular

Register the bridge once. It shares one HTTP client, auth, and direction service, starts error toasts, and provides ng-zorro's native date adapter for `s-date`.

```ts
import { SardanapalNg } from '@harpm/sardanapal-ng';

export const appConfig: ApplicationConfig = {
  providers: [SardanapalNg.providers({ apiBaseUrl: 'https://host/api' })],
};
```

Build CRUD, panel, and account clients with `client: inject(SARDANAPAL_HTTP_CLIENT)` or `auth: inject(SARDANAPAL_AUTH_SERVICE)` so calls carry the `AUTH` header.

Language and direction are separate. Call both `SardanapalNgLocaleService.setCulture` and `SardanapalDirectionService.setDirection` when the user switches language (the demo app does this).

<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
### Route guards

Peer `@angular/router`. Stack `Authorize`, then `ChangePassword`, then `HasRole` when a role is required. Redirect URLs default to `/login`, `/change-password` and `/unauthorized` (`options.guards`). Do not put `ChangePasswordGuard` on the change-password route.

<<<<<<< Updated upstream
=======
### Not found

`SardanapalNgNotFoundInterceptor` starts with the providers. When a request fails with HTTP 404 it navigates to `options.notFound.url` (default `/not-found`, set `notFound: { redirect: false }` to turn it off). Mount `s-not-found` on that route and on the `**` wildcard route so unknown URLs land on the same page (the demo app does both).

```ts
{
  path: 'not-found',
  component: NotFoundPage, // renders <s-not-found />
},
{ path: '**', component: NotFoundPage },
```

>>>>>>> Stashed changes
```ts
{
  path: 'admin',
  canActivate: [
    SardanapalAuthorizeGuard.canActivate(),
    SardanapalChangePasswordGuard.canActivate(),
    SardanapalHasRoleGuard.for('admin'),
  ],
}
```

<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
>>>>>>> Stashed changes
### Controls

Selectors are `s-<name>`. Editing controls implement `ControlValueAccessor` (`ngModel`, `formControl`, `formControlName`).

| Selector | Role |
| --- | --- |
| `s-text` | Display-only text |
| `s-text-box` | Single-line text |
| `s-text-area` | Multi-line text |
| `s-numeric` | Number |
| `s-select` | Static options, or a panel `$getDictionary` (typed text goes in `dynamicField`) |
| `s-date` | Date, optional time |
| `s-checkbox` | Boolean |
| `s-switch` | Boolean |
| `s-password` | Secret text |
| `s-grid` | Page and sort through `$getAll` |
<<<<<<< Updated upstream
| `s-login` | Password and OTP login page |
| `s-change-password` | Change password, then sign in again |
| `s-unauthorized` | Display-only 403 page (`nz-result`) |
=======
<<<<<<< Updated upstream
=======
| `s-login` | Password and OTP login page |
| `s-change-password` | Change password, then sign in again |
| `s-unauthorized` | Display-only 403 page (`nz-result`) |
| `s-not-found` | Display-only 404 page (`nz-result`) |
>>>>>>> Stashed changes
>>>>>>> Stashed changes

Inputs and outputs use `@Input()` / `@Output()`. Internal state uses `signal()`. Each control lives in `projects/ng/src/lib/controls/<name>/`. Details and the wire protocol are in [AGENTS.md](AGENTS.md).
