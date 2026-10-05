import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFlowStore } from '../../../store/useFlowStore';
import { createRewardAccount } from '../../../services/rewards/engine';
import { createFishingAccount } from '../../../services/rewards/fishing';
import { saveRewardAccount } from '../../../services/rewards/storage';
import { disposeRewards, initializeRewards } from '../../../services/rewards/runtime';
import { AquaticView, AquariumScene } from '../AquaticView';
import { FishCompanion } from '../FishCompanion';
import { FISH_IDS } from '../../../services/rewards/fishCatalog';

beforeEach(async () => {
  localStorage.clear();
  const account = createRewardAccount(); account.wallet.tickets = 1; account.fishing = createFishingAccount();
  await saveRewardAccount('guest', account);
  useFlowStore.setState({ rewardOwner: null, rewards: null, tasks: [], logs: {}, firebaseUser: null });
  await initializeRewards(null);
});
afterEach(() => { cleanup(); disposeRewards(); });
describe('aquatic interface connected to real local capture actions', () => {
  it('guides the free starter, saves it and provides a route back to the aquarium', async () => {
    const navigate = vi.fn(); const user = userEvent.setup(); render(<AquaticView tab="fishing" navigate={navigate} />);
    await user.click(screen.getByRole('button', { name: 'Primeira captura · grátis' }));
    await screen.findByRole('heading', { name: 'Douradinho' });
    expect(screen.getByText('Captura salva · captura gratuita')).toBeInTheDocument();
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Ver no aquário' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('aquarium'));
    expect(useFlowStore.getState().rewards?.fishing?.preferences.favorite).toBe('goldfish');
  });
  it('explains missing tickets and keeps fishing disabled until a task earns one', () => {
    const account = useFlowStore.getState().rewards!;
    useFlowStore.setState({ rewards: { ...account, wallet: { ...account.wallet, tickets: 0 }, fishing: { ...account.fishing!, progress: { ...account.fishing!.progress, starterClaimed: true } } } });
    render(<AquaticView tab="fishing" navigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Lançar linha · 1 bilhete' })).toBeDisabled();
    expect(screen.getByText(/Conclua a primeira tarefa do dia/)).toBeInTheDocument();
  });
  it('filters rarity and keeps undiscovered species unavailable for equipment', async () => {
    const user = userEvent.setup(); render(<AquaticView tab="collection" navigate={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Ver ficha' })).toHaveLength(11);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Raridade' }), 'legendary');
    expect(screen.getByRole('heading', { name: 'Disco Rubi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver ficha' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Betta Azul' })).not.toBeInTheDocument();
  });
  it('explains the unique starter without offering an unreachable duplicate target', async () => {
    await useFlowStore.getState().catchFish(true);
    await useFlowStore.getState().acknowledgeFishCapture();
    render(<AquaticView tab="aquarium" navigate={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Companheiro inicial' })).toHaveTextContent('captura guiada única');
    expect(screen.queryByText(/exemplares até o próximo marco/)).not.toBeInTheDocument();
  });
  it('saves nicknames and limits the scene to five species', async () => {
    const user = userEvent.setup(); const account = useFlowStore.getState().rewards!; const fishing = account.fishing!;
    for (const id of FISH_IDS) { fishing.progress.counts[id] = 1; fishing.progress.discoveredAt[id] = Date.now(); }
    fishing.progress.discovered = [...FISH_IDS]; fishing.progress.starterClaimed = true;
    fishing.preferences.favorite = 'betta'; fishing.preferences.displayed = ['goldfish','koi','neon','clownfish','catfish'];
    useFlowStore.setState({ rewards: { ...account, fishing: { ...fishing } } });
    render(<AquaticView tab="aquarium" navigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Colocar no aquário' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Apelido do peixe' }), 'Maré');
    await user.click(screen.getByRole('button', { name: 'Salvar apelido' }));
    await waitFor(() => expect(useFlowStore.getState().rewards?.fishing?.preferences.nicknames.betta).toBe('Maré'));
  });
  it('keeps cloud capture disabled while offline, with a recovery action', () => {
    useFlowStore.setState({ rewardOwner: 'firebase:test:alice', fishingStatus: 'offline', rewardStatus: 'offline' });
    render(<AquaticView tab="fishing" navigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Primeira captura · grátis' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tentar sincronizar' })).toBeEnabled();
  });
  it('uses an explicit avatar action and shows the chosen fish in the profile', async () => {
    const account = useFlowStore.getState().rewards!; account.fishing!.progress.counts.goldfish = 1; account.fishing!.preferences.favorite = 'goldfish';
    useFlowStore.setState({ rewards: { ...account } });
    const useAvatar = vi.fn(), user = userEvent.setup(); render(<FishCompanion currentAvatar="" onUseAvatar={useAvatar} />);
    expect(screen.getByRole('region', { name: 'Seu peixe companheiro' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar peixe como avatar' }));
    expect(useAvatar).toHaveBeenCalledWith('/rewards/fish/goldfish.png');
    useFlowStore.setState({ rewardTab: 'collection', isProfileModalOpen: true });
    await user.click(screen.getByRole('button', { name: 'Abrir meu aquário' }));
    expect(useFlowStore.getState()).toMatchObject({ rewardTab: 'aquarium', activeView: 'rewards', isProfileModalOpen: false });
  });
  it('pauses scene motion during an active focus session', () => {
    const fishing = createFishingAccount(); fishing.progress.counts.goldfish = 1; fishing.preferences.displayed = ['goldfish'];
    useFlowStore.setState({ pomodoro: { ...useFlowStore.getState().pomodoro, isActive: true } });
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    render(<AquariumScene fishing={fishing} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Selecionar Douradinho' })).toBeInTheDocument();
    expect(frame).not.toHaveBeenCalled();
    frame.mockRestore();
  });
  it('drags a fish, saves its position and suppresses selection after moving', () => {
    const fishing = createFishingAccount(); fishing.progress.counts.goldfish = 1; fishing.preferences.displayed = ['goldfish'];
    const move = vi.fn(), select = vi.fn();
    const { container } = render(<AquariumScene fishing={fishing} onSelect={select} onMove={move} />);
    const scene = container.querySelector('[aria-label="Seu aquário"]') as HTMLDivElement;
    const button = screen.getByRole('button', { name: 'Selecionar Douradinho' });
    Object.defineProperties(scene, { clientWidth: { value: 600 }, clientHeight: { value: 360 } });
    Object.defineProperties(button, { offsetWidth: { value: 120 }, offsetHeight: { value: 96 } });
    fireEvent(window, new Event('resize'));
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(button, { pointerId: 1, pointerType: 'mouse', clientX: 320, clientY: 100 });
    fireEvent.pointerUp(button, { pointerId: 1, pointerType: 'mouse', clientX: 320, clientY: 100 });
    fireEvent.click(button);
    expect(move).toHaveBeenCalledWith('goldfish', { x: 43, y: 29 });
    expect(select).not.toHaveBeenCalled();
    fireEvent.keyDown(button, { key: 'ArrowRight' });
    fireEvent.keyUp(button, { key: 'ArrowRight' });
    expect(move).toHaveBeenLastCalledWith('goldfish', { x: 44, y: 29 });
  });
});
