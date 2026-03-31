import React from 'react';
import { render, screen } from '@testing-library/react';
import TemplateSharePanel from './TemplateSharePanel';

describe('TemplateSharePanel', () => {
  test('renders qr share controls for a valid business id', () => {
    render(<TemplateSharePanel businessId={15} />);
    expect(screen.getByText('Short Link')).toBeTruthy();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /open template page/i })).toBeTruthy();
  });

  test('shows fallback text for invalid business id', () => {
    render(<TemplateSharePanel businessId={null} />);
    expect(screen.getByText(/share link is unavailable/i)).toBeTruthy();
  });
});
