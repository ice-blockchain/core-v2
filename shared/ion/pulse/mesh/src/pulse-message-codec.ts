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
  const encoder = new TextEncoder();
  const fromBytes = encoder.encode(message.from ?? '');
  const topicBytes = encoder.encode(message.topic);
  const fromLength = fromBytes.length;
  const topicLength = topicBytes.length;
  const buffer = new Uint8Array(1 + 1 + fromLength + 2 + topicLength + message.data.length);

  buffer[0] = MESSAGE_TYPE_TO_BYTE[message.type];
  buffer[1] = fromLength;
  buffer.set(fromBytes, 2);
  const offset = 2 + fromLength;
  buffer[offset] = (topicLength >> 8) & 0xff;
  buffer[offset + 1] = topicLength & 0xff;
  buffer.set(topicBytes, offset + 2);
  buffer.set(message.data, offset + 2 + topicLength);

  return buffer;
}

export function decodePulseMessage(bytes: Uint8Array): PulseMessage {
  if (bytes.length < 4) {
    throw new Error('Invalid message: too short to contain header');
  }
  const typeByte = bytes[0]!;
  const messageType = BYTE_TO_MESSAGE_TYPE[typeByte];
  if (messageType === undefined) {
    throw new Error(`Invalid message type byte: ${typeByte}`);
  }

  const fromLength = bytes[1]!;
  const fromEnd = 2 + fromLength;
  const from = fromLength > 0
    ? new TextDecoder().decode(bytes.slice(2, fromEnd))
    : undefined;
  const topicLength = (bytes[fromEnd]! << 8) | bytes[fromEnd + 1]!;
  const topicStart = fromEnd + 2;
  const topicEnd = topicStart + topicLength;

  if (bytes.length < topicEnd) {
    throw new Error('Invalid message: truncated topic');
  }
  const topic = new TextDecoder().decode(bytes.slice(topicStart, topicEnd));
  const data = bytes.slice(topicEnd);

  return { type: messageType, topic, data, ...(from ? { from } : {}) };
}
