import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';

const pb = new PocketBase(PB_URL);
await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

// Try creating one collection with full error output
try {
  const result = await pb.collections.create({
    name: 'clients',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'full_name', type: 'text', required: true },
      { name: 'email', type: 'email', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
    ],
  });
  console.log('Created:', result.name);
} catch (err) {
  console.error('Error message:', err.message);
  console.error('Error response:', JSON.stringify(err.response?.data || err.data || {}, null, 2));
  console.error('Status:', err.status);
}
