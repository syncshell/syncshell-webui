function shareMessageContext(device, t) {
  const values = { devicename: device.name || device.deviceID.slice(0, 7) };
  return {
    values,
    subject: t('Syncthing device ID for "{%devicename%}"', values),
    footer: t('Learn more at {%url%}', { url: 'https://syncthing.net' }),
  };
}

export function createEmailShare(device, t) {
  const { values, subject, footer } = shareMessageContext(device, t);
  const body = [
    t(
      'To connect with the Syncthing device named "{%devicename%}", add a new remote device on your end with this ID:',
      values,
    ),
    device.deviceID,
    t(
      "Syncthing is a continuous file synchronization program. It synchronizes files between two or more computers in real time, safely protected from prying eyes. Your data is your data alone and you deserve to choose where it is stored, whether it is shared with some third party, and how it's transmitted over the internet.",
    ),
    footer,
  ].join('\r\n\r\n');
  return {
    subject,
    body,
    href:
      'mailto:?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body),
  };
}

export function createTextMessageShare(device, t) {
  const { subject, footer } = shareMessageContext(device, t);
  const body = [subject, device.deviceID.replaceAll('-', ''), footer].join(
    '\n',
  );
  return {
    subject,
    body,
    href: 'sms:?&body=' + encodeURIComponent(body),
  };
}
