# AGENTS.md

Guidance for AI agents working in the **Sardanapal UI** repository.

## What this is

Sardanapal UI is the component library for apps that host the **Sardanapal Core** and **Sardanapal Identity** service bases. It is a library, not a finished product app. Core and Identity are .NET class libraries: they ship base classes such as `CrudServiceBase`, `PanelServiceBase`, and the account and token services. They do not ship controllers or routes.

A future host app subclasses those bases and exposes them over HTTP. This library calls that host. It never references the .NET assemblies. Paths stay configurable, because each host chooses its own routes. The stable contract is the service method and the `IResponse<T>` body.

Companion repos are the sibling directories `../SardanapalCore` and `../SardanapalIdentity`.

## Repository layout

The repo is on `master`. These three files exist first. The packages below are the target layout; do not invent a different split.

```
AGENTS.md
README.md
.gitignore
projects/
  client/                  @sardanapal/client            plain TypeScript, no Angular (Core)
  identity-client/         @sardanapal/identity-client   plain TypeScript, no Angular (Identity), depends on client
  ng/                      @sardanapal/ng                Angular library, depends on both
src/                       Small Angular demo app for clicking through the controls
```

## Packages

Three packages. Do not fold the HTTP client into the Angular library. Core and Identity are separate frameworks, so their clients are separate packages: an app that only uses Core must not pull Identity code. Dependency direction is `identity-client` to `client`, never the other way. `SardanapalAuthService` accepts an optional `client` option, so Core CRUD/panel calls made through the same `SardanapalHttpClient` carry the `AUTH` header.


| Package              | Role                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sardanapal/client` | Core side: `SardanapalHttpClient` (transport and interceptor hooks), `SardanapalHttpError`, the `IResponse<T>` envelope, storage adapters, direction, CRUD, and panel calls. No Angular dependency. |
| `@sardanapal/identity-client` | Identity side: `SardanapalAuthService` (login, token cache, automatic refresh, session) and `SardanapalJwtService` (claims), plus `SardanapalAccountClient` and `SardanapalOtpAccountClient` (register, edit, change password, OTP flows). Plugs into the core client as an interceptor. No Angular dependency. |
| `@sardanapal/ng`     | Angular 22 library. Selectors `s-<name>`, implemented with `ng-zorro-antd` 22.x (peer `@angular/*` `^22`). Depends on both clients. |


`ng-zorro-antd` is Angular-only (forms, CDK, dependency injection). The `s-*` components stay in `@sardanapal/ng`. A later React or Vue package would wrap `@sardanapal/client` and would not reuse the Angular templates. Do not compile the controls to Angular Elements: that ships the Angular runtime into every host and breaks `ngModel` and reactive forms.

Keep ng-zorro. It covers the first controls, ships a `fa_IR` locale, and flips layout when `dir="rtl"` is set on `html` (CDK bidi plus `NzConfigService`). `s-grid` talks to panel search through its own inputs, with `nz-table` behind that API, so the table widget can be replaced later without renaming the component.

## Commands

```bash
npm install          # see "Toolchain" below for the registry and Node notes
npm test             # client and identity-client (vitest), then @sardanapal/ng (ng test)
npm run build        # clients (tsc), then ng build ng, then ng build demo
npm start            # builds the clients, then serves the demo app
```

Run the tests before any commit. Do not commit while tests are failing.

### Toolchain

- **Angular 22 needs Node `^22.22.3`, `^24.15` or newer.** The machine's system Node can be older, so the repo carries its own: the devDependency `node` (Node 24) puts a `node` shim in `node_modules/.bin`. `npm run` scripts put that folder first on `PATH`, so `ng`, `vitest` and `tsc` run on it. Do not rely on `node -v` in a plain shell; use `npm run <script>` or `npx ng ...` after putting `node_modules/.bin` first on `PATH`.
- **Registry.** The lockfile resolves from `registry.npmjs.org`. If the user's npm config points at a private feed with an expired credential, pass `--registry=https://registry.npmjs.org/` (or set `npm_config_registry`) for that command. Do not edit the user's `.npmrc`.
- **npm 10.9 crashes** (`Cannot read properties of null (reading 'edgesOut')`) when the workspace peer sets are resolved. Install with npm 11 instead: `npx --yes npm@11 install`. npm 11 only runs install scripts that are allow-listed. `allowScripts` in the root `package.json` allows the `node` package, whose preinstall downloads the Node binary. When a new dependency needs an install script, review it with `npx npm@11 install-scripts ls` before approving it.
- **TypeScript.** `ng-packagr` 22 requires TypeScript `>=6.0 <6.1`, so the root and the Angular packages use 6.0. `@sardanapal/client` and `@sardanapal/identity-client` stay on 5.9 (npm nests that copy under each package). Vitest is `^4` everywhere.
- **Path mapping.** The root `tsconfig.json` maps `@sardanapal/ng` to the library source, so the demo app does not need the library built first. It does need the two clients built (`npm run build:clients`), because they resolve through their `dist`.

## Workflow rules

These rules govern how an agent operates in this repo. Follow them strictly.

1. **Never commit without explicit permission.** Stage changes and stop. Do not run `git commit`, push, amend, or open a PR unless the user explicitly asks.
2. **Commit messages must match the sibling repos.** Look at `git log --oneline` in `../SardanapalCore` and `../SardanapalIdentity` first. The format is `<type>: <lowercase description>`. Types already in use: `resolve` (bug fix), `implement` (new capability), `update` (change to existing behavior), `refactor`, `docs`, `release`, `add`, `rm`. Example: `docs: add agents.md guide for the ui library`.
3. **Log any issue you notice while working.** If you spot a bug, inconsistency, or improvement during a task, append a row to `**Issue.csv`** rather than silently fixing unrelated work. The file has a `State` column: `pending`, `fixed`, `rejected`. Create the file with headers if it does not yet exist.
4. **Never commit `Issue.csv` or any other `.csv`.** It is local-only tracking (gitignored). Do not stage it, even when committing a fix described by a row in it. Update its `State` locally only.
5. **Do not commit if the tests are failing.** Run the test suite before committing. If any test fails, fix the failure before staging the commit.
6. **Do not commit secrets** (tokens, `.env` files, signing keys).

## Code style rules

7. **Write object-oriented code only.** Behavior lives in classes. Helpers go in the class that uses them as `private` methods (or `private static` when they need no instance state). Do not add free-standing functions or module-level function-valued constants (`function foo()`, `const foo = () => ...`), exported or not. Shared behavior goes in a class, a base class, or a composed collaborator class.
8. **Raw functions are allowed only in special circumstances,** such as a framework or tool that requires one (for example a test-file helper that the runner expects, or a config file that must export a function). Keep each exception minimal and add a one-line comment saying why a class cannot be used. If it is not obviously such a case, ask the user first.

## Wire protocol

Every response body is the Core envelope. Property names on the wire are camelCase.


| Field               | Meaning                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `isSuccess`         | True only when `statusCode` is `Succeeded` (`0`)                                                                  |
| `serviceName`       | Name of the service that produced the result                                                                      |
| `operationType`     | `Fetch = 0`, `Add = 1`, `Edit = 2`, `Delete = 3`, `Function = 4`                                                  |
| `statusCode`        | `Succeeded = 0`, `Failed = 1`, `Canceled = 3`, `NotExists = 4`, `Exception = 5`, `Duplicate = 6`, `Forbidden = 7` |
| `developerMessages` | `string[]`                                                                                                        |
| `userMessage`       | Single string, already localized by the host                                                                      |
| `data`              | Payload for `IResponse<T>`                                                                                        |


Show `userMessage` when `isSuccess` is false. Treat `statusCode === 0` as success.

### Endpoint map

The client takes a configurable endpoint map (`apiBaseUrl` plus a path per method, overridable per resource). Do not hardcode one URL scheme as if Core or Identity published it. A host that has not chosen routes yet can follow this default, still overridable:

#### Crud and Panel endpoints
```
GET {apiBaseUrl}/{resource}/{id}
POST {apiBaseUrl}/{resource}/get-all
POST {apiBaseUrl}/{resource}/add
GET {apiBaseUrl}/{resource}/get-editable/{id}
PUT {apiBaseUrl}/{resource}/{id}
DELETE {apiBaseUrl}/{resource}/{id}
POST {apiBaseUrl}/{resource}/dictionary
POST {apiBaseUrl}/{resource}/excel
```
#### Identity endpoints
```
POST {apiBaseUrl}/account/login
POST {apiBaseUrl}/account/refresh          optional
POST {apiBaseUrl}/account/register
GET {apiBaseUrl}/account/get-editable/{id}
PUT {apiBaseUrl}/account/{id}
DELETE {apiBaseUrl}/account/{id}
POST {apiBaseUrl}/account/change-password
POST {apiBaseUrl}/account/change-user-password
POST {apiBaseUrl}/account/request-login-otp
POST {apiBaseUrl}/account/login-with-otp
POST {apiBaseUrl}/account/request-register-otp
POST {apiBaseUrl}/account/register-with-otp
POST {apiBaseUrl}/account/request-reset-password
POST {apiBaseUrl}/account/reset-password
```

`get-excel` returns file bytes, not the JSON envelope.

## Services

### Auth

Lives in `@sardanapal/identity-client`. Matches the Identity account and token services.

- Request header name is `AUTH`. The value is the raw JWT. Do not send an `Authorization` header and do not add a `Bearer`  prefix.
- Login body is `{ username, password }`. Success data is `{ token }`. Read the lifetime from the JWT `exp` claim. `LoginDto` has no `expiresIn` and no refresh token.
- Cache the token in memory. An optional storage adapter may persist it. Never log the token.
- Attach `AUTH` on every API call when a token is cached.
- If a response carries an `AUTH` header, replace the cached token. That is the server sliding refresh when the host enables it (`TokenRefreshThresholdMinutes`, default 10). A threshold of `0` or less disables it on the server.
- If a refresh URL is configured, run one in-flight refresh when `exp` is inside that window, then let waiting calls continue. Parallel calls share that single refresh.
- HTTP 401 clears the token. HTTP 403 whose body is the password-change message keeps the token and surfaces `must_change_pw`.
- Logout clears the cache only. Identity has no logout or revoke method. The server accepts the JWT until `exp`.
- Claims to read: `id`, `sd_roles`, `AccessRight`, `sd_controller_action`, `must_change_pw`.

`IAccountService.RefreshToken(userId)` returns `IResponse<string>` whose `data` is a new JWT. It is optional and it is not an OAuth refresh grant. Prefer the `AUTH` response header when the host uses sliding refresh.

### Account and OTP

Live in `@sardanapal/identity-client`. `SardanapalAccountClient` matches `IAccountService` (everything except `Login` and `RefreshToken`, which stay on `SardanapalAuthService`). `SardanapalOtpAccountClient` extends it with `IOtpAccountService`. Both take `{ auth, endpoints? }` and send through `auth.$request`, so calls share the HTTP client and carry the `AUTH` header. Methods carry the `$` prefix and return the body as received, like the CRUD client. Override any route with `endpoints`.

| Method | Request | Response `data` | Default route | `AUTH` |
| --- | --- | --- | --- | --- |
| `$register` | `RegisterModel` | new user key | `POST account/register` | sent |
| `$getEditable` | key | `UserEditableModel` | `GET account/get-editable/{id}` | sent |
| `$edit` | key + `UserEditableModel` | `boolean` | `PUT account/{id}` | sent |
| `$delete` | key | `boolean` | `DELETE account/{id}` | sent |
| `$changePassword` | `{ username, oldPassword, newPassword }` | `boolean` | `POST account/change-password` | not sent |
| `$changeUserPassword` | `{ userId, newPassword }` | `boolean` | `POST account/change-user-password` | sent |
| `$requestLoginOtp` | `{ email or phoneNumber, role }` | user key, if the host returns it | `POST account/request-login-otp` | not sent |
| `$loginWithOtp` | `{ userId, roleId, code }` | `{ token }`, stored like `$login` | `POST account/login-with-otp` | not sent |
| `$requestRegisterOtp` | `{ email or phoneNumber, role }` | user key, if the host returns it | `POST account/request-register-otp` | not sent |
| `$registerWithOtp` | `{ userId, roleId, code }` | `boolean` | `POST account/register-with-otp` | not sent |
| `$requestResetPassword` | `{ email or phoneNumber }` | user key | `POST account/request-reset-password` | not sent |
| `$resetPassword` | `{ userId, roleId, code, newPassword }` | `boolean` | `POST account/reset-password` | not sent |

- "Not sent" calls skip the `AUTH` header and do not trigger a refresh, so a stale token cannot turn them into a 401.
- `$changePassword` proves the old password and is the call a `must_change_pw` user makes: the Identity authorize filter rejects every other authorized call with 403 until the password changes. The cached token still carries `must_change_pw` afterwards, so log in again.
- `SardanapalAuthService.setToken(token)` stores a token obtained outside `$login`. `$loginWithOtp` uses it, and only when `statusCode` is `0` and `data.token` is set.
- Property names are camelCase on the wire. Failed calls reject with `SardanapalHttpError`. These clients do not set `resource` or `operation` on it.

### CRUD

Method names match Core. There is no `Save` and no `Search`. Create is `add`. List is `getAll`. Update is `edit`.

`SardanapalCrudClient` lives in `@sardanapal/client`. Like the auth service, each method carries the `$` prefix and returns an `Observable<IResponse<T>>`. axios deserializes the body and the method only supplies the type, so the body is returned exactly as received. `IResponse.isSuccess` is a readonly boolean the host sends (Core's `IsSuccess`), not a method. Check it and show `userMessage` yourself. A failure status inside a 2xx body is returned, not thrown. Non-2xx and transport failures reject with `SardanapalHttpError`. Pass the shared `SardanapalHttpClient` so calls carry the `AUTH` header.

There is one error type and one error stream. A request that fails (transport failure with `status` 0, or non-2xx) produces a single `SardanapalHttpError`. `SardanapalHttpClient` reports it once on its `SardanapalErrorChannel` (`client.errors.error$`, also `client.httpError$`) and rejects the call with the same instance. Calls made through a CRUD or panel client set `resource` and `operation` (for example `orders` and `getAll`) on the error, so a subscriber can tell them apart. Interceptors do not report: they throw a plain `SardanapalHttpError` and the client reports it. A 2xx body with a failure `statusCode` is not an error. Pass `errors` in the `SardanapalHttpClient` options to share one channel between several clients.

```ts
client.httpError$.subscribe((error) => {
  console.warn(error.resource, error.operation, error.status, error.message);
});
```


| Method         | Request           | Response `data`         | Default route                      |
| -------------- | ----------------- | ----------------------- | ---------------------------------- |
| `$get`         | key               | detail VM               | `GET {resource}/{id}`              |
| `$getAll`      | `GridSearchModel` | `{ list, searchModel }` | `POST {resource}/get-all`          |
| `$add`         | new VM            | new key                 | `POST {resource}/add`              |
| `$getEditable` | key               | editable VM             | `GET {resource}/get-editable/{id}` |
| `$edit`        | key + editable VM | `boolean`               | `PUT {resource}/{id}`              |
| `$delete`      | key               | `boolean`               | `DELETE {resource}/{id}`           |


Routes are templates with `{resource}` and `{id}` placeholders. Override any of them per resource with the `endpoints` option. The HTTP verb is fixed per method.

```ts
const client = new SardanapalHttpClient({ apiBaseUrl: 'https://host/api' });
const orders = new SardanapalCrudClient<number, OrderSearch, OrderVM, NewOrderVM, EditOrderVM>({
  client,
  resource: 'orders',
  endpoints: { delete: '{resource}/{id}/remove' }, // optional
});

orders.$getAll({ fields: { name: 'a' }, pageIndex: 1 }).subscribe((result) => {
  if (!result.isSuccess) { /* show result.userMessage */ }
});
```

A partial `GridSearchModel` is completed with the defaults below (`GridSearchModelFactory.create`).


### Panel

Panel is CRUD plus. `SardanapalPanelClient` extends `SardanapalCrudClient` and takes the same options, with two more `endpoints` keys:


| Method          | Request           | Response `data`          | Default route                |
| --------------- | ----------------- | ------------------------ | ---------------------------- |
| `$getDictionary` | `GridSearchModel` | grid of `{ key, value }` | `POST {resource}/dictionary` |
| `$getExcel`      | `GridSearchModel` | file bytes               | `POST {resource}/excel`      |


`$getExcel` returns an `Observable<ArrayBuffer | Blob>` and does not read the JSON envelope. It always sends `pageSize: 0`. The file is read as `arraybuffer` by default, or as a `Blob` with `{ responseType: 'blob' }` in a browser. A failed call rejects with `SardanapalHttpError`. Axios parses response bodies, and only JSON ones, but a failed binary response arrives as bytes. So the client decodes the body of a non-2xx `arraybuffer` or `blob` response before interceptors run: it becomes parsed JSON, or text when it is not JSON. The `body` of a failed `$getExcel` is therefore that decoded value, not the raw `ArrayBuffer` or `Blob`. A successful response is returned as bytes, untouched.


`GridSearchModel` fields:

- `fields` — search VM; the host treats null as an empty search
- `sortId` — property name
- `sortAscending` — default `true`
- `pageIndex` — zero-based
- `pageSize` — default `25`; `0` means all rows (Excel forces this)
- `totalCount` — filled by the server
- `columns` — optional property names to project
- `lastIdentifier` — keyset cursor when sorting by `Id`
- `dynamicField` — `s-select` sends the typed filter here when it loads a dictionary

### Direction

Direction is a UI concern.

- `SardanapalDirectionService` owns direction only. It knows nothing about language or culture, and it never sets `lang`.
- `setDirection('ltr' | 'rtl')` sets `document.documentElement.dir` and emits on `directionChanged$` only when the direction actually changes. The stream does not replay; read `getDirection()` for the current value.
- Persist the choice through the same kind of storage adapter the auth cache uses.
- Language is a separate concern.
- The Angular bridge (`SardanapalNgDirectionBridge`) subscribes to `directionChanged$` and pushes the value into the CDK `Directionality`, which ng-zorro components and overlays read. The CDK service reads `dir` from the page only once, so without the bridge a later change would not reach ng-zorro. The locale is handled by `SardanapalNgLocaleService`, not by the bridge.

## Angular bridge

Lives in `@sardanapal/ng`. A host registers it once:

```ts
export const appConfig: ApplicationConfig = {
  providers: [SardanapalNg.providers({ apiBaseUrl: 'https://host/api' })],
};
```

`SardanapalNg.providers(options)` registers, under injection tokens, one shared `SardanapalHttpClient` (`SARDANAPAL_HTTP_CLIENT`), a `SardanapalAuthService` built on it (`SARDANAPAL_AUTH_SERVICE`) and a `SardanapalDirectionService` (`SARDANAPAL_DIRECTION_SERVICE`). It also registers ng-zorro's native date adapter so `s-date` works. Options: `apiBaseUrl`, `http` (`adapter`, `errors`), `auth` (every auth option except `apiBaseUrl`, `client`, `adapter`), `direction`, and `errorToasts` (default `true`). Build CRUD, panel and account clients with `client: inject(SARDANAPAL_HTTP_CLIENT)` or `auth: inject(SARDANAPAL_AUTH_SERVICE)` so their calls carry the `AUTH` header.

| Class | Role |
| --- | --- |
| `SardanapalNgDirectionBridge` | Starts with the providers. Keeps the CDK `Directionality` in step with `directionChanged$`. |
| `SardanapalNgErrorToasts` | Starts with the providers unless `errorToasts` is `false`. Shows each failed request once as an ng-zorro message: the envelope `userMessage` when the error body has one, else the error message. A 2xx failure envelope is not shown (the caller shows `userMessage`). A password-change 403 is skipped: send the user to change-password instead. |
| `SardanapalNgLocaleService` | `setCulture(culture)` sets the ng-zorro locale (`fa*` is `fa_IR`, everything else `en_US`) and `lang` on the page. `culture()` is a signal. It never touches direction. |
| `SardanapalControlBase<T>` | Base of every editing control. Implements `ControlValueAccessor` once and registers itself with its own `NgControl`, so a control needs no `NG_VALUE_ACCESSOR` provider. A subclass reads `value()` and `disabled()`, calls `updateValue` on input and `markTouched` on blur. |

Language and direction stay separate. Whoever changes the language calls `SardanapalNgLocaleService.setCulture` and `SardanapalDirectionService.setDirection` (the demo app does both).

## Components

Selectors are `s-<kebab-name>`. An editing control implements `ControlValueAccessor`.


| Selector      | ng-zorro              | Behavior                           |
| ------------- | --------------------- | ---------------------------------- |
| `s-text`      | typography            | Display only                       |
| `s-text-box`  | `nz-input`            | Single-line text                   |
| `s-text-area` | `textarea` `nz-input` | Multi-line text                    |
| `s-numeric`   | `nz-input-number`     | Number                             |
| `s-select`    | `nz-select`           | Static options, or `getDictionary` |
| `s-date`      | `nz-date-picker`      | Date, optional time                |
| `s-checkbox`  | `nz-checkbox`         | Boolean                            |
| `s-switch`    | `nz-switch`           | Boolean                            |
| `s-password`  | `nz-input-password`   | Secret text                        |
| `s-grid`      | `nz-table`            | Page and sort through `getAll`     |

Inputs and behavior:

- `s-text`: `value` (any), `emptyText`, `type` (`secondary`, `warning`, `danger`, `success`). Null and undefined show `emptyText`; a `Date` uses the local format.
- `s-text-box`, `s-text-area`: `placeholder`, `readonly`, `maxLength`, `size`, `status`, and `rows` on the area. They share `SardanapalTextControlBase`. An emptied control gives `''`, as a native input does, so `Validators.required` works.
- `s-numeric`: `min`, `max`, `step`, `precision`, `placeholder`, `readonly`, `size`. An emptied control gives `null`.
- `s-select`: the value is a key, or an array of keys with `multiple`. Options come from `options` (`{ key, value }`, `value` is the label) or from `dictionary`, a panel client. With `dictionary` it loads one page (`dictionaryPageSize`) when it is created and whenever `dictionary` or `dictionaryFields` changes, and it sends the typed text, after 300 ms, as `dynamicField`. `dictionaryFields` is sent as `fields`. A failed load leaves the list empty; the error is already on the shared channel.
- `s-date`: a `Date`, or `null` when empty. Inputs: `placeholder`, `format` (default `yyyy-MM-dd`), `showTime`, `allowClear`, `readonly`, `size`, `disabledDate`. Touched when the panel closes.
- `s-checkbox`: `true` or `false`. `null` from the form shows as unchecked. Inputs: `label`, `indeterminate`.
- `s-switch`: `true` or `false`. `null` from the form shows as off. Inputs: `checkedText`, `uncheckedText`, `size` (`default` or `small`).
- `s-password`: same text inputs as `s-text-box`, plus `visibilityToggle` (default true). An emptied control gives `''`.
- `s-grid`: `client` (a CRUD or panel client), `columns` (`SardanapalGridColumn`: `field` with dotted paths, `title`, `sortable`, `width`, `align`, `format`), `searchFields`, `pageSize`, `pageSizeOptions`, `showSizeChanger`, `size`, `rowKey`, `sortId`, `sortAscending`; output `loaded`; method `reload()`. It loads when created and returns to the first page when `client`, `searchFields` or `pageSize` changes (pass a new `searchFields` object to search again). Sorting and paging go to the host. A failure envelope shows its `userMessage`; the Excel export is not part of the grid.

Inputs and outputs use the `@Input()` and `@Output()` decorators, not the signal `input()` and `output()` functions. A control that must react to an input change does it in `ngOnChanges`. Internal state (`value`, `disabled`, loaded rows, loading) stays in `signal()`.

Layout in `projects/ng/src/lib/controls`: each control has a folder named after it, holding `<name>.component.ts`, `<name>.component.html` and `<name>.component.spec.ts` (`text`, `text-box`, `text-area`, `numeric`, `select`, `date`, `checkbox`, `switch`, `password`, `grid`). Code that more than one control uses stays directly in `controls/`: `sources.ts`, `text-control-base.ts` and `test-kit.ts`. Styles stay inline in the component.

Specs share `controls/test-kit.ts` (jsdom stubs for `ResizeObserver` and `matchMedia`, `render`, `type`, envelope helpers); `tsconfig.lib.json` leaves it out of the package. `projects/ng/vitest.config.mts` limits Vitest to two workers: with more, a busy machine failed with `Timeout starting forks runner` even though every test passed.


Further controls use the same selector and accessor pattern. Do not rename a control to match the ng-zorro tag.

## Notes

- User-facing strings on `userMessage` are already localized by the host. The 403 password-change body from the Identity authorize filter is a hardcoded English message, not the envelope.
- `pageIndex` is zero-based. `pageSize` `0` means unpaged.
- Branch that matches the sibling repos is `master`.

