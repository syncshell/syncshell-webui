import { useEffect, useRef, useState } from 'preact/hooks';
import { runReportedSessionAction } from '../../core/session/createSession.mjs';
import { stripeSections } from '../../../client/stripes.mjs';
import { FolderActions } from './FolderActions.jsx';
import { FolderDetails } from './FolderDetails.jsx';
import { FolderHeader } from './FolderHeader.jsx';
import { FolderItemsDialog } from './FolderItemsDialog.jsx';
import {
  folderStatus,
  folderStatusText,
  progressPercentage,
  syncPercentage,
} from './folder-status.mjs';
import './FolderCard.css';

export function FolderCard({
  folder,
  info,
  stats,
  progress,
  api,
  rescan,
  state,
  session,
  onAction,
}) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [itemsKind, setItemsKind] = useState('');
  const panel = useRef();
  useEffect(() => {
    if (open) return stripeSections(panel.current);
  }, [open]);
  const status = folderStatus(folder, info);
  const label = folderStatusText(status);
  const percent =
    status === 'syncing'
      ? syncPercentage(info)
      : progress
        ? progressPercentage(progress.current, progress.total)
        : undefined;
  async function scan() {
    setScanning(true);
    try {
      await runReportedSessionAction(() => rescan(), session.reportError);
    } finally {
      setScanning(false);
    }
  }
  function togglePause() {
    return runReportedSessionAction(
      () => session.setPaused('folders', folder.id, !folder.paused),
      session.reportError,
    );
  }
  return (
    <>
      <div class="panel panel-default">
        <FolderHeader
          folder={folder}
          info={info}
          label={label}
          open={open}
          percent={percent}
          status={status}
          onToggle={() => setOpen(!open)}
        />
        {open && (
          <div class="panel-collapse" ref={panel}>
            <FolderDetails
              folder={folder}
              info={info}
              label={label}
              progress={progress}
              stats={stats}
              status={status}
              onAction={onAction}
              onShowItems={setItemsKind}
            />
            <FolderActions
              folder={folder}
              info={info}
              scanning={scanning}
              state={state}
              status={status}
              onAction={onAction}
              onPause={togglePause}
              onScan={scan}
            />
          </div>
        )}
      </div>
      {itemsKind && (
        <FolderItemsDialog
          api={api}
          folder={folder}
          kind={itemsKind}
          revision={state.itemsRevision[folder.id] || 0}
          progress={state.downloadProgress[folder.id] || {}}
          progressEnabled={
            state.config.options.progressUpdateIntervalS > 0 &&
            folder.type !== 'receiveencrypted'
          }
          total={
            itemsKind === 'need'
              ? info.needTotalItems
              : itemsKind === 'failed'
                ? info.pullErrors
                : info.receiveOnlyTotalItems
          }
          onClose={() => setItemsKind('')}
        />
      )}
    </>
  );
}
