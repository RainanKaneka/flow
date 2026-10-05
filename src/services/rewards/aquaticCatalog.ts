import type { AquaticItemId, AquaticMilestone, AquaticStyle } from '../../types/aquatic';
import { FISH_IDS, fishById } from './fishCatalog';

export const AQUATIC_ITEMS: { id: AquaticItemId; name: string; price: number; slot: 'decoration' | 'background' | 'frame'; value: string; asset?: string; description: string }[] = [
  { id: 'decor.lantern.v1', name: 'Lanterna de âmbar', price: 40, slot: 'decoration', value: 'lantern', asset: '/rewards/decorations/lantern.png', description: 'Uma pequena luz sobre as pedras.' },
  { id: 'decor.arch.v1', name: 'Arco de musgo', price: 60, slot: 'decoration', value: 'arch', asset: '/rewards/decorations/arch.png', description: 'Um recanto entre pedras antigas.' },
  { id: 'decor.garden.v1', name: 'Jardim de nenúfares', price: 80, slot: 'decoration', value: 'garden', asset: '/rewards/decorations/garden.png', description: 'Folhas e flores para o fundo do aquário.' },
  { id: 'background.dusk.v1', name: 'Águas do entardecer', price: 100, slot: 'background', value: 'dusk', asset: '/rewards/environments/dusk.png', description: 'Luz dourada para suas descobertas.' },
  { id: 'background.moon.v1', name: 'Jardim sob a lua', price: 120, slot: 'background', value: 'moon', asset: '/rewards/environments/moon.png', description: 'Azuis tranquilos e raios de luar.' },
  { id: 'frame.ripple.v1', name: 'Moldura de marés', price: 60, slot: 'frame', value: 'ripple', description: 'Um contorno de água para o aquário e o companheiro.' },
];
export const AQUATIC_ITEM_IDS = AQUATIC_ITEMS.map((item) => item.id);
export const COLLECTION_MILESTONES: AquaticMilestone[] = [
  { id: 'collection_1', kind: 'collection', target: 'collection', threshold: 1, label: 'Primeiro encontro', reward: 'Título: Primeira maré' },
  { id: 'collection_5', kind: 'collection', target: 'collection', threshold: 5, label: 'Novos horizontes', reward: 'Título: Explorador das águas' },
  { id: 'collection_11', kind: 'collection', target: 'collection', threshold: 11, label: 'Todas as águas', reward: 'Título: Guardião do lago + moldura da coleção' },
];
export const AQUATIC_MILESTONES: AquaticMilestone[] = [...COLLECTION_MILESTONES, ...FISH_IDS.flatMap((id) => ([3, 5, 10] as const).map((threshold) => ({
  id: `mastery_${id}_${threshold}` as const, kind: 'mastery' as const, target: id, threshold,
  label: `${fishById(id).name} · ${threshold} exemplares`,
  reward: threshold === 3 ? 'Placa de bronze' : threshold === 5 ? 'Placa de prata + nado especial' : 'Placa de ouro',
})))];
export const AQUATIC_TITLES: Record<AquaticStyle['title'], string> = { none: '', first: 'Primeira maré', explorer: 'Explorador das águas', collector: 'Guardião do lago' };
export const CAST_WAIT_MS = 22000;
