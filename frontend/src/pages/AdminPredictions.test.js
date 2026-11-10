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
    getRecoveryRequests: jest.fn(),
    reviewRecovery: jest.fn(),
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
  predictionsAdminApi.getRecoveryRequests.mockResolvedValue([{
    request_id: 'recovery-1',
    predictor_id: 'EAG-123',
    submitted_name: 'Recovery Applicant',
    submitted_phone: '+2348012345678',
    status: 'PENDING',
    submitted_at: '2026-11-10T12:00:00.000Z',
    admin_note: ''
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

  await screen.findByRole('heading', { name: 'Service overview' });
  fireEvent.click(screen.getByRole('button', { name: 'Fixtures & results' }));
  expect(await screen.findAllByText('Eagle FC vs Rangers FC')).toHaveLength(2);
  expect(screen.getByText('1 / 1 / 0')).toBeInTheDocument();
  expect(screen.getByText('Ready to settle')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Audit history' }));
  expect(screen.getByText('prediction.result.settled')).toBeInTheDocument();
});

test('loads prediction history for a selected predictor', async () => {
  render(<AdminPredictions />);

  await screen.findByRole('heading', { name: 'Service overview' });
  fireEvent.click(screen.getByRole('button', { name: 'Predictors' }));
  const search = await screen.findByRole('textbox', { name: 'Search predictor ID or name' });
  fireEvent.change(search, { target: { value: 'EAG-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  const resultRow = await screen.findByText('Alex Eagle');
  fireEvent.click(within(resultRow.closest('tr')).getByRole('button', { name: 'View history' }));

  await waitFor(() => {
    expect(predictionsAdminApi.getPredictorHistory).toHaveBeenCalledWith('EAG-123');
  });
  expect(await screen.findByRole('heading', { name: 'Alex Eagle · EAG-123' })).toBeInTheDocument();
  expect(await screen.findAllByText('Eagle FC vs Rangers FC')).toHaveLength(1);
});

test('requires a review note and prepares a temporary WhatsApp recovery code', async () => {
  window.prompt = jest.fn().mockReturnValue('Verified registered WhatsApp contact');
  predictionsAdminApi.reviewRecovery.mockResolvedValue({
    request_id: 'recovery-1',
    predictor_id: 'EAG-123',
    status: 'APPROVED',
    temporary_code: 'TEMP-123',
    whatsapp_message: 'Use temporary code TEMP-123 and create a new password.'
  });
  render(<AdminPredictions />);
  await screen.findByRole('heading', { name: 'Service overview' });
  fireEvent.click(screen.getByRole('button', { name: /Recovery/ }));
  const approval = await screen.findByRole('button', { name: 'Verify & approve' });
  fireEvent.click(approval);

  await waitFor(() => {
    expect(predictionsAdminApi.reviewRecovery).toHaveBeenCalledWith(
      'recovery-1',
      'APPROVE',
      'Verified registered WhatsApp contact'
    );
  });
  expect(await screen.findByText('TEMP-123')).toBeInTheDocument();
});

test('organizes admin tools into tabs and paginates fixture monitoring', async () => {
  predictionsAdminApi.getOverview.mockResolvedValue({
    fixtures: Array.from({ length: 16 }, (_, index) => ({
      fixture_id: `fixture-${index}`,
      home_team_name: `Home ${index}`,
      away_team_name: `Away ${index}`,
      season_name: '2026 Junior Boys',
      stage: 'GROUP',
      match_date: '2026-11-10',
      kickoff_time: '16:00',
      prediction_state: 'OPEN',
      total_predictions: 1,
      settled_predictions: 0,
      outcome_counts: { '1': 1, X: 0, '2': 0 }
    })),
    pending_settlements: [],
    pending_settlements_total: 0
  });
  render(<AdminPredictions />);
  expect(await screen.findByRole('heading', { name: 'Service overview' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'WhatsApp recovery requests' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Fixtures & results' }));
  expect(await screen.findByRole('heading', { name: 'Prediction activity by match' })).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(16);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getAllByRole('row')).toHaveLength(2);

  fireEvent.click(screen.getByRole('button', { name: /Recovery/ }));
  expect(await screen.findByRole('heading', { name: 'WhatsApp recovery requests' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Prediction activity by match' })).not.toBeInTheDocument();
});
