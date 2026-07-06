import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const pb = new PocketBase(PB_URL);

// Auth as admin
console.log('Authenticating as admin...');
await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
console.log('Admin auth OK');

// Get current users collection
console.log('\nFetching users collection...');
const usersCol = await pb.collections.getOne('users');

// Update with Google OAuth2 using the correct PB 0.39 structure
console.log('\nConfiguring Google OAuth2...');
const updated = await pb.collections.update('users', {
  ...usersCol,
  oauth2: {
    providers: [
      {
        name: 'google',
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      }
    ],
    mappedFields: {
      id: '',
      name: 'name',
      username: '',
      avatarURL: 'avatar',
    },
    enabled: true,
  },
});

console.log('\n✅ Google OAuth2 configured!');
console.log('OAuth2 enabled:', updated.oauth2?.enabled);
console.log('Providers:', JSON.stringify(updated.oauth2?.providers?.map(p => ({ name: p.name, clientId: p.clientId?.substring(0, 20) + '...' })), null, 2));

// Verify
const verify = await pb.collections.getOne('users');
console.log('\nVerification:');
console.log('OAuth2 enabled:', verify.oauth2?.enabled);
console.log('Google provider:', verify.oauth2?.providers?.find(p => p.name === 'google') ? '✅ Present' : '❌ Missing');
console.log('Client ID starts with:', verify.oauth2?.providers?.find(p => p.name === 'google')?.clientId?.substring(0, 10) + '...');
