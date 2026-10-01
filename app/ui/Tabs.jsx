export function Tabs({ activeId, items, onSelect, className = '' }) {
  function handleKeyDown(event) {
    const enabled = items.filter((item) => !item.disabled);
    let index = enabled.findIndex((item) => item.id === activeId);
    if (event.key === 'ArrowRight') index = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft')
      index = (index + enabled.length - 1) % enabled.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = enabled.length - 1;
    else return;
    event.preventDefault();
    const next = enabled[index];
    onSelect(next.id);
    const controls = event.currentTarget.querySelectorAll('[role="tab"]');
    for (const control of controls) {
      if (control.dataset.tabId === next.id) control.focus();
    }
  }

  return (
    <ul
      class={`nav nav-tabs ${className}`.trim()}
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => (
        <li
          key={item.id}
          class={
            item.id === activeId ? 'active' : item.disabled ? 'disabled' : ''
          }
          role="presentation"
        >
          <a
            id={item.tabId}
            href={'#' + item.panelId}
            role="tab"
            data-tab-id={item.id}
            aria-controls={item.panelId}
            aria-selected={item.id === activeId}
            aria-disabled={item.disabled || undefined}
            tabIndex={item.id === activeId ? 0 : -1}
            onClick={(event) => {
              event.preventDefault();
              if (!item.disabled) onSelect(item.id);
            }}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
