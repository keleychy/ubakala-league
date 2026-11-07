import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { predictionsAdminApi } from '../api/predictionsApi';
import AdminPredictions from './AdminPredictions';

jest.mock('../api/predictionsApi', () => ({
  predictionsAdminApi: {
    getSummary: jest.fn(),
    getOverview: jest.fn(),
    getAuditHistory: jest.fn(),
    getPredictorHistory: jest.fn(),
    searchPredictors: jest.fn(),
    initialize: jest.fn(),
    settle: jest.fn(),
    setSetting: jest.fn(),
    setAccountStatus: jest.fn(),
    resetAccessCode: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  predictionsAdminApi.getSummary.mockResolvedValue({
    settings: { points_per_correct_prediction: '1' },
    statistics: {
      registered_predictors: 1,
      total_predictions: 2,
      correct_predictions: 1
    },
    leaderboard: [],
    pending_settlements: 1,
    seasons: []
  });
  predictionsAdminApi.getOverview.mockResolvedValue({
    fixtures: [{
      fixture_id: 'fixture-1',
      home_team_name: 'Eagle FC',
      away_team_name: 'Rangers FC',
      season_name: '2026 Junior Boys',
      stage: 'GROUP',
      match_date: '2026-11-10',
      kickoff_time: '16:00',
      prediction_state: 'COMPLETED',
      total_predictions: 2,
      settled_predictions: 1,
      outcome_counts: { '1': 1, X: 1, '2': 0 }
    }],
    pending_settlements: [{
      prediction_id: 'prediction-1',
      predictor_id: 'EAG-123',
      match: 'Eagle FC vs Rangers FC',
      match_date: '2026-11-10',
      selected_outcome: '1',
      official_outcome: '1',
      issue: 'Ready to settle'
    }],
    pending_settlements_total: 1
  });
  predictionsAdminApi.getAuditHistory.mockResolvedValue([{
    timestamp: '2026-11-10T12:00:00.000Z',
    user_email: 'admin@example.com',
    action: 'prediction.result.settled',
    entity_type: 'Prediction Results',
    entity_id: 'prediction-1',
    old_value: 'null',
    new_value: '{"settlement_status":"SETTLED"}',
    reason: ''
  }]);
  predictionsAdminApi.searchPredictors.mockResolvedValue([{
    predictor_id: 'EAG-123',
    display_name: 'Alex Eagle',
    account_status: 'ACTIVE',
    registration_date: '2026-10-01'
  }]);
  predictionsAdminApi.getPredictorHistory.mockResolvedValue({
    predictor: {
      predictor_id: 'EAG-123',
      display_name: 'Alex Eagle',
      account_status: 'ACTIVE'
    },
    predictions: [{
      prediction_id: 'prediction-1',
      match: 'Eagle FC vs Rangers FC',
      match_date: '2026-11-10',
      selected_outcome: '1',
      official_result: '1',
      settlement_status: 'SETTLED',
      points_awarded: 1,
      revision_count: 2
    }]
  });
});

test('shows fixture activity, pending settlement, and audit history', async () => {
  render(<AdminPredictions />);

  expect(await screen.findAllByText('Eagle FC vs Rangers FC')).toHaveLength(2);
  expect(screen.getByText('1 / 1 / 0')).toBeInTheDocument();
  expect(screen.getByText('Ready to settle')).toBeInTheDocument();
  expect(screen.getByText('prediction.result.settled')).toBeInTheDocument();
});

test('loads prediction history for a selected predictor', async () => {
  render(<AdminPredictions />);

  const search = await screen.findByRole('textbox', { name: 'Search predictor ID or name' });
  fireEvent.change(search, { target: { value: 'EAG-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  const resultRow = await screen.findByText('Alex Eagle');
  fireEvent.click(within(resultRow.closest('tr')).getByRole('button', { name: 'View history' }));

  await waitFor(() => {
    expect(predictionsAdminApi.getPredictorHistory).toHaveBeenCalledWith('EAG-123');
  });
  expect(await screen.findByRole('heading', { name: 'Alex Eagle · EAG-123' })).toBeInTheDocument();
  expect(await screen.findAllByText('Eagle FC vs Rangers FC')).toHaveLength(3);
});
