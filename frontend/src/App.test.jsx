import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  test('renders app container', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });
});