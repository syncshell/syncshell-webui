# Releases and plugin handoff

## Local packaging

Update `package.json` and `package-lock.json`, then commit the source. From a
clean checkout:

```sh
npm ci
npm test
npm run release -- 0.1.3
bash scripts/test-release.sh "$PWD/release/syncshell-webui-v0.1.3.tar.gz"
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

Create a private GitHub App owned by `omarchy-QOL` with repository Contents
and Pull requests write permissions. Disable webhooks and install it only on
`omarchy-QOL/syncshell`. Store its private key as
`SYNCSHELL_APP_PRIVATE_KEY` and its ID as repository variable
`SYNCSHELL_APP_ID` in both repositories. The private key does not expire; only
replace it after a compromise or deliberate rotation.

Configure both repositories from the machine holding the downloaded PEM:

```sh
app_id=REPLACE_WITH_APP_ID
app_key_file=/absolute/path/to/syncshell-release.pem
for repo in syncshell/syncshell-webui omarchy-QOL/syncshell; do
  gh variable set SYNCSHELL_APP_ID --repo "$repo" --body "$app_id"
  gh secret set SYNCSHELL_APP_PRIVATE_KEY --repo "$repo" \
    <"$app_key_file"
done
```

Keep the PEM secure until both credential checks pass. GitHub stores only the
public half of an App key, so a lost private key must be replaced rather than
downloaded again.

The Web workflow requests a one-hour plugin installation token solely to send
the release notification. The plugin requests a separate one-hour token to
push the update branch and open the pull request. Each workflow narrows its
token to the permissions needed by that job.

The plugin's `update-webui.yml` must exist on its default branch for
`repository_dispatch` delivery, even though updates target `dev`. Landing
that workflow is an activation prerequisite. Repository Actions policies must
allow the pinned actions and the GitHub App's operations.

Before the first release, manually run the Web repository's `webui` workflow
with `verify_handoff` enabled. Then run the plugin repository's `update webui`
workflow with `verify_only` enabled. These checks validate both copies of the
App ID and private key without publishing a release or changing either
repository.

On Web pull requests and branch pushes, CI builds, packages and tests. A
`vX.Y.Z` tag matching `package.json` publishes the tested archive through
GitHub Releases. Then it sends the exact version and checksum to the plugin.
The plugin imports it, runs installation, palette refresh and desktop bridge
checks, and opens `build-webui-X.Y.Z` against `dev`. The full frontend suite
runs only here; the plugin runs its own integration checks.

The plugin importer is `go -C core run ./cmd/import-webui`, using its existing
Go module. It validates the archive and atomically exchanges the bundle
directory on Linux. No second importer implementation is supported.

No workflow merges the update pull request or publishes a plugin release. The
pull request remains open against `dev` until a maintainer merges or closes
it. A failed handoff leaves the Web release available. Retry the notification
job or run the plugin update workflow manually with the published version and
checksum. Published tags and archives must remain unchanged; fixes use a new
version.

## Release procedure

1. Merge the plugin receiver workflow into its default branch.
2. Configure and verify the GitHub App in both repositories.
3. Merge the tested Web changes into `main` and set the stable package version.
4. Run the local packaging and archive test from a clean checkout.
5. Push the matching annotated tag, for example `v0.1.3`.
6. Confirm the Web release succeeds and the plugin update pull request opens
   against `dev`.
7. Review the plugin pull request checks and leave it open until approved.

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
