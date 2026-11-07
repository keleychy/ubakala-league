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
    submit: jest.fn()
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
  predictionsApi.getFixtures.mockResolvedValue([fixture]);
  predictionsApi.getLeaderboard.mockResolvedValue([]);
  predictionsApi.getStatistics.mockResolvedValue({});
  predictionsApi.register.mockResolvedValue({
    predictor_id: 'EAG-123',
    display_name: 'Alex Eagle',
    access_code: 'PRIVATE-CODE'
  });
  predictionsApi.getHistory.mockResolvedValue({
    predictor: { predictor_id: 'EAG-123', display_name: 'Alex Eagle' },
    predictions: []
  });
  predictionsApi.submit.mockResolvedValue({
    prediction_id: 'prediction-1',
    selected_outcome: '1',
    updated: false
  });
});

test('registers a predictor and confirms an outcome before submitting', async () => {
  render(<Predictions />);

  fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'Eagle' } });
  fireEvent.change(screen.getByLabelText('Mobile phone number'), { target: { value: '08012345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Predictor ID' }));

  expect(await screen.findByText('PRIVATE-CODE')).toBeInTheDocument();
  expect(predictionsApi.register).toHaveBeenCalledWith({
    first_name: 'Alex',
    surname: 'Eagle',
    third_name: '',
    phone: '08012345678'
  });

  const outcomeGroup = screen.getByRole('group', { name: 'Predict Eagle FC versus Rangers FC' });
  fireEvent.click(within(outcomeGroup).getByRole('button', { name: '1 Home win' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review prediction' }));
  expect(screen.getByRole('region', { name: 'Prediction confirmation' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and submit' }));

  await waitFor(() => {
    expect(predictionsApi.submit).toHaveBeenCalledWith({
      predictor_id: 'EAG-123',
      access_code: 'PRIVATE-CODE',
      fixture_id: 'fixture-1',
      selected_outcome: '1'
    });
  });
});
