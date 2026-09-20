// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminCampaigns from './Campaigns';
import { useQuery } from '../../api/useQuery';

vi.mock('../../api/useQuery', () => ({
  useQuery: vi.fn(),
  useAction: () => ({ busy: false, error: '', success: '', run: vi.fn() }),
}));

const campaign = {
  id: 'campaign-a', subject: 'September homes', status: 'SENT', createdAt: '2026-09-01T10:00:00.000Z', sentAt: '2026-09-01T10:00:00.000Z', completedAt: null,
  recipientCount: 4, templateId: null, templateHtml: null, bodyText: null, renderedHtml: null, newsArticleId: null, properties: [], clickCount: 3, interestCount: 1, saveCount: 2, sentCount: 4, failedCount: 0,
};

afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('renders daily campaign saves and interests including zero values', () => {
  vi.mocked(useQuery).mockImplementation(((query: string) => {
    if (query.includes('campaignStats')) return { data: { campaignStats: [{ campaignId: 'campaign-a', campaignSubject: 'September homes', date: '2026-09-01', sent: 4, clicks: 3, interests: 0, saves: 0, unsubscribes: 1, clickRate: 0.75, interestRate: 0 }] }, loading: false, error: '', reload: vi.fn() };
    return { data: { campaignsPage: { nodes: [campaign], totalCount: 1 } }, loading: false, error: '', reload: vi.fn() };
  }) as never);

  render(<MemoryRouter><AdminCampaigns /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));

  expect(screen.getByRole('columnheader', { name: 'Interests' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Saves' })).toBeVisible();
  expect(screen.getAllByRole('cell', { name: '0' })).toHaveLength(2);
});

it('shows a GraphQL statistics error without hiding the admin page', () => {
  vi.mocked(useQuery).mockImplementation(((query: string) => {
    if (query.includes('campaignStats')) return { data: null, loading: false, error: 'Campaign statistics are unavailable', reload: vi.fn() };
    return { data: { campaignsPage: { nodes: [campaign], totalCount: 1 } }, loading: false, error: '', reload: vi.fn() };
  }) as never);

  render(<MemoryRouter><AdminCampaigns /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Campaign statistics are unavailable');
  expect(screen.getByRole('heading', { name: 'Email Campaigns' })).toBeVisible();
});

it('renders recipient delivery states and provider errors from the campaign detail query', () => {
  vi.mocked(useQuery).mockImplementation(((query: string) => {
    if (query.includes('campaignDetail')) return { data: { campaignDetail: { ...campaign, recipients: [{ id: 'recipient-1', recipientName: 'Pat', recipientEmail: 'pat@example.test', status: 'FAILED', attemptCount: 2, sentAt: null, failedAt: '2026-09-01T11:00:00.000Z', errorMessage: 'SMTP unavailable' }] } }, loading: false, error: '', reload: vi.fn() };
    return { data: { campaignsPage: { nodes: [campaign], totalCount: 1 } }, loading: false, error: '', reload: vi.fn() };
  }) as never);

  render(<MemoryRouter><AdminCampaigns /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Recipient results' }));

  expect(screen.getByRole('heading', { name: /Recipient results.*September homes/ })).toBeVisible();
  expect(screen.getByRole('cell', { name: /Patpat@example\.test/ })).toBeVisible();
  expect(screen.getByText('FAILED')).toBeVisible();
  expect(screen.getByText('SMTP unavailable')).toBeVisible();
});
