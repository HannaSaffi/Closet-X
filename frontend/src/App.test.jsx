import { describe, test, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import App from './App';  // ← Changed from '../App' to './App'

describe('App Component', () => {
  test('renders without crashing', async () => {
    let result;
    await act(async () => {
      result = render(<App />);
    });
    expect(result.container).toBeTruthy();
  });

  test('renders app container', async () => {
    let result;
    await act(async () => {
      result = render(<App />);
    });
    const appContainer = result.container.firstChild;
    expect(appContainer).toBeTruthy();
  });
});