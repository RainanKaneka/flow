export interface SwimPosition { x: number; y: number }
export interface SwimBounds { width: number; height: number; fishWidth: number; fishHeight: number }
export interface SwimMotion extends SwimPosition { direction: -1 | 1; velocityX: number; velocityY: number; driftY: number; speed: number; nextTurn: number }

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function clampFish(position: SwimPosition, bounds: SwimBounds): SwimPosition {
  const halfWidth = bounds.fishWidth / 2, halfHeight = bounds.fishHeight / 2;
  return {
    x: clamp(position.x, halfWidth, Math.max(halfWidth, bounds.width - halfWidth)),
    y: clamp(position.y, halfHeight, Math.max(halfHeight, bounds.height - halfHeight)),
  };
}

export function advanceSwimmer(fish: SwimMotion, bounds: SwimBounds, seconds: number, random: () => number = Math.random, speedFactor = 1): SwimMotion {
  const delta = clamp(seconds, 0, .05);
  if (!delta) return fish;
  let { direction, velocityX, velocityY, driftY, speed, nextTurn } = fish;
  nextTurn -= delta;
  if (nextTurn <= 0) {
    nextTurn = 2.8 + random() * 4.5;
    if (random() < .22) direction = direction === 1 ? -1 : 1;
    driftY = (random() - .5) * 32;
    speed = (38 + random() * 18) * speedFactor;
  }
  const steer = (current: number, target: number, limit: number) => current + clamp(target - current, -limit, limit);
  velocityX = steer(velocityX, direction * speed, 175 * delta);
  velocityY = steer(velocityY, driftY, 65 * delta);
  const wanted = { x: fish.x + velocityX * delta, y: fish.y + velocityY * delta };
  const next = clampFish(wanted, bounds);
  if (next.x !== wanted.x) {
    direction = direction === 1 ? -1 : 1;
    velocityX = direction * speed * .7;
    nextTurn = Math.max(nextTurn, 1.5);
  }
  if (next.y !== wanted.y) { velocityY = -velocityY; driftY = -driftY; }
  return { ...next, direction, velocityX, velocityY, driftY, speed, nextTurn };
}
