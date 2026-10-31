import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirebaseAuth } from './firebaseClient';

export async function signInAdmin(email, password) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!credential.user.emailVerified) {
    try {
      await sendEmailVerification(credential.user);
    } finally {
      await signOut(auth);
    }
    throw new Error('Verify your email address before using administrator tools. A verification email has been sent.');
  }
  return credential.user;
}

export async function sendAdminPasswordReset(email) {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function signOutAdmin() {
  await signOut(getFirebaseAuth());
}
