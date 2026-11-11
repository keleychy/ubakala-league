import { isPredictionsAnnouncementActive } from './featureAnnouncements';

const launchTime = new Date('2026-11-11T13:18:19.960+01:00').getTime();
const oneWeek = 7 * 24 * 60 * 60 * 1000;

test('predictions announcement is active for exactly one week from launch', () => {
  expect(isPredictionsAnnouncementActive(launchTime - 1)).toBe(false);
  expect(isPredictionsAnnouncementActive(launchTime)).toBe(true);
  expect(isPredictionsAnnouncementActive(launchTime + oneWeek - 1)).toBe(true);
  expect(isPredictionsAnnouncementActive(launchTime + oneWeek)).toBe(false);
  expect(isPredictionsAnnouncementActive(launchTime + oneWeek + 1)).toBe(false);
});
