import { describe, expect, it } from 'bun:test';
import { formatKilometers, parseKilometers } from './numberFormat';

describe('kilometre number formatting', () => {
  it('formats thousands with the Spanish separator', () => {
    expect(formatKilometers(124500)).toBe('124.500');
  });

  it('parses formatted and unformatted input as an integer', () => {
    expect(parseKilometers('124.500')).toBe(124500);
    expect(parseKilometers('124500')).toBe(124500);
  });

  it('allows an empty field', () => {
    expect(parseKilometers('')).toBe('');
    expect(formatKilometers('')).toBe('');
  });
});
