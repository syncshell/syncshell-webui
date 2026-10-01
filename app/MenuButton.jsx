import { useRef, useState } from 'preact/hooks';
import { useDismissibleMenu } from './useDismissibleMenu.mjs';

export function MenuButton({
  buttonClass = '',
  children,
  className = '',
  disabled = false,
  label,
  placement = 'dropdown',
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef();
  useDismissibleMenu(menu, open, setOpen);
  const close = () => setOpen(false);
  return (
    <div
      ref={menu}
      class={`${placement} ${className} ${open ? 'open' : ''}`.trim()}
    >
      <button
        type="button"
        class={`dropdown-toggle ${buttonClass}`.trim()}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      <ul class="dropdown-menu">{children({ close })}</ul>
    </div>
  );
}
