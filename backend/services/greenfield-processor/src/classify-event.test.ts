import { describe, it, expect } from 'vitest';
import classifyContentType from './classify-event.js';

describe('classifyContentType', () => {
  it('classifies image/* as upload', () => {
    expect(classifyContentType('image/png')).toBe('upload');
    expect(classifyContentType('image/jpeg')).toBe('upload');
    expect(classifyContentType('image/webp')).toBe('upload');
  });

  it('classifies video/* as upload', () => {
    expect(classifyContentType('video/mp4')).toBe('upload');
    expect(classifyContentType('video/webm')).toBe('upload');
  });

  it('classifies audio/* as upload', () => {
    expect(classifyContentType('audio/mpeg')).toBe('upload');
  });

  it('classifies application/x-brotli as upload', () => {
    expect(classifyContentType('application/x-brotli')).toBe('upload');
  });

  it('classifies application/octet-stream as skip', () => {
    expect(classifyContentType('application/octet-stream')).toBe('skip');
  });

  it('classifies unknown types as skip', () => {
    expect(classifyContentType('text/plain')).toBe('skip');
    expect(classifyContentType('application/json')).toBe('skip');
  });

  it('classifies empty string as skip', () => {
    expect(classifyContentType('')).toBe('skip');
  });

  it('blocks image/svg+xml despite image/ prefix', () => {
    expect(classifyContentType('image/svg+xml')).toBe('skip');
  });

  it('blocks SVG case-insensitively', () => {
    expect(classifyContentType('Image/SVG+XML')).toBe('skip');
    expect(classifyContentType('IMAGE/SVG+XML')).toBe('skip');
  });

  it('blocks SVG with MIME parameters', () => {
    expect(classifyContentType('image/svg+xml; charset=utf-8')).toBe('skip');
    expect(classifyContentType('image/svg+xml;boundary=something')).toBe('skip');
    expect(classifyContentType('IMAGE/SVG+XML; Charset=UTF-8')).toBe('skip');
  });

  it('handles case-insensitive content types', () => {
    expect(classifyContentType('Image/PNG')).toBe('upload');
    expect(classifyContentType('VIDEO/MP4')).toBe('upload');
  });
});
