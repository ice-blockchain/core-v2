import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseGraph } from '../../../graph/src/index';
import type { PulseGraph } from '../../../graph/src/index';
import { encodePulseState, applyPulseUpdate } from '../../../sync/src/index';

function syncAllGraphs(graphs: PulseGraph[]): void {
  for (const source of graphs) {
    const update = encodePulseState(source.document);
    for (const target of graphs) {
      if (target === source) continue;
      applyPulseUpdate(target.document, update);
    }
  }
}

function readPropertyValue(graph: PulseGraph, soul: string, property: string): unknown {
  const node = graph.get(soul);
  if (!node) return undefined;
  return node.properties[property];
}

describe('crdt-convergence', () => {
  let graphAlpha: PulseGraph;
  let graphBeta: PulseGraph;
  let graphGamma: PulseGraph;

  beforeEach(() => {
    graphAlpha = createPulseGraph();
    graphBeta = createPulseGraph();
    graphGamma = createPulseGraph();
  });

  it('converges three graphs to the same value after concurrent writes', () => {
    graphAlpha.put('config/theme', { color: 'red' });
    graphBeta.put('config/theme', { color: 'blue' });
    graphGamma.put('config/theme', { color: 'green' });

    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    const valueAlpha = readPropertyValue(graphAlpha, 'config/theme', 'color');
    const valueBeta = readPropertyValue(graphBeta, 'config/theme', 'color');
    const valueGamma = readPropertyValue(graphGamma, 'config/theme', 'color');

    expect(valueAlpha).toBe(valueBeta);
    expect(valueBeta).toBe(valueGamma);
  });

  it('resolves per-property independently', () => {
    graphAlpha.put('profile/alice', { name: 'Alice-A', status: 'online' });
    graphBeta.put('profile/alice', { name: 'Alice-B', bio: 'Hello' });
    graphGamma.put('profile/alice', { name: 'Alice-G', avatar: 'pic.png' });

    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    const nodeAlpha = graphAlpha.get('profile/alice');
    const nodeBeta = graphBeta.get('profile/alice');
    const nodeGamma = graphGamma.get('profile/alice');

    expect(nodeAlpha?.properties.name).toBe(nodeBeta?.properties.name);
    expect(nodeBeta?.properties.name).toBe(nodeGamma?.properties.name);
  });

  it('converges non-conflicting writes on different souls', () => {
    graphAlpha.put('settings/language', { value: 'en' });
    graphBeta.put('settings/timezone', { value: 'UTC' });
    graphGamma.put('settings/currency', { value: 'USD' });

    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    for (const graph of [graphAlpha, graphBeta, graphGamma]) {
      expect(graph.get('settings/language')?.properties.value).toBe('en');
      expect(graph.get('settings/timezone')?.properties.value).toBe('UTC');
      expect(graph.get('settings/currency')?.properties.value).toBe('USD');
    }
  });

  it('converges numeric values across all replicas', () => {
    graphAlpha.put('counter/views', { count: 10 });
    graphBeta.put('counter/views', { count: 20 });
    graphGamma.put('counter/views', { count: 30 });

    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    const countAlpha = readPropertyValue(graphAlpha, 'counter/views', 'count');
    const countBeta = readPropertyValue(graphBeta, 'counter/views', 'count');
    const countGamma = readPropertyValue(graphGamma, 'counter/views', 'count');

    expect(countAlpha).toBe(countBeta);
    expect(countBeta).toBe(countGamma);
    expect(typeof countAlpha).toBe('number');
  });

  it('converges boolean values across all replicas', () => {
    graphAlpha.put('flags/feature', { isEnabled: true });
    graphBeta.put('flags/feature', { isEnabled: false });
    graphGamma.put('flags/feature', { isEnabled: true });

    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    const flagAlpha = readPropertyValue(graphAlpha, 'flags/feature', 'isEnabled');
    const flagBeta = readPropertyValue(graphBeta, 'flags/feature', 'isEnabled');
    const flagGamma = readPropertyValue(graphGamma, 'flags/feature', 'isEnabled');

    expect(flagAlpha).toBe(flagBeta);
    expect(flagBeta).toBe(flagGamma);
  });

  it('handles multiple souls with concurrent writes consistently', () => {
    const souls = ['item/1', 'item/2', 'item/3'];
    const graphs = [graphAlpha, graphBeta, graphGamma];

    for (const soul of souls) {
      for (let i = 0; i < graphs.length; i++) {
        graphs[i].put(soul, { value: `graph-${i}` });
      }
    }

    syncAllGraphs(graphs);

    for (const soul of souls) {
      const values = graphs.map((graph) => readPropertyValue(graph, soul, 'value'));
      expect(values[0]).toBe(values[1]);
      expect(values[1]).toBe(values[2]);
    }
  });

  it('converges sequential writes on different souls across rounds', () => {
    graphAlpha.put('doc/round-1', { title: 'Draft' });
    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    graphBeta.put('doc/round-2', { title: 'Review' });
    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    graphGamma.put('doc/round-3', { title: 'Final' });
    syncAllGraphs([graphAlpha, graphBeta, graphGamma]);

    const graphs = [graphAlpha, graphBeta, graphGamma];
    for (const graph of graphs) {
      expect(graph.get('doc/round-1')?.properties.title).toBe('Draft');
      expect(graph.get('doc/round-2')?.properties.title).toBe('Review');
      expect(graph.get('doc/round-3')?.properties.title).toBe('Final');
    }
  });
});
