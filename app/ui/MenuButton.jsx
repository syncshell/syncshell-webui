import { useRef, useState } from 'preact/hooks';
import { useDismissibleMenu } from './useDismissibleMenu.mjs';

export function MenuButton({
  as = 'div',
  buttonClass = '',
  children,
  className = '',
  disabled = false,
  label,
  placement = 'dropdown',
  triggerAs = 'button',
  triggerHref,
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef();
  useDismissibleMenu(menu, open, setOpen);
  const close = () => setOpen(false);
  const Container = as;
  const Trigger = triggerAs;
  return (
    <Container
      ref={menu}
      class={`${placement} ${className} ${open ? 'open' : ''}`.trim()}
    >
      <Trigger
        type={triggerAs === 'button' ? 'button' : undefined}
        href={triggerHref}
        class={`dropdown-toggle ${buttonClass}`.trim()}
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          if (triggerAs === 'a') event.preventDefault();
          setOpen(!open);
        }}
      >
        {label}
      </Trigger>
      <ul class="dropdown-menu">{children({ close })}</ul>
    </Container>
  );
}
