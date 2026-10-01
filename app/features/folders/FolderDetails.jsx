import { useContext } from 'preact/hooks';
import { fieldHelp } from '../../../client/field-help.mjs';
import {
  compactNumber,
  duration,
  timestamp,
  unitPrefixed,
} from '../../../client/format.mjs';
import { DefinitionRow } from '../../DefinitionRow.jsx';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../locale-context.jsx';
import { Tooltip } from '../../Tooltip.jsx';
import { FolderCounts } from './FolderCounts.jsx';
import { FolderVersioningSummary } from './FolderVersioningSummary.jsx';
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
                    text={fieldHelp['Global/local State'].help}
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
              <DefinitionRow
                key={prefix}
                label={prefix === 'global' ? 'Global State' : 'Local State'}
                rowClass="folder-state-detail"
              >
                <FolderCounts info={info} prefix={prefix} />
              </DefinitionRow>
            ))}
            {info?.needTotalItems > 0 && (
              <DefinitionRow
                label="Out of Sync Items"
                icon="cloud-download"
                help="Items this device still needs to synchronize with other devices. The size counts whole files; reusing existing data can reduce the amount actually downloaded. Click the value to see the items."
              >
                <a href="#needed" onClick={showItems('need')}>
                  {compactNumber(info.needTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.needBytes, true)}B
                </a>
              </DefinitionRow>
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
              <DefinitionRow label="Last Scan">
                {(Date.now() - new Date(stats.lastScan)) / 86400000 >= 365
                  ? t('Never')
                  : timestamp(stats.lastScan)}
              </DefinitionRow>
            )}
            {!folder.paused && (info?.invalid || info?.error) && (
              <DefinitionRow label="Error">
                <Tooltip
                  label={info.invalid || info.error}
                  text={info.invalid || info.error}
                  triggerText={info.invalid || info.error}
                />
              </DefinitionRow>
            )}
            {info && info.errors !== 0 && (
              <DefinitionRow label="Failed Items">
                <a href="#failed" onClick={showItems('failed')}>
                  {compactNumber(info.pullErrors || 0)} {t('items')}
                </a>
              </DefinitionRow>
            )}
            {localChanges && (
              <DefinitionRow label="Locally Changed Items">
                <a href="#local-changed" onClick={showItems('local')}>
                  {compactNumber(info.receiveOnlyTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.receiveOnlyChangedBytes, true)}B
                </a>
              </DefinitionRow>
            )}
            {status === 'scanning' && progress?.rate > 0 && (
              <DefinitionRow label="Scan Time Remaining">
                <span title={unitPrefixed(progress.rate, true) + 'B/s'}>
                  ~ {scanRemaining(progress)}
                </span>
              </DefinitionRow>
            )}
            {!['sendonly', 'receiveencrypted'].includes(folder.type) &&
              stats?.lastFile?.filename && (
                <DefinitionRow label="Latest Change">
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
                </DefinitionRow>
              )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Configuration')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <DefinitionRow label="Rescans">
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
            </DefinitionRow>
            {folder.versioning?.type && (
              <DefinitionRow label="File Versioning">
                <FolderVersioningSummary config={folder.versioning} />
              </DefinitionRow>
            )}
            {folder.ignorePerms && (
              <DefinitionRow label="Ignore Permissions">
                {t('Yes')}
              </DefinitionRow>
            )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Folder information')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <DefinitionRow label="Folder Path">
              <Tooltip
                label={folder.path}
                text={folder.path}
                triggerText={folder.path}
                tail
              />
            </DefinitionRow>
            <DefinitionRow label="Folder Type">
              {t(folderTypes[folder.type] || '')}
            </DefinitionRow>
            {folder.label && (
              <DefinitionRow label="Folder ID">
                <Tooltip
                  label={folder.id}
                  text={folder.id}
                  triggerText={folder.id}
                />
              </DefinitionRow>
            )}
            <DefinitionRow label="Block Indexing">
              {t(folder.blockIndexing ? 'Yes' : 'No')}
            </DefinitionRow>
            {folder.type !== 'sendonly' && (
              <DefinitionRow label="File Pull Order">
                {t(pullOrders[folder.order] || '')}
              </DefinitionRow>
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
