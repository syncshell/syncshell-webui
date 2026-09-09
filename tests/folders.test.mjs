import assert from 'node:assert/strict';
import {test} from 'node:test';
import {folderStatus, folderClass, folderStateClass, folderStateDetails,
    syncPercentage} from '../client/folders.mjs';
import {compactNumber, unitPrefixed} from '../client/format.mjs';

const folder = {id: 'folder', devices: [{}, {}], type: 'sendreceive'};
const idle = {state: 'idle', errors: 0, needTotalItems: 0, needBytes: 0,
    globalFiles: 2, localFiles: 2, globalDirectories: 1, localDirectories: 1,
    globalBytes: 100, localBytes: 100, inSyncBytes: 100};

test('folder state prioritizes pause, failure, pending work and local changes', () => {
    for (const [info, overrides, status] of [
        [undefined, {}, 'unknown'], [{}, {}, 'unknown'], [idle, {}, 'idle'],
        [{...idle, state: 'error'}, {}, 'stopped'],
        [{...idle, errors: 1}, {}, 'faileditems'],
        [{...idle, needTotalItems: 1, errors: 1}, {}, 'outofsync'],
        [idle, {devices: []}, 'unshared'],
        [{...idle, receiveOnlyTotalItems: 1}, {type: 'receiveonly'}, 'localadditions'],
        [{...idle, receiveOnlyTotalItems: 1}, {type: 'receiveencrypted'}, 'localunencrypted'],
        [{...idle, receiveOnlyTotalItems: 1}, {}, 'idle'],
        [{...idle, state: 'error'}, {paused: true}, 'paused'],
        [undefined, {paused: true}, 'paused']
    ]) assert.equal(folderStatus({...folder, ...overrides}, info), status);
    for (const state of ['scanning', 'syncing', 'starting', 'cleaning', 'sync-preparing',
        'scan-waiting', 'sync-waiting', 'clean-waiting', 'unknown']) {
        assert.equal(folderStatus(folder, {...idle, state}), state);
    }
});

test('status colors distinguish progress, warnings, failures and unknown state', () => {
    for (const [status, card, summary] of [
        ['idle', 'success', 'success'], ['localadditions', 'success', 'warning'],
        ['paused', 'default', 'default'], ['scanning', 'primary', 'warning'],
        ['syncing', 'primary', 'warning'], ['outofsync', 'danger', 'warning'],
        ['faileditems', 'danger', 'danger'], ['stopped', 'danger', 'danger'],
        ['localunencrypted', 'danger', 'danger'], ['unshared', 'warning', 'warning'],
        ['scan-waiting', 'warning', 'warning'], ['unknown', 'info', 'info']
    ]) {
        assert.equal(folderClass(status), card);
        assert.equal(folderStateClass(status), summary);
    }
});

test('details and progress preserve incomplete and zero-byte states', () => {
    assert.equal(folderStateDetails(folder, idle), false);
    assert.equal(folderStateDetails(folder, undefined), false);
    for (const field of ['localFiles', 'localDirectories', 'localBytes']) {
        assert.equal(folderStateDetails(folder, {...idle, [field]: 0}), true);
    }
    assert.equal(folderStateDetails({...folder, paused: true}, {...idle, errors: 1}), false);
    assert.equal(folderStateDetails(folder, {...idle, state: 'scanning'}), true);
    assert.equal(syncPercentage(undefined), 100);
    assert.equal(syncPercentage(idle), 100);
    assert.equal(syncPercentage({...idle, needTotalItems: 1}), 95);
    assert.equal(syncPercentage({...idle, needTotalItems: 1, needBytes: 1}), 99);
    assert.equal(syncPercentage({...idle, needTotalItems: 1, needBytes: 50, inSyncBytes: 50}), 50);
});

test('compact counts retain truncation at k, M and B boundaries', () => {
    for (const [input, output] of [[0,'0'], [999,'999'], [1000,'1.0k'],
        [1099,'1.0k'], [1100,'1.1k'], [12921,'12.9k'], [109274,'109.2k'],
        [999999,'999.9k'], [1000000,'1.0M'], [12999999,'12.9M'],
        [999999999,'999.9M'], [1000000000,'1.0B'], [109699999999,'109.6B'],
        [undefined,'-'], [NaN,'-'], [Infinity,'-'], [-1,'-']]) {
        assert.equal(compactNumber(input), output);
    }
    for (const [input, output] of [[0,'0 '], [1023,'1,023 '], [1024,'1,024 '],
        [1025,'1 Ki'], [1048576,'1,024 Ki'], [1073741824,'1,024 Mi'],
        [1073741825,'1 Gi'], [7351042089,'6.85 Gi'],
        [1099511627776,'1,024 Gi'], [1099511627777,'1 Ti']]) {
        assert.equal(unitPrefixed(input,true),output);
    }
});
