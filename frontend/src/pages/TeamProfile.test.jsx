import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/api';
import TeamProfile from './TeamProfile';
import { getLagosDateKey, shiftDateKey } from '../utils/competition';

jest.mock('../api/api', () => ({
  api: {
    getTeams: jest.fn(),
    getMatches: jest.fn(),
    getSeasons: jest.fn(),
    getGroupsWithTeams: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getTeams.mockResolvedValue([{
    id: 'team-1',
    name: 'Avodim United',
    logo: null,
    profile_description: 'A team from the community.',
    profile_history: 'Founded by local football supporters.',
    home_community: 'Ubakala'
  }]);
  api.getSeasons.mockResolvedValue([{
    id: 'season-1',
    name: 'Senior Boys 2026',
    category: 'senior_boys'
  }]);
  api.getGroupsWithTeams.mockResolvedValue([{
    group: { id: 'group-a', season_id: 'season-1', name: 'Group A' },
    teams: [{ id: 'team-1', name: 'Avodim United' }]
  }]);
});

test('shows editable team information, category membership, upcoming fixtures and recent results', async () => {
  const today = getLagosDateKey();
  api.getMatches.mockResolvedValue([
    {
      id: 'recent-match',
      season_id: 'season-1',
      match_date: shiftDateKey(today, -2),
      status: 'FINISHED',
      home_team_id: 'team-1',
      home_team: { id: 'team-1', name: 'Avodim United' },
      away_team_id: 'team-2',
      away_team: { id: 'team-2', name: 'Other FC' },
      home_score: 2,
      away_score: 1
    },
    {
      id: 'upcoming-match',
      season_id: 'season-1',
      match_date: shiftDateKey(today, 3),
      status: 'SCHEDULED',
      home_team_id: 'team-2',
      home_team: { id: 'team-2', name: 'Other FC' },
      away_team_id: 'team-1',
      away_team: { id: 'team-1', name: 'Avodim United' },
      home_score: null,
      away_score: null
    }
  ]);

  render(
    <MemoryRouter initialEntries={['/teams/team-1']}>
      <Routes>
        <Route path="/teams/:id" element={<TeamProfile />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Avodim United' }))
    .toBeInTheDocument();
  expect(screen.getByText('A team from the community.')).toBeInTheDocument();
  expect(screen.getByText('Founded by local football supporters.')).toBeInTheDocument();
  expect(screen.getByText('Ubakala')).toBeInTheDocument();
  expect(screen.getByText('Senior Boys · Senior Boys 2026 · Group A')).toBeInTheDocument();
  expect(screen.getByText('Other FC vs Avodim United')).toBeInTheDocument();
  expect(screen.getByText('Avodim United vs Other FC')).toBeInTheDocument();
  expect(screen.getByText('2–1')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Upcoming fixtures' }))
    .toHaveTextContent('Senior Boys');
  expect(screen.getByRole('region', { name: 'Recent results' }))
    .toHaveTextContent('Senior Boys');
});

test('shows confirmed championships from completed finals and excludes unresolved finals', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'final-won',
      season_id: 'season-1',
      stage: 'FINAL',
      status: 'FINISHED',
      match_date: '2026-03-15',
      home_team_id: 'team-1',
      home_team: { id: 'team-1', name: 'Avodim United' },
      away_team_id: 'team-2',
      away_team: { id: 'team-2', name: 'Other FC' },
      home_score: 1,
      away_score: 1,
      home_penalties: 5,
      away_penalties: 4
    },
    {
      id: 'final-unresolved',
      season_id: 'season-1',
      stage: 'FINAL',
      status: 'LIVE',
      home_team_id: 'team-1',
      home_team: { id: 'team-1', name: 'Avodim United' },
      away_team_id: 'team-2',
      away_team: { id: 'team-2', name: 'Other FC' },
      home_score: 0,
      away_score: 0
    }
  ]);

  render(
    <MemoryRouter initialEntries={['/teams/team-1']}>
      <Routes>
        <Route path="/teams/:id" element={<TeamProfile />} />
      </Routes>
    </MemoryRouter>
  );

  const achievements = await screen.findByRole('region', {
    name: 'Confirmed season achievements'
  });
  expect(achievements).toHaveTextContent('Champions');
  expect(achievements).toHaveTextContent('Senior Boys · Senior Boys 2026');
  expect(achievements.querySelectorAll('li')).toHaveLength(1);
});
