import {describe, it, expect} from 'vitest';
import {fromBlockchainUnits} from './from-blockchain-units';

describe('fromBlockchainUnits', () => {
  describe('18 decimals (ETH)', () => {
    it('converts 1 ETH correctly', () => {
      expect(fromBlockchainUnits('1000000000000000000', 18)).toBe(1.0);
    });

    it('converts 0.5 ETH correctly', () => {
      expect(fromBlockchainUnits('500000000000000000', 18)).toBe(0.5);
    });

    it('converts 1.5 ETH correctly', () => {
      expect(fromBlockchainUnits('1500000000000000000', 18)).toBe(1.5);
    });
  });

  describe('8 decimals (BTC)', () => {
    it('converts 1 BTC correctly', () => {
      expect(fromBlockchainUnits('100000000', 8)).toBe(1.0);
    });

    it('converts 0.5 BTC correctly', () => {
      expect(fromBlockchainUnits('50000000', 8)).toBe(0.5);
    });

    it('converts fractional BTC correctly', () => {
      expect(fromBlockchainUnits('12345678', 8)).toBe(0.12345678);
    });
  });

  describe('6 decimals (USDC)', () => {
    it('converts 1 USDC correctly', () => {
      expect(fromBlockchainUnits('1000000', 6)).toBe(1.0);
    });

    it('converts 0.5 USDC correctly', () => {
      expect(fromBlockchainUnits('500000', 6)).toBe(0.5);
    });

    it('converts fractional USDC correctly', () => {
      expect(fromBlockchainUnits('123456', 6)).toBe(0.123456);
    });
  });

  describe('0 decimals', () => {
    it('converts 1 with 0 decimals', () => {
      expect(fromBlockchainUnits('1', 0)).toBe(1.0);
    });

    it('converts 42 with 0 decimals', () => {
      expect(fromBlockchainUnits('42', 0)).toBe(42.0);
    });

    it('converts 1000 with 0 decimals', () => {
      expect(fromBlockchainUnits('1000', 0)).toBe(1000.0);
    });
  });

  describe('zero values', () => {
    it('returns 0 for zero with 18 decimals', () => {
      expect(fromBlockchainUnits('0', 18)).toBe(0);
    });

    it('returns 0 for zero with 8 decimals', () => {
      expect(fromBlockchainUnits('0', 8)).toBe(0);
    });

    it('returns 0 for zero with 0 decimals', () => {
      expect(fromBlockchainUnits('0', 0)).toBe(0);
    });
  });

  describe('edge cases with small values', () => {
    it('converts 1 wei (18 decimals) to a very small number', () => {
      expect(fromBlockchainUnits('1', 18)).toBe(1e-18);
    });

    it('converts 1 satoshi (8 decimals) correctly', () => {
      expect(fromBlockchainUnits('1', 8)).toBe(0.00000001);
    });
  });

  describe('invalid inputs', () => {
    it('returns 0 for non-numeric string', () => {
      expect(fromBlockchainUnits('invalid', 18)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(fromBlockchainUnits('', 18)).toBe(0);
    });

    it('returns 0 for alphanumeric string', () => {
      expect(fromBlockchainUnits('abc123', 8)).toBe(0);
    });

    it('returns 0 for decimal string', () => {
      expect(fromBlockchainUnits('1.5', 6)).toBe(0);
    });
  });
});
