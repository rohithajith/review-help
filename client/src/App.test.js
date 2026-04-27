import React from 'react';
import { vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('./api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./hooks/useTemplates', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    templates: [{ id: 10, text: 'Brilliant service and friendly team.' }],
    loading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

vi.mock('./lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

vi.mock('./components/Landing', () => ({ __esModule: true, default: () => <div>Landing</div> }));
vi.mock('./components/Pricing', () => ({ __esModule: true, default: () => <div>Pricing</div> }));
vi.mock('./components/Contact', () => ({ __esModule: true, default: () => <div>Contact</div> }));
vi.mock('./components/Signup', () => ({ __esModule: true, default: () => <div>Signup</div> }));
vi.mock('./components/SignupSuccess', () => ({ __esModule: true, default: () => <div>SignupSuccess</div> }));
vi.mock('./components/PaymentPending', () => ({ __esModule: true, default: () => <div>PaymentPending</div> }));
vi.mock('./components/ResetPassword', () => ({ __esModule: true, default: () => <div>ResetPassword</div> }));
vi.mock('./components/Navbar', () => ({ __esModule: true, default: () => <div>Navbar</div> }));
vi.mock('./components/AdminDashboard', () => ({ __esModule: true, default: () => <div>AdminDashboard</div> }));
vi.mock('./components/BusinessAdmin', () => ({ __esModule: true, default: () => <div>BusinessAdmin</div> }));

import App from './App';
import api from './api';

describe('App compose questions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.location.hash = '#/business/1';
    api.get.mockImplementation((url) => {
      if (url === '/1/business') {
        return Promise.resolve({
          data: {
            id: 1,
            name: 'Nails by Shandon',
            welcome_message: 'Share your nail appointment experience in a few words.',
            logo_url: '',
            review_platforms: [{ name: 'Google', url: '' }],
          },
        });
      }
      if (url === '/1/reviews/compose/questions') {
        return Promise.resolve({
          data: {
            source: 'ai',
            questions: [
              { key: 'visit_purpose', label: 'What treatment did you book?', placeholder: 'BIAB, manicure, gel, etc.' },
              { key: 'service_quality', label: 'How did your nails look after the appointment?', placeholder: 'Shape, finish, detail, durability.' },
              { key: 'staff_experience', label: 'How was your experience with your nail tech?', placeholder: 'Friendly, professional, detail-focused, etc.' },
              { key: 'specific_highlight', label: 'What stood out most from this visit?', placeholder: 'Share one specific highlight.' },
              { key: 'overall_recommendation', label: 'Would you come back or recommend us?', placeholder: 'Tell others your overall impression.' },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  test('loads compose questions dynamically when compose is clicked', async () => {
    render(<App />);

    const composeButton = await screen.findByRole('button', { name: /compose/i });
    fireEvent.click(composeButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/1/reviews/compose/questions');
    });

    expect(await screen.findByText('What treatment did you book?')).toBeTruthy();
    expect(screen.getByPlaceholderText('BIAB, manicure, gel, etc.')).toBeTruthy();
  });
});
