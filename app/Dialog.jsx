import {useContext, useEffect, useRef} from 'preact/hooks';
import {LocaleContext} from './locale-context.jsx';
import {Icon} from './Icon.jsx';

export function Dialog({title, large = false, status = 'default', icon = '', children, footer, onClose, onCancel}) {
    const {t} = useContext(LocaleContext);
    const dialog = useRef();
    useEffect(() => {
        const node = dialog.current;
        node.showModal();
        return () => node.close();
    }, []);
    return <dialog ref={dialog} class={`port-dialog ${large ? 'large' : ''}`}
        aria-label={t(title)} onClose={onClose} onCancel={event => { if (onCancel) { event.preventDefault(); onCancel(); } }}>
        <div class="modal-content">
            <div class={`modal-header ${status === 'default' ? '' : 'alert alert-' + status}`}>
                <h4 class="modal-title">{icon && <span class="panel-icon"><Icon name={icon} /></span>}{t(title)}</h4>
            </div>
            <div class="modal-body">{children}</div>
            <div class="modal-footer">{footer || <button class="btn btn-default btn-sm"
                onClick={() => dialog.current.close()}><Icon name="x" />&nbsp;{t('Close')}</button>}</div>
        </div>
    </dialog>;
}
