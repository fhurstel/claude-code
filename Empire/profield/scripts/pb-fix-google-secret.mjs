import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const pb = new PocketBase(PB_URL);
const auth = await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
const token = auth.token;
console.log('Admin auth OK');

// Get current collection
const resp = await fetch(`${PB_URL}/api/collections/users`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const col = await resp.json();
console.log('Current OAuth2 providers:', JSON.stringify(col.oauth2?.providers));

// Update using the REST API with the full collection payload
const updateResp = await fetch(`${PB_URL}/api/collections/users`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    oauth2: {
      enabled: true,
      providers: [
        {
          name: 'google',
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
        }
      ],
      mappedFields: col.oauth2?.mappedFields || {
        id: '',
        name: 'name',
        username: '',
        avatarURL: 'avatar',
      },
    },
  }),
});

if (!updateResp.ok) {
  const errText = await updateResp.text();
  console.error('Update failed:', updateResp.status, errText);
  process.exit(1);
}

const updated = await updateResp.json();
const google = updated.oauth2?.providers?.find(p => p.name === 'google');
console.log('\n✅ Google OAuth2 updated via REST API');
console.log('Provider:', google?.name);
console.log('Client ID:', google?.clientId?.substring(0, 15) + '...');
console.log('Has secret:', !!google?.clientSecret);
console.log('Secret preview:', google?.clientSecret?.substring(0, 8) + '...');
console.log('OAuth2 enabled:', updated.oauth2?.enabled);
