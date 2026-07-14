const PocketBase = require('pocketbase');

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function main() {
  const pb = new PocketBase(PB_URL);

  // Step 1: Auth as admin
  console.log('Authenticating as admin...');
  try {
    const authResult = await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin auth successful, token:', authResult.token?.substring(0, 20) + '...');
  } catch (err) {
    console.error('Admin auth failed:', err.message);
    console.error('Error data:', JSON.stringify(err.response?.data || err.data || {}, null, 2));
    process.exit(1);
  }

  // Step 2: List collections
  console.log('\nListing collections...');
  try {
    const collections = await pb.collections.getFullList();
    console.log('Collections:', collections.map(c => `${c.name} (${c.type})`).join(', '));
  } catch (err) {
    console.error('List collections failed:', err.message);
  }

  // Step 3: Get or create the 'users' auth collection
  let usersCollection;
  try {
    usersCollection = await pb.collections.getOne('users');
    console.log('\nFound existing users collection');
  } catch (err) {
    console.log('\nCreating users auth collection...');
    try {
      usersCollection = await pb.collections.create({
        name: 'users',
        type: 'auth',
        schema: [],
        options: {
          allowEmailAuth: true,
          allowOAuth2Auth: true,
          allowUsernameAuth: false,
          minPasswordLength: 8,
          requireEmail: true,
        },
      });
      console.log('Users collection created');
    } catch (createErr) {
      console.error('Create users collection failed:', createErr.message);
      process.exit(1);
    }
  }

  // Step 4: Update users collection to enable Google OAuth2
  console.log('\nConfiguring Google OAuth2 on users collection...');
  try {
    const updated = await pb.collections.update('users', {
      ...usersCollection,
      options: {
        ...usersCollection.options,
        oauth2: {
          providers: [
            {
              name: 'google',
              clientId: GOOGLE_CLIENT_ID,
              clientSecret: GOOGLE_CLIENT_SECRET,
            }
          ],
          mappedFields: {
            email: 'email',
            name: 'name',
            avatarUrl: 'avatarUrl',
          },
        },
      },
    });
    console.log('Google OAuth2 configured successfully!');
    console.log('OAuth2 providers:', JSON.stringify(updated.options?.oauth2?.providers?.map(p => p.name)));
  } catch (err) {
    console.error('OAuth2 config failed:', err.message);
    console.error('Error data:', JSON.stringify(err.response?.data || err.data || {}, null, 2));
    process.exit(1);
  }

  console.log('\n✅ Done! Google OAuth2 is configured.');
  console.log('Test it at: http://64.23.128.236/');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
