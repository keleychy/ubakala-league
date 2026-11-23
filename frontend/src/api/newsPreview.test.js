const {
  getArticlePreviewImage,
  renderArticleMetadata
} = require('../../api/news-preview');

const articleUrl = 'https://ubakala-league.vercel.app/news/article-1';
const html = '<html><head><title>Ubakala Football League</title></head><body></body></html>';

test('uses the article cover image for social previews when available', () => {
  const article = {
    title: 'Cup final',
    image_url: 'https://images.example.com/cover.jpg',
    inline_images: [{ url: 'https://images.example.com/inline.jpg' }]
  };

  const rendered = renderArticleMetadata(html, article, articleUrl);

  expect(getArticlePreviewImage(article)).toBe('https://images.example.com/cover.jpg');
  expect(rendered).toContain(
    '<meta property="og:image" content="https://images.example.com/cover.jpg"/>'
  );
  expect(rendered).toContain(
    '<meta name="twitter:image" content="https://images.example.com/cover.jpg"/>'
  );
});

test('uses the first valid inline image when the article has no cover image', () => {
  const article = {
    title: 'Cup report',
    image_url: '',
    inline_images: [
      { url: 'not-a-url' },
      { url: 'https://images.example.com/first-inline.jpg' },
      { url: 'https://images.example.com/second-inline.jpg' }
    ]
  };

  expect(getArticlePreviewImage(article)).toBe(
    'https://images.example.com/first-inline.jpg'
  );
});

test('uses the site preview when the article has no usable image', () => {
  expect(getArticlePreviewImage({
    image_url: 'javascript:alert(1)',
    inline_images: []
  })).toBe('https://ubakala-league.vercel.app/preview.jpg');
});
