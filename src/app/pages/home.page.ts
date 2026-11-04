import { Component } from '@angular/core';

/** Overview of the three packages and how a host installs them. */
@Component({
  selector: 'app-home-page',
  host: { class: 'demo-card' },
  template: `
    <h1>Sardanapal UI</h1>
    <p class="lead">
      These packages are the UI side of Sardanapal. Core and Identity stay .NET class libraries:
      they ship base classes such as <code>CrudServiceBase</code>, <code>PanelServiceBase</code>,
      and the account and token services. They do not ship controllers or routes. A host app
      subclasses those bases and exposes them over HTTP. This library calls that host. It never
      references the .NET assemblies, and every path stays configurable because each host chooses
      its own routes.
    </p>

    <h2>Packages</h2>
    <div class="package-grid">
      <article>
        <h3><code>&#64;harpm/sardanapal-client</code></h3>
        <p>
          Core side. HTTP transport, the <code>IResponse&lt;T&gt;</code> envelope, storage,
          direction, CRUD, and panel calls. No Angular dependency. An app that only uses Core
          installs this package on its own.
        </p>
      </article>
      <article>
        <h3><code>&#64;harpm/sardanapal-identity-client</code></h3>
        <p>
          Identity side. Login, token cache, automatic refresh, JWT claims, account, and OTP.
          Depends on <code>&#64;harpm/sardanapal-client</code> and plugs in as an interceptor.
          No Angular dependency.
        </p>
      </article>
      <article>
        <h3><code>&#64;harpm/sardanapal-ng</code></h3>
        <p>
          Angular 22 controls (<code>s-text</code>, <code>s-grid</code>, <code>s-login</code>, and
          the rest) plus the providers and route guards. Built on ng-zorro-antd. Depends on both
          clients.
        </p>
      </article>
    </div>

    <h2>Install</h2>
    <p class="lead">
      The packages publish to GitHub Packages at <code>https://npm.pkg.github.com</code>. A host
      needs a token with <code>read:packages</code> and this <code>.npmrc</code>:
    </p>
    <pre class="demo-code">{{ npmrc }}</pre>
    <pre class="demo-code">{{ install }}</pre>
    <p class="lead">
      <code>&#64;harpm/sardanapal-ng</code> expects Angular 22 (<code>&#64;angular/core</code>,
      <code>common</code>, <code>forms</code>, <code>router</code>, <code>cdk</code>),
      <code>ng-zorro-antd</code> 22, and <code>rxjs</code> 7 as peers.
    </p>
    <p class="lead">Each control has its own page. Open one from the sidebar.</p>
  `,
  styles: `
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 600;
    }

    h2 {
      margin: 28px 0 12px;
      font-size: 18px;
      font-weight: 600;
    }

    .lead {
      max-width: 72ch;
      color: rgba(0, 0, 0, 0.65);
    }

    .package-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .package-grid article {
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 16px;
    }

    .package-grid h3 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .package-grid p {
      margin: 0;
      color: rgba(0, 0, 0, 0.65);
    }

    .demo-code {
      max-width: 72ch;
      margin: 0 0 12px;
      padding: 12px 16px;
      overflow-x: auto;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
  `,
})
export class HomePageComponent {
  protected readonly npmrc = [
    '@harpm:registry=https://npm.pkg.github.com',
    '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}',
  ].join('\n');

  protected readonly install =
    'npm install @harpm/sardanapal-client @harpm/sardanapal-identity-client @harpm/sardanapal-ng';
}
