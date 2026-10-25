# Sardanapal UI - Components for Sardanapal Apps

## Overview

Sardanapal UI is the component library for applications that host the Sardanapal Core and Sardanapal Identity service bases. Core and Identity stay class libraries. A host app exposes those bases over HTTP, and this library calls that host.

The library is split so the non-visual client can be used from any UI framework, while the controls are Angular components built on ng-zorro.

## Features

- **Auth**: caches the security token and refreshes it automatically.
- **Direction**: switches layout for English (`ltr`) and Persian (`rtl`).
- **CRUD and panel clients**: call the same operations the Core service bases provide (`$get`, `$getAll`, `$add`, `$getEditable`, `$edit`, `$delete`, `$getDictionary`, `$getExcel`). `SardanapalCrudClient` and `SardanapalPanelClient` return RxJS observables of the typed response body, with a configurable route per resource. A failed request is reported once, as a `SardanapalHttpError` carrying `resource` and `operation`, on the HTTP client's `httpError$`.
- **Controls**: ready-made inputs and a grid, with the selector `s-<component-name>`.

```ts
import { SardanapalHttpClient, SardanapalPanelClient } from '@sardanapal/client';

const client = new SardanapalHttpClient({ apiBaseUrl: 'https://host/api' });
const orders = new SardanapalPanelClient({ client, resource: 'orders' });

orders.$getAll({ pageIndex: 0, pageSize: 25 }).subscribe((result) => {
  if (result.isSuccess) console.log(result.data?.list);
});
```

## Packages

| Package | What it is |
|---|---|
| `@sardanapal/client` | Core side: HTTP transport, response envelope, storage adapters, direction, CRUD, and panel calls. Any UI framework can use it. |
| `@sardanapal/identity-client` | Identity side: login, token cache, automatic refresh, and JWT claims. Depends on `@sardanapal/client`. Any UI framework can use it. |
| `@sardanapal/ng` | Angular components. The `s-*` controls live here and are Angular-only. |

### First controls

- `s-text`
- `s-text-box`
- `s-text-area`
- `s-numeric`
- `s-select`
- `s-grid`

## Installation

The packages are not published yet. Once the library is built, install them as npm packages and point the client at the host app that exposes the Core and Identity service bases.

### Thanks for your attention
