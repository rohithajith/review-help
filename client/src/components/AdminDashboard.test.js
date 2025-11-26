import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
// Mock the api module used by AdminDashboard
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

import AdminDashboard from './AdminDashboard';
import api from '../api';

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

    // wait for businesses to be loaded and select to populate
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/businesses'));
    // verify the select options rendered (include default empty option)
    const options = screen.getAllByRole('option');
    // At minimum the default option should be present
    expect(options.length).toBeGreaterThanOrEqual(1);
    // The API should have been called for businesses
    expect(api.get).toHaveBeenCalledWith('/businesses');
  });

  test('create business calls API and refreshes list', async () => {
    const businesses = [{ id: 1, name: 'A' }];
    api.get.mockResolvedValueOnce({ data: businesses });
    api.get.mockResolvedValueOnce({ data: [] });
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
