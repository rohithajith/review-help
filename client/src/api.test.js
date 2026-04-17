import { apiBase, resolveApiBase } from './api';

describe('api module', () => {
  test('apiBase is always a non-empty string', () => {
    expect(typeof apiBase).toBe('string');
    expect(apiBase.length).toBeGreaterThan(0);
  });

  test('prefers VITE_API_URL over REACT_APP_API_URL', () => {
    const value = resolveApiBase(
      { VITE_API_URL: '/api', REACT_APP_API_URL: 'http://localhost:4000/api' },
      {},
      true
    );
    expect(value).toBe('/api');
  });

  test('guards against localhost API URL in production', () => {
    const value = resolveApiBase(
      { REACT_APP_API_URL: 'http://localhost:4000/api' },
      {},
      true
    );
    expect(value).toBe('/api');
  });

  test('keeps localhost API URL in non-production mode', () => {
    const value = resolveApiBase(
      { REACT_APP_API_URL: 'http://localhost:4000/api' },
      {},
      false
    );
    expect(value).toBe('http://localhost:4000/api');
  });
});
