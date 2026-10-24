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
  client/                  @sardanapal/client   plain TypeScript, no Angular
  ng/                      @sardanapal/ng       Angular library, depends on client
src/                       Small Angular demo app for clicking through the controls
```

## Packages

Two packages. Do not fold the HTTP client into the Angular library.


| Package              | Role                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sardanapal/client` | Auth, token cache, automatic refresh, direction, CRUD, and panel calls. No Angular dependency. Any UI framework can call this.              |
| `@sardanapal/ng`     | Angular 22 library. Selectors `s-<name>`, implemented with `ng-zorro-antd` 22.x (peer `@angular/*` `^22`). Depends on `@sardanapal/client`. |


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

Matches the Identity account and token services.

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


| Method        | Request           | Response `data`         |
| ------------- | ----------------- | ----------------------- |
| `get`         | key               | detail VM               |
| `getAll`      | `GridSearchModel` | `{ list, searchModel }` |
| `add`         | new VM            | new key                 |
| `getEditable` | key               | editable VM             |
| `edit`        | key + editable VM | `boolean`               |
| `delete`      | key               | `boolean`               |


### Panel

Panel is CRUD plus:


| Method          | Request           | Response `data`          |
| --------------- | ----------------- | ------------------------ |
| `getDictionary` | `GridSearchModel` | grid of `{ key, value }` |
| `getExcel`      | `GridSearchModel` | file bytes               |


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

Direction is a UI concern. Core has `en` and `fa-IR` strings and no `dir` flag.

- `fa`, `fa-IR`, and `ar` map to `rtl`. Every other culture maps to `ltr`.
- Set `document.documentElement.lang` and `document.documentElement.dir`.
- Persist the choice through the same kind of storage adapter the auth cache uses.
- The Angular bridge sets the ng-zorro locale to `en_US` or `fa_IR` and the same `dir`, so overlays flip with the page.

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

