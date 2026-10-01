import { useEffect, useRef, useState } from 'preact/hooks';
import { createSession } from './session.mjs';
import { createInitialState } from './session-state.mjs';

export function useSyncthingSession(
  api,
  { active = true, onAuthExpired } = {},
) {
  const [state, setState] = useState(createInitialState);
  const sessionRef = useRef(null);

  if (sessionRef.current === null) {
    sessionRef.current = createSession(api, {
      publish: setState,
      onAuthExpired,
    });
  }

  useEffect(() => {
    const session = sessionRef.current;
    if (active) session.start();
    return () => {
      session.stop();
    };
  }, [active]);

  return [state, sessionRef.current];
}
