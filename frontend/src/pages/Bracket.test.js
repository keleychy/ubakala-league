import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { api } from '../api/api';
import Bracket from './Bracket';

jest.mock('../api/api', () => ({
  api: {
    getSeasons: jest.fn(),
    getMatches: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getSeasons.mockResolvedValue([
    { id: 'season-1', name: 'Senior Boys 2026', category: 'senior_boys' }
  ]);
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      match_number: 22,
      stage: 'QF',
      status: 'FINISHED',
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      home_score: 1,
      away_score: 1,
      home_penalties: 4,
      away_penalties: 3,
      match_date: '2026-03-15',
      kickoff_time: '14:30',
      venue: 'Ubakala Township Stadium'
    }
  ]);
});

test('tournament bracket highlights and displays the winner of a penalty shootout', async () => {
  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  const match = homeTeam.closest('.br-match');

  expect(homeTeam.closest('.br-team')).toHaveClass('br-winner');
  expect(within(match).getByText('Rangers FC', {
    selector: '.br-team-name'
  }).closest('.br-team')).not.toHaveClass('br-winner');
  expect(match.querySelector('.br-penalty-result')).toHaveTextContent('4–3');
  expect(within(match).getByText('Date & time')).toBeInTheDocument();
  expect(within(match).getByText(/Mar 15, 2026/)).toBeInTheDocument();
  expect(within(match).getByText(/2:30 PM/)).toBeInTheDocument();
  expect(within(match).getByText('Ubakala Township Stadium')).toBeInTheDocument();
});

test('bracket match cards show date and time when venue is not provided', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      stage: 'QF',
      status: 'SCHEDULED',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      match_date: '2026-03-15',
      kickoff_time: '14:30'
    }
  ]);

  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  const match = homeTeam.closest('.br-match');

  expect(within(match).getByText(/Mar 15, 2026/)).toBeInTheDocument();
  expect(within(match).queryByText('Venue')).not.toBeInTheDocument();
});

test('an unfinished level match does not reveal a winner', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      match_number: 22,
      stage: 'QF',
      status: 'LIVE',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      home_score: 1,
      away_score: 1,
      home_penalties: 4,
      away_penalties: 3
    }
  ]);

  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  expect(homeTeam.closest('.br-team')).not.toHaveClass('br-winner');
  expect(document.querySelector('.br-penalty-result')).not.toBeInTheDocument();
});

test('awarded bracket winner follows the recorded winner, not the scoreline', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      match_number: 22,
      stage: 'QF',
      status: 'AWARDED',
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      awarded_winner_team_id: 'team-home',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      home_score: 0,
      away_score: 3
    }
  ]);

  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  const match = homeTeam.closest('.br-match');

  expect(homeTeam.closest('.br-team')).toHaveClass('br-winner');
  expect(within(match).getByText('Rangers FC', {
    selector: '.br-team-name'
  }).closest('.br-team')).not.toHaveClass('br-winner');
  expect(match.querySelector('.br-penalty-result')).not.toBeInTheDocument();
});
