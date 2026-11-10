import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { predictionsApi } from '../api/predictionsApi';
import Predictions from './Predictions';

jest.mock('../api/predictionsApi', () => ({
  predictionsApi: {
    getConfiguration: jest.fn(),
    getFixtures: jest.fn(),
    getLeaderboard: jest.fn(),
    getStatistics: jest.fn(),
    register: jest.fn(),
    getHistory: jest.fn(),
    setPassword: jest.fn(),
    requestRecovery: jest.fn(),
    submit: jest.fn(),
    submitBatch: jest.fn()
  }
}));

const fixture = {
  id: 'fixture-1',
  season_id: 'season-2026',
  season_name: '2026 Junior Boys',
  stage: 'GROUP',
  match_date: '2026-11-10',
  kickoff_time: '16:00',
  home_team_name: 'Eagle FC',
  away_team_name: 'Rangers FC',
  home_team_id: 'team-eagle',
  away_team_id: 'team-rangers'
};
const secondFixture = {
  ...fixture,
  id: 'fixture-2',
  home_team_name: 'Lions FC',
  away_team_name: 'Wolves FC'
};

beforeEach(() => {
  jest.clearAllMocks();
  predictionsApi.getConfiguration.mockResolvedValue({
    enabled: true,
    registration_enabled: true,
    submissions_enabled: true,
    leaderboard_enabled: true,
    statistics_enabled: true,
    seasons: [{ id: 'season-2026', name: '2026 Junior Boys', category: 'junior_boys' }]
  });
  predictionsApi.getFixtures.mockResolvedValue([fixture, secondFixture]);
  predictionsApi.getLeaderboard.mockResolvedValue([]);
  predictionsApi.getStatistics.mockResolvedValue({});
  predictionsApi.register.mockResolvedValue({
    predictor_id: 'EAG-123',
    display_name: 'Alex Eagle',
    credential_type: 'password'
  });
  predictionsApi.getHistory.mockResolvedValue({
    predictor: { predictor_id: 'EAG-123', display_name: 'Alex Eagle', needs_password_update: false },
    predictions: []
  });
  predictionsApi.submitBatch.mockResolvedValue({
    submitted: 1,
    failed: 0,
    results: [{ fixture_id: 'fixture-1', success: true, updated: false }]
  });
});

test('registers a predictor and confirms an outcome before submitting', async () => {
  render(<Predictions />);

  fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'Eagle' } });
  fireEvent.change(screen.getByLabelText('Mobile phone number'), { target: { value: '08012345678' } });
  fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'eaglesWinEveryMatch!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Predictor ID' }));

  expect(await screen.findByText(/Your Predictor ID is EAG-123/)).toBeInTheDocument();
  expect(predictionsApi.register).toHaveBeenCalledWith({
    first_name: 'Alex',
    surname: 'Eagle',
    third_name: '',
    phone: '08012345678',
    password: 'eaglesWinEveryMatch!'
  });

  const outcomeGroup = screen.getByRole('group', { name: 'Predict Eagle FC versus Rangers FC' });
  fireEvent.click(within(outcomeGroup).getByRole('button', { name: '1 Home win' }));
  const secondOutcomeGroup = screen.getByRole('group', { name: 'Predict Lions FC versus Wolves FC' });
  fireEvent.click(within(secondOutcomeGroup).getByRole('button', { name: 'X Draw' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review and submit all' }));
  expect(screen.getByRole('region', { name: 'Batch prediction confirmation' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and submit all' }));

  await waitFor(() => {
    expect(predictionsApi.submitBatch).toHaveBeenCalledWith({
      predictor_id: 'EAG-123',
      access_code: 'eaglesWinEveryMatch!',
      predictions: [
        { fixture_id: 'fixture-1', selected_outcome: '1' },
        { fixture_id: 'fixture-2', selected_outcome: 'X' }
      ]
    });
  });
});

test('sends an account recovery request using the registered WhatsApp details', async () => {
  predictionsApi.requestRecovery.mockResolvedValue({
    message: 'We will contact you on WhatsApp after review.'
  });
  render(<Predictions />);
  fireEvent.click(await screen.findByRole('button', { name: 'Access my predictions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Forgot Predictor ID or password?' }));
  fireEvent.change(screen.getByLabelText('Full name used when registering'), { target: { value: 'Alex Eagle' } });
  fireEvent.change(screen.getByLabelText('WhatsApp number used when registering'), { target: { value: '08012345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request account recovery' }));

  await waitFor(() => {
    expect(predictionsApi.requestRecovery).toHaveBeenCalledWith({
      name: 'Alex Eagle',
      phone: '08012345678'
    });
  });
});

test('filters fixtures by category and date and paginates the result list', async () => {
    const manyFixtures = Array.from({ length: 14 }, (_, index) => ({
      ...fixture,
      id: `fixture-${index}`,
      home_team_name: `Team ${index}`,
      competition_category: index === 13 ? 'girls' : 'junior_boys',
      match_date: index === 13 ? '2026-11-11' : '2026-11-10'
    }));
    predictionsApi.getFixtures.mockResolvedValue(manyFixtures);
    predictionsApi.getConfiguration.mockResolvedValue({
      enabled: true,
      registration_enabled: true,
      submissions_enabled: true,
      leaderboard_enabled: true,
      statistics_enabled: true,
      seasons: [
        { id: 'season-2026', name: '2026 Junior Boys', category: 'junior_boys' },
        { id: 'girls-2026', name: '2026 Girls', category: 'girls' }
      ]
    });
    render(<Predictions />);

    expect(await screen.findByText('14 upcoming fixture(s) match your filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'girls' } });
    expect(await screen.findByText('1 upcoming fixture(s) match your filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-10' } });
    expect(await screen.findByText('13 upcoming fixture(s) match your filters.')).toBeInTheDocument();
});
