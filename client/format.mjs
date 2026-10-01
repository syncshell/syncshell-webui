// Copyright (C) 2014 The Syncthing Authors.
// SPDX-License-Identifier: MPL-2.0

const compactUnits = [
  { threshold: 1e9, suffix: 'B' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'k' },
];

const durationUnits = [
  { label: 'd', seconds: 86400 },
  { label: 'h', seconds: 3600 },
  { label: 'm', seconds: 60 },
  { label: 's', seconds: 1 },
];

export function compactNumber(input) {
  if (!Number.isFinite(input) || input < 0) {
    return '-';
  }
  for (const { threshold, suffix } of compactUnits) {
    if (input >= threshold) {
      const value = Math.floor(input / (threshold / 10)) / 10;
      return value.toFixed(1) + suffix;
    }
  }
  return input.toLocaleString();
}

export function unitPrefixed(input, binary) {
  // Preserve Syncthing's coercion and strict unit boundaries for existing data.
  const numericInput = Number(input);
  if (Number.isNaN(numericInput)) return '0 ';
  const factor = binary ? 1024 : 1000;
  for (const { power, suffix } of [
    { power: 4, suffix: 'T' },
    { power: 3, suffix: 'G' },
    { power: 2, suffix: 'M' },
    { power: 1, suffix: binary ? 'K' : 'k' },
  ]) {
    if (numericInput <= factor ** power) continue;
    const value = numericInput / factor ** power;
    const whole = power === 4 ? value > 1000 : binary && value >= 1000;
    return (
      value.toLocaleString(
        undefined,
        whole ? { maximumFractionDigits: 0 } : { maximumSignificantDigits: 3 },
      ) +
      ' ' +
      suffix +
      (binary ? 'i' : '')
    );
  }
  return Math.round(numericInput).toLocaleString() + ' ';
}

export function duration(input, precision = 's') {
  const end = durationUnits.findIndex(({ label }) => label === precision);
  if (end < 0) throw new RangeError('Duration precision must be d, h, m or s');
  let remaining = Math.abs(Number.parseInt(input, 10)) || 0;
  const parts = [];
  for (const { label, seconds } of durationUnits.slice(0, end + 1)) {
    const value = Math.floor(remaining / seconds);
    if (value || (label === precision && remaining > 0))
      parts.push(value + label);
    remaining %= seconds;
  }
  return parts.join(' ') || '0' + precision;
}

export function timestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
