import { useContext } from 'preact/hooks';
import { Icon } from '../../Icon.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import { Tooltip } from '../../Tooltip.jsx';
import { missingHelp } from './conflicts.mjs';

export function ConflictFileChoice({ group, file, permission, onOpen }) {
  const { t } = useContext(LocaleContext);

  if (!file)
    return (
      <span class="text-warning">
        <Tooltip
          icon="triangle-alert"
          label="Missing current file"
          text={t(missingHelp)}
        />{' '}
        {t('Missing current file')}
      </span>
    );

  if (!file.available)
    return (
      <span
        class="text-warning"
        title={t('Waiting for Syncthing to download this file')}
      >
        {file.name} · {t('Not available locally')}
      </span>
    );

  const contents = (
    <>
      <Icon name="file" class="icon-fixed" />
      <span class="review-filename">{file.name}</span>
    </>
  );

  if (!permission(group, file).open)
    return (
      <span class="review-file" title={group.root + '/' + file.path}>
        {contents}
      </span>
    );

  return (
    <a
      class="review-file"
      href="#open-file"
      title={group.root + '/' + file.path}
      onClick={(event) => {
        event.preventDefault();
        onOpen(group, file);
      }}
    >
      {contents}
    </a>
  );
}
