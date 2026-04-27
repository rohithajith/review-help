import React from 'react';
import { vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

vi.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } }, error: null })),
      signOut: vi.fn(async () => ({})),
    },
  },
}));

import api from '../api';
import BusinessAdmin from './BusinessAdmin';

describe('BusinessAdmin compose question settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.defaults = { headers: { common: {} } };
    localStorage.setItem('shareQrSeen:2', '1');

    api.get.mockImplementation((url) => {
      if (url === '/2/admin/access') return Promise.resolve({ data: { ok: true, role: 'owner' } });
      if (url === '/2/business') {
        return Promise.resolve({
          data: {
            id: 2,
            name: 'Nails by Shandon',
            logo_url: '',
            review_platforms: [{ name: 'Google', url: '' }],
            compose_questions: [
              { key: 'visit_purpose', label: 'What treatment did you book?', placeholder: 'BIAB, gel, manicure, etc.' },
              { key: 'service_quality', label: 'How did your nails turn out?', placeholder: 'Shape, finish, detail.' },
              { key: 'staff_experience', label: 'How was your experience with the technician?', placeholder: 'Friendly, detail-focused, etc.' },
              { key: 'specific_highlight', label: 'What stood out most?', placeholder: 'Share one highlight.' },
              { key: 'overall_recommendation', label: 'Would you come back?', placeholder: 'Tell others your overall feeling.' },
            ],
          },
        });
      }
      if (url === '/2/templates') return Promise.resolve({ data: [] });
      if (url === '/2/templates/backups') return Promise.resolve({ data: [] });
      if (url === '/2/reviews') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  test('saves compose questions via PUT /:businessId/business', async () => {
    api.put.mockResolvedValueOnce({
      data: {
        compose_questions: [
          { key: 'visit_purpose', label: 'What service did you get done today?', placeholder: 'BIAB, gel, manicure, etc.' },
          { key: 'service_quality', label: 'How did your nails turn out?', placeholder: 'Shape, finish, detail.' },
          { key: 'staff_experience', label: 'How was your experience with the technician?', placeholder: 'Friendly, detail-focused, etc.' },
          { key: 'specific_highlight', label: 'What stood out most?', placeholder: 'Share one highlight.' },
          { key: 'overall_recommendation', label: 'Would you come back?', placeholder: 'Tell others your overall feeling.' },
        ],
      },
    });

    render(<BusinessAdmin businessId="2" />);

    await screen.findByText('Compose Questions');

    const questionInputs = screen.getAllByLabelText('Question Text');
    fireEvent.change(questionInputs[0], { target: { value: 'What service did you get done today?' } });

    fireEvent.click(screen.getByRole('button', { name: /save compose questions/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/2/business', expect.objectContaining({
        compose_questions: expect.arrayContaining([
          expect.objectContaining({ label: 'What service did you get done today?' }),
        ]),
      }));
    });
  });
});
