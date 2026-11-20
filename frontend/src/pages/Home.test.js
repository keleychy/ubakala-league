import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api, isAppsScriptReadApiEnabled } from '../api/api';
import Home from './Home';
import { getLagosDateKey, shiftDateKey } from '../utils/competition';

jest.mock('../api/api', () => ({
  api: {
    getTeams: jest.fn(),
    getMatches: jest.fn(),
    getSeasons: jest.fn(),
    recordHomepageSupportClick: jest.fn()
  },
  isAppsScriptReadApiEnabled: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getTeams.mockResolvedValue([]);
  api.getSeasons.mockResolvedValue([]);
  api.recordHomepageSupportClick.mockResolvedValue({ click_count: 1 });
  isAppsScriptReadApiEnabled.mockReturnValue(true);
});

function renderHomeWithStatus(status) {
  api.getMatches.mockResolvedValue([{
    id: 'match-1',
    season_id: 'season-1',
    season: { id: 'season-1', name: 'Intermediate 2026', category: 'intermediate' },
    stage: 'GROUP',
    status,
    home_team: { id: 'uturu', name: 'Uturu' },
    away_team: { id: 'amuzu', name: 'Amuzu' },
    home_score: 3,
    away_score: 0,
    match_date: getLagosDateKey()
  }]);

  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

test('homepage marks an awarded match as completed while preserving its status', async () => {
  renderHomeWithStatus('AWARDED');

  const card = await screen.findByRole('button', {
    name: /Uturu versus Amuzu/
  });
  expect(card).toHaveTextContent('Awarded');
  expect(card).toHaveTextContent('Match Complete');
  expect(card).not.toHaveTextContent('Full Time');
});

test('homepage keeps the full-time label for normally finished matches', async () => {
  renderHomeWithStatus('FINISHED');

  const card = await screen.findByRole('button', {
    name: /Uturu versus Amuzu/
  });
  expect(card).toHaveTextContent('Full Time');
  expect(card).not.toHaveTextContent('Match Complete');
});

test('homepage shows the next three future fixtures in date and kickoff order when today and tomorrow are empty', async () => {
  const today = getLagosDateKey();
  const matches = [
    {
      id: 'later-match',
      match_date: shiftDateKey(today, 5),
      kickoff_time: '10:00',
      status: 'SCHEDULED',
      home_team: { id: 'later-home', name: 'Later Home' },
      away_team: { id: 'later-away', name: 'Later Away' }
    },
    {
      id: 'second-match',
      match_date: shiftDateKey(today, 3),
      kickoff_time: '12:00',
      status: 'SCHEDULED',
      home_team: { id: 'second-home', name: 'Second Home' },
      away_team: { id: 'second-away', name: 'Second Away' }
    },
    {
      id: 'first-late-match',
      match_date: shiftDateKey(today, 3),
      kickoff_time: '11:00',
      status: 'SCHEDULED',
      home_team: { id: 'first-late-home', name: 'First Late Home' },
      away_team: { id: 'first-late-away', name: 'First Late Away' }
    },
    {
      id: 'first-match',
      match_date: shiftDateKey(today, 3),
      kickoff_time: '09:00',
      status: 'SCHEDULED',
      home_team: { id: 'first-home', name: 'First Home' },
      away_team: { id: 'first-away', name: 'First Away' }
    }
  ];
  api.getMatches.mockResolvedValue(matches);

  const { container } = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Upcoming Matches' }))
    .toBeInTheDocument();
  const matchCards = Array.from(container.querySelectorAll('.home-match-card'));
  expect(matchCards).toHaveLength(3);
  expect(matchCards.map(card => card.getAttribute('aria-label'))).toEqual([
    expect.stringContaining('First Home versus First Away'),
    expect.stringContaining('First Late Home versus First Late Away'),
    expect.stringContaining('Second Home versus Second Away')
  ]);
});

test('homepage provides direct links to Predictions and Rules & Regulations', async () => {
  renderHomeWithStatus('FINISHED');

  expect(await screen.findByRole('link', { name: 'Predictions' }))
    .toHaveAttribute('href', '/predictions');
  expect(screen.getByRole('link', { name: 'Rules & Regulations' }))
    .toHaveAttribute('href', '/rules-regulations');
});

test('homepage shows a discreet link to the Support page', async () => {
  renderHomeWithStatus('FINISHED');

  expect(await screen.findByRole('heading', {
    name: 'Help preserve the Ubakala Unity Cup archive'
  })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Support this website' }))
    .toHaveAttribute('href', '/support');
});

test('homepage team cards link to public team profiles', async () => {
  api.getTeams.mockResolvedValue([{
    id: 'team-1',
    name: 'Avodim United',
    logo: 'https://example.com/avodim.png'
  }]);

  renderHomeWithStatus('FINISHED');

  const teamProfileLink = await screen.findByRole('link', {
    name: 'View Avodim United team profile'
  });
  expect(teamProfileLink).toHaveAttribute('href', '/teams/team-1');
  expect(teamProfileLink.querySelector('img')).toHaveAttribute(
    'src',
    'https://example.com/avodim.png'
  );
});

test('homepage Support link records a click without blocking navigation', async () => {
  renderHomeWithStatus('FINISHED');
  const supportLink = await screen.findByRole('link', { name: 'Support this website' });

  fireEvent.click(supportLink);

  expect(api.recordHomepageSupportClick).toHaveBeenCalledTimes(1);
});

test('homepage highlights Predictions as new during its one-week announcement', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-12T13:18:19.960+01:00'));
  const { unmount } = renderHomeWithStatus('FINISHED');

  const predictionsLink = screen.getByRole('link', { name: 'Predictions' });
  expect(predictionsLink.querySelector('.new-feature-badge')).toHaveTextContent('NEW');

  unmount();
  jest.useRealTimers();
});
