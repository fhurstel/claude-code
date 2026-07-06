import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
await pb.admins.authWithPassword('admin@profield.local', 'Pr0f1eld@dm!n2026');

const collectionNames = [
  'clients',
  'leads',
  'estimates',
  'jobs',
  'invoices',
  'payments',
  'service_types',
  'settings',
];

for (const name of collectionNames) {
  const col = await pb.collections.getOne(name);
  const updated = await pb.collections.update(name, {
    ...col,
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  });
  console.log(`PUBLIC ${name}`);
}
