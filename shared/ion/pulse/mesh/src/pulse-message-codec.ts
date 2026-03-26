import type { PulseMessage, PulseMessageType } from './types.js';

const MESSAGE_TYPE_TO_BYTE: Record<PulseMessageType, number> = {
  'sync-step1': 0,
  'sync-step2': 1,
  'awareness': 2,
  'erasure': 3,
};

const BYTE_TO_MESSAGE_TYPE: Record<number, PulseMessageType> = {
  0: 'sync-step1',
  1: 'sync-step2',
  2: 'awareness',
  3: 'erasure',
};

export function encodePulseMessage(message: PulseMessage): Uint8Array {
  const topicBytes = new TextEncoder().encode(message.topic);
  const topicLength = topicBytes.length;
  const buffer = new Uint8Array(1 + 2 + topicLength + message.data.length);

  buffer[0] = MESSAGE_TYPE_TO_BYTE[message.type];
  buffer[1] = (topicLength >> 8) & 0xff;
  buffer[2] = topicLength & 0xff;
  buffer.set(topicBytes, 3);
  buffer.set(message.data, 3 + topicLength);

  return buffer;
}

export function decodePulseMessage(bytes: Uint8Array): PulseMessage {
  if (bytes.length < 3) {
    throw new Error('Invalid message: too short to contain header');
  }

  const typeByte = bytes[0]!;
  const messageType = BYTE_TO_MESSAGE_TYPE[typeByte];

  if (messageType === undefined) {
    throw new Error(`Invalid message type byte: ${typeByte}`);
  }

  const topicLength = (bytes[1]! << 8) | bytes[2]!;
  const topicEnd = 3 + topicLength;

  if (bytes.length < topicEnd) {
    throw new Error('Invalid message: truncated topic');
  }

  const topic = new TextDecoder().decode(bytes.slice(3, topicEnd));
  const data = bytes.slice(topicEnd);

  return { type: messageType, topic, data };
}
