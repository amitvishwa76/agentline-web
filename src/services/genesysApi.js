import { GENESYS_CONFIG } from '../config/genesys.js';

const BASE = GENESYS_CONFIG.apiBase;

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiFetch(token, path, options = {}) {
  const url = `${BASE}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${path}`, options.body ? JSON.parse(options.body) : '');
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(token), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[API] ${res.status} ${path}:`, text);
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Participant-level PATCH — matches mobile exactly
export const patchParticipant = (token, convoId, participantId, body) =>
  apiFetch(token, `/conversations/calls/${convoId}/participants/${participantId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// Communication-level PATCH — used ONLY for disconnect (matches mobile disconnectCall)
export const patchCommunication = (token, convoId, participantId, commId, body) =>
  apiFetch(token, `/conversations/calls/${convoId}/participants/${participantId}/communications/${commId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// ── Auth ──────────────────────────────────────────────
export async function exchangeCodeForToken(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  GENESYS_CONFIG.redirectUri,
    client_id:     GENESYS_CONFIG.clientId,
    code_verifier: codeVerifier,
  });
  const res = await fetch(GENESYS_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

// ── User ──────────────────────────────────────────────
export const getMe = (token) => apiFetch(token, '/users/me');

export const getAgentQueues = (token, userId) =>
  apiFetch(token, `/users/${userId}/queues?pageSize=100&joined=true`);

// ── Presence ──────────────────────────────────────────
export const getPresenceDefinitions = (token) =>
  apiFetch(token, '/presencedefinitions?pageSize=50');

export const setPresence = (token, userId, presenceId) =>
  apiFetch(token, `/users/${userId}/presences/PURECLOUD`, {
    method: 'PATCH',
    body: JSON.stringify({ presenceDefinition: { id: presenceId } }),
  });

// ── Conversations ─────────────────────────────────────
export const getConversations = (token) =>
  apiFetch(token, '/conversations');

export const getConversation = (token, convoId) =>
  apiFetch(token, `/conversations/${convoId}`);

// ── Call controls — all match mobile GenesysAPI.js exactly ───

// Answer
export const answerCall = (token, convoId, participantId) =>
  patchParticipant(token, convoId, participantId, { state: 'connected' });

// Mute — participant-level { muted: true/false }
export const setMute = (token, convoId, participantId, muted) =>
  patchParticipant(token, convoId, participantId, { muted });

// Hold — participant-level { held: true/false }
export const setHold = (token, convoId, participantId, held) =>
  patchParticipant(token, convoId, participantId, { held });

// Disconnect via communication object (matches mobile disconnectCall)
export const disconnectCallComm = (token, convoId, participantId, commId) =>
  patchCommunication(token, convoId, participantId, commId, { state: 'disconnected' });

// Disconnect via participant (fallback if no commId)
export const disconnectCallParticipant = (token, convoId, participantId) =>
  patchParticipant(token, convoId, participantId, { state: 'disconnected' });

// ── Wrapup — matches mobile handleSubmitWrapup exactly ───────
// Mobile sends wrapup code + state:disconnected in ONE single PATCH call
export const submitWrapup = (token, convoId, participantId, wrapupCode, notes) =>
  patchParticipant(token, convoId, participantId, {
    wrapup: { code: wrapupCode.id, name: wrapupCode.name, notes: notes || '' },
    state: 'disconnected',
  });

// ── Wrapup codes ─────────────────────────────────────────────────
// Accepts queueId (preferred, exact) OR queueName (fallback search)
export const getQueueWrapupCodes = async (token, queueName, queueId) => {
  console.log('[Wrapup] fetching codes. queueId:', queueId, 'queueName:', queueName);

  // Step 1: Use queueId directly — no name search needed, exact match
  if (queueId && queueId.trim()) {
    try {
      const res = await fetch(
        `${BASE}/routing/queues/${queueId.trim()}/wrapupcodes?pageSize=100`,
        { headers: authHeaders(token) }
      );
      console.log('[Wrapup] queueId lookup status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Wrapup] queue-specific codes:', data.entities?.length);
        if (data.entities?.length > 0) return data.entities;
      }
    } catch (e) {
      console.warn('[Wrapup] queueId lookup failed:', e.message);
    }
  }

  // Step 2: Search by name if no queueId
  if (queueName && queueName.trim()) {
    try {
      const res = await fetch(
        `${BASE}/routing/queues?name=${encodeURIComponent(queueName.trim())}&pageSize=5`,
        { headers: authHeaders(token) }
      );
      if (res.ok) {
        const data  = await res.json();
        const queue = data.entities?.[0];
        console.log('[Wrapup] queue name search found:', queue?.name, queue?.id);
        if (queue?.id) {
          const wRes = await fetch(
            `${BASE}/routing/queues/${queue.id}/wrapupcodes?pageSize=100`,
            { headers: authHeaders(token) }
          );
          if (wRes.ok) {
            const wData = await wRes.json();
            console.log('[Wrapup] queue name codes:', wData.entities?.length);
            if (wData.entities?.length > 0) return wData.entities;
          }
        }
      }
    } catch (e) {
      console.warn('[Wrapup] queue name lookup failed:', e.message);
    }
  }

  // Step 3: Org-level fallback — /routing/wrapupcodes (APS1 compatible)
  console.log('[Wrapup] falling back to org-level /routing/wrapupcodes');
  try {
    const res = await fetch(`${BASE}/routing/wrapupcodes?pageSize=100`, { headers: authHeaders(token) });
    if (res.ok) {
      const data = await res.json();
      console.log('[Wrapup] org codes:', data.entities?.length);
      return data.entities || [];
    }
  } catch (e) {
    console.error('[Wrapup] org fallback failed:', e.message);
  }

  return [];
};

// ── Place outbound call ───────────────────────────────
export const placeCall = (token, phoneNumber, queueId) =>
  apiFetch(token, '/conversations/calls', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, callFromQueueId: queueId }),
  });

// ── Campaigns / outbound ──────────────────────────────
export const getCampaign = (token, campaignId) =>
  apiFetch(token, `/outbound/campaigns/${campaignId}`);

export const getContactRecord = (token, listId, contactId) =>
  apiFetch(token, `/outbound/contactlists/${listId}/contacts/${contactId}`);

// ── Stations ─────────────────────────────────────────
export const getStations = (token) =>
  apiFetch(token, '/stations?pageSize=100');

export const associateStation = (token, userId, stationId) =>
  apiFetch(token, `/users/${userId}/station`, {
    method: 'PATCH',
    body: JSON.stringify({ associatedStation: { id: stationId } }),
  });

export const disassociateStation = (token, userId) =>
  apiFetch(token, `/users/${userId}/station`, { method: 'DELETE' });

// ── Helpers ───────────────────────────────────────────
export function findAgentParticipant(participants) {
  return (
    participants.find((p) => p.purpose === 'agent') ||
    participants.find((p) => p.purpose === 'user') ||
    participants.find(
      (p) =>
        p.calls?.length > 0 &&
        p.purpose !== 'customer' &&
        p.purpose !== 'external' &&
        p.purpose !== 'acd'
    )
  );
}

export function isPhoneNumber(str) {
  if (!str) return false;
  const cleaned = str.replace(/[\s\-\+\(\)]/g, '');
  const digits  = cleaned.replace(/\D/g, '');
  return digits.length >= 6 && digits.length / cleaned.length > 0.6;
}
