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
| `@sardanapal/identity-client` | Identity side: `SardanapalAuthService` (login, token cache, automatic refresh, session) and `SardanapalJwtService` (claims). Plugs into the core client as an interceptor. No Angular dependency. |
| `@sardanapal/ng`     | Angular 22 library. Selectors `s-<name>`, implemented with `ng-zorro-antd` 22.x (peer `@angular/*` `^22`). Depends on both clients. |


`ng-zorro-antd` is Angular-only (forms, CDK, dependency injection). The `s-*` components stay in `@sardanapal/ng`. A later React or Vue package would wrap `@sardanapal/client` and would not reuse the Angular templates. Do not compile the controls to Angular Elements: that ships the Angular runtime into every host and breaks `ngModel` and reactive forms.

Keep ng-zorro. It covers the first controls, ships a `fa_IR` locale, and flips layout when `dir="rtl"` is set on `html` (CDK bidi plus `NzConfigService`). `s-grid` talks to panel search through its own inputs, with `nz-table` behind that API, so the table widget can be replaced later without renaming the component.

## Commands

Once the workspace exists:

```bash
npm install
npm test
npm run build
```

There is no test suite until the packages exist. When tests exist, run them before any commit. Do not commit while tests are failing.

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

```
GET {apiBaseUrl}/{resource}/{id}
POST {apiBaseUrl}/{resource}/get-all
POST {apiBaseUrl}/{resource}/add
GET {apiBaseUrl}/{resource}/get-editable/{id}
PUT {apiBaseUrl}/{resource}/{id}
DELETE {apiBaseUrl}/{resource}/{id}
POST {apiBaseUrl}/{resource}/dictionary
POST {apiBaseUrl}/{resource}/excel
POST {apiBaseUrl}/account/login
POST {apiBaseUrl}/account/refresh          optional
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
- `dynamicField` — present on the server model and unused

### Direction

Direction is a UI concern.

- `SardanapalDirectionService` owns direction only. It knows nothing about language or culture, and it never sets `lang`.
- `setDirection('ltr' | 'rtl')` sets `document.documentElement.dir` and emits on `directionChanged$` only when the direction actually changes. The stream does not replay; read `getDirection()` for the current value.
- Persist the choice through the same kind of storage adapter the auth cache uses.
- Language is a separate concern.
- The Angular bridge subscribes to `directionChanged$` and sets the ng-zorro locale and the same `dir`, so overlays flip with the page.

## Components

Selectors are `s-<kebab-name>`. An editing control implements `ControlValueAccessor`.


| Selector      | ng-zorro              | Behavior                           |
| ------------- | --------------------- | ---------------------------------- |
| `s-text`      | typography            | Display only                       |
| `s-text-box`  | `nz-input`            | Single-line text                   |
| `s-text-area` | `textarea` `nz-input` | Multi-line text                    |
| `s-numeric`   | `nz-input-number`     | Number                             |
| `s-select`    | `nz-select`           | Static options, or `getDictionary` |
| `s-grid`      | `nz-table`            | Page and sort through `getAll`     |


Further controls (`s-date`, `s-checkbox`, `s-switch`, `s-password`, and the rest) use the same selector and accessor pattern. Do not rename a control to match the ng-zorro tag.

## Notes

- User-facing strings on `userMessage` are already localized by the host. The 403 password-change body from the Identity authorize filter is a hardcoded English message, not the envelope.
- `pageIndex` is zero-based. `pageSize` `0` means unpaged.
- Branch that matches the sibling repos is `master`.

