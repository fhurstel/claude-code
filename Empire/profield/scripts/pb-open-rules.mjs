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
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });
  console.log(`UPDATED ${name}: list=${updated.listRule} view=${updated.viewRule}`);
}
