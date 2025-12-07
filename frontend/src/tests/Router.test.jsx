import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('Router Configuration', () => {
  test('App renders without router wrapper', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  test('App has proper structure', () => {
    const { container } = render(<App />);
    const app = container.firstChild;
    expect(app).toBeTruthy();
  });
});