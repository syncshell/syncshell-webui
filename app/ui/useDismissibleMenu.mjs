import { useEffect } from 'preact/hooks';

export function useDismissibleMenu(ref, open, setOpen) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      ref.current?.querySelector('.dropdown-toggle')?.focus();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);
}
