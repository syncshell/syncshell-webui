# Contributing

## Setup

Install the JavaScript dependencies and the pinned shell tools:

```sh
npm ci
mise install
```

Run `npm run format` before committing and `npm run check` before handing work
off. The check covers Prettier, shfmt, ESLint, ShellCheck, and unit tests.
Application changes also require `npm run build`. Browser, real-daemon, and
installed-theme behavior is covered by:

```sh
npm run test:integration
```

## Dependency direction

Keep dependencies pointing toward stable policy and shared primitives:

```text
composition
    |-- features
    |-- shared UI
    |-- core
    `-- client adapters

features ------> shared UI, core, client adapters
shared UI -----> core and presentation-only client helpers
core ----------> core
client --------> client
```

The directories have these responsibilities:

- `app/core/` owns configuration, locale, session, event, and state policy. It
  must not import feature views, shared UI, or `client/` modules. Lifecycle
  hooks may use Preact; domain functions should remain independent of it.
- `client/` owns the remaining Syncthing, desktop, formatting, identity, and DOM
  adapters. It must not import from `app/`.
- `app/ui/` owns reusable interaction and accessibility behavior. It may use
  core context and presentation-only client helpers, but it must not know about
  a feature.
- `app/features/<feature>/` keeps a workflow's views, domain rules, hooks, and
  styles together. Pure `.mjs` rules must not import JSX or browser adapters.
- `app/App.jsx`, `app/DialogHost.jsx`, and nearby entry components compose the
  slices. Cross-feature imports belong here unless two domains have a real,
  named relationship.

Keep HTTP, event streams, timers, DOM listeners, and desktop bridge calls in
adapters or lifecycle hooks. Pass their results into pure reducers, selectors,
normalizers, and validators. Do not introduce a global state framework, barrel
files, or wrappers that merely hide an import path.

## Styles

Feature and shared-component CSS lives beside its owner. `app/styles/` contains
only the global token, layout, shared-component, utility, and import contracts.
Use semantic tokens and logical properties. Preserve the declared cascade order
in `static/assets/css/layers.css` and keep light, dark, and Omarchy themes on
the same color-token contract.

## Tests

Name tests after a user-visible rule. Prefer role, label, and accessible-state
assertions over implementation classes or exact pixels. Use pure unit tests for
domain rules, Playwright for browser interaction, and the real-daemon suite only
for the Syncthing boundary. Add visual snapshots only for deliberate visual
contracts and keep the matrix small.
