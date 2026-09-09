# Syncshell Web

A Preact interface served by Syncthing itself. Use it independently or through
the Syncshell Quickshell plugin. Syncthing supplies authentication, REST,
events and synchronization; the release carries all frontend assets.

## Install a release

Download the archive and its `.sha256` file from this repository's releases.
Verify and unpack them in a working directory:

```sh
sha256sum --check syncshell-webui-v0.1.1.tar.gz.sha256
tar -xzf syncshell-webui-v0.1.1.tar.gz
syncthing paths
bash syncshell-webui-v0.1.1/install.sh /absolute/gui-override-directory
```

Use the **GUI override directory** reported for the Syncthing instance you
intend to customize. Pass its usual `--home` or `--config` options to
`syncthing paths` if needed. An instance using `STGUIASSETS` uses that override
instead. Older Syncthing versions may spell the command `syncthing --paths`.

After first installation, restart that instance and select `syncshell-modern`
in its GUI theme setting. Open its usual GUI address, normally
`http://127.0.0.1:8384/`. No Node server, CDN or plugin is required.

For updates, repeat verification and installation, then reload the browser.
Installation stages the new directory and restores the previous one if the
replacement fails. Other themes remain intact. To return to Syncthing's
original interface, select `default`; then the `syncshell-modern` directory
can be removed if desired.

Tested with Syncthing **2.1.3**. The installer uses Bash, standard Unix file
utilities and `sha256sum`. On other platforms, copy
`gui/syncshell-modern/` into the reported GUI override directory, then select
the theme using the same procedure.

## Develop

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:integration
```

The build writes only `dist/`. Browser integration tests additionally require
Go 1.23+ and Syncthing 2.1.3. They create disposable peers on loopback, with
discovery and relays disabled, and stop them on exit. Set
`SYNCSHELL_CHROMIUM=/path/to/chromium` to use an existing browser.

`app/` and `client/` own the application; `static/` owns its external assets;
`themes/` owns base palettes; `integration/` owns the optional Omarchy CSS
template and browser refresh helper. Historical comparison fixtures live in
`tests/reference/`, with their source commit recorded there.

## Plugin integration

The plugin imports the same compiled archive, pins its checksum, and supplies
Omarchy palette values to the included template. Its Go bridge provides
optional local file actions. Without a plugin grant, ordinary Syncthing
operations remain available and local file actions report unavailable access.

See [RELEASES.md](RELEASES.md) for packaging and automated plugin updates.
This is a third-party Syncthing interface. Original authors and dependency
licenses remain credited in About and in the release.
