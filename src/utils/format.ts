/**
 * Formatting utilities for CountSeal
 * All price values are integers in minor units (e.g. 125 = 1.25)
 */

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value / 100);
}

export function shortenAddress(s: string): string {
  if (s.length <= 16) return s;
  return s.slice(0, 8) + '…' + s.slice(-6);
}

export function formatTimestamp(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatISODate(iso: string): string {
  return new Date(iso).toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function humanState(state: string): string {
  return state.replaceAll('_', ' ');
}

export function classNames(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}
