import { describe, expect, it } from 'vitest';
import { advanceSwimmer, clampFish, type SwimBounds, type SwimMotion } from '../swimMotion';

const bounds: SwimBounds = { width: 600, height: 360, fishWidth: 120, fishHeight: 96 };
const fish: SwimMotion = { x: 300, y: 180, direction: 1, velocityX: 48, velocityY: 0, driftY: 0, speed: 48, nextTurn: 3 };

describe('aquarium swimming', () => {
  it('moves continuously, with per-frame travel bounded even after a suspended frame', () => {
    const next = advanceSwimmer(fish, bounds, .016);
    expect(next.x).toBeGreaterThan(fish.x);
    expect(next.x - fish.x).toBeLessThan(2);
    expect(advanceSwimmer(fish, bounds, 5).x - fish.x).toBeLessThan(4);
  });
  it('turns inward at the glass without leaving the scene', () => {
    const next = advanceSwimmer({ ...fish, x: 540, velocityX: 50 }, bounds, .05);
    expect(next.x).toBe(540);
    expect(next.direction).toBe(-1);
    expect(advanceSwimmer(next, bounds, .05).x).toBeLessThan(540);
  });
  it('varies course while keeping the entire fish inside its bounds', () => {
    const changed = advanceSwimmer({ ...fish, nextTurn: 0 }, bounds, .016, () => 0);
    expect(changed.direction).toBe(-1);
    expect(changed.driftY).toBeLessThan(0);
    expect(clampFish({ x: -200, y: 900 }, bounds)).toEqual({ x: 60, y: 312 });
  });
});
