import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@ion/ui';

interface FullscreenHeaderProps {
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
}

export function FullscreenHeader(props: FullscreenHeaderProps) {
  const { currentIndex, totalCount, onClose } = props;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onClose} style={styles.closeButton} hitSlop={16}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
      <Text style={styles.indicator}>
        {currentIndex + 1} / {totalCount}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  closeButton: {
    minWidth: 60,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  indicator: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    minWidth: 60,
  },
});
