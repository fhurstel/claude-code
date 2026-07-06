import PocketBase from 'pocketbase';

// Use the same origin as the browser to avoid mixed content issues
// This works on both HTTP and HTTPS automatically
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || (typeof window !== 'undefined' ? window.location.origin + '/pb' : '/pb');
export const pb = new PocketBase(PB_URL);

const sortByCollection = {
  clients: '-created_at',
  leads: '-created_at',
  estimates: '-created_at',
  jobs: '-created_at',
  invoices: '-created_at',
  payments: '-created_at',
  service_types: 'name',
};

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeRecord(record) {
  if (!record) return record;
  const appId = record.app_id || record.id;
  return {
    ...record,
    id: appId,
    app_id: appId,
    pb_id: record.id,
  };
}

function toPocketBasePayload(record) {
  const payload = { ...record };
  const appId = payload.app_id || payload.id;
  delete payload.id;
  delete payload.pb_id;
  delete payload.collectionId;
  delete payload.collectionName;
  delete payload.expand;
  delete payload.created;
  delete payload.updated;
  if (appId) payload.app_id = appId;
  return payload;
}

async function listCollection(name) {
  const sort = sortByCollection[name] || '-created_at';
  try {
    const items = await pb.collection(name).getFullList({ sort });
    return items.map(normalizeRecord);
  } catch {
    // If sort fails (e.g. field doesn't exist yet), try without sort
    try {
      const items = await pb.collection(name).getFullList();
      return items.map(normalizeRecord);
    } catch {
      return [];
    }
  }
}

async function createRecord(name, data) {
  const created = await pb.collection(name).create(toPocketBasePayload(data));
  return normalizeRecord(created);
}

async function updateRecord(name, idOrAppId, data) {
  // Try to find by app_id first, then fall back to direct PB ID lookup
  let existing = await findByAppId(name, idOrAppId);
  if (!existing) {
    // Try direct PB ID lookup as fallback
    try {
      const direct = await pb.collection(name).getOne(idOrAppId);
      existing = normalizeRecord(direct);
    } catch {
      throw new Error(`Record not found in ${name}: ${idOrAppId}`);
    }
  }
  const pbId = existing.pb_id || existing.id;
  const updated = await pb.collection(name).update(pbId, toPocketBasePayload(data));
  return normalizeRecord(updated);
}

async function deleteRecord(name, idOrAppId) {
  let existing = await findByAppId(name, idOrAppId);
  if (!existing) {
    // Try direct PB ID lookup as fallback
    try {
      const direct = await pb.collection(name).getOne(idOrAppId);
      existing = normalizeRecord(direct);
    } catch {
      return; // Record doesn't exist, nothing to delete
    }
  }
  const pbId = existing.pb_id || existing.id;
  await pb.collection(name).delete(pbId);
}

async function findByAppId(name, idOrAppId) {
  if (!idOrAppId) return null;
  try {
    const record = await pb.collection(name).getFirstListItem(`app_id = "${String(idOrAppId).replace(/"/g, '\\"')}"`);
    return normalizeRecord(record);
  } catch {
    return null;
  }
}

async function syncCollection(name, prevItems = [], nextItems = []) {
  const prevMap = new Map(prevItems.map(item => [item.id, item]));
  const nextMap = new Map(nextItems.map(item => [item.id, item]));

  for (const [id, prev] of prevMap.entries()) {
    if (!nextMap.has(id)) {
      await deleteRecord(name, prev.app_id || prev.id);
    }
  }

  for (const [id, next] of nextMap.entries()) {
    const prev = prevMap.get(id);
    if (!prev) {
      await createRecord(name, next);
      continue;
    }

    const prevComparable = toPocketBasePayload(prev);
    const nextComparable = toPocketBasePayload(next);
    if (!deepEqual(prevComparable, nextComparable)) {
      await updateRecord(name, next.app_id || next.id, next);
    }
  }

  return listCollection(name);
}

export async function login(email, password) {
  try {
    // PB 0.39+ requires 'identity' field instead of 'email' in the auth endpoint
    // The JS SDK 0.27 still sends 'email', so we use the raw API call
    const result = await pb.send('/api/collections/users/auth-with-password', {
      method: 'POST',
      body: { identity: email, password },
    });
    // Set the auth store manually from the response
    if (result.token) {
      // Ensure record has required fields for authStore model
      const model = result.record || {}
      // Normalize the model to have required fields
      const payload = JSON.parse(atob(result.token.split('.')[1]))
      const authModel = {
        id: model.id || payload.id,
        email: model.email || model.identity || email,
        verified: model.verified !== false,
        type: 'auth',
        ...model,
      }
      pb.authStore.save(result.token, authModel)
      // Persist to localStorage as backup
      try {
        localStorage.setItem('pocketbase_auth', JSON.stringify({
          token: result.token,
          model: authModel,
        }))
      } catch { /* ignore */ }
    }
    return { success: true, ...result };
  } catch (err) {
    console.error('PB login error:', err?.message || err, 'status:', err?.status, 'url:', err?.url);
    if (err?.status === 400) {
      throw new Error('Invalid email or password');
    }
    if (err?.status === 403) {
      throw new Error('Account not verified or disabled');
    }
    if (err?.status === 429) {
      throw new Error('Too many login attempts. Wait a moment and try again.');
    }
    throw new Error(err?.message || 'Login failed. Check your connection.');
  }
}

export function loginWithGoogle() {
  // PB 0.39 has a bug where the OAuth2 redirect_uri is empty in the auth URL
  // when using custom OAuth2 providers. We work around this by:
  // 1. Getting the auth methods (which includes the Google auth URL)
  // 2. Manually setting the redirect_uri to the correct value
  // 3. Opening the popup with the corrected URL
  // 4. The realtime subscription handles the rest
  return pb.collection('users').listAuthMethods().then((methods) => {
    const google = methods.oauth2.providers.find(p => p.name === 'google');
    if (!google) throw new Error('Google OAuth2 provider not configured');

    // Build the correct redirect URI - must match what's registered in Google Cloud Console
    const redirectUri = pb.buildURL('/api/oauth2-redirect');

    // Fix the auth URL by replacing the empty redirect_uri
    let authUrl = google.authUrl;
    if (authUrl.includes('redirect_uri=')) {
      // Replace empty redirect_uri with the correct one
      authUrl = authUrl.replace(/redirect_uri=(&|$)/, 'redirect_uri=' + encodeURIComponent(redirectUri) + '&');
    } else {
      // Append redirect_uri if not present
      authUrl += (authUrl.includes('?') ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(redirectUri);
    }

    // Open the Google auth popup with our corrected URL.
    // The realtime auth listener in context.jsx handles the actual auth completion.
    // We return immediately so the UI doesn't hang waiting for a promise.
    window.open(
      authUrl,
      'pb_oauth2_popup',
      `width=500,height=600,top=${(window.innerHeight - 600) / 2},left=${(window.innerWidth - 500) / 2},resizable,menubar=no`
    );
    // Return a resolved promise so the Login page doesn't show an error
    return Promise.resolve({ success: true });
  });
}

export function logout() {
  pb.authStore.clear();
}

export function getCurrentUser() {
  // If authStore has no model but token exists, try to restore from localStorage
  if (!pb.authStore.model && pb.authStore.token) {
    try {
      const stored = localStorage.getItem('pocketbase_auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.token && parsed.model) {
          pb.authStore.save(parsed.token, parsed.model)
          return pb.authStore.model
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return pb.authStore.model;
}

export function isAuthenticated() {
  // Ensure model is loaded before checking validity
  if (!pb.authStore.model && pb.authStore.token) {
    getCurrentUser()
  }
  return pb.authStore.isValid;
}

export function onAuthChange(callback) {
  return pb.authStore.onChange(() => callback(pb.authStore.model, pb.authStore.isValid));
}

export const clients = {
  list: () => listCollection('clients'),
  create: (data) => createRecord('clients', data),
  update: (id, data) => updateRecord('clients', id, data),
  delete: (id) => deleteRecord('clients', id),
  sync: (prev, next) => syncCollection('clients', prev, next),
};

export const leads = {
  list: () => listCollection('leads'),
  create: (data) => createRecord('leads', data),
  update: (id, data) => updateRecord('leads', id, data),
  delete: (id) => deleteRecord('leads', id),
  sync: (prev, next) => syncCollection('leads', prev, next),
};

export const estimates = {
  list: () => listCollection('estimates'),
  create: (data) => createRecord('estimates', data),
  update: (id, data) => updateRecord('estimates', id, data),
  delete: (id) => deleteRecord('estimates', id),
  sync: (prev, next) => syncCollection('estimates', prev, next),
};

export const jobs = {
  list: () => listCollection('jobs'),
  create: (data) => createRecord('jobs', data),
  update: (id, data) => updateRecord('jobs', id, data),
  delete: (id) => deleteRecord('jobs', id),
  sync: (prev, next) => syncCollection('jobs', prev, next),
};

export const invoices = {
  list: () => listCollection('invoices'),
  create: (data) => createRecord('invoices', data),
  update: (id, data) => updateRecord('invoices', id, data),
  delete: (id) => deleteRecord('invoices', id),
  sync: (prev, next) => syncCollection('invoices', prev, next),
};

export const payments = {
  list: () => listCollection('payments'),
  create: (data) => createRecord('payments', data),
  update: (id, data) => updateRecord('payments', id, data),
  delete: (id) => deleteRecord('payments', id),
  sync: (prev, next) => syncCollection('payments', prev, next),
};

export const serviceTypes = {
  list: () => listCollection('service_types'),
  create: (data) => createRecord('service_types', data),
  update: (id, data) => updateRecord('service_types', id, data),
  delete: (id) => deleteRecord('service_types', id),
  sync: (prev, next) => syncCollection('service_types', prev, next),
};

export const settings = {
  async get() {
    const records = await pb.collection('settings').getFullList();
    return records[0] ? normalizeRecord(records[0]) : null;
  },
  async update(data) {
    const records = await pb.collection('settings').getFullList();
    if (!records.length) {
      return normalizeRecord(await pb.collection('settings').create(toPocketBasePayload({ ...data, app_id: 'singleton' })));
    }
    return normalizeRecord(await pb.collection('settings').update(records[0].id, toPocketBasePayload(data)));
  },
};

export function subscribeToCollection(collectionName, callback) {
  return pb.collection(collectionName).subscribe('*', callback);
}
