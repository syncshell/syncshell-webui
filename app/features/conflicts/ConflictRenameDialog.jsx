import { useContext } from 'preact/hooks';
import { Dialog } from '../../Dialog.jsx';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';

export function ConflictRenameDialog({
  conflict,
  errors,
  loading,
  onCancel,
  onRename,
}) {
  const { t } = useContext(LocaleContext);

  return (
    <Dialog
      title={t('Restore original name')}
      onClose={onCancel}
      onCancel={() => {
        if (!loading) onCancel();
      }}
      footer={
        <>
          <button class="btn btn-default" disabled={loading} onClick={onCancel}>
            {t('Cancel')}
          </button>
          <button class="btn btn-default" disabled={loading} onClick={onRename}>
            <span class="text-warning">{t('Rename')}</span>
          </button>
        </>
      }
    >
      <p>
        {t(
          'The selected file keeps its contents and takes the original name shown below. Its conflict filename disappears; other conflict files remain.',
        )}
      </p>
      <p>
        {t(
          'If a file already exists at the destination, nothing is renamed or replaced.',
        )}
      </p>
      <strong>{t('From')}:</strong>
      <p class="review-confirm-path">
        {conflict.group.root}/{conflict.file.path}
      </p>
      <strong>{t('To')}:</strong>
      <p class="review-confirm-path">
        {conflict.group.root}/{conflict.group.path}
      </p>
      {errors.map((error) => (
        <p key={error} class="text-danger" role="alert">
          {error}
        </p>
      ))}
    </Dialog>
  );
}
