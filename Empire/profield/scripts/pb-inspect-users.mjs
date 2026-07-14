import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const pb = new PocketBase(PB_URL);

// Auth as admin
const authResult = await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
console.log('Admin auth OK');

// Get the users collection and inspect its full structure
const usersCol = await pb.collections.getOne('users');
console.log('\nFull users collection object:');
console.log(JSON.stringify(usersCol, null, 2));
