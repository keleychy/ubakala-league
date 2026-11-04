import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

let firebaseAuth;

export function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  const firebaseConfig = {
    apiKey: 'AIzaSyBlzljtqywbdL0sIWEO-EBvG3avZ1hO4Ak',
    authDomain: 'ubakala-league-admin.firebaseapp.com',
    projectId: 'ubakala-league-admin',
    appId: '1:177851897721:web:e564e3b08d7949e40341a8'
  };
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(
      `Firebase configuration is missing: ${missing.join(', ')}`
    );
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}
