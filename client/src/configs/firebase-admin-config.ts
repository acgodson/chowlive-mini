import admin from 'firebase-admin';

/////////////////////////////////////////////
/* Firebase Admin Service Account Config */
/////////////////////////////////////////////

export const serviceAccount = {
  type: 'service_account',
  project_id: 'chow-live',
  private_key_id: process.env.CHOW_LIVE_FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.CHOW_LIVE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: 'firebase-adminsdk-l8dcl@chow-live.iam.gserviceaccount.com',
  client_id: '105904647779044923885',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-l8dcl%40chow-live.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: 'https://your-project-id.firebaseio.com',
  });
}

export default admin;
