import { useEffect } from 'preact/hooks';

let nextTooltip = 0;

function bindTooltip(trigger, tip) {
  let showTimer;
  let hideTimer;
  tip.id = 'syncshell-tooltip-' + ++nextTooltip;
  function position() {
    if (!tip.matches(':popover-open')) return;
    const rect = trigger.getBoundingClientRect();
    const bounds = tip.getBoundingClientRect();
    const above = rect.top > bounds.height + 8;
    tip.classList.toggle('top', above);
    tip.classList.toggle('bottom', !above);
    tip.style.top =
      (above ? rect.top - bounds.height - 5 : rect.bottom + 5) + 'px';
    tip.style.left =
      Math.max(
        8,
        Math.min(
          innerWidth - bounds.width - 8,
          rect.left + rect.width / 2 - bounds.width / 2,
        ),
      ) + 'px';
  }
  function show() {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    if (tip.matches(':popover-open')) return;
    showTimer = setTimeout(() => {
      tip.showPopover();
      trigger.setAttribute('aria-describedby', tip.id);
      position();
    }, 400);
  }
  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (tip.matches(':popover-open')) tip.hidePopover();
    trigger.removeAttribute('aria-describedby');
  }
  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 100);
  }
  function keepOpen() {
    clearTimeout(hideTimer);
  }
  function key(event) {
    if (event.key === 'Escape') hide();
  }
  trigger.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', scheduleHide);
  trigger.addEventListener('focus', show);
  trigger.addEventListener('blur', hide);
  tip.addEventListener('mouseenter', keepOpen);
  tip.addEventListener('mouseleave', scheduleHide);
  document.addEventListener('keydown', key);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  const observer = new MutationObserver(position);
  observer.observe(tip, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return () => {
    hide();
    observer.disconnect();
    trigger.removeEventListener('mouseenter', show);
    trigger.removeEventListener('mouseleave', scheduleHide);
    trigger.removeEventListener('focus', show);
    trigger.removeEventListener('blur', hide);
    tip.removeEventListener('mouseenter', keepOpen);
    tip.removeEventListener('mouseleave', scheduleHide);
    document.removeEventListener('keydown', key);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  };
}

export function useTooltip(trigger, tip) {
  useEffect(() => bindTooltip(trigger.current, tip.current), []);
}
