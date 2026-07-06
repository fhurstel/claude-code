// UpFirst Lead Import Script
// Run this in the browser console on the Aqua Logic Plumbing Leads page to import UpFirst call leads

const UPFRIGHT_LEADS = [
  {
    name: "Emac",
    phone: "510-978-8901",
    email: "",
    address: "",
    company: "",
    source: "Upfirst Call",
    notes: "06/08/2026 - Caller says 'we've got a job online' for Francois. Left callback number.",
  },
  {
    name: "Andrea (Capital Realty Group)",
    phone: "650-437-5299",
    email: "",
    address: "2075 Palm, Unit 4",
    company: "Capital Realty Group",
    source: "Upfirst Call",
    notes: "06/08/2026 - Calling about June rent for 2075 Palm Unit 4. $500 outstanding balance. Wants to know when she can expect payment.",
  },
  {
    name: "Doctor Song (Kaiser)",
    phone: "510-248-3050",
    email: "",
    address: "",
    company: "Kaiser",
    source: "Upfirst Call",
    notes: "06/05/2026 - Doctor Song from Kaiser trying to reach Francois. Said they will call back in a few minutes.",
  },
  {
    name: "Clariza (Sunbelt)",
    phone: "916-517-4254",
    email: "",
    address: "",
    company: "Sunbelt",
    source: "Upfirst Call",
    notes: "05/28/2026 - Clariza from Sunbelt calling to clarify about a business listing they might be interested in.",
  },
];

(function importUpfirstLeads() {
  // Load existing data
  const STORAGE_KEY = 'profield_data';
  let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (!data.leads) data.leads = [];
  
  const existingPhones = new Set(data.leads.map(l => l.phone));
  let added = 0;
  let skipped = 0;
  
  UPFRIGHT_LEADS.forEach(lead => {
    const cleanPhone = lead.phone.replace(/[^\d]/g, '');
    const alreadyExists = data.leads.some(l => {
      const existing = (l.phone || '').replace(/[^\d]/g, '');
      return existing === cleanPhone && l.name === lead.name;
    });
    
    if (alreadyExists) {
      skipped++;
      return;
    }
    
    const newLead = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      ...lead,
      status: 'new',
      created_at: new Date().toISOString(),
    };
    data.leads.push(newLead);
    added++;
  });
  
  // Save
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  console.log(`✅ UpFirst Lead Import Complete:`);
  console.log(`   Added: ${added} new leads`);
  console.log(`   Skipped: ${skipped} duplicates`);
  console.log(`   Total leads now: ${data.leads.length}`);
  console.log('');
  console.log('🔄 Please refresh the page to see the new leads.');
})();
