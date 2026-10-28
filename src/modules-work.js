/* ==================================================================
   Requests and Projects. (The shared parts, Vault and Templates are in
   modules.js.)
================================================================== */

/* ==================================================================
   Requests
   What the business asks legal for. A request is read the moment it
   arrives — what kind it is, which playbook or template it belongs to,
   and where it already crosses a line — so the first thing a lawyer
   sees is a first pass, not an inbox.
================================================================== */
const mxRequest = (id) => mxData().requests.find(r => r.id === id) || null;
const MX_REQ_TYPES = ['Contract review', 'New contract', 'Legal question', 'Signature'];

/* a due date said the way you would say it: today, tomorrow, late */
function mxDue(iso, done) {
  const d = new Date(iso), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 864e5);
  const text = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return h('span', { class: 'mx-due' + (!done && diff < 0 ? ' is-late' : !done && diff <= 1 ? ' is-soon' : '') }, text);
}

function requestsView() {
  const o = MX.requests.open;
  if (o === 'new') return mxCreatePage({ view: 'requests', back: 'Contracts', title: 'New Contract',
    placeholder: 'Describe what you need from legal, or add the document', run: buildRequest });
  const r = o && mxRequest(o);
  if (o && !r) MX.requests.open = null;
  return r ? requestPage(r) : requestList();
}

function requestList() {
  const d = mxData();
  const order = { new: 0, progress: 1, waiting: 2, done: 3 };
  const t = mxTable({
    label: 'Contracts', st: MX.requests.list, empty: 'No contracts yet.',
    grid: 'minmax(240px, 2.2fr) minmax(104px, 1fr) minmax(140px, 1fr) minmax(112px, 1fr) minmax(76px, 1fr) 32px',
    cols: [{ key: 'title', label: 'Contract' }, { key: 'type', label: 'Type' }, { key: 'requester', label: 'Requester' },
      { key: 'status', label: 'Status' }, { key: 'due', label: 'Due' }],
    tabs: Object.entries(MX_ST.req).map(([k, v]) => ({ k, label: v.label })),
    tabOf: (r) => r.status,
    items: () => d.requests,
    text: (r) => [r.id, r.title, r.type, r.requester, r.team, r.counterparty, r.detail].join(' '),
    val: (r, k) => k === 'status' ? order[r.status] : k === 'due' ? r.due : k === 'updated' ? r.updated : (r[k] || '').toLowerCase(),
    cells: (r) => [[h('span', { class: 'mx-req-id' }, r.id), h('span', { class: 'pb-row-name' }, r.title || 'Untitled request')],
      r.type, mxPerson(r.requester),
      /* the status changes where you see it; the tabs recount as it does */
      mxStatusBtn('req', r, () => setTimeout(t.paint, 420)),
      mxDue(r.due, r.status === 'done')],
    open: (r) => mxOpen('requests', r.id),
    menu: (r, row) => [
      { label: 'Open', icon: 'files', run: () => mxOpen('requests', r.id) },
      { label: 'Review with Clavia', icon: 'ask', run: () => requestChat(r) },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(d.requests, r, row, 'request', (back) => back && t.paint()) },
    ],
  });
  return mxListPage('Contracts', mxCta('New Contract', () => mxOpen('requests', 'new')), t.el);
}

/* Scripted for now: what kind of request it is, and what it belongs to,
   read from the words. The seam for a real triage. */
function buildRequest(text, files, step) {
  const all = text + ' ' + files.join(' ');
  const type = /\bsign(ature|ed)?\b|countersign/i.test(all) ? 'Signature'
    : /review|redline|their paper|sent (back|over)|mark-?up|comments on/i.test(all) || (files.length && !/draft|need an?\b/i.test(text)) ? 'Contract review'
    : /\?|can we|are we|is it|do we|allowed|enforceable/i.test(text) && !files.length ? 'Legal question' : 'New contract';
  const kind = (PB_KINDS.find(k => k.re.test(all)) || {}).id;
  const pb = kind && pbList().find(p => p.id === kind);
  const tpl = MX_SEED.templates.find(t => t.id === (MX_TPL_KINDS.find(([re]) => re.test(all)) || [])[1]);
  const title = (text ? draftName(text) : files[0]?.replace(/\.[a-z0-9]+$/i, '')) || 'Untitled request';
  const n = Math.max(...mxData().requests.map(r => +r.id.split('-')[1] || 0)) + 1;
  step('Reading the request');
  setTimeout(() => step(type === 'Contract review' && pb ? `Checking it against the ${pb.name} playbook`
    : type === 'New contract' ? 'Looking for a template that fits' : 'Working out who should pick it up'), 1000);
  setTimeout(() => {
    const due = new Date(Date.now() + 5 * 864e5).toISOString();
    const r = { id: 'REQ-' + n, title, type, requester: USER.name, team: 'Legal', status: 'new', due, created: mxNow(), updated: mxNow(),
      counterparty: null, playbook: type === 'Contract review' && pb ? pb.id : null, template: type === 'New contract' && tpl ? tpl.id : null,
      files: files.map(name => ({ name })), detail: text || `Please look at ${files.join(', ')}.`,
      firstPass: {
        summary: type === 'Contract review' && pb ? `Matched to the ${pb.name} playbook. Open it with Clavia to go through it clause by clause.`
          : type === 'New contract' && tpl ? `This fits the ${tpl.name} template. ${tpl.fields.length} fields to fill.`
          : type === 'Signature' ? 'Nothing to review if the terms are unchanged. Check it is on our paper before it is countersigned.'
          : 'No playbook covers this. It needs a lawyer’s answer.', flags: [] },
      activity: [{ who: USER.name, what: 'sent this request', when: mxNow() }] };
    mxData().requests.unshift(r); save();
    MX.flash = r.id; mxOpen('requests', r.id);
  }, 2200);
}

/* a request's first pass, read off its contract's review when it has one */
function reviewPass(r) {
  const a = r.review && JV_REVIEWS[r.review];
  if (!a) return null;
  const k = a.counts, u = k.unacceptable || 0, f = k.fallback || 0;
  const flagged = a.clauses.filter(c => c.status === 'unacceptable' || c.status === 'fallback')
    .sort((x, y) => (x.status === 'unacceptable' ? 0 : 1) - (y.status === 'unacceptable' ? 0 : 1));
  return { summary: `${mxPlural(a.clauses.length, 'clause')} read against the ${a.playbook.name} playbook. `
      + `${u} ${u === 1 ? 'is' : 'are'} not acceptable and ${f} ${f === 1 ? 'lands' : 'land'} on a fallback.`,
    flags: flagged.slice(0, 5).map(c => ({ k: c.status === 'unacceptable' ? 'walkaway' : 'fallback',
      topic: c.topic || c.heading.replace(/^\s*\d+(\.\d+)*\.?\s+/, ''),
      text: (c.issue || c.summary || '').replace(/\.?$/, '.') })) };
}

/* the conversation a request is worked in: its first pass, said out loud */
function requestChat(r) {
  const pb = r.playbook && pbFind(r.playbook);
  const fp = reviewPass(r) || r.firstPass || { summary: '', flags: [] };
  const word = { walkaway: 'Not acceptable', fallback: 'Inside a fallback', preferred: 'Fine' };
  const lines = fp.flags.map(f => `**${f.topic}** — ${word[f.k]}. ${f.text}`).join('\n\n');
  openSession({ id: 'req-ses-' + r.id, label: r.title, meta: 'now',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: `Let’s work on ${r.id}: ${r.title}.` },
      { role: 'bot', cites: null,
        steps: [{ source: 'request', query: 'Read ' + r.id, count: r.files.length ? mxPlural(r.files.length, 'file') : 'no files' },
          ...(pb ? [{ source: 'playbook', query: 'Checked against ' + pb.name, count: mxPlural(fp.flags.length, 'finding') }] : [])],
        answer: fp.summary + (lines ? '\n\n' + lines : '')
          + '\n\n' + (r.type === 'Contract review' ? 'I can draft the mark-up and a short note back to ' + r.requester.split(' ')[0] + '.'
            : r.type === 'New contract' ? 'I can draft it from the template and tell you what is still missing.'
            : 'I can draft the reply for you to check.'),
        suggest: r.type === 'Contract review'
          ? ['Draft the mark-up using our fallbacks', `Write a reply to ${r.requester.split(' ')[0]} explaining what we can and cannot accept`, 'Which of these would the playbook let me concede?']
          : r.type === 'New contract' ? ['Draft it from the template', 'What do I still need from the requester?']
          : [`Draft a reply to ${r.requester.split(' ')[0]}`, 'What would change the answer?'] },
    ] });
}

/* The pieces of a request that are the same wherever it is shown: what
   was asked, its facts, and what has happened to it since. */
function requestParts(r, { onStatus } = {}) {
  const pb = r.playbook && pbFind(r.playbook);
  const tpl = r.template && mxTemplate(r.template);
  const first = r.requester.split(' ')[0];

  /* what happened, newest last, and a line to add to it */
  const log = h('div', { class: 'mx-log' });
  const entry = (a, fresh) => {
    const said = /^[A-Z“"]/.test(a.what);        // a sentence someone wrote, not a thing they did
    return h('div', { class: 'mx-log-it' + (fresh ? ' is-new' : '') },
      faceEl(a.who, 'mx-log-av'),
      h('div', { class: 'mx-log-b' },
        h('div', { class: 'mx-log-h' }, h('span', { class: 'mx-log-who' }, a.who), said ? '' : ' ' + a.what,
          h('span', { class: 'mx-log-when' }, pbWhen(a.when))),
        said ? h('div', { class: 'mx-log-t' }, a.what) : null));
  };
  log.replaceChildren(...r.activity.map(a => entry(a)));
  const reply = h('textarea', { class: 'mx-reply-in', rows: '1', placeholder: `Reply to ${first}`, 'aria-label': 'Reply',
    onkeydown: (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      const text = reply.value.trim();
      if (!text) return;
      const a = { who: USER.name, what: text[0].toUpperCase() + text.slice(1), when: mxNow() };
      r.activity.push(a); r.updated = mxNow(); save();
      reply.value = ''; log.append(entry(a, true));
    } });
  const activity = h('section', { class: 'mx-act' }, h('h2', { class: 'mx-h' }, 'Activity'), log,
    h('div', { class: 'mx-reply' }, faceEl(USER.name, 'mx-log-av'), reply));

  /* the facts of it: each on its own line, the status one you can change */
  const prop = (label, ...val) => h('div', { class: 'mx-prop' }, h('span', { class: 'mx-prop-l' }, label), h('span', { class: 'mx-prop-v' }, ...val));
  const side = h('aside', { class: 'mx-req-side' },
    prop('Status', mxStatusBtn('req', r, (k) => {
      const a = { who: USER.name, what: 'moved this to ' + MX_ST.req[k].label, when: mxNow() };
      r.activity.push(a); save(); log.append(entry(a, true)); onStatus?.(k);
    })),
    prop('Type', r.type),
    prop('Requester', h('span', { class: 'mx-prop-p' }, faceEl(r.requester, 'pb-av'),
      h('span', {}, r.requester, h('span', { class: 'mx-prop-s' }, r.team)))),
    prop('Due', mxDue(r.due, r.status === 'done')),
    r.counterparty ? prop('Counterparty', r.counterparty) : null,
    pb ? prop('Playbook', h('button', { class: 'mx-link', type: 'button', onclick: () => openPlaybook(pb.id, 'view') }, pb.name)) : null,
    tpl ? prop('Template', h('button', { class: 'mx-link', type: 'button', onclick: () => mxOpen('templates', tpl.id) }, tpl.name)) : null);

  const detail = h('textarea', { class: 'mx-req-detail', rows: '1', 'aria-label': 'Details', placeholder: 'What is needed, and why',
    oninput: (e) => { r.detail = e.target.value; save(); } });
  detail.value = r.detail || '';
  return { detail, side, activity };
}

function requestPage(r) {
  /* a request with a contract opens onto the contract itself (review.js) */
  if (r.review && JV_REVIEWS[r.review]) return reviewPage(r);
  const fp = r.firstPass;
  const { detail, side, activity } = requestParts(r);

  const files = r.files.length ? h('div', { class: 'mx-req-files' }, ...r.files.map(f => {
    const v = f.vault && mxVault(f.vault), file = v?.files.find(x => x.name === f.name);
    return h('button', { class: 'mx-file', type: 'button', disabled: !file, onclick: () => file && fileLook(v, file) },
      mxTile('file', mxExt(f.name)), h('span', { class: 'mx-file-n' }, f.name));
  })) : null;

  const pass = fp ? h('section', { class: 'mx-pass' },
    h('h2', { class: 'mx-h' }, quillEl('static', { cls: 'mx-pass-q' }), 'First pass'),
    h('p', { class: 'mx-pass-sum' }, fp.summary),
    fp.flags.length ? h('div', { class: 'mx-flags' }, ...fp.flags.map(f => h('div', { class: 'mx-flag' },
      pbvMark(f.k), h('div', {}, h('span', { class: 'mx-flag-t' }, f.topic), h('span', { class: 'mx-flag-x' }, f.text))))) : null) : null;

  const title = h('textarea', { class: 'mx-req-title', rows: '1', 'aria-label': 'Request', placeholder: 'Untitled request',
    oninput: (e) => { r.title = e.target.value.replace(/\n/g, ' '); r.updated = mxNow(); save(); } });
  title.value = r.title;

  return h('div', { class: 'pb mx mx-page mx-req' },
    h('div', { class: 'mx-req-top' },
      h('button', { class: 'mx-back', type: 'button', onclick: () => { mxClose('requests'); go('requests'); } },
        h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), 'Contracts'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => requestChat(r) }, 'Review with Clavia')),
    h('div', { class: 'mx-req-grid' },
      h('div', { class: 'mx-req-main' },
        h('span', { class: 'mx-req-id' }, r.id),
        title, detail, files, pass, activity),
      side));
}

/* ==================================================================
   Projects
   One matter. It holds the conversations had about it and points at
   the vaults, playbooks and requests that belong to it, and its ask
   box starts a chat that already knows all of them.
================================================================== */
/* ── Requests ─────────────────────────────────────────────────
   What the business asks legal for, open until it is done: which deal it
   belongs to, who it is with, what kind of work it is, where it stands
   and which of us has it. A request with no one on it says so, and is
   given to someone in the row itself. */
/* the legal team: who can be given a request, and what they do */
const MX_LEGAL = [
  { name: 'Roger Bennett',   role: 'General Counsel' },
  { name: 'Grace Coleman',   role: 'Senior Counsel · Commercial' },
  { name: 'Matt Rivera',     role: 'Counsel · Procurement' },
  { name: 'Aisha Rahman',    role: 'Privacy Counsel' },
  { name: 'Elena Petrova',   role: 'Senior Counsel · Corporate' },
  { name: 'James Whitfield', role: 'Counsel · Employment' },
  { name: 'Marcus Lee',      role: 'Legal Operations' },
  { name: 'Nina Alvarez',    role: 'Paralegal' },
];
const MX_ATTORNEYS = MX_LEGAL.map(p => p.name);
/* a face where there is a photo, initials where there is not: never a stand-in drawing */
const mxFace = (name, cls = 'pb-av') => PHOTOS[name] ? faceEl(name, cls)
  : h('span', { class: 'peer-av mx-ini ' + cls, 'data-tint': tintOf(name), 'aria-hidden': 'true' },
      name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
const MX_INTAKE_SEED = [
  // [number, request, deal, counterparty, type, from, attorney, status, due in days, urgent]
  ['RQ-1048', 'NDA for partnership talks', 'Northwind — partnership', 'Northwind Ltd', 'NDA', 'Partnerships', null, 'new', 2],
  ['RQ-1047', 'Review Acme’s redline of our MSA', 'Acme Corp — platform expansion', 'Acme Corp', 'Contract review', 'Sales', 'Grace Coleman', 'progress', 1, true],
  ['RQ-1046', 'Can we use customer logos on the new website?', null, null, 'Advice', 'Marketing', 'Matt Rivera', 'waiting', 4],
  ['RQ-1045', 'Stop the Brightline hosting contract renewing', 'Brightline — hosting renewal', 'Brightline Hosting Ltd', 'Termination', 'Procurement', null, 'new', -1, true],
  ['RQ-1044', 'Reseller terms for the Gulf region', 'Gulf Systems — channel launch', 'Gulf Systems LLC', 'Drafting', 'Partnerships', 'Roger Bennett', 'progress', 6],
  ['RQ-1043', 'Harbor Retail’s changes to our DPA', 'Harbor Retail — EU rollout', 'Harbor Retail plc', 'Privacy', 'Sales', 'Grace Coleman', 'waiting', 3],
  ['RQ-1042', 'Order form for Trellis, 120 seats', 'Trellis — new logo', 'Trellis Health', 'Drafting', 'Sales', 'Matt Rivera', 'progress', 0, true],
  ['RQ-1041', 'Is our SLA credit language enforceable in Germany?', 'Vantage — DACH renewal', 'Vantage GmbH', 'Advice', 'Sales', null, 'new', 5],
  ['RQ-1040', 'Supplier agreement on Kestrel Freight’s paper', 'Kestrel Freight — logistics', 'Kestrel Freight', 'Contract review', 'Procurement', 'Roger Bennett', 'progress', 2],
  ['RQ-1039', 'NDA on Birch Labs’ paper', 'Birch Labs — pilot', 'Birch Labs', 'NDA', 'Partnerships', null, 'new', 1],
  ['RQ-1038', 'Signature: supplier agreement, Ironclad Logistics', 'Ironclad — warehousing', 'Ironclad Logistics', 'Signature', 'Procurement', 'Matt Rivera', 'done', -2],
];
/* who in the business sent each one */
const MX_SUBMITTERS = { 'RQ-1048': 'Priya Shah', 'RQ-1047': 'Daniel Okafor', 'RQ-1046': 'Hannah Lee', 'RQ-1045': 'Tom Becker',
  'RQ-1044': 'Priya Shah', 'RQ-1043': 'Sofia Marin', 'RQ-1042': 'Daniel Okafor', 'RQ-1041': 'Sofia Marin', 'RQ-1040': 'Tom Becker',
  'RQ-1039': 'Priya Shah', 'RQ-1038': 'Tom Becker' };
/* what each one actually said, in the submitter's words */
const MX_ASKS = {
  'RQ-1048': 'We are starting partnership talks with Northwind next week and need a mutual NDA in place before we share the roadmap. Their contact is Jamie Cole in business development.',
  'RQ-1047': 'Acme sent back their redline of our MSA (v3). They have pushed on liability and IP. Sales would like to sign by the end of the month.',
  'RQ-1046': 'Marketing wants to show customer logos on the new website. Do we need each customer’s written permission, and does our standard MSA already cover it?',
  'RQ-1045': 'We are moving off Brightline’s hosting. The contract renews on 14 January unless we give notice. Please send whatever notice is needed.',
  'RQ-1044': 'Gulf Systems will resell the platform in the UAE and Saudi Arabia. We need reseller terms: 25% discount, 24-month term.',
  'RQ-1043': 'Harbor Retail’s privacy team marked up our DPA, mainly the sub-processor and international transfer terms. What can we accept?',
  'RQ-1042': 'Trellis Health signed off on 120 seats. We need the order form so we can get it signed this week.',
  'RQ-1041': 'Vantage’s procurement team asked whether our SLA service credits hold up under German law. Can we answer before the renewal call on Friday?',
  'RQ-1040': 'Kestrel Freight sent their own supplier agreement for the logistics contract. Please review it against our playbook.',
  'RQ-1039': 'Birch Labs want to use their own NDA for the pilot. Is it OK to sign as it is?',
  'RQ-1038': 'The Ironclad supplier agreement is agreed. Please send it for signature.',
};
const MX_ADDRESS = { 'RQ-1048': null, 'RQ-1044': 'Office 1204, Al Habtoor Tower, Dubai', 'RQ-1042': '220 Harbour Road, Bristol BS1 5UH' };

/* What happened to each seeded request, in the order it happened: who sent
   it and with what, what Clavia read, who picked it up, the versions and
   emails, and what people said, some of it about a particular version. */
const MX_NOTES = {
  'RQ-1047': [['note', 'Liability cap at 24 months of fees is a non-starter. We can offer 12 months, with a super-cap for data breaches.', 2],
              ['reply', 'I will have our mark-up back to Acme by Thursday. Can you check whether Laura will take a call on the IP clause?', 0],
              ['back', 'Yes, Laura can do Wednesday at 3pm. I have sent the invite.', 0]],
  'RQ-1043': [['note', 'Their sub-processor notice period is 60 days. The playbook lets us go to 30, not further.', 2],
              ['reply', 'Could you send Harbor’s marked-up DPA as a Word file? The PDF has lost the tracked changes.', 0]],
  'RQ-1040': [['note', 'Indemnity is uncapped in their draft, and the governing law is Portuguese. Both need to move before this goes back.', 1]],
  'RQ-1044': [['note', 'Discount and territory are in. The exclusivity question is still open with Partnerships.', 1],
              ['reply', 'First draft attached. Can you confirm whether Gulf Systems expect exclusivity in the UAE?', 1]],
  'RQ-1042': [['reply', 'The order form is with Trellis now. I will tell you the moment it comes back signed.', 1]],
  'RQ-1046': [['reply', 'Which customers’ logos would go on the site? I will check what each of their agreements allows.', 0],
              ['back', 'Acme, Trellis and Harbor Retail to start with. The rest can wait.', 0]],
};
/* requests that came in by email or Teams rather than the form: the
   message itself is the first thing in the history, and Clavia opened the
   request from it */
const MX_SOURCE = {
  'RQ-1045': { via: 'outlook', name: 'Outlook', what: 'emailed legal@lumen.io', subject: 'Brightline hosting renewal: we need to give notice',
    body: 'Hi legal team,\n\nWe are moving off Brightline’s hosting at the end of the year. The contract renews on 14 January unless we give notice, and I think the notice period is 60 days, so we are cutting it close.\n\nCan you send whatever notice is needed? Happy to jump on a call if it helps.\n\nThanks,\nTom' },
  'RQ-1041': { via: 'teams', name: 'Teams', what: 'asked in Legal › Ask Legal',
    body: 'Quick one: Vantage’s procurement team asked whether our SLA service credits hold up under German law. Their renewal call is on Friday. Could someone in legal take a look before then?' },
};
function mxStory(r) {
  const out = [], at = (hrs) => new Date(new Date(r.created).getTime() + hrs * 36e5).toISOString();
  const docs = mxDocuments(r), d = docs[0], last = d ? { doc: d.id, v: d.versions.length } : null;
  const theirs = d && d.versions.length > 1;            // their redline arrived with the request
  const lawyer = r.attorney || 'Roger Bennett', firstName = r.submitter.split(' ')[0];
  const stages = mxStages(r), stage = mxStage(r);
  const contact = (MX_DEAL_TEAM[r.id] || []).find(x => x[2] === 'counterparty');
  const via = MX_SOURCE[r.id];
  if (via) {
    out.push({ who: r.submitter, ev: 'submit', what: via.what, via: via.via, msg: { subject: via.subject || null, body: via.body }, when: at(0) });
    out.push({ who: 'Clavia', ev: 'clavia', what: `opened this request from the ${via.via === 'teams' ? 'message' : 'email'}`, when: at(0.02) });
  } else out.push({ who: r.submitter, ev: 'submit', what: theirs ? 'submitted the request with' : 'submitted the request', when: at(0), ref: theirs ? last : null });
  if (theirs) out.push({ who: 'Clavia', ev: 'clavia', what: `read ${r.counterparty}’s redline against the playbook`, when: at(0.05), ref: last });
  else if (mxTemplateFor(r)) out.push({ who: 'Clavia', ev: 'clavia', what: `matched this to the ${mxTemplateFor(r).name} template`, when: at(0.05) });
  if (r.attorney) out.push(r.attorney === 'Roger Bennett' ? { who: 'Roger Bennett', ev: 'assign', what: 'took this on', when: at(2) }
    : { who: 'Roger Bennett', ev: 'assign', what: `assigned this to ${r.attorney}`, when: at(2) });
  if (d && !theirs && stage >= 1) out.push({ who: lawyer, ev: 'version', what: `drafted v1 from ${mxTemplateFor(r)?.name || 'the template'}`, when: d.versions[0].when, ref: { doc: d.id, v: 1 } });
  for (let i = 1; i <= stage; i++) out.push({ who: lawyer, ev: 'status', what: `moved this to ${stages[i]}`, when: at(i === 1 ? 5 : 20 + i * 8) });
  for (const [kind, what, h0] of MX_NOTES[r.id] || []) {
    const when = at(30 + out.length * 3);
    if (kind === 'back') out.push({ who: r.submitter, kind: 'reply', what, when, to: lawyer.split(' ')[0] });
    else out.push({ who: lawyer, kind, what, when, to: firstName, ref: h0 && last ? { doc: last.doc, v: Math.min(h0, d.versions.length) } : null });
  }
  if (contact && stage >= 2 && d) out.push({ who: lawyer, ev: 'email', what: `emailed v${d.versions.length} to ${contact[0]}`, when: at(60), ref: last });
  if (stage === stages.length - 1 && stages[stage] === 'Signed') out.push({ who: lawyer, ev: 'status', what: 'recorded the signed copy', when: at(70) });
  return out.sort((x, y) => (x.when < y.when ? -1 : 1));
}

/* seeded the first time Requests opens, then kept with everything else */
function mxIntake() {
  const d = mxData();
  if (!d.intake) {
    const at = (n) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(17, 0, 0, 0); return x.toISOString(); };
    d.intake = MX_INTAKE_SEED.map(([id, title, deal, counterparty, type, team, attorney, status, due, urgent]) =>
      ({ id, title, deal, counterparty, type, team, attorney, status, due: at(due), urgent: !!urgent, updated: mxNow() }));
    save();
  }
  /* the seeded history was rewritten; tell it again for the seeded requests */
  if (d.intakeV !== 7) { for (const r of d.intake) if (MX_SUBMITTERS[r.id]) { delete r.activity; delete r.stage; delete r.documents; delete r.docs; delete r.people; delete r.created; } d.intakeV = 7; save(); }
  /* the showcase request, made once and kept at the top */
  if (!d.showcaseId && typeof mxShowcase === 'function') { const x = mxShowcase('RQ-' + (Math.max(1037, ...d.intake.map(q => +q.id.split('-')[1] || 0)) + 1)); d.intake.unshift(x); d.showcaseId = x.id; save(); }
  /* RQ-1048 is the one told in full, for showing the whole of a request */
  if (d.richV !== 2 && typeof mxRichNda === 'function') { const x = d.intake.find(q => q.id === 'RQ-1048'); if (x) { mxRichNda(x); d.richV = 2; save(); } }
  /* two of them came in by email and Teams: tell their history again from the message */
  if (d.srcV !== 1) { for (const r of d.intake) if (MX_SOURCE[r.id]) delete r.activity; d.srcV = 1; save(); }
  /* one email that asked for two things, made into two requests that know about each other */
  if (INTAKE_FX.split && d.splitV !== 1) { mxSplitSeed(d.intake); d.splitV = 1; save(); }
  /* 15 Oct: the two Gulf Systems requests told in full, and Brightwell at full length (intake-demo.js) */
  if (typeof mxDemoSeed === 'function') mxDemoSeed(d);
  /* Tom's Orbis request, the one the Matters demo opens as a matter (matters-data.js) */
  if (typeof moIntakeSeed === 'function') { const had = d.orbisRq, tidy = d.tidyV; moIntakeSeed(d); if (!had || tidy !== 1) save(); }
  /* the demo matters, as requests that are matters (matters-data.js) */
  if (typeof moMattersSeed === 'function' && d.mattersInIntakeV !== 1) { moMattersSeed(d); save(); }
  /* two more requests inside Vantage renewal, and one about Orbis waiting on its own (matters-data.js) */
  if (typeof moFolderSeed === 'function' && d.folderV !== 1) { moFolderSeed(d); save(); }
  /* the requests Roger keeps an eye on without having them */
  if (d.followV !== 1) { for (const r of d.intake) if (['RQ-1047', 'RQ-1043'].includes(r.id)) r.followed = true; d.followV = 1; save(); }
  for (const r of d.intake) {
    if (r.source === undefined) r.source = MX_SOURCE[r.id]?.via || null;
    r.submitter ||= MX_SUBMITTERS[r.id] || USER.name;
    if (r.detail == null) r.detail = MX_ASKS[r.id] || '';
    if (r.address === undefined) r.address = MX_ADDRESS[r.id] || null;
    /* five days before it is due, but never so recent that its history would run past today */
    if (!r.created) { const c = new Date(Math.min(new Date(r.due) - 5 * 864e5, Date.now() - 3.5 * 864e5)); c.setHours(10, 20, 0, 0); r.created = c.toISOString(); }
    if (!r.activity && MX_SUBMITTERS[r.id]) r.activity = mxStory(r);
    if (!r.activity) {
      /* what has happened to it so far, told in order */
      const at = (h) => new Date(new Date(r.created).getTime() + h * 36e5).toISOString();
      r.activity = [{ who: r.submitter, what: 'submitted the request', when: r.created }];
      if (r.attorney) r.activity.push(r.attorney === 'Roger Bennett' ? { who: 'Roger Bennett', what: 'took this on', when: at(2) }
        : { who: 'Roger Bennett', what: `assigned this to ${r.attorney}`, when: at(2) });
      if (r.status === 'progress' || r.status === 'waiting') r.activity.push({ who: r.attorney || 'Roger Bennett', what: 'moved this to In Progress', when: at(5) });
      const ASKBACK = {
        Advice: 'Which customers’ logos would go on the site? I will check what each of their agreements allows.',
        Privacy: `Could you send ${r.counterparty || 'their'}’s marked-up DPA as a Word file? The PDF has lost the tracked changes.`,
      };
      if (r.status === 'waiting') r.activity.push({ who: r.attorney || 'Roger Bennett', kind: 'reply', to: r.submitter.split(' ')[0],
        what: `Thanks ${r.submitter.split(' ')[0]}. ${ASKBACK[r.type] || 'Before I go further, can you confirm who on their side signs, and whether anything was agreed on the call?'}`, when: at(26) },
        { who: r.attorney || 'Roger Bennett', what: 'moved this to Waiting', when: at(26.1) });
    }
  }
  /* the first pass Clavia did on each document it has an open round for, said in Activity with a way in */
  if (INTAKE_FX.firstPass && d.fpV !== 2) { for (const r of d.intake) { if (!r.activity) continue;
    r.activity = r.activity.filter(a => !a.first);
    for (const doc of mxDocuments(r)) { const rd = mxRoundOf(r, doc.id); if (!rd || rd.answered) continue;
      const t = new Date(new Date(doc.versions[rd.v - 1]?.when || r.created).getTime() + 3 * 6e4).toISOString();
      r.activity.push({ who: 'Clavia', ev: 'clavia', what: `finished the first pass on v${rd.v} of the ${doc.title.replace(/^.*?—\s*/, '').replace(/\.docx?$/i, '')}`, first: { doc: doc.id, v: rd.v }, when: t });
      r.activity.sort((x, y) => (x.when < y.when ? -1 : 1)); } }
    d.fpV = 2; save(); }
  /* the acknowledgement each emailed or messaged request got, with the link to follow it */
  if (INTAKE_FX.portal && d.ackV !== 1) { for (const r of d.intake) { if (!r.source || !r.activity || r.activity.some(a => a.portal)) continue;
    const t = new Date(new Date(r.created).getTime() + 0.025 * 36e5).toISOString();
    r.activity.push({ who: 'Clavia', ev: 'clavia', what: `let ${r.submitter.split(' ')[0]} know it’s with legal, with a link to follow it`, via: r.source, portal: true, when: t });
    r.activity.sort((x, y) => (x.when < y.when ? -1 : 1)); }
    d.ackV = 1; save(); }
  /* Clavia's follow-ups to two requesters, in Outlook and in Teams */
  if (INTAKE_FX.channel && d.chanV !== 1) { mxChannelSeed(d.intake); d.chanV = 1; save(); }
  /* more of the seeded requests came in through the business's own tools (14 Oct): Slack, Teams, Salesforce, Outlook */
  if (d.srcV2 !== 1) {
    const SRC2 = {
      'RQ-1046': ['slack', '#ask-legal', 'asked in #ask-legal'],
      'RQ-1043': ['teams', 'Legal › Ask Legal', 'asked in Legal › Ask Legal'],
      'RQ-1047': ['salesforce', 'Acme Corp — platform expansion', 'asked for legal review on the Acme Corp opportunity in Salesforce'],
      'RQ-1042': ['salesforce', 'Trellis — new logo', 'asked for legal review on the Trellis opportunity in Salesforce'],
      'RQ-1040': ['outlook', 'legal@lumen.io', 'emailed legal@lumen.io'],
      'RQ-1044': ['teams', 'Legal › Ask Legal', 'asked in Legal › Ask Legal'],
    };
    for (const r of d.intake) { const x = SRC2[r.id]; if (!x || r.source) continue;
      r.source = x[0]; r.where = x[1];
      const sub = (r.activity || []).find(a => a.ev === 'submit' || /^submitted the request/.test(a.what || ''));
      if (sub) { sub.what = x[2]; sub.via = x[0]; sub.ev = 'submit'; if (r.detail && x[0] !== 'salesforce' && !sub.msg) sub.msg = { body: r.detail }; } }
    d.srcV2 = 1; save(); }
  /* Priya asked for RQ-1039 in #ask-legal on Slack */
  if (d.slackV !== 1) { const r = d.intake.find(x => x.id === 'RQ-1039');
    if (r?.activity) { r.source = 'slack'; r.where = '#ask-legal';
      const i = r.activity.findIndex(a => a.ev === 'submit'), t0 = r.activity[i]?.when || r.created, at = (h) => new Date(new Date(t0).getTime() + h * 36e5).toISOString();
      if (i >= 0) r.activity[i] = { who: r.submitter, ev: 'submit', what: 'asked in #ask-legal', via: 'slack', msg: { body: 'Birch Labs sent their NDA for the pilot (attached). Can legal take a look? We need it signed by Friday so the pilot can start on Monday.' }, when: t0 };
      r.activity.push({ who: 'Clavia', ev: 'clavia', what: 'opened this request from the message', when: at(0.02) },
        { who: 'Clavia', ev: 'clavia', what: `let ${r.submitter.split(' ')[0]} know it’s with legal, with a link to follow it`, via: 'slack', portal: true, when: at(0.025) });
      r.activity.sort((x, y) => (x.when < y.when ? -1 : 1)); }
    d.slackV = 1; save(); }
  /* the seeded requests a routing rule placed say so */
  if (INTAKE_FX.rules && d.rulesV !== 2 && typeof mxRulesSeedStory === 'function') { mxRulesSeedStory(d.intake); d.rulesV = 2; save(); }
  return d.intake;
}

/* who Clavia would give an unassigned request to, and the one plain
   reason: the lawyer who already knows the counterparty, then the one who
   has the same person's same kind of work, then whoever covers the area */
function mxSuggest(r) {
  if (!INTAKE_FX.suggest) return null;
  if (r.attorney || r.resolvedBy) return null;
  const rule = typeof mxRuleFor === 'function' && mxRuleFor(r);
  if (rule?.assign) return { name: rule.assign, why: `The “${rule.name}” rule`, rule };
  const others = mxIntake().filter(x => x !== r && x.attorney);
  const cp = r.counterparty && others.find(x => x.counterparty === r.counterparty);
  if (cp) return { name: cp.attorney, why: `Worked on ${r.counterparty} in ${cp.id}` };
  const t = `${r.title} ${r.type}`.toLowerCase();
  const area = /privacy|\bdpa\b|gdpr|personal data/.test(t) ? ['Aisha Rahman', 'Covers privacy']
    : /employ|\bhire\b|contractor/.test(t) ? ['James Whitfield', 'Covers employment']
    : /supplier|procure|hosting|vendor|renew/.test(t) || r.team === 'Procurement' ? ['Matt Rivera', 'Covers procurement contracts'] : null;
  const same = others.find(x => x.submitter === r.submitter && x.type === r.type);
  if (same && !area) return { name: same.attorney, why: `Has ${r.submitter}’s other ${same.type === 'NDA' ? 'NDA' : 'request'}, ${same.id}` };
  if (area) return { name: area[0], why: area[1] };
  return { name: 'Grace Coleman', why: 'Covers commercial contracts' };
}

/* ── the attorney cell ─────────────────────────────────────────
   Who has it, or "Unassigned" said quietly. Clicking opens a picker built
   for a team of any size: a search field first, you at the top, then
   everyone else by name; the one who has it now is ticked, and "Remove assignee" sits at
   the foot. Arrow keys move, Enter picks, Escape closes. */
function mxAttorneyBtn(r, after) {
  const btn = h('button', { class: 'mx-atty' + (r.attorney ? '' : ' is-none'), type: 'button', 'aria-haspopup': 'listbox',
    'aria-label': r.attorney ? `Assigned to ${r.attorney}. Change` : 'Assign an attorney',
    onclick: (e) => { e.stopPropagation(); mxAssignPicker(btn, r, set); } });
  const chev = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>';
  const paint = () => btn.replaceChildren(...(r.attorney
    ? [mxFace(r.attorney), h('span', { class: 'pb-owner-n' }, r.attorney)]
    : r.resolvedBy ? [h('span', { class: 'mx-atty-clavia' }, quillEl('static', { cls: 'mx-atty-q' })), h('span', { class: 'mx-atty-t mx-atty-by' }, 'Clavia')]
    : (sg => sg ? [mxFace(sg.name, 'pb-av mx-atty-sg-av'), h('span', { class: 'mx-atty-t mx-atty-sg' }, sg.name)] : [h('span', { class: 'mx-atty-t' }, 'Unassigned')])(mxSuggest(r))),
    h('span', { class: 'mx-atty-chev', html: chev }));
  const set = (n) => {
    if (n === r.attorney) return;
    const was = r.attorney;
    const sg = mxSuggest(r);
    r.attorney = n; r.updated = mxNow(); save();
    btn.classList.toggle('is-none', !n);
    btn.setAttribute('aria-label', n ? `Assigned to ${n}. Change` : 'Assign an attorney');
    paint(); btn.classList.remove('is-set'); void btn.offsetWidth; btn.classList.add('is-set');
    btn.removeAttribute('data-tip'); if (!n) tip();
    after?.(sg && n === sg.name ? sg : null);
    pbToast(n ? `${r.id} assigned to ${n === USER.name ? 'you' : n}` : `${r.id} is unassigned`,
      { label: 'Undo', run: () => { r.attorney = was; save(); paint(); after?.(); } });
  };
  /* a suggestion says whose it would be and why, before anyone clicks */
  const tip = () => { const sg = mxSuggest(r); if (sg) btn.dataset.tip = `Suggested · ${sg.why}`; else if (r.resolvedBy && !r.attorney) btn.dataset.tip = 'Resolved by Clavia · standard NDA, no lawyer needed'; };
  paint(); tip();
  btn._set = set;
  return btn;
}

/* anyone, found by typing: a face, a name, a title */
function mxPersonPicker(anchor, pool, pick) {
  document.querySelector('.mx-ap')?.remove();
  const q = h('input', { class: 'mx-ap-q', type: 'text', placeholder: 'Find someone…', 'aria-label': 'Find someone', autocomplete: 'off' });
  const list = h('div', { class: 'mx-ap-list', role: 'listbox' });
  const pop = h('div', { class: 'mx-ap', role: 'dialog', 'aria-label': 'Add a stakeholder' },
    h('div', { class: 'mx-ap-head' }, h('span', { class: 'mx-ap-glass', html: PB_SVG.search }), q), list);
  let rows = [], at = 0;
  const paint = () => {
    const t = q.value.trim().toLowerCase();
    const ps = pool.filter(p => !t || (p.name + ' ' + p.role).toLowerCase().includes(t));
    rows = ps.map(p => h('button', { class: 'mx-ap-row', type: 'button', role: 'option', onclick: () => { close(); pick(p); } },
      mxFace(p.name, 'pb-av mx-ap-av'), h('span', { class: 'mx-ap-t' }, h('span', { class: 'mx-ap-n' }, p.name), h('span', { class: 'mx-ap-r' }, p.role))));
    rows.forEach((row, i) => { row.onmousemove = () => { at = i; mark(); }; });
    list.replaceChildren(...(rows.length ? rows : [h('div', { class: 'mx-ap-none' }, `No one matches “${q.value.trim()}”`)]));
    at = Math.min(at, Math.max(rows.length - 1, 0)); mark();
  };
  const mark = () => rows.forEach((row, i) => row.classList.toggle('is-at', i === at));
  q.addEventListener('input', () => { at = 0; paint(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(at + 1, rows.length - 1); mark(); rows[at]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(at - 1, 0); mark(); rows[at]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); rows[at]?.click(); }
  });
  const close = () => { pop.remove(); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); };
  const out = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  paint();
  document.body.append(pop);
  const a = anchor.getBoundingClientRect();
  pop.style.width = Math.max(300, a.width) + 'px';
  const below = innerHeight - a.bottom > pop.offsetHeight + 16;
  pop.style.top = (below ? a.bottom + 6 : Math.max(12, a.top - pop.offsetHeight - 6)) + 'px';
  pop.style.left = Math.min(a.left, innerWidth - pop.offsetWidth - 12) + 'px';
  addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
  q.focus();
}

function mxAssignPicker(anchor, r, set) {
  document.querySelector('.mx-ap')?.remove();
  const q = h('input', { class: 'mx-ap-q', type: 'text', placeholder: 'Assign to…', 'aria-label': 'Search the legal team', autocomplete: 'off' });
  const list = h('div', { class: 'mx-ap-list', role: 'listbox' });
  const foot = h('div', { class: 'mx-ap-foot' });
  const pop = h('div', { class: 'mx-ap', role: 'dialog', 'aria-label': 'Assign an attorney' },
    h('div', { class: 'mx-ap-head' }, h('span', { class: 'mx-ap-glass', html: PB_SVG.search }), q), list, foot);
  let rows = [], at = 0;
  const people = () => {
    const t = q.value.trim().toLowerCase();
    /* you first, then the rest by name; the one who has it is ticked where it stands */
    const all = [...MX_LEGAL].sort((a, b) => (b.name === USER.name) - (a.name === USER.name) || a.name.localeCompare(b.name));
    return all.filter(p => !t || p.name.toLowerCase().includes(t));
  };
  const pick = (n) => { close(); set(n); };
  const sg = mxSuggest(r);
  const paint = () => {
    const ps = people(), lead = sg && !q.value.trim() ? MX_LEGAL.find(p => p.name === sg.name) : null;
    rows = (lead ? [lead, ...ps.filter(p => p !== lead)] : ps).map(p => {
      const on = r.attorney === p.name;
      return h('button', { class: 'mx-ap-row' + (on ? ' is-on' : ''), type: 'button', role: 'option', 'aria-selected': String(on),
        onclick: () => pick(p.name) },
        mxFace(p.name, 'pb-av mx-ap-av'),
        h('span', { class: 'mx-ap-t' }, h('span', { class: 'mx-ap-n' }, p.name, p.name === USER.name ? h('span', { class: 'mx-ap-you' }, 'You') : null),
          p === lead ? h('span', { class: 'mx-ap-why' }, `Suggested · ${sg.why}`) : null),
        h('span', { class: 'mx-ap-tick', html: on ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.3 2.8 2.8 6.2-6.4"/></svg>' : '' }));
    });
    if (lead && rows[1]) rows[1].classList.add('mx-ap-after');
    rows.forEach((row, i) => { row.onmousemove = () => { at = i; mark(); }; });
    list.replaceChildren(...(rows.length ? rows : [h('div', { class: 'mx-ap-none' }, `No one in legal matches “${q.value.trim()}”`)]));
    at = Math.min(at, Math.max(rows.length - 1, 0));
    mark();
    foot.replaceChildren(r.attorney ? h('button', { class: 'mx-ap-remove', type: 'button', onclick: () => pick(null) },
      h('span', { html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>' }), 'Remove assignee') : '');
    foot.hidden = !r.attorney;
  };
  const mark = () => rows.forEach((row, i) => row.classList.toggle('is-at', i === at));
  q.addEventListener('input', () => { at = 0; paint(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(at + 1, rows.length - 1); mark(); rows[at]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(at - 1, 0); mark(); rows[at]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); rows[at]?.click(); }
  });
  const close = () => {
    pop.remove(); anchor.setAttribute('aria-expanded', 'false');
    removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); removeEventListener('scroll', close, true);
  };
  const out = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  paint();
  document.body.append(pop);
  const a = anchor.getBoundingClientRect();
  const below = innerHeight - a.bottom > pop.offsetHeight + 16;
  pop.style.top = (below ? a.bottom + 6 : Math.max(12, a.top - pop.offsetHeight - 6)) + 'px';
  pop.style.left = Math.min(a.left - 4, innerWidth - pop.offsetWidth - 12) + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
  setTimeout(() => addEventListener('scroll', close, true), 0);
  q.focus();
}

const MX_FORM_IC = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4.5"/></svg>';
const MX_RQ_TYPES = ['NDA', 'Contract review', 'Drafting', 'Advice', 'Termination', 'Privacy', 'Signature'];
const MX_TEAMS = ['Sales', 'Procurement', 'Partnerships', 'Marketing', 'Finance', 'Product', 'People'];
const mxNextRq = () => 'RQ-' + (Math.max(1037, ...mxIntake().map(r => +r.id.split('-')[1] || 0)) + 1);
const mxDealsKnown = () => [...new Set(mxIntake().map(r => r.deal).filter(Boolean))];

/* Scripted for now: a request said in words, read into its fields. The
   seam for a real model; it fills only what the words say. */
function mxReadRequest(text, files = []) {
  const all = [text, ...files].join(' ');
  const low = all.toLowerCase();
  const type = /\b(nda|non-?disclosure|confidentiality agreement)\b/.test(low) ? 'NDA'
    : /\b(dpa|gdpr|privacy|personal data|data processing)\b/.test(low) ? 'Privacy'
    : /\b(terminate|termination|cancel|renew|renewal|notice)\b/.test(low) ? 'Termination'
    : /\b(sign|signature|signing|docusign)\b/.test(low) ? 'Signature'
    : /\b(review\w*|redline\w*|mark-?up|their paper|their changes|comments on|look over|check (?:the|their))\b/.test(low) || files.length ? 'Contract review'
    : /\b(draft\w*|order form|agreement for|contract for|reseller|sow|msa|prepar\w*)\b/.test(low) ? 'Drafting'
    : 'Advice';
  const who = /\b(?:with|for|from|on|to)\s+((?:[A-Z][\w&'.-]*)(?:\s+(?:[A-Z][\w&'.-]*|&|Ltd|Limited|Inc\.?|LLC|plc|GmbH|Corp\.?))*)(?:[’']s)?/.exec(text);
  const named = /\bthe\s+((?:[A-Z][\w&'.-]*\s+)+)(?:hosting\s+|supplier\s+|services\s+)?(?:renewal|contract|agreement|nda|dpa|order form|deal)\b/.exec(text);
  const cand = who && !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Today|Tomorrow|Legal|Clavia|Our|The|We|I)$/.test(who[1]) ? who[1] : named?.[1]?.trim();
  const cp = cand ? cand.replace(/[’']s$/, '') : null;
  const deal = cp && mxDealsKnown().find(d => d.toLowerCase().startsWith(cp.split(' ')[0].toLowerCase()));
  const team = /\b(supplier|vendor|procure|purchas|buy)\w*/i.test(all) ? 'Procurement' : /\b(partner|reseller|channel)\w*/i.test(all) ? 'Partnerships'
    : /\b(website|marketing|logo|campaign|brand)\w*/i.test(all) ? 'Marketing' : /\b(hire|employ|contractor|offer letter)\w*/i.test(all) ? 'People' : 'Sales';
  const urgent = /\b(urgent|asap|as soon as possible|today|tonight|end of day|eod)\b/i.test(all);
  const day = (n) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(17, 0, 0, 0); return x; };
  const wd = /\bby\s+(monday|tuesday|wednesday|thursday|friday)\b/i.exec(all);
  const inN = /\bin\s+(\d+)\s+(day|week)s?\b/i.exec(all);
  const due = /\b(today|tonight|eod|end of day)\b/i.test(all) ? day(0) : /\btomorrow\b/i.test(all) ? day(1)
    : inN ? day(+inN[1] * (/week/i.test(inN[2]) ? 7 : 1))
    : wd ? day(((['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(wd[1].toLowerCase()) - new Date().getDay() + 7) % 7) || 7)
    : day(urgent ? 1 : 5);
  /* the title: said the way the list says the others, from what was read */
  const docM = /\b(supplier agreement|services agreement|master services agreement|msa|sow|statement of work|order form|reseller agreement|dpa|data processing addendum|nda|licen[cs]e agreement|agreement|contract)\b/i.exec(all);
  const doc = docM ? docM[1].replace(/^(msa|sow|dpa|nda)$/i, m => m.toUpperCase()).replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()) : null;
  const poss = cp ? `${cp}’s` : '';
  let title = cp && type === 'Contract review' ? `Review ${poss} ${doc || 'contract'}`
    : cp && type === 'NDA' ? `${cp} — NDA`
    : cp && type === 'Drafting' ? `Draft ${doc && !/^(agreement|contract)$/i.test(doc) ? (/^[aeiou]/i.test(doc) ? 'an ' : 'a ') + doc : 'the agreement'} for ${cp}`
    : cp && type === 'Termination' ? `Stop the ${cp} ${doc || 'contract'} renewing`
    : cp && type === 'Privacy' ? `${poss} ${doc || 'privacy terms'}`
    : cp && type === 'Signature' ? `Signature: ${doc || 'agreement'}, ${cp}`
    : '';
  if (!title) {
    /* a question keeps its own words, without the asking or the deadline */
    title = text.split(/(?<=[.?!])\s|\n/).find(x => /\?$/.test(x.trim())) || text.split(/(?<=[.?!])\s|\n/)[0];
    title = title.replace(/^(hi|hey|hello)[^,]*,\s*/i, '').replace(/^(can you|could you|please|we need( you)? to|i need( you)? to|we need|i need|need)\s+/i, '')
      .replace(/,?\s*\b(by (monday|tuesday|wednesday|thursday|friday|tomorrow|today|end of day)|asap|it is urgent|urgently)\b.*$/i, '').trim();
  }
  if (!title && files[0]) title = `Review ${files[0].replace(/\.[a-z0-9]+$/i, '')}`;
  title = title.length > 72 ? title.slice(0, 70).replace(/\s+\S*$/, '') + '…' : title;
  title = title ? title[0].toUpperCase() + title.slice(1).replace(/[.]$/, '') : 'New request';
  return { title, type, counterparty: cp, deal: deal || null, team, urgent, due: due.toISOString() };
}

/* a request made by Submit with AI: read, then put at the top of the list */
function submitRequest(text, files, step) {
  step('Reading what you need');
  const got = mxReadRequest(text, files);
  setTimeout(() => step(`A${/^[AEIOU]/.test(got.type) ? 'n' : ''} ${got.type.toLowerCase()} request${got.counterparty ? ' with ' + got.counterparty : ''}`), 900);
  setTimeout(() => {
    const r = { id: mxNextRq(), ...got, submitter: USER.name, attorney: null, status: 'new', detail: text, files, updated: mxNow(), created: mxNow(), triaged: false };
    const blobs = files.map(n => MX.files?.get(n)).filter(Boolean);
    mxIntake().unshift(r); save();
    if (INTAKE_FX.rules) mxApplyRules(r);
    if (blobs.length) mxTakeFiles(r, blobs);
    MX.intake.open = null; mxOpen('intake', r.id);
    pbToast(`${r.id} is submitted`);
  }, 1900);
}

/* ── the form: the four questions legal asks before anything else ── */
function requestForm() {
  const f = { title: '', how: 'template', templates: [], files: [], counterparty: '', address: '' };
  const tpls = mxData().templates.filter(t => t.status === 'live');
  const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  const close = () => { removeEventListener('keydown', onKey, true); dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); };

  const field = (label, control) => h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, label), control);
  const input = (key, placeholder) => h('input', { class: 'mx-rqf-in', type: 'text', placeholder, value: f[key],
    oninput: (e) => { f[key] = e.target.value; sync(); } });
  const titleIn = input('title', 'e.g. Fleetwise Mobility — Enterprise MNDA');

  /* the paper it starts from: one of ours, or theirs. A small two-way switch
     beside the label; under it, either our templates as a list you can open,
     or a place to drop their document. */
  const CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>';
  const TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.3 2.8 2.8 6.2-6.4"/></svg>';
  const tplSub = (t) => [t.kind, 'v' + mxTplVer(t)].filter(Boolean).join(' · ');
  /* our templates: as many as the work needs, each a row you can take out, and one more to add */
  const tplList = h('div', { class: 'mx-rqf-stack' });
  const addTpl = h('button', { class: 'mx-rqf-add', type: 'button', 'aria-haspopup': 'listbox', onclick: (e) => { e.stopPropagation(); openTpls(); } });
  let paintTpl = () => {
    const chosen = f.templates.map(id => tpls.find(t => t.id === id)).filter(Boolean);
    tplList.replaceChildren(...chosen.map(t => h('div', { class: 'mx-rqf-item' }, mxTile('tpl'),
      h('span', { class: 'mx-rqf-pick-t' }, h('span', { class: 'mx-rqf-pick-n' }, t.name), h('span', { class: 'mx-rqf-pick-s' }, tplSub(t))),
      h('button', { class: 'mx-rqf-file-x', type: 'button', 'aria-label': `Remove ${t.name}`,
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
        onclick: () => { f.templates = f.templates.filter(x => x !== t.id); paintTpl(); sync(); } }))));
    /* two ways in, each a small tile that says what it is and what it does */
    const n = f.templates.length;
    addTpl.replaceChildren(h('span', { class: 'mx-rqf-tile-ic is-tpl' }, mxTile('tpl')),
      h('span', { class: 'mx-rqf-tile-t' }, h('b', {}, n ? 'Add a template' : 'Our templates'),
        h('span', {}, n ? `${mxPlural(n, 'template')} chosen` : `${tpls.length} approved, ready to fill`)),
      h('span', { class: 'mx-rqf-tile-go', html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>' }));
  };
  /* the picker: find one by name, tick as many as the work needs, done */
  const openTpls = (anchor = addTpl) => {
    document.querySelector('.mx-tpk')?.remove();
    const q = h('input', { class: 'mx-tpk-q', type: 'text', placeholder: 'Find a template…', 'aria-label': 'Find a template', autocomplete: 'off' });
    const list = h('div', { class: 'mx-tpk-list', role: 'listbox', 'aria-multiselectable': 'true' });
    const count = h('span', { class: 'mx-tpk-n' });
    const done = h('button', { class: 'pb-btn pb-btn--primary mx-tpk-done', type: 'button', onclick: () => shut() }, 'Done');
    const pop = h('div', { class: 'mx-tpk mx-tpk--multi' },
      h('div', { class: 'mx-tpk-head' }, h('span', { class: 'mx-tpk-glass', html: PB_SVG.search }), q),
      list,
      h('div', { class: 'mx-tpk-foot' }, count, done));
    const rows = () => {
      const t0 = q.value.trim().toLowerCase();
      const shown = tpls.filter(t => !t0 || (t.name + ' ' + (t.kind || '')).toLowerCase().includes(t0));
      list.replaceChildren(...(shown.length ? shown.map(t => {
        const on = f.templates.includes(t.id);
        return h('button', { class: 'mx-tpk-row' + (on ? ' is-on' : ''), type: 'button', role: 'option', 'aria-selected': String(on),
          onclick: () => { f.templates = on ? f.templates.filter(x => x !== t.id) : [...f.templates, t.id]; rows(); paintTpl(); sync(); } },
          h('span', { class: 'mx-tpk-box' + (on ? ' is-on' : ''), html: on ? TICK : '' }),
          mxTile('tpl'), h('span', { class: 'mx-rqf-pick-t' }, h('span', { class: 'mx-rqf-pick-n' }, t.name), h('span', { class: 'mx-rqf-pick-s' }, tplSub(t))));
      }) : [h('div', { class: 'mx-tpk-none' }, `No template called “${q.value.trim()}”`)]));
      count.textContent = f.templates.length ? `${mxPlural(f.templates.length, 'template')} chosen` : 'Choose one or more';
    };
    q.oninput = rows;
    rows();
    document.body.append(pop);
    const r = anchor.getBoundingClientRect(), box = (anchor.closest('.mx-rqf-f') || anchor).getBoundingClientRect();
    pop.style.width = box.width + 'px'; pop.style.left = box.left + 'px';
    pop.style.top = (innerHeight - r.bottom > pop.offsetHeight + 16 ? r.bottom + 6 : Math.max(12, r.top - pop.offsetHeight - 6)) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    q.focus();
    const out = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) shut(); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } if (e.key === 'Enter' && document.activeElement === q) { e.preventDefault(); list.querySelector('.mx-tpk-row')?.click(); } };
    function shut() { pop.remove(); anchor.setAttribute('aria-expanded', 'false'); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); }
    addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
  };
  paintTpl();

  /* their paper: one document or several, each a row; the drop zone stays under them for more */
  const take = (list) => { for (const x of list) if (!f.files.some(y => y.name === x.name)) f.files.push(x); paintFile(); sync(); };
  const fileIn = h('input', { type: 'file', hidden: true, multiple: true, accept: '.docx,.doc,.pdf,.rtf,.txt',
    onchange: (e) => { take([...e.target.files]); e.target.value = ''; } });
  const drop = h('div', { class: 'mx-rqf-drop2', role: 'button', tabindex: '0', onclick: () => fileIn.click(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } } });
  const fileList = h('div', { class: 'mx-rqf-stack' });
  const kb = (n) => !n ? '' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
  let paintFile = () => {
    drop.classList.toggle('is-small', f.files.length > 0);
    drop.replaceChildren(h('span', { class: 'mx-rqf-drop2-ic', html: APM_IC.upload ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + APM_IC.upload + '</svg>' : '' }),
      h('span', { class: 'mx-rqf-drop2-t' }, h('b', {}, f.files.length ? 'Add another document' : 'Drop their documents here'), ' or ', h('u', {}, 'browse')),
      h('span', { class: 'mx-rqf-drop2-s' }, 'Word or PDF'));
    fileList.replaceChildren(...f.files.map(x => h('div', { class: 'mx-rqf-item' }, mxTile('file', mxExt(x.name)),
      h('span', { class: 'mx-rqf-pick-t' }, h('span', { class: 'mx-rqf-pick-n' }, x.name), h('span', { class: 'mx-rqf-pick-s' }, kb(x.size) || 'Ready to send')),
      h('button', { class: 'mx-rqf-file-x', type: 'button', 'aria-label': `Remove ${x.name}`,
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
        onclick: () => { f.files = f.files.filter(y => y !== x); paintFile(); sync(); } }))), drop);
  };
  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); take([...e.dataTransfer.files]); });
  paintFile();

  /* one list: the templates chosen and their documents dropped in, together;
     under it, the two ways to add one more */
  const stack = h('div', { class: 'mx-rqf-stack' });
  const upBtn = h('button', { class: 'mx-rqf-tile', type: 'button', onclick: () => fileIn.click() },
    h('span', { class: 'mx-rqf-tile-ic is-up', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 14.5v4A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-4"/></svg>' }),
    h('span', { class: 'mx-rqf-tile-t' }, h('b', {}, 'Their paper'), h('span', {}, 'Drop or upload Word or PDF')),
    h('span', { class: 'mx-rqf-tile-go', html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>' }));
  addTpl.className = 'mx-rqf-tile';
  const adds = h('div', { class: 'mx-rqf-tiles' }, addTpl, upBtn);
  /* nothing yet: the two ways in, as tiles. Something chosen: one quiet list of
     everything — templates and their files together — and one "Add" that offers both */
  const more = h('button', { class: 'mx-rqf-more', type: 'button', 'aria-haspopup': 'menu' },
    h('span', { class: 'mx-rqf-more-ic', html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>' }), 'Add');
  more.onclick = (e) => { e.stopPropagation(); menu(more, [
    { label: 'A template', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 8h7M8.5 12h3.5M14 12h1.5M8.5 16h2M12.5 16h3"/></svg>', run: () => openTpls(more) },
    { label: 'Their paper', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 14.5v4A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-4"/></svg>', run: () => fileIn.click() },
  ]); if (openMenu) { openMenu.classList.add('mx-add-menu'); openMenu.style.left = more.getBoundingClientRect().left + 'px'; openMenu.style.zIndex = 200; } };
  const paintDocs = () => {
    /* rebuilt from what is chosen each time, templates and files together */
    _pt(); _pf();
    const items = [...tplList.querySelectorAll('.mx-rqf-item'), ...fileList.querySelectorAll('.mx-rqf-item')];
    stack.classList.toggle('has-items', items.length > 0);
    stack.replaceChildren(...(items.length ? [h('div', { class: 'mx-rqf-list' }, ...items), more] : [adds]), fileIn);
  };
  const _pt = paintTpl, _pf = paintFile;
  paintTpl = () => { _pt(); paintDocs(); };
  paintFile = () => { _pf(); paintDocs(); };
  for (const ev of ['dragenter', 'dragover']) stack.addEventListener(ev, (e) => { e.preventDefault(); adds.classList.add('is-over'); });
  stack.addEventListener('dragleave', () => adds.classList.remove('is-over'));
  stack.addEventListener('drop', (e) => { e.preventDefault(); adds.classList.remove('is-over'); take([...e.dataTransfer.files]); });
  paintTpl(); paintFile();
  const paper = h('div', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Documents'), stack);

  const submit = h('button', { class: 'pb-btn pb-btn--primary', type: 'button', disabled: true, onclick: () => {
    const chosen = f.templates.map(id => tpls.find(t => t.id === id)).filter(Boolean);
    const tpl = chosen[0] || null;
    const type = !chosen.length ? 'Contract review' : chosen.every(t => /nda|non-?disclosure/i.test(t.id + ' ' + t.name)) && !f.files.length ? 'NDA' : 'Drafting';
    const due = new Date(); due.setDate(due.getDate() + 5); due.setHours(17, 0, 0, 0);
    const r = { id: mxNextRq(), title: f.title.trim(), type, counterparty: f.counterparty.trim() || null, address: f.address.trim() || null,
      deal: null, team: null, submitter: USER.name, urgent: false, due: due.toISOString(), attorney: null, status: 'new',
      template: tpl?.id || null, templates: chosen.map(t => t.id), files: f.files.map(x => x.name), detail: '', updated: mxNow(), created: mxNow(), triaged: false };
    mxIntake().unshift(r); save();
    if (INTAKE_FX.rules) mxApplyRules(r);
    close();
    if (f.files.length) mxTakeFiles(r, f.files);
    mxOpen('intake', r.id);
    pbToast(`${r.id} is submitted`);
  } }, 'Submit Request');
  const sync = () => { submit.disabled = !f.title.trim() || !(f.templates.length || f.files.length); };

  const body = h('div', { class: 'mx-rqf-body' },
    field('Request Title', titleIn),
    paper,
    field('Counterparty Name', input('counterparty', 'e.g. Northwind EV Infrastructure')),
    h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Counterparty Address', h('span', { class: 'mx-rqf-hint' }, 'Optional')), input('address', 'e.g. 14 Calder Street, Leeds LS1 4AB')));
  dim.append(h('div', { class: 'pb-dlg mx-rqf', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Submit New Request' },
    h('header', { class: 'mx-rqf-head' },
      h('h2', { class: 'pb-dlg-t' }, 'Submit New Request'),
      h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' })),
    body,
    h('footer', { class: 'mx-rqf-foot' },
      h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'), submit)));
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => titleIn.focus());
}

/* ── where a request is: a stage on the path its kind of work takes ──
   A contract on our paper is drafted, checked inside, sent, signed. One on
   their paper is reviewed first instead. A question is researched and
   answered; a notice drafted and sent; a final agreement signed. */
const MX_PIPE = {
  /* approvals are not a stage: they are tracked on the Approvals tab and stand between negotiation and signing */
  draft:  ['Intake', 'Drafting', 'Negotiation', 'Signing', 'Signed'],
  review: ['Intake', 'Review', 'Negotiation', 'Signing', 'Signed'],
  advice: ['Intake', 'Research', 'Answered'],
  notice: ['Intake', 'Drafting', 'Notice Sent'],
  sign:   ['Intake', 'Signing', 'Signed'],
};
const MX_STAGE_SEED = { 'RQ-1047': 2, 'RQ-1046': 1, 'RQ-1044': 1, 'RQ-1043': 2, 'RQ-1042': 3, 'RQ-1040': 1, 'RQ-1038': 2 };
const mxPipe = (r) => r.type === 'Advice' ? 'advice' : r.type === 'Termination' ? 'notice' : r.type === 'Signature' ? 'sign'
  : (MX_CONTRACT_OF[r.counterparty] || r.type === 'Contract review' || /their paper|their own/i.test(r.title + ' ' + (r.detail || ''))) ? 'review' : 'draft';
const mxStages = (r) => r.mt && typeof MO_STAGES !== 'undefined' ? MO_STAGES : MX_PIPE[mxPipe(r)];   // a matter goes through its own five stages
function mxStage(r) {
  const s = mxStages(r);
  if (r.stage == null) r.stage = MX_STAGE_SEED[r.id] ?? (r.status === 'done' ? s.length - 1 : r.status === 'new' ? 0 : 1);
  r.stage = Math.min(r.stage, s.length - 1);
  return r.stage;
}
/* finished with: completed or cancelled */
const mxClosed = (r) => r.status === 'done' || r.status === 'cancelled';
function mxSetStage(r, i) {
  const s = mxStages(r);
  r.stage = i; r.status = i === s.length - 1 ? 'done' : i === 0 ? 'new' : 'progress';
  r.updated = mxNow(); save();
}
/* the ring for any stage of a path, for the menu */
const mxStageRingAt = (i, n) => mxStageRing({ stage: i, _n: n });
/* a ring that fills as it goes; once it is through, a filled green tick */
const mxStageRing = (r) => {
  const s = r._n ? { length: r._n } : mxStages(r), i = r._n ? r.stage : mxStage(r), done = i === s.length - 1;
  if (done) return '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="7" fill="#2F8A55"/><path d="m5 8.2 2 2 4-4.3" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const c = 2 * Math.PI * 5.5, f = c * (i / (s.length - 1));
  const col = i === 0 ? '#9A968E' : '#C28A1E';
  return `<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="5.5" fill="none" stroke="${col}" stroke-opacity=".3" stroke-width="1.6"/>`
    + `<circle cx="8" cy="8" r="5.5" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="${f} ${c}" transform="rotate(-90 8 8)" stroke-linecap="round"/></svg>`;
};
/* what each approving role looks at in the deal: the terms that, if they change, are theirs to see again */
const MX_ROLE_TERMS = { Legal: /./, Finance: /fee|payment|price|liabil/i, Business: /term|renew|fee|payment|terminat/i, Privacy: /data|breach|subprocess|audit/i };
/* the rules: which roles have to approve this deal, who can, and why — read from the deal as it stands */
function mxApprovalRules(r) {
  if (r.resolvedBy || mxPipe(r) === 'advice' || mxPipe(r) === 'sign') return [];
  const val = Number(String((MX_DEALS[r.deal] || {}).value || r.dealInfo?.value || '').replace(/[^\d]/g, '')) || 0;
  const docs = mxDocuments(r);
  /* terms that will stand outside the playbook: their change taken, or still waiting on a decision */
  const outside = Object.values(mxRounds(r).docs).flatMap(list => { const rd = list[list.length - 1]; return rd ? rd.points : []; })
    .filter(p => p.playbook === 'outside' && (!p.decision || ['accept', 'signoff'].includes(p.decision.d)));
  const termOf = (p) => p.term || Object.values(typeof MX_ROUNDS !== 'undefined' ? MX_ROUNDS : {}).flatMap(dd => Object.values(dd).flat()).flatMap(rd => rd.points).find(q => q.html === p.html)?.term || p.clause.replace(/^\d+\.\s*/, '');
  return [
    { role: 'Legal', ...(r.attorney ? { who: r.attorney } : { team: 'Legal team' }), why: 'Every contract is reviewed by legal before it is signed' },
    val >= 250000 ? { role: 'Finance', team: 'Finance', why: `Deals over £250,000 need Finance. This one is ${(MX_DEALS[r.deal] || r.dealInfo).value}.` } : null,
    outside.length ? { role: 'General Counsel', who: 'Roger Bennett', why: `Outside the playbook: ${outside.map(termOf).join(', ')}`, terms: outside.map(termOf) } : null,
    docs.some(d => d.source === 'dpa' || /data processing/i.test(d.title)) ? { role: 'Privacy', who: 'Aisha Rahman', why: 'Personal data is processed under a DPA' } : null,
    mxPipe(r) === 'notice' ? null : { role: 'Business', who: r.submitter, why: `${r.submitter.split(' ')[0]} asked for this, and confirms the commercial terms` },
  ].filter(Boolean);
}
/* ── approvals and signatures, kept on the request ──
   An approval is a role, the rule that requires it, who can give it, and
   the version it was given on. They are asked for together, on one
   version, when counsel is ready; a later version asks again only the
   roles whose terms it changed. Signatures follow. */
const SIGN_EXPIRES_DAYS = 14;
function mxSign(r) {
  const pipe = mxPipe(r);
  if (pipe === 'advice') return null;
  if (r.sign?.v !== 3) {
    const s = mxStages(r), at = mxStage(r), sAt = s.indexOf('Signing'), last = s.length - 1;
    const past = (sAt >= 0 && at >= sAt) || (pipe === 'notice' && at >= 2);
    const ago = (days) => new Date(Date.now() - days * 864e5).toISOString();
    const contact = mxPeople(r).find(p => p.side === 'counterparty');
    const them = r.id === 'RQ-1048' ? 'Helen Ward' : contact?.name || null;
    const signed = at === last && s[last] === 'Signed';
    const signer = (who, what) => ({ who, what, state: signed ? 'signed' : 'not', at: signed ? (r.updated || mxNow()) : null, reminded: null });
    const old = r.sign;
    const mainV = (mxDocuments(r).find(x => x.id === 'd1') || mxDocuments(r)[0])?.versions.length || 0;
    r.sign = { v: 3, approvals: [], requested: null,
      signers: old?.signers || (pipe === 'notice' ? [signer(USER.name, 'Signs the notice')] : [signer(them, `Signs for ${r.counterparty || 'them'}`), signer(USER.name, 'Signs for us')]),
      order: old?.order || 'in order', cc: old?.cc || [], sent: old?.sent || null, doc: old?.doc, signed: old?.signed };
    if (r.id === mxData().showcaseId) {
      /* Brightwell: asked on v4 two days ago; Elena has said yes */
      r.sign.requested = { v: 4, at: ago(2) };
      r.sign.seed = { Legal: { state: 'approved', at: ago(2), by: 'Elena Petrova', onV: 4 } };
      r.sign.sent = null; r.sign.signers.forEach(x => { x.state = 'not'; x.at = null; });
    } else if (past) { r.sign.requested = { v: mainV, at: r.updated || mxNow() }; r.sign.seed = { '*': { state: 'approved', at: r.updated || mxNow(), onV: mainV } }; }
  }
  /* the rules are read again every time: a role joins when the deal starts to need it, and drops off when it no longer does */
  const sg = r.sign, rules = mxApprovalRules(r);
  for (const rule of rules) {
    let x = sg.approvals.find(y => y.role === rule.role);
    if (!x) {
      const seed = sg.seed?.[rule.role] || sg.seed?.['*'];
      x = { id: pbUid('ap'), role: rule.role, state: sg.requested ? 'pending' : 'not', asked: sg.requested?.at || null, at: null, by: null, onV: null, note: null, ...(seed || {}) };
      sg.approvals.push(x);
    }
    if (!x.manualWho) { x.who = rule.who || null; x.team = rule.team || null; }
    x.why = rule.why; x.terms = rule.terms || null; x.gone = false;
  }
  for (const x of sg.approvals) if (!x.manual && !rules.some(rule => rule.role === x.role)) x.gone = true;
  delete sg.seed;
  return sg;
}
const mxApOk = (x) => x.state === 'approved';
/* where an approval stands now, including one given on a version that has since changed what this role looks at */
function mxApNow(r, x) {
  if (x.gone) return { k: 'gone' };
  if (x.state !== 'approved') return { k: x.state };
  const docs = mxDocuments(r), d1 = docs.find(d => d.id === 'd1') || docs[0], mainV = d1 ? d1.versions.length : 0;
  if (!x.onV || mainV <= x.onV) return { k: 'approved' };
  const want = x.role === 'General Counsel' ? null : MX_ROLE_TERMS[x.role] || /./;
  const changed = Object.values(mxRounds(r).docs).flatMap(list => list.filter(rd => (rd.answered || rd.v) > x.onV)).flatMap(rd => rd.points)
    .filter(p => want ? want.test(p.clause + ' ' + (p.term || '')) : p.playbook === 'outside').map(p => p.term || p.clause.replace(/^\d+\.\s*/, ''));
  return changed.length ? { k: 'stale', changed } : { k: 'approved' };
}
/* everything that still has to say yes before the document goes for signature */
function mxSignWaiting(r) {
  const sg = mxSign(r); if (!sg) return [];
  return sg.approvals.filter(x => !x.gone && mxApNow(r, x).k !== 'approved').map(x => ({ who: x.who || `Any one of ${x.team}`, what: x.role }));
}
/* is this request waiting on my yes: an approval asked of me by name */
function mxAwaitsMe(r) {
  const sg = mxSign(r); if (!sg || !sg.requested) return false;
  return sg.approvals.some(x => !x.gone && x.who === USER.name && ['pending', 'stale'].includes(mxApNow(r, x).k));
}
/* what an approver needs to say yes without opening the contract: the deal in one line, and the
   few terms that matter to their step, each as it now stands */
function mxApprovalBrief(r, step, point) {
  const docs = mxDocuments(r), d1 = docs.find(x => x.id === 'd1') || docs[0];
  const deal = MX_DEALS[r.deal] || r.dealInfo || {};
  const side = (r.counterparty || 'them').split(/\s+/)[0];
  const tagOf = (d) => /msa/.test(d.source || '') ? 'MSA' : d.source === 'dpa' ? 'DPA' : /nda/.test(d.source || '') ? 'NDA' : mxPlain(d.title).replace(/\.\w+$/, '');
  const sub = [r.id, d1 ? `${tagOf(d1)} v${d1.versions.length}` : null, deal.value && deal.value !== '—' ? deal.value : null].filter(Boolean).join(' · ');
  const plainOf = (html, k) => mxPlain((String(html).match(new RegExp(`<${k}>([\\s\\S]*?)</${k}>`, 'g')) || []).join(' ').replace(/<\/?(del|ins)>/g, '')).trim();
  const now = (p) => p.decision?.d === 'counter' ? p.decision.text : p.decision?.d === 'keep' ? (plainOf(p.html, 'del') || 'Our wording, unchanged') : (plainOf(p.html, 'ins') || plainOf(p.html, 'del'));
  const PB = { within: 'within the playbook', fallback: 'our fallback', outside: 'outside the playbook' };
  /* lawyers' numbers ("sixty (60) days’") said the way people say them ("60 days") */
  const say = (t) => String(t || '').replace(/\b[a-z-]+(?: [a-z-]+)? \((\d+%?)\)/gi, '$1').replace(/[’']\s*$/, '').replace(/^\w/, c => c.toUpperCase()).trim();
  const tagOfPt = (pt) => { const id = Object.keys(mxRounds(r).docs).find(k => mxRoundOf(r, k)?.points.includes(pt)); const dd = docs.find(x => x.id === id); return dd ? tagOf(dd) : ''; };
  const seedTerm = (pt) => pt.term || Object.values(typeof MX_ROUNDS !== 'undefined' ? MX_ROUNDS : {}).flatMap(dd => Object.values(dd).flat()).flatMap(rd => rd.points).find(q => q.html === pt.html)?.term;
  if (point) return { title: (seedTerm(point) || point.clause.replace(/^\d+\.\s*/, '')), sub: `${r.id} · ${tagOfPt(point)} ${point.clause.replace(/^(\d+)\..*/, '$1')} · ${side}’s change`, lines: [
    [`${side} wants`, say(plainOf(point.html, 'ins')) || `To remove: ${say(plainOf(point.html, 'del'))}`],
    ['We had', say(plainOf(point.html, 'del')) || 'Nothing on this'],
    ['Playbook', `${(PB[point.playbook] || 'no position').replace(/^\w/, c => c.toUpperCase())}${point.why ? `. ${point.why}.` : ''}`],
    ...(point.flag ? [['Note', point.flag]] : []),
  ], approveSays: `Approving accepts ${side}’s wording.` };
  /* the terms each kind of step cares about */
  const want = /general counsel/i.test(step) ? null : /finance/i.test(step) ? MX_ROLE_TERMS.Finance : /business/i.test(step) ? MX_ROLE_TERMS.Business : /privacy/i.test(step) ? MX_ROLE_TERMS.Privacy : /./;
  const pts = Object.entries(mxRounds(r).docs).flatMap(([id, list]) => { const rd = list[list.length - 1]; const d = docs.find(x => x.id === id);
    return rd && d ? rd.points.filter(p => (want ? want.test(p.clause + ' ' + (p.term || '')) : p.playbook === 'outside' && (!p.decision || ['accept', 'signoff'].includes(p.decision.d))) && (/legal/i.test(step) ? p.playbook !== 'within' : true)).map(p => ({ p, d })) : []; });
  /* the short name and where it landed, from the seeded point when this one predates them */
  const seedOf = (p) => p.term ? p : Object.values(MX_ROUNDS || {}).flatMap(dd => Object.values(dd).flat()).flatMap(rd => rd.points).find(q => q.html === p.html) || p;
  const lines = pts.slice(0, 5).map(({ p }) => { const q = seedOf(p), k = p.decision?.d;
    const tail = k === 'keep' ? 'our wording kept' : k === 'counter' ? 'our fallback' : k === 'accept' ? (p.playbook ? PB[p.playbook] : `${side}’s wording`) : k === 'signoff' ? `${side}’s wording, if you approve` : 'not answered yet';
    return [q.term || p.clause.replace(/^\d+\.\s*/, ''), `${q.brief || (k === 'counter' ? p.decision.text : now(p))} · ${tail}`]; });
  if (!lines.length) lines.push(['Terms', d1 ? `${tagOf(d1)} v${d1.versions.length} as it stands; nothing outside the playbook` : 'No document yet']);
  return { title: step, sub, lines, approveSays: null };
}
const mxActiveStage = () => -1;
/* moving into signing with approvals still out asks first */
function mxStageGate(r, i, go) {
  const sAt = mxStages(r).indexOf('Signing');
  const wait = sAt >= 0 && i >= sAt && mxStage(r) < sAt ? mxSignWaiting(r) : [];
  if (!wait.length) return go();
  pbConfirm({ title: 'Approvals are still waiting', lead: `${r.id} should go to signing once ${wait.length === 1 ? 'this is' : 'these are'} in.`,
    items: wait.map(x => ({ n: x.who || 'Not assigned', t: x.what })), action: 'Move anyway', run: go });
}

/* ── rounds: the points in each document the other side sent back ── */
function mxRounds(r) {
  if (r.rounds?.v === 1) return r.rounds;
  const key = r.id === 'RQ-1048' ? 'Northwind Ltd' : r.id === mxData().showcaseId ? 'Brightwell Energy plc' : null;
  const src = key && typeof MX_ROUNDS !== 'undefined' ? MX_ROUNDS[key] : null;
  r.rounds = { v: 1, docs: src ? JSON.parse(JSON.stringify(src)) : {} };
  save(); return r.rounds;
}
const mxRoundOf = (r, docId) => { const list = mxRounds(r).docs[docId]; return list?.length ? list[list.length - 1] : null; };
const mxSignoffPoints = (r) => Object.values(mxRounds(r).docs).flatMap(list => { const rd = list[list.length - 1]; return rd && !rd.answered ? rd.points.filter(p => p.decision?.d === 'signoff' && p.signoff) : []; });
/* a round from two versions: each changed paragraph is a point, under the clause it sits in */
function mxRoundFromCompare(r, d, v, base) {
  const res = typeof mxCompare === 'function' ? mxCompare(d.versions[base - 1], d.versions[v - 1]) : null;
  const points = [];
  let head = '';
  /* the change with just enough of the sentence around it to read */
  const clip = (ops) => ops.map(([k, t], i) => {
    if (k !== 'eq') return `<${k}>${mxEsc(t)}</${k}>`;
    if (i === 0 && t.length > 70) return '…' + mxEsc(t.slice(-70).replace(/^\S*\s/, ''));
    if (i === ops.length - 1 && t.length > 70) return mxEsc(t.slice(0, 70).replace(/\s\S*$/, '')) + '…';
    if (t.length > 140) return mxEsc(t.slice(0, 60).replace(/\s\S*$/, '')) + ' … ' + mxEsc(t.slice(-60).replace(/^\S*\s/, ''));
    return mxEsc(t);
  }).join('');
  for (const row of res?.rows || []) {
    const changed = (row.ops || []).some(([k]) => k !== 'eq');
    if (row.t === 'h2') head = (row.ops || []).filter(([k]) => k !== 'del').map(([, t]) => t).join('').trim() || head;
    if (changed && row.t !== 'h1' && row.t !== 'h2') points.push({ clause: head || 'Opening', html: clip(row.ops), playbook: null, suggest: null, decision: null, find: null, ours: null });
  }
  (mxRounds(r).docs[d.id] ||= []).push({ v, base, answered: null, points });
  save(); return points.length;
}
/* ── tagged comments, pulled from the Word plugin ── */
function mxWComments(r) {
  if (r.wcomments?.v === 2) return r.wcomments.items;   /* v2 (15 Oct): the showcase MSA carries every comment case */
  const key = r.id === mxData().showcaseId ? 'showcase' : r.id;
  const src = typeof MX_WCOMMENTS !== 'undefined' ? MX_WCOMMENTS[key] || [] : [];
  const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
  r.wcomments = { v: 2, items: src.map(([doc, v, clause, quote, by, to, text, d, status, thread, draft, assignee], i) => ({ id: `wc${i + 1}`, doc, v, clause, quote, by, to, text, when: ago(d), status,
    thread: thread.map(([who, t, dd, sys]) => ({ who, text: t, when: ago(dd), ...(sys ? { sys: true } : {}) })), draft, ...(assignee ? { assignee } : {}) })) };
  save(); return r.wcomments.items;
}
/* active: still needs someone — open on the person tagged, or replied and back with the other side */
const mxWActive = (r) => mxWComments(r).filter(c => c.status !== 'closed');

/* ── a round, run as a playbook review ─────────────────────────────
   Their version of the document, clause by clause, read against the
   playbook: the review workspace (review.js) the Contracts module uses,
   fed from the round. A changed clause lands where its point does; our
   two answers are its suggestions — Keep ours puts our wording back,
   Counter offers the playbook's fallback — and what is applied becomes
   our response. Unchanged clauses stay in the document but off the list. */
const MX_RD_STATUS = { outside: 'unacceptable', fallback: 'fallback', within: 'preferred' };
const mxPlain = (t) => String(t).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function mxHtmlSegs(html) {
  const out = [], re = /<(del|ins)>([\s\S]*?)<\/\1>/g; let i = 0, m;
  while ((m = re.exec(html))) { if (m.index > i) out.push(['t', mxPlain(html.slice(i, m.index))]); out.push([m[1], mxPlain(m[2])]); i = re.lastIndex; }
  if (i < html.length) out.push(['t', mxPlain(html.slice(i))]);
  return out.filter(x => x[1]);
}
/* the text a set of segments leaves once its changes are taken */
const mxSegsText = (segs) => segs.filter(([k]) => k !== 'del').map(([, t]) => t).join('');
const mxSegsHtml = (segs) => segs.map(([k, t]) => k === 't' ? mxEsc(t) : `<${k}>${mxEsc(t)}</${k}>`).join('');
function mxRoundReview(r, d, rd) {
  const side = (r.counterparty || 'Their').split(/\s+/)[0], v = d.versions[rd.v - 1];
  const tag = /msa/.test(d.source || '') ? 'MSA' : d.source === 'dpa' ? 'DPA' : /nda/.test(d.source || '') ? 'NDA' : mxPlain(d.title).replace(/\.\w+$/, '');
  const pbName = /msa/.test(d.source || '') ? 'SaaS subscription agreement' : d.source === 'dpa' ? 'Data protection' : /nda/.test(d.source || '') ? 'Mutual NDA' : 'Standard terms';
  const norm = (t) => mxPlain(t).toLowerCase().replace(/^[\d\s.]+/, '').trim();
  const secs = []; let cur = null;
  for (const b of v.blocks || []) {
    if (b.t === 'h2') secs.push(cur = { heading: mxPlain(b.v).replace(/^(\d+)(\d+)\./, (m0, a, b2) => `${b2}.`), html: [] });
    else if (cur && b.t === 'p') cur.html.push(b.v);
  }
  const counts = { unacceptable: 0, fallback: 0, preferred: 0 };
  const clauses = secs.map((c, i) => {
    const segs = mxHtmlSegs(c.html.join(' '));
    const changed = segs.some(([k]) => k !== 't');
    const p = changed ? rd.points.find(pt => norm(c.heading).startsWith(norm(pt.clause)) || norm(pt.clause).startsWith(norm(c.heading))) : null;
    const status = !changed ? 'preferred' : p?.playbook ? MX_RD_STATUS[p.playbook] : 'none';
    if (changed && counts[status] != null) counts[status]++;
    const sug = [];
    if (changed) {
      const keep = segs.map(([k, t]) => [k === 'del' ? 'ins' : k === 'ins' ? 'del' : 't', t]);
      sug.push({ key: 'starting', label: 'Keep ours', summary: 'Puts our wording back.', text: mxSegsText(keep), segments: keep });
      const ct = p?.decision?.d === 'counter' ? p.decision.text : p?.suggest?.d === 'counter' ? p.suggest.text : null;
      if (ct) {
        const cs = []; let used = false; const hasIns = segs.some(([k]) => k === 'ins');
        for (const [k, t] of segs) {
          if (k === 't') cs.push(['t', t]);
          else if (k === 'ins') { cs.push(['del', t]); if (!used) { cs.push(['ins', ct]); used = true; } }
          else if (!hasIns && !used) { cs.push(['ins', ct]); used = true; }
        }
        const counter = { key: 'fallback', label: 'Counter', summary: `Offers ${ct}.`, text: mxSegsText(cs), segments: cs };
        if (p?.suggest?.d === 'counter') sug.unshift(counter); else sug.push(counter);
      }
    }
    const firstIns = segs.find(([k]) => k === 'ins')?.[1] || '';
    return { n: i + 1, heading: c.heading, topic: c.heading.replace(/^\d+\.\s*/, ''), status, segments: segs, text: mxSegsText(segs),
      summary: !changed ? 'Unchanged from our draft.' : p?.playbook === 'within' ? `${side} changed this, and it is within the playbook.` : p?.playbook === 'fallback' ? `${side} changed this. It is past our starting position but within the fallback.` : p ? `${side} changed this.` : `${side} changed this clause. The playbook has no position on it.`,
      why: [p?.why && `${p.why}.`, p?.flag].filter(Boolean).join(' '), issue: p?.playbook === 'outside' ? (p.why || `${side}’s change is outside the playbook`) : '', their_text: firstIns.trim(),
      suggestions: sug, quiet: !changed, point: p || null, flag: p?.flag || null };
  });
  return { id: `round:${r.id}:${d.id}:${rd.v}`, name: `${side}’s changes to the ${tag}, v${rd.v}`, playbook: { id: 'round-' + pbName, name: pbName },
    clauses, missing: [], missing_checked: true, deep: {}, counts, tag, side };
}
/* the round, opened: the review workspace, with the way back to the request and our response as its action */
function mxRoundPage(r, docId) {
  const d = mxDocuments(r).find(x => x.id === docId), rd = d && mxRoundOf(r, docId);
  if (!rd) { MX.intake.round = null; return intakePage(r); }
  const a = mxRoundReview(r, d, rd);
  JV_REVIEWS[a.id] = a;
  /* what legal already decided on the point carries into the review as applied */
  if (!rd.work) {
    const applied = {};
    for (const c of a.clauses) { const k = c.point?.decision?.d; const o = k === 'keep' ? c.suggestions.find(x => x.key === 'starting') : k === 'counter' ? c.suggestions.find(x => x.key === 'fallback') : null; if (o) applied[c.n] = o.text; }
    rd.work = { applied, mode: {}, notes: {}, edits: {} };
  }
  const back = () => { MX.intake.round = null; MX.intake.tab = 'docs'; go('intake'); };
  const req = { id: r.id, title: a.name, review: a.id, activity: r.activity, answered: rd.answered,
    tab: MX.intake.roundTab || 'playbook',
    /* the third tab: back to the document, with its comments open */
    extraTab: { k: 'comments', label: 'Comments', icon: MX_TAB_ICONS.comments,
      run: () => { MX.intake.round = null; MX.intake.roundTab = null; MX.intake.swap = true; state.rqCmtPanel = true; save(); MX.intake.tab = 'docs'; MX.intake.focus = { doc: d.id, v: d.versions.length }; go('intake'); } },
    get work() { return rd.work; }, set work(w) { rd.work = w; },
    back: { label: 'Documents', run: back },
    respond: (applied, notes, sure) => {
      if (rd.answered) { MX.intake.round = null; MX.intake.tab = 'docs'; MX.intake.focus = { doc: d.id, v: rd.answered }; go('intake'); return; }
      /* a point still waiting on someone's sign-off holds the response, unless you say otherwise */
      const out = rd.points.filter(p => p.decision?.d === 'signoff');
      if (out.length && !sure) return pbConfirm({ title: 'A sign-off is still out', lead: 'These points are waiting on a decision. Their wording will go back accepted unless you change it first.',
        items: out.map(p => ({ n: p.signoff, t: p.clause.replace(/^\d+\.\s*/, '') })), action: 'Create anyway', run: () => req.respond(applied, notes, true) });
      /* their version with every change of theirs taken, and our applied wording back as tracked changes */
      const v = d.versions[rd.v - 1]; let ci = -1, used = new Set();
      const blocks = [];
      for (const b of v.blocks || []) {
        if (b.t === 'h2') { ci++; blocks.push({ t: 'h2', v: mxPlain(b.v).replace(/^(\d+)(\d+)\./, (m0, x, y) => `${y}.`) }); continue; }
        const c = a.clauses[ci], text = c && applied[c.n];
        const opt = text != null && c.suggestions.find(o => o.text === text);
        if (b.t === 'p' && opt) { if (!used.has(c.n)) { used.add(c.n); blocks.push({ t: 'p', v: mxSegsHtml(opt.segments) }); } continue; }
        blocks.push({ t: b.t, v: mxSegsHtml(mxHtmlSegs(b.v).filter(([k]) => k !== 'del').map(([k, t]) => ['t', t])) });
      }
      const changed = a.clauses.filter(c => !c.quiet);
      for (const c of changed) if (c.point) { const o = c.suggestions.find(x => x.text === applied[c.n]); c.point.decision = !o ? { d: 'accept' } : o.key === 'starting' ? { d: 'keep' } : { d: 'counter', text: o.summary.replace(/^Offers |\.$/g, '') }; }
      const kept = changed.filter(c => applied[c.n] != null).length, took = changed.length - kept;
      const said = [took && `${took} accepted`, kept && `${kept} answered`].filter(Boolean).join(', ');
      const nv = { name: 'Our response', by: USER.name, when: mxNow(), file: `${d.title.replace(/\.\w+$/, '')} v${d.versions.length + 1}.docx`, blocks, note: `Our answers to ${a.side}’s v${rd.v}: ${said}` };
      mxAddVersion(r, nv, d.id); rd.answered = d.versions.length;
      const shared = Object.values(notes || {}).flat().filter(n => !n.internal).length;
      mxLog(r, { ev: 'version', what: `created v${d.versions.length} of the ${a.tag}, answering ${a.side}’s changes: ${said}${shared ? `, with ${mxPlural(shared, 'comment', 'comments')} for them` : ''}`, ref: { doc: d.id, v: d.versions.length } });
      save(); pbToast(`Our response is v${d.versions.length}`);
      MX.intake.round = null; MX.intake.tab = 'docs'; MX.intake.focus = { doc: d.id, v: d.versions.length }; go('intake');
    } };
  const swap = MX.intake.swap; MX.intake.swap = false;
  const pageEl = reviewPage(req);
  if (swap) { pageEl.classList.add('is-swap'); pageEl.style.animation = 'none'; setTimeout(() => pageEl.classList.remove('is-swap'), 450); }
  return pageEl;
}

const DOC_ROUND_CHIP = false;
/* a comment's status as a mark, the same as the Status filter: open amber, replied blue, closed green */
/* where a thread stands, as a tag: Open, Replied, Resolved */
const mxWcState = (c) => c.status === 'closed' ? ['closed', 'Resolved'] : c.status === 'replied' ? ['replied', 'Replied'] : ['open', 'Open'];
const MX_ST_MARK = {
  mine: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
  replied: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 7 5 11.5 9.5 16"/><path d="M5 11.5h8.5a5 5 0 0 1 5 5V18"/></svg>',
  closed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>',
};
/* the exact moment, for anyone checking the record: "Saturday 12 October 2026 at 14:32" */
const mxFullWhen = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
const mxWhenTip = (o) => mxFullWhen(o.when) + (o.edited ? ` · edited ${mxFullWhen(o.edited)}` : '');
const mxStMark = (k) => h('span', { class: 'rqp-st-ic is-' + k, html: MX_ST_MARK[k] || '' });
/* the three tabs under a document's side pane: the playbook's reading, questions, and comments — the Contracts icons */
const MX_TAB_ICONS = {
  playbook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 4v16"/><path d="M12.5 8.5h4M12.5 12h4M12.5 15.5h2.5"/></svg>',
  ask: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16.9A2.5 2.5 0 0 1 4 14.5z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>',
  comments: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z"/></svg>',
};
/* comments open = the request folds away (15 Oct); false keeps the three-pane layout */
const CMT_FOCUS = true;
/* where a document's negotiation stands, in a few words */
function mxRoundSay(r, d) {
  const rd = mxRoundOf(r, d.id); if (!rd) return null;
  const side = (r.counterparty || 'them').split(/\s+/)[0];
  if (rd.answered) return { k: 'with', say: `With ${side}` };
  const open = rd.points.filter(p => !p.decision || p.decision.d === 'signoff').length;
  return open ? { k: 'answer', say: `${open} to answer` } : { k: 'ready', say: 'Ready to send back' };
}

/* the stage where you see it, changeable there: the whole path in order,
   what is done ticked, where it is now marked, what is left dotted */
/* ── a request's status, as a task's ──
   New · In progress · Waiting · Completed · Cancelled (MX_ST.req). The path the work takes
   (drafting, negotiation, signing) still runs underneath for approvals and signatures. */
function mxReqStatusMenu(anchor, r, picked) {
  pbWaysMenu(anchor, 'mx-st', Object.entries(MX_ST.req).map(([k, v]) => ({
    key: k, name: v.label, on: k === r.status,
    icon: () => h('span', { class: 'mx-st-mi', style: `color:${v.color}`, html: v.svg }) })),
  (k) => {
    if (k === r.status) return;
    const was = r.status;
    r.status = k; r.updated = mxNow(); save();
    mxLog(r, { ev: 'status', what: `moved this to ${MX_ST.req[k].label}` });
    picked?.(k, was);
    /* finishing takes it off the open list, with a way back */
    if (k === 'done' || k === 'cancelled') pbToast(`${r.id} is ${MX_ST.req[k].label.toLowerCase()}`, { label: 'Undo', run: () => { r.status = was; (r.activity || []).pop(); save(); picked?.(was, k); } });
  }, { small: true });
}
function mxReqStatusBtn(r, after) {
  if (!MX_ST.req[r.status]) r.status = 'progress';
  const btn = h('button', { class: 'pb-st mx-st mx-st-btn', type: 'button', 'data-tip': 'Change Status', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); mxReqStatusMenu(btn, r, (k) => { paint(); btn.classList.remove('is-set'); void btn.offsetWidth; btn.classList.add('is-set'); after?.(k); }); } });
  const paint = () => { const v = MX_ST.req[r.status] || MX_ST.req.progress; btn.style.setProperty('--st', v.color);
    btn.replaceChildren(h('span', { class: 'pb-st-ic', html: v.svg }), v.label,
      ...(btn.classList.contains('rqp-stage') ? [h('span', { class: 'rqp-stage-chev', html: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>' })] : [])); };
  paint();
  btn._paint = paint;
  return btn;
}
function mxStageBtn(r, after) {
  const btn = h('button', { class: 'pb-st mx-st mx-st-btn mx-stage', type: 'button', 'data-tip': 'Change Stage', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); mxStageMenu(btn, r, (i, was) => { paint(); after?.(i, was); }); } });
  const paint = () => btn.replaceChildren(h('span', { class: 'pb-st-ic', html: mxStageRing(r) }), mxStages(r)[mxStage(r)],
    ...(btn.classList.contains('rqp-stage') ? [h('span', { class: 'rqp-stage-chev', html: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>' })] : []));
  paint();
  btn._paint = paint;
  return btn;
}
/* the path, hanging from whatever was clicked: done ticked, now ringed, the rest dotted */
function mxStageMenu(btn, r, moved) {
      if (openMenu?.classList.contains('rqs')) { closeMenu(); return; }
      closeMenu();
      const s = mxStages(r), at = mxStage(r);
      const tick = '<svg viewBox="0 0 16 16" width="10" height="10"><path d="m4 8.4 2.6 2.6L12 5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const el = h('div', { class: 'menu rqs', role: 'menu' },
        ...s.map((name, i) => {
          const k = i < at || (i === at && i === s.length - 1) ? 'done' : i === at ? 'now' : 'todo';
          return h('button', { class: 'rqs-row is-' + k + (i < at ? ' is-past' : ''), type: 'button', role: 'menuitemradio', 'aria-checked': String(i === at),
            onclick: () => { closeMenu(); if (i === at) return; const was = at; mxStageGate(r, i, () => { mxSetStage(r, i); moved(i, was); }); } },
            h('span', { class: 'rqs-mark', html: k === 'done' ? tick : k === 'todo' ? String(i + 1) : '' }),
            h('span', { class: 'rqs-t' }, h('span', { class: 'rqs-n' }, name)));
        }));
      el.addEventListener('click', ev => ev.stopPropagation());
      document.body.append(el); openMenu = el;
      const b = btn.getBoundingClientRect();
      const flip = innerHeight - b.bottom < el.offsetHeight + 16;
      el.style.top = (flip ? b.top - el.offsetHeight - 6 : b.bottom + 6) + 'px';
      el.style.left = Math.max(12, Math.min(b.right - el.offsetWidth, innerWidth - el.offsetWidth - 12)) + 'px';
      el.classList.add('opening');
}

/* each counterparty, as the company register and their paper describe it */
const MX_CPS = {
  'Northwind Ltd': { legal: 'Northwind Ltd', kind: 'Private limited company', where: 'England and Wales', no: 'Company no. 08812345', addr: '14 Calder Street, Leeds LS1 4AB, United Kingdom', law: 'England and Wales', lawFrom: 'our template' },
  'Acme Corp': { legal: 'Acme Corporation', kind: 'Corporation', where: 'Delaware, USA', no: 'File no. 5523817', addr: '500 Market Street, San Francisco, CA 94105, USA', law: 'State of California', lawFrom: 'their redline' },
  'Brightline Hosting Ltd': { legal: 'Brightline Hosting Ltd', kind: 'Private limited company', where: 'England and Wales', no: 'Company no. 09123456', addr: '14 Canal Wharf, Leeds LS11 5PS, United Kingdom', law: 'England and Wales', lawFrom: 'the agreement' },
  'Gulf Systems LLC': { legal: 'Gulf Systems LLC', kind: 'Limited liability company', where: 'Dubai, United Arab Emirates', no: 'Licence no. 784512', addr: 'Office 1204, Al Habtoor Tower, Dubai, UAE', law: 'England and Wales · DIFC-LCIA arbitration', lawFrom: 'our draft' },
  'Harbor Retail plc': { legal: 'Harbor Retail plc', kind: 'Public limited company', where: 'England and Wales', no: 'Company no. 04567321', addr: '1 Harbour Exchange Square, London E14 9GE, United Kingdom', law: 'England and Wales', lawFrom: 'their redline' },
  'Trellis Health': { legal: 'Trellis Health Ltd', kind: 'Private limited company', where: 'England and Wales', no: 'Company no. 11203344', addr: '220 Harbour Road, Bristol BS1 5UH, United Kingdom', law: 'England and Wales', lawFrom: 'the MSA' },
  'Vantage GmbH': { legal: 'Vantage Analytics GmbH', kind: 'GmbH', where: 'Munich, Germany', no: 'HRB 214587', addr: 'Leopoldstraße 31, 80802 München, Germany', law: 'Germany', lawFrom: 'their agreement' },
  'Kestrel Freight': { legal: 'Kestrel Freight, Lda.', kind: 'Private company (Lda.)', where: 'Lisbon, Portugal', no: 'NIPC 513 456 789', addr: 'Avenida da Liberdade 110, 1250-146 Lisboa, Portugal', law: 'State of Delaware', lawFrom: 'their draft' },
  'Birch Labs': { legal: 'Birch Labs, Inc.', kind: 'Corporation', where: 'Delaware, USA', no: 'File no. 7790213', addr: '88 Kendall Square, Cambridge, MA 02142, USA', law: 'State of Delaware', lawFrom: 'their NDA' },
  'Ironclad Logistics': { legal: 'Ironclad Logistics Ltd', kind: 'Private limited company', where: 'England and Wales', no: 'Company no. 07345612', addr: 'Unit 4, Trafford Park, Manchester M17 1PL, United Kingdom', law: 'England and Wales', lawFrom: 'the agreement' },
};

/* the people in the business, for adding to a request's team */
const MX_STAFF = [
  { name: 'Priya Shah', role: 'Partnerships Manager' }, { name: 'Daniel Okafor', role: 'Account Executive' },
  { name: 'Hannah Lee', role: 'Marketing Manager' }, { name: 'Tom Becker', role: 'Procurement Lead' },
  { name: 'Sofia Marin', role: 'Account Executive' }, { name: 'Sarah Lin', role: 'VP Finance & Controller' },
  { name: 'Leo Park', role: 'Head of Product' }, { name: 'Nadia Hussain', role: 'Chief Revenue Officer' },
  { name: 'Tom Hughes', role: 'Finance Manager' }, { name: 'Mei Chen', role: 'Revenue Accountant' },
];
/* approvers can be a team: any one of them can say yes for it, or every one of them has to */
const MX_GROUPS = {
  'Finance': ['Sarah Lin', 'Tom Hughes', 'Mei Chen'],
  'Legal team': ['Roger Bennett', 'Grace Coleman', 'Elena Petrova', 'Matt Rivera'],
  'Privacy': ['Aisha Rahman', 'Roger Bennett'],
  'Revenue leadership': ['Nadia Hussain', 'Sarah Lin'],
};
const mxTitleOf = (n) => (MX_LEGAL.find(p => p.name === n) || MX_STAFF.find(p => p.name === n) || {}).role || '';

/* ── one request, opened ──────────────────────────────────────
   What was asked, in the submitter's words; Clavia's first read of it,
   with the one thing to do next; and everything that has happened since,
   with a box to reply to the submitter or leave a note for legal. The
   facts sit down the right, the two that move (status and attorney)
   changeable where they are. */
const MX_CONTRACT_OF = { 'Acme Corp': 'REQ-149', 'Kestrel Freight': 'REQ-150', 'Birch Labs': 'REQ-151', 'Harbor Retail plc': 'REQ-146' };
function mxTemplateFor(r) {
  const id = r.template
    || (r.type === 'NDA' && !/their paper|their own/i.test(r.title + ' ' + r.detail) ? (/one-?way/i.test(r.title + r.detail) ? 'one-way-nda' : 'mutual-nda')
    : r.type === 'Termination' ? 'non-renewal'
    : r.type === 'Drafting' ? (/order form|seats/i.test(r.title + r.detail) ? 'order-form' : /reseller|resell/i.test(r.title + r.detail) ? 'reseller' : 'msa-short')
    : r.type === 'Privacy' && !MX_CONTRACT_OF[r.counterparty] ? 'dpa' : null);
  return id ? mxTemplate(id) : null;
}
function mxFirstPass(r) {
  const tpl = mxTemplateFor(r);
  const cid = MX_CONTRACT_OF[r.counterparty];
  const contract = cid && mxRequest(cid);
  const pass = contract && reviewPass(contract);
  const known = { counterparty: r.counterparty, counterparty_address: r.address, purpose: r.purpose };
  if (pass) return {
    summary: `${r.counterparty}’s document is already in Contracts. ${pass.summary}`,
    flags: pass.flags.slice(0, 3),
    action: { label: 'Open the Review', run: () => mxOpen('requests', cid) } };
  if (tpl) {
    /* only what the business has to tell us; dates, law and signatories are legal's to set */
    const ASK = /^(counterparty|counterparty_address|purpose|seats|annual_fee|start_date|territory|discount|agreement_name|end_date)$/;
    const missing = tpl.fields.filter(f => ASK.test(f.key) && !known[f.key]).map(f => f.label);
    return {
      summary: `${r.type === 'Termination' ? 'A notice to end the agreement' : r.type === 'NDA' ? 'An NDA' : 'A new agreement'}${r.counterparty ? ' with ' + r.counterparty : ''}, on our paper. The ${tpl.name} template covers it.`,
      needs: missing.length ? missing : null,
      action: { label: `Draft from ${tpl.name}`, run: () => {
        MX.templates.values[tpl.id] = { ...(MX.templates.values[tpl.id] || {}), ...Object.fromEntries(Object.entries(known).filter(([, v]) => v)) };
        mxLog(r, { what: `started a draft from ${tpl.name}` });
        MX.templates.from = { id: r.id, tpl: tpl.id };
        mxOpen('templates', tpl.id + '/use');
      } } };
  }
  if (r.type === 'Signature') return {
    summary: 'The agreement is final. It only needs sending for signature.',
    action: { label: 'Send for Signature', run: () => { mxLog(r, { what: 'sent the agreement for signature' }); pbToast('Sent for signature'); } } };
  if (r.type === 'Contract review' || r.type === 'Privacy' || r.type === 'NDA') return {
    summary: `No document is attached yet, so there is nothing to read against the playbook.`,
    needs: [`${r.counterparty || 'Their'}’s latest draft`],
    action: { label: `Ask ${r.submitter.split(' ')[0]} for the Document`, reply: `Hi ${r.submitter.split(' ')[0]}, could you attach ${r.counterparty ? r.counterparty + '’s' : 'their'} latest draft? I will review it against our playbook as soon as it is here.` } };
  return {
    summary: 'A question rather than a document. Clavia can draft an answer for you to check before it goes back.',
    action: { label: 'Draft an Answer', run: () => requestAnswer(r) } };
}
/* advice: worked in a chat that already knows the question */
function requestAnswer(r) {
  mxLog(r, { what: 'opened a chat with Clavia about this' });
  openSession({ id: 'rq-ses-' + r.id, label: r.title, meta: 'now',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: `${r.submitter.split(' ')[0]} asked: ${r.detail || r.title}` },
      { role: 'bot', cites: null, steps: [{ source: 'request', query: 'Read ' + r.id, count: 'the question' }],
        answer: `Here is how I would approach it before drafting a reply to ${r.submitter.split(' ')[0]}:\n\n` + (
          /logo|publicity|website/i.test(r.title + r.detail)
            ? '**What decides it.** The contracts we have with the customers concerned, and any publicity or confidentiality clause in them.\n\n'
              + '**What to check first.** Whether our MSA template gives us a publicity right, and whether any of these customers signed on their own paper instead.\n\n'
              + 'Tell me which customers are involved and I will check their agreements and draft the reply.'
            : /sla|credit|enforceab|german/i.test(r.title + r.detail)
            ? '**What decides it.** The governing law and jurisdiction clause in our agreement with the customer, and how the service credits are worded.\n\n'
              + '**What to check first.** Which law the agreement names, and whether the credits are framed as the customer’s sole remedy. A local lawyer should confirm the answer under that law before it goes to the customer.\n\n'
              + 'I can pull the SLA and the governing law clause from the agreement and draft the reply for you to check.'
            : '**What decides it.** The agreement this question is about, and what our playbook says on the point.\n\n'
              + '**What to check first.** Which agreement applies, and whether anything was agreed outside it.\n\n'
              + 'Point me at the agreement and I will draft the reply for you to check.'),
        suggest: [`Draft a reply to ${r.submitter.split(' ')[0]}`, 'What would change the answer?'] },
    ] });
}
function mxLog(r, a) {
  (r.activity ||= []).push({ who: USER.name, when: mxNow(), ...a });
  r.updated = mxNow(); save();
}

/* ── one request, opened ──────────────────────────────────────
   Two panes. On the left, the request read like a document: its name,
   where it stands, and four tabs — a summary Clavia writes, every field,
   the people on the deal, and what has happened. On the right, the
   document itself, latest version first, with the older ones a click
   away and the three things you do with a contract: open it in Word,
   download it, or send it. */

/* the people on each deal: legal, the business, and their side */
const MX_DEAL_TEAM = {
  'RQ-1048': [['Jamie Cole', 'Head of Business Development', 'counterparty', 'jamie.cole@northwind.co.uk']],
  'RQ-1047': [['Laura Chen', 'Procurement Lead', 'counterparty', 'laura.chen@acmecorp.com'], ['Tom Reyes', 'Associate General Counsel', 'counterparty', 'treyes@acmecorp.com'], ['Sofia Marin', 'Account Executive', 'business', 'sofia.marin@clavia.app']],
  'RQ-1045': [['Ollie Grant', 'Account Manager', 'counterparty', 'ollie.grant@brightline.io']],
  'RQ-1044': [['Omar Haddad', 'Managing Director', 'counterparty', 'omar@gulfsystems.ae'], ['Elena Petrova', 'Senior Counsel · Corporate', 'legal', 'elena.petrova@clavia.app']],
  'RQ-1043': [['Mara Lind', 'Data Protection Officer', 'counterparty', 'dpo@harborretail.com'], ['Aisha Rahman', 'Privacy Counsel', 'legal', 'aisha.rahman@clavia.app']],
  'RQ-1042': [['Dr. Ian Shaw', 'Chief Operating Officer', 'counterparty', 'ian.shaw@trellishealth.co.uk']],
  'RQ-1041': [['Katrin Vogel', 'Head of Procurement', 'counterparty', 'k.vogel@vantage.de']],
  'RQ-1040': [['Rui Santos', 'Commercial Manager', 'counterparty', 'rui.santos@kestrelfreight.com']],
  'RQ-1039': [['Hana Ito', 'Partnerships', 'counterparty', 'hana@birchlabs.io']],
};
/* the deal behind each one, as the CRM has it */
const MX_DEALS = {
  'Northwind — partnership': { value: '—', stage: 'Discovery', close: '30 Nov 2026', owner: 'Priya Shah' },
  'Acme Corp — platform expansion': { value: '£1,240,000', stage: 'Negotiation', close: '31 Oct 2026', owner: 'Daniel Okafor' },
  'Brightline — hosting renewal': { value: '£86,000 a year', stage: 'Renewal', close: '14 Jan 2027', owner: 'Tom Becker' },
  'Gulf Systems — channel launch': { value: '£420,000', stage: 'Proposal', close: '15 Dec 2026', owner: 'Priya Shah' },
  'Harbor Retail — EU rollout': { value: '£610,000', stage: 'Negotiation', close: '20 Nov 2026', owner: 'Sofia Marin' },
  'Trellis — new logo': { value: '£324,000', stage: 'Closing', close: '10 Oct 2026', owner: 'Daniel Okafor' },
  'Vantage — DACH renewal': { value: '£275,000', stage: 'Renewal', close: '1 Dec 2026', owner: 'Sofia Marin' },
  'Kestrel Freight — logistics': { value: '£190,000', stage: 'Negotiation', close: '5 Nov 2026', owner: 'Tom Becker' },
  'Birch Labs — pilot': { value: '£45,000', stage: 'Pilot', close: '1 Nov 2026', owner: 'Priya Shah' },
  'Ironclad — warehousing': { value: '£150,000', stage: 'Closed won', close: '5 Oct 2026', owner: 'Tom Becker' },
};
const mxEmail = (name) => name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@clavia.app';
const mxEsc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* everyone on it, legal first, then the business, then their side */
/* a comment's text with the people it tags picked out */
function mxAtNames(text) {
  const names = [...new Set([...(typeof MX_LEGAL !== 'undefined' ? MX_LEGAL : []), ...(typeof MX_STAFF !== 'undefined' ? MX_STAFF : [])].map(p => p.name))].sort((a, b) => b.length - a.length);
  if (!text || !/@/.test(text)) return [text];
  const re = new RegExp('@(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  const out = []; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) out.push(text.slice(last, m.index)); out.push(h('span', { class: 'rqx-at' }, m[0])); last = m.index + m[0].length; }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function mxPeople(r) {
  if (!r.people) {
    const team = MX_LEGAL.find(p => p.name === r.attorney);
    r.people = [
      { name: r.submitter, role: `Submitter${r.team ? ' · ' + r.team : ''}`, side: 'business', email: mxEmail(r.submitter) },
      ...(MX_DEAL_TEAM[r.id] || []).map(([name, role, side, email]) => ({ name, role, side, email })),
    ];
    void team;
  }
  return r.people;
}

/* ── a request's documents ────────────────────────────────────
   A request can carry several documents (their paper, our draft, a side
   letter), and each has its versions, newest last. A file someone sends is
   kept as it was sent, in the browser's own file store, and read for the
   preview: a Word file into its text and headings, a PDF shown as itself,
   plain text as paragraphs. */
const mxBlobs = {
  db: null,
  open() {
    return this.db ||= new Promise((ok, no) => {
      const q = indexedDB.open('clavia-files', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('files');
      q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error);
    });
  },
  async put(id, blob) { const db = await this.open(); return new Promise((ok, no) => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(blob, id); t.oncomplete = ok; t.onerror = () => no(t.error); }); },
  async get(id) { const db = await this.open(); return new Promise((ok, no) => { const q = db.transaction('files').objectStore('files').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => no(q.error); }); },
};
const mxScript = (src) => new Promise((ok, no) => {
  if (document.querySelector(`script[src="${src}"]`)) return ok();
  const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s);
});
/* what a Word file says, kept as safe, plain markup */
const mxClean = (html) => {
  const d = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  d.querySelectorAll('script,style,iframe,object,embed,link,meta,img').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (!/^(colspan|rowspan)$/.test(a.name)) n.removeAttribute(a.name); }));
  return d.body.firstChild.innerHTML;
};
/* a file as it arrived, made into a version: stored, and read for the preview */
async function mxIngest(file, { name, by }) {
  const fid = pbUid('file');
  await mxBlobs.put(fid, file);
  const v = { name, by, when: mxNow(), file: file.name, fid, mime: file.type, size: file.size };
  const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] || '').toLowerCase();
  try {
    if (ext === 'docx') {
      await mxScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
      const out = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      v.html = mxClean(out.value) || '<p>This document is empty.</p>';
    } else if (ext === 'pdf') v.pdf = true;
    else if (/^(txt|md|rtf|text)$/.test(ext) || file.type.startsWith('text/')) {
      const text = await file.text();
      v.html = text.split(/\n{2,}/).map(p => `<p>${mxEsc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
    } else v.none = true;
  } catch { v.none = true; }
  return v;
}
/* the files a request arrived with: each read into a document of its own, the page redrawn when they land */
function mxTakeFiles(r, blobs) {
  r.ingesting = blobs.map(b => b.name); save();
  (async () => {
    for (const b of blobs) {
      const v = await mxIngest(b, { name: `${r.counterparty ? r.counterparty + '’s' : 'Their'} draft`, by: r.submitter });
      const d = mxAddVersion(r, v);
      (r.activity ||= []).push({ who: r.submitter, ev: 'version', what: `attached ${b.name}`, when: mxNow(), ref: { doc: d.id, v: 1 } });
    }
    delete r.ingesting; save();
    if (state.view === 'intake' && MX.intake.open === r.id) go('intake');
  })();
}
/* a version added to the document it belongs to, or a new document */
function mxAddVersion(r, v, docId) {
  const docs = mxDocuments(r);
  const d = docId && docs.find(x => x.id === docId);
  if (d) d.versions.push(v);
  else docs.push({ id: pbUid('doc'), title: v.file || v.name, versions: [v] });
  r.updated = mxNow(); save();
  return d || docs[docs.length - 1];
}
/* the issues Clavia has read from a request's versions, kept on the
   request once seen so a lawyer's status changes stick */
const SHOW_ISSUES = false, SHOW_APPROVALS = true;
/* ── Intake, 14 Oct: each addition from the Harvey / Legora benchmark has its own switch.
   Set one to false to take that piece out; nothing else depends on it. ── */
const INTAKE_FX = {
  rename: true,       // the module is called Intake (false: Requests)
  dueCol: true,       // a Due column on the list, and Due / Waiting on filters
  following: true,    // a Following tab: requests you are on the deal team for
  rules: true,        // routing rules in Intake settings, and the rule named in Activity
  channel: true,      // follow-ups asked in the requester's own channel; Waiting on requester; replies go back there
  split: true,        // one email with several asks becomes several linked requests
  portal: true,       // the requester's view of their request, without a Clavia seat
  firstPass: true,    // "Clavia's first pass is ready · Review first pass" in Activity
  columns: 'v2',
  inbox: false,       // the list ⇄ inbox toggle and the inbox view (removed 15 Oct; the table is the one view)
  approvals: false,   // an Approvals / Signatures tab on a request (hidden for now)
  suggest: false,
  drops: true,        // the tab strip becomes a view dropdown plus Status · Assigned to · Submitted by · Source · Due dropdowns     // a faded "suggested" lawyer on unassigned requests (false: a request is assigned or it isn't)        // a list ⇄ inbox toggle beside New Request; the inbox reads one request at a time (intake-inbox.js)      // 'v2': Request # · Request · Status · Assigned to · Delegated to · Created on · Due date · Source ('v1': the older set)
};
const INTAKE_NAME = INTAKE_FX.rename ? 'Intake' : 'Requests';
/* whose move a request is on: the requester (asked something), the other side (our reply is with them), or legal */
function mxWhoseMove(r) {
  if (r.waitingOn === 'requester') return 'Requester';
  if (r.waitingOn == null && r.status === 'waiting') {
    /* waiting, unless the last word was theirs */
    const last = [...(r.activity || [])].reverse().find(a => a.kind === 'reply');
    if (!last || last.who === 'Clavia' || MX_LEGAL.some(p => p.name === last.who)) return 'Requester';
  }
  const docs = mxDocuments(r);
  const withThem = docs.some(d => { const rd = typeof mxRoundOf === 'function' && mxRoundOf(r, d.id); return rd && rd.answered; })
    && !docs.some(d => { const rd = mxRoundOf(r, d.id); return rd && !rd.answered; });
  if (withThem && r.counterparty) return 'Counterparty';
  return 'Legal';
}
/* Priya's email asked for two pieces of work; Clavia made one request for each and linked them */
function mxSplitSeed(list) {
  const n = Math.max(1037, ...list.map(q => +q.id.split('-')[1] || 0));
  const ids = ['RQ-' + (n + 1), 'RQ-' + (n + 2)];
  const c = new Date(Date.now() - 864e5); c.setHours(9, 12, 0, 0);
  const at = (hrs) => new Date(c.getTime() + hrs * 36e5).toISOString();
  const due = (days) => { const x = new Date(); x.setDate(x.getDate() + days); x.setHours(17, 0, 0, 0); return x.toISOString(); };
  const msg = { subject: 'Gulf Systems: NDA before the workshop, and a letter for their distributor',
    body: 'Hi legal,\n\nTwo things for Gulf Systems, please:\n\n1. They want a mutual NDA signed before the technical workshop on the 22nd. Omar Haddad will sign for them.\n2. Their distributor in Riyadh needs a letter from us confirming they are authorised to resell the platform in Saudi Arabia.\n\nThe first is the urgent one.\n\nThanks,\nPriya' };
  const base = { deal: 'Gulf Systems — channel launch', counterparty: 'Gulf Systems LLC', team: 'Partnerships', submitter: 'Priya Shah', attorney: null, status: 'new',
    source: 'outlook', created: c.toISOString(), updated: at(0.05), split: ids, triaged: false };
  const make = (id, title, type, days, urgent, detail, other) => ({ ...base, id, title, type, due: due(days), urgent, detail,
    activity: [
      { who: 'Priya Shah', ev: 'submit', what: 'emailed legal@lumen.io', via: 'outlook', msg, when: at(0) },
      { who: 'Clavia', ev: 'clavia', what: 'made 2 requests from this email', links: ids, when: at(0.02) },
    ] });
  list.unshift(
    make(ids[1], 'Authorised reseller letter for Gulf Systems’ Riyadh distributor', 'Drafting', 6, false,
      'A letter from us confirming that Gulf Systems’ distributor in Riyadh is authorised to resell the platform in Saudi Arabia.'),
    make(ids[0], 'Mutual NDA with Gulf Systems before the technical workshop', 'NDA', 3, true,
      'A mutual NDA with Gulf Systems, signed before the technical workshop on the 22nd. Omar Haddad signs for them.'));
}
/* Due, as a date filter: fixed buckets always in the same order (empty ones dimmed),
   and a custom range. A range is kept as the value "range:<from>:<to>" (ISO days). */
const MX_DUE_BUCKETS = ['Overdue', 'Today', 'This week', 'Next week', 'Later'];
function mxDueBucket(iso) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const d = Math.floor((new Date(iso) - t0) / 864e5);
  const toSun = (7 - t0.getDay()) % 7;             // days left in this week (weeks end on Sunday)
  return d < 0 ? 'Overdue' : d === 0 ? 'Today' : d <= toSun ? 'This week' : d <= toSun + 7 ? 'Next week' : 'Later';
}
function mxDueFilter() {
  const day = (iso) => new Date(iso + 'T12:00:00');
  const fmt = (a, b) => { const A = day(a), B = day(b), m = (x) => x.toLocaleDateString('en-GB', { month: 'short' });
    return A.getMonth() === B.getMonth() ? `${A.getDate()}–${B.getDate()} ${m(B)}` : `${A.getDate()} ${m(A)} – ${B.getDate()} ${m(B)}`; };
  return { key: 'due', label: 'Due', of: (r) => mxDueBucket(r.due), fixed: MX_DUE_BUCKETS, range: true,
    order: (v) => MX_DUE_BUCKETS.indexOf(v),
    test: (v, r) => { if (!String(v).startsWith('range:')) return mxDueBucket(r.due) === v;
      const [, a, b] = v.split(':'); const t = new Date(r.due); return t >= day(a).setHours(0, 0, 0, 0) && t <= day(b).setHours(23, 59, 59, 999); },
    label_of: (v) => String(v).startsWith('range:') ? fmt(v.split(':')[1], v.split(':')[2]) : v };
}
/* who is doing the work besides the lawyer: Clavia, when a rule handed it over or its first pass is out */
function mxDelegate(r) {
  if (r.resolvedBy || r.handling === 'clavia') return 'Clavia';
  const open = typeof mxRoundOf === 'function' && mxDocuments(r).some(d => { const rd = mxRoundOf(r, d.id); return rd && !rd.answered; });
  if (r.handling === 'first' || open) return 'Clavia · first pass';
  return null;
}
/* where the requester talks to legal: the channel they asked in, else email */
const MX_CHANNEL_NAME = { teams: 'Teams', slack: 'Slack', outlook: 'Outlook', gmail: 'Gmail', jira: 'Jira', servicenow: 'ServiceNow', salesforce: 'Salesforce' };
const mxChannel = (r) => MX_CHANNEL_NAME[r.source] ? { key: r.source, name: MX_CHANNEL_NAME[r.source] } : { key: 'outlook', name: 'Outlook' };
/* what each requester says back when legal asks them something (scripted for the demo) */
const MX_REQ_ANSWERS = {
  'RQ-1041': 'The 2024 schedule. Their renewal draft doesn’t touch the SLA. And yes, the MSA names German law, Munich courts.',
  'RQ-1046': 'Fernhill, Ostrava Bank and Halden Retail are the three we most want. I can send the other twelve by Friday.',
  'RQ-1043': 'Attached the Word version from Mara, their DPO. The tracked changes are all there now.',
  'RQ-1045': 'Attached. It’s the 2023 order form; I think the 60 days is in section 4.',
};
/* Clavia's follow-ups, asked in the channel the request came in on */
function mxChannelSeed(list) {
  const at = (r, hrs) => new Date(new Date(r.created).getTime() + hrs * 36e5).toISOString();
  const ask = {
    'RQ-1045': ['Thanks Tom. To work out the last day to give notice I need the Brightline order form: the renewal and notice terms are in it, not in the MSA. Could you reply with it attached?', true],
    'RQ-1041': ['Thanks Sofia. Which SLA is Vantage on: the 2024 schedule in our MSA, or the one in their renewal draft? And does their contract name German law?', false],
  };
  for (const r of list) {
    const q = ask[r.id]; if (!q || !r.activity) continue;
    const ch = mxChannel(r), first = r.submitter.split(' ')[0];
    r.activity.push({ who: 'Clavia', kind: 'reply', to: first, via: ch.key, what: q[0], when: at(r, 0.03) });
    if (q[1]) { r.activity.push({ who: r.submitter, kind: 'reply', via: ch.key, what: MX_REQ_ANSWERS[r.id], when: at(r, 1.4) }); r.waitingOn = 'legal'; }
    else r.waitingOn = 'requester';
    r.activity.sort((x, y) => (x.when < y.when ? -1 : 1));
  }
}   // Issues now live with each document's round
function mxIssues(r) {
  if (r.issues?.v === 3) return r.issues;
  if (typeof MX_ISSUES === 'undefined') return null;
  const key = r.id === 'RQ-1048' ? 'Northwind Ltd' : r.id === mxData().showcaseId ? 'Brightwell Energy plc' : null, src = key && MX_ISSUES[key];
  if (!src) { delete r.issues; return null; }
  r.issues = { v: 3, turns: src.turns, items: src.items.map(x => ({ ...x })) };
  save(); return r.issues;
}

function mxDocuments(r) {
  if (r.documents && (r.documents.length || r.ingesting || r.removedDocs?.length)) return r.documents;
  /* the shape they had before a request could hold more than one */
  if (r.docs) { r.documents = r.docs.length ? [{ id: 'd1', title: r.docs[r.docs.length - 1].file || r.title, versions: r.docs }] : []; delete r.docs; return r.documents; }
  const cid = MX_CONTRACT_OF[r.counterparty], c = cid && mxRequest(cid), a = c && JV_REVIEWS[c.review];
  if (a) {
    const head = a.name || r.title;
    const plain = head.replace(/\s*\((customer|their)[^)]*\)\s*$/i, '').replace(/\s*redline\s*/i, ' ').replace(/\s+/g, ' ').trim();
    const ours = [{ t: 'h1', v: mxEsc(plain) }, ...a.clauses.flatMap(cl => [{ t: 'h2', v: mxEsc(cl.heading) }, { t: 'p', v: mxEsc(cl.original || cl.text) }])];
    const theirs = [{ t: 'h1', v: mxEsc(head) }, ...a.clauses.flatMap(cl => [
      { t: 'h2', v: mxEsc(cl.heading) },
      { t: 'p', v: (cl.segments?.length ? cl.segments : [['t', cl.text]]).map(([k, x]) => k === 'del' ? `<del>${mxEsc(x)}</del>` : k === 'ins' ? `<ins>${mxEsc(x)}</ins>` : mxEsc(x)).join('') }])];
    const d0 = new Date(r.created); d0.setDate(d0.getDate() - 9);
    r.documents = [{ id: 'd1', title: `${head}.docx`, versions: [
      { name: 'Our draft', by: r.attorney || 'Roger Bennett', when: d0.toISOString(), file: `${plain} — our draft.docx`, blocks: ours },
      { name: `${r.counterparty}’s redline`, by: r.counterparty, when: r.created, file: `${head}.docx`, blocks: theirs }] }];
  } else if (['RQ-1044', 'RQ-1042', 'RQ-1045'].includes(r.id)) {
    const tpl = mxTemplateFor(r);
    const vals = { counterparty: r.counterparty, counterparty_address: r.address, seats: '120', annual_fee: '£324,000', term: r.id === 'RQ-1044' ? '24 months' : '36 months',
      territory: 'the United Arab Emirates and Saudi Arabia', discount: '25%', agreement_name: 'Master Agreement dated 14 January 2024', end_date: '14 January 2027' };
    r.documents = tpl ? [{ id: 'd1', title: `${r.counterparty} — ${tpl.name}.docx`, source: tpl.id, versions: [
      { name: 'First draft', by: r.attorney || 'Roger Bennett', when: new Date(new Date(r.created).getTime() + 30 * 36e5).toISOString(), file: `${r.counterparty} — ${tpl.name}.docx`,
        blocks: typeof MX_LONG_DOCS !== 'undefined' && MX_LONG_DOCS[r.id] ? mxReadText(MX_LONG_DOCS[r.id]) : mxDraftBlocks(tpl, vals) }] }] : [];
  } else r.documents = [];
  /* never an empty page: a request on our paper starts with the template, filled
     with what the request already says and marked where it is still blank */
  if (!r.documents.length && !r.ingesting && r.templates?.length > 1) {
    r.documents = r.templates.map((id, i) => mxTemplate(id)).filter(Boolean).map((t, i) => ({ id: 'd' + (i + 1), title: `${r.counterparty || 'Draft'} — ${t.name}.docx`, source: t.id, versions: [
      { name: 'First draft', by: 'Clavia', when: r.created || mxNow(), file: `${r.counterparty || 'Draft'} — ${t.name}.docx`,
        blocks: mxDraftBlocks(t, { counterparty: r.counterparty, counterparty_address: r.address }) }] }));
    return r.documents;
  }
  const tpl0 = !r.documents.length && !r.ingesting && mxTemplateFor(r);
  if (tpl0) {
    r.documents = [{ id: 'd1', title: `${r.counterparty || 'Draft'} — ${tpl0.name}.docx`, source: tpl0.id, versions: [
      { name: 'First draft', by: 'Clavia', when: r.created || mxNow(), file: `${r.counterparty || 'Draft'} — ${tpl0.name}.docx`,
        blocks: mxDraftBlocks(tpl0, { counterparty: r.counterparty, counterparty_address: r.address }) }] }];
  }
  return r.documents;
}
/* a question has no paper: its page takes the whole width */
const mxPaperless = (r) => r.type === 'Advice' || (!mxDocuments(r).length && !mxTemplateFor(r) && !MX_CONTRACT_OF[r.counterparty] && r.type !== 'Contract review' && r.type !== 'Privacy' && r.type !== 'NDA' && !r.ingesting);

function mxDraftBlocks(tpl, vals) {
  const txt = (s) => mxEsc(s).replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, k) => vals[k] ? mxEsc(vals[k]) : `<mark>[${mxEsc(mxFieldLabel(tpl, k))}]</mark>`);
  return [{ t: 'h1', v: mxEsc(tpl.name) }, ...tpl.body.filter(b => (b.h ?? b.p).trim()).map(b => b.h !== undefined ? { t: 'h2', v: txt(b.h) } : { t: 'p', v: txt(b.p) })];
}

/* Clavia's read of it in one paragraph: who needs what, where it stands,
   and what is still open, said the way you would tell a colleague */
function mxSummary(r) {
  const fp = mxFirstPass(r), docs = mxDocuments(r);
  const latest = docs.filter(d => !d.versions[d.versions.length - 1].cmp || d.versions[d.versions.length - 1].cmp.asVersion).map(d => ({ d, v: d.versions[d.versions.length - 1] })).sort((x, y) => (y.v.when > x.v.when) - (y.v.when < x.v.when))[0];
  const due = new Date(r.due), days = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
  const dueSay = r.status === 'done' ? 'It is done.' : days < 0 ? `It was due ${-days === 1 ? 'yesterday' : -days + ' days ago'}.` : days === 0 ? 'It is due today.' : days === 1 ? 'It is due tomorrow.' : `It is due in ${days} days.`;
  const what = { NDA: 'an NDA', 'Contract review': 'a contract reviewed', Drafting: 'an agreement drafted', Advice: 'an answer to a question', Termination: 'an agreement ended', Privacy: 'privacy terms agreed', Signature: 'an agreement signed' }[r.type] || 'help';
  const who = r.attorney ? (r.attorney === USER.name ? 'You have it' : `${r.attorney} has it`) : 'Nobody on legal has picked it up yet';
  const when = latest && pbWhen(latest.v.when);
  const said = /^today/i.test(when) ? 'today' : /^yesterday/i.test(when) ? 'yesterday' : 'on ' + when;
  const doc = latest ? `The newest document is ${latest.d.title.replace(/\.(docx?|pdf|txt|md)$/i, '')} v${latest.d.versions.length}, ${/^(uploaded|new version)/i.test(latest.v.name) ? 'uploaded' : 'from ' + latest.v.by} ${said}.${docs.length > 1 ? ` There are ${docs.length} documents on the request.` : ''}` : (r.type === 'Advice' ? '' : 'No document has come in yet.');
  const read = fp.flags?.length ? fp.summary.replace(/^.*?already in Contracts\.\s*/, '') : '';
  const open = fp.needs ? `Still needed from ${r.submitter.split(' ')[0]}: ${fp.needs.join(' and ').toLowerCase()}.` : '';
  const para = [`${r.submitter}${r.team ? ' in ' + r.team : ''} needs ${what}${r.counterparty ? ' with ' + r.counterparty : ''}${r.deal ? ' for the ' + r.deal.split(' — ')[1] + ' deal' : ''}. ${dueSay} ${who}.`, doc, read, open].filter(Boolean).join(' ');
  /* the same read, as a one-line intro and a few points under it */
  const intro = `${r.submitter}${r.team ? ' in ' + r.team : ''} needs ${what}${r.counterparty ? ' with ' + r.counterparty : ''}${r.deal ? ' for the ' + r.deal.split(' — ')[1] + ' deal' : ''}.`;
  const dueShort = r.status === 'done' ? 'Done' : days < 0 ? `Was due ${-days === 1 ? 'yesterday' : -days + ' days ago'}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
  const ask = (r.detail || '').trim();
  const points = [
    r.type === 'Advice' && ask ? ['Question', ask.length > 160 ? ask.slice(0, 157).replace(/\s+\S*$/, '') + '…' : ask] : null,
    ['Timing', `${dueShort}. ${who}.`],
    latest ? ['Latest', `${latest.d.title.replace(/\.(docx?|pdf|txt|md)$/i, '')} v${latest.d.versions.length}, ${/^(uploaded|new version)/i.test(latest.v.name) ? 'uploaded' : 'from ' + latest.v.by} ${said}.${docs.length > 1 ? ` ${docs.length} documents in all.` : ''}`]
      : r.type === 'Advice' ? null : ['Latest', 'No document has come in yet.'],
    /* where each document's negotiation stands, in one line */
    ((list) => list.length ? ['Negotiation', list.join(' · ') + '.'] : null)(docs.map(d => { const rs = mxRoundSay(r, d); if (!rs) return null;
      const tag = /msa/.test(d.source || '') ? 'MSA' : d.source === 'dpa' ? 'DPA' : /nda/.test(d.source || '') ? 'NDA' : d.title.replace(/\.(docx?|pdf|txt|md)$/i, '');
      return `${tag} ${rs.k === 'with' ? rs.say.replace(/^With/, 'with') : rs.k === 'answer' ? `has ${rs.say}` : 'is ready to send back'}`; }).filter(Boolean)),
    read ? ['Review', read] : null,
    fp.needs ? ['Needed', `From ${r.submitter.split(' ')[0]}: ${fp.needs.join(' and ').toLowerCase()}.`] : null,
    /* where the conversation stands: the last thing anyone said */
    (() => { const w = [...(r.activity || [])].reverse().find(a => a.kind === 'reply' || a.kind === 'note'); if (!w) return null;
      const t = w.what.length > 120 ? w.what.slice(0, 118).replace(/\s+\S*$/, '') + '…' : w.what;
      return ['Last word', `${w.who === USER.name ? 'You' : w.who.split(' ')[0]}: “${t}”`]; })(),
  ].filter(Boolean);
  return { para, intro, points, fp, minutes: Math.max(1, Math.round(para.split(/\s+/).length / 200)) };
}

function intakePage(r, opts = {}) {
  const embed = !!opts.embed;   // inside the Intake inbox: no way back, no document pane, an Open button instead
  const first = r.submitter.split(' ')[0];
  const mine = r.submitter === USER.name;
  mxPeople(r); const docs = mxDocuments(r);
  /* which document and version the right pane shows: the most recently changed, unless something asked for another */
  let di = 0, vi = 0, grid = null, openRef = () => {}, upload = () => {}, paintCtx = null;
  if (docs.length) {
    const f = MX.intake.focus, fi = !f ? -1 : f.title ? ((i) => i >= 0 ? i : docs.findIndex(d => d.id === 'd1'))(docs.findIndex(d => d.title.includes(f.title) && !/ vs /.test(d.title))) : docs.findIndex(d => d.id === f.doc);
    if (fi >= 0) { di = fi; vi = Math.min(f.v, docs[fi].versions.length) - 1; }
    else { di = docs.reduce((best, d, i) => d.versions[d.versions.length - 1].when > docs[best].versions[docs[best].versions.length - 1].when ? i : best, 0); vi = docs[di].versions.length - 1; }
    MX.intake.focus = null;
  }
  const hasTerms = false;   // Key Terms is built but not shown for now
  const hasSign = SHOW_APPROVALS && !!mxSign(r);
  const hasIssues = SHOW_ISSUES && !!mxIssues(r);
  let tab = MX.intake.tab && ['summary', 'details', 'terms', 'sign', 'team', 'activity', 'docs', 'issues', 'comments', 'mtasks', 'mdecisions'].includes(MX.intake.tab) ? MX.intake.tab : 'summary';
  /* the document whose round is open in the Documents tab, if any */
  let reviewing = MX.intake.review || null; MX.intake.review = null;
  if ((tab === 'terms' && !hasTerms) || (tab === 'sign' && !(hasSign && INTAKE_FX.approvals)) || (tab === 'issues' && !hasIssues) || ((tab === 'mtasks' || tab === 'mdecisions' || tab === 'mreqs') && !r.mt)) tab = 'summary';
  const ICON = (p, w = 16) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  /* ── the left: a page about the request ── */
  const title = h('h1', { class: 'br-title rqp-title', contenteditable: 'true', spellcheck: 'false', 'data-empty': 'Untitled request',
    oninput: () => { r.title = title.textContent.trim() || 'Untitled request'; r.updated = mxNow(); save(); },
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } } });
  title.textContent = r.title;

  /* where it stands, in one line: status and who has it are the two things you change from here */
  /* the path this kind of request takes, each step a place you can move it to */
  const steps = h('div', { class: 'rqp-steps', role: 'list', 'aria-label': 'Stage' });
  const paintSteps = () => {
    const st = mxStages(r), at = mxStage(r);
    steps.replaceChildren(...st.flatMap((name, i) => [
      i ? h('span', { class: 'rqp-step-rule' + (i <= at ? ' is-past' : ''), 'aria-hidden': 'true' }) : '',
      h('button', { class: 'rqp-step' + (i < at ? ' is-past' : i === at ? ' is-now' : ''), type: 'button', role: 'listitem',
        'aria-current': i === at ? 'step' : null, 'data-tip': i === at ? 'Current stage' : `Move to ${name}`,
        onclick: () => { if (i === at) return; const was = at; mxStageGate(r, i, () => { mxSetStage(r, i); paintSteps(); add({ ev: 'status', what: `moved this to ${name}` });
          pbToast(`${r.id} is at ${name}`, { label: 'Undo', run: () => { mxSetStage(r, was); paintSteps(); } }); }); } },
        h('span', { class: 'rqp-step-dot' }, i < at ? h('span', { html: ICON('<path d="m5.5 12.5 4 4 9-9.5"/>', 11) }) : String(i + 1)),
        h('span', { class: 'rqp-step-t' }, name))]));
  };
  paintSteps();
  const atty = mxAttorneyBtn(r, (sg) => { add({ what: r.attorney ? (r.attorney === USER.name ? 'took this on' : `assigned this to ${r.attorney}${sg?.rule ? ` using the “${sg.rule.name}” rule` : sg ? ', as Clavia suggested' : ''}`) : 'removed the assignee',
    ...(sg?.rule ? { rule: `${mxRuleWhen(sg.rule)} → ${mxRuleThen(sg.rule)}` } : {}) }); paintSg(); });
  /* unassigned: Clavia's pick is one click from being the answer */
  const sgOk = h('button', { class: 'rqp-sg-ok', type: 'button', onclick: () => { const sg = mxSuggest(r); if (sg) atty._set(sg.name); } }, 'Assign');
  const paintSg = () => { sgOk.hidden = !mxSuggest(r); };
  paintSg();
  /* waiting on the requester: said in the line, and gone as soon as they answer */
  const waitEl = h('span', { class: 'rqp-wait-w' }, h('span', { class: 'mt-sep' }, '·'), h('span', { class: 'rqp-wait' }, `Waiting on ${first}`));
  const paintWait = () => { waitEl.hidden = !(INTAKE_FX.channel && mxWhoseMove(r) === 'Requester'); };
  paintWait();
  const meta = h('div', { class: 'br-meta rqp-meta' },
    h('span', { class: 'rqp-id' }, r.id), r.mt ? h('span', { class: 'mo-chip mo-mt-chip' }, 'Matter') : null, h('span', { class: 'mt-sep' }, '·'),
    h('span', { class: 'rqp-from' }, `From ${r.submitter}`, ...(r.source ? [' via ', h('img', { class: 'rqp-via', src: brandSrc(r.source), alt: '' }), mxChannel(r).name] : [])), h('span', { class: 'mt-sep' }, '·'),
    h('span', { class: 'rqp-due' }, 'Due ', mxDue(r.due, r.status === 'done')),
    r.inMt && typeof moPartOf === 'function' ? moPartOf(r) : null,
    waitEl);
  const stageBtn = mxReqStatusBtn(r);
  stageBtn.classList.add('rqp-stage'); stageBtn._paint();
  const controls = h('div', { class: 'rqp-ctl' }, atty, sgOk);

  /* the tabs: one rule that travels under the one you are on */
  /* a request that is a matter also has Tasks and Decisions (matters.js) */
  const TABS = [['summary', 'Overview'], r.mt && ['mreqs', 'Requests'], r.mt && ['mtasks', 'Tasks'], ['docs', 'Documents'], mxWComments(r).length && ['comments', 'Comments'], r.mt && ['mdecisions', 'Decisions'], hasIssues && ['issues', 'Issues'], INTAKE_FX.approvals && hasSign && ['sign', mxApprovalRules(r).length ? 'Approvals' : 'Signatures'], ['details', 'Details'], hasTerms && ['terms', 'Key Terms'], ['team', 'Deal Team'], ['activity', 'Activity']].filter(Boolean);
  const ink = h('span', { class: 'br-ink', 'aria-hidden': 'true' });
  const tabBtns = TABS.map(([k, label]) => h('button', { class: 'br-tab', type: 'button', role: 'tab', 'data-k': k, onclick: () => setTab(k) },
    label));
  /* once the tabs hold at the top, the request's name shows quietly above them */
  const stuckName = h('div', { class: 'rqp-stuck-t', 'aria-hidden': 'true' });
  let aiFold = false;
  /* the request's name above the stuck tabs was removed (15 Oct: “looking odd”); stuckName stays unmounted */
  const tabs = h('div', { class: 'br-tabs', role: 'tablist' }, ...tabBtns, ink);
  const body = h('div', { class: 'rqp-body' });
  const placeInk = () => { const on = tabBtns.find(b => b.dataset.k === tab); if (on?.offsetWidth) { ink.style.setProperty('--w', on.offsetWidth + 'px'); ink.style.setProperty('--x', on.offsetLeft + 'px'); } };
  const setTab = (k) => { tab = k; MX.intake.tab = k; for (const b of tabBtns) b.setAttribute('aria-selected', String(b.dataset.k === k)); placeInk(); paintBody(); };

  /* Summary: one paragraph Clavia writes; under it, what the document says
     and the last few things that happened */
  let reading = r.triaged === false;
  const summary = () => {
    /* the summary sits in its own box, under Clavia's star */
    const aiBox = (inner) => {
      /* every request opens with its summary expanded; folding it lasts while you are on this request only */
      const box = h('section', { class: 'rqp-ai' + (reading ? ' is-busy' : '') + (aiFold ? ' is-folded' : '') });
      const head = h('button', { class: 'rqp-ai-h', type: 'button', 'aria-expanded': String(!aiFold), onclick: () => {
        aiFold = !aiFold; box.classList.toggle('is-folded', aiFold); head.setAttribute('aria-expanded', String(!aiFold)); } },
        h('span', { class: 'rqp-ai-star', html: SPARK_ONE }), h('span', {}, 'AI Summary'),
        h('span', { class: 'rqp-ai-chev', html: ICON('<path d="m7 10 5 5 5-5"/>', 14) }));
      box.append(head, h('div', { class: 'rqp-ai-body' }, inner));
      return box;
    };
    if (reading) return [aiBox(h('p', { class: 'rqp-ai-t rqp-ai-wait' }, 'Reading the request…'))];
    const s = mxSummary(r);
    return [aiBox(h('div', { class: 'rqp-ai-t' }, h('p', { class: 'rqp-ai-intro' }, s.intro),
      h('ul', { class: 'rqp-ai-pts' }, ...s.points.map(([k, t]) => h('li', {}, h('b', {}, k), ' ', t))))), recentDocs(), recent()].filter(Boolean);   /* comments live in their own tab, not on the Overview */
  };

  /* Details: every field, in four cards. Inside each, two columns of label
     over value; the ones legal owns are changed by clicking them. What the
     header already says (number, title) is not said again. */
  const CHEV = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
  /* a date, picked with the system's own calendar, from a click on the value */
  const pickDate = (v, now, set) => {
    const inp = h('input', { type: 'date', class: 'rqv-date', tabindex: '-1' });
    if (now) inp.value = new Date(now).toISOString().slice(0, 10);
    inp.onchange = () => { if (inp.value) set(new Date(inp.value + 'T17:00:00').toISOString()); inp.remove(); };
    inp.onblur = () => setTimeout(() => inp.remove(), 200);
    v.append(inp);
    try { inp.showPicker(); } catch { inp.focus(); }
  };
  const cell = (label, val, { edit, wide, hint, pick, date, run } = {}) => {
    const v = h('span', { class: 'rqd-v' + (edit ? ' is-edit' : '') }, val ?? '');
    if ((pick || date || run) && val != null && val !== '') {
      v.classList.add('is-act'); v.tabIndex = 0; v.setAttribute('role', 'button');
      if (pick || date) v.append(h('span', { class: 'rqv-chev', html: CHEV }));
      const go1 = (e) => { e.stopPropagation(); if (run) run(); else if (pick) pick(v); else pickDate(v, date[0](), date[1]); };
      v.onclick = go1;
      v.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go1(e); } };
    }
    if (edit) {
      v.contentEditable = 'plaintext-only'; v.spellcheck = false;
      v.dataset.empty = hint || `Add ${label.toLowerCase()}`;
      v.oninput = () => { edit(v.textContent.trim() || null); r.updated = mxNow(); save(); };
      v.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); v.blur(); } };
    } else if (val == null || val === '') return null;   // a fact we do not have is left out, not dashed
    return h('div', { class: 'rqd-c' + (wide ? ' is-wide' : '') },
      h('span', { class: 'rqd-l' }, label), v);
  };
  const card = (title, _icon, ...cells) => h('section', { class: 'rqd-card' },
    h('div', { class: 'rqd-h' }, title),
    h('div', { class: 'rqd-grid' }, ...cells.filter(Boolean)));
  const deal = { ...(MX_DEALS[r.deal] || {}), ...(r.dealInfo || {}) };
  const tpl = mxTemplateFor(r);
  const cid = MX_CONTRACT_OF[r.counterparty];
  const fmt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const contacts = mxPeople(r).filter(p => p.side === 'counterparty');
  /* every fact, in four sections divided by a hairline; label over value in
     two columns, nothing boxed. The counterparty opens with its register line. */
  const facts = () => {
    const base = MX_CPS[r.counterparty] || (r.counterparty ? { legal: r.counterparty } : null);
    const cp = base ? { ...base, ...(r.cp || {}) } : null;
    const addr = r.address || cp?.addr, law = r.law || cp?.law;
    const mono = (n) => n.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(w => !/^(ltd|plc|inc|llc|lda|gmbh|corp|corporation|the)$/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const sec = (title, ...cells) => h('section', { class: 'rqv' }, title ? h('h3', { class: 'rqv-h' }, title) : null, ...cells.filter(Boolean));
    const grid = (...cells) => h('div', { class: 'rqv-rows' }, ...cells.filter(Boolean));
    const link = (txt, run) => h('button', { class: 'mx-link', type: 'button', onclick: run }, txt);
    return { cp, addr, law, mono, sec, grid, link };
  };
  /* the values, drawn rather than typed out: a face, a ring, a mark */
  const who = (name, sub) => name ? h('span', { class: 'rqv-who' }, mxFace(name, 'pb-av rqv-av'), h('span', {}, name), sub ? h('span', { class: 'rqv-faint' }, sub) : null)
    : h('span', { class: 'rqv-none' }, 'Unassigned');
  const stageVal = () => { const v = MX_ST.req[r.status] || MX_ST.req.progress; return h('span', { class: 'rqv-who' }, h('span', { class: 'rqv-ring mx-st-mi', style: `color:${v.color}`, html: v.svg }), v.label); };
  const priVal = () => h('span', { class: 'rqd-pri' + (r.urgent ? ' is-urgent' : '') }, r.urgent ? 'Urgent' : 'Normal');
  const dueVal = () => {
    if (!r.due) return null;
    const d = new Date(r.due), t = new Date(); t.setHours(0, 0, 0, 0);
    const n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 864e5), done = mxStage(r) === mxStages(r).length - 1;
    const rel = done ? '' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? `in ${n} days` : n === -1 ? '1 day late' : `${-n} days late`;
    return h('span', { class: 'rqv-who' }, fmt(r.due), rel ? h('span', { class: 'rqv-faint' + (!done && n < 0 ? ' is-late' : '') }, rel) : null);
  };
  const coVal = (f) => f.cp ? h('span', { class: 'rqv-who' }, f.cp.legal) : null;
  const dealVal = () => r.deal ? h('span', { class: 'rqv-who' }, h('span', { class: 'rqv-main' }, r.deal), deal.value && deal.value !== '—' ? h('span', { class: 'rqv-faint rqv-keep' }, deal.value) : null) : null;
  /* what a change does: say so in the activity, then draw the page again where you were */
  const redraw = () => { MX.intake.tab = tab; mxOpen('intake', r.id); go('intake'); };
  const changed = (what) => { r.updated = mxNow(); save(); add({ ev: 'status', what }); };
  /* a field's list opens as wide as the value it changes, edge to edge */
  const span = (anchor) => { const m = openMenu, r = anchor.getBoundingClientRect(); if (!m) return; m.style.minWidth = '0'; m.style.width = r.width + 'px'; m.style.left = r.left + 'px'; };
  const choose = (anchor, options, now, set) => { menu(anchor, options.map(o => ({ label: o, tick: o === now, run: () => { if (o !== now) set(o); } }))); span(anchor); };
  const F = {
    type: { pick: (v) => choose(v, MX_RQ_TYPES, r.type, (o) => { r.type = o; changed(`changed the type to ${o}`); redraw(); }) },
    stage: { pick: (v) => { mxReqStatusMenu(v, r, () => redraw()); span(v); } },
    priority: { pick: (v) => choose(v, ['Normal', 'Urgent'], r.urgent ? 'Urgent' : 'Normal', (o) => { r.urgent = o === 'Urgent'; changed(`marked this ${o.toLowerCase()}`); paintBody(); }) },
    due: { date: [() => r.due, (iso) => { r.due = iso; changed(`moved the due date to ${fmt(iso)}`); redraw(); }] },
    assignee: { pick: (v) => mxAssignPicker(v, r, (n) => { if (n === r.attorney) return; r.attorney = n; changed(n ? (n === USER.name ? 'took this on' : `assigned this to ${n}`) : 'removed the assignee'); redraw(); }) },
    submitter: { pick: (v) => mxPersonPicker(v, [...MX_STAFF, ...MX_LEGAL], (p) => { r.submitter = p.name; changed(`changed the submitter to ${p.name}`); paintBody(); }) },
    created: { date: [() => r.created, (iso) => { r.created = iso; save(); paintBody(); }] },
  };
  const cpEdit = (k) => ({ edit: (x) => { (r.cp ||= {})[k] = x; } });
  const dealEdit = (k) => ({ edit: (x) => { (r.dealInfo ||= {})[k] = x; deal[k] = x; } });
  /* Overview: the documents most recently worked on, each a click from the preview */
  /* ── tagged comments from Word: who owes whom an answer, and the words it is about ── */
  const WC_SAY = { open: 'Open', replied: 'Replied', closed: 'Resolved' };
  const wcTag = (id) => { const d = docs.find(x => x.id === id); const src = d?.source || '';
    return /msa/.test(src) ? 'MSA' : src === 'dpa' ? 'DPA' : /nda/.test(src) ? 'NDA' : /order/.test(src) ? 'Order Form' : d ? shortOf(d).replace(/\.\w+$/, '') : ''; };
  const wcWhere = (c) => `${wcTag(c.doc)} ${(/^(\d+)\./.exec(c.clause) || [])[1] || c.clause} · v${c.v}`;
  const youOr = (n) => n === USER.name ? 'You' : n;
  const wcReply = (c, text) => {
    const was = JSON.stringify(c);
    c.thread.push({ who: USER.name, text, when: mxNow() }); c.status = 'replied';
    add({ kind: 'note', what: `On ${wcWhere(c)}, to ${c.by}: ${text}` });
    save(); if (tab === 'summary' || tab === 'comments') paintBody();
    pbToast(`Replied to ${c.by.split(' ')[0]}. It is with them now`, { label: 'Undo', run: () => { Object.assign(c, JSON.parse(was)); (r.activity || []).pop(); save(); if (tab === 'summary') paintBody(); document.querySelector('.rqp-wcpop')?.remove(); } });
  };
  const wcSet = (c, status) => {
    const was = c.status; c.status = status;
    add({ what: `${status === 'closed' ? 'resolved' : status === 'replied' ? 'marked as replied' : 'reopened'} ${c.by.split(' ')[0]}’s comment on ${wcWhere(c)}` }); save(); if (tab === 'summary' || tab === 'comments') paintBody();
    pbToast(status === 'closed' ? 'Thread resolved' : status === 'replied' ? 'Marked as replied' : 'Thread reopened', { label: 'Undo', run: () => { c.status = was; (r.activity || []).pop(); save(); if (tab === 'summary' || tab === 'comments') paintBody(); if (right?.classList.contains('has-cmts')) { paintCPanel(); paintCmtN(); } } });
  };
  /* Word itself: the plugin opens the document at the comment (not wired in this build) */
  const word = (c) => pbToast(`Opens ${titleOf(docs.find(x => x.id === c.doc))} v${c.v} in Word, at this comment`);
  /* Overview: which documents have comments still open, and how many are on you; one opens that document's pane */
  const tagged = () => {
    const all = mxWComments(r); if (!all.length) return null;
    const per = docs.map(d => ({ d, cs: all.filter(c => c.doc === d.id) })).filter(x => x.cs.length);
    const row = ({ d, cs }) => {
      const open = cs.filter(c => c.status !== 'closed'), onMe = cs.filter(c => c.status === 'open' && c.to === USER.name).length;
      const latest = [...cs].sort((a, b) => (b.when > a.when) - (b.when < a.when))[0];
      return h('div', { class: 'rqp-dc rqw-doc', role: 'button', tabindex: '0', onclick: () => openCmts(d.id), onkeydown: (e) => { if (e.key === 'Enter') openCmts(d.id); } },
        mxTile('file', mxExt(d.title)),
        h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-pc-n' }, shortOf(d)),
          h('span', { class: 'rqp-pc-r' }, open.length ? `${latest.by.split(' ')[0]}: ${latest.text}` : 'All closed')),
        h('span', { class: 'rqw-doc-n' + (onMe ? ' is-mine' : '') }, open.length ? [mxPlural(open.length, 'comment'), onMe ? `${onMe} on you` : null].filter(Boolean).join(' · ') : `${cs.length} closed`));
    };
    return h('section', { class: 'rqv rqv-recent rqw' },
      h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Comments')),
      h('div', { class: 'rqp-docs rqp-docs--flat' }, ...per.map(row)));
  };
  /* a document's comments: the document on the right, and its pane open, the first comment on you in focus */
  const openCmts = (docId, focus) => {
    const cs = mxWComments(r).filter(c => c.doc === docId);
    const pick = focus || cs.find(c => c.status === 'open' && c.to === USER.name) || cs.find(c => c.status !== 'closed') || cs[0];
    if (pick) openRef({ doc: docId, v: pick.v }); else openRef({ doc: docId });
    showPanel(true, pick?.id ?? null);
    if (pick) setTimeout(() => markFocus(true), 80);
  };
  const openWord = (c) => openCmts(c.doc, c);
  /* Tracked Comments: every comment tagged in this request's documents, under its document, each one
     opening in place to its thread — reply, close, hand it to a colleague, or go to it in the document */
  const handTo = (c, anchor) => mxPersonPicker(anchor, MX_LEGAL.filter(p => p.name !== c.to), (p) => {
    const was = JSON.stringify(c);
    c.thread.push({ who: USER.name, text: `Handed this to ${p.name}`, when: mxNow(), sys: true }); c.to = p.name; c.status = 'open';
    add({ what: `handed ${c.by.split(' ')[0]}’s comment on ${wcWhere(c)} to ${p.name}` }); save(); paintBody();
    pbToast(`Handed to ${p.name}`, { label: 'Undo', run: () => { Object.assign(c, JSON.parse(was)); (r.activity || []).pop(); save(); paintBody(); } });
  });
  /* the request's Comments tab is the comments pane itself, for one document at a time, with a switcher at the top */
  const commentsTab = () => {
    const host = h('div', { class: 'rqp-cpanel rqp-cpanel--tab' });
    const most = docs.reduce((best, x, i) => mxWComments(r).filter(c => c.doc === x.id).length > mxWComments(r).filter(c => c.doc === docs[best].id).length ? i : best, 0);
    const di0 = MX.intake.cmtDoc != null && docs[MX.intake.cmtDoc] ? MX.intake.cmtDoc : most;
    paintCPanel({ into: host, di: di0 });
    return [host];
  };
  const recentDocs = () => {
    if (!docs.length) return null;
    const lv = (d) => d.versions[d.versions.length - 1];
    const top = [...docs].sort((x, y) => (lv(y).when > lv(x).when) - (lv(y).when < lv(x).when)).slice(0, 3);
    return h('section', { class: 'rqv rqv-recent' },
      h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Recent Documents'),
        h('button', { class: 'rqv-all', type: 'button', onclick: () => setTab('docs') }, 'View all', h('span', { html: ICON('<path d="M9 6l6 6-6 6"/>', 12) }))),
      h('div', { class: 'rqp-docs rqp-docs--flat' }, pendingCmp ? h('div', { class: 'rqp-dc is-pending', 'aria-busy': 'true' }, mxTile('file', 'docx'),
        h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-pc-n' }, pendingCmp.name)),
        h('span', { class: 'rqp-dc-ring', 'aria-label': 'Comparing' })) : null, ...top.map(d => docRow(d, docs.indexOf(d)))));
  };
  /* Overview: the last five things that happened, newest first, with the rest a click away */
  const recent = () => {
    const last = gather([...(r.activity || [])].reverse()).slice(0, 5);
    if (!last.length) return null;
    return h('section', { class: 'rqv rqv-recent' },
      h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Recent Activity'),
        h('button', { class: 'rqv-all', type: 'button', onclick: () => setTab('activity') }, 'View all',
          h('span', { html: ICON('<path d="M9 6l6 6-6 6"/>', 12) }))),
      h('div', { class: 'rqa rqv-acts' }, ...last.map((a, n) => {
        const p = last[n - 1], q = (x) => !['reply', 'note', 'clavia'].includes(x.ev === 'team' ? 'team' : evOf(x));
        const row = entry(a, false, p && p.who === a.who && q(p) && q(a), n === last.length - 1);
        const t = row.querySelector('.rqx-time'); if (t) t.textContent = pbWhen(a.when);
        return row;
      })));
  };
  /* Overview: the facts you need first, in one list */
  const keyFacts = () => {
    const f = facts();
    return [f.sec('Details', f.grid(
      cell('Type', r.type, F.type),
      cell('Status', stageVal(), F.stage),
      cell('Priority', priVal(), F.priority),
      cell('Due', dueVal(), F.due),
      cell('Assignee', who(r.attorney), F.assignee),
      cell('Submitted by', who(r.submitter, r.team), F.submitter),
      cell('Counterparty', coVal(f), { run: () => setTab('details') }),
      cell('Deal', dealVal(), { run: () => setTab('details') })))];
  };
  /* Details: every field, in four groups */
  const details = () => {
    const f = facts(), { cp, addr, law, sec, grid, link } = f;
    return [
      sec('Request', grid(
        cell('Type', r.type, F.type),
        cell('Status', stageVal(), F.stage),
        cell('Priority', priVal(), F.priority),
        cell('Due', dueVal(), F.due),
        cell('Assignee', who(r.attorney), F.assignee),
        cell('Submitted by', who(r.submitter, r.team), F.submitter),
        cell('Submitted on', fmt(r.created), F.created))),
      cp ? sec('Counterparty', grid(
        cell('Name', cp.legal, cpEdit('legal')),
        cell('Company type', cp.kind || null, cpEdit('kind')),
        cell('Registered in', cp.where || null, cpEdit('where')),
        cell('Company no.', cp.no ? cp.no.replace(/^(Company no\.|File no\.|Licence no\.|NIPC)\s*/i, '') : null, cpEdit('no')),
        cell('Registered office', addr || null, { edit: (x) => { r.address = x; } }),
        cell('Governing law', law || null, { edit: (x) => { r.law = x; } }),
        cell('Proposed in', cp.lawFrom ? cp.lawFrom.replace(/^\w/, c => c.toUpperCase()) : null,
          { pick: (v) => choose(v, ['Our template', 'Our draft', 'Their paper', 'Their redline'], (cp.lawFrom || '').replace(/^\w/, c => c.toUpperCase()), (o) => { (r.cp ||= {}).lawFrom = o; save(); paintBody(); }) }),
        contacts.length ? cell('Contacts', h('span', { class: 'rqv-list' }, ...contacts.map(p => h('a', { class: 'rqv-link', href: `mailto:${p.email || ''}`, 'data-tip': `Email ${p.name}` }, who(p.name, p.role))))) : null)) : null,
      r.deal ? sec('Deal', grid(
        cell('Name', r.deal, { edit: (x) => { r.deal = x; } }),
        cell('Value', deal.value && deal.value !== '—' ? deal.value : null, dealEdit('value')),
        cell('Deal stage', deal.stage || null, { pick: (v) => choose(v, ['Discovery', 'Pilot', 'Proposal', 'Negotiation', 'Closing', 'Renewal', 'Closed won', 'Closed lost'], deal.stage, (o) => { (r.dealInfo ||= {}).stage = o; deal.stage = o; save(); paintBody(); }) }),
        cell('Expected close', deal.close || null, { date: [() => deal.close ? new Date(deal.close).toISOString() : null, (iso) => { const t = fmt(iso); (r.dealInfo ||= {}).close = t; deal.close = t; save(); paintBody(); }] }),
        cell('Owner', deal.owner ? who(deal.owner) : null, { pick: (v) => mxPersonPicker(v, MX_STAFF, (p) => { (r.dealInfo ||= {}).owner = p.name; deal.owner = p.name; save(); paintBody(); }) }))) : null,
      sec('Paper', grid(
        cell('Starts from', r.startsFrom || (cid ? `${r.counterparty}’s paper` : tpl ? 'Our template' : null),
          { pick: (v) => choose(v, ['Our template', `${r.counterparty || 'Their'}’s paper`], r.startsFrom || (cid ? `${r.counterparty}’s paper` : 'Our template'), (o) => { r.startsFrom = o; save(); paintBody(); }) }),
        cell('Template', tpl ? tpl.name : null, { run: () => mxOpen('templates', tpl.id) }),
        cell('Playbook review', cid ? `Open in Contracts · ${cid}` : null, { run: () => mxOpen('requests', cid) }),
        cell('Documents', docs.length ? mxPlural(docs.length, 'document') : null, { run: () => setTab('docs') }))),
    ];
  };

  /* Deal Team: the people on our side working on it, by name and title,
     with one way to add someone */
  const teamOf = () => {
    const ppl = mxPeople(r).filter(p => p.side !== 'counterparty');
    const names = [...new Set([r.attorney, ...ppl.map(p => p.name)].filter(Boolean))];
    return names.map(n => ({ name: n, title: mxTitleOf(n) || (ppl.find(p => p.name === n)?.role || '').replace(/^Submitter · /, '') }));
  };
  /* Key Terms: what the main document says on the points that matter, each
     a click from its clause on the right; what is outside the playbook says
     what the playbook wants instead */
  const jumpTo = (head) => {
    openRef({ doc: docs[0].id });
    const el = [...page.querySelectorAll('h2, .doc-h2')].find(e => e.textContent.trim().toLowerCase().startsWith(head.toLowerCase()));
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    el.classList.remove('rqp-flash'); void el.offsetWidth; el.classList.add('rqp-flash');
  };
  /* Issues: the deal's issues list. One list across every document being
     negotiated, grouped by who has to act next; each point shows the gap
     between the two sides, and opens to the turns that got it there */
  const ISSUE_GROUPS = (side) => [['reply', 'Needs our reply'], ['signoff', 'Needs sign-off'], ['them', `With ${side}`], ['agreed', 'Agreed']];
  const docTag = (id) => { const d = docs.find(x => x.id === id); if (!d) return ''; const src = d.source || '';
    return /msa/.test(src) ? 'MSA' : src === 'dpa' ? 'DPA' : /nda/.test(src) ? 'NDA' : /order/.test(src) ? 'Order Form' : shortOf(d).replace(/\.\w+$/, ''); };
  const clauseNo = (head) => (/^(\d+)\./.exec(head) || [])[1] || head;
  const issues = () => {
    const list = mxIssues(r), side = (r.counterparty || 'Them').split(/\s+/)[0];
    const turnAt = (i) => { const t = list.turns[i], [id, v] = Object.entries(t.docs)[0], d = docs.find(x => x.id === id); return d?.versions[v - 1]?.when; };
    const showIn = (it, i) => {
      /* the clause, in the version that turn sent; the first document of the point that the turn carried */
      const t = i == null ? null : list.turns[i];
      const [id, head] = (t && it.where.find(([w]) => t.docs[w])) || it.where[0];
      openRef({ doc: id, v: t?.docs[id] });
      requestAnimationFrame(() => {
        const el = [...page.querySelectorAll('h2, .doc-h2')].find(e => e.textContent.trim().toLowerCase().replace(/^\d+\.\s*/, '').startsWith(head.toLowerCase().replace(/^\d+\.\s*/, '')));
        if (!el) return;
        scroll.scrollTo({ top: scroll.scrollTop + el.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 28, behavior: 'smooth' });
        el.classList.remove('rqp-flash'); void el.offsetWidth; el.classList.add('rqp-flash');
      });
    };
    const last = (it, who) => { for (let i = it.pos.length - 1; i >= 0; i--) if (it.pos[i] != null && list.turns[i].side === who) return it.pos[i]; return null; };
    const move = (it, k, label) => {
      if (k === it.status) return;
      const was = it.status, what = `moved ${it.name} to ${label.toLowerCase()}`; it.status = k; save();
      add({ what }); paintBody();
      pbToast(`${it.name}: ${label.toLowerCase()}`, { label: 'Undo', run: () => { it.status = was; const log = r.activity || []; if (log[log.length - 1]?.what === what) log.pop(); save(); paintBody(); } });
    };
    /* a row of the issues list: the point, our position, theirs, where it lives. The side whose
       position is on the table reads in ink; the other is quieter. Opened, the turns line up under
       the same two columns, so the history reads down the side that moved. */
    const fmt = (w) => w ? new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    const row = (it) => {
      const ours = last(it, 'ours'), theirs = last(it, 'theirs'), agreed = it.status === 'agreed';
      const lead = agreed ? null : it.status === 'them' ? 'ours' : 'theirs';
      const more = h('button', { class: 'rqi-more-btn', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'Move', html: PB_SVG.dots });
      more.onclick = (e) => { e.stopPropagation(); menu(more, ISSUE_GROUPS(side).map(([k, label]) => ({ label, tick: k === it.status, run: () => move(it, k, label) }))); };
      const isOpen = MX.intake.issue === it.name;
      const where = h('span', { class: 'rqi-where', 'data-tip': it.where.map(([id, hd]) => `${docTag(id)} · ${hd}`).join('\n') },
        it.where.map(([id, hd]) => `${docTag(id)} ${clauseNo(hd)}`).join('\n'));
      const head = h('div', { class: 'rqi-row', role: 'button', tabindex: '0', 'aria-expanded': String(isOpen),
        onclick: () => { MX.intake.issue = isOpen ? null : it.name; paintBody(); },
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); } } },
        h('span', { class: 'rqi-mark is-' + it.status, html: agreed ? ICON('<path d="m6 12.5 4 4 8-8.5"/>', 10) : '' }),
        h('span', { class: 'rqi-n' }, it.name),
        agreed ? h('span', { class: 'rqi-c rqi-c--both' }, ours || theirs)
          : [h('span', { class: 'rqi-c' + (lead === 'ours' ? ' is-lead' : '') }, ours || '—'), h('span', { class: 'rqi-c' + (lead === 'theirs' ? ' is-lead' : '') }, theirs || '—')],
        where, more);
      const turns = it.pos.map((text, i) => text == null ? null : h('div', { class: 'rqi-turn', role: 'button', tabindex: '0', 'data-tip': 'Show the clause in this version',
          onclick: () => showIn(it, i), onkeydown: (e) => { if (e.key === 'Enter') showIn(it, i); } },
        h('span', {}), h('span', { class: 'rqi-turn-d' }, fmt(turnAt(i))),
        h('span', { class: 'rqi-c' }, list.turns[i].side === 'ours' ? text : ''),
        h('span', { class: 'rqi-c' }, list.turns[i].side === 'theirs' ? text : ''),
        h('span', {}), h('span', {}))).filter(Boolean);
      const facts = [it.note, it.how, `Playbook: ${it.playbook.replace(' · ', ', ')}`, it.status === 'signoff' && it.signoff ? `Decision: ${it.signoff}` : null, `Owner: ${it.owner}`].filter(Boolean);
      const body = isOpen ? h('div', { class: 'rqi-hist' }, ...turns,
        h('div', { class: 'rqi-facts' }, h('span', {}), h('span', { class: 'rqi-facts-t' }, facts.join(' · ')))) : null;
      return h('div', { class: 'rqi' + (isOpen ? ' is-open' : '') }, head, body);
    };
    const cols = h('div', { class: 'rqi-row rqi-cols', 'aria-hidden': 'true' }, h('span', {}), h('span', {}, 'Point'), h('span', {}, 'Our position'), h('span', {}, `${side}’s position`), h('span', {}, 'Clause'), h('span', {}));
    return [cols, ...ISSUE_GROUPS(side).flatMap(([k, label]) => {
      const rows = list.items.filter(x => x.status === k);
      return rows.length ? [h('h3', { class: 'rqi-group' }, label, h('span', { class: 'rqi-count' }, String(rows.length))), h('section', { class: 'rqi-list' }, ...rows.map(row))] : [];
    })];
  };

  const terms = () => {
    const d = docs[0], v = d.versions[d.versions.length - 1], list = MX_TERMS[r.id] && d.id === 'd1' ? MX_TERMS[r.id] : null;
    const off = list ? list.filter(t => t[3]).length : 0, blank = list ? list.filter(t => t[1] == null).length : 0;
    const chev = ICON('<path d="M9 6l6 6-6 6"/>', 13);
    return [h('section', { class: 'rqc' },
      h('div', { class: 'rqc-h rqc-h--split' }, h('h3', {}, 'Key Terms'),
        h('span', { class: 'rqc-h-r' + (off ? ' is-warn' : '') }, off ? `${off} outside the playbook` : blank ? `${blank} still blank` : list ? 'All within the playbook' : '')),
      h('div', { class: 'rqc-sub' }, `Read from ${d.title.replace(/\.(docx?|pdf|txt|md)$/i, '')} v${d.versions.length} · ${v.name}`),
      list ? h('div', { class: 'rqc-rows' }, ...list.map(([label, val, head, note]) =>
        h('button', { class: 'rqd-c rqk' + (note ? ' is-off' : '') + (val == null ? ' is-blank' : ''), type: 'button', 'data-tip': 'Show the clause', onclick: () => jumpTo(head) },
          h('span', { class: 'rqd-l' }, label),
          h('span', { class: 'rqd-v' }, val ?? 'Not filled in yet', note ? h('span', { class: 'rqk-note' }, note) : null),
          h('span', { class: 'rqk-go', html: chev }))))
      : h('p', { class: 'rqc-empty' }, 'Clavia has not read the key terms from this document yet.'))];
  };

/* a short note in a small dialog: asking for changes, a comment for the other side */
  const noteDlg = (title, ph, action, done, label = 'What needs to change', value = '') => {
    const ta = h('textarea', { class: 'mx-rqf-in mx-rqf-ta', rows: '3', placeholder: ph }); ta.value = value;
    const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
    const ok = () => { const t = ta.value.trim(); if (!t) { ta.focus(); return; } close(); done(t); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ok(); } };
    dim.append(h('div', { class: 'pb-dlg mx-rqf mx-upn', role: 'dialog', 'aria-label': title },
      h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t' }, title),
        h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
      h('div', { class: 'mx-rqf-body' }, h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, label), ta)),
      h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: ok }, action))));
    document.body.append(dim); addEventListener('keydown', onKey, true); requestAnimationFrame(() => ta.focus());
  };
  /* Approvals: stages of approvers, then the signers, each a card with a
     path of marks. A row says who, why they are on it, where it stands;
     the one thing to do next (Approve, Remind, Sign) sits on the row, the
     rest in its ⋯. The section's own actions sit in its heading. */
  const approvals = () => {
    const sg = mxSign(r), st = mxStages(r), sAt = st.indexOf('Signing'), last = st.length - 1;
    const d = docs.find(x => x.id === 'd1') || docs[0];
    const mainV = d ? d.versions.length : 0;
    const side = (r.counterparty || 'them').split(/\s+/)[0];
    const day = (iso) => { const w = pbWhen(iso); return /^(Today|Yesterday)/.test(w) ? w.split(',')[0].toLowerCase() : w; };
    const ago = (iso) => { const n = Math.floor((Date.now() - new Date(iso)) / 864e5); return n <= 0 ? 'today' : n === 1 ? '1 day' : `${n} days`; };
    const nameOf = (x) => x.who || x.group || 'Not assigned yet';
    const members = (x) => x.group ? MX_GROUPS[x.group] || [] : [x.who].filter(Boolean);
    const mine = (x) => members(x).includes(USER.name);
    const undoable = (msg, what, back) => { add({ what }); save(); paintBody();
      pbToast(msg, { label: 'Undo', run: () => { back(); const log = r.activity || []; if (log[log.length - 1]?.what === what) log.pop(); save(); paintBody(); } }); };
    const snap = (x) => JSON.stringify(x);
    const restore = (x, j) => { const o = JSON.parse(j); for (const k of Object.keys(x)) delete x[k]; Object.assign(x, o); };
    const remind = (xs) => { const now = mxNow(), names = xs.map(nameOf), saved = xs.map(snap);
      xs.forEach(x => { x.reminded = now; });
      undoable(`Reminded ${names.join(' and ')}`, `reminded ${names.join(' and ')}`, () => xs.forEach((x, i) => restore(x, saved[i]))); };
    const approve = (x, who) => { const j = snap(x); x.state = 'approved'; x.at = mxNow(); x.onV = mainV; x.by = [who];
      /* the next stage starts waiting from now, not from when the request came in */
      const nx = mxActiveStage(sg); if (nx >= 0) sg.stages[nx].items.forEach(y => { if (y.state === 'waiting' && !y.reminded) y.since = mxNow(); });
      undoable(`${x.what} approved`, who === USER.name ? `approved this · ${x.what.toLowerCase()}` : `recorded ${who}’s approval · ${x.what.toLowerCase()}`, () => restore(x, j)); };
    const ask = (x) => { const j = snap(x); x.state = 'waiting'; x.at = null; x.by = []; x.since = mxNow();
      undoable(`Asked ${nameOf(x)} again`, `asked ${nameOf(x)} to approve again`, () => restore(x, j)); };
    const pickPerson = (anchor, done, groups) => mxPersonPicker(anchor, [
      ...(groups ? Object.entries(MX_GROUPS).map(([g, m]) => ({ name: g, role: `Team · ${m.length} people`, group: true })) : []),
      ...[...MX_LEGAL, ...MX_STAFF]], done);

    /* the ⋯ last opened, for pickers that hang from it */
    let lastDots = null; const dotsAnchor = () => lastDots;
    /* one step on the path */
    const step = ({ mark, name, what, why, status, tone, act, items, sub, cls = '' }) => {
      const dots = items?.length ? h('button', { class: 'rqi-more-btn', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'More', html: PB_SVG.dots }) : h('span', { class: 'rqg-dots-gap' });
      if (items?.length) dots.onclick = (e) => { e.stopPropagation(); lastDots = dots; menu(dots, items); };
      return h('div', { class: `rqt rqg-step is-${mark} ${cls}`, 'data-tip': why || null },
        h('span', { class: 'rqt-mark', html: mark === 'done' ? ICON('<path d="m6 12.5 4 4 8-8.5"/>', 12) : mark === 'off' ? ICON('<path d="M8 12h8"/>', 12) : mark === 'stop' ? ICON('<path d="M12 7.5v5.5M12 16.4v.1"/>', 12) : '' }),
        h('span', { class: 'rqt-t' },
          h('span', { class: 'rqt-n' }, name, what ? h('span', { class: 'rqt-sep' }, '·') : null, what ? h('span', { class: 'rqt-w' }, what) : null),
          sub ? h('span', { class: 'rqg-sub' }, sub) : null),
        h('span', { class: 'rqg-st is-' + tone }, status),
        act || h('span', { class: 'rqg-act-gap' }),
        dots);
    };
    const word = (label, run, ink) => h('button', { class: 'rqg-word' + (ink ? ' is-ink' : ''), type: 'button', onclick: (e) => { e.stopPropagation(); run(e); } }, label);
    /* Approve opens the brief: what is being approved and the terms that matter to this step, so the yes is informed */
    const briefDlg = (brief, onYes, onNo) => {
      const ta = h('textarea', { class: 'mx-rqf-in mx-rqf-ta', rows: '2', placeholder: 'Add a note (optional)' });
      const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
      const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
      const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
      const no = () => { const t = ta.value.trim(); if (!t) { ta.placeholder = 'Say what needs to change'; ta.focus(); return; } close(); onNo(t); };
      dim.append(h('div', { class: 'pb-dlg mx-rqf mx-upn rqg-brief', role: 'dialog', 'aria-label': brief.title },
        h('header', { class: 'mx-rqf-head' }, h('div', {}, h('h2', { class: 'pb-dlg-t' }, brief.title), h('div', { class: 'rqg-brief-sub' }, brief.sub)),
          h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
        h('div', { class: 'mx-rqf-body' },
          h('dl', { class: 'rqg-brief-dl' }, ...brief.lines.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
          brief.approveSays ? h('p', { class: 'rqg-brief-say' }, brief.approveSays) : null,
          ta),
        h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: no }, 'Request changes'),
          h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: () => { const t = ta.value.trim(); close(); onYes(t || null); } }, 'Approve'))));
      document.body.append(dim); addEventListener('keydown', onKey, true);
    };
    const changes = (x, t) => { const j = snap(x); x.state = 'changes'; x.note = t; x.at = mxNow(); undoable('Changes requested', `requested changes · ${t}`, () => restore(x, j)); };
    const askApprove = (x, who, stepName) => briefDlg(mxApprovalBrief(r, stepName || x.what),
      (note) => { approve(x, who); if (note) { x.note = note; add({ kind: 'note', what: note }); } }, (t) => changes(x, t));

    /* ── approvals: one row per role — who approves it, and where it stands ── */
    /* a row of the sign-off sheet: its state as a small dot, the role, who, one status word or the action */
    const trow = ({ k, role, who, tip, status, act, items }) => {
      const dots = items?.length ? h('button', { class: 'rqi-more-btn', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'More', html: PB_SVG.dots }) : null;
      if (dots) dots.onclick = (e) => { e.stopPropagation(); lastDots = dots; menu(dots, items); };
      return h('div', { class: 'rqg-tr is-' + k },
        h('span', { class: 'rqg-tr-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'rqg-tr-role', 'data-tip': tip || null }, role),
        h('span', { class: 'rqg-tr-who' }, who),
        act || h('span', { class: 'rqg-tr-st' }, status), dots);
    };
    const mainD = d, apV = mainD ? mainD.versions.length : 0, docTagMain = mainD ? docTag(mainD.id) : 'document';
    const live = sg.approvals.filter(x => !x.gone || x.state === 'approved');
    const pending = live.filter(x => !x.gone && ['pending', 'stale'].includes(mxApNow(r, x).k));
    const others = pending.filter(x => x.who !== USER.name);
    const keep = (x) => JSON.stringify(x), put = (x, j) => { const o = JSON.parse(j); for (const k of Object.keys(x)) delete x[k]; Object.assign(x, o); };
    const whoOf = (x) => x.team ? `Any one of ${x.team}` : x.who || 'Not assigned';
    /* asking: everyone the rules name, on the version as it stands; the brief goes to each (scripted) */
    const request = () => {
      const was = keep(sg); sg.requested = { v: apV, at: mxNow() };
      for (const x of sg.approvals) if (!x.gone && x.state !== 'approved') { x.state = 'pending'; x.asked = mxNow(); }
      const n = sg.approvals.filter(x => !x.gone && x.state === 'pending').length;
      add({ ev: 'email', what: `asked ${mxPlural(n, 'approver', 'approvers')} to approve v${apV} of the ${docTagMain}`, ref: mainD ? { doc: mainD.id, v: apV } : null });
      save(); paintBody();
      pbToast(`Sent to ${mxPlural(n, 'approver', 'approvers')}`, { label: 'Undo', run: () => { r.sign = JSON.parse(was); const log = r.activity || []; log.pop(); save(); paintBody(); } });
    };
    const remindAll = () => { const names = others.map(whoOf); add({ ev: 'email', what: `reminded ${names.join(', ')}` }); save(); pbToast(`Reminded ${names.join(', ')}`); };
    const decideAs = (x, by, yes, note) => {
      const j = keep(x);
      if (yes) Object.assign(x, { state: 'approved', at: mxNow(), by, onV: apV, note: note || null });
      else Object.assign(x, { state: 'rejected', at: mxNow(), by, note });
      const what = yes ? (by === USER.name ? `approved v${apV} of the ${docTagMain} · ${x.role}` : `recorded ${by}’s approval · ${x.role}`) : `rejected v${apV} · ${x.role} · ${note}`;
      add({ what }); if (note && yes) add({ kind: 'note', what: note }); paintBody();
      pbToast(yes ? `${x.role} approved` : `${x.role} rejected`, { label: 'Undo', run: () => { put(x, j); const log = r.activity || []; log.pop(); if (note && yes) log.pop(); save(); paintBody(); } });
      /* a role outside the playbook approves the exceptions it was asked about */
      if (yes && x.role === 'General Counsel') for (const p of mxSignoffPoints(r)) p.decision = { d: 'accept' };
    };
    const askAgain = (x) => { const j = keep(x); Object.assign(x, { state: 'pending', asked: mxNow(), at: null, by: null }); add({ ev: 'email', what: `asked ${whoOf(x)} to approve v${apV} again · ${x.role}` }); paintBody();
      pbToast(`Asked ${whoOf(x)} again`, { label: 'Undo', run: () => { put(x, j); (r.activity || []).pop(); save(); paintBody(); } }); };
    const apRow = (x) => {
      const now = mxApNow(r, x), k = now.k;
      const day2 = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      const tip = [x.why, k === 'approved' && x.by ? `Approved by ${x.by} on ${day2(x.at)}, on v${x.onV}` : null, k === 'stale' ? `Approved on v${x.onV}. Since then: ${now.changed.join(', ')}` : null,
        k === 'rejected' && x.note ? `${x.by}: ${x.note}` : null, x.team ? (MX_GROUPS[x.team] || []).join(', ') : null].filter(Boolean).join('\n');
      const status = { not: 'Not requested', pending: 'Pending', approved: 'Approved', stale: `Approved on v${x.onV}`, rejected: 'Rejected', gone: 'Not needed' }[k];
      const mine = x.who === USER.name;
      const act = mine && (k === 'pending' || k === 'stale') ? word('Approve', () => briefDlg(mxApprovalBrief(r, x.role === 'General Counsel' ? 'General Counsel' : x.role),
        (note) => decideAs(x, USER.name, true, note), (t) => decideAs(x, USER.name, false, t)), true) : null;
      const items = [];
      if (k === 'pending' && !mine) {
        items.push({ label: `Remind ${x.team ? x.team : x.who.split(' ')[0]}`, run: () => { add({ ev: 'email', what: `reminded ${whoOf(x)}` }); save(); pbToast(`Reminded ${whoOf(x)}`); } });
        (x.team ? MX_GROUPS[x.team] || [] : [x.who]).forEach(m => items.push({ label: x.team ? `Record ${m.split(' ')[0]}’s approval` : 'Record approval given by email', run: () => decideAs(x, m, true) }));
      }
      if (k === 'stale' || k === 'rejected' || (k === 'approved' && sg.requested)) items.push({ label: 'Ask again', run: () => askAgain(x) });
      if (k !== 'approved' && k !== 'gone') items.push({ label: 'Change approver', run: () => pickPerson(dotsAnchor(), (p) => { const j = keep(x);
        if (p.group) { x.team = p.name; x.who = null; } else { x.who = p.name; x.team = null; } x.manualWho = true; add({ what: `changed the ${x.role.toLowerCase()} approver to ${p.name}` }); paintBody();
        pbToast(`${p.name} approves for ${x.role}`, { label: 'Undo', run: () => { put(x, j); (r.activity || []).pop(); save(); paintBody(); } }); }, true) });
      if (x.manual) items.push({ rule: true }, { label: 'Remove', danger: true, run: () => { const i = sg.approvals.indexOf(x); sg.approvals.splice(i, 1); add({ what: `removed ${whoOf(x)} from the approvals` }); paintBody();
        pbToast(`${whoOf(x)} removed`, { label: 'Undo', run: () => { sg.approvals.splice(i, 0, x); (r.activity || []).pop(); save(); paintBody(); } }); } });
      return trow({ k, role: x.role, who: whoOf(x), tip, status, act, items });
    };
    const addApprover = h('button', { class: 'rqp-addsh rqg-add', type: 'button' }, h('span', { class: 'rqp-addsh-ic', html: ICON('<path d="M12 6v12M6 12h12"/>', 14) }), h('span', {}, 'Add an approver'));
    addApprover.onclick = (e) => { e.stopPropagation(); pickPerson(addApprover, (p) => {
      const x = { id: pbUid('ap'), role: p.group ? p.name : (MX_LEGAL.concat(MX_STAFF).find(q => q.name === p.name)?.role || 'Approval').split(' · ')[0], manual: true, manualWho: true,
        who: p.group ? null : p.name, team: p.group ? p.name : null, why: 'Added by hand', state: sg.requested ? 'pending' : 'not', asked: sg.requested ? mxNow() : null };
      sg.approvals.push(x); add({ what: `added ${p.name} to the approvals` }); paintBody();
      pbToast(`${p.name} added`, { label: 'Undo', run: () => { sg.approvals = sg.approvals.filter(y => y !== x); (r.activity || []).pop(); save(); paintBody(); } }); }, true); };
    const apAct = !live.length ? null : !sg.requested ? h('button', { class: 'rqg-act', type: 'button', onclick: request }, 'Request approval')
      : others.length ? h('button', { class: 'rqg-act', type: 'button', onclick: remindAll }, others.length > 1 ? 'Remind all' : 'Remind') : null;
    const apHead = h('h3', { class: 'rqc-title rqg-head' }, h('span', {}, 'Approvals'), h('span', { class: 'rqg-head-r' }, apAct));
    const apCard = live.length ? h('section', { class: 'rqc rqg-card rqg-tbl' }, ...live.map(apRow))
      : h('section', { class: 'rqc rqg-card rqg-tbl' }, h('p', { class: 'rqg-none' }, r.resolvedBy ? 'No approvals needed. Standard terms on our template.' : 'No approvals needed.'));

    /* ── signatures ── */
    const expired = sg.sent && !sg.signers.every(x => x.state === 'signed') && Date.now() > new Date(sg.sent).getTime() + SIGN_EXPIRES_DAYS * 864e5;
    const nextSigner = sg.order === 'in order' ? sg.signers.find(x => x.state !== 'signed') : null;
    const sign = (x, who = x.who) => {
      x.state = 'signed'; x.at = mxNow(); add({ what: x.who === USER.name ? 'signed for us' : `recorded ${x.who}’s signature` });
      if (sg.signers.every(y => y.state === 'signed') && d) {
        const src = d.versions[(sg.doc?.v || d.versions.length) - 1];
        const on = (y) => new Date(y.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const v = { name: 'Signed copy', by: 'Clavia', when: mxNow(), file: `${titleOf(d)} — signed.pdf`,
          blocks: [...(src.blocks || []), { t: 'meta', v: sg.signers.map(y => `SIGNED ${y.what.replace(/^Signs /, '').toUpperCase()} BY ${String(y.who).toUpperCase()} ON ${on(y).toUpperCase()}`).join(' · ') }],
          note: 'Every signature in' };
        mxAddVersion(r, v, d.id); sg.signed = { doc: d.id, v: d.versions.length };
        add({ ev: 'version', what: `Clavia saved the signed copy as v${d.versions.length}`, ref: { doc: d.id, v: d.versions.length } });
        mxSetStage(r, last); paintSteps(); stageBtn._paint?.();
        pbToast(`${r.id} is signed`);
      } else { save(); pbToast(`${x.who === USER.name ? 'You have' : x.who + ' has'} signed`); }
      paintBody();
    };
    const send = (again) => {
      const go = () => {
        sendBtn.disabled = true; sendBtn.replaceChildren(h('span', { class: 'rqp-dc-ring rqg-ring', 'aria-label': 'Sending' }), 'Sending');
        setTimeout(() => {
          sg.sent = mxNow(); sg.doc = { doc: d.id, v: d.versions.length }; sg.signed = null;
          sg.signers.forEach(x => { x.state = 'sent'; x.at = null; x.reminded = null; });
          add({ ev: 'email', what: `${again ? 'sent again' : 'sent'} v${d.versions.length} of the ${shortOf(d).replace(/\.\w+$/, '')} for signature${sg.cc.length ? `, copying ${sg.cc.join(' and ')}` : ''}`, ref: { doc: d.id, v: d.versions.length } });
          if (mxStage(r) < sAt) { mxSetStage(r, sAt); paintSteps(); stageBtn._paint?.(); }
          save(); paintBody(); pbToast('Sent for signature');
        }, 1600);
      };
      const wait = mxSignWaiting(r);
      if (wait.length && !again) pbConfirm({ title: 'Approvals are still waiting', lead: `${r.id} should go for signature once ${wait.length === 1 ? 'this is' : 'these are'} in.`,
        items: wait.map(x => ({ n: x.who || 'Not assigned', t: x.what })), action: 'Send anyway', run: go });
      else go();
    };
    const sendBtn = h('button', { class: 'rqg-act', type: 'button', onclick: () => send(expired) }, expired ? 'Send again' : 'Send for signature');
    const sgDots = h('button', { class: 'rqi-more-btn rqg-head-dots', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'More', html: PB_SVG.dots });
    const cancelSend = () => pbConfirm({ title: 'Cancel the signature request?', lead: 'Nobody will be able to sign the copy that went out. You can send it again.', action: 'Cancel request',
      run: () => { const j = snap(sg.signers); sg.sent = null; sg.signers.forEach(x => { x.state = 'not'; x.at = null; }); undoable('Signature request cancelled', 'cancelled the signature request', () => { sg.signers = JSON.parse(j); }); } });
    sgDots.onclick = (e) => { e.stopPropagation(); if (e.cancelOnly) return cancelSend(); menu(sgDots, [
      ...(!sg.sent ? [{ label: 'Sign in this order', tick: sg.order === 'in order', run: () => { sg.order = 'in order'; save(); paintBody(); } },
        { label: 'Sign in any order', tick: sg.order === 'any order', run: () => { sg.order = 'any order'; save(); paintBody(); } }, { rule: true }] : []),
      { label: 'Send a copy to…', run: () => pickPerson(sgDots, (p) => { if (sg.cc.includes(p.name)) return; sg.cc.push(p.name); undoable(`${p.name} gets a copy`, `added ${p.name} as a copy recipient`, () => { sg.cc = sg.cc.filter(n => n !== p.name); }); }) },
      ...(sg.sent && !sg.signed ? [{ rule: true }, { label: 'Cancel the signature request', danger: true, run: () => pbConfirm({ title: 'Cancel the signature request?', lead: 'Nobody will be able to sign the copy that went out. You can send it again.', action: 'Cancel request',
        run: () => { const j = snap(sg.signers); sg.sent = null; sg.signers.forEach(x => { x.state = 'not'; x.at = null; }); undoable('Signature request cancelled', 'cancelled the signature request', () => { sg.signers = JSON.parse(j); }); } }) }] : []),
    ]); };
    const sgRow = (x, i) => {
      const active2 = sg.order === 'any order' ? x.state !== 'signed' : x === nextSigner;
      const items = [];
      let mark, status, tone, act = null;
      if (x.state === 'signed') { mark = 'done'; tone = 'done'; status = `Signed ${day(x.at)}`; }
      else if (x.state === 'declined') { mark = 'stop'; tone = 'stop'; status = 'Declined'; }
      else if (!sg.sent) { mark = 'todo'; tone = 'faint'; status = '';
        items.push({ label: 'Change signer', run: () => pickPerson(sgDots, (p) => { const was = x.who; x.who = p.name; undoable(`${p.name} signs`, `changed the signer from ${was || 'nobody'} to ${p.name}`, () => { x.who = was; }); }) }); }
      else if (expired) { mark = 'stop'; tone = 'stop'; status = 'Expired'; }
      else if (!active2) { mark = 'todo'; tone = 'faint'; status = ''; }
      else {
        mark = 'now'; tone = 'wait';
        status = x.reminded ? `Reminded ${day(x.reminded)}` : x.state === 'viewed' ? `Opened ${day(x.viewed || sg.sent)}` : `Sent ${day(sg.sent)}`;
        act = x.who === USER.name ? word('Sign', () => sign(x), true) : word('Remind', () => { const j = snap(x); x.reminded = mxNow(); undoable(`Reminded ${x.who}`, `reminded ${x.who} to sign`, () => restore(x, j)); });
        if (x.who !== USER.name) items.push({ label: 'Mark as signed', run: () => sign(x) }, { label: 'Mark as declined', run: () => { const j = snap(x); x.state = 'declined'; undoable(`${x.who} declined`, `recorded that ${x.who} declined to sign`, () => restore(x, j)); } });
      }
      /* how the signing runs belongs to the signers, so it lives in their menu */
      items.push({ rule: true },
        ...(!sg.sent ? [{ label: 'Sign in this order', tick: sg.order === 'in order', run: () => { sg.order = 'in order'; save(); paintBody(); } },
          { label: 'Sign in any order', tick: sg.order === 'any order', run: () => { sg.order = 'any order'; save(); paintBody(); } }] : []),
        { label: 'Send a copy to…', run: () => pickPerson(dotsAnchor(), (p) => { if (sg.cc.includes(p.name)) return; sg.cc.push(p.name); undoable(`${p.name} gets a copy`, `added ${p.name} as a copy recipient`, () => { sg.cc = sg.cc.filter(n => n !== p.name); }); }) },
        ...(sg.sent && !sg.signed ? [{ label: 'Cancel the signature request', danger: true, run: () => sgDots.onclick({ stopPropagation() {}, cancelOnly: true }) }] : []));
      while (items[0]?.rule) items.shift();
      const sk = x.state === 'signed' ? 'approved' : x.state === 'declined' ? 'rejected' : expired ? 'rejected' : sg.sent && active2 ? 'pending' : 'not';
      const sayStatus = x.state === 'signed' ? 'Signed' : x.state === 'declined' ? 'Declined' : expired ? 'Expired' : !sg.sent ? 'Not sent' : !active2 ? 'Next' : x.state === 'viewed' ? 'Opened' : 'Sent';
      return trow({ k: sk, role: x.who === USER.name || /for us/i.test(x.what) ? 'For us' : `For ${x.what.replace(/^Signs for (\S+).*$/, '$1')}`, who: x.who || 'Not chosen yet',
        tip: x.state === 'signed' ? `Signed ${day(x.at)}` : null, status: sayStatus, act: x.who === USER.name && sk === 'pending' ? act : null, items });
    };
    const ccRow = (n) => h('div', { class: 'rqt rqg-step rqg-cc' }, h('span', { class: 'rqt-mark rqg-cc-mark' }),
      h('span', { class: 'rqt-t' }, h('span', { class: 'rqt-n' }, n, h('span', { class: 'rqt-sep' }, '·'), h('span', { class: 'rqt-w' }, 'Gets a copy'))),
      h('span', { class: 'rqg-st is-faint' }, ''), h('span', { class: 'rqg-act-gap' }),
      ((b) => { b.onclick = (e) => { e.stopPropagation(); menu(b, [{ label: 'Remove', danger: true, run: () => { sg.cc = sg.cc.filter(m => m !== n); save(); paintBody(); } }]); }; return b; })(h('button', { class: 'rqi-more-btn', type: 'button', 'data-tip': 'More', html: PB_SVG.dots })));
    const canSend = sAt >= 0 && d && (!sg.sent || expired) && !sg.signed;
    const sgHead = h('h3', { class: 'rqc-title rqg-head' }, h('span', {}, 'Signatures'),
      h('span', { class: 'rqg-head-r' }, canSend ? sendBtn : sg.signed ? h('button', { class: 'rqg-act', type: 'button', onclick: () => openRef(sg.signed) }, 'Open signed copy') : null));
    const ends = sg.sent && !sg.signed ? new Date(new Date(sg.sent).getTime() + SIGN_EXPIRES_DAYS * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    const warnIc = '<svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 1.8 15 14H1z" fill="#C26A12"/><path d="M8 6v3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".9" fill="#fff"/></svg>';
    return [
      apHead, apCard, live.length ? addApprover : null,
      sgHead,
      h('section', { class: 'rqc rqg-card rqg-tbl' }, ...sg.signers.map(sgRow), ...sg.cc.map(n => trow({ k: 'not', role: 'Copy', who: n, status: 'Gets a copy',
        items: [{ label: 'Remove', danger: true, run: () => { sg.cc = sg.cc.filter(m => m !== n); save(); paintBody(); } }] }))),
      ends ? h('div', { class: 'rqg-warn' }, h('span', { class: 'rqg-warn-ic', html: warnIc }),
        expired ? `Expired on ${ends}. Send it again to collect the signatures.` : `Expires on ${ends}. After that, it has to be sent for signature again.`) : null,
    ].filter(Boolean);
  };

  const team = () => {
    const list = teamOf();
    const addBtn = h('button', { class: 'rqp-addsh', type: 'button', 'aria-haspopup': 'listbox' },
      h('span', { class: 'rqp-addsh-ic', html: ICON('<path d="M12 6v12M6 12h12"/>', 14) }), h('span', {}, 'Add a stakeholder'));
    addBtn.onclick = (e) => {
      e.stopPropagation();
      const have = new Set(list.map(p => p.name));
      const pool = [...MX_LEGAL, ...MX_STAFF].filter(p => !have.has(p.name));
      mxPersonPicker(addBtn, pool, (p) => {
        mxPeople(r).push({ name: p.name, role: p.role, side: MX_LEGAL.some(x => x.name === p.name) ? 'legal' : 'business', email: mxEmail(p.name) });
        add({ ev: 'assign', what: `added ${p.name} to the deal team` }); paintBody();
      });
    };
    return [
      h('div', { class: 'rqp-people rqp-people--flat' }, ...list.map(p => h('div', { class: 'rqp-pc' }, mxFace(p.name, 'pb-av rqp-pc-av'),
        h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-pc-n' }, p.name), h('span', { class: 'rqp-pc-r' }, p.title)),
        /* everything you do with a person, behind their dots */
        (() => {
          const b = h('button', { class: 'br-dots rqp-pc-dots', type: 'button', 'aria-label': `More for ${p.name}`, 'data-tip': 'More', html: PB_SVG.dots });
          b.onclick = (e) => { e.stopPropagation(); mxGlyphs(); menu(b, [
            { label: 'Remove', icon: 'trash', danger: true, run: () => {
              r.people = mxPeople(r).filter(x => x.name !== p.name);
              const wasAtty = p.name === r.attorney; if (wasAtty) r.attorney = null;
              r.updated = mxNow(); save();
              add({ ev: 'assign', what: wasAtty ? `removed ${p.name} as assignee` : `removed ${p.name} from the deal team` });
              pbToast(`${p.name} removed`);
              if (wasAtty) { MX.intake.tab = 'team'; mxOpen('intake', r.id); go('intake'); } else paintBody(); } },
          ]); };
          return b;
        })()))),
      addBtn,
    ];
  };

  /* Documents: a plain list, the one open on the right quietly marked; the
     versions live in the document's own header */
  /* everything else you do to one document, behind its dots */
  const docDots = (d) => {
    const b = h('button', { class: 'br-dots rqp-dc-dots', type: 'button', 'aria-label': `More for ${d.title}`, 'data-tip': 'More', html: PB_SVG.dots });
    b.onclick = (e) => {
      e.stopPropagation(); mxGlyphs();
      const name = d.title.replace(/\.(docx?|pdf|txt|md)$/i, '');
      menu(b, [
        { label: 'Open in Word', html: '<img src="assets/brand/word.svg" alt="" width="16" height="16">', run: () => { openRef({ doc: d.id }); giveFile(); } },
        { label: 'Download', icon: 'download', run: () => { openRef({ doc: d.id }); giveFile(); pbToast('Downloading'); } },
        { label: 'Upload a New Version', icon: 'retry', run: () => { openRef({ doc: d.id }); upload(false); } },
        { label: 'Compare', icon: 'compare', run: () => { openRef({ doc: d.id }); compareDialog(); } },
        { label: 'Rename', icon: 'rename', run: () => renameVersion(d, d === docs[di] ? vi : d.versions.length - 1) },
        { rule: true },
        { label: 'Delete Document', icon: 'trash', danger: true, run: () => pbConfirm({ title: `Delete ${name}?`, lead: `Every version of it goes from ${r.id}. The rest of the request stays.`,
          action: 'Delete', run: () => {
            const k = docs.indexOf(d); docs.splice(k, 1); r.documents = (r.documents || []).filter(x => x.id !== d.id);
            (r.removedDocs ||= []).push(d.id); save();
            add({ ev: 'version', what: `deleted ${name}` }); pbToast(`${name} deleted`);
            mxOpen('intake', r.id); MX.intake.tab = 'docs'; go('intake'); } }) },
      ]);
    };
    return b;
  };
  /* A round, opened: the other side's changes to one document, one point
     each, with what the playbook says and Clavia's suggested answer. The
     document sits on the right at their version; a point takes you to its
     clause. Once every point has an answer, Clavia writes our response as
     the next version, with our wording back as tracked changes. */
  const PB_SAY = { within: 'Within playbook', fallback: 'Fallback', outside: 'Outside playbook' };
  const DEC_SAY = { accept: 'Accepted', keep: 'Kept ours', counter: 'Countered', signoff: 'Sign-off' };
  const review = (docId) => {
    const d = docs.find(x => x.id === docId), rd = mxRoundOf(r, docId), side = (r.counterparty || 'Them').split(/\s+/)[0];
    const theirs = d.versions[rd.v - 1];
    const decided = (p) => p.decision && p.decision.d !== 'signoff' && (p.decision.d !== 'counter' || (p.decision.text || '').trim());
    const open = rd.points.filter(p => !decided(p)).length;
    const show = (p) => {
      openRef({ doc: d.id, v: rd.v });
      requestAnimationFrame(() => {
        const key = p.clause.toLowerCase().replace(/^\d+\.\s*/, '');
        const el = [...page.querySelectorAll('h2, .doc-h2')].find(e => e.textContent.trim().toLowerCase().replace(/^[\d\s.]+/, '').startsWith(key));
        if (!el) return;
        scroll.scrollTo({ top: scroll.scrollTop + el.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 28, behavior: 'smooth' });
        el.classList.remove('rqp-flash'); void el.offsetWidth; el.classList.add('rqp-flash');
      });
    };
    const choose = (p, k) => {
      if (rd.answered) return;
      p.decision = k === 'counter' ? { d: 'counter', text: p.decision?.d === 'counter' ? p.decision.text : (p.suggest?.d === 'counter' ? p.suggest.text : '') } : { d: k };
      save(); MX.intake.point = p.clause; paintBody();
      if (k === 'counter') requestAnimationFrame(() => body.querySelector('.rqr-cl.is-focus .rqr-counter')?.focus());
    };
    const respondBtn = h('button', { class: 'rqg-act', type: 'button', disabled: !!open, 'data-tip': open ? `Answer the ${mxPlural(open, 'open point', 'open points')} first` : null }, 'Create our response');
    respondBtn.onclick = () => {
      respondBtn.disabled = true; respondBtn.replaceChildren(h('span', { class: 'rqp-dc-ring rqg-ring', 'aria-label': 'Writing' }), 'Writing');
      setTimeout(() => {
        /* their version as they sent it, every change of theirs taken in; then our answers put back as tracked changes */
        let blocks = (theirs.blocks || []).map(b => ({ t: b.t, v: String(b.v).replace(/<del>[\s\S]*?<\/del>/g, '').replace(/<\/?ins>/g, '') }));
        for (const p of rd.points) {
          const k = p.decision?.d; if ((k !== 'keep' && k !== 'counter') || p.find == null) continue;
          const repl = k === 'keep' ? p.ours : p.decision.text;
          blocks = blocks.map(b => b.v.includes(p.find) ? { ...b, v: b.v.replace(p.find, `<del>${p.find}</del>${repl ? `<ins>${repl}</ins>` : ''}`) } : b);
        }
        const n = (k) => rd.points.filter(p => p.decision?.d === k).length;
        const said = [n('accept') && `${n('accept')} accepted`, n('keep') && `${n('keep')} kept ours`, n('counter') && `${n('counter')} countered`].filter(Boolean).join(', ');
        const v = { name: 'Our response', by: USER.name, when: mxNow(), file: `${titleOf(d)} v${d.versions.length + 1}.docx`, blocks, note: `Our answers to ${side}’s v${rd.v}: ${said}` };
        mxAddVersion(r, v, d.id); rd.answered = d.versions.length;
        add({ ev: 'version', what: `created v${d.versions.length} of the ${docTag(d.id)}, answering ${side}’s changes: ${said}`, ref: { doc: d.id, v: d.versions.length } });
        save(); openRef({ doc: d.id, v: d.versions.length }); paintBody();
        pbToast(`Our response is v${d.versions.length}`);
      }, 1600);
    };
    const back = h('button', { class: 'rqr-back', type: 'button', onclick: () => { reviewing = null; paintBody(); } },
      h('span', { html: ICON('<path d="M19 12H5M11 6l-6 6 6 6"/>', 14) }), 'Documents');
    const head = h('div', { class: 'rqr-head' },
      h('h3', { class: 'rqr-t' }, `${side}’s changes to the ${docTag(d.id)}`, h('span', { class: 'rqr-v' }, `v${rd.v} · ${new Date(theirs.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)),
      rd.answered ? h('button', { class: 'rqg-act', type: 'button', onclick: () => openRef({ doc: d.id, v: rd.answered }) }, `Open our response, v${rd.answered}`) : respondBtn);
    /* a point is a clause, the way the playbook shows one: its number and name, then a stack of
       cards — their change, where the playbook stands, and our answer */
    const PB_CARD = { within: ['preferred', 'Within playbook'], fallback: ['fallback', 'Fallback'], outside: ['walkaway', 'Not acceptable'] };
    const REDLINE_MARK = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.8" fill="#EFEDE9"/><path d="M4.8 6.6h6.4" stroke="#C0574B" stroke-width="1.4" stroke-linecap="round"/><path d="M4.8 9.6h6.4" stroke="#2F7A4C" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const ANSWER_MARK = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.8" fill="#E9EDEA"/><path d="m5.2 8.3 1.9 1.9 3.8-4" fill="none" stroke="#1D3A2B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const folded = (MX.intake.ptFold ||= new Set());
    const pt = (p, i) => {
      const k = p.decision?.d, key = `${docId}:${rd.v}:${i}`;
      const no = (/^(\d+)\./.exec(p.clause) || [])[1] || String(i + 1), name = p.clause.replace(/^\d+\.\s*/, '');
      const el = h('section', { class: 'pbv-cl rqr-cl' + (folded.has(key) ? ' is-folded' : '') + (MX.intake.point === p.clause ? ' is-focus' : '') });
      const more = h('button', { class: 'pbv-icon rqr-more', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'More', html: PB_SVG.dots });
      more.onclick = (e) => { e.stopPropagation(); menu(more, [
        { label: 'Show in the document', run: () => show(p) },
        ...(!rd.answered && k !== 'signoff' ? [{ label: 'Ask for sign-off', run: () => mxPersonPicker(more, [...MX_LEGAL, ...MX_STAFF], (who) => {
          const was = p.decision, wasS = p.signoff; p.decision = { d: 'signoff' }; p.signoff = who.name; save(); paintBody();
          add({ what: `asked ${who.name} to decide ${name.toLowerCase()} in the ${docTag(d.id)}` });
          pbToast(`${who.name} will decide`, { label: 'Undo', run: () => { p.decision = was; p.signoff = wasS; save(); paintBody(); } }); }) }] : []),
        { label: p.comment ? 'Edit the comment for them' : 'Add a comment for them', run: () => noteDlg(`Comment for ${side}`, 'e.g. We can do 48 hours, which matches the MSA', 'Save', (t) => { p.comment = t; save(); paintBody(); }, 'Comment', p.comment || '') },
      ]); };
      const fold = h('button', { class: 'pbv-icon pbv-cl-fold', type: 'button', html: PB_SVG.chev, 'aria-expanded': String(!folded.has(key)),
        'data-tip': folded.has(key) ? 'Expand' : 'Collapse', onclick: (e) => { e.stopPropagation(); if (!folded.delete(key)) folded.add(key); el.classList.toggle('is-folded'); } });
      /* where it stands, said at the end of the heading so a folded list still reads */
      const state = rd.answered ? (DEC_SAY[k] || 'No answer') : k === 'signoff' ? `With ${p.signoff === USER.name ? 'you' : p.signoff.split(' ')[0]}` : decided(p) ? DEC_SAY[k] : 'To answer';
      const head = h('div', { class: 'pbv-cl-head', onclick: () => { MX.intake.point = p.clause; show(p); } },
        h('span', { class: 'pbv-cl-n' }, no),
        h('h3', { class: 'pbv-cl-t' }, name),
        h('span', { class: 'rqr-state' + (!rd.answered && !decided(p) ? ' is-open' : '') }, state),
        more, fold);
      const card = (markHtml, label, ...body) => h('div', { class: 'pbv-pos rqr-pos' },
        h('div', { class: 'pbv-pos-head' }, h('span', { class: 'pbv-mark', html: markHtml }), h('span', { class: 'pbv-pos-l' }, label)), ...body);
      const theirsCard = card(REDLINE_MARK, `${side}’s change`, h('p', { class: 'pbv-pos-t rqr-red', html: p.html }),
        p.flag ? h('p', { class: 'rqr-flag' }, p.flag) : null);
      const pbCard = p.playbook ? card(PBV_MARK[PB_CARD[p.playbook][0]], PB_CARD[p.playbook][1], h('p', { class: 'pbv-pos-t' }, p.why || 'Matches the playbook')) : null;
      /* our answer: three choices in the card's heading, the wording under them */
      const opts = rd.answered || (k === 'signoff' && p.signoff !== USER.name) ? null
        : h('span', { class: 'rqr-dec', role: 'radiogroup' }, ...[['accept', 'Accept'], ['keep', 'Keep ours'], ['counter', 'Counter']].map(([key2, label]) =>
            h('button', { class: 'rqr-opt' + (k === key2 ? ' is-on' : '') + (!k && p.suggest?.d === key2 ? ' is-sugg' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === key2),
              'data-tip': p.suggest?.d === key2 ? 'Clavia suggests this' : null, onclick: (e) => { e.stopPropagation(); choose(p, key2); } }, label)));
      const say = k === 'accept' ? 'Take their wording.' : k === 'keep' ? 'Put our wording back.' : k === 'signoff' ? `Waiting on ${p.signoff === USER.name ? 'you' : p.signoff} to decide.`
        : k === 'counter' ? null : p.suggest ? `Clavia suggests: ${p.suggest.d === 'counter' ? `counter with ${p.suggest.text}` : p.suggest.d === 'keep' ? 'keep ours' : p.suggest.d === 'signoff' ? 'ask for sign-off' : 'accept'}.` : 'Not answered yet.';
      const counter = k === 'counter' ? (rd.answered ? h('p', { class: 'pbv-pos-t' }, p.decision.text)
        : h('textarea', { class: 'pbv-pos-t rqr-counter', rows: '1', placeholder: 'Our wording', value: p.decision.text || '',
            onclick: (e) => e.stopPropagation(), oninput: (e) => { p.decision.text = e.target.value; e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; save(); respondBtn.disabled = rd.points.some(x => !decided(x)); } })) : null;
      if (counter?.tagName === 'TEXTAREA') counter.value = p.decision.text || '';
      const answer = h('div', { class: 'pbv-pos rqr-pos rqr-answer' + (!rd.answered && !decided(p) ? ' is-open' : '') },
        h('div', { class: 'pbv-pos-head' }, h('span', { class: 'pbv-mark', html: ANSWER_MARK }), h('span', { class: 'pbv-pos-l' }, 'Our answer'), h('span', { class: 'pb-grow' }), opts),
        say ? h('p', { class: 'pbv-pos-t rqr-say' }, say) : null, counter,
        p.comment ? h('p', { class: 'rqr-cmt' }, `For ${side}: ${p.comment}`) : null);
      el.append(head, h('div', { class: 'pbv-cl-body' }, h('div', { class: 'pbv-cl-in' }, h('div', { class: 'pbv-cards' }, theirsCard, pbCard, answer))));
      return el;
    };
    return [back, head, rd.points.length ? h('section', { class: 'rqr-list rqr-cls' }, ...rd.points.map(pt))
      : h('p', { class: 'rqp-empty' }, `No changes between v${rd.base} and v${rd.v}.`)];
  };
  /* a round opens as the playbook review of their version, in place of the request page */
  const openReview = (id) => { MX.intake.round = id; go('intake'); };
  /* one document row, the same wherever documents are listed: version menu, open comments, ⋯ */
  const docRow = (d, i) => {
      const on = i === di, shown = on ? vi : d.versions.length - 1;
      /* the version, said quietly at the end of the row; a click on it lists the others */
      const ver = h('button', { class: 'rqp-dc-ver', type: 'button', 'aria-haspopup': 'menu', 'aria-label': `Versions of ${d.title}` },
        `v${shown + 1}`, h('span', { class: 'rqp-dc-chev', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) }));
      /* the same list as the version button in the document's header */
      ver.onclick = (e) => {
        e.stopPropagation();
        const side = (r.counterparty || 'their').split(/\s+/)[0];
        const canReview = !d.versions[shown].cmp && shown > 0 && !(mxRounds(r).docs[d.id] || []).some(x => x.v === shown + 1);
        listFrom(ver, [
          ...d.versions.map((v, k) => k).reverse().map(k => [k === shown, h('span', { class: 'rqp-ver-v' }, `v${k + 1}`), d.versions[k].name + (k === d.versions.length - 1 ? ' · Latest' : ''),
            (() => { const n = (r.activity || []).filter(a => (a.kind === 'note' || a.kind === 'reply') && a.ref?.doc === d.id && a.ref?.v === k + 1).length; return `${pbWhen(d.versions[k].when)} · ${d.versions[k].by}${n ? ` · ${mxPlural(n, 'comment')}` : ''}`; })(),
            () => { openRef({ doc: d.id, v: k + 1 }); paintBody(); }]),
          h('div', { class: 'rqp-vers-rule' }),
          [false, h('span', { class: 'rqp-ver-add', html: ICON('<path d="M12 6v12M6 12h12"/>', 13) }), 'Upload a New Version', '', () => { openRef({ doc: d.id }); upload(false); }],
          [false, h('span', { class: 'rqp-ver-add', html: ICON('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>', 13) }), 'Compare', '', () => { openRef({ doc: d.id }); compareDialog(); }],
          /* by hand: read a version as the other side's markup of the one before it */
          ...(canReview ? [[false, h('span', { class: 'rqp-ver-add', html: ICON('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>', 13) }),
            `Review v${shown + 1} as ${side}’s Changes`, '', () => {
              const n = mxRoundFromCompare(r, d, shown + 1, shown);
              mxLog(r, { who: 'Clavia', ev: 'clavia', what: `compared v${shown + 1} of the ${docTag(d.id)} with v${shown}: ${mxPlural(n, 'change', 'changes')}`, ref: { doc: d.id, v: shown + 1 } });
              openReview(d.id); }]] : []),
        ]);
      };
      return h('div', { class: 'rqp-dc' + (on ? ' is-on' : ''), role: 'button', tabindex: '0', 'data-doc': d.id, 'data-drop': `Drop to upload v${d.versions.length + 1}`,
        onclick: () => { openRef({ doc: d.id }); paintBody(); },
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRef({ doc: d.id }); paintBody(); } } },
        mxTile('file', mxExt(d.title)),
        h('span', { class: 'rqp-person-t', 'data-tip': titleOf(d) }, h('span', { class: 'rqp-pc-n' }, shortOf(d)),
          h('span', { class: 'rqp-pc-r' }, ((w) => /,/.test(w) ? w : `${w}, ${new Date(d.versions[shown].when).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)(pbWhen(d.versions[shown].when)))),
        /* its open comments: a click opens the document with them beside it */
        ((cs) => cs.length ? h('button', { class: 'rqp-dc-cmt is-ic', type: 'button', 'data-tip': `${mxPlural(cs.length, 'open comment')}`,
          onclick: (e) => { e.stopPropagation(); openCmts(d.id); } },
          h('span', { class: 'rqp-dc-cmt-ic', html: MX_TAB_ICONS.comments }), String(cs.length)) : null)(mxWComments(r).filter(c => c.doc === d.id && c.status !== 'closed')),
        /* the negotiation word ("With Brightwell", "3 to answer"), off 15 Oct: rows show only the comment count */
        ((rs) => DOC_ROUND_CHIP && rs ? h('button', { class: 'rqp-dc-round is-' + rs.k, type: 'button', 'data-tip': 'Open the round',
          onclick: (e) => { e.stopPropagation(); openReview(d.id); } }, rs.say) : null)(mxRoundSay(r, d)),
        ver, docDots(d));
  };
  const documents = () => reviewing && docs.some(x => x.id === reviewing) && mxRoundOf(r, reviewing) ? review(reviewing) : [
    docs.length ? h('div', { class: 'rqp-docs rqp-docs--flat' }, pendingCmp ? h('div', { class: 'rqp-dc is-pending', 'aria-busy': 'true' }, mxTile('file', 'docx'),
        h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-pc-n' }, pendingCmp.name)),
        h('span', { class: 'rqp-dc-ring', 'aria-label': 'Comparing' })) : null, ...docs.map(docRow)) : h('p', { class: 'rqp-empty' }, 'No documents yet.'),
    h('button', { class: 'rqp-addsh rqp-addsh--drop', type: 'button', onclick: () => upload(true) },
      h('span', { class: 'rqp-addsh-ic', html: ICON('<path d="M12 6v12M6 12h12"/>', 14) }), h('span', {}, 'Upload a document')),
  ];

  /* Activity: the request's history, day by day, on one thin line. Things
     that happened are a line each with a small mark; things people said
     are cards. A comment about a document says which one and which
     version, and clicking that opens it on the right. */
  const evOf = (a) => a.kind === 'reply' || a.kind === 'note' ? a.kind : a.ev
    || (/submitted/.test(a.what) ? 'submit' : /assigned|took this on|assignee/.test(a.what) ? 'assign' : /moved this to/.test(a.what) ? 'status'
      : /emailed/.test(a.what) ? 'email' : /uploaded|drafted|draft/.test(a.what) ? 'version' : /Clavia/.test(a.what) ? 'clavia' : 'event');
  const EV_IC = {
    submit: '<path d="M4.5 6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5V9a2.5 2.5 0 0 0 0 5v2.5A1.5 1.5 0 0 1 18 18H6a1.5 1.5 0 0 1-1.5-1.5V14a2.5 2.5 0 0 0 0-5z"/>',
    assign: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
    status: '<circle cx="12" cy="12" r="7"/><path d="M12 5v7l4 2"/>',
    email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    version: '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5"/>',
    event: '<circle cx="12" cy="12" r="2.2"/>',
  };
  const refChip = (ref) => {
    const d = ref && docs.find(x => x.id === ref.doc);
    if (!d) return '';
    return h('button', { class: 'rqp-ref', type: 'button', 'data-tip': 'Open on the right', onclick: () => openRef(ref) },
      h('span', { class: 'rqp-ref-v' }, `v${ref.v}`), h('span', { class: 'rqp-ref-t' }, d.title.replace(/\.docx?$/i, '')));
  };
  const short = (x, n = 90) => x.length > n ? x.slice(0, n - 2) + '…' : x;
  const dayOf = (iso) => { const d = new Date(iso), t = new Date(); const k = (x) => x.toDateString();
    const y = new Date(t); y.setDate(t.getDate() - 1);
    return k(d) === k(t) ? 'Today' : k(d) === k(y) ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  /* One shape for everything that happened: a face, who and what, when.
     What someone wrote follows underneath in the same type. A note is
     marked "internal", a version is a small chip; nothing else changes. */
  /* One shape for everything, with a little of what it was: a face with a
     mark for the kind of thing done, a stage drawn as a stage, several
     people added drawn as their faces, and what someone said in a bubble. */
  const entry = (a, fresh, cont, last) => {
    const ev = a.ev === 'team' ? 'team' : evOf(a), said = ev === 'reply' || ev === 'note';
    const name = ev === 'clavia' ? 'Clavia' : a.who === USER.name ? 'You' : a.who;
    const fromThem = said && a.who !== USER.name && a.who !== 'Clavia' && !MX_LEGAL.some(p => p.name === a.who);
    const mv = ev === 'status' && /^moved this to (.+)$/.exec(a.what || '');
    let what = ev === 'reply' ? (fromThem ? 'replied' : `wrote to ${a.to || first}`) : ev === 'note' ? 'commented' : a.what;
    const extra = [];
    if (mv) {
      const st = mxStages(r), i = st.indexOf(mv[1]);
      what = 'moved this to';
      extra.push(h('span', { class: 'rqx-stage' }, i >= 0 ? h('span', { class: 'rqx-stage-ic', html: mxStageRingAt(i, st.length) }) : null, mv[1]));
    }
    if (ev === 'team') {
      what = `${a.verb} ${a.names.length === 1 ? a.names[0] : mxPlural(a.names.length, 'person', 'people')} ${a.verb === 'added' ? 'to' : 'from'} the deal team`;
      if (a.names.length > 1) extra.push(h('span', { class: 'rqx-faces', title: a.names.join(', ') }, ...a.names.slice(0, 5).map(n => mxFace(n, 'rqx-fc'))));
    }
    const face = ev === 'clavia' || a.who === 'Clavia' ? h('span', { class: 'rqx-av rqx-av--clavia' }, quillEl('static', { cls: 'rqx-q' })) : mxFace(a.who, 'rqx-av');
    const mark = !said && ev !== 'clavia' ? (ev === 'team' ? EV_IC.assign : EV_IC[ev] || EV_IC.event) : null;
    return h('div', { class: 'rqx' + (fresh ? ' is-new' : '') + (cont ? ' is-cont' : '') + (last ? ' is-last' : '') + (said ? ' is-said' : '') + ' is-' + ev },
      h('span', { class: 'rqx-face' }, cont ? h('span', { class: 'rqx-pip' }) : face,
        null),
      h('div', { class: 'rqx-b' },
        h('div', { class: 'rqx-h' },
          h('span', { class: 'rqx-who' }, name), ' ', h('span', { class: 'rqx-what' }, what),
          a.via ? h('img', { class: 'rqx-via', src: brandSrc(a.via), alt: '' }) : null,
          ...extra,
          a.ref ? refChip(a.ref) : '',
          a.links ? h('span', { class: 'rqx-links' }, ...a.links.flatMap((id, i) => { const x = mxIntake().find(q => q.id === id);
            return [i ? h('span', { class: 'rqx-links-sep' }, '·') : '', id === r.id ? h('span', { class: 'rqx-link is-here' }, `${id} (this one)`)
              : h('button', { class: 'rqx-link', type: 'button', 'data-tip': x?.title || 'Open request', onclick: () => { MX.intake.tab = 'activity'; mxOpen('intake', id); } }, id)]; })) : null,
          h('span', { class: 'rqx-time' }, timeOf(a.when))),
        said ? h('div', { class: 'rqx-t' + (ev === 'note' ? ' is-note' : fromThem ? ' is-them' : '') }, ...mxAtNames(a.what)) : null,
        a.files?.length ? h('div', { class: 'rqx-files' }, ...a.files.map(f => h('span', { class: 'rqx-file' }, mxTile('file', mxExt(f.name)),
          h('span', { class: 'rqx-file-n' }, f.name.replace(/\.(docx?|pdf|txt|md)$/i, '')), f.ref ? h('span', { class: 'rqx-file-v' }, `v${f.ref.v}`) : null))) : null,
        a.msg ? h('div', { class: 'rqx-t is-them rqx-msg' }, a.msg.subject ? h('div', { class: 'rqx-msg-s' }, a.msg.subject) : null, a.msg.body) : null,
        a.first ? ((rd) => rd ? h('div', { class: 'rqx-fp' },
          h('span', { class: 'rqx-fp-t' }, rd.answered ? `Answered in v${rd.answered}` : `${mxPlural(rd.points.length, 'change')} to decide, each against the playbook`),
          rd.answered ? h('button', { class: 'rqx-link', type: 'button', onclick: () => openReview(a.first.doc) }, 'Open review')
            : h('button', { class: 'pb-btn rqx-fp-go', type: 'button', onclick: () => openReview(a.first.doc) }, 'Review First Pass')) : null)(mxRoundOf(r, a.first.doc)) : null,
        a.portal && INTAKE_FX.portal ? h('button', { class: 'rqx-rule', type: 'button', 'data-tip': `See what ${first} sees`,
          onclick: () => { MX.intake.open = r.id + '/requester'; go('intake'); } }, `The link opens ${first}’s view of this request ↗`) : null,
        a.rule ? h('button', { class: 'rqx-rule', type: 'button', 'data-tip': 'Open routing rules', onclick: () => mxOpen('intake', 'rules') }, a.rule) : null));
  };
  /* several people added (or taken off) in one go read as one line, with their faces */
  const gather = (list) => {
    const out = [];
    for (const a of list) {
      const m = /^(added|removed) (.+?) (?:to|from) the deal team$/.exec(a.what || '');
      const p = out[out.length - 1];
      if (m && p?.ev === 'team' && p.who === a.who && p.verb === m[1] && dayOf(p.when) === dayOf(a.when)) { p.names.push(m[2]); continue; }
      out.push(m ? { who: a.who, ev: 'team', verb: m[1], names: [m[2]], when: a.when, src: a } : a);
    }
    return out;
  };
  const log = h('div', { class: 'rqa' });
  /* newest first, so what just happened is the first thing you read */
  const paintLog = (freshest) => {
    const out = []; let day = null;
    let prev = null;
    const list = gather([...(r.activity || [])].reverse());
    list.forEach((a, n) => {
      const d = dayOf(a.when);
      if (d !== day) { day = d; prev = null; out.push(h('div', { class: 'rqa-day' }, d)); }
      /* the same person doing several things in a row is said once */
      const quiet = (x) => { const e = x.ev === 'team' ? 'team' : evOf(x); return e !== 'reply' && e !== 'note' && e !== 'clavia'; };
      const cont = prev && prev.who === a.who && quiet(prev) && quiet(a);
      const last = !list[n + 1] || dayOf(list[n + 1].when) !== d;
      out.push(entry(a, freshest && (a.src || a) === r.activity[r.activity.length - 1], cont, last));
      prev = a;
    });
    log.replaceChildren(...out);
  };
  const add = (a) => {
    mxLog(r, a);
    if (tab === 'activity') paintLog(true);
    const n = tabBtns.find(b => b.dataset.k === 'activity')?.querySelector('.rqp-tab-n'); if (n) n.textContent = String(r.activity.length);
  };
  /* the box: a reply goes to the submitter, a note stays in legal; either can be about the document open on the right */
  let mode = mine ? 'note' : 'reply';
  let about = true;      // the comment is about the document version on the right, until you say it is not
  const box = h('textarea', { class: 'mx-reply-in', rows: '1', 'aria-label': 'Add a comment' });
  const send = h('button', { class: 'mx-rq-send', type: 'button', disabled: true, 'aria-label': 'Send', html: ICON('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 13) });
  const seg = h('div', { class: 'mx-seg mx-seg--sm', role: 'radiogroup', 'aria-label': 'Who sees it' },
    h('span', { class: 'mx-seg-thumb', 'aria-hidden': 'true' }),
    ...[['reply', `Reply to ${first}`], ['note', 'Internal note']].map(([k, label]) =>
      h('button', { class: 'mx-seg-b', type: 'button', role: 'radio', 'data-k': k, onclick: () => { mode = k; paintMode(); box.focus(); } }, label)));
  const ctx = h('div', { class: 'rqa-ctx' });
  const curRef = () => docs.length ? { doc: docs[di].id, v: vi + 1 } : null;
  paintCtx = () => {
    const ref = curRef();
    ctx.hidden = !ref;
    if (!ref) return;
    const d = docs[di];
    ctx.replaceChildren(about
      ? h('span', { class: 'rqa-ctx-on' }, h('span', { class: 'rqa-ctx-l' }, 'About'), h('span', { class: 'rqp-ref-v' }, `v${ref.v}`), h('span', { class: 'rqa-ctx-t' }, d.title.replace(/\.docx?$/i, '')),
          h('button', { class: 'rqa-ctx-x', type: 'button', 'aria-label': 'Make it a general comment', 'data-tip': 'General comment', html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 11), onclick: () => { about = false; paintCtx(); box.focus(); } }))
      : h('button', { class: 'rqa-ctx-add', type: 'button', onclick: () => { about = true; paintCtx(); box.focus(); } }, `+ About v${ref.v} of ${d.title.replace(/\.docx?$/i, '')}`));
  };
  /* one line to add a comment: + attaches (a file, or one of this request's documents), @ tags someone */
  let att = [];
  const chips = h('div', { class: 'rqx-c-files' });
  const paintAtt = () => { chips.replaceChildren(...att.map((f, i) => h('span', { class: 'rqx-file' }, mxTile('file', mxExt(f.name)),
    h('span', { class: 'rqx-file-n' }, f.name.replace(/\.(docx?|pdf|txt|md)$/i, '')), f.ref ? h('span', { class: 'rqx-file-v' }, `v${f.ref.v}`) : null,
    h('button', { class: 'rqx-file-x', type: 'button', 'aria-label': `Remove ${f.name}`, html: ICON('<path d="M7 7l10 10M17 7 7 17"/>', 10), onclick: () => { att.splice(i, 1); paintAtt(); } })))); chips.hidden = !att.length; send.disabled = !box.value.trim() && !att.length; };
  const fileIn = h('input', { type: 'file', multiple: true, hidden: true, onchange: (e) => { for (const f of e.target.files) att.push({ name: f.name }); e.target.value = ''; paintAtt(); box.focus(); } });
  const attachBtn = h('button', { class: 'rqx-c-b', type: 'button', 'aria-label': 'Attach', 'data-tip': 'Attach', html: ICON('<path d="M12 5v14M5 12h14"/>', 15),
    /* the version picker's own list: your computer first, then this request's documents, each with its tile and latest version */
    onclick: (e) => { e.stopPropagation(); listFrom(attachBtn, [
      [false, h('span', { class: 'rqx-up-ic', html: ICON('<path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 14v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/>', 15) }), 'Upload from your computer', 'Word, PDF or text', () => fileIn.click()],
      ...(docs.length ? ['From this request'] : []),
      ...docs.map(d => [att.some(f => f.ref?.doc === d.id), mxTile('file', mxExt(d.versions[d.versions.length - 1]?.file || d.title)), d.title.replace(/\.(docx?|pdf|txt|md)$/i, ''),
        `v${d.versions.length} · ${d.versions[d.versions.length - 1]?.name || ''}`, () => { if (!att.some(f => f.ref?.doc === d.id)) att.push({ name: d.title, ref: { doc: d.id, v: d.versions.length } }); paintAtt(); box.focus(); }])]); } });
  const people = () => [...new Map([...mxPeople(r), ...MX_LEGAL].filter(p => p.name !== USER.name).map(p => [p.name, p])).values()];
  const tag = (anchor, typed) => menu(anchor, people().map(p => ({ label: p.name, run: () => {
    const at = box.selectionStart, before = box.value.slice(0, at).replace(typed ? /@$/ : /$/, ''), after = box.value.slice(at);
    box.value = `${before}@${p.name} ${after}`; const c = before.length + p.name.length + 2; box.focus(); box.setSelectionRange(c, c); send.disabled = false; } })));
  const atBtn = h('button', { class: 'rqx-c-b', type: 'button', 'aria-label': 'Mention someone', 'data-tip': 'Mention Someone', html: ICON('<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.5 7"/>', 15),
    onclick: (e) => { e.stopPropagation(); tag(atBtn, false); } });
  box.addEventListener('input', (e) => { if (e.data === '@') tag(box, true); });
  const composer = h('div', { class: 'mx-rq-composer rqx-compose rqx-compose--rich' }, chips, h('div', { class: 'rqx-c-row' }, attachBtn, box, atBtn, send), fileIn);
  chips.hidden = true;
  const paintMode = () => { box.placeholder = 'Add a comment'; };
  const post = () => {
    const text = box.value.trim(); if (!text && !att.length) return;
    add({ kind: 'note', what: text ? text[0].toUpperCase() + text.slice(1) : 'Shared files', ...(att.length ? { files: att } : {}) });
    box.value = ''; att = []; paintAtt(); send.disabled = true;
  };
  box.addEventListener('input', () => { send.disabled = !box.value.trim() && !att.length; });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(); } });
  send.onclick = post;
  paintMode();
  const activity = () => { paintLog(); paintCtx(); return [composer, log]; };

  const paintBody = () => {
    body.replaceChildren(...[].concat(tab === 'mreqs' ? moReqTab(r, 'requests') : tab === 'mtasks' ? moReqTab(r, 'tasks') : tab === 'mdecisions' ? moReqTab(r, 'decisions') : tab === 'summary' ? summary() : tab === 'details' ? details() : tab === 'terms' ? terms() : tab === 'sign' ? approvals() : tab === 'team' ? team() : tab === 'docs' ? documents() : tab === 'comments' ? commentsTab() : tab === 'issues' ? issues() : activity(),
      r.mt && typeof moReqExtra === 'function' ? moReqExtra(r, tab) : []).filter(v => v != null && v !== false));
    body.dataset.tab = tab;
    dock.hidden = tab === 'activity' || tab === 'comments';
  };
  if (reading) setTimeout(() => { reading = false; r.triaged = true; save(); if (body.isConnected && tab === 'summary') { paintBody(); body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); } }, 1500);

  /* ask about it, from wherever you are on the page */
  const ask = h('input', { class: 'mt-ask-in', type: 'text', placeholder: `Ask about ${r.id}`, 'aria-label': `Ask about ${r.id}`,
    onkeydown: (e) => { if (e.key === 'Enter' && ask.value.trim()) { e.preventDefault(); askAbout(ask.value.trim()); ask.value = ''; } } });
  const askAbout = (q) => {
    const s = mxSummary(r);
    mxLog(r, { what: 'asked Clavia about this' });
    openSession({ id: 'rq-ask-' + r.id + '-' + Date.now(), label: r.title, meta: 'now', people: [{ name: USER.name, online: true, owner: true }],
      messages: [{ role: 'user', text: q },
        { role: 'bot', cites: null, steps: [{ source: 'request', query: 'Read ' + r.id, count: docs.length ? mxPlural(docs.length, 'document') : 'no document' }],
          answer: r.mt && typeof moAskAnswer === 'function' ? moAskAnswer(r, q) : s.para,
          suggest: [s.fp.action.label, `Draft a reply to ${first}`] }] });
  };
  /* a message to the requester goes out where they asked: Outlook or Teams, never a Clavia inbox they would have to visit */
  if (MX.intake.contact) { MX.intake.contact = false; setTimeout(() => messageRequester(), 350); }
  const messageRequester = () => {
    const ch = mxChannel(r);
    noteDlg(`Message ${first}`, `Ask ${first} what you need to move this on`, 'Send', (text) => {
      text = text[0].toUpperCase() + text.slice(1);
      const asked = /\?/.test(text);
      if (asked) r.waitingOn = 'requester';
      if (tab !== 'activity') setTab('activity');
      add({ kind: 'reply', to: first, via: ch.key, what: text }); paintWait();
      pbToast(`Sent to ${first} in ${ch.name}`);
      const answer = asked && MX_REQ_ANSWERS[r.id];
      if (answer) setTimeout(() => {
        r.waitingOn = 'legal';
        const a = { who: r.submitter, kind: 'reply', via: ch.key, what: answer };
        if (left.isConnected) { add(a); paintWait(); } else mxLog(r, a);
        pbToast(`${first} replied in ${ch.name}`);
      }, 5200);
    }, `Goes to ${first} in ${ch.name}`);
  };
  const dock = h('div', { class: 'rqp-dock' }, h('div', { class: 'mt-ask rqp-ask-bar' }, h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), ask));

  const more = h('button', { class: 'br-dots', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions', html: PB_SVG.dots,
    onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(more, [
      ...(INTAKE_FX.channel && r.submitter !== USER.name ? [{ label: `Message ${first}`, icon: 'ask', run: () => messageRequester() }] : []),
      typeof moFromRequest === 'function' && !r.mt && !r.inMt && !mxClosed(r) ? { label: 'Turn into a Matter', icon: 'open', run: () => moFromRequest(r) } : null,
      /* a request can sit inside a matter, with the others on the same work (matters.js) */
      typeof moAddPick === 'function' && !r.mt && !r.inMt && !mxClosed(r) && mxIntake().some(q => q.mt && !mxClosed(q)) ? { label: 'Add to a Matter', icon: 'open', run: () => moAddPick(r) } : null,
      r.inMt && typeof moRemoveFrom === 'function' ? { label: 'Remove from Matter', icon: 'open', run: () => moRemoveFrom(r) } : null,
      /* a matter is handed over with a brief, and closed with how it ended and what we learned (matters.js) */
      r.mt && !mxClosed(r) ? { label: 'Hand Over', icon: 'share', run: () => moHandOver(moAsMatter(r)) } : null,
      r.mt && !mxClosed(r) ? { label: 'Close Matter', icon: 'use', run: () => moClose(moAsMatter(r)) } : null,
      r.mt && mxClosed(r) ? { label: 'Reopen Matter', icon: 'use', run: () => moReopen(moAsMatter(r)) } : null,
      !mxClosed(r) && !r.mt ? { label: 'Mark as Completed', icon: 'use', run: () => { r.status = 'done'; r.updated = mxNow(); save(); add({ ev: 'status', what: 'moved this to Completed' }); mxClose('intake'); go('intake'); pbToast(`${r.id} is completed`); } } : null,
      ...(INTAKE_FX.portal ? [{ label: 'Open Requester View', icon: 'open', run: () => { MX.intake.open = r.id + '/requester'; go('intake'); } }] : []),
      { label: 'Share', icon: 'share', run: () => { navigator.clipboard?.writeText(location.href).catch(() => {}); pbToast('Link copied. Anyone in legal can open it.'); } },
      { label: 'Copy Link', icon: 'copy', run: () => { navigator.clipboard?.writeText(location.href).catch(() => {}); pbToast('Link copied'); } },
      { rule: true },
      { label: 'Delete Request', icon: 'trash', danger: true, run: () => pbConfirm({ title: `Delete ${r.id}?`, lead: `“${r.title}”, its documents and its history are deleted. ${first} is not told.`,
        action: 'Delete', run: () => { const l = mxIntake(); l.splice(l.indexOf(r), 1); save(); mxClose('intake'); go('intake'); pbToast(`${r.id} deleted`); } }) },
    ]); } });

  const docOpen = h('button', { class: 'br-pane rqp-doc-open', type: 'button', 'data-tip': 'Show document', 'aria-label': 'Show document' },
    h('span', { class: 'br-pane-ic', html: ICON('<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5"/><path d="M8.5 13h7M8.5 16.5h4.5"/>', 16) }));
  const left = h('div', { class: 'rqp-left' }, h('div', { class: 'br-panes rqp-panes' }, docOpen),
    h('div', { class: 'rqp-left-in' },
      h('div', { class: 'br-top' },
        embed ? h('span', {}) : h('button', { class: 'br-back', type: 'button', onclick: () => { mxClose('intake'); go('intake'); } },
          h('span', { class: 'br-back-a', html: ICON('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15) }), INTAKE_NAME),
        h('div', { class: 'br-top-r' }, typeof moTurnBtn === 'function' ? moTurnBtn(r) : null, stageBtn, more)),
      title, meta, controls, tabs, body),
    dock);
  /* once the tabs are holding at the top, a soft edge keeps what slides under from merging into them */
  const leftIn = left.querySelector('.rqp-left-in');
  leftIn.addEventListener('scroll', () => {
    const stuck = tabs.getBoundingClientRect().top - leftIn.getBoundingClientRect().top <= 0.5 && leftIn.scrollTop > 0;
    if (stuck && !tabs.classList.contains('is-stuck')) stuckName.textContent = title.textContent.trim() || 'Untitled request';
    tabs.classList.toggle('is-stuck', stuck);
  }, { passive: true });

  /* ── the right: the documents, the one open shown at its latest version ── */
  const page = h('div', { class: 'doc-page rqp-page' });
  const docBtn = h('button', { class: 'rqp-docsw', type: 'button', 'aria-haspopup': 'listbox' });
  const verBtn = h('button', { class: 'rqp-ver', type: 'button', 'aria-haspopup': 'listbox' });
  const banner = h('div', { class: 'rqp-old' });
  const cmpBar = h('div', { class: 'rqp-cmp', hidden: true });
  const scroll = h('div', { class: 'rqp-scroll' }, cmpBar, banner, page);
  const latestIn = (d) => d.versions.length - 1;
  const titleOf = (d) => d.title.replace(/\.(docx?|pdf|txt|md)$/i, '');
  /* inside a request about one company, its name is not repeated at the front of every document */
  const shortOf = (d) => {
    const t = titleOf(d), w = (r.counterparty || '').split(/\s+/)[0];
    if (!w) return t;
    const m = new RegExp('^' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^—–]*?\\s[—–-]\\s(.+)$').exec(t);
    return m ? m[1] : t;
  };
  let pdfUrl = null;
  /* ── compare: pick two versions, Clavia marks every change between them,
     and the redline is kept as a document of its own — opened on what
     changed, clause by clause, then the full text with each change marked ── */
  let cmp = null, cmpAt = 0;   // cmp stays empty: a comparison is a document now
  const compareDialog = () => {
    const d = docs[di];
    /* any version of any document; a comparison itself is not something to compare */
    const realOf = () => docs.map((x, i) => ({ x, i })).filter(({ x }) => !x.versions[x.versions.length - 1].cmp || x.versions[x.versions.length - 1].cmp.asVersion);
    let real = realOf();
    const all = real.flatMap(({ x, i }) => x.versions.map((v, k) => ({ di: i, k })));
    if (all.length < 2) { pbToast('Upload another version or document to compare.'); return; }
    const same = (p, q) => p.di === q.di && p.k === q.k;
    let b = d.versions[d.versions.length - 1].cmp && !d.versions[d.versions.length - 1].cmp.asVersion ? all[all.length - 1] : { di, k: latestIn(d) };
    let a = b.k > 0 ? { di: b.di, k: b.k - 1 } : all.find(x => !same(x, b));
    /* a small list hanging from a button, the chosen one ticked */
    const drop = (btn, items) => {
      document.querySelector('.mx-tpk')?.remove();
      const pop = h('div', { class: 'mx-tpk mx-cmp-pop', role: 'listbox' }, ...items.map(it => h('button', { class: 'mx-tpk-row' + (it.on ? ' is-on' : '') + (it.add ? ' is-add' : ''), type: 'button', role: 'option', disabled: !!it.off,
        onclick: () => { it.run(); shut(); } }, ...it.body, h('span', { class: 'mx-tpk-tick', html: it.on ? ICON('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 15) : '' }))));
      document.body.append(pop);
      const r0 = btn.getBoundingClientRect();
      pop.style.width = Math.max(r0.width, 240) + 'px'; pop.style.left = r0.left + 'px'; pop.style.top = (r0.bottom + 6) + 'px'; pop.style.zIndex = 200;
      const out = (ev) => { if (!pop.contains(ev.target) && !btn.contains(ev.target)) shut(); };
      function shut() { pop.remove(); removeEventListener('mousedown', out, true); }
      addEventListener('mousedown', out, true);
    };
    const chev = () => h('span', { class: 'mx-cmp-chev', html: ICON('<path d="m7 10 5 5 5-5"/>', 14) });
    const verRow = (p, side) => { const v = docs[p.di].versions[p.k]; return [h('span', { class: 'mx-cmp-v is-' + side }, `v${p.k + 1}`),
      h('span', { class: 'mx-cmp-t' }, h('b', {}, v.name), h('span', {}, `${v.by} · ${pbWhen(v.when)}`))]; };
    /* each side: which document, then which version of it */
    const pick = (label, sub, side, get, set, other) => {
      const docB = h('button', { class: 'mx-cmp-pick mx-cmp-doc', type: 'button', 'aria-haspopup': 'listbox' });
      const verB = h('button', { class: 'mx-cmp-pick', type: 'button', 'aria-haspopup': 'listbox' });
      verB.className = 'mx-cmp-vpick is-' + side;
      const paint = () => {
        docB.replaceChildren(h('span', { class: 'mx-cmp-t' }, h('b', {}, shortOf(docs[get().di]))), chev());
        verB.replaceChildren(`v${get().k + 1}`, chev());
      };
      docB.onclick = (e) => { e.stopPropagation(); if (real.length < 2) return; drop(docB, real.map(({ x, i }) => ({ on: i === get().di,
        body: [mxTile('file', mxExt(x.title)), h('span', { class: 'mx-cmp-t' }, h('b', {}, shortOf(x)), h('span', {}, mxPlural(x.versions.length, 'version')))],
        run: () => { if (i === get().di) return; let k = x.versions.length - 1; if (same({ di: i, k }, other()) && k > 0) k--; set({ di: i, k }); paint(); } })).concat([{ add: true,
        /* a document that isn't here yet: upload it, and it becomes this side */
        body: [h('span', { class: 'mx-cmp-up', html: ICON('<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5"/><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/>', 15) }),
          h('span', { class: 'mx-cmp-t' }, h('b', {}, 'Upload a document'), h('span', {}, 'Word, PDF or text, from your computer'))],
        run: () => {
          const input = h('input', { type: 'file', accept: '.docx,.doc,.pdf,.txt,.md,.rtf', style: 'display:none', onchange: async () => {
            const f = input.files?.[0]; input.remove(); if (!f) return;
            pbToast(`Reading ${f.name}…`);
            const v = await mxIngest(f, { name: 'Uploaded', by: USER.name });
            const nd = mxAddVersion(r, v);
            mxLog(r, { ev: 'version', what: `uploaded ${f.name}`, ref: { doc: nd.id, v: 1 } });
            real = realOf(); set({ di: docs.indexOf(nd), k: 0 }); paint(); paintAsk(); paintBody();
            pbToast(`${shortOf(nd)} uploaded`);
          } });
          document.body.append(input); input.click();
        } }])); };
      verB.onclick = (e) => { e.stopPropagation(); const cur = get(); drop(verB, docs[cur.di].versions.map((v, k) => k).reverse().map(k => ({ on: k === cur.k, off: same({ di: cur.di, k }, other()),
        body: verRow({ di: cur.di, k }, k === cur.k ? side : 'plain'), run: () => { set({ di: cur.di, k }); paint(); } }))); };
      paint();
      /* one line: the document, and beside it which version */
      /* one row of the composite card: its dot, Old or New, the document, its version */
      return h('div', { class: 'mx-cmp-row2 is-' + side }, h('span', { class: 'mx-cmp-dot2', 'aria-hidden': 'true' }), h('span', { class: 'mx-cmp-lab' }, label), docB, verB);
    };
    const A = { el: pick('Old', null, 'old', () => a, (p) => { a = p; }, () => b) };
    const B = { el: pick('New', null, 'new', () => b, (p) => { b = p; }, () => a) };
    const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
    /* where the redline goes: kept beside the documents for reference, or taken on as the next working version */
    /* where the redline goes, asked quietly under the documents and not chosen for you:
       a document of its own (named here) or the next version (with a note for whoever opens it) */
    let asVersion = null, nameTouched = false;
    const nameIn = h('input', { class: 'mx-rqf-in mx-cmp-in', type: 'text', 'aria-label': 'Name', oninput: () => { nameTouched = true; } });
    const noteIn = h('textarea', { class: 'mx-cmp-in mx-cmp-note', rows: '1', placeholder: 'What changed, for whoever opens it next',
      oninput: (e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 2 + 'px'; } });
    const nameF = h('label', { class: 'mx-cmp-more' }, h('span', { class: 'mx-cmp-more-l' }, 'Name'), nameIn);
    let verTouched = false;
    const verIn = h('input', { class: 'mx-rqf-in mx-cmp-in', type: 'text', 'aria-label': 'Version name', oninput: () => { verTouched = true; paintAsk(); } });
    const verNo = h('span', { class: 'mx-cmp-v is-new mx-cmp-vno' });
    const noteF = h('div', { class: 'mx-cmp-more' },
      h('label', { class: 'mx-cmp-more' }, h('span', { class: 'mx-cmp-more-l' }, 'Version name'), h('span', { class: 'mx-cmp-vrow' }, verNo, verIn)));
    /* the optional note was taken out for now (15 Oct); noteIn stays so it can come back */
    /* each choice leads with what it makes, in the same marks as the pickers above: a document tile, or the next version's chip */
    const svRow = (k) => { const t = h('span', { class: 'mx-cmp-sv-n' }), sub = h('span', { class: 'mx-cmp-sv-s' }), lead = h('span', { class: 'mx-cmp-sv-lead' });
      const b = h('button', { class: 'mx-cmp-sv', type: 'button', role: 'radio', onclick: () => { asVersion = k; paintAsk(); (k ? verIn : nameIn).focus(); } },
        h('span', { class: 'mx-rule-radio' }), h('span', { class: 'mx-cmp-sv-m' }, t, sub));
      return { b, t, sub, lead }; };
    const svDoc = svRow(false), svVer = svRow(true);
    const ask = h('div', { class: 'mx-cmp-save', role: 'radiogroup', 'aria-label': 'Save as' },
      h('div', { class: 'mx-cmp-h' }, h('b', {}, 'Save as')),
      svDoc.b, nameF, svVer.b, noteF);
    const goBtn = h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: () => run() }, 'Compare');
    const paintAsk = () => {
      const sameDoc = a.di === b.di, next = docs[b.di].versions.length + 1;
      if (!sameDoc && asVersion) asVersion = null;
      svDoc.t.textContent = 'New document'; svDoc.sub.textContent = 'Creates a new document with the redline, listed beside the others. The originals stay as they are.';
      svVer.t.textContent = 'New version'; svVer.sub.textContent = sameDoc ? `Creates v${next} of ${shortOf(docs[b.di])}, with the changes tracked. It becomes the working version.` : 'Only when both sides are the same document.';
      if (!verTouched) verIn.value = `Redline of v${a.k + 1} and v${b.k + 1}`;
      svVer.b.disabled = !sameDoc;
      [[svDoc, false], [svVer, true]].forEach(([x, k]) => { x.b.classList.toggle('is-on', asVersion === k); x.b.setAttribute('aria-checked', String(asVersion === k)); });
      if (!nameTouched) nameIn.value = sameDoc ? `${shortOf(docs[b.di])} — v${a.k + 1} vs v${b.k + 1}` : `${shortOf(docs[a.di])} v${a.k + 1} vs ${shortOf(docs[b.di])} v${b.k + 1}`;
      nameF.hidden = asVersion !== false; noteF.hidden = asVersion !== true; verNo.textContent = `v${next}`;
      goBtn.disabled = asVersion === null || (asVersion === false && !nameIn.value.trim()) || (asVersion === true && !verIn.value.trim());
      goBtn.dataset.tip = asVersion === null ? 'Choose where to keep it' : '';
    };
    nameIn.addEventListener('input', () => paintAsk());
    const run = () => { if (goBtn.disabled) return; close(); compareInto(a, b, asVersion, { name: nameIn.value.trim(), verName: verIn.value.trim(), note: noteIn.value.trim() }); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Enter' && e.target !== noteIn) { e.preventDefault(); run(); } };
    dim.append(h('div', { class: 'pb-dlg mx-rqf mx-cmp', role: 'dialog', 'aria-label': 'Compare versions' },
      h('header', { class: 'mx-rqf-head' }, h('div', {}, h('h2', { class: 'pb-dlg-t' }, 'Compare')),
        h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
      h('div', { class: 'mx-rqf-body mx-cmp-body' }, h('div', { class: 'mx-cmp-card' }, A.el, B.el)),
      ask,
      h('footer', { class: 'mx-rqf-foot' },
        h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'),
        goBtn)));
    paintAsk();
    /* the question follows the sides: a different document can't become this one's version */
    dim.addEventListener('click', () => requestAnimationFrame(paintAsk));
    document.body.append(dim); addEventListener('keydown', onKey, true);
  };
  /* the work, shown while it happens; then the redline, kept */
  /* the work, shown while it happens — as a row in the lists on the left, and in the
     preview if it is open; then the redline, kept as a document */
  let pendingCmp = null;
  const compareInto = (A, B, asVersion, opts = {}) => {
    const va = docs[A.di].versions[A.k], vb = docs[B.di].versions[B.k], D = docs[B.di], two = A.di !== B.di;
    const res = mxCompare(va, vb);
    if (!res) { pbToast('Compare works on Word documents and text. One of these is a PDF Clavia could not read as text.'); return; }
    const name = (!asVersion && opts.name) || (two ? `${titleOf(docs[A.di])} v${A.k + 1} vs ${titleOf(D)} v${B.k + 1}` : `${titleOf(D)} — v${A.k + 1} vs v${B.k + 1}`);
    const steps = [`Reading v${A.k + 1} · ${va.name}`, `Reading v${B.k + 1} · ${vb.name}`, 'Lining up the clauses', 'Marking every change'];
    const STEP = 1600;
    pendingCmp = { name, step: steps[0] };
    const previewOpen = !grid.classList.contains('is-doc-hidden') && getComputedStyle(right).display !== 'none';
    const list = h('div', { class: 'rqp-work-steps' });
    const paint = (n) => {
      list.replaceChildren(...steps.map((t, i) => h('div', { class: 'rqp-work-step' + (i < n ? ' is-done' : i === n ? ' is-now' : '') },
        h('span', { class: 'rqp-work-ic', html: i < n ? ICON('<path d="m5.5 12.5 4 4 9-9.5"/>', 11) : '' }), t)));
      pendingCmp.step = steps[Math.min(n, steps.length - 1)];
      if (tab === 'docs' || tab === 'summary') paintBody();
    };
    if (previewOpen) {
      verBtn.hidden = true; banner.hidden = true; cmpBar.hidden = true;
      page.classList.remove('rqp-html'); scroll.classList.remove('is-pdf'); page.classList.add('is-working'); scroll.classList.add('is-working');
      page.replaceChildren(h('div', { class: 'rqp-work' },
        h('div', { class: 'rqp-work-h' }, quillEl('work', { cls: 'rqp-work-q' }), h('b', {}, `Comparing v${A.k + 1} with v${B.k + 1}`)),
        h('p', { class: 'rqp-work-s' }, two ? `${shortOf(docs[A.di])} and ${shortOf(D)}` : shortOf(D)), list));
    }
    paint(0);
    steps.forEach((_, i) => setTimeout(() => paint(i + 1), STEP * (i + 1)));
    setTimeout(() => {
      const v = { name: 'Comparison', by: 'Clavia', when: mxNow(), file: name + '.docx',
        note: `What changed from v${A.k + 1} (${va.name}) to v${B.k + 1} (${vb.name})`,
        blocks: res.rows.map(row => ({ t: row.t, v: mxCompareHtml(row) })),
        cmp: { from: { v: A.k + 1, name: va.name }, to: { v: B.k + 1, name: vb.name }, changes: res.changes, ins: res.ins, del: res.del, summary: mxCompareSummary(res) } };
      pendingCmp = null;
      if (asVersion && !two) {
        /* the redline taken on as the document's next working version, its changes as tracked changes */
        v.name = opts.verName || `Redline of v${A.k + 1} and v${B.k + 1}`; v.by = USER.name; v.file = `${titleOf(D)} v${D.versions.length + 1}.docx`; v.cmp.asVersion = true;
        if (opts.note) v.note = opts.note;
        mxAddVersion(r, v, D.id);
        const n = D.versions.length;
        mxLog(r, { ev: 'version', what: `compared v${A.k + 1} and v${B.k + 1} of ${titleOf(D)} and saved the redline as v${n}`, ref: { doc: D.id, v: n } });
        MX.intake.focus = { doc: D.id, v: n }; MX.intake.tab = tab;
        go('intake');
        pbToast(`Saved as v${n} of ${shortOf(D)}`);
        return;
      }
      const nd = mxAddVersion(r, v);
      mxLog(r, { ev: 'version', what: two ? `compared ${titleOf(docs[A.di])} v${A.k + 1} with ${titleOf(D)} v${B.k + 1}` : `compared v${A.k + 1} and v${B.k + 1} of ${titleOf(D)}`, ref: { doc: nd.id, v: 1 } });
      MX.intake.focus = { doc: nd.id, v: 1 }; MX.intake.tab = tab;
      go('intake');
      pbToast(res.changes ? `${mxPlural(res.changes, 'change')} found · kept for reference` : 'No changes between them · kept for reference');
    }, STEP * (steps.length + 1));
  };
  /* a comparison, read: what changed first, then the text with every change marked */
  const paintComparison = (v) => {
    const c = v.cmp;
    /* just the redline: no bar, no summary over it */
    cmpBar.hidden = true; verBtn.hidden = true;
    const count = h('span', { class: 'rqp-cmp-n' }, c.changes ? mxPlural(c.changes, 'change') : 'No changes');
    const go1 = (n) => {
      cmpAt = n;
      page.querySelectorAll('.is-at').forEach(x => x.classList.remove('is-at'));
      const hit = [...page.querySelectorAll(`[data-c="${n}"]`)];
      hit.forEach(x => x.classList.add('is-at'));
      hit[0]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      count.textContent = `${n} of ${c.changes}`;
    };
    const step = (dir) => { if (c.changes) go1(((cmpAt - 1 + dir + c.changes) % c.changes) + 1); };
    cmpBar.replaceChildren(
      h('div', { class: 'rqp-cmp-l' },
        h('span', { class: 'rqp-cmp-k' }, 'Redline'),
        h('span', { class: 'rqp-cmp-v is-old', 'data-tip': `Original: v${c.from.v} ${c.from.name}` }, `v${c.from.v}`),
        h('span', { class: 'rqp-cmp-ar', html: ICON('<path d="M5 12h14M13 6l6 6-6 6"/>', 13) }),
        h('span', { class: 'rqp-cmp-v is-new', 'data-tip': `Compared against: v${c.to.v} ${c.to.name}` }, `v${c.to.v}`)),
      h('div', { class: 'rqp-cmp-r' }, count,
        c.changes ? h('button', { class: 'rqp-cmp-b', type: 'button', 'aria-label': 'Previous change', 'data-tip': 'Previous Change', html: ICON('<path d="M15 6l-6 6 6 6"/>', 14), onclick: () => step(-1) }) : null,
        c.changes ? h('button', { class: 'rqp-cmp-b', type: 'button', 'aria-label': 'Next change', 'data-tip': 'Next Change', html: ICON('<path d="M9 6l6 6-6 6"/>', 14), onclick: () => step(1) }) : null));
    const clauses = c.summary.length;
    const sum = h('section', { class: 'rqp-chg' },
      h('div', { class: 'rqp-chg-h' }, h('b', {}, 'What changed'),
        h('span', {}, c.changes ? `${mxPlural(c.changes, 'change')} across ${mxPlural(clauses, 'clause')} · ${c.ins} added, ${c.del} removed` : `v${c.from.v} and v${c.to.v} say the same thing`)),
      ...c.summary.map(g => h('button', { class: 'rqp-chg-row', type: 'button', onclick: () => go1(g.c) },
        h('span', { class: 'rqp-chg-t' }, g.head),
        h('span', { class: 'rqp-chg-d' }, g.del ? h('del', {}, g.del) : null, g.del && g.ins ? ' ' : null, g.ins ? h('ins', {}, g.ins) : null),
        h('span', { class: 'rqp-chg-n' }, String(g.n)))));
    page.classList.remove('rqp-html');
    void sum;
    page.replaceChildren(...v.blocks.map(b => h({ h1: 'h1', h2: 'h2' }[b.t] || 'p', { class: ({ h1: 'doc-h1', h2: 'doc-h2' }[b.t] || 'doc-p') + ' rqp-rl', html: b.v })));
    cmpAt = 0;
  };
  const paintDoc = () => {
    if (!docs.length) return;
    verBtn.hidden = false; cmpBar.hidden = true; page.classList.remove('is-working'); scroll.classList.remove('is-working');
    const d = docs[di], v = d.versions[vi];
    paintCmtN?.();
    /* two controls: which document, and which version of it */
    docBtn.dataset.tip = titleOf(d);
    docBtn.replaceChildren(h('span', { class: 'rqp-doc-n' }, shortOf(d)),
      h('span', { class: 'rqp-ver-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 13) }));
    verBtn.replaceChildren(`v${vi + 1}`, h('span', { class: 'rqp-ver-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) }));
    verBtn.title = `${v.name} · ${v.by}`;
    banner.hidden = vi === latestIn(d);
    banner.replaceChildren(h('span', {}, `You are looking at v${vi + 1}, ${v.name.toLowerCase()}.`),
      h('button', { class: 'mx-link', type: 'button', onclick: () => { vi = latestIn(d); paintDoc(); } }, `Back to v${d.versions.length}`));
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; }
    scroll.classList.toggle('is-pdf', !!v.pdf);
    if (v.pdf) {
      page.replaceChildren(h('div', { class: 'rqp-loading' }, 'Opening the PDF…'));
      mxBlobs.get(v.fid).then(b => { if (!b || docs[di]?.versions[vi] !== v) return; pdfUrl = URL.createObjectURL(b); page.replaceChildren(h('iframe', { class: 'rqp-pdf', src: pdfUrl, title: v.file })); });
    } else if (v.html) {
      page.innerHTML = v.html; page.classList.add('rqp-html');
    } else if (v.none) {
      page.classList.remove('rqp-html');
      page.replaceChildren(h('div', { class: 'rqp-nopv' }, mxTile('file', mxExt(v.file)), h('b', {}, v.file), h('span', {}, 'There is no preview for this kind of file. Download it to read it.')));
    } else if (v.cmp) {
      paintComparison(v);
    } else {
      page.classList.remove('rqp-html');
      page.replaceChildren(...(v.blocks || []).map(b => h({ h1: 'h1', h2: 'h2', p: 'p', meta: 'p' }[b.t] || 'p', { class: { h1: 'doc-h1', h2: 'doc-h2', p: 'doc-p', meta: 'doc-meta rqp-meta-line' }[b.t] || 'doc-p', html: b.v })));
    }
    /* the latest version is edited right here, like a document; older versions and comparisons only read */
    const editable = vi === latestIn(d) && !v.pdf && !v.none && !v.cmp;
    page.contentEditable = editable ? 'true' : 'false'; page.spellcheck = editable;
    page.classList.toggle('is-editable', editable);
    scroll.scrollTop = 0;
    paintCtx?.();
    if (right?.classList.contains('has-cmts')) { paintCPanel(); requestAnimationFrame(() => markFocus()); }
    paintCmtN();
    if (tab === 'docs') paintBody();
  };
  /* select any words in the document and a Comment button appears beside them; the comment goes to the pane on the right */
  const selBtn = h('button', { class: 'rqp-selc', type: 'button', hidden: true, onmousedown: (e) => e.preventDefault(),
    onclick: () => {
      const t = String(getSelection()).replace(/\s+/g, ' ').trim(); selBtn.hidden = true; if (!t) return;
      cmtQuote = t.length > 400 ? t.slice(0, 400) + '…' : t;
      /* the words stay marked in the document while the comment is written */
      try { const sel = getSelection(); if (sel.rangeCount && window.CSS?.highlights && typeof Highlight !== 'undefined') CSS.highlights.set('rqp-draft', new Highlight(sel.getRangeAt(0).cloneRange())); sel.removeAllRanges(); } catch (e) {}
      if (!right.classList.contains('has-cmts')) showPanel(true); else paintCPanel();
      requestAnimationFrame(() => { cpanel.querySelector('.wd-card.is-draft .wd-in')?.focus(); cpanel.querySelector('.rqp-cp-list').scrollTop = 0; });
    } }, h('span', { html: ICON('<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-6.5L8 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>', 14) }), 'Comment');
  document.body.append(selBtn);
  const placeSel = () => {
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !page.contains(sel.anchorNode) || !String(sel).trim() || !page.isConnected) { selBtn.hidden = true; return; }
    const rc = sel.getRangeAt(0).getBoundingClientRect();
    selBtn.hidden = false;
    selBtn.style.top = Math.max(8, rc.top - selBtn.offsetHeight - 8) + 'px';
    selBtn.style.left = Math.min(innerWidth - selBtn.offsetWidth - 8, Math.max(8, rc.left + rc.width / 2 - selBtn.offsetWidth / 2)) + 'px';
  };
  page.addEventListener('mouseup', () => setTimeout(placeSel, 0));
  page.addEventListener('keyup', (e) => { if (e.shiftKey) placeSel(); });
  scroll.addEventListener('scroll', () => { selBtn.hidden = true; }, { passive: true });
  document.addEventListener('selectionchange', () => { if (!page.isConnected) { selBtn.remove(); return; } if (getSelection().isCollapsed) selBtn.hidden = true; });
  /* typing in the document saves it back into the version it shows, a moment after you stop */
  let editT = null, editLogged = false;
  page.addEventListener('input', () => {
    if (page.contentEditable !== 'true') return;
    clearTimeout(editT);
    editT = setTimeout(() => {
      const d = docs[di], v = d?.versions[vi]; if (!v) return;
      if (v.html) v.html = page.innerHTML;
      else v.blocks = [...page.children].map(el => ({ t: el.tagName === 'H1' ? 'h1' : el.tagName === 'H2' ? 'h2' : el.classList.contains('doc-meta') ? 'meta' : 'p', v: el.innerHTML }));
      v.edited = { by: USER.name, when: mxNow() };
      if (!editLogged) { editLogged = true; mxLog(r, { ev: 'version', what: `edited v${vi + 1} of ${titleOf(d)}`, ref: { doc: d.id, v: vi + 1 } }); }
      r.updated = mxNow(); save();
    }, 700);
  });
  /* a reference in the activity, or a row in Documents, opens here */
  openRef = (ref) => {
    const i = docs.findIndex(x => x.id === ref.doc);
    if (i < 0) return;
    di = i; vi = Math.min((ref.v || docs[i].versions.length) - 1, latestIn(docs[i]));
    /* opening a document always shows it, even with the pane folded away */
    if (grid.classList.contains('is-doc-hidden')) { state.rqDocHidden = false; save(); grid.classList.remove('is-doc-hidden'); }
    paintDoc(); grid.classList.add('show-doc');
    page.animate?.([{ opacity: .4 }, { opacity: 1 }], { duration: 260 });
  };
  /* a list that hangs from a button, ticked where you are */
  const listFrom = (btn, rows) => {
    document.querySelector('.mx-tpk')?.remove();
    const pop = h('div', { class: 'mx-tpk rqp-vers', role: 'listbox' }, ...rows.map((row) => typeof row === 'string' ? h('div', { class: 'rqp-vers-h' }, row) : row).map((row) => row instanceof Node ? row : (([on, lead, name, sub, run]) => h('button', { class: 'mx-tpk-row' + (on ? ' is-on' : ''), type: 'button', role: 'option',
      onclick: () => { run(); shut(); } }, lead,
      h('span', { class: 'mx-rqf-pick-t' }, h('span', { class: 'mx-rqf-pick-n' }, name), h('span', { class: 'mx-rqf-pick-s' }, sub)),
      h('span', { class: 'mx-tpk-tick', html: on ? ICON('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 15) : '' })))(row)));
    document.body.append(pop);
    const rr = btn.getBoundingClientRect();
    pop.style.width = '320px'; pop.style.left = Math.max(12, Math.min(rr.left, innerWidth - 332)) + 'px'; pop.style.top = (rr.bottom + 6) + 'px';
    const out = (ev) => { if (!pop.contains(ev.target) && !btn.contains(ev.target)) shut(); };
    const esc = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); shut(); } };
    function shut() { pop.remove(); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); }
    addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
  };
  docBtn.onclick = (e) => {
    e.stopPropagation();
    const d = docs[di];
    void d;
    listFrom(docBtn, [
      ...docs.map((x, i) => [i === di, mxTile('file', mxExt(x.title)), shortOf(x), `v${x.versions.length} · ${pbWhen(x.versions[latestIn(x)].when)}`, () => { di = i; vi = latestIn(x); paintDoc(); }]),
      [false, h('span', { class: 'rqp-ver-add rqp-ver-add--doc', html: ICON('<path d="M12 6v12M6 12h12"/>', 13) }), 'Add another document', 'Word, PDF or text', () => upload(true)]]);
  };
  verBtn.onclick = (e) => {
    e.stopPropagation();
    const d = docs[di];
    listFrom(verBtn, [
      ...d.versions.map((v, i) => i).reverse().map(i => [i === vi, h('span', { class: 'rqp-ver-v' }, `v${i + 1}`), d.versions[i].name + (i === latestIn(d) ? ' · Latest' : ''), (() => { const n = (r.activity || []).filter(a => (a.kind === 'note' || a.kind === 'reply') && a.ref?.doc === d.id && a.ref?.v === i + 1).length; return `${pbWhen(d.versions[i].when)} · ${d.versions[i].by}${n ? ` · ${mxPlural(n, 'comment')}` : ''}`; })(), () => { vi = i; paintDoc(); }]),
      h('div', { class: 'rqp-vers-rule' }),
      [false, h('span', { class: 'rqp-ver-add', html: ICON('<path d="M12 6v12M6 12h12"/>', 13) }), 'Upload a New Version', '', () => upload(false)],
      [false, h('span', { class: 'rqp-ver-add', html: ICON('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>', 13) }), 'Compare', '', () => compareDialog()]]);
  };

  /* a file in: a new version of the document open, or a document of its own */
  upload = (asNew) => {
    const pick = h('input', { type: 'file', accept: '.docx,.doc,.pdf,.txt,.md,.rtf', style: 'display:none', onchange: async () => {
      const f = pick.files?.[0]; pick.remove(); if (!f) return;
      takeFile(f, !asNew && docs.length ? docs[di] : null);
    } });
    document.body.append(pick); pick.click();
  };
  /* a file arrives — picked, or dropped: onto a document it is that document's next version, anywhere else a new document */
  const takeFile = (f, target) => {
      /* before it goes in: what changed, in a line, for whoever opens it next */
      uploadNote(f, target, async (note, theirs, vname) => {
        pbToast(`Reading ${f.name}…`);
        const side = (r.counterparty || '').split(/\s+/)[0];
        const v = await mxIngest(f, { name: target ? (vname || (theirs ? `${side}’s markup` : 'New version')) : 'Uploaded', by: theirs ? r.counterparty : USER.name });
        if (note) v.note = note;
        const d = mxAddVersion(r, v, target?.id);
        const ref = { doc: d.id, v: d.versions.length };
        mxLog(r, { ev: 'version', what: target ? `uploaded v${d.versions.length} of ${titleOf(d)}${theirs ? `, ${side}’s markup` : ''}` : `uploaded ${f.name}`, ref });
        if (note) mxLog(r, { kind: 'note', what: note, ref });
        /* their markup: Clavia compares it with the version we last sent, and the round opens */
        if (theirs && target) {
          let base = d.versions.length - 1; while (base > 1 && d.versions[base - 1].by === r.counterparty) base--;
          const n = mxRoundFromCompare(r, d, d.versions.length, base);
          mxLog(r, { who: 'Clavia', ev: 'clavia', what: `compared ${side}’s v${d.versions.length} of the ${docTag(d.id)} with our v${base}: ${mxPlural(n, 'change', 'changes')}`, ref });
          MX.intake.round = d.id;
        }
        MX.intake.focus = ref;
        go('intake');
      });
  };
  /* dropping files: the Documents list takes them, a row becomes their target while you hover it, and so does the open document */
  const OK_FILE = /\.(docx?|pdf|txt|md|rtf)$/i;
  const dropOn = (el, targetOf, say, live = () => true) => {
    let depth = 0;
    const hasFiles = (e) => live() && [...(e.dataTransfer?.types || [])].includes('Files');
    el.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; el.classList.add('is-drop'); });
    el.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      el.querySelectorAll('.rqp-dc.is-drop-on').forEach(x => x.classList.remove('is-drop-on'));
      const row = e.target.closest?.('.rqp-dc[data-doc]'); if (row && el.contains(row)) row.classList.add('is-drop-on');
      say?.(row ? docs.find(x => x.id === row.dataset.doc) : targetOf(e)); });
    el.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; el.classList.remove('is-drop'); el.querySelectorAll('.is-drop-on').forEach(x => x.classList.remove('is-drop-on')); } });
    el.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return; e.preventDefault(); depth = 0; el.classList.remove('is-drop');
      const row = e.target.closest?.('.rqp-dc[data-doc]'); el.querySelectorAll('.is-drop-on').forEach(x => x.classList.remove('is-drop-on'));
      const files = [...e.dataTransfer.files].filter(f => OK_FILE.test(f.name));
      if (!files.length) { pbToast('Drop a Word document, PDF or text file.'); return; }
      const target = row ? docs.find(x => x.id === row.dataset.doc) : targetOf(e);
      takeFile(files[0], target || null);
      if (files.length > 1) pbToast(`Taking ${files[0].name} first. Drop the others one at a time.`);
    });
  };
  /* a version's name, said the way the team talks about it: "Their redline", "After the call" */
  const renameVersion = (d, k) => {
    const v = d.versions[k];
    const inp = h('input', { class: 'mx-rqf-in', type: 'text', value: v.name || '', placeholder: 'e.g. After the call with Acme' });
    const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
    const keep = () => {
      const t = inp.value.trim(); close();
      if (!t || t === v.name) return;
      const was = v.name; v.name = t; r.updated = mxNow(); save();
      add({ ev: 'version', what: `renamed v${k + 1} from “${was}” to “${t}”`, ref: { doc: d.id, v: k + 1 } });
      paintDoc(); if (tab === 'docs') paintBody();
      pbToast(`v${k + 1} renamed`);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Enter') { e.preventDefault(); keep(); } };
    dim.append(h('div', { class: 'pb-dlg mx-rqf mx-upn', role: 'dialog', 'aria-label': `Rename v${k + 1}` },
      h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t' }, `Rename v${k + 1}`),
        h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
      h('div', { class: 'mx-rqf-body' }, h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Version name'), inp)),
      h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: keep }, 'Rename'))));
    document.body.append(dim); addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => { inp.focus(); inp.select(); });
  };
  const uploadNote = (f, target, done) => {
    const nextV = target ? target.versions.length + 1 : 1;
    const note = h('textarea', { class: 'mx-rqf-in mx-rqf-ta', rows: '3', placeholder: target ? 'What changed in this version? e.g. Took their liability cap, kept our governing law' : 'Anything legal should know about this document?' });
    const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
    /* whose version it is: guessed from the file name, said in one click; theirs opens a round */
    const side = (r.counterparty || '').split(/\s+/)[0];
    let theirs = !!(target && side && (new RegExp(`\\b${side}\\b|comments|markup|redline`, 'i').test(f.name)));
    const who = target && side ? h('div', { class: 'rqu-seg', role: 'radiogroup', 'aria-label': 'Whose version' }) : null;
    /* a new version is named, as when a comparison is kept as one: its number, and a name you can change */
    let nameTouched = false;
    const vName = target ? h('input', { class: 'mx-rqf-in mx-cmp-in', type: 'text', 'aria-label': 'Version name', oninput: () => { nameTouched = true; } }) : null;
    const fillName = () => { if (vName && !nameTouched) vName.value = theirs ? `${side}’s markup` : 'Our revision'; };
    const paintWho = () => { who?.replaceChildren(...[[false, 'Ours'], [true, `${side}’s`]].map(([k, label]) =>
      h('button', { class: 'rqu-seg-b' + (theirs === k ? ' is-on' : ''), type: 'button', role: 'radio', 'aria-checked': String(theirs === k), onclick: () => { theirs = k; paintWho(); } }, label))); fillName(); };
    paintWho(); fillName();
    const go1 = () => { const t = note.value.trim(); const nm = vName?.value.trim(); close(); done(t || null, theirs, nm || null); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go1(); } };
    const kb = f.size > 1e6 ? (f.size / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1e3)) + ' KB';
    dim.append(h('div', { class: 'pb-dlg mx-rqf mx-upn', role: 'dialog', 'aria-label': target ? 'Upload a new version' : 'Add a document' },
      h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t' }, target ? `Upload v${nextV}` : 'Add a Document'),
        h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
      h('div', { class: 'mx-rqf-body' },
        h('div', { class: 'mx-rqf-item' }, mxTile('file', mxExt(f.name)),
          h('span', { class: 'mx-rqf-pick-t' }, h('span', { class: 'mx-rqf-pick-n' }, f.name),
            h('span', { class: 'mx-rqf-pick-s' }, target ? `v${nextV} of ${titleOf(target)} · ${kb}` : kb))),
        /* whose version it is is guessed from the file name and not asked (15 Oct) */
        target ? h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Version name'), h('span', { class: 'mx-cmp-vrow' }, h('span', { class: 'mx-cmp-v is-new mx-cmp-vno' }, `v${nextV}`), vName)) : null,
        /* a comment on the version, after its name: kept on the version and in Activity */
        h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Comment', h('span', { class: 'mx-rqf-hint' }, 'Optional')), note)),
      h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: go1 }, 'Upload'))));
    document.body.append(dim); addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => { (vName || note).focus(); vName?.select(); });
  };
  /* the three things you do with a contract, on the version you are looking at */
  const fileOf = () => { const v = docs[di].versions[vi]; return (v.file || docs[di].title).replace(/\.(docx?|pdf|txt|md)$/i, ''); };
  const giveFile = async () => {
    if (cmp) {
      const name = `Redline — ${titleOf(docs[cmp.b.di])} v${cmp.a.k + 1} vs v${cmp.b.k + 1}`;
      const html = `<html><head><meta charset="utf-8"><title>${mxEsc(name)}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5}h1{font-size:20pt;font-weight:normal}h2{font-size:12pt;margin-top:16pt}del{color:#B4483C}ins{color:#1F6E46}</style></head><body>`
        + cmp.res.rows.map(row => { const t = row.t === 'h1' ? 'h1' : row.t === 'h2' ? 'h2' : 'p'; return `<${t}>${mxCompareHtml(row)}</${t}>`; }).join('') + '</body></html>';
      const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/msword' })), download: name + '.doc' });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return;
    }
    const v = docs[di].versions[vi];
    let blob = v.fid ? await mxBlobs.get(v.fid) : null, name = v.file;
    if (!blob) {
      const html = `<html><head><meta charset="utf-8"><title>${mxEsc(fileOf())}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5}h1{font-size:20pt;font-weight:normal}h2{font-size:12pt;margin-top:16pt}del{color:#B4483C}ins{color:#1F6E46}</style></head><body>`
        + (v.html || (v.blocks || []).map(b => `<${b.t === 'h1' ? 'h1' : b.t === 'h2' ? 'h2' : 'p'}>${b.v}</${b.t === 'h1' ? 'h1' : b.t === 'h2' ? 'h2' : 'p'}>`).join('')) + '</body></html>';
      blob = new Blob(['﻿' + html], { type: 'application/msword' }); name = fileOf() + '.doc';
    }
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  /* ── emailing documents out: Clavia drafts it, you choose what goes, you read it, Outlook sends it ──
     One or more of the request's documents, each at the version you pick; a summary of what changed,
     written from the negotiation itself; the email drafted around it; a review of exactly what will go;
     then it opens in Outlook as a draft. */
  const emailDoc = () => {
    const ppl = mxPeople(r).filter(p => p.email);
    const them = ppl.filter(p => p.side === 'counterparty');
    let to = (them.length ? them : ppl.slice(0, 1)).map(p => p.email);
    const side = (r.counterparty || '').split(/\s+/)[0] || 'them';
    /* what goes: document → version index; the one you are reading, at the version you are on */
    const sel = new Map(docs.length ? [[docs[di].id, vi]] : []);
    let stage = 'compose', touched = false, reading = true;
    const subj = h('input', { class: 'mx-rqf-in mx-em-subj', type: 'text', 'aria-label': 'Subject' });
    const body = h('textarea', { class: 'mx-rqf-in mx-em-body', rows: '9', 'aria-label': 'Message', oninput: () => { touched = true; } });
    /* what changed, from the round on that document: what we took, countered, kept */
    const changes = (d, k) => {
      const rd = mxRoundOf(r, d.id);
      if (rd && rd.v <= k + 1 && rd.points?.length) return rd.points.slice(0, 5).map(p => {
        const t = p.term || p.clause.replace(/^\d+\.\s*/, '');
        const dd = p.decision?.d, lc = (x) => x && /^[A-Z][a-z]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x;
        return dd === 'accept' ? `${t}: we accept ${lc(p.brief) || 'your change'}`
          : dd === 'counter' ? `${t}: we propose ${lc(p.brief) || p.decision.text}`
          : dd === 'keep' ? `${t}: we have kept our wording${p.why ? ` (${p.why.charAt(0).toLowerCase() + p.why.slice(1)})` : ''}`
          : `${t}: still with us to decide`;
      });
      const v = d.versions[k];
      return v.note ? [v.note] : [`${v.name}, v${k + 1}`];
    };
    const first = (them[0]?.name || ppl[0]?.name || '').split(' ')[0];
    const draft = () => {
      const items = [...sel].map(([id, k]) => ({ d: docs.find(x => x.id === id), k })).filter(x => x.d);
      const lines = items.flatMap(({ d, k }) => [`${titleOf(d)}, v${k + 1}:`, ...changes(d, k).map(t => `- ${t}`), '']);
      if (!touched) body.value = `Hi ${first},\n\n${items.length > 1 ? 'Please find attached our latest versions.' : `Please find attached v${(items[0]?.k ?? 0) + 1} of ${items[0] ? titleOf(items[0].d) : 'the document'}.`} In short:\n\n${lines.join('\n').trim()}\n\nHappy to take any of these on a call.\n\nBest,\n${USER.name.split(' ')[0]}`;
      if (!subj.dataset.touched) subj.value = `${side}: ${items.map(({ d, k }) => `${shortOf(d)} v${k + 1}`).join(', ')}`;
    };
    subj.addEventListener('input', () => { subj.dataset.touched = '1'; });
    const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (stage === 'review') { stage = 'compose'; paint(); } else close(); } };
    const dlg = h('div', { class: 'pb-dlg mx-rqf mx-em', role: 'dialog', 'aria-label': 'Email with Outlook' });
    dim.append(dlg);
    const outlook = () => h('img', { class: 'mx-em-ol', src: brandSrc('outlook'), alt: '' });
    const chip = (email) => { const p = ppl.find(x => x.email === email); return h('span', { class: 'mx-em-chip' }, mxFace(p?.name || email, 'pb-av mx-em-av'), p?.name || email,
      stage === 'compose' ? h('button', { class: 'mx-em-chip-x', type: 'button', 'aria-label': `Remove ${p?.name || email}`, html: ICON('<path d="M7 7l10 10M17 7 7 17"/>', 11), onclick: () => { to = to.filter(x => x !== email); paint(); } }) : null); };
    const addTo = (btn) => menu(btn, ppl.filter(p => !to.includes(p.email)).map(p => ({ label: `${p.name} · ${p.role}`, run: () => { to.push(p.email); paint(); } })));
    const verPick = (btn, d) => listFrom(btn, d.versions.map((v, k) => [sel.get(d.id) === k, h('span', { class: 'mx-cmp-v' }, `v${k + 1}`), v.name, `${v.by || ''}${v.when ? ' · ' + new Date(v.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`,
      () => { sel.set(d.id, k); draft(); paint(); }]).reverse());
    const docRow = (d) => {
      const on = sel.has(d.id), k = sel.has(d.id) ? sel.get(d.id) : d.versions.length - 1;
      return h('div', { class: 'mx-em-doc' + (on ? ' is-on' : '') },
        h('button', { class: 'mx-em-check', type: 'button', role: 'checkbox', 'aria-checked': String(on), 'aria-label': `Attach ${titleOf(d)}`,
          html: on ? '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.3 2.8 2.8 6.2-6.4"/></svg>' : '', onclick: () => { if (on) sel.delete(d.id); else sel.set(d.id, d.versions.length - 1); draft(); paint(); } }),
        mxTile('file', mxExt(d.versions[k]?.file || d.title)),
        h('span', { class: 'mx-em-doc-t' }, h('span', { class: 'mx-em-doc-n' }, titleOf(d)), h('span', { class: 'mx-em-doc-s' }, d.versions[k]?.name || '')),
        h('button', { class: 'mx-em-ver', type: 'button', disabled: !on, 'data-tip': 'Choose the version to send', onclick: (e) => { e.stopPropagation(); verPick(e.currentTarget, d); } },
          `v${k + 1}`, h('span', { html: ICON('<path d="m7 10 5 5 5-5"/>', 12) })));
    };
    const items = () => [...sel].map(([id, k]) => ({ d: docs.find(x => x.id === id), k })).filter(x => x.d);
    const summaryEl = () => h('div', { class: 'mx-em-sum' },
      h('div', { class: 'mx-em-sum-h' }, h('span', { class: 'mx-em-spark', html: SPARK_ONE }), reading ? 'Reading what changed…' : 'What changed, for them'),
      reading ? h('div', { class: 'mx-em-sum-load' }, h('i'), h('i'), h('i'))
      : h('div', { class: 'mx-em-sum-b' }, ...items().map(({ d, k }) => h('div', { class: 'mx-em-sum-doc' },
          h('b', {}, `${shortOf(d)} v${k + 1}`),
          h('ul', {}, ...changes(d, k).map(t => h('li', {}, t)))))));
    const paint = () => {
      const n = items().length;
      if (stage === 'compose') dlg.replaceChildren(
        h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t mx-em-t' }, outlook(), 'Email with Outlook'),
          h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
        h('div', { class: 'mx-rqf-body mx-em-bd' },
          h('div', { class: 'mx-em-row' }, h('span', { class: 'mx-em-k' }, 'To'), h('div', { class: 'mx-em-chips' }, ...to.map(chip),
            h('button', { class: 'mx-em-add', type: 'button', onclick: (e) => { e.stopPropagation(); addTo(e.currentTarget); } }, '+ Add'))),
          h('div', { class: 'mx-em-row' }, h('span', { class: 'mx-em-k' }, 'Subject'), subj),
          h('div', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Attach', h('span', { class: 'mx-rqf-hint' }, `${n} of ${docs.length}`)), h('div', { class: 'mx-em-docs' }, ...docs.map(docRow))),
          summaryEl(),
          h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Message', h('span', { class: 'mx-rqf-hint' }, 'Drafted by Clavia')), body)),
        h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', { class: 'pb-btn pb-btn--primary', type: 'button', disabled: !n || !to.length, onclick: () => { stage = 'review'; paint(); } }, 'Review')));
      else dlg.replaceChildren(
        h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t mx-em-t' }, outlook(), 'Review before Outlook'),
          h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 14) })),
        /* exactly what will go: who, what it says, and which files at which versions */
        h('div', { class: 'mx-rqf-body mx-em-bd' }, h('div', { class: 'mx-em-mail' },
          h('div', { class: 'mx-em-mail-h' },
            h('div', { class: 'mx-em-mail-r' }, h('span', { class: 'mx-em-k' }, 'From'), h('span', {}, `${USER.name} <${mxEmail(USER.name)}>`)),
            h('div', { class: 'mx-em-mail-r' }, h('span', { class: 'mx-em-k' }, 'To'), h('div', { class: 'mx-em-chips' }, ...to.map(chip))),
            h('div', { class: 'mx-em-mail-r' }, h('span', { class: 'mx-em-k' }, 'Subject'), h('b', {}, subj.value))),
          h('div', { class: 'mx-em-mail-b' }, body.value),
          h('div', { class: 'mx-em-atts' }, ...items().map(({ d, k }) => h('span', { class: 'mx-em-att' }, mxTile('file', mxExt(d.versions[k].file || d.title)),
            h('span', { class: 'mx-em-doc-t' }, h('span', { class: 'mx-em-doc-n' }, d.versions[k].file || titleOf(d) + '.docx'), h('span', { class: 'mx-em-doc-s' }, `v${k + 1} · ${d.versions[k].name}`))))))),
        h('footer', { class: 'mx-rqf-foot' }, h('button', { class: 'pb-btn', type: 'button', onclick: () => { stage = 'compose'; paint(); } }, 'Back'),
          h('button', { class: 'pb-btn pb-btn--primary mx-em-go', type: 'button', onclick: () => {
            const names = to.map(e => ppl.find(p => p.email === e)?.name || e);
            items().forEach(({ d, k }) => add({ ev: 'email', what: `emailed v${k + 1} of ${titleOf(d)} to ${names.join(', ')}`, ref: { doc: d.id, v: k + 1 } }));
            close(); pbToast(`Opened in Outlook as a draft to ${names[0]}${names.length > 1 ? ` and ${names.length - 1} more` : ''}`);
          } }, outlook(), 'Open in Outlook')));
    };
    draft(); paint();
    document.body.append(dim); addEventListener('keydown', onKey, true);
    /* Clavia reads the round before it writes: a beat, then the summary and the draft */
    setTimeout(() => { reading = false; if (stage === 'compose') paint(); }, 1300);
  };
  const tool = (label, html, run, cls = '') => h('button', { class: 'rqp-tool ' + cls, type: 'button', 'data-tip': label, 'aria-label': label, onclick: run }, html, h('span', { class: 'rqp-tool-t' }, label));
  /* comments on the version you are reading: what has been said about it, and a line to add yours */
  const onThis = () => (r.activity || []).filter(a => (a.kind === 'note' || a.kind === 'reply') && a.ref && docs[di] && a.ref.doc === docs[di].id && a.ref.v === vi + 1);
  const cmtN = h('span', { class: 'rqp-cmt-n' });
  const cmtBtn = h('button', { class: 'rqp-tool rqp-tool--icon rqp-cmt-btn', type: 'button', 'data-tip': 'Comment', 'aria-label': 'Comment on this version',
    html: ICON('<path d="M6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.3a.5.5 0 0 1-.8-.4v-2.9h.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><path d="M8.5 9h7M8.5 12.3h4.5"/>'),
    onclick: (e) => { e.stopPropagation(); showPanel(!right.classList.contains('has-cmts')); } }, cmtN);
  const paintCmtN = () => { const d = docs[di]; const n = d ? mxWComments(r).filter(c => c.doc === d.id && c.status !== 'closed').length : 0; cmtN.textContent = n ? String(n) : ''; cmtN.hidden = !n; };

  /* ── the comments pane: every comment on this document, beside it, the way Word shows them ──
     Tagged comments from Word in the order they sit in the text, then comments made here. A
     comment takes you to its words and opens its thread; reply, close, reopen happen in place. */
  const cpanel = h('aside', { class: 'rqp-cpanel', 'aria-label': 'Comments' });
  let cmtFocus = null, cmtClosed = false, cmtF = 'all', cmtQ = '', cmtQuote = '', cmtWho = new Set(), cmtEdit = null, cmtDraft = false;   /* cmtDraft: a new comment on the document as a whole, from + Comment */   /* cmtWho: the assignees chosen; empty is everyone */
  /* opening or closing the comments moves the page between two layouts; a view transition carries each part across
     (the request folds away left, the document slides over, the comments come in from the right) instead of snapping */
  const showPanel = (on, focus) => {
    const run = () => showPanelNow(on, focus);
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches || !grid?.isConnected) return run();
    const parts = [[left, 'rqp-left'], [grid.querySelector('.rqp-bar'), 'rqp-bar'], [scroll, 'rqp-doc'], [cpanel, 'rqp-cmts']].filter(([el]) => el);
    parts.forEach(([el, n]) => { el.style.viewTransitionName = n; });
    document.documentElement.classList.add('vt-cmts');
    const vt = document.startViewTransition(run);
    vt.finished.finally(() => { parts.forEach(([el]) => { el.style.viewTransitionName = ''; }); document.documentElement.classList.remove('vt-cmts'); });
  };
  const showPanelNow = (on, focus) => {
    state.rqCmtPanel = !!on; save();
    right?.classList.toggle('has-cmts', !!on);
    /* working through comments: the request folds away, the document on the left, the comments on the right */
    grid?.classList.toggle('is-cmt-focus', !!on && CMT_FOCUS);
    fitCmts();
    if (focus !== undefined) cmtFocus = focus;
    paintCPanel(); markFocus();
  };
  /* with the comments open, the document side takes the room it needs for the page and the pane together */
  const fitCmts = () => {
    if (!grid || typeof setSplit !== 'function') return;
    if (right?.classList.contains('has-cmts') && CMT_FOCUS) { grid.style.gridTemplateColumns = '0px minmax(0, 1fr)'; split.style.left = '0px'; }
    else if (right?.classList.contains('has-cmts')) { const w = grid.getBoundingClientRect().width; const x = Math.max(360, Math.min(state.rqSplit || 1e9, w - 880)); grid.style.gridTemplateColumns = `${x}px minmax(0, 1fr)`; split.style.left = x + 'px'; }
    else if (state.rqSplit) setSplit(state.rqSplit);
    else { grid.style.gridTemplateColumns = ''; split.style.left = ''; }
  };
  /* a thread opening or closing grows or shrinks to its new height and its new lines fade in, instead of snapping */
  const wdMorph = (T, paint) => {
    const before = new Map([...T.querySelectorAll('.wd-card[data-cid]')].map(el => [el.dataset.cid, [el.getBoundingClientRect().height, el.classList.contains('is-on')]]));
    paint();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ease = 'cubic-bezier(.2,0,0,1)';
    T.querySelectorAll('.wd-card[data-cid]').forEach(el => {
      const was = before.get(el.dataset.cid); if (!was) return;
      const to = el.getBoundingClientRect().height; if (Math.abs(to - was[0]) < 2) return;
      el.style.overflow = 'clip';
      el.animate([{ height: was[0] + 'px' }, { height: to + 'px' }], { duration: 280, easing: ease }).onfinish = () => { el.style.overflow = ''; };
      if (!was[1] && el.classList.contains('is-on')) el.querySelectorAll(':scope > .wd-thread, :scope > .wd-reply, :scope > .wd-thread ~ *').forEach(x => x.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 60, easing: ease, fill: 'backwards' }));
    });
  };
  /* the words the open comment is about, marked in the document and brought into view */
  const markFocus = (scrollTo) => {
    if (window.CSS?.highlights) CSS.highlights.delete('rqp-wc');
    const c = mxWComments(r).find(x => x.id === cmtFocus);
    if (!c || !docs[di] || c.doc !== docs[di].id || c.v !== vi + 1) return;
    const nodes = [], walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT); let text = '';
    while (walker.nextNode()) { const n = walker.currentNode; if (n.parentElement.closest('del')) continue; nodes.push([n, text.length]); text += n.data; }
    const at = text.indexOf(c.quote); if (at < 0) return;
    const loc = (i) => { for (let k = nodes.length - 1; k >= 0; k--) if (nodes[k][1] <= i) return [nodes[k][0], i - nodes[k][1]]; };
    const [sn, so] = loc(at), [en, eo] = loc(at + c.quote.length);
    const rg = new Range(); rg.setStart(sn, Math.min(so, sn.length)); rg.setEnd(en, Math.min(eo, en.length));
    if (window.CSS?.highlights && typeof Highlight !== 'undefined') CSS.highlights.set('rqp-wc', new Highlight(rg));
    if (scrollTo) { const top = rg.getBoundingClientRect().top; scroll.scrollTo({ top: scroll.scrollTop + top - scroll.getBoundingClientRect().top - 160, behavior: 'smooth' }); }
  };
  /* where in the text a comment sits, so the pane reads top to bottom like the document */
  const posIn = (c) => { const t = page.textContent || ''; const i = t.indexOf(c.quote); return i < 0 ? 1e9 : i; };
  const focusCmt = (c) => {
    cmtFocus = c.id;
    if (!docs[di] || docs[di].id !== c.doc || vi !== c.v - 1) { openRef({ doc: c.doc, v: c.v }); }
    paintCPanel(); setTimeout(() => markFocus(true), 60);
  };
  const curVi = () => vi;
  /* the comments, drawn the same way in two places: the pane beside the document, and the request's Comments tab
     (o.into: the tab's holder, o.di: which document, chosen with the switcher at its top) */
  const paintCPanel = (o = {}) => {
    const tabMode = !!o.into, T = o.into || cpanel;
    const d = tabMode ? docs[o.di] : docs[di]; if (!d || !T) return;
    const vi = tabMode ? d.versions.length - 1 : curVi();
    const repaint = () => tabMode ? paintCPanel(o) : paintCPanel();
    /* in the Comments tab a thread opens in place and its words are found in the document beside it, marked, scrolled to */
    const openC = (c) => wdMorph(T, () => {
      if (!tabMode) return focusCmt(c);
      cmtFocus = cmtFocus === c.id ? null : c.id;
      if (cmtFocus && (!docs[di] || docs[di].id !== c.doc || curVi() !== c.v - 1)) openRef({ doc: c.doc, v: c.v });
      else if (cmtFocus) grid.classList.add('show-doc');
      repaint(); setTimeout(() => markFocus(!!cmtFocus), 60);
    });
    const youOr2 = (n) => n === USER.name ? 'You' : n;
    const mine = mxWComments(r).filter(c => c.doc === d.id);
    /* who can be @mentioned: legal and the deal team, not you */
    const PEOPLE = [...new Set([...MX_LEGAL.map(p => p.name), ...mxPeople(r).map(p => p.name)])].filter(n => n && n !== USER.name);
    /* typing @ opens a list of people under the box; arrows, Enter or Tab, or a click puts the name in */
    const mentionize = (ta, after) => {
      let pop = null, at = 0, list = [];
      const shut = () => { pop?.remove(); pop = null; };
      const put = (n) => { const v = ta.value, caret = ta.selectionStart; const start = v.lastIndexOf('@', caret - 1);
        ta.value = v.slice(0, start) + '@' + n + ' ' + v.slice(caret); const pos = start + n.length + 2; ta.focus(); ta.setSelectionRange(pos, pos); shut(); ta.dispatchEvent(new Event('input')); after?.(); };
      const paint = () => { pop.replaceChildren(...list.map((n, i) => h('button', { class: 'wd-men-r' + (i === at ? ' is-at' : ''), type: 'button', onmousedown: (e) => { e.preventDefault(); put(n); } },
        mxFace(n, 'pb-av wd-men-av'), h('span', {}, n)))); };
      ta.addEventListener('input', () => {
        const m = /(?:^|\s)@([A-Za-z][A-Za-z'-]*(?: [A-Za-z'-]*)?)?$/.exec(ta.value.slice(0, ta.selectionStart));
        if (!m) return shut();
        const q = (m[1] || '').toLowerCase();
        list = PEOPLE.filter(n => !q || n.toLowerCase().startsWith(q) || n.toLowerCase().split(' ').some(w => w.startsWith(q))).slice(0, 6);
        if (!list.length) return shut();
        at = 0;
        if (!pop) { pop = h('div', { class: 'wd-men' }); document.body.append(pop); }
        paint();
        const rc = ta.getBoundingClientRect();
        pop.style.left = rc.left + 'px'; pop.style.top = (rc.bottom + 6) + 'px'; pop.style.width = Math.min(260, rc.width) + 'px';
      });
      ta.addEventListener('keydown', (e) => {
        if (!pop) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); at = (at + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length; paint(); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); put(list[at]); }
        else if (e.key === 'Escape') { e.stopImmediatePropagation(); shut(); }
      }, true);
      ta.addEventListener('blur', () => setTimeout(shut, 120));
    };
    const here = mine.filter(c => c.v === vi + 1).sort((a, b) => posIn(a) - posIn(b));
    const elsewhere = mine.filter(c => c.v !== vi + 1).sort((a, b) => b.v - a.v);
    const notes = onThis();
    /* the playbook analysis construct: a bar of where the comments stand, then search and one filter */
    const forMe = (c) => c.status !== 'closed' && c.to === USER.name;
    /* two filters, as in the playbook review: where a comment stands, and who it is with */
    const CF = [['all', 'All statuses', () => true], ['open', 'Open', (c) => c.status === 'open'], ['replied', 'Replied', (c) => c.status === 'replied'], ['closed', 'Resolved', (c) => c.status === 'closed']];
    const fOf = (k) => CF.find(x => x[0] === k) || CF[0];
    const whoOf = (c) => c.assignee || c.to || null;
    const whoOf2 = (c) => c.assignee || c.to;
    const whoPass = (c) => !cmtWho.size || cmtWho.has(whoOf2(c) || '__none');
    const qq = cmtQ.trim().toLowerCase();
    const vis = (c) => fOf(cmtF)[2](c) && whoPass(c) && (!qq || [c.by, c.to, c.text, c.quote, ...c.thread.map(t => t.text)].join(' ').toLowerCase().includes(qq));
    const closedN = mine.filter(c => c.status === 'closed').length;
    /* the same Word-style card as the Comments tab, so a comment looks the same wherever you meet it */
    const card = (c) => {
      const on = c.id === cmtFocus, onMe = c.status === 'open' && c.to === USER.name;
      const replies = c.thread.filter(t => !t.sys);
      /* yours can be edited or deleted: ⋯ on hover; editing turns the words into a box in place */
      const editBox = (obj, onSave) => {
        const ed = h('textarea', { class: 'wd-edit', rows: '1' }); ed.value = obj.text;
        const grow = () => { ed.style.height = 'auto'; ed.style.height = Math.min(ed.scrollHeight + 2, 200) + 'px'; };
        const keep = () => { const v = ed.value.trim(); if (v && v !== obj.text) { obj.text = v; obj.edited = mxNow(); r.updated = mxNow(); save(); } cmtEdit = null; repaint(); };
        ed.oninput = grow; ed.onclick = (e) => e.stopPropagation();
        ed.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); keep(); } if (e.key === 'Escape') { cmtEdit = null; repaint(); } };
        requestAnimationFrame(() => { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); grow(); });
        return h('div', { class: 'wd-editw', onclick: (e) => e.stopPropagation() }, ed,
          h('div', { class: 'wd-edit-bar' }, h('button', { class: 'rqp-cmtpop-txt', type: 'button', onclick: () => { cmtEdit = null; repaint(); } }, 'Cancel'),
            h('button', { class: 'pb-btn pb-btn--primary wd-edit-save', type: 'button', onclick: keep }, 'Save')));
      };
      const dots = (onEdit, onDelete) => { const b = h('button', { class: 'wd-dots', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions', html: PB_SVG.dots,
        onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(b, [{ label: 'Edit', icon: 'rename', run: onEdit }, { label: 'Delete', icon: 'trash', danger: true, run: onDelete }]); } }); return b; };
      const msg = (t) => {
        /* an event in the thread (an assignment), set in line with the replies' words, with a small mark of its own */
        if (t.sys) { const am = /^assigned this to (.+)$/.exec(t.text);
          return h('div', { class: 'wd-sys wd-event' }, h('span', { class: 'wd-event-box' },
            `${youOr2(t.who)} ${am ? 'assigned this to' : t.text.replace(/^Handed/, 'handed')}`, am ? h('b', {}, ' ' + am[1]) : null)); }
        const mineT = t.who === USER.name;
        /* deleting a reply takes the assignment it made with it: its "assigned this to" notes go, and the thread is back with whoever had it before */
        const delT = () => {
          const before = JSON.stringify({ thread: c.thread, status: c.status, to: c.to, at: c.at, assignee: c.assignee, hadAt: 'at' in c, hadAsg: 'assignee' in c });
          const at = c.thread.indexOf(t); let n = 1;
          while (c.thread[at + n]?.sys && /^assigned this to /.test(c.thread[at + n].text)) n++;
          c.thread.splice(at, n);
          const last = [...c.thread].reverse().find(x => x.sys && /^assigned this to /.test(x.text));
          if (last) { c.assignee = c.to = last.text.replace(/^assigned this to /, ''); }
          else if ('assignee' in c) { delete c.assignee; if ('at' in c) { c.to = c.at; delete c.at; } }
          if (c.status === 'replied' && !c.thread.some(x => !x.sys && x.who === USER.name)) c.status = 'open';
          if (!c.thread.some(x => !x.sys) && c.status === 'replied') c.status = 'open';
          save(); repaint(); paintCmtN();
          pbToast(n > 1 ? 'Reply and its assignment deleted' : 'Reply deleted', { label: 'Undo', run: () => {
            const b = JSON.parse(before); c.thread = b.thread; c.status = b.status; c.to = b.to;
            if (b.hadAt) c.at = b.at; else delete c.at; if (b.hadAsg) c.assignee = b.assignee; else delete c.assignee;
            save(); repaint(); paintCmtN(); } });
        };
        return h('div', { class: 'wd-msg is-reply' + (mineT ? ' is-own' : '') }, mxFace(t.who, 'pb-av wd-av'), h('div', { class: 'wd-mb' },
          h('div', { class: 'wd-mh' }, h('b', {}, youOr2(t.who)), h('span', { class: 'wd-when', 'data-tip': mxWhenTip(t) }, pbWhen(t.when) + (t.edited ? ' · edited' : '')),
            mineT && cmtEdit !== t ? dots(() => { cmtEdit = t; repaint(); }, delT) : null),
          cmtEdit === t ? editBox(t) : h('div', { class: 'wd-mt' }, t.text)));
      };
      const mineC = c.by === USER.name;
      /* hand the thread to someone else, or take the assignment off; it shows in the thread as a note, with Undo */
      const reassign = (n) => {
        if (n === c.assignee) return;
        const was = { assignee: c.assignee, to: c.to, n: c.thread.length };
        if (n) { c.assignee = n; c.thread.push({ sys: true, who: USER.name, text: `assigned this to ${n}`, when: mxNow() }); mxLog(r, { ev: 'assign', what: `assigned a comment on ${titleOf(d)} to ${n}`, ref: { doc: d.id, v: c.v } }); }
        else { delete c.assignee; c.thread.push({ sys: true, who: USER.name, text: 'unassigned this', when: mxNow() }); }
        save(); repaint(); paintCmtN();
        pbToast(n ? `Assigned to ${n === USER.name ? 'you' : n}` : 'Unassigned', { label: 'Undo', run: () => { if (was.assignee) c.assignee = was.assignee; else delete c.assignee; c.to = was.to; c.thread.length = was.n; if (n) (r.activity || []).pop(); save(); repaint(); paintCmtN(); } });
      };
      /* an assigned thread carries it across the top, as in Word: a circle to mark it done, and who has it */
      const band = c.assignee ? h('div', { class: 'wd-band' + (c.status === 'closed' ? ' is-done' : '') },
        h('button', { class: 'wd-band-ck', type: 'button', role: 'checkbox', 'aria-checked': String(c.status === 'closed'), 'data-tip': c.status === 'closed' ? 'Reopen' : 'Mark done',
          html: ICON('<path d="m6 12.5 4 4 8-9"/>', 10),
          onclick: (e) => { e.stopPropagation(); if (c.status === 'closed') wcSet(c, 'open'); else { wcSet(c, 'closed'); if (cmtFocus === c.id) cmtFocus = null; } repaint(); paintCmtN(); markFocus(); } }),
        h('span', { class: 'wd-band-t' }, 'Assigned to ', ((b) => b)(h('button', { class: 'wd-band-who', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'Change assignee',
          onclick: (e) => { e.stopPropagation(); const me = e.currentTarget; menu(me, [
            { label: 'Unassign', run: () => reassign(null) }, { rule: true },
            ...[USER.name, ...PEOPLE].map(n => ({ label: n === USER.name ? 'You' : n, tick: c.assignee === n, run: () => reassign(n) }))]); } },
          c.assignee === USER.name ? 'you' : [mxFace(c.assignee, 'pb-av wd-band-av'), c.assignee], h('span', { class: 'wd-asg-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) }))))) : null;
      /* the comment's own ⋯, as in Word: edit (yours), resolve or reopen the thread, delete the thread */
      const threadDots = () => { const b = h('button', { class: 'wd-dots', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions', html: PB_SVG.dots,
        onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(b, [
          mineC ? { label: 'Edit comment', icon: 'rename', run: () => { cmtEdit = c; if (cmtFocus !== c.id) openC(c); else repaint(); } } : null,
          c.status === 'closed'
            ? { label: 'Reopen thread', icon: 'retry', run: () => { wcSet(c, 'open'); repaint(); paintCmtN(); } }
            : { label: 'Resolve thread', icon: 'use', run: () => { wcSet(c, 'closed'); if (cmtFocus === c.id) cmtFocus = null; repaint(); paintCmtN(); markFocus(); } },
          { label: 'Delete thread', icon: 'trash', danger: true, run: delC }]); } }); return b; };
      const delC = () => { const list = mxWComments(r), at = list.indexOf(c); list.splice(at, 1); if (cmtFocus === c.id) cmtFocus = null; save(); repaint(); paintCmtN(); markFocus();
        pbToast('Thread deleted', { label: 'Undo', run: () => { list.splice(at, 0, c); save(); repaint(); paintCmtN(); } }); };
      const head = h('div', { class: 'wd-top' + (mineC ? ' is-own' : '') }, mxFace(c.by, 'pb-av wd-av'),
        h('div', { class: 'wd-mh' }, h('b', {}, youOr2(c.by)), h('span', { class: 'wd-when', 'data-tip': mxWhenTip(c) }, pbWhen(c.when).replace(/, \d\d:\d\d$/, '') + (c.edited ? ' · edited' : ''))),
        /* right edge: ⋯ (on hover), then the status, which is itself the way to change it */
        h('span', { class: 'pb-grow' }),
        cmtEdit !== c ? threadDots() : null,
        /* open is the default and shows nothing; Replied and Resolved show their mark */
        ((k, l) => { if (k === 'open') return null; const tg = h('button', { class: 'wd-st wd-tag wd-tag--ic is-' + k, type: 'button', 'aria-haspopup': 'menu', 'aria-label': `${l}. Change status`, 'data-tip': l,
          onclick: (e) => { e.stopPropagation(); menu(tg, [['open', 'Open'], ['replied', 'Replied'], ['closed', 'Resolved']].map(([v, lab]) => ({ label: lab, tick: c.status === v,
            run: () => { if (c.status === v) return; wcSet(c, v); if (v === 'closed' && cmtFocus === c.id) cmtFocus = null; repaint(); paintCmtN(); markFocus(); } }))); } },
          mxStMark(k)); return tg; })(...mxWcState(c)));
      const text = cmtEdit === c ? editBox(c) : h('div', { class: 'wd-t' }, ((at) => [at ? h('span', { class: 'wd-at' }, `@${at === USER.name ? 'You' : at}`) : null, at ? ' ' : null])('at' in c ? c.at : c.to), c.text);
      const ctx = [c.v !== vi + 1 ? `On v${c.v}` : null, replies.length ? mxPlural(replies.length, 'reply', 'replies') : null].filter(Boolean).join(' · ');
      if (!on) return h('div', { class: 'wd-card is-' + c.status + (band ? ' has-band' : ''), 'data-cid': c.id, role: 'button', tabindex: '0', onclick: () => openC(c), onkeydown: (e) => { if (e.key === 'Enter') openC(c); } },
        band, head, text, ctx ? h('div', { class: 'wd-ctx' }, ctx) : null);
      const box = c.status !== 'closed' ? h('textarea', { class: 'wd-in', rows: '1', placeholder: '@mention or reply', oninput: (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight + 2, 160) + 'px'; } }) : null;
      /* the reply box starts empty; a drafted answer is not put in for you (15 Oct) */
      if (box?.value) requestAnimationFrame(() => { box.style.height = 'auto'; box.style.height = Math.min(box.scrollHeight + 2, 160) + 'px'; });
      /* the reply is one more line in the thread: your face, a one-line box with send inside it, and Close */
      const send = () => {
        const t = box.value.trim(); if (!t) { box.focus(); return; }
        const handTo = asg.on && asg.who && mentionsIn(t).includes(asg.who) ? asg.who : null;
        wcReply(c, t);
        if (handTo) {
          if (!('at' in c)) c.at = c.to; c.to = handTo; c.assignee = handTo; c.status = 'open';   /* the whole thread is theirs now; the comment's own @mention stays as written */
          c.thread.push({ sys: true, who: USER.name, text: `assigned this to ${handTo}`, when: mxNow() });
          mxLog(r, { ev: 'assign', what: `assigned a comment on ${titleOf(d)} to ${handTo}`, ref: { doc: d.id, v: c.v } });
          save(); pbToast(`Assigned to ${handTo}. It’s with them now.`);
        }
        repaint(); paintCmtN();
      };
      if (box) box.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
      const sendB = box && h('button', { class: 'wd-send', type: 'button', 'aria-label': 'Reply', 'data-tip': 'Reply', disabled: !box.value.trim(), onclick: send,
        html: ICON('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 14) });
      if (box) box.addEventListener('input', () => { sendB.disabled = !box.value.trim(); });
      /* mention someone and the thread can be handed to them: Assign to, as in Word */
      const asg = { on: false, who: null };
      const mentionsIn = (t) => PEOPLE.filter(n => t.includes('@' + n));
      const asgChk = h('button', { class: 'wd-asg2-t', type: 'button', role: 'checkbox', 'aria-checked': 'false',
        onclick: () => { asg.on = !asg.on; paintAsg(); } }, h('span', { class: 'wd-asg2-ck', html: ICON('<path d="m6 12.5 4 4 8-9"/>', 10) }), 'Assign to');
      const asgWho = h('button', { class: 'wd-asg-who', type: 'button', 'aria-haspopup': 'menu',
        onclick: (e) => { e.stopPropagation(); menu(asgWho, mentionsIn(box.value).map(n => ({ label: n, tick: n === asg.who, run: () => { asg.who = n; asg.on = true; paintAsg(); } }))); } });
      /* Assign to sits inside the reply box: a toggle with the person beside it, along the bottom with send */
      const asgRow = h('div', { class: 'wd-asg2', hidden: true }, asgChk, asgWho);
      const paintAsg = () => {
        if (!box) return;
        const ms = mentionsIn(box.value); asgRow.hidden = !ms.length; box.closest('.wd-reply-box')?.classList.toggle('is-tall', !!ms.length); box.style.height = 'auto'; box.style.height = Math.min(box.scrollHeight + 2, 160) + 'px';
        if (!ms.includes(asg.who)) asg.who = ms[0] || null;
        asgChk.setAttribute('aria-checked', String(asg.on)); asgRow.classList.toggle('is-on', asg.on);
        asgWho.replaceChildren(...(asg.who ? [mxFace(asg.who, 'pb-av wd-men-av'), h('span', {}, asg.who.split(' ')[0]), ms.length > 1 ? h('span', { class: 'wd-asg-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) }) : null].filter(Boolean) : []));
        asgWho.disabled = ms.length < 2;
        requestAnimationFrame(threadLines);
      };
      if (box) { mentionize(box, paintAsg); box.addEventListener('input', paintAsg); }
      /* a resolved thread reopens from its ⋯ or its tick; no link of its own */
      const row = c.status === 'closed'
        ? null
        : h('div', { class: 'wd-msg is-reply wd-reply' }, mxFace(USER.name, 'pb-av wd-av'),
            h('div', { class: 'wd-reply-col' },
              h('div', { class: 'wd-reply-box', onclick: (e) => { if (e.target === e.currentTarget) box.focus(); } }, box,
                h('div', { class: 'wd-reply-bar' }, asgRow, sendB))));

      return h('div', { class: 'wd-card is-on is-' + c.status + (band ? ' has-band' : ''), 'data-cid': c.id },
        band, head, text,
        c.status === 'closed'
          ? [c.thread.length ? h('div', { class: 'wd-thread' }, ...c.thread.map(msg)) : null, row]
          : h('div', { class: 'wd-thread' }, ...c.thread.map(msg), row));
    };
    const noteCard = (a) => h('div', { class: 'rqp-cp-card is-note' },
      h('div', { class: 'rqp-cp-top' }, h('span', { class: 'rqp-cp-who' }, youOr2(a.who)), h('span', { class: 'rqp-cp-st' }, pbWhen(a.when))),
      h('div', { class: 'rqp-cp-t' }, a.what));
    const nb = h('textarea', { class: 'rqp-cp-in', rows: '1', placeholder: 'Start a conversation',
      oninput: (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight + 2, 160) + 'px'; } });
    /* a new comment is a Word comment like the rest: on the words you selected, kept in the .docx as well */
    const post = () => {
      const t = nb.value.trim(); if (!t) return;
      const who = MX_LEGAL.map(p => p.name).concat(mxPeople(r).map(p => p.name || p)).find(n => typeof n === 'string' && t.includes('@' + n));
      const c = { id: 'wc' + Date.now().toString(36), doc: d.id, v: vi + 1, clause: null, quote: cmtQuote, by: USER.name, to: who || null,
        text: who ? t.replace('@' + who, '').replace(/\s+/g, ' ').trim() : t, when: mxNow(), status: 'open', thread: [] };
      mxWComments(r).push(c);
      mxLog(r, { ev: 'event', what: `commented on v${vi + 1} of ${titleOf(d)}${cmtQuote ? `: “${cmtQuote.slice(0, 60)}${cmtQuote.length > 60 ? '…' : ''}”` : ''}`, ref: { doc: d.id, v: vi + 1 } });
      cmtQuote = ''; cmtFocus = c.id; r.updated = mxNow(); save();
      repaint(); paintCmtN(); setTimeout(() => markFocus(true), 60);
      pbToast('Comment added. It’s in the Word document too.');
    };
    nb.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(); } };
    mentionize(nb);
    const active = here.filter(c => c.status !== 'closed').length + elsewhere.filter(c => c.status !== 'closed').length;
    const segs = [['open', 'Open', mine.filter(c => c.status === 'open').length], ['replied', 'Replied', mine.filter(c => c.status === 'replied').length], ['closed', 'Resolved', closedN]];
    const segOn = (k) => cmtF === k;
    const bar = mine.length ? h('div', { class: 'rqp-cp-bar' }, ...segs.filter(x => x[2]).map(([k, t, n]) => h('button', { class: 'rqp-cp-seg is-' + k + (segOn(k) ? ' is-on' : ''), type: 'button',
      style: `flex-grow:${n}`, 'data-tip': `${n} ${t.toLowerCase()}`,
      onclick: () => { cmtF = segOn(k) ? 'all' : k; repaint(); } }, String(n)))) : null;
    /* a list hanging from a filter: its mark, the name, how many, a tick on the one chosen */
    const pop = (anchor, rows) => {
      document.querySelector('.rqp-fpop')?.remove();
      const el = h('div', { class: 'rqp-fpop', role: 'listbox' }, ...rows.map(rw => h('button', { class: 'rqp-fpop-r' + (rw.on ? ' is-on' : ''), type: 'button', role: 'option', 'aria-selected': String(!!rw.on), disabled: !rw.n && !rw.on && rw.k !== 'all' && rw.k !== 'any',
        onclick: () => { shut(); rw.run(); } }, rw.lead, h('span', { class: 'rqp-fpop-l' }, rw.label), h('span', { class: 'rqp-fpop-n' }, String(rw.n)),
        h('span', { class: 'rqp-fpop-ck', html: rw.on ? ICON('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 14) : '' }))));
      document.body.append(el);
      const rc = anchor.getBoundingClientRect();
      el.style.top = (rc.bottom + 6) + 'px'; el.style.left = Math.max(12, Math.min(rc.right - el.offsetWidth, innerWidth - el.offsetWidth - 12)) + 'px';
      const out = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) shut(); };
      const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } };
      function shut() { el.remove(); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); }
      addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
    };
    const STI = {
      active: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".6" fill="currentColor"/><circle cx="4" cy="12" r=".6" fill="currentColor"/><circle cx="4" cy="18" r=".6" fill="currentColor"/></svg>',
      all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".6" fill="currentColor"/><circle cx="4" cy="12" r=".6" fill="currentColor"/><circle cx="4" cy="18" r=".6" fill="currentColor"/></svg>',
      open: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5"/></svg>',
      replied: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 7 5 11.5 9.5 16"/><path d="M5 11.5h8.5a5 5 0 0 1 5 5V18"/></svg>',
      closed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>',
    };
    const stIc = (k) => h('span', { class: 'rqp-st-ic is-' + k, html: STI[k] });
    const chevI = () => h('span', { class: 'rqp-cp-fc', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) });
    const inWho = mine.filter(c => fOf(cmtF)[2](c));
    const names = [...new Set(mine.map(whoOf).filter(n => n && n !== USER.name))].sort();
    /* who it's with: several at once, with search — the people picker from the publish flow */
    const whoName = (k) => k === USER.name ? 'You' : k === '__none' ? 'Not assigned' : k;
    const whoChosen = [...cmtWho];
    const whoLabel = !whoChosen.length ? 'All assignees' : whoChosen.length === 1 ? whoName(whoChosen[0]).split(' ')[0]
      : whoChosen.length === 2 ? whoChosen.map(k => whoName(k).split(' ')[0]).join(', ') : `${whoName(whoChosen[0]).split(' ')[0]}, ${whoName(whoChosen[1]).split(' ')[0]} +${whoChosen.length - 2}`;
    const sBtn = h('button', { class: 'rqp-cp-f' + (cmtF !== 'all' ? ' is-set' : ''), type: 'button', 'aria-haspopup': 'listbox',
      onclick: (e) => { e.stopPropagation(); pop(sBtn, CF.map(([k, t, test]) => ({ k, lead: stIc(k), label: t, n: mine.filter(c => test(c) && whoPass(c)).length, on: cmtF === k, run: () => { cmtF = k; repaint(); } }))); } },
      cmtF === 'all' ? null : stIc(cmtF), fOf(cmtF)[1], chevI());   /* no mark for All statuses */
    const statusTabs = () => h('div', { class: 'pb-tabs rqp-cp-stabs', role: 'tablist' }, ...CF.map(([k, t, test]) => h('button', { class: 'pb-tab', type: 'button', role: 'tab',
      'aria-selected': String(cmtF === k), 'data-tip': k === 'all' ? null : t, onclick: () => { cmtF = k; repaint(); } }, k === 'all' ? null : stIc(k), k === 'all' ? 'All' : h('span', { class: 'rqp-stab-w' }, t), h('span', { class: 'pb-tab-n' }, String(mine.filter(c => test(c) && whoPass(c)).length)))));
    const whoRows = () => [[USER.name, USER.name], ...names.map(n => [n, n]), ...(mine.some(c => !whoOf2(c)) ? [['__none', 'Not assigned']] : [])]
      .map(([k, label]) => ({ k, label, n: inWho.filter(c => (whoOf2(c) || '__none') === k).length }));
    const whoPop = (anchor) => {
      document.querySelector('.rqp-fpop')?.remove();
      const q = h('input', { type: 'search', placeholder: 'Search assignees', 'aria-label': 'Search assignees', autocomplete: 'off' });
      const list = h('div', { class: 'rqp-wp-list', role: 'listbox', 'aria-multiselectable': 'true' });
      const el = h('div', { class: 'rqp-fpop rqp-wp' }, h('label', { class: 'rqp-wp-q' }, h('span', { html: ICON('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>', 14) }), q), list);
      const paint = () => {
        const term = q.value.trim().toLowerCase(), rows = whoRows().filter(rw => !term || rw.label.toLowerCase().includes(term));
        list.replaceChildren(
          ...(!term ? [h('button', { class: 'rqp-wp-r' + (!cmtWho.size ? ' is-on' : ''), type: 'button', role: 'option', 'aria-selected': String(!cmtWho.size),
            onclick: () => { cmtWho.clear(); after(); } }, h('span', { class: 'rqp-wp-cb', html: ICON('<path d="m6 12.5 4 4 8-9"/>', 11) }), h('span', { class: 'rqp-fpop-l' }, 'All assignees'), h('span', { class: 'rqp-fpop-n' }, String(inWho.length)))] : []),
          ...(rows.length ? rows.map(rw => h('button', { class: 'rqp-wp-r' + (cmtWho.has(rw.k) ? ' is-on' : ''), type: 'button', role: 'option', 'aria-selected': String(cmtWho.has(rw.k)),
            onclick: () => { cmtWho.has(rw.k) ? cmtWho.delete(rw.k) : cmtWho.add(rw.k); after(); } },
            h('span', { class: 'rqp-wp-cb', html: ICON('<path d="m6 12.5 4 4 8-9"/>', 11) }),
            rw.k === '__none' ? h('span', { class: 'rqp-st-ic is-all', html: STI.open }) : mxFace(rw.k, 'pb-av rqp-fpop-av'),
            h('span', { class: 'rqp-fpop-l' }, rw.label, rw.k === USER.name ? h('span', { class: 'rqp-wp-you' }, ' (you)') : null), h('span', { class: 'rqp-fpop-n' }, String(rw.n))))
            : [h('div', { class: 'rqp-wp-none' }, `No one matches “${q.value.trim()}”`)]));
      };
      /* the list stays open while you choose; the comments behind it follow each tick */
      const after = () => { repaint(); paint(); place(); };
      const place = () => { const btn = T.querySelector('.rqp-cp-who') || anchor, rc = btn.getBoundingClientRect(); el.style.top = (rc.bottom + 6) + 'px'; el.style.left = Math.max(12, Math.min(rc.right - el.offsetWidth, innerWidth - el.offsetWidth - 12)) + 'px'; };
      q.oninput = paint;
      document.body.append(el); paint(); place(); requestAnimationFrame(() => q.focus());
      const out = (e) => { if (!el.contains(e.target) && !e.target.closest?.('.rqp-cp-who')) shut(); };
      const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } };
      function shut() { el.remove(); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc, true); }
      addEventListener('mousedown', out, true); addEventListener('keydown', esc, true);
    };
    const wBtn = h('button', { class: 'rqp-cp-f rqp-cp-who' + (cmtWho.size ? ' is-set' : ''), type: 'button', 'aria-haspopup': 'listbox',
      onclick: (e) => { e.stopPropagation(); if (document.querySelector('.rqp-wp')) { document.querySelector('.rqp-wp').remove(); return; } whoPop(wBtn); } },
      /* nobody chosen: a people mark (the words are in the tooltip); chosen: their faces and names */
      whoChosen.length ? h('span', { class: 'rqp-wp-stack' }, ...whoChosen.slice(0, 3).map(k => k === '__none' ? h('span', { class: 'rqp-st-ic is-all', html: STI.open }) : mxFace(k, 'pb-av rqp-fpop-av')))
        : h('span', { class: 'rqp-cp-who-ic', html: ICON('<circle cx="12" cy="9" r="3.2"/><path d="M6.5 18.5a5.5 5.5 0 0 1 11 0"/>', 13) }),
      whoChosen.length ? whoLabel : null, chevI());
    wBtn.dataset.tip = whoChosen.length ? 'Assignees' : 'All assignees'; wBtn.setAttribute('aria-label', whoChosen.length ? `Assignees: ${whoLabel}` : 'All assignees');
    const qIn = h('input', { type: 'search', placeholder: 'Search', value: cmtQ, 'aria-label': 'Search comments',
      oninput: (e) => { cmtQ = e.target.value; const at = e.target.selectionStart; repaint(); const n = T.querySelector('.rqp-cp-q input'); n.focus(); n.setSelectionRange(at, at); } });
    const shown = here.filter(vis).length + elsewhere.filter(vis).length;
    /* the Comments tab: which document's comments, and how many are still open on each */
    const docSwitch = () => {
      const openOn = (x) => mxWComments(r).filter(c => c.doc === x.id && c.status !== 'closed').length;
      const btn = h('button', { class: 'rqp-cp-doc', type: 'button', 'aria-haspopup': 'menu',
        onclick: (e) => { e.stopPropagation(); menu(btn, docs.map((x, i) => ({ label: shortOf(x), key: String(openOn(x) || ''), tick: i === o.di,
          run: () => { o.di = i; MX.intake.cmtDoc = i; cmtFocus = null; repaint(); } }))); } },
        mxTile('file', mxExt(d.title)), h('span', { class: 'rqp-cp-doc-n' }, shortOf(d)), h('span', { class: 'rqp-cp-doc-v' }, `v${d.versions.length}`),
        h('span', { class: 'wd-asg-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 13) }));
      return btn;
    };
    /* a new comment on the words you selected: a card at the top, with the same composer as a reply */
    const draftCard = () => {
      if (!cmtQuote && !cmtDraft) return null;
      const ta = h('textarea', { class: 'wd-in', rows: '1', placeholder: '@mention or comment',
        oninput: (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight + 2, 160) + 'px'; } });
      const asg = { on: false, who: null };
      const mentionsIn = (t) => PEOPLE.filter(n => t.includes('@' + n));
      const chk = h('button', { class: 'wd-asg2-t', type: 'button', role: 'checkbox', 'aria-checked': 'false', onclick: () => { asg.on = !asg.on; paint(); } },
        h('span', { class: 'wd-asg2-ck', html: ICON('<path d="m6 12.5 4 4 8-9"/>', 10) }), 'Assign to');
      const who = h('button', { class: 'wd-asg-who', type: 'button', 'aria-haspopup': 'menu',
        onclick: (e) => { e.stopPropagation(); menu(who, mentionsIn(ta.value).map(n => ({ label: n, tick: n === asg.who, run: () => { asg.who = n; asg.on = true; paint(); } }))); } });
      const asgRow = h('div', { class: 'wd-asg2', hidden: true }, chk, who);
      const sendB = h('button', { class: 'wd-send', type: 'button', 'aria-label': 'Comment', 'data-tip': 'Comment', disabled: true, html: ICON('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 14) });
      const boxEl = h('div', { class: 'wd-reply-box', onclick: (e) => { if (e.target === e.currentTarget) ta.focus(); } }, ta, h('div', { class: 'wd-reply-bar' }, asgRow, sendB));
      const paint = () => {
        const ms = mentionsIn(ta.value); asgRow.hidden = !ms.length; boxEl.classList.toggle('is-tall', !!ms.length);
        ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 160) + 'px';
        if (!ms.includes(asg.who)) asg.who = ms[0] || null;
        chk.setAttribute('aria-checked', String(asg.on)); asgRow.classList.toggle('is-on', asg.on);
        who.replaceChildren(...(asg.who ? [mxFace(asg.who, 'pb-av wd-men-av'), h('span', {}, asg.who.split(' ')[0]), ms.length > 1 ? h('span', { class: 'wd-asg-c', html: ICON('<path d="m7 10 5 5 5-5"/>', 12) }) : null].filter(Boolean) : []));
        who.disabled = ms.length < 2; sendB.disabled = !ta.value.trim();
      };
      const cancel = () => { cmtQuote = ''; cmtDraft = false; CSS.highlights?.delete('rqp-draft'); repaint(); };
      const send = () => {
        const t = ta.value.trim(); if (!t) return ta.focus();
        const at = mentionsIn(t)[0] || null, handTo = asg.on && asg.who ? asg.who : null;
        const c = { id: 'wc' + Date.now().toString(36), doc: d.id, v: vi + 1, clause: null, quote: cmtQuote, by: USER.name, to: at,
          text: at ? t.replace('@' + at, '').replace(/\s+/g, ' ').trim() : t, when: mxNow(), status: 'open', thread: [], ...(handTo ? { assignee: handTo } : {}) };
        if (handTo) c.thread.push({ sys: true, who: USER.name, text: `assigned this to ${handTo}`, when: mxNow() });
        mxWComments(r).push(c);
        mxLog(r, { ev: 'event', what: `commented on v${vi + 1} of ${titleOf(d)}${cmtQuote ? `: “${cmtQuote.slice(0, 60)}${cmtQuote.length > 60 ? '…' : ''}”` : ''}`, ref: { doc: d.id, v: vi + 1 } });
        cmtQuote = ''; cmtDraft = false; CSS.highlights?.delete('rqp-draft'); cmtFocus = c.id; r.updated = mxNow(); save();
        repaint(); paintCmtN(); setTimeout(() => markFocus(true), 60);
        pbToast(handTo ? `Comment added and assigned to ${handTo}` : 'Comment added. It’s in the Word document too.');
      };
      sendB.onclick = send;
      ta.addEventListener('input', paint);
      ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') { e.stopPropagation(); cancel(); } };
      mentionize(ta, paint);
      requestAnimationFrame(() => ta.focus());
      return h('div', { class: 'wd-card is-on is-draft' },
        h('div', { class: 'wd-top' }, mxFace(USER.name, 'pb-av wd-av'), h('div', { class: 'wd-mh' }, h('b', {}, 'You')), h('span', { class: 'pb-grow' }),
          h('button', { class: 'wd-dots wd-draft-x', type: 'button', 'aria-label': 'Discard', 'data-tip': 'Discard', html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 13), onclick: cancel })),
        h('div', { class: 'wd-draft-box' }, boxEl));
    };
    T.replaceChildren(...[
      tabMode ? null : h('div', { class: 'rqp-cp-head' }, h('b', {}, 'Comments'), h('span', { class: 'pb-grow' }),
        /* in place of a close: start a comment (closing stays on ← and the comments button in the document bar) */
        h('button', { class: 'rqp-cp-add', type: 'button', onclick: () => { cmtDraft = true; cmtQuote = ''; repaint(); requestAnimationFrame(() => { const L = T.querySelector('.rqp-cp-list'); if (L) L.scrollTop = L.scrollHeight; T.querySelector('.wd-card.is-draft .wd-in')?.focus(); }); } },
          h('span', { html: ICON('<path d="M12 6v12M6 12h12"/>', 13) }), 'Comment')),
      /* status as tabs (All · Open · Replied · Resolved, with counts) and who it's with as one dropdown; in the Comments tab the document name sits above */
      mine.length || tabMode ? h('div', { class: 'rqp-cp-tools' },   /* no summary bar (15 Oct): the status tabs carry the counts */
        /* Comments tab: the document and who it's with on one line, the status tabs tight under it — one block, nothing left hanging */
        /* the Comments tab header is one unit: the document on the left, its two filters grouped on the right */
        tabMode ? h('div', { class: 'rqp-cp-row rqp-cp-row1' }, docSwitch(), h('span', { class: 'pb-grow' }), mine.length ? h('span', { class: 'rqp-cp-fg' }, sBtn, wBtn) : null) : null,
        !tabMode && mine.length ? h('div', { class: 'rqp-cp-row rqp-cp-row2' }, statusTabs(), h('span', { class: 'pb-grow' }), wBtn) : null) : null,
      h('div', { class: 'rqp-cp-list' },
        tabMode || !cmtQuote ? null : draftCard(),
        ...here.filter(vis).map(card),
        ...(elsewhere.filter(vis).length ? [h('div', { class: 'rqp-cp-sec' }, 'On other versions'), ...elsewhere.filter(vis).map(card)] : []),
        /* + Comment opens its box at the foot of the list */
        tabMode || cmtQuote ? null : draftCard(),
        /* the empty state steps aside while a first comment is being written, and returns if it is cancelled */
        !mine.length && !cmtQuote && !cmtDraft ? h('div', { class: 'rqp-cp-empty' },
          h('span', { class: 'rqp-cp-empty-ic', html: ICON('<path d="M6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.3a.5.5 0 0 1-.8-.4v-2.9h.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/>', 18) }),
          h('b', {}, 'No comments yet'),
          h('p', {}, 'Select any words in the document and choose Comment.')) : null,
        mine.length > 0 && !shown ? h('p', { class: 'rqp-cp-none' }, qq ? `Nothing matches “${cmtQ.trim()}”.` : cmtWho.size ? 'No threads match these filters.' : ({ open: 'No open threads.', replied: 'No replied threads.', closed: 'No resolved threads.' })[cmtF] || 'No comments.') : null),
      /* no box at the bottom (15 Oct): a comment starts from words you select in the document */
      /* Playbook and Ask open the playbook review of this document; Comments is here */
      tabMode ? null : ((has) => h('div', { class: 'rqp-cp-tabs' }, ...[['playbook', 'Playbook'], ['ask', 'Ask Clavia'], ['comments', 'Comments']].map(([k, label]) =>
        h('button', { type: 'button', 'aria-selected': String(k === 'comments'), disabled: k !== 'comments' && !has,
          'data-tip': k !== 'comments' && !has ? 'No playbook review of this document yet' : null,
          onclick: () => { if (k === 'comments') return; MX.intake.roundTab = k; MX.intake.swap = true; openReview(d.id); } },
          k === 'ask' ? quillEl('static', { cls: 'rqp-tab-q' }) : h('span', { html: MX_TAB_ICONS[k] }), label))))(!!mxRoundOf(r, d.id))].filter(Boolean));
    /* replies hang off the comment: a line from its author's face curves into each reply */
    /* one trunk from the comment's face down to the last reply; each reply curves off it into its own face */
    const threadLines = () => T.querySelectorAll('.wd-card.is-on .wd-thread').forEach(th => {
      const av = th.closest('.wd-card').querySelector('.wd-top .wd-av'), rows = [...th.querySelectorAll(':scope > .wd-msg.is-reply')];
      if (!av || !rows.length) return;
      const top = th.getBoundingClientRect().top, a = av.getBoundingClientRect();
      rows.forEach((rw, i) => { const f = rw.querySelector('.wd-av').getBoundingClientRect(); rw.style.setProperty('--c', (f.top + f.height / 2 - rw.getBoundingClientRect().top) + 'px'); rw.classList.toggle('no-hook', i < rows.length - 1); });   /* only the last row branches off the line */
      const lf = rows[rows.length - 1].querySelector('.wd-av').getBoundingClientRect();
      th.style.setProperty('--t-top', (a.bottom + 4 - top) + 'px');
      th.style.setProperty('--t-h', Math.max(0, lf.top + lf.height / 2 - 10 - (a.bottom + 4)) + 'px');
      th.style.setProperty('--t-x', (a.left + a.width / 2 - th.getBoundingClientRect().left - 0.75) + 'px');
    });
    requestAnimationFrame(threadLines);
    /* no line under the tools; a soft shadow only once the list has scrolled under them */
    ((L, tools) => { if (!L || !tools) return; const f = () => tools.classList.toggle('is-scrolled', L.scrollTop > 2); L.addEventListener('scroll', f, { passive: true }); f(); })(T.querySelector('.rqp-cp-list'), T.querySelector('.rqp-cp-tools'));
    T.querySelectorAll('.wd-card.is-on .wd-in, .wd-card.is-on .wd-edit').forEach(t => t.addEventListener('input', () => requestAnimationFrame(threadLines)));
  };
  const openComments = () => {
    if (document.querySelector('.rqp-cmtpop')) { document.querySelector('.rqp-cmtpop').remove(); return; }
    const d = docs[di], v = d.versions[vi];
    const box = h('textarea', { class: 'rqp-cmtpop-in', rows: '1', placeholder: `Add a comment on v${vi + 1}…` });
    const send = h('button', { class: 'rqp-cmtpop-send', type: 'button', disabled: true, 'aria-label': 'Post comment', html: ICON('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 13) });
    const list = h('div', { class: 'rqp-cmtpop-list' });
    const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
    let editing = null;
    const refreshAll = () => { paintList(); paintCmtN(); if (tab !== 'docs') paintBody(); };
    const item = (a) => {
      const mine = a.who === USER.name;
      if (editing === a) {
        const ed = h('textarea', { class: 'rqp-cmtpop-edit', rows: '2' }); ed.value = a.what;
        const keep = () => { const t = ed.value.trim(); if (t && t !== a.what) { a.what = t; a.edited = true; r.updated = mxNow(); save(); } editing = null; refreshAll(); };
        ed.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); keep(); } if (e.key === 'Escape') { editing = null; paintList(); } };
        ed.oninput = () => grow(ed);
        requestAnimationFrame(() => { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); grow(ed); });
        return h('div', { class: 'rqp-cmtpop-it is-editing' }, mxFace(a.who, 'rqp-cmtpop-av'),
          h('div', { class: 'rqp-cmtpop-b' }, ed,
            h('div', { class: 'rqp-cmtpop-edbar' },
              h('button', { class: 'rqp-cmtpop-txt', type: 'button', onclick: () => { editing = null; paintList(); } }, 'Cancel'),
              h('button', { class: 'rqp-cmtpop-txt is-strong', type: 'button', onclick: keep }, 'Save'))));
      }
      const acts = mine ? h('span', { class: 'rqp-cmtpop-acts' },
        h('button', { class: 'rqp-cmtpop-ic', type: 'button', 'aria-label': 'Edit comment', 'data-tip': 'Edit', html: ICON('<path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z"/>', 13),
          onclick: () => { editing = a; paintList(); } }),
        h('button', { class: 'rqp-cmtpop-ic', type: 'button', 'aria-label': 'Delete comment', 'data-tip': 'Delete', html: ICON('<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2l1-12M9.5 7V4.5h5V7"/>', 13),
          onclick: () => {
            const k = r.activity.indexOf(a); if (k < 0) return;
            r.activity.splice(k, 1); r.updated = mxNow(); save(); refreshAll();
            pbToast('Thread deleted', { label: 'Undo', run: () => { r.activity.splice(k, 0, a); save(); if (document.body.contains(list)) refreshAll(); else { paintCmtN(); paintBody(); } } });
          } })) : null;
      return h('div', { class: 'rqp-cmtpop-it' }, mxFace(a.who, 'rqp-cmtpop-av'),
        h('div', { class: 'rqp-cmtpop-b' },
          h('div', { class: 'rqp-cmtpop-h' }, h('b', {}, mine ? 'You' : a.who), h('span', {}, pbWhen(a.when) + (a.edited ? ' · edited' : '')), acts),
          h('div', { class: 'rqp-cmtpop-t' }, a.what)));
    };
    const paintList = () => {
      const xs = onThis();
      list.classList.toggle('is-empty', !xs.length);
      /* nothing said yet: no empty state, just the box to say it */
      list.hidden = !xs.length;
      list.replaceChildren(...xs.map(item));
      if (xs.length) list.scrollTop = list.scrollHeight;
    };
    const post = () => {
      const t = box.value.trim(); if (!t) return;
      add({ kind: 'note', what: t, ref: { doc: d.id, v: vi + 1 } });
      box.value = ''; send.disabled = true; grow(box); refreshAll();
    };
    box.oninput = () => { send.disabled = !box.value.trim(); grow(box); };
    box.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(); } if (e.key === 'Escape') shut(); };
    send.onclick = post;
    const pop = h('div', { class: 'rqp-cmtpop', role: 'dialog', 'aria-label': 'Comments on this version' },
      h('div', { class: 'rqp-cmtpop-top' },
        h('div', { class: 'rqp-cmtpop-ttl' }, h('b', {}, 'Comments')),
        h('button', { class: 'rqp-cmtpop-ic rqp-cmtpop-x', type: 'button', 'aria-label': 'Close', html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 13), onclick: () => shut() })),
      list,
      h('div', { class: 'rqp-cmtpop-new' }, h('div', { class: 'rqp-cmtpop-field' }, box, send)));
    document.body.append(pop);
    const b0 = cmtBtn.getBoundingClientRect();
    pop.style.top = (b0.bottom + 8) + 'px';
    pop.style.left = Math.max(12, Math.min(b0.right - 360, innerWidth - 372)) + 'px';
    paintList();
    requestAnimationFrame(() => box.focus());
    const out = (ev) => { if (!pop.contains(ev.target) && !cmtBtn.contains(ev.target) && !ev.target.closest('.pb-toast, .toast')) shut(); };
    function shut() { pop.remove(); removeEventListener('mousedown', out, true); }
    addEventListener('mousedown', out, true);
  };
  const upBtn = h('button', { class: 'rqp-tool rqp-tool--icon', type: 'button', 'data-tip': 'Upload', 'aria-label': 'Upload', html: ICON('<path d="M12 15.5V3.5M8 7.5l4-4 4 4"/><path d="M4 14v5a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-5"/>'),
    onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(upBtn, [
      { label: `New Version of ${titleOf(docs[di])}`, icon: 'retry', run: () => upload(false) },
      { label: 'Add Another Document', icon: 'files', run: () => upload(true) }]); } });
  let right;
  const ingesting = (r.ingesting || []).length;
  if (docs.length) {
    right = h('section', { class: 'rqp-right' },
      h('header', { class: 'rqp-bar' },
        h('div', { class: 'rqp-bar-l' }, h('button', { class: 'rqp-back rqp-back--ic', type: 'button', 'data-tip': 'Back to the request', 'aria-label': 'Back to the request', onclick: () => showPanel(false) },
          h('span', { html: ICON('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15) })), docBtn, verBtn),
        h('div', { class: 'rqp-bar-r' },
          cmtBtn,
          tool('Download', h('span', { html: ICON('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17"/>') }), () => { giveFile(); pbToast('Downloading'); }, 'rqp-tool--icon'),
          tool('Email with Outlook', h('img', { src: 'assets/brand/outlook.svg', alt: '' }), emailDoc, 'rqp-tool--icon'),
          tool('Open in Word', h('img', { src: 'assets/brand/word.svg', alt: '' }), giveFile, 'rqp-tool--word'),
          /* the document folds away, and the request takes the whole page */
          h('button', { class: 'rqp-fold', type: 'button', 'aria-label': 'Close the document', 'data-tip': 'Close',
            html: ICON('<path d="M6 6l12 12M18 6 6 18"/>', 16),
            onclick: () => { if (right.classList.contains('has-cmts')) showPanelNow(false); state.rqDocHidden = true; save(); grid.classList.add('is-doc-hidden'); } }))),
      h('div', { class: 'rqp-docbody' }, scroll, cpanel));
    if (state.rqCmtPanel) right.classList.add('has-cmts');
    paintDoc();
  } else if (ingesting) {
    right = h('section', { class: 'rqp-right rqp-right--empty' }, h('div', { class: 'rqp-none' }, quillEl('work', { cls: 'mx-pass-q' }), h('b', {}, `Reading ${r.ingesting[0]}`), h('p', {}, 'It shows here in a moment.')));
  } else {
    const fp = mxFirstPass(r);
    right = h('section', { class: 'rqp-right rqp-right--empty' },
      h('div', { class: 'rqp-none' },
        h('span', { class: 'rqp-none-ic' }, mxTile('file', 'doc')),
        h('b', {}, r.type === 'Advice' ? 'A question, not a document' : 'No document yet'),
        h('p', {}, r.type === 'Advice' ? 'Nothing to preview here. The answer goes back to ' + first + ' as a reply.'
          : fp.action.reply ? `${r.counterparty || 'Their'}’s draft has not arrived. Ask ${first} for it, or upload it yourself.` : `Draft it from the ${tpl ? tpl.name + ' template' : 'template'}, or upload one, and it shows here with every version after it.`),
        h('div', { class: 'rqp-none-go' },
          r.type === 'Advice' ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => fp.action.run() }, fp.action.label)
          : fp.action.reply ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { setTab('activity'); box.value = fp.action.reply; mode = 'reply'; paintMode(); send.disabled = false; box.focus(); } }, fp.action.label)
          : h('button', { class: 'btn btn--primary', type: 'button', onclick: () => fp.action.run() }, fp.action.label),
          r.type !== 'Advice' ? h('button', { class: 'btn', type: 'button', onclick: () => upload(true) }, 'Upload a Document') : '')));
  }

  grid = h('div', { class: 'rqp' + (state.rqCmtPanel && docs.length && CMT_FOCUS ? ' is-cmt-focus' : '') + (MX.intake.swap ? ' is-swap' : '') }, left, right);
  /* opened straight into comments: laid out folded from the first frame, so nothing slides shut */
  if (state.rqCmtPanel && docs.length && CMT_FOCUS) grid.style.gridTemplateColumns = '0px minmax(0, 1fr)';
  if (MX.intake.swap) setTimeout(() => grid?.classList.remove('is-swap'), 450);
  MX.intake.swap = false;
  /* on a narrow page the document opens over the details instead of beside them */
  docOpen.onclick = () => {
    /* wide: unfold it beside the page; narrow: open it over the page */
    if (grid.classList.contains('is-doc-hidden')) { state.rqDocHidden = false; save(); grid.classList.remove('is-doc-hidden'); }
    else grid.classList.add('show-doc');
  };
  if (state.rqDocHidden || embed) grid.classList.add('is-doc-hidden');
  /* in the inbox the document opens on the full request page, where it has room */
  if (embed) docOpen.onclick = () => mxOpen('intake', r.id);
  /* the line between the request and the document moves where you drag it, and stays there */
  const split = h('div', { class: 'rqp-split', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Resize the panes', title: 'Drag to resize' });
  const setSplit = (px) => { const w = grid.getBoundingClientRect().width; const x = Math.max(360, Math.min(px, w - 380)); grid.style.gridTemplateColumns = `${x}px minmax(0, 1fr)`; split.style.left = x + 'px'; return x; };
  split.addEventListener('pointerdown', (e) => {
    e.preventDefault(); split.setPointerCapture(e.pointerId);
    grid.classList.add('is-dragging');
    const left0 = grid.getBoundingClientRect().left;
    const move = (ev) => { state.rqSplit = setSplit(ev.clientX - left0); };
    const up = () => { grid.classList.remove('is-dragging'); split.removeEventListener('pointermove', move); split.removeEventListener('pointerup', up); save(); };
    split.addEventListener('pointermove', move); split.addEventListener('pointerup', up);
  });
  split.addEventListener('dblclick', () => { state.rqSplit = null; save(); grid.style.gridTemplateColumns = ''; split.style.left = ''; });
  grid.append(split);
  if (state.rqSplit) requestAnimationFrame(() => setSplit(state.rqSplit));
  if (state.rqCmtPanel && right?.classList.contains('has-cmts')) requestAnimationFrame(fitCmts);
  if (mxPaperless(r)) grid.classList.add('is-paperless');
  right.querySelector('.rqp-bar-l, .rqp-none')?.prepend(h('button', { class: 'rqp-doc-back', type: 'button', onclick: () => grid.classList.remove('show-doc') },
    h('span', { html: ICON('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15) }), 'Details'));
  const el = h('div', { class: 'rqp-host' + (embed ? ' is-embed' : '') }, grid);
  if (embed) { split.remove(); grid.querySelector('.br-top-r')?.append(h('button', { class: 'pbv-icon rqp-emb-open', type: 'button', 'aria-label': 'Open full request', 'data-tip': 'Open Full Request',
    html: ICON('<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>', 15), onclick: () => mxOpen('intake', r.id) })); }
  /* the body is drawn now; only the underline waits for the tabs to have a width */
  for (const b of tabBtns) b.setAttribute('aria-selected', String(b.dataset.k === tab));
  paintBody();
  requestAnimationFrame(placeInk); setTimeout(placeInk, 120);
  dropOn(body, () => null, null, () => (tab === 'docs' && !reviewing) || tab === 'summary');
  if (right) dropOn(right, () => docs[di] && !docs[di].versions[vi]?.cmp ? docs[di] : null,
    (t) => { right.dataset.drop = t ? `Drop to upload v${t.versions.length + 1} of ${shortOf(t).replace(/\.\w+$/, '')}` : 'Drop to add a document'; });
  /* the gap between tabs tightens as the pane narrows (splitter, document pane, window): the underline follows */
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => placeInk()); ro.observe(tabs); ro.observe(left); tabBtns.forEach(b => ro.observe(b)); }
  document.fonts?.ready.then(placeInk);
  return el;
}

function intakeView() {
  const list = mxIntake();
  /* asking with AI is a chat, with the request as its artifact; demo is a finished one */
  if (['new', 'demo', 'selfserve'].includes(MX.intake.open)) { const k = MX.intake.open; MX.intake.open = null; setTimeout(() => (k === 'demo' ? rqDemo : k === 'selfserve' ? rqSelfDemo : rqStartChat)(), 0); }
  if (INTAKE_FX.rules && MX.intake.open === 'rules') return mxRulesPage();
  /* #intake/RQ-1049/comments: the request opened on its main document, with the comments pane open */
  /* #intake/showcase/comments finds the Brightwell request whatever number it has in this browser */
  const cm = /^(RQ-\d+|showcase)\/comments$/.exec(MX.intake.open || '');
  if (cm) { MX.intake.open = cm[1] === 'showcase' ? mxData().showcaseId : cm[1]; state.rqCmtPanel = true; state.rqDocHidden = false; save(); MX.intake.tab = 'docs'; MX.intake.focus = { title: 'Master Services Agreement', v: 99 }; }
  const asRequester = INTAKE_FX.portal && /^(RQ-\d+)\/requester$/.exec(MX.intake.open || '');
  if (asRequester) { const x = list.find(r => r.id === asRequester[1]); if (x) return mxRequesterPage(x); }
  const opened = MX.intake.open && list.find(r => r.id === MX.intake.open);
  if (opened && MX.intake.round) return mxRoundPage(opened, MX.intake.round);
  if (opened) return intakePage(opened);
  MX.intake.open = null;
  const st = MX.intake.list;
  const order = { new: 0, progress: 1, waiting: 2, done: 3, cancelled: 4 };
  const open = () => list.filter(r => !mxClosed(r));
  /* views: Open (the default) and its slices, then All, which includes what's done */
  const isOpen = (r) => !mxClosed(r);
  const TABS = [{ k: 'open', label: 'Open', in: isOpen },
    { k: 'unassigned', label: 'Unassigned', in: (r) => isOpen(r) && !r.attorney && !r.resolvedBy },
    { k: 'mine', label: 'Assigned to Me', in: (r) => isOpen(r) && r.attorney === USER.name },
    ...(INTAKE_FX.following ? [{ k: 'following', label: 'Following', in: (r) => isOpen(r) && !!r.followed && r.attorney !== USER.name }] : []),
    { k: 'approve', label: 'Needs My Approval', in: (r) => isOpen(r) && mxAwaitsMe(r) },
    /* the matters: requests that turned into longer work (matters.js) */
    ...(typeof moOverview === 'function' ? [
      { k: 'matters', label: 'Matters', in: (r) => isOpen(r) && !!r.mt },
      { k: 'needs', label: 'Needs You', body: () => moOverview(moData()), n: () => moNeeds(moData()).length },
      { k: 'mtasks', label: 'Tasks', body: () => moTasksView(moData()), n: () => moOpenMatters().flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name)).length },
      { k: 'dates', label: 'Key Dates', body: () => moDatesView(moData()), n: () => moOpenMatters().flatMap(m => moUpcoming(m)).length }] : [])];
  if (!st.viewV) { if (st.tab === 'all') st.tab = 'open'; st.viewV = 1; }
  const everything = () => list;
  const TABOF = (r) => !r.attorney && !r.resolvedBy ? 'unassigned' : r.attorney === USER.name ? 'mine' : 'others';
  /* the head both views share: settings, the view toggle, and New Request */
  const head = () => h('div', { class: 'mx-head-ctas' },
    INTAKE_FX.rules ? h('button', { class: 'pbv-icon mx-rules-btn', type: 'button', 'aria-label': 'Intake settings', 'data-tip': 'Intake Settings', html: MI(GLYPHS.gear), onclick: () => stGo('channels') }) : null,
    typeof mxViewToggle === 'function' ? mxViewToggle() : null,
    mxCta('New Request', (btn, keyboard) => pbWaysMenu(btn, 'mx-rq-new', [
      { key: 'ai', name: 'Submit with AI', desc: 'Say what you need in your own words, and Clavia fills in the request.',
        icon: () => quillEl('static', { cls: 'pb-way-quill' }) },
      { key: 'form', name: 'Fill in a form', desc: 'Answer a few short questions about the work and the deal.',
        icon: () => { const w = h('span', { html: MX_FORM_IC }); return w.firstChild; } },
      ...(typeof moBlank === 'function' ? [{ key: 'matter', name: 'Start a matter', desc: 'For bigger work: tasks, key dates, decisions and money from the start.',
        icon: () => h('span', { html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>' }) }] : []),
    ], (k) => k === 'ai' ? rqStartChat() : k === 'matter' ? moBlank() : requestForm(), { keyboard }), true));
  const FILTERS = [
      { key: 'type', label: 'Type', of: (r) => r.type, order: (v) => MX_RQ_TYPES.indexOf(v) },
      { key: 'attorney', label: INTAKE_FX.columns === 'v2' ? 'Assigned to' : 'Attorney', of: (r) => r.attorney || '', none: 'Unassigned',
        mark: (v) => v ? mxFace(v, 'pb-av mx-fpop-av') : h('span', { class: 'mx-fpop-none mx-fpop-av', 'aria-hidden': 'true' }),
        label_of: (v) => v && v === USER.name ? `${v} (You)` : v,
        order: (v) => !v ? -2 : v === USER.name ? -1 : MX_ATTORNEYS.indexOf(v) },   // Unassigned, then you, then the team
      { key: 'submitter', label: INTAKE_FX.columns === 'v2' ? 'Submitted by' : 'Submitter', of: (r) => r.submitter,
        label_of: (v) => v === USER.name ? `${v} (You)` : v, order: (v) => v === USER.name ? -1 : 0 },
      { key: 'source', label: 'Source', of: (r) => r.source ? mxChannel(r).name : 'Manual',
        mark: (v) => { const id = Object.keys(MX_CHANNEL_NAME).find(k => MX_CHANNEL_NAME[k] === v);
          return id ? h('img', { class: 'mx-fpop-av mx-fpop-logo', src: brandSrc(id), alt: '' }) : h('span', { class: 'mx-fpop-av mx-dlg-q' }, quillEl('static', { cls: 'mx-dlg-qi' })); } },
      { key: 'stage', label: 'Status', of: (r) => (MX_ST.req[r.status] || MX_ST.req.progress).label, order: (v) => Object.values(MX_ST.req).map(x => x.label).indexOf(v),
        mark: (v) => { const k = Object.keys(MX_ST.req).find(k => MX_ST.req[k].label === v); return k ? h('span', { class: 'mx-st-mi mx-fpop-st', style: `color:${MX_ST.req[k].color}`, html: MX_ST.req[k].svg }) : null; } },
      ...(INTAKE_FX.dueCol ? [
        mxDueFilter(),
        { key: 'move', label: 'Waiting on', of: (r) => mxWhoseMove(r), order: (v) => ['Legal', 'Requester', 'Counterparty'].indexOf(v) }] : []),
    ];
  if (typeof mxIntakeView === 'function' && mxIntakeView() === 'inbox') return mxInboxPage(everything, TABS, TABOF, head(), FILTERS);
  const t = mxTable({
    label: INTAKE_NAME, st, allLabel: 'All', allLast: true, empty: 'No open requests. Everything the business asked for is done.',
    grid: INTAKE_FX.dueCol ? 'minmax(76px, 1fr) minmax(190px, 2.2fr) minmax(116px, 1fr) minmax(92px, 1fr) minmax(116px, 1fr) minmax(150px, 1fr) minmax(76px, 1fr) minmax(118px, 1fr) minmax(80px, 1fr) 28px'
      : '88px minmax(210px, 3.2fr) minmax(130px, 1.4fr) minmax(100px, 1fr) minmax(120px, 1.1fr) minmax(140px, 1.3fr) minmax(110px, 1fr) 96px 28px',
    cols: INTAKE_FX.columns === 'v2' ? [{ key: 'id', label: 'Request #' }, { key: 'title', label: 'Request' }, { key: 'stage', label: 'Status' }, { key: 'attorney', label: 'Assigned to' },
      { key: 'submitter', label: 'Submitted by' }, { key: 'created', label: 'Created on' }, { key: 'due', label: 'Due date' }, { key: 'source', label: 'Source' }]
      : [{ key: 'id', label: 'Request #' }, { key: 'title', label: 'Request' },
      { key: 'counterparty', label: 'Counterparty' }, { key: 'type', label: 'Type' }, { key: 'submitter', label: 'Submitter' },
      { key: 'attorney', label: 'Attorney' }, ...(INTAKE_FX.dueCol ? [{ key: 'due', label: 'Due' }] : []), { key: 'stage', label: 'Stage' }, { key: 'comments', label: 'Comments' }],
    /* the two questions a head of legal asks of this list */
    tabs: TABS, tabOf: TABOF,
    /* the critical fields as dropdowns in place of tabs (INTAKE_FX.drops) */
    drops: INTAKE_FX.drops ? ['stage', 'attorney', 'submitter', 'source', 'due'] : null,
    /* requests inside a matter show as part of it, not as rows of their own; search still finds them */
    items: () => (st.find || '').trim() ? list : list.filter(r => !(r.inMt && list.some(q => q.id === r.inMt && q.mt))),
    text: (r) => [r.id, r.title, r.deal, r.counterparty, r.type, r.team, r.submitter, r.attorney].join(' '),
    /* narrowing the list without leaving it */
    filters: FILTERS,
    val: (r, k) => k === 'created' ? r.created : k === 'delegate' ? (mxDelegate(r) || '~') : k === 'source' ? (r.source ? mxChannel(r).name : 'Manual') : k === 'comments' ? mxWActive(r).length : k === 'stage' ? (order[r.status] ?? 1) : k === 'due' ? r.due : k === 'id' ? r.id : (r[k] || '~').toLowerCase(),
    cells: (r) => INTAKE_FX.columns === 'v2' ? [
      h('span', { class: 'mx-req-id' }, r.id),
      r.mt ? h('span', { class: 'mo-row-mt' }, h('span', { class: 'pb-row-name' }, r.title), h('span', { class: 'mo-chip mo-mt-chip' }, 'Matter'), typeof moFolderSize === 'function' && moFolderSize(r) > 1 ? h('span', { class: 'mo-row-n' }, `${moFolderSize(r)} requests`) : null) : h('span', { class: 'pb-row-name' }, r.title),
      mxReqStatusBtn(r, () => setTimeout(t.paint, 420)),
      mxAttorneyBtn(r, () => setTimeout(t.paint, 420)),
      h('span', { class: 'mx-dlg' }, mxFace(r.submitter, 'pb-av mx-sb-av'), r.submitter),
      h('span', { class: 'mx-created' }, new Date(r.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
      mxDue(r.due, mxClosed(r)),
      h('span', { class: 'mx-srcc' }, r.source ? h('img', { src: brandSrc(r.source), alt: '' }) : h('span', { class: 'mx-dlg-q' }, quillEl('static', { cls: 'mx-dlg-qi' })), r.source ? mxChannel(r).name : 'Manual'),
    ] : [
      h('span', { class: 'mx-req-id' }, r.id),
      h('span', { class: 'pb-row-name' }, r.title),
      r.counterparty || h('span', { class: 'mx-none' }, '—'),
      r.type,
      h('span', { class: 'mx-sub' }, h('span', { class: 'mx-sub-n' }, r.submitter),
        r.source ? h('img', { class: 'mx-sub-via', src: brandSrc(r.source), alt: '', 'data-tip': `Came in by ${r.source === 'outlook' || r.source === 'gmail' ? 'email' : mxChannel(r).name}` }) : null),
      mxAttorneyBtn(r, () => setTimeout(t.paint, 420)),
      ...(INTAKE_FX.dueCol ? [h('span', { class: 'mx-due-cell' }, mxDue(r.due, mxClosed(r)))] : []),
      /* the stage changes where you see it; reaching the last takes it off the open list, with a way back */
      mxReqStatusBtn(r, () => setTimeout(t.paint, 420)),
      /* active tagged comments from Word: the number, darker when some are waiting on you */
      ((act) => { if (!act.length) return h('span', {});
        const onMe = act.filter(c => c.status === 'open' && c.to === USER.name).length, rep = act.filter(c => c.status === 'replied').length, other = act.length - onMe - rep;
        return h('span', { class: 'mx-wc-n' + (onMe ? ' is-mine' : ''), 'data-tip': [onMe && `${onMe} waiting on you`, other && `${other} waiting on others`, rep && `${rep} replied`].filter(Boolean).join(' · ') },
          h('span', { class: 'mx-wc-ic', html: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.3a.5.5 0 0 1-.8-.4v-2.9h.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/></svg>' }),
          String(act.length)); })(mxWActive(r))],
    open: (r) => mxOpen('intake', r.id),
    menu: (r, row) => [
      { label: 'Open', icon: 'files', run: () => mxOpen('intake', r.id) },
      ...(INTAKE_FX.following && r.attorney !== USER.name ? [{ label: r.followed ? 'Unfollow' : 'Follow', icon: 'look', run: () => { r.followed = !r.followed; save(); t.paint();
        pbToast(r.followed ? `Following ${r.id}` : `Stopped following ${r.id}`, { label: 'Undo', run: () => { r.followed = !r.followed; save(); t.paint(); } }); } }] : []),
      { label: 'Mark as Completed', icon: 'use', run: () => { const was = r.status; r.status = 'done'; r.updated = mxNow(); save(); mxLog(r, { ev: 'status', what: 'moved this to Completed' }); t.paint();
        pbToast(`${r.id} is completed`, { label: 'Undo', run: () => { r.status = was; save(); t.paint(); } }); } },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(list, r, row, 'request', (back) => back && t.paint()) },
    ],
  });
  t.el.classList.add('mx-intake'); if (INTAKE_FX.columns === 'v2') t.el.classList.add('mx-iv2'); else if (INTAKE_FX.dueCol) t.el.classList.add('has-due');
  /* two ways in: say it in your own words, or answer a short form */
  return mxListPage(INTAKE_NAME, head(), t.el);
}

const mxProject = (id) => mxData().projects.find(p => p.id === id) || null;
const mxProjectEmpty = (p) => !p.name?.trim() && !p.description?.trim() && !p.chats.length && !p.vaults.length && !p.playbooks.length && !p.requests.length;
const mxProjectCount = (p) => p.chats.length + p.vaults.length + p.playbooks.length + p.requests.length;

function projectsView() {
  const d = mxData();
  if (!MX.projects.open) { const kept = d.projects.filter(p => !mxProjectEmpty(p)); if (kept.length !== d.projects.length) { d.projects = kept; save(); } }
  const p = MX.projects.open && mxProject(MX.projects.open);
  if (MX.projects.open && !p) MX.projects.open = null;
  return p ? projectPage(p) : projectList();
}

function projectList() {
  const d = mxData();
  const order = { active: 0, hold: 1, closed: 2 };
  const t = mxTable({
    label: 'Projects', st: MX.projects.list, empty: 'No projects yet.',
    grid: 'minmax(190px, 2.2fr) minmax(88px, 1fr) minmax(96px, 1fr) minmax(48px, 1fr) minmax(132px, 1fr) minmax(112px, 1fr) 32px',
    cols: [{ key: 'name', label: 'Name' }, { key: 'kind', label: 'Type' }, { key: 'status', label: 'Status' },
      { key: 'items', label: 'Items', num: true }, { key: 'lead', label: 'Lead' }, { key: 'updated', label: 'Last updated', desc: true, cls: 'pb-td-when' }],
    tabs: Object.entries(MX_ST.proj).map(([k, v]) => ({ k, label: v.label })),
    tabOf: (p) => p.status,
    items: () => d.projects,
    text: (p) => [p.name, p.kind, p.lead, p.description].join(' '),
    val: (p, k) => k === 'items' ? mxProjectCount(p) : k === 'status' ? order[p.status] : k === 'updated' ? p.updated : (p[k] || '').toLowerCase(),
    cells: (p) => [[mxTile('proj'), h('span', { class: 'pb-row-name' }, p.name || 'Untitled project')], p.kind,
      mxStatusBtn('proj', p, () => setTimeout(t.paint, 420)), String(mxProjectCount(p)), mxPerson(p.lead), pbWhen(p.updated)],
    open: (p) => mxOpen('projects', p.id),
    menu: (p, row) => [
      { label: 'Open', icon: 'files', run: () => mxOpen('projects', p.id) },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(d.projects, p, row, 'project', (back) => back && t.paint()) },
    ],
  });
  /* a new project is a page with its name waiting to be typed, not a form */
  return mxListPage('Projects', mxCta('New Project', () => {
    const p = { id: pbUid('proj'), name: '', kind: 'Matter', status: 'active', lead: USER.name, updated: mxNow(), description: '',
      vaults: [], playbooks: [], requests: [], chats: [] };
    d.projects.unshift(p); save(); mxOpen('projects', p.id);
  }), t.el);
}

function projectPage(p) {
  const d = mxData();
  const st = (MX.projects.items[p.id] ||= { tab: 'all', find: '', sort: { key: 'updated', dir: -1 } });
  /* everything in the project as one list: what it is, a line about it, when it last moved */
  const items = () => [
    ...p.chats.map(c => ({ id: 'chat:' + c.id, type: 'chat', name: c.title, about: c.by.split(' ')[0] + ' asked', updated: c.when, ref: c })),
    ...p.vaults.map(id => mxVault(id)).filter(Boolean).map(v => ({ id: 'vault:' + v.id, type: 'vault', name: v.name, about: mxPlural(v.files.length, 'file'), updated: v.updated, ref: v })),
    ...p.playbooks.map(id => pbFind(id)).filter(Boolean).map(b => ({ id: 'pb:' + b.id, type: 'playbook', name: b.name, about: mxPlural(b.clauses.length, 'clause'), updated: b.updated, ref: b })),
    ...p.requests.map(id => mxRequest(id)).filter(Boolean).map(r => ({ id: 'req:' + r.id, type: 'request', name: r.title, about: MX_ST.req[r.status].label, updated: r.updated, ref: r })),
  ];
  const TYPE = { chat: 'Chat', vault: 'Vault', playbook: 'Playbook', request: 'Contract' };
  const tile = { chat: () => h('span', { class: 'mx-tile mx-tile--chat', html: MX_ASK_IC }), vault: () => mxTile('vault'),
    playbook: () => h('span', { class: 'pb-doc-ic' }), request: () => h('span', { class: 'mx-tile mx-tile--req', html: MX_REQ_IC }) };
  const openItem = (it) => it.type === 'chat' ? projectChat(p, it.ref) : it.type === 'vault' ? mxOpen('vault', it.ref.id)
    : it.type === 'playbook' ? openPlaybook(it.ref.id, 'view') : mxOpen('requests', it.ref.id);
  const key = { chat: 'chats', vault: 'vaults', playbook: 'playbooks', request: 'requests' };
  const t = mxTable({
    label: 'Items', st, empty: '',
    grid: 'minmax(300px, 2.2fr) minmax(100px, 1fr) minmax(140px, 1fr) minmax(110px, 1fr) 36px',
    cols: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'about', label: 'Detail' }, { key: 'updated', label: 'Last updated', desc: true, cls: 'pb-td-when' }],
    tabs: () => [['chat', 'Chats'], ['vault', 'Vaults'], ['playbook', 'Playbooks'], ['request', 'Contracts']].map(([k, label]) => ({ k, label })),
    tabOf: (it) => it.type,
    items,
    text: (it) => it.name + ' ' + TYPE[it.type] + ' ' + it.about,
    val: (it, k) => k === 'updated' ? it.updated : (it[k] || '').toLowerCase(),
    cells: (it) => [[tile[it.type](), h('span', { class: 'pb-row-name' }, it.name || 'Untitled')], TYPE[it.type], it.about, pbWhen(it.updated)],
    open: openItem,
    menu: (it, row) => [
      { label: 'Open', icon: 'files', run: () => openItem(it) },
      { rule: true },
      /* a chat lives in the project; the others are only pointed at, and stay where they are */
      { label: it.type === 'chat' ? 'Delete' : 'Remove from Project', icon: it.type === 'chat' ? 'trash' : 'unlink', danger: it.type === 'chat',
        run: () => {
          const list = p[key[it.type]], ref = it.type === 'chat' ? it.ref : it.ref.id, at = list.indexOf(ref);
          list.splice(at, 1); save();
          pbLeave(row, () => { t.paint(); paintEmpty(); });
          pbToast(`${it.type === 'chat' ? 'Deleted' : 'Removed'} “${it.name}”`, { label: 'Undo', run: () => { list.splice(at, 0, ref); save(); MX.flash = it.id; t.paint(); paintEmpty(); } });
        } },
    ],
  });
  const none = h('p', { class: 'mx-proj-none' }, 'Nothing in this project yet. Ask something above, or add a vault, a playbook or a request.');
  const paintEmpty = () => { const n = mxProjectCount(p); none.hidden = n > 0; t.el.hidden = n === 0; };

  /* point the project at things that already exist */
  const link = (what) => {
    const src = what === 'vaults' ? d.vaults.map(v => ({ id: v.id, label: v.name, sub: mxPlural(v.files.length, 'file') }))
      : what === 'playbooks' ? pbList().map(b => ({ id: b.id, label: b.name, sub: mxPlural(b.clauses.length, 'clause') }))
      : d.requests.map(r => ({ id: r.id, label: r.title, sub: r.id }));
    mxPick({ title: 'Add ' + ({ vaults: 'a Vault', playbooks: 'a Playbook', requests: 'a Contract' })[what], sub: p.name || 'Untitled project',
      groups: [{ items: src.filter(x => !p[what].includes(x.id)) }],
      onDone: (ids) => { p[what].push(...ids); p.updated = mxNow(); save(); MX.flash = ({ vaults: 'vault:', playbooks: 'pb:', requests: 'req:' })[what] + ids[0]; t.paint(); paintEmpty(); } });
  };

  /* the ask box: the real composer, already holding the project */
  const ta = h('textarea', { rows: '1', 'aria-label': 'Ask about this project', placeholder: 'Ask about this project' });
  const send = h('button', { class: 'send', type: 'button', disabled: true, 'aria-label': 'Send', html: ARROW });
  const box = h('div', { class: 'ask mx-proj-ask' }, ta, h('div', { class: 'askbar' }, send));
  queueMicrotask(() => {
    if (!box.isConnected) return;
    initComposer(box, { noModel: true, noTokens: true, attach: [
      { label: 'Upload files', mark: PB_UPLOAD, run: () => pbToast('Add files to one of the project’s vaults.') }],
      onSend: (text) => {
        const c = { id: pbUid('c'), title: titleFor(text), by: USER.name, when: mxNow(), q: text, a: null };
        p.chats.unshift(c); p.updated = mxNow(); save();
        projectChat(p, c);
      } });
  });

  const page = mxDetailPage({
    view: 'projects', back: 'Projects', tile: mxTile('proj'), item: p, placeholder: 'Untitled project',
    sub: [mxStatusBtn('proj', p), h('span', { class: 'mx-dot' }, p.kind), h('span', { class: 'mx-dot mx-sub-p' }, faceEl(p.lead, 'pb-av'), p.lead)],
    actions: [
      h('button', { class: 'btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
        onclick: (e) => { e.stopPropagation(); const b = e.currentTarget; pbWaysMenu(b, 'mx-proj-add', [
          { key: 'vaults', name: 'Vault', icon: () => mxTileMark('vault') },
          { key: 'playbooks', name: 'Playbook', icon: () => mxTileMark('playbook') },
          { key: 'requests', name: 'Contract', icon: () => h('span', { html: MX_REQ_IC }) },
        ], link, { keyboard: e.detail === 0, small: true }); } }, icon('plus', 'ico ico-14'), 'Add'),
    ],
  }, box, none, t.el);
  paintEmpty();
  if (!p.name) setTimeout(() => page.titleEl.focus({ preventScroll: true }), 80);
  return page;
}
const mxTileMark = (k) => h('span', { html: k === 'vault' ? MX_VAULT_MARK
  : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3.5" y="2" width="9" height="12" rx="1.6"/><path d="M5.8 5.5h4.4M5.8 8h4.4M5.8 10.5h2.6"/></svg>' });
const MX_REQ_IC = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M2.5 9.5 4 3.5h8l1.5 6v2.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/><path d="M2.5 9.5h3l.8 1.5h3.4l.8-1.5h3"/></svg>';

/* a chat in a project: what was asked, and what came back, with the
   project's own material as what was read */
function projectChat(p, c) {
  const names = [...p.vaults.map(id => mxVault(id)?.name), ...p.playbooks.map(id => pbFind(id)?.name)].filter(Boolean);
  openSession({ id: 'proj-ses-' + p.id + '-' + c.id, label: c.title, meta: 'now',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: c.q, context: { where: 'In project', artifact: p.name || 'Untitled project' } },
      { role: 'bot', cites: null,
        steps: [{ source: 'project', query: 'Read ' + (p.name || 'the project'), count: names.length ? mxPlural(names.length, 'source') : 'nothing attached yet' }],
        answer: c.a || (names.length
          ? `I read this against what the project holds — ${names.join(', ')}.\n\nThere is no model behind this prototype yet, so I cannot answer a new question for real. The earlier chats in this project show what an answer looks like.`
          : 'This project has nothing attached yet. Add a vault or a playbook to it, and I will answer from what they hold.') },
    ] });
}
