'use client';
import React, { useId } from 'react';
import type { FishId } from '../../types/fishing';
import { fishSprite } from '../../services/rewards/fishCatalog';
import { FishSprite } from './FishSprite';
import styles from './AquaticView.module.css';

interface FinTop { x: number; y: number; width: number; root: number }
interface FinBottom { x: number; root: number; width: number; end: number }
interface FishMotionShape {
  tail: { bodyStart: number; clipEnd: number; hinge: number };
  dorsal: FinTop;
  ventral: FinBottom;
  eye: { x: number; y: number; width: number; height: number; lid: string; line: string };
  phase: number;
}

// Coordenadas no sprite original de 96×96. As bases das nadadeiras ficam sob o corpo;
// apenas as pontas recortadas se flexionam, sem criar uma abertura azul na junção.
export const FISH_MOTION_SHAPES: Record<FishId, FishMotionShape> = {
  goldfish: { tail: { bodyStart: 36, clipEnd: 46, hinge: 42 }, dorsal: { x: 40, y: 15, width: 28, root: 33 }, ventral: { x: 44, root: 76, width: 25, end: 84 }, eye: { x: 77, y: 44, width: 8, height: 10, lid: '#fccf51', line: '#8f370b' }, phase: -0.4 },
  koi: { tail: { bodyStart: 33, clipEnd: 43, hinge: 39 }, dorsal: { x: 42, y: 17, width: 29, root: 34 }, ventral: { x: 42, root: 73, width: 28, end: 81 }, eye: { x: 79, y: 47, width: 7, height: 9, lid: '#fceece', line: '#713d26' }, phase: -2.1 },
  neon: { tail: { bodyStart: 42, clipEnd: 52, hinge: 48 }, dorsal: { x: 43, y: 23, width: 29, root: 39 }, ventral: { x: 43, root: 63, width: 29, end: 71 }, eye: { x: 78, y: 46, width: 8, height: 9, lid: '#f8eccf', line: '#465168' }, phase: -5.7 },
  clownfish: { tail: { bodyStart: 36, clipEnd: 46, hinge: 42 }, dorsal: { x: 39, y: 23, width: 35, root: 38 }, ventral: { x: 40, root: 69, width: 35, end: 79 }, eye: { x: 75, y: 44, width: 9, height: 10, lid: '#fc9117', line: '#672507' }, phase: -3.5 },
  catfish: { tail: { bodyStart: 36, clipEnd: 46, hinge: 42 }, dorsal: { x: 40, y: 23, width: 29, root: 41 }, ventral: { x: 42, root: 69, width: 30, end: 79 }, eye: { x: 73, y: 45, width: 8, height: 10, lid: '#fbc165', line: '#684021' }, phase: -7.2 },
  guppy: { tail: { bodyStart: 49, clipEnd: 58, hinge: 53 }, dorsal: { x: 48, y: 28, width: 27, root: 43 }, ventral: { x: 46, root: 65, width: 28, end: 77 }, eye: { x: 79, y: 46, width: 8, height: 9, lid: '#eeebd0', line: '#4a4969' }, phase: -1.2 },
  angelfish: { tail: { bodyStart: 35, clipEnd: 45, hinge: 41 }, dorsal: { x: 31, y: 6, width: 34, root: 40 }, ventral: { x: 35, root: 71, width: 40, end: 92 }, eye: { x: 72, y: 41, width: 9, height: 10, lid: '#fccd71', line: '#54351a' }, phase: -6.3 },
  pufferfish: { tail: { bodyStart: 29, clipEnd: 40, hinge: 35 }, dorsal: { x: 44, y: 15, width: 31, root: 40 }, ventral: { x: 43, root: 68, width: 33, end: 82 }, eye: { x: 74, y: 39, width: 11, height: 11, lid: '#fcdf6c', line: '#705115' }, phase: -4.4 },
  betta: { tail: { bodyStart: 45, clipEnd: 55, hinge: 51 }, dorsal: { x: 34, y: 14, width: 39, root: 39 }, ventral: { x: 34, root: 67, width: 41, end: 87 }, eye: { x: 79, y: 46, width: 9, height: 10, lid: '#9ef9e1', line: '#124857' }, phase: -8.1 },
  mandarin: { tail: { bodyStart: 34, clipEnd: 45, hinge: 40 }, dorsal: { x: 41, y: 20, width: 34, root: 40 }, ventral: { x: 38, root: 67, width: 36, end: 78 }, eye: { x: 76, y: 45, width: 9, height: 10, lid: '#fb9903', line: '#62402a' }, phase: -2.8 },
  discus: { tail: { bodyStart: 39, clipEnd: 49, hinge: 44 }, dorsal: { x: 40, y: 7, width: 35, root: 36 }, ventral: { x: 39, root: 72, width: 36, end: 90 }, eye: { x: 74, y: 45, width: 10, height: 10, lid: '#fcc985', line: '#74342a' }, phase: -5.1 },
};

export function ArticulatedFish({ id }: { id: FishId }) {
  const shape = FISH_MOTION_SHAPES[id];
  const prefix = useId().replace(/:/g, '');
  const sprite = fishSprite(id);
  const { tail, dorsal, ventral, eye } = shape;
  const bodyMask = `${prefix}-body`, tailClip = `${prefix}-tail`, dorsalClip = `${prefix}-dorsal`, ventralClip = `${prefix}-ventral`;
  const image = (clipPath: string) => <image href={sprite} x={0} y={0} width={96} height={96} clipPath={`url(#${clipPath})`} imageRendering="pixelated" />;

  return <>
    <span className={styles.fishStatic}><FishSprite id={id} decorative /></span>
    <svg className={styles.animatedFish} viewBox="0 0 96 96" role="presentation" aria-hidden="true" shapeRendering="crispEdges">
      <defs>
        <mask id={bodyMask} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96" style={{ maskType: 'luminance' }}>
          <rect x="0" y="0" width="96" height="96" fill="white" />
          <rect x="0" y="0" width={tail.bodyStart} height="96" fill="black" />
          <rect x={dorsal.x} y="0" width={dorsal.width} height={dorsal.root} fill="black" />
          <rect x={ventral.x} y={ventral.root} width={ventral.width} height={96 - ventral.root} fill="black" />
        </mask>
        <clipPath id={tailClip}><rect x="0" y="0" width={tail.clipEnd} height="96" /></clipPath>
        <clipPath id={dorsalClip}><rect x={dorsal.x} y={dorsal.y} width={dorsal.width} height={dorsal.root - dorsal.y + 3} /></clipPath>
        <clipPath id={ventralClip}><rect x={ventral.x} y={ventral.root - 3} width={ventral.width} height={ventral.end - ventral.root + 3} /></clipPath>
      </defs>
      <g className={styles.tailSegment} style={{ transformOrigin: `${tail.hinge}px 48px`, animationDelay: `${shape.phase}s` }}>{image(tailClip)}</g>
      <g className={styles.dorsalSegment} style={{ transformOrigin: `${dorsal.x + dorsal.width / 2}px ${dorsal.root}px`, animationDelay: `${shape.phase / 2}s` }}>{image(dorsalClip)}</g>
      <g className={styles.ventralSegment} style={{ transformOrigin: `${ventral.x + ventral.width / 2}px ${ventral.root}px`, animationDelay: `${shape.phase / 3}s` }}>{image(ventralClip)}</g>
      <image href={sprite} x="0" y="0" width="96" height="96" mask={`url(#${bodyMask})`} imageRendering="pixelated" />
      <g className={styles.blinkSegment} style={{ animationDelay: `${shape.phase}s` }}>
        <rect x={eye.x} y={eye.y} width={eye.width} height={eye.height} fill={eye.lid} />
        <rect x={eye.x + 1} y={eye.y + Math.floor(eye.height / 2)} width={eye.width - 2} height="2" fill={eye.line} />
      </g>
    </svg>
  </>;
}
