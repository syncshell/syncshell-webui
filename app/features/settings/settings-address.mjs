export function isUnixAddress(address) {
  return (
    address.startsWith('/') ||
    address.startsWith('unix://') ||
    address.startsWith('unixs://')
  );
}
