import { cloneConfig } from '../../core/config/configValues.mjs';
import { isUnixAddress } from './settings-address.mjs';

export function prepareSettingsForSave(
  draft,
  mode,
  system,
  version,
  supported,
) {
  const config = cloneConfig(draft);
  const options = config.options;
  if (supported) {
    options.autoUpgradeIntervalH =
      mode === 'none' ? 0 : options.autoUpgradeIntervalH || 12;
    options.upgradeToPreReleases = mode === 'candidate';
  }
  if (mode === 'candidate' || version.isCandidate) {
    options.urAccepted = system.urVersionMax;
    options.urSeen = system.urVersionMax;
  }
  for (const value of [
    options.minHomeDiskFree.value,
    options.maxRecvKbps,
    options.maxSendKbps,
  ]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Enter a non-negative number.');
    }
  }
  const address = config.gui.address;
  if (!isUnixAddress(address)) {
    const port = Number(address.slice(address.lastIndexOf(':') + 1));
    if (
      !address.includes(':') ||
      !Number.isInteger(port) ||
      port < 1024 ||
      port > 65535
    ) {
      throw new Error('Enter a non-privileged port number (1024 - 65535).');
    }
  } else if (!/^0?[0-7]{0,3}$/.test(config.gui.unixSocketPermissions || '')) {
    throw new Error('Enter up to three octal digits.');
  }
  return config;
}
