import { useContext } from 'preact/hooks';
import { duration } from '../../../client/format.mjs';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { Tooltip } from '../../ui/Tooltip.jsx';
import { versioningTypes } from './folder-status.mjs';

export function FolderVersioningSummary({ config }) {
  const { t } = useContext(LocaleContext);
  const path = config.fsPath || '.stversions';
  const time = (value) => duration(value, 's');
  return (
    <>
      <span title={config.type === 'external' ? config.params.command : ''}>
        {t(versioningTypes[config.type] || '')}
      </span>
      {config.type !== 'external' && (
        <>
          {['trashcan', 'simple'].includes(config.type) && (
            <span title={t('Clean out after')}>
              &ensp;
              <Icon name="calendar" />
              &nbsp;
              {Number(config.params.cleanoutDays) === 0
                ? t('Disabled')
                : duration(config.params.cleanoutDays * 86400, 'd')}
            </span>
          )}
          {config.type === 'simple' && (
            <span title={t('Keep Versions')}>
              &ensp;
              <Icon name="archive" />
              &nbsp;{config.params.keep}
            </span>
          )}
          {config.type === 'staggered' && (
            <span title={t('Maximum Age')}>
              &ensp;
              <Icon name="calendar" />
              &nbsp;
              {Number(config.params.maxAge) === 0
                ? t('Forever')
                : time(config.params.maxAge)}
            </span>
          )}
          <span title={t('Cleanup Interval')}>
            &ensp;
            <Icon name="recycle" />
            &nbsp;
            {config.cleanupIntervalS === 0
              ? t('Disabled')
              : time(config.cleanupIntervalS)}
          </span>
          <span class="folder-change">
            <Icon name="folder-open" />
            <Tooltip
              label={path}
              text={path}
              triggerText={path.split(/[\\/]/).at(-1)}
              tail
            />
          </span>
        </>
      )}
    </>
  );
}
