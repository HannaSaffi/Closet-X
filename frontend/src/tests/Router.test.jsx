import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import App from '../App';

describe('Router Configuration', () => {
  test('App renders without router wrapper', async () => {
    let result;
    await act(async () => {
      result = render(<App />);
    });
    expect(result.container).toBeTruthy();
    expect(result.container.firstChild).toBeTruthy();
  });

  test('App has proper structure', async () => {
    let result;
    await act(async () => {
      result = render(<App />);
    });
    const app = result.container.firstChild;
    expect(app).toBeTruthy();
  });
});