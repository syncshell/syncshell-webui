import { useContext } from 'preact/hooks';
import {
  compactNumber,
  duration,
  timestamp,
  unitPrefixed,
} from '../../../client/format.mjs';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { Tooltip } from '../../Tooltip.jsx';
import { FolderCounts } from './FolderCounts.jsx';
import { FolderVersioningSummary } from './FolderVersioningSummary.jsx';
import {
  FolderDefinitionRow,
  folderFieldHelp,
} from './FolderDefinitionRow.jsx';
import {
  folderStateClass,
  folderStateDetails,
  folderTypes,
  pullOrders,
  scanRemaining,
} from './folder-status.mjs';

export function FolderDetails({
  folder,
  info,
  stats,
  progress,
  status,
  label,
  onAction,
  onShowItems,
}) {
  const { t } = useContext(LocaleContext);
  const summaries = folderStateDetails(folder, info) ? ['global', 'local'] : [];
  const watcherFailed =
    folder.fsWatcherEnabled &&
    !folder.paused &&
    status !== 'stopped' &&
    info?.watchError;
  const localChanges =
    ['receiveonly', 'receiveencrypted'].includes(folder.type) &&
    info?.receiveOnlyTotalItems > 0;
  const basename = (value) => (value || '').split(/[\\/]/).at(-1);
  const showItems = (kind) => (event) => {
    event.preventDefault();
    onShowItems(kind);
  };
  return (
    <div class="panel-body less-padding">
      <details class="folder-details" open>
        <summary>{t('Current activity')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            {!folder.paused && info?.state && (
              <tr class="folder-state-summary">
                <th>
                  <Tooltip
                    icon="dot"
                    iconClass={`text-${folderStateClass(status)}`}
                    label="Global/local State"
                    prefix={label}
                    text={folderFieldHelp['Global/local State'].help}
                  />
                  &nbsp;<span>{t('Global/local State')}</span>
                  {info.ignorePatterns && (
                    <a
                      href="#ignores"
                      title={t('Reduced by ignore patterns')}
                      onClick={(event) => {
                        event.preventDefault();
                        onAction({
                          type: 'edit-folder',
                          folder,
                          tab: 'ignores',
                        });
                      }}
                    >
                      <Icon name="info" />
                    </a>
                  )}
                </th>
                <td class="text-right">
                  <FolderCounts info={info} />
                </td>
              </tr>
            )}
            {summaries.map((prefix) => (
              <FolderDefinitionRow
                key={prefix}
                label={prefix === 'global' ? 'Global State' : 'Local State'}
                rowClass="folder-state-detail"
              >
                <FolderCounts info={info} prefix={prefix} />
              </FolderDefinitionRow>
            ))}
            {info?.needTotalItems > 0 && (
              <FolderDefinitionRow
                label="Out of Sync Items"
                icon="cloud-download"
                help="Items this device still needs to synchronize with other devices. The size counts whole files; reusing existing data can reduce the amount actually downloaded. Click the value to see the items."
              >
                <a href="#needed" onClick={showItems('need')}>
                  {compactNumber(info.needTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.needBytes, true)}B
                </a>
              </FolderDefinitionRow>
            )}
            {!folder.paused && info?.state && folder.ignoreDelete && (
              <tr>
                <td colSpan="2" class="text-right">
                  <i class="small">
                    {t('Altered by ignoring deletes.')}{' '}
                    <a
                      href="https://docs.syncthing.net/advanced/folder-ignoredelete.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Help')}
                    </a>
                  </i>
                </td>
              </tr>
            )}
            {stats?.lastScan && (
              <FolderDefinitionRow label="Last Scan">
                {(Date.now() - new Date(stats.lastScan)) / 86400000 >= 365
                  ? t('Never')
                  : timestamp(stats.lastScan)}
              </FolderDefinitionRow>
            )}
            {!folder.paused && (info?.invalid || info?.error) && (
              <FolderDefinitionRow label="Error">
                <Tooltip
                  label={info.invalid || info.error}
                  text={info.invalid || info.error}
                  triggerText={info.invalid || info.error}
                />
              </FolderDefinitionRow>
            )}
            {info && info.errors !== 0 && (
              <FolderDefinitionRow label="Failed Items">
                <a href="#failed" onClick={showItems('failed')}>
                  {compactNumber(info.pullErrors || 0)} {t('items')}
                </a>
              </FolderDefinitionRow>
            )}
            {localChanges && (
              <FolderDefinitionRow label="Locally Changed Items">
                <a href="#local-changed" onClick={showItems('local')}>
                  {compactNumber(info.receiveOnlyTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.receiveOnlyChangedBytes, true)}B
                </a>
              </FolderDefinitionRow>
            )}
            {status === 'scanning' && progress?.rate > 0 && (
              <FolderDefinitionRow label="Scan Time Remaining">
                <span title={unitPrefixed(progress.rate, true) + 'B/s'}>
                  ~ {scanRemaining(progress)}
                </span>
              </FolderDefinitionRow>
            )}
            {!['sendonly', 'receiveencrypted'].includes(folder.type) &&
              stats?.lastFile?.filename && (
                <FolderDefinitionRow label="Latest Change">
                  <Tooltip
                    label={stats.lastFile.filename}
                    triggerText={basename(stats.lastFile.filename)}
                    tail
                    kind="change"
                  >
                    {folder.path}/{stats.lastFile.filename}
                    <br />
                    <span class="text-nowrap">
                      <span
                        class={
                          stats.lastFile.deleted
                            ? 'text-danger'
                            : 'text-success'
                        }
                      >
                        {t(stats.lastFile.deleted ? 'Deleted' : 'Updated')}
                      </span>
                      {' @ '}
                      <span class="text-warning folder-change-time">
                        {timestamp(stats.lastFile.at)}
                      </span>
                    </span>
                  </Tooltip>
                </FolderDefinitionRow>
              )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Configuration')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <FolderDefinitionRow label="Rescans">
              <span title={watcherFailed || ''}>
                <Icon name="clock" />
                &nbsp;
                {folder.rescanIntervalS > 0
                  ? duration(folder.rescanIntervalS, 's')
                  : t('Disabled')}
                &ensp;
                <Icon
                  name={
                    folder.fsWatcherEnabled && !watcherFailed
                      ? 'eye'
                      : 'eye-off'
                  }
                />
                &nbsp;
                {t(
                  watcherFailed
                    ? 'Failed to set up, retrying'
                    : folder.fsWatcherEnabled
                      ? 'Enabled'
                      : 'Disabled',
                )}
              </span>
            </FolderDefinitionRow>
            {folder.versioning?.type && (
              <FolderDefinitionRow label="File Versioning">
                <FolderVersioningSummary config={folder.versioning} />
              </FolderDefinitionRow>
            )}
            {folder.ignorePerms && (
              <FolderDefinitionRow label="Ignore Permissions">
                {t('Yes')}
              </FolderDefinitionRow>
            )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Folder information')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <FolderDefinitionRow label="Folder Path">
              <Tooltip
                label={folder.path}
                text={folder.path}
                triggerText={folder.path}
                tail
              />
            </FolderDefinitionRow>
            <FolderDefinitionRow label="Folder Type">
              {t(folderTypes[folder.type] || '')}
            </FolderDefinitionRow>
            {folder.label && (
              <FolderDefinitionRow label="Folder ID">
                <Tooltip
                  label={folder.id}
                  text={folder.id}
                  triggerText={folder.id}
                />
              </FolderDefinitionRow>
            )}
            <FolderDefinitionRow label="Block Indexing">
              {t(folder.blockIndexing ? 'Yes' : 'No')}
            </FolderDefinitionRow>
            {folder.type !== 'sendonly' && (
              <FolderDefinitionRow label="File Pull Order">
                {t(pullOrders[folder.order] || '')}
              </FolderDefinitionRow>
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
