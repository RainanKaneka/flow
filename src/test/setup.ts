import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// 1. Mock do Web Audio API (evita falhas ao disparar sons táteis na suite de testes)
class MockAudioNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn().mockReturnThis();
  exponentialRampToValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sine';
  frequency = new MockAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = new MockAudioNode();

  createOscillator() {
    return new MockOscillatorNode();
  }

  createGain() {
    return new MockGainNode();
  }

  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

// 2. Mock da API de Notificações do Navegador
const mockNotification = vi.fn();
(mockNotification as any).permission = 'default';
(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted');

Object.defineProperty(window, 'Notification', {
  writable: true,
  value: mockNotification,
});

// 3. Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 3.1 Mock de URL.createObjectURL e URL.revokeObjectURL (evita incompatibilidade de Blob no jsdom)
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
}
if (typeof URL !== 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}

// 4. Mock dos módulos Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn().mockResolvedValue(true),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  sendNotification: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-sql', () => {
  return {
    default: {
      load: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 }),
        select: vi.fn().mockResolvedValue([]),
      }),
    },
  };
});

// 5. Limpeza de mocks e storage antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
