import { useRef } from 'preact/hooks';
import { useLocale } from '../core/locale/LocaleContext.jsx';
import { Icon } from './Icon.jsx';
import { useTooltip } from './useTooltip.mjs';
import './Tooltip.css';

export function Tooltip({
  icon = '',
  iconClass = '',
  label,
  text = '',
  prefix = '',
  kind = 'help',
  triggerText,
  tail = false,
  children,
}) {
  const { t } = useLocale();
  const trigger = useRef();
  const tip = useRef();
  useTooltip(trigger, tip);
  return (
    <>
      <span
        ref={trigger}
        class={
          icon
            ? `${iconClass} folder-${kind === 'count' ? 'count' : 'help'}-icon`
            : tail
              ? 'folder-tail'
              : 'folder-text'
        }
        tabIndex="0"
        role={icon ? 'img' : undefined}
        aria-label={triggerText === undefined ? t(label) : label}
      >
        {icon && <Icon name={icon} />}
        {triggerText !== undefined && <bdi dir="ltr">{triggerText}</bdi>}
      </span>
      <div
        ref={tip}
        popover="manual"
        role="tooltip"
        class={`tooltip in tooltip-popover folder-${kind}-tooltip`}
      >
        <div class="tooltip-arrow" />
        <div class="tooltip-inner">
          {children || (
            <>
              {prefix ? t(prefix) + '. ' : ''}
              {triggerText === undefined ? t(text) : text}
            </>
          )}
        </div>
      </div>
    </>
  );
}
