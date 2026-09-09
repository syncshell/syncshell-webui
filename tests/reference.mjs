import {readFileSync} from 'node:fs';

export const referenceCommit = 'ec4e2a83dacb44fffbae376e2034028ddb76ad3d';
export function referenceSource(path) {
    return readFileSync(new URL('reference/' + path, import.meta.url), 'utf8');
}
