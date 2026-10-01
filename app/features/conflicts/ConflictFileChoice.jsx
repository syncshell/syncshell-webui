import { Icon } from '../../ui/Icon.jsx';
import { useLocale } from '../../core/locale/LocaleContext.jsx';
import { Tooltip } from '../../ui/Tooltip.jsx';

const missingCurrentFileHelp =
  'The latest Syncthing index has no usable file at the original name. Conflict files are ordinary files with a conflict marker in their names. Rename the version you want to keep, or delete unwanted conflict files, then recheck. Rechecking alone does not rename or delete files.';

export function ConflictFileChoice({ group, file, permission, onOpen }) {
  const { t } = useLocale();

  if (!file)
    return (
      <span class="text-warning">
        <Tooltip
          icon="triangle-alert"
          label="Missing current file"
          text={t(missingCurrentFileHelp)}
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
