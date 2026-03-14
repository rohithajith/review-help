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

  test('create business calls API and refreshes list', async () => {
    const businesses = [{ id: 1, name: 'A' }];
    api.get.mockImplementation((url) => {
      if (url === '/businesses') return Promise.resolve({ data: businesses });
      if (url === '/1/business') return Promise.resolve({ data: { id: 1, name: 'A', google_review_url: '', welcome_message: '' } });
      if (url === '/1/templates') return Promise.resolve({ data: [] });
      if (url === '/1/templates/backups') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValueOnce({ status: 201, data: { id: 42, name: 'New' } });

    render(<AdminDashboard />);

    // wait for initial load
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const inputs = screen.getAllByRole('textbox');
    // pick the first textbox which is the create business input in this layout
    const input = inputs[0];
    const createBtn = screen.getByText('Create');
    fireEvent.change(input, { target: { value: 'New Tenant' } });
    fireEvent.click(createBtn);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/businesses', { name: 'New Tenant' }));
  });
});
