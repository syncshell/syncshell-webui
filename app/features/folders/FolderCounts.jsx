import { useContext } from 'preact/hooks';
import { compactNumber, unitPrefixed } from '../../../client/format.mjs';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../locale-context.jsx';
import { Tooltip } from '../../Tooltip.jsx';

export function FolderCounts({ info, prefix = 'global' }) {
  const { t } = useContext(LocaleContext);
  const files = info?.[prefix + 'Files'];
  const folders = info?.[prefix + 'Directories'];
  const bytes = info?.[prefix + 'Bytes'];
  const full = (
    <>
      <div>
        <span>
          <Icon name="copy" class="icon-fixed" /> {t('Files')}:
        </span>
        <span>{(files || 0).toLocaleString()}</span>
      </div>
      <div>
        <span>
          <Icon name="folder" class="icon-fixed" /> {t('Folders')}:
        </span>
        <span>{(folders || 0).toLocaleString()}</span>
      </div>
      <div>
        <span>
          <Icon name="drive" class="icon-fixed" /> {t('Total')}:
        </span>
        <span>~{unitPrefixed(bytes, true)}B</span>
      </div>
    </>
  );
  return (
    <>
      <Tooltip icon="copy" label="Files" kind="count">
        {full}
      </Tooltip>
      &nbsp;{compactNumber(files)}&ensp;
      <Tooltip icon="drive" label="Total" kind="count">
        {full}
      </Tooltip>
      &nbsp;~{unitPrefixed(bytes, true)}B
    </>
  );
}
