import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/api';
import NewsDetail from './NewsDetail';

jest.mock('../api/api', () => ({
  api: {
    getNewsById: jest.fn(),
    recordNewsView: jest.fn()
  }
}));

jest.mock('../components/ShareBar', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
});

test('opening a published story records a view for the browser and displays the updated count', async () => {
  api.getNewsById.mockResolvedValue({
    id: 'story-1',
    title: 'Cup Update',
    content: 'Published story content.',
    published: true,
    views: 3
  });
  api.recordNewsView.mockResolvedValue({ views: 4 });

  render(
    <MemoryRouter initialEntries={['/news/story-1']}>
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Cup Update' })).toBeInTheDocument();
  expect(await screen.findByText('4 views')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(api.recordNewsView).toHaveBeenCalledWith(
    'story-1',
    expect.stringMatching(/^[A-Za-z0-9_-]{20,128}$/)
  );
});

test('renders optional in-article images after their selected paragraph without a hero image', async () => {
  api.getNewsById.mockResolvedValue({
    id: 'story-2',
    title: 'Match report',
    content: 'First paragraph.\n\nSecond paragraph.',
    image_url: '',
    inline_images: [{
      url: 'https://example.com/action.jpg',
      caption: 'Action from the match',
      after_paragraph: 1
    }],
    published: true,
    views: 0
  });
  api.recordNewsView.mockResolvedValue({ views: 1 });

  render(
    <MemoryRouter initialEntries={['/news/story-2']}>
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>
    </MemoryRouter>
  );

  const image = await screen.findByRole('img', { name: 'Action from the match' });
  const articleBody = image.closest('.news-article-body');
  expect(articleBody.children[0]).toHaveTextContent('First paragraph.');
  expect(articleBody.children[1]).toContainElement(image);
  expect(articleBody.children[2]).toHaveTextContent('Second paragraph.');
  expect(screen.getByText('Action from the match')).toBeInTheDocument();
  expect(document.querySelector('.news-article-figure')).not.toBeInTheDocument();
});

test('renders Markdown and WhatsApp-style formatting with safe clickable links', async () => {
  api.getNewsById.mockResolvedValue({
    id: 'story-formatted',
    title: 'Formatted article',
    content: [
      'Visit https://example.com/news?one=1&two=2. *Breaking update* **Final score** _Important_ ~~Cancelled~~ ~Postponed~ `match report` [full report](https://example.com/full-report) <script>alert(1)</script>',
      '',
      '## Match highlights',
      '',
      '- First half',
      '- **Winning goal**',
      '',
      '> A memorable final.'
    ].join('\n'),
    published: true,
    views: 0
  });
  api.recordNewsView.mockResolvedValue({ views: 1 });

  render(
    <MemoryRouter initialEntries={['/news/story-formatted']}>
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>
    </MemoryRouter>
  );

  const articleBody = await screen.findByText('Breaking update', { selector: 'strong' })
    .then(element => element.closest('.news-article-body'));
  const link = screen.getByRole('link', {
    name: 'https://example.com/news?one=1&two=2'
  });

  expect(link).toHaveAttribute('href', 'https://example.com/news?one=1&two=2');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(articleBody.querySelector('em')).toHaveTextContent('Important');
  expect(articleBody.querySelector('del')).toHaveTextContent('Cancelled');
  expect(articleBody.querySelector('code')).toHaveTextContent('match report');
  expect(articleBody).toHaveTextContent('<script>alert(1)</script>');
  expect(articleBody.querySelector('script')).not.toBeInTheDocument();
  expect(articleBody.querySelector('h2')).toHaveTextContent('Match highlights');
  expect(articleBody.querySelectorAll('ul li')).toHaveLength(2);
  expect(articleBody.querySelector('blockquote')).toHaveTextContent('A memorable final.');
  expect(screen.getByRole('link', { name: 'full report' }))
    .toHaveAttribute('href', 'https://example.com/full-report');
  expect(screen.getByText('Final score', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('Postponed', { selector: 'del' })).toBeInTheDocument();
});
