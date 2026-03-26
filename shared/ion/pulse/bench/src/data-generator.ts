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

function generateRandomHex(length: number): string {
  const characters = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return result;
}

function generateRandomId(): string {
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join('-');
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
