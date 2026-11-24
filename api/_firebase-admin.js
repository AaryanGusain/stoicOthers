let firebaseAdminApp;

function getServiceAccount() {
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
    } catch (_error) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  throw new Error('Firebase Admin credentials are not configured');
}

async function getFirebaseAuth() {
  const { getApps, initializeApp, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');

  if (!firebaseAdminApp) {
    firebaseAdminApp = getApps().find(app => app.name === 'stoic-web-subscriptions');
    if (!firebaseAdminApp) {
      firebaseAdminApp = initializeApp(
        { credential: cert(getServiceAccount()) },
        'stoic-web-subscriptions'
      );
    }
  }

  return getAuth(firebaseAdminApp);
}

async function verifyFirebaseBearerToken(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    const error = new Error('Firebase authentication is required');
    error.statusCode = 401;
    throw error;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    const error = new Error('Firebase authentication is required');
    error.statusCode = 401;
    throw error;
  }

  const auth = await getFirebaseAuth();
  try {
    return await auth.verifyIdToken(token, true);
  } catch (_error) {
    const error = new Error('Firebase authentication is invalid or expired');
    error.statusCode = 401;
    throw error;
  }
}

module.exports = {
  verifyFirebaseBearerToken
};
