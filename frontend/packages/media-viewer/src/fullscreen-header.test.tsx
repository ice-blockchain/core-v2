import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FullscreenHeader } from './fullscreen-header';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@ion/ui', () => {
  const { Text } = require('react-native');
  return { Text };
});

describe('FullscreenHeader', () => {
  it('displays page indicator with correct index', () => {
    const { getByText } = render(
      <FullscreenHeader currentIndex={2} totalCount={10} onClose={jest.fn()} />,
    );
    expect(getByText('3 / 10')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FullscreenHeader currentIndex={0} totalCount={5} onClose={onClose} />,
    );
    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
