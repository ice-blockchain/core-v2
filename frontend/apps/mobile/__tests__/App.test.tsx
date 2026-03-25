import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@ion/ui', () => {
  const mockReact = require('react');
  return {
    CatalogScreen: () => mockReact.createElement('CatalogScreen'),
  };
});

test('renders without crashing', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
