import React from 'react';
import { vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
// Mock the api module used by AdminDashboard
vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

import AdminDashboard from './AdminDashboard';
import api from '../api';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('loads businesses and displays them', async () => {
    const businesses = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    api.get.mockImplementation((url) => {
      if (url === '/businesses') return Promise.resolve({ data: businesses });
      if (url === '/1/business') return Promise.resolve({ data: { id: 1, name: 'A', google_review_url: '', welcome_message: '' } });
      if (url === '/1/templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    render(<AdminDashboard />);

    // wait for businesses load call
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/businesses'));
    expect(screen.getByText('Admin Dashboard')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/businesses');
  });

  test('save settings updates business with normalized review platform URLs', async () => {
    const businesses = [{ id: 1, name: 'A' }];
    api.get.mockImplementation((url) => {
      if (url === '/businesses') return Promise.resolve({ data: businesses });
      if (url === '/1/business') {
        return Promise.resolve({
          data: {
            id: 1,
            name: 'A',
            logo_url: '',
            google_review_url: '',
            welcome_message: '',
            review_platforms: [
              { name: 'Google', url: '' },
            ],
          }
        });
      }
      if (url === '/1/templates') return Promise.resolve({ data: [] });
      if (url === '/1/templates/backups') return Promise.resolve({ data: [] });
      if (url === '/1/reviews') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    api.put.mockResolvedValueOnce({ status: 200, data: {} });

    render(<AdminDashboard />);

    // wait for initial load
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const reviewUrlInput = screen.getAllByLabelText('Review URL')[0];
    fireEvent.change(reviewUrlInput, { target: { value: 'maps.google.com/place/x' } });
    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/1/business',
      expect.objectContaining({
        review_platforms: expect.arrayContaining([
          expect.objectContaining({
            name: 'Google',
            url: 'https://maps.google.com/place/x',
          }),
        ]),
      })
    ));
  });
});
