import { useContext } from 'preact/hooks';
import { fieldHelp } from '../../../client/field-help.mjs';
import {
  compactNumber,
  duration,
  timestamp,
  unitPrefixed,
} from '../../../client/format.mjs';
import { Counts } from '../../Counts.jsx';
import { Field } from '../../Field.jsx';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../locale-context.jsx';
import { Tooltip } from '../../Tooltip.jsx';
import { Versioning } from '../../Versioning.jsx';
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
                  <Counts info={info} />
                </td>
              </tr>
            )}
            {summaries.map((prefix) => (
              <Field
                key={prefix}
                label={prefix === 'global' ? 'Global State' : 'Local State'}
                rowClass="folder-state-detail"
              >
                <Counts info={info} prefix={prefix} />
              </Field>
            ))}
            {info?.needTotalItems > 0 && (
              <Field
                label="Out of Sync Items"
                icon="cloud-download"
                help="Items this device still needs to synchronize with other devices. The size counts whole files; reusing existing data can reduce the amount actually downloaded. Click the value to see the items."
              >
                <a href="#needed" onClick={showItems('need')}>
                  {compactNumber(info.needTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.needBytes, true)}B
                </a>
              </Field>
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
              <Field label="Last Scan">
                {(Date.now() - new Date(stats.lastScan)) / 86400000 >= 365
                  ? t('Never')
                  : timestamp(stats.lastScan)}
              </Field>
            )}
            {!folder.paused && (info?.invalid || info?.error) && (
              <Field label="Error">
                <Tooltip
                  label={info.invalid || info.error}
                  text={info.invalid || info.error}
                  triggerText={info.invalid || info.error}
                />
              </Field>
            )}
            {info && info.errors !== 0 && (
              <Field label="Failed Items">
                <a href="#failed" onClick={showItems('failed')}>
                  {compactNumber(info.pullErrors || 0)} {t('items')}
                </a>
              </Field>
            )}
            {localChanges && (
              <Field label="Locally Changed Items">
                <a href="#local-changed" onClick={showItems('local')}>
                  {compactNumber(info.receiveOnlyTotalItems)} {t('items')}, ~
                  {unitPrefixed(info.receiveOnlyChangedBytes, true)}B
                </a>
              </Field>
            )}
            {status === 'scanning' && progress?.rate > 0 && (
              <Field label="Scan Time Remaining">
                <span title={unitPrefixed(progress.rate, true) + 'B/s'}>
                  ~ {scanRemaining(progress)}
                </span>
              </Field>
            )}
            {!['sendonly', 'receiveencrypted'].includes(folder.type) &&
              stats?.lastFile?.filename && (
                <Field label="Latest Change">
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
                </Field>
              )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Configuration')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <Field label="Rescans">
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
            </Field>
            {folder.versioning?.type && (
              <Field label="File Versioning">
                <Versioning config={folder.versioning} />
              </Field>
            )}
            {folder.ignorePerms && (
              <Field label="Ignore Permissions">{t('Yes')}</Field>
            )}
          </tbody>
        </table>
      </details>
      <details class="folder-details">
        <summary>{t('Folder information')}</summary>
        <table class="table table-condensed table-auto">
          <tbody>
            <Field label="Folder Path">
              <Tooltip
                label={folder.path}
                text={folder.path}
                triggerText={folder.path}
                tail
              />
            </Field>
            <Field label="Folder Type">
              {t(folderTypes[folder.type] || '')}
            </Field>
            {folder.label && (
              <Field label="Folder ID">
                <Tooltip
                  label={folder.id}
                  text={folder.id}
                  triggerText={folder.id}
                />
              </Field>
            )}
            <Field label="Block Indexing">
              {t(folder.blockIndexing ? 'Yes' : 'No')}
            </Field>
            {folder.type !== 'sendonly' && (
              <Field label="File Pull Order">
                {t(pullOrders[folder.order] || '')}
              </Field>
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
