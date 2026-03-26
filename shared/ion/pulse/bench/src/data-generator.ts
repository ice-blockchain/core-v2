interface TestUser {
  readonly userId: string;
  readonly publicKey: string;
  readonly secretKey: string;
}

interface TestPost {
  readonly soul: string;
  readonly userId: string;
  readonly content: string;
  readonly timestamp: number;
  readonly eventType: string;
}

interface TestMessageOptions {
  readonly fromUserId: string;
  readonly toUserId: string;
}

interface TestMessage {
  readonly soul: string;
  readonly fromUserId: string;
  readonly toUserId: string;
  readonly content: string;
  readonly timestamp: number;
  readonly eventType: string;
}

interface GenerateEventsOptions {
  readonly userId: string;
  readonly count: number;
}

interface TestEvent {
  readonly soul: string;
  readonly userId: string;
  readonly eventType: string;
  readonly timestamp: number;
}

import { randomBytes } from 'node:crypto';

function generateRandomHex(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

function generateRandomId(): string {
  const timestamp = Date.now().toString(36);
  const entropy = randomBytes(6).toString('hex');
  return `${timestamp}-${entropy}`;
}

const EVENT_TYPES = [
  'post',
  'like',
  'repost',
  'follow',
  'message',
  'tip',
];

export function generatePulseTestUser(): TestUser {
  return {
    userId: generateRandomId(),
    publicKey: generateRandomHex(64),
    secretKey: generateRandomHex(128),
  };
}

export function generatePulseTestPost(
  userId: string,
): TestPost {
  return {
    soul: `post-${generateRandomId()}`,
    userId,
    content: `Test post content ${generateRandomId()}`,
    timestamp: Date.now(),
    eventType: 'post',
  };
}

export function generatePulseTestMessage(
  options: TestMessageOptions,
): TestMessage {
  return {
    soul: `msg-${generateRandomId()}`,
    fromUserId: options.fromUserId,
    toUserId: options.toUserId,
    content: `Test message ${generateRandomId()}`,
    timestamp: Date.now(),
    eventType: 'message',
  };
}

export function generatePulseTestEvents(
  options: GenerateEventsOptions,
): TestEvent[] {
  return Array.from({ length: options.count }, (_, index) => ({
    soul: `evt-${generateRandomId()}-${index}`,
    userId: options.userId,
    eventType: EVENT_TYPES[index % EVENT_TYPES.length],
    timestamp: Date.now() + index,
  }));
}
