export function getServerTime(): number {
  return Date.now();
}

export function calculateCurrentPosition(
  offset: number,
  serverTimestamp: number,
  rate: number
): number {
  const elapsed = (getServerTime() - serverTimestamp) / 1000;
  return offset + elapsed * rate;
}
