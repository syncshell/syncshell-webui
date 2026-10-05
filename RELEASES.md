# Release workflow

## Branch policy

Work on `dev`. Release the tested `dev` commit, then promote `dev` to `main`
afterward. A Web UI release PR or prior merge into `main` is not required.

Do not create extra release, preparation, or adapter branches/PRs unless the
owner explicitly requests them. This project does not use a generic
feature-branch/PR process merely to publish a release.

The automated `build-webui-X.Y.Z` branch in the Syncshell plugin is different:
it exists for the requested compiled Web UI import PR against plugin `dev`. That
downstream PR is part of the workflow, not an extra Web UI release branch.

## Release order

1. Finish and commit the intended Web UI work on `dev`. Ensure the approved
   changes are actually included there; do not leave them only on `main` or a
   temporary branch. Preserve unrelated uncommitted work.
2. Make any required plugin adapter changes on the plugin's `dev` branch and
   test them. They must reach GitHub's `dev` before publication if the automatic
   import needs them. Do not create a separate preparation PR by default.
3. Push Web UI `dev`, verify its checks, and confirm that `package.json` and the
   lockfile contain the intended release version. Check existing remote tags,
   releases, and import PRs before publishing anything.
4. Verify release credentials without publishing: the Web UI workflow provides
   `verify_handoff`, and the plugin update workflow provides `verify_only`.
5. Tag the exact tested `dev` commit as `vX.Y.Z` and push that tag. The tag runs
   the Web UI release workflow; a branch push alone does not publish a release.
6. The workflow builds and tests the archive, publishes it, and sends its exact
   version and checksum to the Syncshell plugin repository.
7. The plugin imports and tests that archive, then opens its update PR against
   `dev`. Leave this PR open when the owner wants another agent to review,
   merge, or test it locally. Do not silently merge it.
8. Promote `dev` to `main` afterward as agreed with the owner. If a PR is needed
   for that promotion, use the existing `dev` branch as its head rather than
   introducing another release branch.

## Clean builds without extra branches

The packager requires committed, clean source. If the working checkout contains
unrelated edits, use a temporary clone or detached checkout of the tested `dev`
commit for verification. Do not push that checkout as an extra branch or make an
unnecessary release PR. Do not stash, discard, or include the owner's unrelated
edits just to make packaging pass.

A locally built archive, a published release, an open plugin import PR, and a
live installation are separate states. Report which one has been reached.
Publication does not authorize deployment or unrelated plugin releases.

## Automation

- Web UI: `.github/workflows/release.yml` in `syncshell/syncshell-webui`.
- Plugin: `.github/workflows/update-webui.yml` in `omarchy-QOL/syncshell`.
- Plugin import target: `dev`.
- Publishing and import credentials: `SYNCSHELL_APP_ID` and
  `SYNCSHELL_APP_PRIVATE_KEY` in the respective repositories. Never expose the
  private key in logs or documentation.

Check the current workflows before executing a release. If a prerequisite is
missing, handle it through the normal `dev` work or report the blocker; do not
invent a new branch/PR sequence as a workaround.
