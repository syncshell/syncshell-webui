import {useEffect} from 'preact/hooks';

export function useDismissableMenu(ref, open, setOpen) {
    useEffect(() => {
        if (!open) return;
        function pointerdown(event) {
            if (!ref.current?.contains(event.target)) setOpen(false);
        }
        function keydown(event) {
            if (event.key !== 'Escape') return;
            setOpen(false);
            ref.current?.querySelector('.dropdown-toggle')?.focus();
        }
        document.addEventListener('pointerdown', pointerdown);
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('pointerdown', pointerdown);
            document.removeEventListener('keydown', keydown);
        };
    }, [open, setOpen]);
}
