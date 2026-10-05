import type { FishId, FishRarity } from '../../types/fishing';

export const FISH_RARITIES: Record<FishRarity, { label: string; weight: number; mark: string }> = {
  common: { label: 'Comum', weight: 55, mark: '○' },
  uncommon: { label: 'Incomum', weight: 30, mark: '◇' },
  rare: { label: 'Raro', weight: 12, mark: '✦' },
  legendary: { label: 'Lendário', weight: 3, mark: '♛' },
};
export const FISH_CATALOG: { id: FishId; name: string; rarity: FishRarity; description: string; size: number; starter?: boolean }[] = [
  { id: 'goldfish', name: 'Douradinho', rarity: 'common', size: 112, starter: true, description: 'O primeiro amigo de um mundo que cresce com sua rotina.' },
  { id: 'koi', name: 'Carpa Koi', rarity: 'common', size: 138, description: 'Manchas de laranja e carvão, como pequenas pinceladas na água.' },
  { id: 'neon', name: 'Tetra Néon', rarity: 'common', size: 94, description: 'Uma faixa azul viva ilumina cada passeio pelo aquário.' },
  { id: 'clownfish', name: 'Peixe-palhaço', rarity: 'common', size: 106, description: 'Listras claras e um jeito curioso de explorar cada canto.' },
  { id: 'catfish', name: 'Bagre Mel', rarity: 'common', size: 122, description: 'Bigodes delicados e tons de mel para passeios tranquilos.' },
  { id: 'guppy', name: 'Guppy Aurora', rarity: 'uncommon', size: 124, description: 'Uma cauda em tons de rosa, lilás e verde de aurora.' },
  { id: 'angelfish', name: 'Acará-bandeira', rarity: 'uncommon', size: 114, description: 'Nadadeiras altas e elegantes, com listras de carvão.' },
  { id: 'pufferfish', name: 'Baiacu Limão', rarity: 'uncommon', size: 96, description: 'Redondinho, amarelo e sempre pronto para uma descoberta.' },
  { id: 'betta', name: 'Betta Azul', rarity: 'rare', size: 140, description: 'Nadadeiras de azul profundo que se abrem como um leque.' },
  { id: 'mandarin', name: 'Peixe-mandarim', rarity: 'rare', size: 114, description: 'Desenhos turquesa e laranja fazem de cada volta um espetáculo.' },
  { id: 'discus', name: 'Disco Rubi', rarity: 'legendary', size: 124, description: 'Uma descoberta especial: vermelho rubi com detalhes luminosos.' },
];
export const FISH_IDS = FISH_CATALOG.map((fish) => fish.id);
export const fishById = (id: FishId) => FISH_CATALOG.find((fish) => fish.id === id)!;
export const fishSprite = (id: FishId) => `/rewards/fish/${id}.png`;
export const speciesInRarity = (rarity: FishRarity) => FISH_CATALOG.filter((fish) => !fish.starter && fish.rarity === rarity).map((fish) => fish.id);
export const FISHING_RULES = { version: 1, ticketCost: 1, rareGuarantee: 10, legendaryGuarantee: 30, duplicateGuarantee: 3, aquariumLimit: 5 } as const;
