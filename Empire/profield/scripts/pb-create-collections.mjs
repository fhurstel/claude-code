import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@profield.local';
const ADMIN_PASSWORD = 'Pr0f1eld@dm!n2026';

const pb = new PocketBase(PB_URL);
await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
console.log('Admin auth OK');

const collections = [
  {
    name: 'leads',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'service_needed', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
    ],
  },
  {
    name: 'estimates',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'estimate_number', type: 'text', required: false },
      { name: 'client_id', type: 'text', required: false },
      { name: 'client_name', type: 'text', required: false },
      { name: 'client_email', type: 'text', required: false },
      { name: 'client_phone', type: 'text', required: false },
      { name: 'service_address', type: 'text', required: false },
      { name: 'title', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'service_type', type: 'text', required: false },
      { name: 'line_items', type: 'json', required: false },
      { name: 'tax_rate', type: 'number', required: false },
      { name: 'discount', type: 'number', required: false },
      { name: 'terms', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
      { name: 'client_action_at', type: 'text', required: false },
    ],
  },
  {
    name: 'jobs',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'job_number', type: 'text', required: false },
      { name: 'client_id', type: 'text', required: false },
      { name: 'client_name', type: 'text', required: false },
      { name: 'title', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'line_items', type: 'json', required: false },
      { name: 'status', type: 'text', required: false },
    ],
  },
  {
    name: 'invoices',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'invoice_number', type: 'text', required: false },
      { name: 'client_id', type: 'text', required: false },
      { name: 'client_name', type: 'text', required: false },
      { name: 'title', type: 'text', required: false },
      { name: 'line_items', type: 'json', required: false },
      { name: 'tax_rate', type: 'number', required: false },
      { name: 'discount', type: 'number', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
    ],
  },
  {
    name: 'payments',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'invoice_id', type: 'text', required: false },
      { name: 'amount', type: 'number', required: false },
      { name: 'method', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
    ],
  },
  {
    name: 'service_types',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'rate', type: 'number', required: false },
    ],
  },
  {
    name: 'settings',
    type: 'base',
    fields: [
      { name: 'app_id', type: 'text', required: true },
      { name: 'businessName', type: 'text', required: false },
      { name: 'defaultTaxRate', type: 'number', required: false },
      { name: 'defaultPaymentTerms', type: 'text', required: false },
      { name: 'defaultEstimateTerms', type: 'text', required: false },
      { name: 'defaultInvoiceNotes', type: 'text', required: false },
      { name: 'apiKey', type: 'text', required: false },
    ],
  },
];

for (const col of collections) {
  try {
    await pb.collections.getOne(col.name);
    console.log(`Collection '${col.name}' already exists, skipping`);
  } catch {
    try {
      await pb.collections.create(col);
      console.log(`✅ Created '${col.name}'`);
    } catch (err) {
      console.error(`❌ Failed '${col.name}':`, err.message);
    }
  }
}

// Verify
console.log('\n--- All collections ---');
const allCols = await pb.collections.getFullList();
for (const c of allCols) {
  console.log(`  ${c.name} (${c.type})`);
}

console.log('\n✅ All done!');
