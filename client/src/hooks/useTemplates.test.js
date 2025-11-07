import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useTemplates from './useTemplates';

function TestComponent({ businessId }) {
  const { templates, loading, error } = useTemplates(businessId);
  if (loading) return <div>loading</div>;
  if (error) return <div>error:{error}</div>;
  return (
    <div>
      {templates.map((t) => (
        <div key={t.id} data-testid="template">{t.text}</div>
      ))}
    </div>
  );
}

describe('useTemplates hook (component integration)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => jest.resetAllMocks());

  test('renders templates when businessId provided', async () => {
    const mockData = [{ id: 1, text: 'hello' }];
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });

    render(<TestComponent businessId={1} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(await screen.findByText('hello')).toBeTruthy();
  });
});
