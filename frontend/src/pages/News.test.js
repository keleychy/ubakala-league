import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api/api';
import News from './News';

jest.mock('../api/api', () => ({
  api: {
    getNews: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('news cards show views and paginate nine stories at a time', async () => {
  api.getNews.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
    id: `story-${index + 1}`,
    title: `Story ${index + 1}`,
    content: `Article content ${index + 1}`,
    published: true,
    views: index
  })));

  render(
    <MemoryRouter>
      <News />
    </MemoryRouter>
  );

  expect(await screen.findByRole('link', { name: 'Read Story 1' })).toBeInTheDocument();
  expect(screen.getByText('0 views')).toBeInTheDocument();
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Read Story 10' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByRole('link', { name: 'Read Story 10' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Read Story 1' })).not.toBeInTheDocument();
});

test('news cards show the most recently published story first', async () => {
  api.getNews.mockResolvedValue([
    {
      id: 'older',
      title: 'Older story',
      content: 'An earlier update.',
      published_at: '2026-10-12T10:00:00Z'
    },
    {
      id: 'newest',
      title: 'Newest story',
      content: 'The latest update.',
      published_at: '2026-11-19T10:00:00Z'
    },
    {
      id: 'middle',
      title: 'Middle story',
      content: 'A later update.',
      published_at: '2026-11-01T10:00:00Z'
    }
  ]);

  const { container } = render(
    <MemoryRouter>
      <News />
    </MemoryRouter>
  );

  await screen.findByRole('link', { name: 'Read Newest story' });
  const storyTitles = Array.from(container.querySelectorAll('.news-story-card h2'))
    .map(heading => heading.textContent);

  expect(storyTitles).toEqual(['Newest story', 'Middle story', 'Older story']);
});

test('news loading errors provide a retry action', async () => {
  api.getNews
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce([{
      id: 'recovered-story',
      title: 'Recovered story',
      content: 'The service is back.'
    }]);

  render(
    <MemoryRouter>
      <News />
    </MemoryRouter>
  );

  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('link', { name: 'Read Recovered story' })).toBeInTheDocument();
  expect(api.getNews).toHaveBeenCalledTimes(2);
});
