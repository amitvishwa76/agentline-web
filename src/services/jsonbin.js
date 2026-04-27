import { JSONBIN_CONFIG } from '../config/jsonbin.js';

const { baseUrl, apiKey } = JSONBIN_CONFIG;

export async function readContacts() {
  const res = await fetch(baseUrl, {
    headers: {
      'X-Master-Key': apiKey,
      'X-Bin-Meta': 'false',
    },
  });
  if (!res.ok) throw new Error('Failed to read JSONBin');
  const data = await res.json();
  return data.contacts || [];
}

export async function writeContacts(contacts) {
  const res = await fetch(baseUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
    },
    body: JSON.stringify({ contacts }),
  });
  if (!res.ok) throw new Error('Failed to write JSONBin');
  return res.json();
}

export async function updateContactAfterCall(contactId, wrapupCode) {
  const contacts = await readContacts();
  const updated = contacts.map((c) =>
    c.id === contactId
      ? { ...c, customer_contacted: 'Yes', disposition: wrapupCode }
      : c
  );
  await writeContacts(updated);
  return updated;
}
