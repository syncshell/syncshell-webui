const storageKey = 'syncshell-desktop';
const launchKey = 'syncshell-launch-action';
export const desktopHelp =
  'Local file actions are unavailable. Open this UI from Syncshell on the desktop running Syncthing, under the same user.';

/**
 * @typedef {object} DesktopFile
 * @property {string} path
 * @property {number} [bytes]
 * @property {string} [modified]
 */

/**
 * @typedef {object} DesktopFileGroup
 * @property {string} folder
 * @property {string} root
 * @property {string} path
 * @property {DesktopFile} [current]
 * @property {[DesktopFile, ...DesktopFile[]]} copies
 */

/** @typedef {{type: 'edit-device', device: string}} DesktopLaunchAction */

/**
 * @typedef {object} DesktopActionPort
 * @property {() => DesktopLaunchAction | null} takeLaunchAction
 * @property {(device: string) => Promise<unknown>} status
 * @property {(device: string, group: DesktopFileGroup, file?: DesktopFile) => Promise<unknown>} check
 * @property {(group: DesktopFileGroup, file: DesktopFile, device: string) => Promise<unknown>} open
 * @property {(group: DesktopFileGroup, file: DesktopFile, device: string) => Promise<unknown>} rename
 */

// Only the plugin launch grants access; the address bar and HTTP requests retain no token.
/**
 * @param {Window} [browser]
 * @returns {DesktopActionPort | null}
 */
export function desktopActions(browser = window) {
  let grant;
  let launch = null;
  try {
    const fragment = new URLSearchParams(browser.location.hash.slice(1));
    if (fragment.has('syncshell-desktop')) {
      grant = fragment.get('syncshell-desktop') || '';
      const action = fragment.get('syncshell-action');
      const device = fragment.get('device');
      if (
        action === 'edit-device' &&
        /^[A-Z2-7]{7}(-[A-Z2-7]{7}){7}$/.test(device || '')
      )
        launch = { type: action, device };
      browser.history.replaceState(
        null,
        '',
        browser.location.pathname + browser.location.search,
      );
      browser.sessionStorage.setItem(storageKey, grant);
    } else grant = browser.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
  const match = /^127\.0\.0\.1:([0-9]{1,5})\/([a-f0-9]{64})$/.exec(grant || '');
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535) return null;
  const [, port, token] = match;
  if (launch) {
    try {
      browser.sessionStorage.setItem(launchKey, JSON.stringify(launch));
    } catch {
      return null;
    }
  }
  /**
   * @param {string} action
   * @param {unknown} body
   */
  async function request(action, body) {
    let response;
    try {
      response = await browser.fetch(`http://127.0.0.1:${port}/${action}`, {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: {
          'Content-Type': 'application/json',
          'X-Syncshell-Token': token,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new Error(
        'Desktop connection is unavailable. Reopen the Web UI from the Syncshell plugin.',
      );
    }
    if (response.status === 403)
      throw new Error(
        'Desktop authorization expired. Reopen the Web UI from the Syncshell plugin.',
      );
    /** @type {unknown} */
    const result = await response.json();
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : 'Desktop action failed';
    if (!response.ok) throw new Error(message);
    return result;
  }
  /**
   * @param {string} device
   * @param {DesktopFileGroup} group
   * @param {DesktopFile} [file]
   */
  const fileRequest = (
    device,
    group,
    file = group.current || group.copies[0],
  ) => ({
    device,
    folder: group.folder,
    root: group.root,
    path: group.path,
    file: file.path,
    size: file.bytes,
    modified: file.modified,
  });
  return {
    takeLaunchAction() {
      /** @type {DesktopLaunchAction | null} */
      let action;
      try {
        action = JSON.parse(
          browser.sessionStorage.getItem(launchKey) || 'null',
        );
        browser.sessionStorage.setItem(launchKey, '');
      } catch {
        return null;
      }
      return action;
    },
    status: (device) => request('status', { device }),
    check: (device, group, file) =>
      request('check', fileRequest(device, group, file)),
    open: (group, file, device) =>
      request('open', fileRequest(device, group, file)),
    rename: (group, file, device) =>
      request('rename', fileRequest(device, group, file)),
  };
}
