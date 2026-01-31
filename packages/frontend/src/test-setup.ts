// Test setup file for Vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = vi.fn();

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
  browser: true,
  dev: false,
  building: false,
  version: '1.0.0'
}));

// Mock SvelteKit stores (legacy)
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(() => () => {}),
    set: vi.fn()
  },
  navigating: {
    subscribe: vi.fn(() => () => {})
  }
}));

// Mock SvelteKit state (Svelte 5 - $app/state)
vi.mock('$app/state', () => ({
  page: {
    url: { pathname: '/', searchParams: new URLSearchParams() },
    params: {},
    route: { id: null },
    data: {},
    form: undefined,
    error: null,
    status: 200
  },
  navigating: { from: null, to: null, type: null, willUnload: null, delta: null, complete: null },
  updated: { get current() { return false; }, check: vi.fn().mockResolvedValue(false) }
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
