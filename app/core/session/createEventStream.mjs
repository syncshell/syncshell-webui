// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

/**
 * @typedef {object} DaemonEvent
 * @property {number} id
 * @property {string} type
 * @property {unknown} data
 */

/**
 * @typedef {object} EventStreamApi
 * @property {(path: string, options?: {query?: Record<string, number>, signal?: AbortSignal}) => Promise<DaemonEvent[] | null | ''>} get
 */

/**
 * @typedef {object} EventStreamOptions
 * @property {(event: DaemonEvent) => void} [onEvent]
 * @property {() => void} [onOnline]
 * @property {(error: unknown) => void} [onOffline]
 * @property {() => void} [onAuthExpired]
 * @property {number} [retryMs]
 */

/**
 * @param {EventStreamApi} api
 * @param {EventStreamOptions} [options]
 */
export function createEventStream(
  api,
  {
    onEvent = () => {},
    onOnline = () => {},
    onOffline = () => {},
    onAuthExpired = () => location.reload(),
    retryMs = 1000,
  } = {},
) {
  /** @type {Promise<void> | undefined} */
  let running;
  /** @type {AbortController | undefined} */
  let controller;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {(() => void) | undefined} */
  let wake;
  let lastID = 0;

  function start() {
    if (running) return running;
    controller = new AbortController();
    const signal = controller.signal;
    running = poll(signal).finally(() => {
      running = undefined;
    });
    return running;
  }

  /** @param {AbortSignal} signal */
  async function poll(signal) {
    /** @type {Record<string, number>} */
    let query = { limit: 1 };
    while (!signal.aborted) {
      try {
        const data = await api.get('events', { query, signal });
        if (signal.aborted) return;
        // a daemon restart can leave an already-started 200 response empty
        if (!data) throw new Error('Empty event response');
        onOnline();
        if (lastID > 0) data.forEach(onEvent);
        if (data.length) lastID = data[data.length - 1].id;
        query = { since: lastID };
      } catch (error) {
        if (signal.aborted) return;
        const status =
          error && typeof error === 'object' && 'status' in error
            ? error.status
            : undefined;
        if (status === 403) {
          onAuthExpired();
          return;
        }
        onOffline(error);
        await new Promise((resolve) => {
          wake = () => resolve(undefined);
          timer = setTimeout(resolve, retryMs);
        });
        timer = undefined;
        wake = undefined;
        query = { limit: 1 };
      }
    }
  }

  function stop() {
    controller?.abort();
    clearTimeout(timer);
    wake?.();
    return running;
  }

  return { start, stop };
}
