import crypto from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateRoomId(length: number = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}

export function generateClientId(): string {
  return crypto.randomUUID();
}

export function generateMessageId(): string {
  return crypto.randomUUID();
}
