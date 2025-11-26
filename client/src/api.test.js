import { apiBase } from './api';

describe('api module', () => {
  test('apiBase defaults to REACT_APP_API_URL or /api', () => {
    // In test env REACT_APP_API_URL may be undefined; apiBase should be a string
    expect(typeof apiBase).toBe('string');
    expect(apiBase.length).toBeGreaterThan(0);
  });
});
