import { useEffect, useRef, useState } from 'preact/hooks';
import { desktopHelp } from '../../../client/desktop.mjs';
import {
  loadConflictGroups,
  replaceConflictDirectory,
  rescanConflictGroups,
} from './loadConflictGroups.mjs';

export function useConflictGroups({
  api,
  folders,
  active,
  ready,
  hostActions,
  device,
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(null);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [rename, setRename] = useState(null);
  const [access, setAccess] = useState({});
  const [desktopError, setDesktopError] = useState('');
  const controller = useRef();
  const folderKey = folders.map((folder) => folder.id).join('|');

  useEffect(() => {
    if (!active || !ready) return;
    const request = new AbortController();
    controller.current = request;
    refreshGroups(false, null, request);
    return () => request.abort();
  }, [active, ready, folderKey]);

  async function refreshGroups(
    scan = false,
    group = null,
    request = controller.current,
  ) {
    setLoading(true);
    setScanning(scan ? group?.id || 'all' : null);
    setErrors([]);
    setMessage('');
    try {
      const result = scan
        ? await rescanConflictGroups(api, folders, group, request.signal)
        : await loadConflictGroups(api, folders, request.signal);
      if (request.signal.aborted) return;
      setGroups((previous) =>
        group
          ? replaceConflictDirectory(previous, group, result.groups)
          : result.groups,
      );
      setErrors(result.errors);
      if (hostActions?.status)
        await refreshAccess(result.groups, request.signal);
      if (scan && !result.errors.length)
        setMessage('Syncthing scan finished; file list updated.');
    } catch (error) {
      if (!request.signal.aborted) setErrors([error.message]);
    } finally {
      if (!request.signal.aborted) {
        setLoading(false);
        setScanning(null);
      }
    }
  }

  async function checkFileAccess(group, file) {
    const key = JSON.stringify([group.id, file.path]);
    try {
      return [key, await hostActions.check(device, group, file)];
    } catch (error) {
      return [key, { reason: error.message }];
    }
  }

  async function refreshAccess(groups, signal) {
    try {
      await hostActions.status(device);
      setDesktopError('');
      const pending = groups.flatMap((group) =>
        [group.current, ...group.copies]
          .filter(Boolean)
          .map((file) => checkFileAccess(group, file)),
      );
      const entries = await Promise.all(pending);
      if (!signal.aborted) {
        setAccess((previous) => ({
          ...previous,
          ...Object.fromEntries(entries),
        }));
      }
    } catch (error) {
      setDesktopError(error.message);
      setAccess({});
    }
  }

  async function openConflict(group, file) {
    try {
      await hostActions.open(group, file, device);
    } catch (error) {
      setErrors([error.message]);
    }
  }

  async function restoreConflictName() {
    setLoading(true);
    setErrors([]);
    try {
      await hostActions.rename(rename.group, rename.file, device);
      const group = rename.group;
      setRename(null);
      await refreshGroups(true, group);
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  }

  function permission(group, file) {
    if (!hostActions) return { reason: desktopHelp };
    if (desktopError) return { reason: desktopError };
    if (!hostActions.check) return { open: true, rename: true };
    return (
      access[JSON.stringify([group.id, file.path])] || {
        reason: 'Checking local file access...',
      }
    );
  }

  return {
    groups,
    loading,
    scanning,
    errors,
    message,
    rename,
    desktopError,
    permission,
    openConflict,
    rescan: (group = null) => refreshGroups(true, group),
    selectRename: (group, file) => setRename({ group, file }),
    cancelRename: () => setRename(null),
    restoreConflictName,
  };
}
