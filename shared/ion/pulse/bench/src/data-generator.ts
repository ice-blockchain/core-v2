import { randomBytes } from 'node:crypto';
import type { EventType, GeneratedEvent, GeneratorConfig } from './types.js';

const ALL_EVENT_TYPES: EventType[] = ['post', 'message', 'follow', 'reaction', 'media'];
const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉'];

export function generatePulseEvents(config: GeneratorConfig): GeneratedEvent[] {
  const types = config.eventTypes ?? ALL_EVENT_TYPES;
  const baseTimestamp = config.startTimestamp ?? Date.now();
  const events: GeneratedEvent[] = [];
  let currentTimestamp = baseTimestamp;

  for (let index = 0; index < config.eventCount; index++) {
    const type = pickRandom(types);
    const id = generateHexId();
    currentTimestamp += randomBetween(1, 10000);

    events.push({
      id,
      type,
      soul: `${type}/${config.userId}/${id}`,
      userId: config.userId,
      timestamp: currentTimestamp,
      data: buildEventData({ type, index, userId: config.userId, id }),
    });
  }

  return events;
}

export function generateRandomUserId(): string {
  return `user-${generateHexId()}`;
}

interface EventDataInput {
  type: EventType;
  index: number;
  userId: string;
  id: string;
}

function buildEventData(input: EventDataInput): Record<string, unknown> {
  switch (input.type) {
    case 'post':
      return buildPostData(input.index, input.userId);
    case 'message':
      return buildMessageData(input.index);
    case 'follow':
      return buildFollowData();
    case 'reaction':
      return buildReactionData(input.id);
    case 'media':
      return buildMediaData(input.id);
  }
}

function buildPostData(index: number, userId: string): Record<string, unknown> {
  return { content: `Post ${index} by ${userId}`, likes: randomBetween(0, 100) };
}

function buildMessageData(index: number): Record<string, unknown> {
  return { content: `Message ${index}`, recipientId: generateRandomUserId() };
}

function buildFollowData(): Record<string, unknown> {
  return { targetUserId: generateRandomUserId() };
}

function buildReactionData(id: string): Record<string, unknown> {
  const targetUser = generateRandomUserId();
  return {
    targetSoul: `post/${targetUser}/${id}`,
    emoji: pickRandom(REACTION_EMOJIS),
  };
}

function buildMediaData(id: string): Record<string, unknown> {
  return {
    url: `https://media.example.com/${id}.jpg`,
    contentType: 'image/jpeg',
  };
}

function generateHexId(): string {
  return randomBytes(4).toString('hex');
}

function randomBetween(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return min + (value % range);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[randomBetween(0, items.length - 1)]!;
}
