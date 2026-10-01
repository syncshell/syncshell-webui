import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const LocaleContext = createContext({ t: (key) => key });

export function useLocale() {
  return useContext(LocaleContext);
}
