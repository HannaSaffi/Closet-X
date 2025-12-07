import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ clothingId: '123', imageUrl: 'https://example.com/image.jpg' }),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'fake-auth-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

// Reset mocks before each test
beforeEach(() => {
  fetch.mockClear();
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  
  // Reset fetch to default behavior
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ clothingId: '123', imageUrl: 'https://example.com/image.jpg' }),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});