// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

export function compactNumber(input) {
    if (!Number.isFinite(input) || input < 0) {
        return '-';
    }
    var units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
    for (var i = 0; i < units.length; i++) {
        if (input >= units[i][0]) {
            return (Math.floor(input / (units[i][0] / 10)) / 10)
                .toFixed(1) + units[i][1];
        }
    }
    return input.toLocaleString();
}

export function unitPrefixed(input, binary) {
    if (input === undefined || isNaN(input)) return '0 ';
    const factor = binary ? 1024 : 1000;
    for (const [power, suffix] of [[4, 'T'], [3, 'G'], [2, 'M'], [1, binary ? 'K' : 'k']]) {
        if (input <= factor ** power) continue;
        const value = input / factor ** power;
        const whole = power === 4 ? value > 1000 : binary && value >= 1000;
        return value.toLocaleString(undefined, whole
            ? {maximumFractionDigits: 0} : {maximumSignificantDigits: 3})
            + ' ' + suffix + (binary ? 'i' : '');
    }
    return Math.round(input).toLocaleString() + ' ';
}

export function duration(input, precision = 's') {
    const units = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]];
    const end = units.findIndex(([unit]) => unit === precision);
    if (end < 0) throw new RangeError('Duration precision must be d, h, m or s');
    let remaining = Math.abs(parseInt(input, 10)) || 0;
    const parts = [];
    for (const [unit, seconds] of units.slice(0, end + 1)) {
        const value = Math.floor(remaining / seconds);
        if (value || (unit === precision && remaining > 0)) parts.push(value + unit);
        remaining %= seconds;
    }
    return parts.join(' ') || '0' + precision;
}

export function timestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
