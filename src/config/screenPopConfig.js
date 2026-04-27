// ─────────────────────────────────────────────────────────────────
// CENTRAL SCREEN POP CONFIG — Web version (mirrors mobile exactly)
// Single file to control ALL agent-facing data across every screen
//
// Screens controlled:
//   1. Incoming call alert  (before answering — inbound)
//   2. Active call screen   (during the call — all types)
// ─────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────
// SECTION 1 — INBOUND DISPLAY RULES
// ─────────────────────────────────────────────────────────────────
export const INBOUND_DISPLAY = {
  showCallerNumber:   false,  // show phone number on incoming alert + call screen
  showQueueName:      true,   // show queue name pill on incoming alert
  showWaitTime:       true,   // show wait time in customer details
  showLoadingSpinner: true,   // show spinner while screen pop loads
};


// ─────────────────────────────────────────────────────────────────
// SECTION 2 — OUTBOUND / CAMPAIGN DISPLAY RULES
// ─────────────────────────────────────────────────────────────────
export const OUTBOUND_DISPLAY = {
  showCampaignName:  true,   // show campaign name below caller name
  showAttemptCount:  true,   // show "Attempt 2" pill
  showPreviewNotes:  true,   // show notes input on preview
};


// ─────────────────────────────────────────────────────────────────
// SECTION 3 — CUSTOMER DETAIL FIELDS
// Controls which fields show on the call screen for ALL call types
//
// key   = exact column name from your Genesys contact list
//         OR exact attribute key set in Architect "Set Participant Data"
//         Case-sensitive — must match exactly what Genesys sends
// label = friendly label the agent sees
//
// Add a row    → { key: 'yourColumn', label: 'Your Label' }
// Hide a row   → comment it out  // { key: 'segment', label: 'Segment' }
// Rename label → change the label value
// Reorder      → move rows up or down
// ─────────────────────────────────────────────────────────────────
export const SCREEN_POP_FIELDS = [
  { key: 'Firstname',     label: 'First Name'    },
  { key: 'LastName',      label: 'Last Name'     },
  { key: 'Country',       label: 'Country'       },
  { key: 'callReason',    label: 'Call reason'   },
  { key: 'segment',       label: 'Segment'       },
  { key: 'policyId',      label: 'Policy ID'     },
  { key: 'email',         label: 'Email'         },
  { key: 'city',          label: 'City'          },
  { key: 'product',       label: 'Product'       },
  { key: 'balance',       label: 'Balance'       },
  { key: 'dueDate',       label: 'Due date'      },
  { key: 'lastContact',   label: 'Last contact'  },
];


// ─────────────────────────────────────────────────────────────────
// HELPERS — used by ScreenPopCard and CallPage
// Do not edit below this line
// ─────────────────────────────────────────────────────────────────

// Build display rows from conversation/Architect attributes (inbound)
export const buildScreenPopRows = (attributes) => {
  if (!attributes) return [];
  return SCREEN_POP_FIELDS
    .filter(f => attributes[f.key] && String(attributes[f.key]).trim())
    .map(f => ({ label: f.label, value: String(attributes[f.key]) }));
};

// Build display rows from Genesys contact list record (outbound)
export const buildContactRows = (contactData) => {
  if (!contactData) return [];
  return SCREEN_POP_FIELDS
    .filter(f => contactData[f.key] && String(contactData[f.key]).trim())
    .map(f => ({ label: f.label, value: String(contactData[f.key]) }));
};


// ─────────────────────────────────────────────────────────────────
// NOISE FILTERS — strip system/internal keys from raw attributes
// ─────────────────────────────────────────────────────────────────
export const NOISE_PREFIXES   = ['scripting', 'system', 'flow'];
export const NOISE_EXACT      = [
  'scriptid', 'mediaid', 'mediatype', 'queueid', 'queuename',
  'flowid', 'flowname', 'contactid', 'contactlistid', 'campaignid',
  'campaignname', 'callable', 'wrapupcode', 'attemptindex',
  'lastattempt', 'callanalysisresult', 'abandoncode', 'abandoned',
  'waittime', 'interactionid', 'conversationid', 'systempresence',
  'connectedtime', 'disconnectedtime', 'starttime', 'endtime',
  'abandonmilliseconds', 'interactiontype',
  'dialercontactid', 'dialercontactlistid',
  'dialercampaignid', 'dialerinteractionid',
  'dialercontacttype',
];
export const NOISE_SUBSTRINGS = [
  'abandon', 'contactid', 'contactlist',
  'campaignid', 'waittime', 'millisecond', 'interactionid',
];
