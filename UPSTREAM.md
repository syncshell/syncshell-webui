# Source and attribution

## Provenance

Syncshell Web was extracted from `omarchy-QOL/syncshell` at commit
`0016be98bae080138fa5ffd4d17b7f0a9a72baeb`. Its relevant frontend, test, logo,
and theme history is retained here through path filtering.

The maintainability cleanup started from Syncshell Web release `v0.1.3` at
commit `d269bb3f289c61a3e919aef89e5e343213002baf`.

The browser application is based on the `gui/` subtree of Syncthing `v2.1.3`:

- release commit: `946e2b83a1f6c6ae119427c09e0a5802940b82ff`
- annotated tag object: `66afbbe2c4a957a5700d20bd16ac741a0a40d6f9`
- reference boundary: all 178 files below upstream `gui/`

Tests describe the current application contract. Replaced framework
implementations remain only in Git history.

## Retained contracts

Syncshell Web preserves the Syncthing browser boundary:

- REST, event-stream, CSRF-cookie, and generated `meta.js` integration
- runtime GUI theme discovery and override assets
- folder, device, configuration, transfer, log, report, and version workflows
- Bootstrap compatibility rules and upstream license attribution

Original Syncthing authors and license notices remain credited in About.
`LICENSE.syncthing`, `licenses/`, and vendor license files travel with compiled
releases.

## Intentional deltas

The following differences are product choices rather than incomplete upstream
ports:

- Preact and ES modules replace AngularJS and jQuery application code.
- The maintained interface and catalog are English-only.
- Lucide Preact components replace the icon font.
- `syncshell-modern` follows the browser light or dark preference, while the
  optional Omarchy template maps the desktop palette into the same theme token
  contract.
- The conflict review screen and optional authenticated localhost desktop bridge
  are Syncshell features with no direct upstream equivalent.
- Dialogs, tabs, menus, and tooltips use shared accessible browser primitives.
- Releases install as a standalone Syncthing GUI override rather than being
  embedded in the Syncthing binary.

See `README.md` for standalone installation and `RELEASES.md` for the artifact
and optional plugin integration contract.
