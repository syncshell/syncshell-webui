import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { LocaleContext } from '../core/locale/LocaleContext.jsx';
import { Icon } from './Icon.jsx';
import './Dialog.css';

export function Dialog({
  title,
  large = false,
  expandable = false,
  status = 'default',
  icon = '',
  children,
  footer,
  onClose,
  onCancel,
}) {
  const { t } = useContext(LocaleContext);
  const dialog = useRef();
  const returnFocus = useRef();
  const [full, setFull] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    returnFocus.current = document.activeElement;
    node.showModal();
    const initialFocus = node.querySelector(
      '[autofocus], button:not([disabled]), a[href]:not([aria-disabled="true"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (initialFocus || node).focus();
    return () => {
      if (node.open) node.close();
      const target = returnFocus.current;
      if (target?.isConnected) target.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      class={`dialog ${large ? 'large' : ''} ${expandable ? 'expandable' : ''} ${full ? 'full-view' : ''}`}
      aria-label={t(title)}
      onClose={onClose}
      onCancel={(event) => {
        if (onCancel) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div class="modal-content">
        <div
          class={`modal-header ${status === 'default' ? '' : 'alert alert-' + status}`}
        >
          <h4 class="modal-title">
            {icon && (
              <span class="panel-icon">
                <Icon name={icon} />
              </span>
            )}
            {t(title)}
          </h4>
          {expandable && (
            <div class="modal-header-actions">
              <button
                type="button"
                class="btn btn-default btn-sm"
                onClick={() => setFull(!full)}
              >
                <Icon name={full ? 'minimize' : 'maximize'} />
                &nbsp;{t(full ? 'Back' : 'Full View')}
              </button>
              <button
                type="button"
                class="btn btn-default btn-sm"
                onClick={() => dialog.current.close()}
              >
                <Icon name="x" />
                &nbsp;{t('Close')}
              </button>
            </div>
          )}
        </div>
        <div class="modal-body">{children}</div>
        {(!expandable || footer) && (
          <div class="modal-footer">
            {footer || (
              <button
                type="button"
                class="btn btn-default btn-sm"
                onClick={() => dialog.current.close()}
              >
                <Icon name="x" />
                &nbsp;{t('Close')}
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
