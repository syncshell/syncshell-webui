// Copyright (C) 2026 The Syncshell Authors.
// SPDX-License-Identifier: MPL-2.0

export class HttpError extends Error {
  /**
   * @param {Response} response
   * @param {unknown} data
   */
  constructor(response, data) {
    const daemonMessage =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : '';
    super(
      typeof data === 'string' && data
        ? data
        : daemonMessage || `HTTP ${response.status}`,
    );
    this.name = 'HttpError';
    this.status = response.status;
    this.data = data;
    this.url = response.url;
  }
}

/**
 * Options shared by Syncthing REST requests. Query values are encoded onto the
 * URL, while body values are serialized as JSON. Signals cancel the underlying
 * same-origin fetch.
 *
 * @typedef {object} SyncthingRequestOptions
 * @property {Record<string, string | number | boolean | null | undefined>} [query]
 * @property {unknown} [body]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} SyncthingApi
 * @property {(method: string, path: string, options?: SyncthingRequestOptions) => Promise<unknown>} request
 * @property {(path: string, options?: SyncthingRequestOptions) => Promise<unknown>} get
 * @property {(path: string, options?: SyncthingRequestOptions) => Promise<unknown>} post
 * @property {(path: string, options?: SyncthingRequestOptions) => Promise<unknown>} put
 * @property {(path: string, options?: SyncthingRequestOptions) => Promise<unknown>} patch
 * @property {(path: string, options?: SyncthingRequestOptions) => Promise<unknown>} delete
 */

/**
 * @typedef {object} SyncthingApiOptions
 * @property {string | URL} [pageUrl]
 * @property {{deviceIDShort?: string} | null} [metadata]
 * @property {typeof globalThis.fetch} [fetch]
 * @property {() => string} [cookie]
 */

/**
 * @param {SyncthingApiOptions} [options]
 * @returns {SyncthingApi}
 */
export function createSyncthingApi({
  pageUrl = location.href,
  metadata = window.metadata,
  fetch: fetcher = globalThis.fetch,
  cookie = () => document.cookie,
} = {}) {
  const base = new URL('rest/', pageUrl);
  const suffix = metadata?.deviceIDShort;

  /**
   * @param {string} method
   * @param {string} path
   * @param {SyncthingRequestOptions} [options]
   */
  async function request(method, path, { query, body, signal } = {}) {
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new TypeError('Syncthing requests must stay within the REST base');
    }
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
    }
    const headers = new Headers({
      Accept: 'application/json, text/plain, */*',
    });
    if (suffix) {
      const prefix = `CSRF-Token-${suffix}=`;
      const token = cookie()
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      if (token)
        headers.set(
          `X-CSRF-Token-${suffix}`,
          decodeURIComponent(token.slice(prefix.length)),
        );
    }
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetcher(url, {
      method,
      headers,
      signal,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    /** @type {unknown} */
    let data = text;
    if (
      text &&
      (response.headers.get('Content-Type')?.includes('json') ||
        /^\s*(?:\[|\{)/.test(text))
    ) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        if (response.ok) throw error;
      }
    }
    if (!response.ok) throw new HttpError(response, data);
    return data;
  }

  return {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    patch: (path, options) => request('PATCH', path, options),
    delete: (path, options) => request('DELETE', path, options),
  };
}
