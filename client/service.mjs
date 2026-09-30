export function servicePresentation(kind, phase, error, isMajorUpgrade) {
  if (error) return { title: 'Error', status: 'danger', icon: 'hourglass' };
  if (phase === 'confirm')
    return {
      title: isMajorUpgrade ? 'Major Upgrade' : 'Upgrade',
      status: isMajorUpgrade ? 'danger' : 'warning',
      icon: 'hourglass',
    };
  if (kind === 'shutdown')
    return {
      title: 'Shutdown Complete',
      status: 'success',
      icon: phase === 'waiting' ? 'power' : 'hourglass',
    };
  return { title: 'Restarting', status: 'info', icon: 'hourglass' };
}
