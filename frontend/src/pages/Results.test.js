import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { api } from '../api/api';
import Results from './Results';

jest.mock('../api/api', () => ({
  api: {
    getSeasons: jest.fn(),
    getMatches: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getSeasons.mockResolvedValue([
    { id: 'senior-season', name: 'Senior Boys 2026', category: 'senior_boys' },
    { id: 'girls-season', name: 'Girls 2026', category: 'girls' }
  ]);
  api.getMatches.mockResolvedValue([
    {
      id: 'senior-match',
      season: { id: 'senior-season', category: 'senior_boys' },
      stage: 'GROUP',
      status: 'FINISHED',
      home_team: { name: 'Senior Eagles' },
      away_team: { name: 'Senior Rangers' },
      home_score: 1,
      away_score: 0,
      match_date: '2026-10-01'
    },
    {
      id: 'girls-match',
      season: { id: 'girls-season', category: 'girls' },
      stage: 'FINAL',
      status: 'FINISHED',
      home_team: { name: 'Girls United' },
      away_team: { name: 'Girls Stars' },
      home_score: 2,
      away_score: 1,
      match_date: '2026-10-02'
    }
  ]);
});

test('public results identify competitions by category and filter by category', async () => {
  render(<Results />);

  expect(await screen.findByText('Senior Eagles', { selector: '.results-team.home' })).toBeInTheDocument();
  expect(screen.queryByText('Girls United')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Competition category'), {
    target: { value: 'girls' }
  });

  expect(await screen.findByText('Girls United', { selector: '.results-team.home' })).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByText('Senior Eagles')).not.toBeInTheDocument();
  });
  expect(screen.getAllByText('Girls').length).toBeGreaterThan(0);
});

test('public results display awarded score, reason, and selected winner', async () => {
  api.getSeasons.mockResolvedValue([
    { id: 'awarded-season', name: 'Senior Boys 2026', category: 'senior_boys' }
  ]);
  api.getMatches.mockResolvedValue([
    {
      id: 'walkover-match',
      season: { id: 'awarded-season', category: 'senior_boys' },
      status: 'AWARDED',
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      home_team: { id: 'team-home', name: 'Senior Eagles' },
      away_team: { id: 'team-away', name: 'Senior Rangers' },
      home_score: 0,
      away_score: 3,
      awarded_winner_team_id: 'team-away',
      result_type: 'WALKOVER',
      award_reason: 'WALKOVER'
    }
  ]);

  render(<Results />);

  const awardedMessage = await screen.findByText('Match awarded.');
  const matchCard = awardedMessage.closest('.results-match-card');

  expect(within(matchCard).getByText('Awarded')).toBeInTheDocument();
  expect(matchCard.querySelector('.results-score')).toHaveTextContent('0:3');
  expect(within(matchCard).getByText(/WALKOVER Awarded to: Senior Rangers/)).toBeInTheDocument();
});

test('public knockout results show penalties and mark the penalty winner', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'penalty-final',
      season: { id: 'senior-season', category: 'senior_boys' },
      stage: 'FINAL',
      status: 'FINISHED',
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      home_team: { id: 'team-home', name: 'Senior Eagles' },
      away_team: { id: 'team-away', name: 'Senior Rangers' },
      home_score: 1,
      away_score: 1,
      home_penalties: 4,
      away_penalties: 3,
      match_date: '2026-10-02'
    }
  ]);

  render(<Results />);

  const resultCard = await screen.findByText('Senior Eagles', {
    selector: '.results-team.home'
  });
  expect(resultCard.closest('.results-match-card').querySelector('.results-penalties'))
    .toHaveTextContent('Penalties: 4 - 3');

  const bracket = document.querySelector('.results-bracket-card');
  expect(bracket).toBeInTheDocument();
  expect(within(bracket).getByText('Senior Eagles').closest('.results-bracket-team'))
    .toHaveClass('winner');
  expect(within(bracket).getByText('Senior Rangers').closest('.results-bracket-team'))
    .not.toHaveClass('winner');
  expect(bracket.querySelector('.results-bracket-penalties')).toHaveTextContent('Penalties: 4 - 3');
});

test('public results can be filtered by kickoff date without another API request', async () => {
  render(<Results />);
  await screen.findByText('Senior Eagles', { selector: '.results-team.home' });

  fireEvent.change(screen.getByLabelText('Competition category'), {
    target: { value: 'all' }
  });
  fireEvent.change(screen.getByLabelText('From date'), {
    target: { value: '2026-10-02' }
  });

  expect(await screen.findByText('Girls United', { selector: '.results-team.home' })).toBeInTheDocument();
  expect(screen.queryByText('Senior Eagles', { selector: '.results-team.home' })).not.toBeInTheDocument();
  expect(api.getMatches).toHaveBeenCalledTimes(1);
});

test('public results paginate the already-loaded match list on the client', async () => {
  api.getMatches.mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({
    id: `match-${index + 1}`,
    season: { id: 'senior-season', category: 'senior_boys' },
    stage: 'GROUP',
    status: 'FINISHED',
    home_team: { name: `Home ${index + 1}` },
    away_team: { name: `Away ${index + 1}` },
    home_score: 1,
    away_score: 0,
    match_date: `2026-10-${String(index + 1).padStart(2, '0')}`
  })));

  render(<Results />);

  await screen.findByText('Home 13', { selector: '.results-team.home' });
  expect(document.querySelectorAll('.results-match-card')).toHaveLength(12);
  expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText('Home 1', { selector: '.results-team.home' })).toBeInTheDocument();
  expect(document.querySelectorAll('.results-match-card')).toHaveLength(1);
  expect(api.getMatches).toHaveBeenCalledTimes(1);
});
