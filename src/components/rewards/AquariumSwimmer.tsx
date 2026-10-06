'use client';
import React, { useEffect, useId, useRef } from 'react';
import type { FishId } from '../../types/fishing';
import { fishById } from '../../services/rewards/fishCatalog';
import { ArticulatedFish } from './ArticulatedFish';
import { advanceSwimmer, clampFish, type SwimBounds, type SwimMotion, type SwimPosition } from './swimMotion';
import styles from './AquaticView.module.css';

export interface SavedFishPosition { x: number; y: number }

export function AquariumSwimmer({ id, initial, saved, name, plate, motion, quick, scene, onSelect, onMove }: {
  id: FishId;
  initial: SavedFishPosition;
  saved?: SavedFishPosition;
  name: string;
  plate: React.ReactNode;
  motion: boolean;
  quick: boolean;
  scene: React.RefObject<HTMLDivElement | null>;
  onSelect?: (id: FishId) => void;
  onMove?: (id: FishId, position: SavedFishPosition) => void;
}) {
  const button = useRef<HTMLButtonElement>(null), art = useRef<HTMLSpanElement>(null);
  const state = useRef<SwimMotion | null>(null), bounds = useRef<SwimBounds | null>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null);
  const keyboardMoved = useRef(false), suppressClick = useRef(false);
  const hintId = useId();
  const anchor = saved || initial;
  const paint = () => {
    const node = button.current, sprite = art.current, fish = state.current, area = bounds.current;
    if (!node || !sprite || !fish || !area) return;
    node.style.transform = `translate3d(${Math.round(fish.x - area.fishWidth / 2)}px, ${Math.round(fish.y - area.fishHeight / 2)}px, 0)`;
    sprite.style.transform = `scaleX(${fish.direction})`;
  };
  const store = () => {
    const fish = state.current, area = bounds.current;
    if (fish && area?.width && area.height) onMove?.(id, { x: Math.round(fish.x / area.width * 100), y: Math.round(fish.y / area.height * 100) });
  };
  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    let frame = 0, previous = 0;
    const readBounds = (): SwimBounds | null => {
      if (!scene.current || !button.current) return null;
      return { width: scene.current.clientWidth, height: scene.current.clientHeight, fishWidth: button.current.offsetWidth, fishHeight: button.current.offsetHeight };
    };
    const measure = () => {
      const area = readBounds();
      if (!area?.width || !area.height) return;
      const prior = bounds.current;
      if (state.current && prior?.width && prior.height) {
        const next = clampFish({ x: state.current.x / prior.width * area.width, y: state.current.y / prior.height * area.height }, area);
        state.current = { ...state.current, ...next };
      } else {
        const next = clampFish({ x: anchor.x / 100 * area.width, y: anchor.y / 100 * area.height }, area);
        const direction = Math.random() < .5 ? -1 : 1;
        state.current = { ...next, direction, velocityX: direction * (quick ? 52 : 40), velocityY: 0, driftY: 0, speed: quick ? 55 : 45, nextTurn: 2 + Math.random() * 3 };
      }
      bounds.current = area;
      paint();
    };
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const tick = (time: number) => {
      if (previous && state.current && bounds.current && !drag.current) {
        state.current = advanceSwimmer(state.current, bounds.current, (time - previous) / 1000, Math.random, quick ? 1.22 : 1);
        paint();
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (art.current) art.current.dataset.hidden = String(document.hidden);
      if (motion && !document.hidden && !reduced?.matches) frame = requestAnimationFrame(tick);
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(node);
    if (!resize) window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', schedule);
    reduced?.addEventListener?.('change', schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); resize?.disconnect(); if (!resize) window.removeEventListener('resize', measure); document.removeEventListener('visibilitychange', schedule); reduced?.removeEventListener?.('change', schedule); };
  }, [id, anchor.x, anchor.y, motion, quick, scene]);
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!onMove || (event.pointerType === 'mouse' && event.button !== 0) || !state.current) return;
    suppressClick.current = false;
    const fish = state.current;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, originX: fish.x, originY: fish.y, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic test pointers may not be capturable. */ }
  };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = drag.current, area = bounds.current;
    if (!active || active.pointer !== event.pointerId || !area || !state.current) return;
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    if (!active.moved && Math.hypot(dx, dy) <= 4) return;
    active.moved = true;
    const next = clampFish({ x: active.originX + dx, y: active.originY + dy }, area);
    state.current = { ...state.current, ...next, velocityX: 0, velocityY: 0, nextTurn: 2.5 };
    event.preventDefault(); paint();
  };
  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    drag.current = null;
    if (active.moved) { suppressClick.current = true; store(); }
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Pointer capture may already be released. */ }
  };
  const nudge = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, SwimPosition> = { ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 }, ArrowUp: { x: 0, y: -8 }, ArrowDown: { x: 0, y: 8 } };
    const step = keys[event.key], area = bounds.current, fish = state.current;
    if (!step || !onMove || !area || !fish) return;
    event.preventDefault();
    const next = clampFish({ x: fish.x + step.x, y: fish.y + step.y }, area);
    state.current = { ...fish, ...next, velocityX: 0, velocityY: 0, nextTurn: 2.5 };
    keyboardMoved.current = true; paint();
  };
  return <button ref={button} type="button" aria-label={onSelect ? `Selecionar ${name}` : `Mover ${name}`} aria-describedby={onMove ? hintId : undefined} tabIndex={onSelect || onMove ? undefined : -1} aria-hidden={!onSelect && !onMove || undefined} className={styles.sceneFish} style={{ width: `${fishById(id).size}px`, pointerEvents: onSelect || onMove ? undefined : 'none' }} onClick={(event) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; } onSelect?.(id); }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={nudge} onKeyUp={(event) => { if (event.key.startsWith('Arrow') && keyboardMoved.current) { keyboardMoved.current = false; store(); } }} onBlur={() => { if (keyboardMoved.current) { keyboardMoved.current = false; store(); } }}>
    <span className={styles.swimmerArt} ref={art} data-motion={motion ? 'on' : 'off'}><ArticulatedFish id={id} /></span>{plate}<span className={styles.swimmerHint} id={hintId}>Arraste para mover ou use as setas do teclado.</span>
  </button>;
}
