# Releases and plugin handoff

## Local packaging

Update `package.json` and `package-lock.json`, then commit the source. From a
clean checkout:

```sh
npm ci
npm test
npm run release -- 0.1.2
bash scripts/test-release.sh "$PWD/release/syncshell-webui-v0.1.2.tar.gz"
```

The release command rebuilds from committed source. The archive records its
version, Git commit, tested Syncthing versions and integration format. It
contains `gui/syncshell-modern/`, `integration/`, `install.sh`, `manifest.json`
and asset checksums. Source, tests and build dependencies are excluded. The
archive has a separate SHA-256 file. Packaging is reproducible for the same
source and toolchain.

The archive test installs and updates the release, preserves an unrelated
theme, rejects corrupted assets and runs the browser suite against installed
files. Only add a Syncthing version to the manifest after testing it.

## GitHub configuration

Expected Web repository: `syncshell/syncshell-webui`.
Current plugin repository: `omarchy-QOL/syncshell`.

Create a GitHub App with repository Contents and Pull requests write
permissions. Install it only on the plugin repository. Store its private key
as `SYNCSHELL_APP_PRIVATE_KEY` and its ID as repository variable
`SYNCSHELL_APP_ID` in both repositories. The Web workflow requests a plugin
installation token solely to send the release notification. The plugin uses
its token to push the update branch and open the pull request.

The plugin's `update-webui.yml` must exist on its default branch for
`repository_dispatch` delivery, even though updates target `dev`. Landing
that workflow is an activation prerequisite. Repository Actions policies must
allow the pinned actions and the GitHub App's operations.

On Web pull requests and branch pushes, CI builds, packages and tests. A
`vX.Y.Z` tag matching `package.json` publishes the tested archive through
GitHub Releases. Then it sends the exact version and checksum to the plugin.
The plugin imports it, runs installation, palette refresh and desktop bridge
checks, and opens `build-webui-X.Y.Z` against `dev`. The full frontend suite
runs only here; the plugin runs its own integration checks.

No workflow merges to `main` or publishes a plugin release. A failed handoff
leaves the Web release available. Retry the notification job or run the
plugin update workflow manually with the published version and checksum.
Published tags and archives must remain unchanged; fixes use a new version.

## Theme contract 1

The plugin retains `syncshell-modern` and `syncthing-omarchy` as theme names.
It copies the compiled Modern tree, then generates the Omarchy stylesheet
from `integration/omarchy-theme.css.in`. The required substitutions are
`background`, `foreground`, `accent`, `muted`, `selection`, `surface`,
`surface_dark`, `foreground_dark`, `foreground_light`, `red`, `yellow`,
`green`, `cyan`, `blue`, `magenta`, and `orange`.

The existing plugin maps Omarchy's resolved palette to these values. The
included refresh helper watches the installed theme generation and swaps
stylesheets without reloading the application. Selector changes belong here.
An incompatible template or bridge change requires a new integration format
and a corresponding plugin importer update.
