import { useEffect, useRef, useState } from 'preact/hooks';

export function useLogTail(api) {
  const pausedRef = useRef(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [paused, setPausedState] = useState(false);
  const setPaused = (value) => {
    pausedRef.current = value;
    setPausedState(value);
  };
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let since;
    async function poll() {
      try {
        if (!pausedRef.current) {
          const data = await api.get(
            'system/log',
            { since },
            controller.signal,
          );
          if (!pausedRef.current && !controller.signal.aborted) {
            setEntries((previous) => [...previous, ...(data.messages || [])]);
            since = data.messages?.at(-1)?.when || since;
            setError('');
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [api]);
  return { entries, error, setError, paused, setPaused };
}
