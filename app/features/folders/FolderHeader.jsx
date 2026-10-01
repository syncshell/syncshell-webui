import { unitPrefixed } from '../../../client/format.mjs';
import { Icon } from '../../ui/Icon.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { folderClass, folderStatusIcon } from './folder-status.mjs';

export function FolderHeader({
  folder,
  info,
  label,
  open,
  percent,
  status,
  onToggle,
}) {
  const { t } = useLocale();
  return (
    <button class="btn panel-heading" aria-expanded={open} onClick={onToggle}>
      {['scanning', 'syncing'].includes(status) && percent !== undefined && (
        <span class="panel-progress" style={{ width: percent + '%' }} />
      )}
      <span class="panel-title">
        <span class="panel-icon hidden-xs">
          <Icon
            name={
              {
                sendonly: 'upload',
                receiveonly: 'download',
                receiveencrypted: 'lock',
              }[folder.type] || 'folder'
            }
            class="icon-fixed"
          />
        </span>
        <span class={`panel-status pull-right text-${folderClass(status)}`}>
          <span class="hidden-xs">{t(label)}</span>
          {status === 'scanning' && percent !== undefined && ` (${percent}%)`}
          {status === 'syncing' &&
            ` (${percent}%, ${unitPrefixed(info.needBytes, true)}B)`}
          <Icon
            name={folderStatusIcon(status)}
            class="visible-xs icon-fixed"
            label={t(label)}
          />
        </span>
        <span class="panel-title-text" title={folder.label || folder.id}>
          {folder.label || folder.id}
        </span>
      </span>
    </button>
  );
}
