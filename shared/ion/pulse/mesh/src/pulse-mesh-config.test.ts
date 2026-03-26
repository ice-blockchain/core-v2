import { describe, it, expect } from 'vitest';
import {
  buildServerConfig,
  buildBrowserConfig,
  buildReactNativeConfig,
  buildPulseMeshConfig,
} from './pulse-mesh-config.js';
import type { PulseMeshConfig } from './types.js';

function createConfig(overrides: Partial<PulseMeshConfig> = {}): PulseMeshConfig {
  return { platform: 'server', ...overrides };
}

describe('pulse-mesh-config', () => {
  describe('buildServerConfig', () => {
    it('includes three transports for server platform', () => {
      const result = buildServerConfig(createConfig());
      expect(result.transports).toHaveLength(3);
    });

    it('sets default listen addresses', () => {
      const result = buildServerConfig(createConfig());
      expect(result.addresses.listen).toEqual([
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/0.0.0.0/tcp/0/ws',
      ]);
    });

    it('uses custom listen addresses when provided', () => {
      const addresses = ['/ip4/127.0.0.1/tcp/4001'];
      const result = buildServerConfig(createConfig({ listenAddresses: addresses }));
      expect(result.addresses.listen).toEqual(addresses);
    });

    it('defaults maxConnections to 100', () => {
      const result = buildServerConfig(createConfig());
      expect(result.connectionManager.maxConnections).toBe(100);
    });

    it('includes relay service', () => {
      const result = buildServerConfig(createConfig());
      expect(result.services.relay).toBeDefined();
    });

    it('respects custom maxConnections', () => {
      const result = buildServerConfig(createConfig({ maxConnections: 50 }));
      expect(result.connectionManager.maxConnections).toBe(50);
    });
  });

  describe('buildBrowserConfig', () => {
    it('includes two transports without tcp', () => {
      const result = buildBrowserConfig(createConfig({ platform: 'browser' }));
      expect(result.transports).toHaveLength(2);
    });

    it('defaults maxConnections to 20', () => {
      const result = buildBrowserConfig(createConfig({ platform: 'browser' }));
      expect(result.connectionManager.maxConnections).toBe(20);
    });

    it('does not include relay service', () => {
      const result = buildBrowserConfig(createConfig({ platform: 'browser' }));
      expect(result.services).not.toHaveProperty('relay');
    });
  });

  describe('buildReactNativeConfig', () => {
    it('includes two transports without tcp', () => {
      const result = buildReactNativeConfig(createConfig({ platform: 'react-native' }));
      expect(result.transports).toHaveLength(2);
    });

    it('defaults maxConnections to 10', () => {
      const result = buildReactNativeConfig(createConfig({ platform: 'react-native' }));
      expect(result.connectionManager.maxConnections).toBe(10);
    });

    it('does not include relay service', () => {
      const result = buildReactNativeConfig(createConfig({ platform: 'react-native' }));
      expect(result.services).not.toHaveProperty('relay');
    });
  });

  describe('buildPulseMeshConfig', () => {
    it('dispatches to server config builder', () => {
      const result = buildPulseMeshConfig(createConfig({ platform: 'server' }));
      expect(result.transports).toHaveLength(3);
      expect(result.services).toHaveProperty('relay');
    });

    it('dispatches to browser config builder', () => {
      const result = buildPulseMeshConfig(createConfig({ platform: 'browser' }));
      expect(result.transports).toHaveLength(2);
      expect(result.connectionManager.maxConnections).toBe(20);
    });

    it('dispatches to react-native config builder', () => {
      const result = buildPulseMeshConfig(createConfig({ platform: 'react-native' }));
      expect(result.transports).toHaveLength(2);
      expect(result.connectionManager.maxConnections).toBe(10);
    });
  });
});
