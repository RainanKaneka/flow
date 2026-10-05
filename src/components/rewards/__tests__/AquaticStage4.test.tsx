import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFlowStore } from '../../../store/useFlowStore';
import { createRewardAccount } from '../../../services/rewards/engine';
import { createFishingAccount } from '../../../services/rewards/fishing';
import { createAquaticStyle, grantLocalMilestones } from '../../../services/rewards/aquatic';
import { initializeRewards, disposeRewards } from '../../../services/rewards/runtime';
import { saveRewardAccount } from '../../../services/rewards/storage';
import { AquaticView } from '../AquaticView';
import { AquaticCustomization } from '../AquaticCustomization';

beforeEach(async () => {
  localStorage.clear();
  let account = createRewardAccount(); account.wallet.tickets = 2; account.wallet.coins = 80; account.fishing = createFishingAccount();
  account.fishing.progress.starterClaimed = true; account.fishing.progress.counts.goldfish = 1; account.fishing.progress.discoveredAt.goldfish = Date.now(); account.fishing.progress.discovered = ['goldfish'];
  account = grantLocalMilestones(account);
  await saveRewardAccount('guest', account);
  useFlowStore.setState({ pomodoro: { ...useFlowStore.getState().pomodoro, isActive: false }, tasks: [], logs: {}, firebaseUser: null });
  await initializeRewards(null);
});
afterEach(() => { cleanup(); disposeRewards(); });
describe('stage 4 real guest interactions', () => {
  it('waits for a bite without charging, permits keyboard confirmation and saves once', async () => {
    const user = userEvent.setup(); render(<AquaticView tab="fishing" navigate={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Lançar linha · 1 bilhete' }));
    await screen.findByRole('heading', { name: 'A linha está na água' });
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(2);
    await act(async () => {
      const account = useFlowStore.getState().rewards!;
      useFlowStore.setState({ rewards: { ...account, fishing: { ...account.fishing!, cast: { ...account.fishing!.cast!, dueAt: Date.now() - 1 } } } });
    });
    const confirm = await screen.findByRole('button', { name: 'Confirmar fisgada' });
    confirm.focus(); await user.keyboard('{Enter}');
    await screen.findByText('Captura salva · 1 bilhete usado');
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(1);
    expect(useFlowStore.getState().rewards?.fishing?.cast).toBeNull();
  });
  it('pauses on loss of visibility and reveals the same attempt on demand', async () => {
    const user = userEvent.setup(); render(<AquaticView tab="fishing" navigate={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Lançar linha · 1 bilhete' }));
    const id = useFlowStore.getState().rewards!.fishing!.pending!.id;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByRole('heading', { name: 'Sua linha ficou guardada' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await user.click(screen.getByRole('button', { name: 'Revelar agora' }));
    await screen.findByText('Captura salva · 1 bilhete usado');
    expect(useFlowStore.getState().rewards?.fishing?.unrevealed).toBe(id);
  });
  it('uses the simplified mode without waiting or changing the ticket cost', async () => {
    await useFlowStore.getState().configureAquaticStyle({ ...createAquaticStyle(), mode: 'simple' });
    const user = userEvent.setup(); render(<AquaticView tab="fishing" navigate={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Revelar peixe · 1 bilhete' }));
    await screen.findByText('Captura salva · 1 bilhete usado');
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(1);
  });
  it('requires confirmation before a purchase and applies a real decoration to the scene', async () => {
    const user = userEvent.setup(); render(<AquaticCustomization />);
    await user.click(screen.getAllByRole('button', { name: 'Desbloquear' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(useFlowStore.getState().rewards?.wallet.coins).toBe(80);
    await user.click(screen.getByRole('button', { name: 'Usar 40 moedas' }));
    await screen.findByText('Item desbloqueado. Escolha Usar no aquário para equipar.');
    await user.click(screen.getByRole('button', { name: 'Usar no aquário' }));
    await waitFor(() => expect(useFlowStore.getState().rewards?.fishing?.style?.decorations).toEqual(['lantern']));
    expect(useFlowStore.getState().rewards?.wallet.coins).toBe(40);
    expect(screen.getByRole('button', { name: 'Em uso · retirar' })).toBeInTheDocument();
  });
  it('equips an earned profile title and keeps unavailable titles disabled', async () => {
    const user = userEvent.setup(); render(<AquaticCustomization />);
    expect(screen.getByRole('option', { name: 'Guardião do lago' })).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Título no perfil' }), 'first');
    await waitFor(() => expect(useFlowStore.getState().rewards?.fishing?.style?.title).toBe('first'));
  });
});
