/* ==================================================================
   Matters — a piece of legal work from opened to closed.

   The list page has four views: Overview (what needs you today), All
   Matters, Tasks and Key Dates. A matter opens on the Intake request
   page's frame: the way back, its name, where it stands, its stages,
   tabs, and an "Ask about…" bar; Ask Clavia opens on the right, where
   a request shows its document.

   A matter is opened from an Intake request (its facts, files and the
   person who asked come across) or started blank. State lives in
   state.mo; routes are #matters and #matters/<id>.

   Loaded after modules-work.js and before app.js, so everything here
   runs at call time.
================================================================== */

MX.matters = { open: null, tab: 'overview', ask: null, list: { tab: 'open', find: '', sort: { key: 'next', dir: 1 } },
  dates: { tab: 'all', find: '', sort: { key: 'd', dir: 1 } }, scope: 'mine' };

function moData() {
  if (!state.mo || state.moSeedV !== MO_SEED_V) {
    state.mo = { matters: moSeed(), view: 'overview', byClient: false, rules: structuredClone(MO_RULES_SEED) };
    state.moSeedV = MO_SEED_V; save();
  }
  state.mo.rules ||= structuredClone(MO_RULES_SEED);
  return state.mo;
}
/* the matters are Intake's requests that are matters (step 4) */
const moMatters = () => typeof mxIntake === 'function' ? mxIntake().filter(r => r.mt).map(moAsMatter) : [];
const moGet = (id) => moMatters().find(m => m.id === id) || null;
const moFirstName = (n) => n === USER.name ? 'You' : n.split(' ')[0];
const moMe = () => USER.name.split(' ')[0];
const moIsClosed = (m) => m.status === 'closed';
const moOpenMatters = () => moMatters().filter(m => !moIsClosed(m));

/* the number people see: ours, or the client's code and a number */
const moNum = (m) => moData().byClient ? `${MO_CLIENTS[m.client || 0][1]} · ${m.id.split('-')[1].padStart(4, '0')}` : m.id;
const moClient = (m) => MO_CLIENTS[m.client || 0][0];

/* days from today; a date that is not there is not counted */
const moDays = (iso) => {
  if (!iso) return null;
  const a = new Date(iso), t = new Date(); a.setHours(0, 0, 0, 0); t.setHours(0, 0, 0, 0);
  return Math.round((a - t) / 864e5);
};
const moOpenTasks = (m) => m.tasks.filter(t => t.st === 'open');
const moLate = (t) => t.st === 'open' && t.due && moDays(t.due) < 0;
const moMoney = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const moK = (n) => '£' + (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k';
const moDates = (m) => [...m.dates].sort((a, b) => (a.d < b.d ? -1 : 1));
const moUpcoming = (m) => moIsClosed(m) ? [] : moDates(m).filter(d => moDays(d.d) >= 0);

/* something happened: it goes on the matter's timeline */
const moLog = (m, kind, text, who = USER.name) => {
  m.tl.push({ when: mxNow(), kind, text, who }); m.updated = mxNow();
  const r = m.request; if (!r) return;
  const first = who.split(' ')[0];
  (r.activity ||= []).push(text.startsWith(first + ' ') ? { who, what: text.slice(first.length + 1), when: mxNow() }
    : { who: 'Clavia', ev: 'clavia', what: 'noted: ' + text, when: mxNow() });
};

/* where a matter stands: the request's marks, in the same colours */
const MO_ST = {
  open:    { label: 'Open',          color: '#3A8457', svg: MX_HALF },
  waiting: { label: 'Waiting',       color: '#7C8AA0', svg: MX_PAUSE },
  hearing: { label: 'Hearing soon',  color: '#B4472F', svg: MX_HALF },
  signing: { label: 'Signing',       color: '#C28A1E', svg: MX_HALF },
  closed:  { label: 'Closed',        color: '#B5B0A7', svg: MX_DONE },
};
const moStLabel = (m) => m.status === 'waiting' && m.waitOn ? `Waiting on ${m.waitOn}` : MO_ST[m.status].label;
const moStatus = (m) => h('span', { class: 'pb-st mx-st', style: `--st:${MO_ST[m.status].color}` },
  h('span', { class: 'pb-st-ic', html: MO_ST[m.status].svg }), moStLabel(m));

/* where a matter came in: the channel's logo and name, as Intake shows a request's source */
const moSrc = (m) => MX_CHANNEL_NAME[m.source] ? { key: m.source, name: MX_CHANNEL_NAME[m.source] } : { key: null, name: 'Manual' };
const moSrcEl = (m) => { const s = moSrc(m); return h('span', { class: 'mx-srcc' }, s.key ? h('img', { src: brandSrc(s.key), alt: '' }) : h('span', { class: 'mx-dlg-q' }, quillEl('static', { cls: 'mx-dlg-qi' })), s.name); };
/* who would get a matter of this kind, from Settings › Matters › Who Gets Which Matter */
const moRuleOwner = (type) => (moData().rules.find(r => r.on && r.kind === type) || {}).who || null;
/* status and stage in one dropdown, as a request's status is: where it's at, then which of the five stages */
function moStatusBtn(m, after, big) {
  const chev = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
  const btn = h('button', { class: 'pb-st mx-st mx-st-btn' + (big ? ' rqp-stage' : ''), type: 'button', 'data-tip': 'Change Status', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation();
      pbWaysMenu(btn, 'mx-st', [{ sec: 'Where it’s at' },
        ...['open', 'waiting', 'hearing', 'signing', 'closed'].map(k => ({ key: 'st:' + k, name: MO_ST[k].label, on: k === m.status,
          icon: () => h('span', { class: 'mx-st-mi', style: `color:${MO_ST[k].color}`, html: MO_ST[k].svg }) })),
        { sec: 'Stage' },
        ...MO_STAGES.map((n, i) => ({ key: 'sg:' + i, name: n, on: i === m.stage, icon: () => h('span', { class: 'mo-sg-n' + (i <= m.stage ? ' is-past' : '') }, String(i + 1)) }))],
      (k) => {
        const [what, v] = k.split(':');
        if (what === 'st') {
          if (v === m.status) return;
          if (v === 'closed') return moClose(m);
          const was = m.status; m.status = v; if (v === 'waiting') m.waitOn ||= m.asked[0].split(' ')[0];
          moLog(m, 'Matter', `${moMe()} moved this to ${MO_ST[v].label}`); save(); paint(); after?.();
          pbToast(`${moNum(m)} is ${MO_ST[v].label.toLowerCase()}`, { label: 'Undo', run: () => { m.status = was; m.tl.pop(); save(); paint(); after?.(); } });
        } else {
          const i = +v; if (i === m.stage) return;
          const was = m.stage; m.stage = i; moLog(m, 'Matter', `${moMe()} moved this to ${MO_STAGES[i]}`); save(); paint(); after?.();
          pbToast(`${moNum(m)} is at ${MO_STAGES[i]}`, { label: 'Undo', run: () => { m.stage = was; m.tl.pop(); save(); paint(); after?.(); } });
        }
      }, { small: true, keyboard: e.detail === 0 }); } });
  const paint = () => { const v = MO_ST[m.status]; btn.style.setProperty('--st', v.color);
    btn.replaceChildren(...[h('span', { class: 'pb-st-ic', html: v.svg }), moStLabel(m), big ? h('span', { class: 'mo-st-stage' }, '· ' + MO_STAGES[m.stage]) : null, big ? h('span', { class: 'rqp-stage-chev', html: chev }) : null].filter(Boolean)); };
  paint();
  return btn;
}
/* who owns it, changed where you see it: the same picker as Intake's "Assigned to" */
function moOwnerBtn(m, after) {
  const chev = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>';
  const btn = h('button', { class: 'mx-atty' + (m.owner ? '' : ' is-none'), type: 'button', 'aria-haspopup': 'listbox', 'data-tip': m.owner ? 'Change Owner' : null,
    onclick: (e) => { e.stopPropagation(); mxPersonPicker(btn, MX_LEGAL.filter(p => !m.keptOut.some(k => k.who === p.name)), (p) => set(p.name)); } });
  const paint = () => { const sg = !m.owner && moRuleOwner(m.type);
    btn.replaceChildren(...(m.owner ? [mxFace(m.owner), h('span', { class: 'pb-owner-n' }, m.owner)]
      : sg ? [mxFace(sg, 'pb-av mx-atty-sg-av'), h('span', { class: 'mx-atty-t mx-atty-sg' }, sg)] : [h('span', { class: 'mx-atty-t' }, 'Unassigned')]), h('span', { class: 'mx-atty-chev', html: chev }));
    if (sg) btn.dataset.tip = `Suggested · ${m.type.toLowerCase()} matters go to ${sg.split(' ')[0]}`; };
  const set = (n) => {
    if (n === m.owner) return;
    const was = m.owner; m.owner = n;
    m.people = [[n, 'Owner'], ...m.people.filter(p => p[0] !== n && p[1] !== 'Owner'), ...(was ? [[was, 'Worked on it before']] : [])];
    moLog(m, 'Matter', `${moMe()} made ${n === USER.name ? 'themselves' : n.split(' ')[0]} the owner`); save();
    btn.classList.remove('is-none'); paint(); after?.();
    pbToast(`${moNum(m)} is now ${n === USER.name ? 'yours' : n.split(' ')[0] + '’s'}`, { label: 'Undo', run: () => { m.owner = was; m.tl.pop(); save(); paint(); after?.(); } });
  };
  paint(); btn._set = set;
  return btn;
}

/* a due date, said the short way: Today, Tomorrow, a day, or how late */
function moDue(iso, done) {
  if (!iso) return h('span', { class: 'mx-due mo-faint' }, 'No date');
  const n = moDays(iso);
  const text = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 && !done ? `Overdue · ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : moSay(iso);
  return h('span', { class: 'mx-due' + (!done && n < 0 ? ' is-late' : !done && n <= 1 ? ' is-soon' : '') }, text);
}
const moIn = (iso) => { const n = moDays(iso); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? 'Passed' : `In ${n} days`; };

const MO_IC = (p, w = 16) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const MO_ICONS = {
  Decision: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5.5a3 3 0 0 0 5 0zM19 8l-2.5 5.5a3 3 0 0 0 5 0z"/>',
  Task: '<path d="m5.5 12.5 4 4 9-9.5"/>',
  Email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  File: '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5"/>',
  Update: '<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z"/>',
  Signing: '<path d="M4 20h16M6 16l9.5-9.5a2.1 2.1 0 0 1 3 3L9 19l-4 1z"/>',
  Sharing: '<circle cx="17" cy="6" r="2.5"/><circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="m9.2 10.8 5.6-3.4M9.2 13.2l5.6 3.4"/>',
  Access: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  'Key date': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  Matter: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
};
const moKindKey = (k) => ({ Decision: 'decision', Task: 'task', Email: 'email', File: 'file', Update: 'update', Signing: 'signing', Sharing: 'sharing', Access: 'access', 'Key date': 'date', Matter: 'matter', Chat: 'clavia', Clavia: 'clavia' })[k] || 'matter';
const moKindIc = (k) => h('span', { class: 'mo-kic', html: k === 'Clavia' || k === 'Chat' ? SPARK_ONE : MO_IC(MO_ICONS[k] || MO_ICONS.Matter, 14) });

/* draw again where you are: the page keeps its scroll */
/* on a request that is a matter, the matter's tabs are the request's: Tasks, Documents, Details, Deal Team… */
const MO_REQ_TAB = { overview: 'summary', tasks: 'mtasks', decisions: 'mdecisions', docs: 'docs', files: 'docs', details: 'details', people: 'team', activity: 'activity', updates: 'activity', chats: 'activity', timeline: 'activity' };
const moOnRequest = () => state.view === 'intake';
const moSetTab = (k) => { if (moOnRequest()) MX.intake.tab = MO_REQ_TAB[k] || 'summary'; else MX.matters.tab = k; };
function moRedraw() {
  const keep = ['.rqp-left-in', '.mo-ask-body', '#view'].map(q => [q, document.querySelector(q)?.scrollTop || 0]);
  go(moOnRequest() ? 'intake' : 'matters');
  for (const [q, top] of keep) { const el = document.querySelector(q); if (el) el.scrollTop = top; }
}
const moGo = (id, tab) => { MX.intake.tab = MO_REQ_TAB[tab || 'overview'] || 'summary'; MX.intake.open = null; mxOpen('intake', id); document.getElementById('view').scrollTop = 0; };

/* ── a dialog, made the way Submit New Request is ── */
function moDialog({ title, sub, body, foot, wide, label }) {
  const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  const close = () => { removeEventListener('keydown', onKey, true); dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); };
  const box = h('div', { class: 'pb-dlg mx-rqf mo-dlg' + (wide ? ' is-wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title });
  dim.append(box);
  const paint = () => {
    box.replaceChildren(
      h('header', { class: 'mx-rqf-head mo-dlg-head' },
        h('div', {}, h('h2', { class: 'pb-dlg-t' }, title), sub ? h('p', { class: 'mo-dlg-sub' }, sub) : null),
        h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close', onclick: close, html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' })),
      h('div', { class: 'mx-rqf-body mo-dlg-body' }, ...[].concat(typeof body === 'function' ? body() : body).filter(Boolean)),
      h('footer', { class: 'mx-rqf-foot' }, ...[].concat(typeof foot === 'function' ? foot(close) : foot || []).filter(Boolean)));
  };
  paint();
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => box.querySelector('input, textarea, .pb-btn--primary')?.focus());
  return { close, paint };
}
const moField = (label, control, hint) => h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, label, hint ? h('span', { class: 'mx-rqf-hint' }, hint) : null), control);
const moInput = (value, set, placeholder = '') => h('input', { class: 'mx-rqf-in', type: 'text', value: value || '', placeholder, oninput: (e) => set(e.target.value) });
const moBtn = (label, run, primary, extra = {}) => h('button', { class: 'pb-btn' + (primary ? ' pb-btn--primary' : ''), type: 'button', onclick: run, ...extra }, label);
/* a row of choices, one picked */
const moPills = (opts, now, pick) => h('div', { class: 'mo-pills', role: 'radiogroup' }, ...opts.map(o => {
  const [k, label] = Array.isArray(o) ? o : [o, o];
  return h('button', { class: 'mo-pill' + (k === now ? ' is-on' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === now), onclick: () => pick(k) }, label);
}));
const moCheck = (on, label, sub, toggle, extra) => h('button', { class: 'mo-check' + (on ? ' is-on' : ''), type: 'button', role: 'checkbox', 'aria-checked': String(!!on), onclick: toggle },
  h('span', { class: 'pb-src-box', html: PB_SVG.check }), h('span', { class: 'mo-check-t' }, label, sub ? h('span', { class: 'mo-check-s' }, sub) : null), extra || null);
const moClaviaSays = (...kids) => h('div', { class: 'mo-says' }, h('span', { class: 'mo-says-ic', html: SPARK_ONE }), h('div', {}, ...kids));

/* ==================================================================
   The list page
================================================================== */
function mattersView() {
  /* step 4: matters live in Intake; the old address opens Intake's Matters view, or the matter itself */
  const id = /^(?:MT|RQ)-\d+/.exec(MX.matters.open || '');
  MX.matters.open = null;
  setTimeout(() => { if (id && moGet(id[0])) moGo(id[0]); else { MX.intake.list.tab = 'matters'; MX.intake.open = null; go('intake'); } }, 0);
  return h('div', {});
  const d = moData();
  if (MX.matters.open === 'new') return moCreatePage();
  const asker = /^(MT-\d+)\/asker$/.exec(MX.matters.open || '');
  if (asker && moGet(asker[1])) return moAskerPage(moGet(asker[1]));
  const m = MX.matters.open && moGet(MX.matters.open);
  if (MX.matters.open && !m) MX.matters.open = null;
  return m ? moPage(m) : moList(d);
}

/* The list page is Intake's: a title, settings and New Matter, then one row of dropdowns (the view, then
   status, owner and kind of work) over the table. Needs You, Tasks and Key Dates are views in the same list. */
function moList(d) {
  const st = MX.matters.list;
  if (!st.v2) { st.tab = 'needs'; st.v2 = 1; }
  const myTasks = () => moOpenMatters().flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name));
  const soon = () => moOpenMatters().flatMap(m => moUpcoming(m)).length;
  const t = moAll(d, [
    { k: 'needs', label: 'Needs You', body: () => moOverview(d), n: () => moNeeds(d).length },
    { k: 'open', label: 'Open', in: (m) => !moIsClosed(m) },
    { k: 'mine', label: 'Mine', in: (m) => m.owner === USER.name && !moIsClosed(m) },
    { k: 'waiting', label: 'Waiting on Others', in: (m) => m.status === 'waiting' },
    { k: 'tasks', label: 'Tasks', body: () => moTasksView(d), n: () => myTasks().length },
    { k: 'dates', label: 'Key Dates', body: () => moDatesView(d), n: soon },
    { k: 'closed', label: 'Closed', in: (m) => moIsClosed(m) },
  ]);
  const head = h('div', { class: 'mx-head-ctas' },
    h('button', { class: 'pbv-icon mx-rules-btn', type: 'button', 'aria-label': 'Matters settings', 'data-tip': 'Matters Settings', html: MI(GLYPHS.gear), onclick: () => stGo('matters') }),
    mxCta('New Matter', (b, kb) => moNewMatter(b, kb), true));
  const page = mxListPage('Matters', head, t.el, moListDock());
  page.classList.add('mo');
  return page;
}
/* the matter views are views of Intake's list now */
const moView = (k) => () => { MX.intake.list.tab = ({ open: 'matters', all: 'matters', tasks: 'mtasks', dates: 'dates', needs: 'needs' })[k] || k; MX.intake.open = null; go('intake'); };

/* ── Overview: what needs you today ── */
/* what needs you today, most pressing first */
function moNeeds(d, ctx = {}) {
  const open = moOpenMatters();
  const mine = open.filter(m => m.owner === USER.name);
  const myTasks = open.flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name).map(t => ({ t, m })))
    .sort((a, b) => (a.t.due || '9') < (b.t.due || '9') ? -1 : 1);
  const teamLate = open.flatMap(m => moOpenTasks(m).filter(moLate).map(t => ({ t, m })));
  const week = myTasks.filter(x => x.t.due && moDays(x.t.due) <= 7);
  const soon = open.flatMap(m => moUpcoming(m).filter(x => moDays(x.d) <= 21).map(x => ({ ...x, m }))).sort((a, b) => (a.d < b.d ? -1 : 1));
  const orbis = moMatters().find(m => m.orbis) || null;
  const rq = mxIntake().find(r => r.id === mxData().orbisRq && !r.matter && !r.mt);

  /* what needs you, most pressing first */
  const items = [];
  if (!orbis && rq) items.push({ hi: true, chip: 'From Intake', title: rq.title, meta: [`${rq.submitter}, finance`, pbWhen(rq.created), '2 files', '£64,000 claimed'],
    says: 'Turn it into a dispute matter. It keeps its number, and Clavia brings across the facts and files, so nothing is typed twice.',
    act: ['Turn into a Matter', () => moFromRequest(rq)], ask: () => mxOpen('intake', rq.id), askLabel: 'See the Request' });
  if (orbis && !moIsClosed(orbis) && orbis.decisions.some(x => x.st === 'flag')) items.push({ hi: true, chip: 'Decision', title: 'New delivery records may change a decision',
    meta: [orbis.title, '£22,800 held back', 'New delivery records'], says: 'Only the May delivery may count now: £11,400, not £22,800.',
    act: ['Review Decision', () => moGo(orbis.id, 'decisions')] });
  if (orbis && !moIsClosed(orbis) && !orbis.keptOut.length) items.push({ title: 'Matt used to work at Orbis', sub: `Clavia suggests keeping him out of the ${orbis.title}`,
    st: ['Access', 'Today'], act: ['Review', () => { moGo(orbis.id, 'people'); }] });
  for (const { t, m } of myTasks.filter(x => moLate(x.t))) items.push({ title: t.t, sub: `${m.title} · task`, st: ['Overdue', moSay(t.due)], late: true, act: ['Mark Done', () => moTick(m, t)] });
  for (const { t, m } of myTasks.filter(x => x.t.due && moDays(x.t.due) === 0)) items.push({ title: t.t, sub: `${m.title} · ${moOpenTasks(m).length} open tasks`, st: ['Due today', moSay(t.due)], act: ['Open', () => moGo(m.id, 'tasks')] });
  if (orbis && !moIsClosed(orbis)) { const t = orbis.tasks.find(x => x.proof && x.st === 'open'); if (t) items.push({ title: 'Delivery records for May and June', sub: `${orbis.title} · waiting on Tom`, st: ['Waiting', moSay(t.due)], act: ['Nudge Tom', () => pbToast('Clavia sent Tom a reminder in Teams')] }); }
  const otherLate = teamLate.filter(x => x.t.who !== USER.name);
  if (otherLate.length) items.push({ title: `${mxPlural(otherLate.length, 'overdue task')} across the team`, sub: otherLate.map(x => `${x.t.who.split(' ')[0]}: ${x.t.t}`).join(' · '), st: ['Overdue', ''], late: true, act: ['See Tasks', () => { MX.matters.scope = 'team'; moView('tasks')(); }] });
  Object.assign(ctx, { open, mine, myTasks, week, soon });
  return items;
}

function moOverview(d) {
  const ctx = {}, items = moNeeds(d, ctx);
  const { open, mine, myTasks, week, soon } = ctx;
  const titles = new Set(items.map(i => i.title));
  const coming = myTasks.filter(x => !moLate(x.t) && !titles.has(x.t.t) && !(x.t.due && moDays(x.t.due) === 0)).slice(0, 4);

  const late = open.flatMap(m => moOpenTasks(m).filter(moLate)).length;
  const next = soon[0];
  const lineBits = [h('b', {}, `${mxPlural(items.length, 'thing')} ${items.length === 1 ? 'needs' : 'need'} you today`)];
  if (late) lineBits.push(' · ', h('span', { class: 'mo-red' }, `${late} overdue`));
  if (next) lineBits.push(` · next key date ${moDays(next.d) === 0 ? 'today' : moSay(next.d)}`);

  const money = open.filter(m => m.money);
  const used = money.reduce((s, m) => s + m.money.billed + m.money.okd, 0), budget = money.reduce((s, m) => s + m.money.budget, 0);
  const buckets = ['waiting', 'signing', 'hearing', 'open'].map(k => [k, open.filter(m => m.status === k).length]).filter(x => x[1]);
  const kpi = (label, n, sub, run) => h('button', { class: 'mo-kpi', type: 'button', onclick: run },
    h('span', { class: 'mo-kpi-l' }, label), h('span', { class: 'mo-kpi-n' }, n), h('span', { class: 'mo-kpi-s' }, ...[].concat(sub)));
  const setView = (v) => moView(v === 'all' ? 'open' : v);

  const row = (it) => h('div', { class: 'mo-need' + ({ 'Overdue': ' is-red', 'Due today': ' is-amber', 'Access': ' is-red' }[it.st[0]] || '') },
    h('div', { class: 'mo-need-m' }, h('div', { class: 'mo-need-t' }, it.title), h('div', { class: 'mo-need-s' }, it.sub)),
    h('div', { class: 'mo-need-st' }, h('span', { class: 'mo-chip ' + ({ 'Overdue': 'is-red', 'Due today': 'is-amber', 'Access': 'is-red', 'Waiting': 'is-blue' }[it.st[0]] || '') }, it.st[0]), it.st[1] ? h('span', { class: 'mo-faint' }, it.st[1]) : null),
    h('button', { class: 'pb-btn mo-need-go', type: 'button', onclick: it.act[1] }, it.act[0]));
  const hi = items.find(i => i.hi);
  const rest = items.filter(i => !i.hi);
  const highlight = (it) => h('section', { class: 'rqp-ai mo-hi' },
    h('div', { class: 'rqp-ai-h' }, h('span', { class: 'rqp-ai-star', html: SPARK_ONE }), h('span', {}, it.chip)),
    h('div', { class: 'mo-hi-t' }, it.title),
    h('div', { class: 'mo-hi-meta' }, ...it.meta.flatMap((x, i) => [i ? h('span', { class: 'mt-sep' }, '·') : '', x])),
    h('p', { class: 'mo-hi-says' }, it.says),
    h('div', { class: 'mo-hi-go' }, h('button', { class: 'btn btn--primary', type: 'button', onclick: it.act[1] }, it.act[0]),
      it.ask ? h('button', { class: 'btn', type: 'button', onclick: it.ask }, it.askLabel) : null));

  const latest = open.flatMap(m => m.tl.map(e => ({ ...e, m }))).sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 5);
  return h('div', { class: 'mo-ov' },
    h('p', { class: 'mo-line' }, ...lineBits),
    h('div', { class: 'mo-kpis' },
      kpi('Open matters', String(open.length), buckets.map(([k, n]) => `${n} ${MO_ST[k].label.toLowerCase()}`).join(' · '), setView('all')),
      kpi('Your tasks this week', String(week.length), myTasks.some(x => moLate(x.t)) ? h('span', { class: 'mo-red' }, `${myTasks.filter(x => moLate(x.t)).length} overdue`) : 'None overdue', setView('tasks')),
      kpi('Key dates, next 3 weeks', String(soon.length), mxPlural(soon.filter(x => x.kind === 'Hearing').length, 'hearing'), setView('dates')),
      kpi('Outside lawyers', moK(used), [h('span', { class: 'mo-bar' }, h('i', { style: `width:${budget ? Math.min(100, used / budget * 100) : 0}%` })), ` of ${moK(budget)} budget`], setView('all'))),
    h('div', { class: 'mo-cols' },
      h('section', { class: 'mo-col' },
        h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Needs You'), h('span', { class: 'mo-faint' }, String(items.length))),
        hi ? highlight(hi) : null,
        rest.length ? h('div', { class: 'mo-needs' }, ...rest.map(row)) : null,
        !items.length ? h('p', { class: 'rqp-empty' }, 'Nothing needs you right now.') : null,
        coming.length ? h('div', { class: 'rqv-hrow mo-sub-h' }, h('h3', { class: 'rqv-h' }, 'Coming Up'), h('span', { class: 'mo-faint' }, 'More of your tasks')) : null,
        coming.length ? h('div', { class: 'mo-needs' }, ...coming.map(({ t, m }) => row({ title: t.t, sub: m.title, st: ['Upcoming', t.due ? moSay(t.due) : 'No date'], act: ['Mark Done', () => moTick(m, t)] }))) : null),
      h('aside', { class: 'mo-col mo-col--side' },
        h('section', { class: 'rqv' },
          h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Key Dates'), h('button', { class: 'rqv-all mo-all', type: 'button', onclick: setView('dates') }, 'All dates')),
          soon.length ? h('div', { class: 'mo-dates' }, ...soon.slice(0, 4).map(x => moDateRow(x, x.m, () => moGo(x.m.id, 'tasks')))) : h('p', { class: 'rqp-empty' }, 'No dates in the next 3 weeks.')),
        h('section', { class: 'rqv' },
          h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Latest on the Team’s Matters')),
          latest.length ? h('div', { class: 'mo-feed' }, ...latest.map(e => h('button', { class: 'mo-feed-it', type: 'button', onclick: () => moGo(e.m.id, 'timeline') },
            h('span', { class: 'mo-feed-ic is-' + moKindKey(e.kind) }, moKindIc(e.kind)),
            h('span', { class: 'mo-feed-t' }, h('span', { class: 'mo-feed-x' }, e.text),
              h('span', { class: 'mo-feed-m' }, h('span', { class: 'mo-feed-mt' }, e.m.title), h('span', { class: 'mo-feed-w' }, pbWhen(e.when))))))) : h('p', { class: 'rqp-empty' }, 'Nothing new.'),
          h('p', { class: 'mo-feed-f' }, h('span', { class: 'mo-btn-spark', html: SPARK_ONE }), `Clavia keeps all ${mxPlural(open.length, 'open matter')} up to date`)))));
}
/* Ask Clavia about all the matters at once: the app's own composer, with a few questions to start from */
const MO_ASK_ALL = {
  'What is due from me this week?': () => {
    const mine = moOpenMatters().flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name && t.due && moDays(t.due) <= 7).map(t => `${t.t} (${m.title}, ${moDays(t.due) < 0 ? 'overdue since ' + moSay(t.due) : moSay(t.due)})`));
    return mine.length ? `You have ${mxPlural(mine.length, 'task')} due in the next 7 days:\n\n${mine.map(x => '• ' + x).join('\n')}` : 'Nothing is due from you in the next 7 days.';
  },
  'Which hearings are coming up?': () => {
    const hs = moMatters().flatMap(m => moUpcoming(m).filter(x => x.kind === 'Hearing').map(x => `${moSay(x.d)}: ${x.what} (${m.title}, ${m.owner})`));
    return hs.length ? `${mxPlural(hs.length, 'hearing')} coming up:\n\n${hs.map(x => '• ' + x).join('\n')}` : 'No hearings are coming up.';
  },
  'Which matters are waiting on someone else?': () => {
    const w = moOpenMatters().filter(m => m.status === 'waiting' || moOpenTasks(m).some(t => !MX_LEGAL.some(p => p.name === t.who)));
    return w.length ? `${mxPlural(w.length, 'matter')} waiting on someone outside legal:\n\n${w.map(m => `• ${m.title}: ${m.status === 'waiting' ? moStLabel(m) : moOpenTasks(m).filter(t => !MX_LEGAL.some(p => p.name === t.who)).map(t => `${t.who.split(' ')[0]} to ${t.t.charAt(0).toLowerCase() + t.t.slice(1)}`).join('; ')}`).join('\n')}` : 'Nothing is waiting on anyone else.';
  },
  'Which decisions need a fresh look?': () => {
    const f = moOpenMatters().flatMap(m => m.decisions.filter(x => x.st === 'flag').map(x => `${x.what} (${m.title})`));
    return f.length ? `${mxPlural(f.length, 'decision')} may need a fresh look, because a fact behind it changed:\n\n${f.map(x => '• ' + x).join('\n')}` : 'No decisions need a fresh look. Clavia flags one as soon as a fact behind it changes.';
  },
};
function moAskAll(q) {
  const run = MO_ASK_ALL[q];
  const open = moOpenMatters();
  openSession({ id: 'mo-all-' + Date.now(), label: titleFor(q), meta: 'now', people: [{ name: USER.name, online: true, owner: true }],
    messages: [{ role: 'user', text: q, context: { where: 'In', artifact: 'All team matters' } },
      { role: 'bot', cites: null, steps: [{ source: 'project', query: 'Read the team’s matters', count: mxPlural(open.length, 'open matter') }],
        answer: run ? run() : `I read the ${mxPlural(open.length, 'open matter')} for this. There is no model behind this demo yet, so I can only answer the suggested questions for real. Try one of them, or open a matter and ask Clavia there.` }] });
}
/* Ask Clavia about all the matters: the bar an Intake request has at its foot, held at the foot of the list */
function moListDock() {
  const q = h('input', { class: 'mt-ask-in', type: 'text', placeholder: 'Ask about your matters, deadlines or decisions', 'aria-label': 'Ask about your matters',
    onkeydown: (e) => { if (e.key === 'Enter' && q.value.trim()) { e.preventDefault(); moAskAll(q.value.trim()); } if (e.key === 'Escape') q.blur(); } });
  const sugg = h('div', { class: 'mo-dock-sugg', role: 'listbox', 'aria-label': 'Suggested questions' },
    h('div', { class: 'mo-dock-cap' }, 'Ask Clavia about all ', mxPlural(moOpenMatters().length, 'open matter')),
    ...Object.keys(MO_ASK_ALL).map(x => h('button', { class: 'mo-dock-q', type: 'button', role: 'option', onmousedown: (e) => e.preventDefault(), onclick: () => moAskAll(x) },
      h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), x)));
  return h('div', { class: 'mo-dock' }, sugg, h('div', { class: 'mt-ask rqp-ask-bar mo-dock-bar' }, h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), q));
}

/* a date with its day in a small calendar box */
const moDateRow = (x, m, run, extra) => h(run ? 'button' : 'div', { class: 'mo-date', ...(run ? { type: 'button', onclick: run } : {}) },
  h('span', { class: 'mo-cal' + (moDays(x.d) <= 2 && moDays(x.d) >= 0 ? ' is-soon' : '') }, h('span', {}, new Date(x.d).toLocaleDateString('en-GB', { month: 'short' })), h('b', {}, String(new Date(x.d).getDate()))),
  h('span', { class: 'mo-date-t' }, h('span', {}, x.what), h('span', { class: 'mo-faint' }, m ? `${m.title} · ${x.kind}` : `${x.kind} · ${moIn(x.d).toLowerCase()} · reminders 7 days and 1 day before`)),
  m ? h('span', { class: 'mo-chip' + (x.kind === 'Hearing' ? ' is-amber' : '') }, moIn(x.d)) : null, extra || null);

/* ── All Matters: the table ── */
/* the table, in Intake's columns: number, matter, status and owner (both changed in the row), who asked,
   when it opened, the next date and where it came in */
const MO_NEXT_BUCKETS = ['Overdue', 'This week', 'Next week', 'Later', 'No date'];
function moNextOf(m) {
  const late = moOpenTasks(m).filter(moLate).sort((a, b) => (a.due < b.due ? -1 : 1))[0];
  if (late) return { d: late.due, late: true };
  const dates = moUpcoming(m).map(x => x.d), tasks = moOpenTasks(m).filter(t => t.due).map(t => t.due);
  const d = [...dates, ...tasks].sort()[0];
  return d ? { d } : null;
}
const moNextBucket = (m) => { const n = moNextOf(m); if (!n || moIsClosed(m)) return 'No date'; if (n.late) return 'Overdue'; const k = moDays(n.d); return k <= 7 ? 'This week' : k <= 14 ? 'Next week' : 'Later'; };
function moAll(d, views) {
  const st = MX.matters.list;
  const repaint = () => setTimeout(() => t.paint(), 420);
  const t = mxTable({
    label: 'Matters', st, empty: 'No matters here.',
    grid: 'minmax(76px, .8fr) minmax(200px, 2.4fr) minmax(130px, 1.1fr) minmax(150px, 1.2fr) minmax(130px, 1.1fr) minmax(84px, .8fr) minmax(96px, .9fr) minmax(104px, .9fr) 28px',
    cols: [{ key: 'id', label: 'Matter #' }, { key: 'title', label: 'Matter' }, { key: 'status', label: 'Status' }, { key: 'owner', label: 'Owner' },
      { key: 'asked', label: 'Asked by' }, { key: 'opened', label: 'Opened on', desc: true }, { key: 'next', label: 'Next date' }, { key: 'source', label: 'From' }],
    tabs: views, allLast: true, allLabel: 'All', tabOf: () => null,
    filters: [
      { key: 'status', label: 'Status', of: (m) => MO_ST[m.status].label, order: (v) => Object.values(MO_ST).map(x => x.label).indexOf(v),
        mark: (v) => { const k = Object.keys(MO_ST).find(k => MO_ST[k].label === v); return k ? h('span', { class: 'mx-st-mi mx-fpop-st', style: `color:${MO_ST[k].color}`, html: MO_ST[k].svg }) : null; } },
      { key: 'owner', label: 'Owner', of: (m) => m.owner || '', none: 'Unassigned', mark: (v) => v ? mxFace(v, 'pb-av mx-fpop-av') : h('span', { class: 'mx-fpop-none mx-fpop-av', 'aria-hidden': 'true' }),
        label_of: (v) => v && v === USER.name ? `${v} (You)` : v, order: (v) => !v ? -2 : v === USER.name ? -1 : 0 },
      { key: 'asked', label: 'Asked by', of: (m) => m.asked[0], mark: (v) => mxFace(v, 'pb-av mx-fpop-av'), label_of: (v) => v === USER.name ? `${v} (You)` : v },
      { key: 'source', label: 'Came from', of: (m) => moSrc(m).name,
        mark: (v) => { const id = Object.keys(MX_CHANNEL_NAME).find(k => MX_CHANNEL_NAME[k] === v); return id ? h('img', { class: 'mx-fpop-av mx-fpop-logo', src: brandSrc(id), alt: '' }) : h('span', { class: 'mx-fpop-av mx-dlg-q' }, quillEl('static', { cls: 'mx-dlg-qi' })); } },
      { key: 'next', label: 'Next date', of: moNextBucket, fixed: MO_NEXT_BUCKETS, order: (v) => MO_NEXT_BUCKETS.indexOf(v) },
      { key: 'type', label: 'Kind of work', of: (m) => m.type },
    ],
    drops: ['status', 'owner', 'asked', 'source', 'next'],
    items: () => d.matters,
    text: (m) => [m.title, m.id, moNum(m), m.type, m.owner, m.asked[0], moStLabel(m), moSrc(m).name].join(' '),
    val: (m, k) => k === 'next' ? (moNextOf(m)?.d || '9') : k === 'status' ? Object.keys(MO_ST).indexOf(m.status) : k === 'opened' ? m.opened : k === 'asked' ? m.asked[0].toLowerCase()
      : k === 'source' ? moSrc(m).name : k === 'id' ? m.id : (m[k] || '~').toLowerCase(),
    cells: (m) => {
      const n = moIsClosed(m) ? null : moNextOf(m);
      return [
        h('span', { class: 'mx-req-id' }, moNum(m)),
        h('span', { class: 'pb-row-name mo-row-name' }, m.private ? h('span', { class: 'mo-lock', 'data-tip': 'Private matter', html: MO_IC(MO_ICONS.Access, 12) }) : null, m.title),
        moStatusBtn(m, repaint),
        moOwnerBtn(m, repaint),
        h('span', { class: 'mx-dlg', 'data-tip': m.asked[0] + (m.asked[1] ? ' · ' + m.asked[1] : '') }, mxFace(m.asked[0], 'pb-av mx-sb-av'), m.asked[0] === USER.name ? 'You' : m.asked[0].split(' ')[0]),
        h('span', { class: 'mx-created' }, new Date(m.opened).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
        n ? moDue(n.d) : h('span', { class: 'mx-none' }, '—'),
        h('span', { class: 'mo-src-ic', 'data-tip': moSrc(m).name }, moSrc(m).key ? h('img', { src: brandSrc(moSrc(m).key), alt: moSrc(m).name }) : h('span', { class: 'mx-dlg-q' }, quillEl('static', { cls: 'mx-dlg-qi' })))];
    },
    open: (m) => moGo(m.id),
    menu: (m, row) => [
      { label: 'Open', icon: 'files', run: () => moGo(m.id) },
      !moIsClosed(m) ? { label: 'Close Matter', icon: 'use', run: () => moClose(m) } : { label: 'Reopen', icon: 'use', run: () => moReopen(m) },
      { label: 'Copy Link', icon: 'copy', run: () => { navigator.clipboard?.writeText(location.origin + location.pathname + '#matters/' + m.id).catch(() => {}); pbToast('Link copied'); } },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(d.matters, m, row, 'matter', (back) => back && t.paint()) },
    ],
  });
  t.el.classList.add('mx-intake', 'mx-iv2');
  return t;
}

/* ── Tasks: every task across the matters ── */
function moTasksView(d) {
  const scope = MX.matters.scope || 'mine';
  const open = moOpenMatters();
  const all = open.flatMap(m => moOpenTasks(m).map(t => ({ t, m })));
  const of = { mine: (x) => x.t.who === USER.name, others: (x) => x.m.owner === USER.name && x.t.who !== USER.name, team: () => true };
  const list = all.filter(of[scope]).sort((a, b) => (a.t.due || '9') < (b.t.due || '9') ? -1 : 1);
  const groups = [['Overdue', (n) => n != null && n < 0], ['Today and Tomorrow', (n) => n === 0 || n === 1], ['This Week', (n) => n >= 2 && n <= 7], ['Later', (n) => n == null || n > 7]];
  return h('div', { class: 'mo-tasks' },
    h('div', { class: 'mo-tasks-bar' }, moPills([['mine', `Mine · ${all.filter(of.mine).length}`], ['others', `Waiting on Others · ${all.filter(of.others).length}`], ['team', `Whole Team · ${all.length}`]], scope,
      (k) => { MX.matters.scope = k; go('intake'); }), h('span', { class: 'mo-faint' }, 'Ticking a task here ticks it on the matter.')),
    ...groups.map(([label, test]) => {
      const rows = list.filter(x => test(moDays(x.t.due)));
      if (!rows.length) return null;
      return h('section', { class: 'rqv mo-tgroup' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' + (label === 'Overdue' ? ' mo-red' : '') }, label), h('span', { class: 'mo-faint' }, String(rows.length))),
        h('div', { class: 'mo-tlist' }, ...rows.map(({ t, m }) => moTaskRow(m, t, { showMatter: true }))));
    }),
    !list.length ? h('p', { class: 'rqp-empty' }, 'No open tasks.') : null);
}

/* one task: a box to tick, what it is, who has it, when it is due */
function moTaskRow(m, t, { showMatter } = {}) {
  const done = t.st !== 'open';
  return h('div', { class: 'mo-task' + (done ? ' is-done' : '') },
    h('button', { class: 'mo-tick' + (t.st === 'done' ? ' is-on' : t.st === 'cancelled' ? ' is-x' : ''), type: 'button', role: 'checkbox', 'aria-checked': String(t.st === 'done'),
      'aria-label': done ? t.t : `Mark “${t.t}” done`, disabled: done || moIsClosed(m), onclick: () => moTick(m, t), html: t.st === 'cancelled' ? '–' : PB_SVG.check }),
    h('span', { class: 'mo-task-t' }, h('span', { class: 'mo-task-n' }, t.t),
      showMatter || t.proof ? h('span', { class: 'mo-task-s' },
        showMatter ? h('button', { class: 'mx-link', type: 'button', onclick: () => moGo(m.id, 'tasks') }, m.title) : null,
        showMatter && t.proof && !done ? ' · ' : null,
        t.proof ? (t.proofFile ? h('span', { class: 'mo-green' }, `✓ Proof: ${t.proofFile}`) : !done ? h('span', { class: 'mo-amber' }, `Needs proof to close: ${t.proof}`) : null) : null) : null),
    mxFace(t.who, 'pb-av mo-av'), h('span', { class: 'mo-task-d' }, done ? h('span', { class: 'mo-faint' }, t.st === 'cancelled' ? 'Cancelled' : 'Done') : moDue(t.due)));
}
/* ticking a task: one that needs proof asks for it first */
function moTick(m, t) {
  if (t.st !== 'open') return;
  if (t.proof && !t.proofFile) return moProof(m, t);
  t.st = 'done'; moLog(m, 'Task', `${moMe()} finished: ${t.t}`); save();
  moRedraw(); pbToast('Done. It’s ticked on the matter too.', { label: 'Undo', run: () => { t.st = 'open'; m.tl.pop(); save(); moRedraw(); } });
}

/* ── Key Dates: every hearing and deadline ── */
function moDatesView(d) {
  const st0 = MX.matters.dates;
  const items = () => moMatters().flatMap(m => m.dates.map((x, i) => ({ ...x, id: m.id + ':' + i, m, owner: m.owner })));
  const t = mxTable({
    label: 'Key dates', st: MX.matters.dates, empty: 'No key dates yet.',
    grid: 'minmax(120px, .8fr) minmax(220px, 1.8fr) minmax(200px, 1.4fr) minmax(130px, 1fr) minmax(90px, .7fr) minmax(150px, 1fr) 32px',
    cols: [{ key: 'd', label: 'Date' }, { key: 'what', label: 'What' }, { key: 'm', label: 'Matter' }, { key: 'owner', label: 'Owner' }, { key: 'kind', label: 'Kind' }, { key: 'rem', label: 'Reminders' }],
    tabs: [{ k: 'mine', label: 'Mine', in: (x) => x.owner === USER.name }, { k: 'hear', label: 'Hearings', in: (x) => x.kind === 'Hearing' }, { k: 'past', label: 'Passed', in: (x) => moDays(x.d) < 0 }],
    tabOf: () => null,
    items: () => items().filter(x => st0.tab === 'past' ? true : moDays(x.d) >= 0),
    text: (x) => [x.what, x.m.title, x.owner, x.kind].join(' '),
    val: (x, k) => k === 'd' ? x.d : k === 'm' ? x.m.title : (x[k] || '').toLowerCase(),
    cells: (x) => [h('span', { class: 'mo-name' }, h('span', {}, moSay(x.d)), h('span', { class: 'mo-faint mo-name-s' }, moIn(x.d))), x.what,
      h('span', { class: 'mo-name' }, h('span', {}, x.m.title), h('span', { class: 'mo-faint mo-name-s' }, moNum(x.m))), mxPerson(x.owner),
      h('span', { class: 'mo-chip' + (x.kind === 'Hearing' ? ' is-amber' : '') }, x.kind), h('span', { class: 'mo-faint' }, '7 days and 1 day before')],
    open: (x) => moGo(x.m.id, 'tasks'),
  });
  return h('div', {}, h('p', { class: 'mo-line mo-faint' }, h('span', { class: 'mo-dot' }), 'Each date has reminders and shows in its owner’s Outlook calendar.'), t.el);
}

/* ==================================================================
   New matter: from an Intake request, or blank
================================================================== */
function moNewMatter(anchor, keyboard) {
  pbWaysMenu(anchor, 'mo-new', [
    { key: 'ai', name: 'Describe It to Clavia', desc: 'Say what the matter is about in your own words, and Clavia fills it in.', icon: () => quillEl('static', { cls: 'pb-way-quill' }) },
    { key: 'form', name: 'Fill in a Form', desc: 'A name and the kind of work. Clavia suggests the first tasks.', icon: () => { const w = h('span', { html: MX_FORM_IC }); return w.firstChild; } },
    { key: 'intake', name: 'From an Intake Request', desc: 'Its facts, files and the person who asked come across.', icon: () => h('span', { html: MX_REQ_IC }) },
  ], (k) => {
    if (k === 'ai') { MX.matters.open = 'new'; return go('matters'); }
    if (k === 'form') return moBlank();
    const reqs = mxIntake().filter(r => !r.matter && r.status !== 'done' && r.status !== 'cancelled');
    mxPick({ title: 'Open a Matter From a Request', sub: 'Requests in Intake that need more than one answer', one: true, action: 'Next',
      groups: [{ items: reqs.map(r => ({ id: r.id, label: r.title, sub: `${r.id} · ${r.submitter}` })) }],
      onDone: ([id]) => moFromRequest(mxIntake().find(r => r.id === id)) });
  }, { keyboard });
}
/* "Describe it to Clavia": the New Request page, asking about a matter */
function moCreatePage() {
  return mxCreatePage({ view: 'matters', back: 'Matters', title: 'What is the matter about?',
    placeholder: 'e.g. Northwind says our software caused them a loss and wants £120,000…',
    run: (text, files, step) => {
      step('Reading what you wrote…');
      setTimeout(() => step('Checking for conflicts and who should own it…'), 900);
      setTimeout(() => {
        const type = /owe|claim|court|tribunal|dispute|sue|loss|damages/i.test(text) ? 'Dispute' : /employ|dismiss|hr\b|staff/i.test(text) ? 'Employment'
          : /contract|agreement|renewal|deal|sign|terms/i.test(text) ? 'Contract' : 'Advice';
        const other = (/(?:with|against|from|by|for)\s+([A-Z][\w&’'-]+(?:\s+[A-Z][\w&’'-]+){0,3})/.exec(text) || [])[1] || (/^([A-Z][\w&’'-]+(?:\s+[A-Z][\w&’'-]+){0,2})\s+(?:says|wants|claims|sent)/.exec(text) || [])[1];
        const money = (/£\s?[\d,.]+k?/.exec(text) || [])[0];
        const d = moData(), id = 'MT-' + (Math.max(208, ...d.matters.map(x => +x.id.split('-')[1])) + 1);
        const facts = [other ? ['Other side', other] : null, money ? [type === 'Dispute' ? 'What they claim' : 'Value', money] : null].filter(Boolean);
        const m = moBlankMatter(id, titleFor(text), type, { facts, where: text.length > 220 ? text.slice(0, 217) + '…' : text,
          files: files.map(n => ({ kind: 'file', from: USER.name, name: n, note: 'Added when the matter was opened', when: mxNow() })) });
        d.matters.unshift(m); save();
        MX.matters.open = null; moGo(m.id);
        pbToast(`Matter ${id} opened as ${type === 'Advice' || type === 'Employment' ? 'an' : 'a'} ${type.toLowerCase()} matter. Clavia suggested 3 first tasks.`);
      }, 1900);
    } });
}
const moTypeOf = (r) => /dispute|owe|claim|court|tribunal/i.test(r.title + ' ' + (r.detail || '')) ? 'Dispute'
  : /employ|dismiss|hr\b/i.test(r.title) ? 'Employment' : r.type === 'Advice' || r.type === 'Privacy' ? 'Advice' : 'Contract';

/* the Open a Matter dialog: what came across, the first tasks, who can see it */
function moFromRequest(r) {
  if (!r) return;
  if (r.mt) return mxOpen('intake', r.id);
  const orbis = r.id === mxData().orbisRq;
  const f = { name: orbis ? 'Orbis supplier dispute' : r.title, type: moTypeOf(r), keep: [true, true, true], priv: false };
  const first = r.submitter.split(' ')[0];
  const tasks = () => orbis ? [['Collect the supplier contract and all invoices', USER.name, null], ['Get delivery records for May and June from Tom', 'Tom Becker', 2], ['Check what the contract says about late delivery', USER.name, 3]]
    : MO_FIRST[f.type].map((t, i) => [t, USER.name, i + 2]);
  const facts = orbis ? [['Other side', 'Orbis Supplies Ltd'], ['What they claim', '£64,000 in unpaid invoices'], ['Why we held back', '2 late deliveries, May and June'], ['Asked by', 'Tom Becker, finance']]
    : [['Other side', r.counterparty || '—'], ['Kind of work', r.type], ['Asked by', `${r.submitter}${r.team ? ', ' + r.team.toLowerCase() : ''}`], ['Needed by', r.due ? moSay(r.due) : '—']];
  const files = (r.files || []).map(n => typeof n === 'string' ? n : n.name);
  /* the conflict check: has anyone on the legal team worked for the other side? */
  const other = orbis ? 'Orbis Supplies Ltd' : r.counterparty || '';
  const conflicts = Object.entries(MO_HISTORY).filter(([, [org]]) => other && org.toLowerCase().split(' ')[0] === other.toLowerCase().split(' ')[0]).map(([who, [org, when]]) => ({ who, org, when }));
  f.out = conflicts.map(() => true);
  const ruleOwner = moRuleOwner(f.type);
  f.owner = USER.name;
  const dlg = moDialog({
    title: 'Turn into a Matter', sub: `${r.id} keeps its number. It gains tasks, key dates, decisions and money.`, wide: true,
    body: () => [
      moField('Matter Name', moInput(f.name, (v) => { f.name = v; })),
      moField('Kind of Work', moPills(MO_TYPES, f.type, (k) => { f.type = k; dlg.paint(); })),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Clavia brought this across, so nothing is typed again'),
        h('div', { class: 'rqd-grid mo-dlg-facts' }, ...facts.map(([k, v]) => h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, k), h('span', { class: 'rqd-v' }, v)))),
        files.length ? h('div', { class: 'mo-files-chips' }, ...files.map(n => h('span', { class: 'mo-fchip' }, mxTile('file', mxExt(n)), n))) : null),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, `First tasks, suggested for ${f.type === 'Advice' || f.type === 'Employment' ? 'an' : 'a'} ${f.type.toLowerCase()} · ${f.keep.filter(Boolean).length} of 3 kept`),
        ...tasks().map(([t, who, due], i) => moCheck(f.keep[i], t, `${who === USER.name ? 'You' : who}${due != null ? ' · ' + moSayN(due) : ''}`, () => { f.keep[i] = !f.keep[i]; dlg.paint(); }))),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Owner'),
        moPills([[USER.name, 'You'], ...(moRuleOwner(f.type) && moRuleOwner(f.type) !== USER.name ? [[moRuleOwner(f.type), `${moRuleOwner(f.type)} · usual for ${f.type.toLowerCase()} matters`]] : [])],
          f.owner, (k) => { f.owner = k; dlg.paint(); })),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Conflict check: has anyone on the legal team worked for ' + (other || 'the other side') + '?'),
        conflicts.length ? h('div', { class: 'mo-says is-amber' }, h('span', { class: 'mo-says-ic', html: MO_IC('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 17v.2"/>', 15) }),
          h('div', {}, ...conflicts.map((c, i) => h('div', {}, h('b', {}, `${c.who} used to work at ${c.org.replace(/ Ltd$/, '')} (${c.when}).`),
            moCheck(f.out[i], `Keep ${c.who.split(' ')[0]} out of this matter`, `${c.who.split(' ')[0]} won’t be able to open it, its files or its chats.`, () => { f.out[i] = !f.out[i]; dlg.paint(); })))))
          : h('div', { class: 'mo-ok' }, h('span', { class: 'mo-green' }, '✓'), `Nobody on the legal team has worked for ${other || 'the other side'}.`)),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Who can see it'),
        moCheck(f.priv, 'Private', f.priv ? `Only you and ${first} can open it.` : 'Off: anyone in legal can find it. Turn this on for sensitive matters.', () => { f.priv = !f.priv; dlg.paint(); })),
    ],
    foot: (close) => [h('span', { class: 'mo-faint mo-foot-say' }, `${first} is told when the matter opens.`), moBtn('Cancel', close), moBtn('Turn into a Matter', () => {
      close();
      /* one piece of work, one item: the request itself takes the matter's parts */
      let base;
      if (orbis) base = moOrbis(r.id, f.keep, f.priv);
      else base = moBlankMatter(r.id, f.name.trim() || r.title, f.type, { asked: [r.submitter, r.team || ''], priv: f.priv,
          facts: facts.filter(x => x[1] !== '—' && x[0] !== 'Asked by' && x[0] !== 'Kind of work' && x[0] !== 'Needed by'), tasks: tasks().filter((_, i) => f.keep[i]).map(([t, who, due]) => moT(t, who, due)),
          where: `${r.title}. Clavia keeps this up to date as emails, files and tasks come in.` });
      base.type = f.type; base.private = f.priv;
      moAttachParts(r, base);
      if (f.name.trim() && f.name.trim() !== r.title) r.title = f.name.trim();
      r.stage = 1; r.attorney ||= f.owner; if (r.status === 'new') r.status = 'progress';
      const m = moAsMatter(r);
      conflicts.forEach((c, i) => { if (f.out[i]) { m.keptOut.push({ who: c.who, why: `Used to work at ${c.org.replace(/ Ltd$/, '')} ${c.when}`, by: 'Clavia', when: mxNow() });
        moLog(m, 'Access', `Clavia kept ${c.who.split(' ')[0]} out of the matter: ${c.who.split(' ')[0]} used to work at ${c.org.replace(/ Ltd$/, '')} (conflict check)`, 'Clavia'); } });
      r.updated = mxNow(); (r.activity ||= []).push({ who: USER.name, what: 'turned this into a matter', when: mxNow() });
      save(); MX.intake.tab = 'summary'; MX.intake.open = null; mxOpen('intake', r.id); pbToast(`${r.id} is now a matter. ${first} has been told.`);
    }, true)],
  });
}
function moBlankMatter(id, title, type, o = {}) {
  return { id, title, type, owner: USER.name, status: 'open', stage: 0, private: !!o.priv, opened: mxNow(), client: 0, source: o.source || 'manual',
    asked: o.asked || [USER.name, 'Legal'], from: o.from || null,
    where: o.where || 'Just opened. Clavia keeps this line up to date as emails, files and tasks come in.',
    facts: o.facts || [], tasks: o.tasks || MO_FIRST[type].map(t => moT(t, USER.name, null)), dates: [], files: o.files || [], decisions: [],
    people: [[USER.name, 'Owner'], ...(o.asked && o.asked[0] !== USER.name ? [[o.asked[0], 'Asked for it']] : [])], money: null,
    links: o.from ? [[`Intake request ${o.from}`, 'Intake']] : [], chats: [], updates: [],
    tl: [{ when: mxNow(), kind: 'Matter', text: `${moMe()} opened the matter${o.from ? ' from request ' + o.from : ''}`, who: USER.name }],
    ask: [], draft: '', keptOut: [], shares: [] };
}
/* a new piece of bigger work: a request in Intake that is a matter from the start */
function moNewRequestMatter(title, type, o = {}) {
  const r = { id: mxNextRq(), title, deal: null, counterparty: o.other || null, type: type === 'Contract' ? 'Contract review' : 'Advice', team: 'Legal',
    attorney: o.owner || USER.name, status: 'progress', due: moDay(7), urgent: false, updated: mxNow(), created: mxNow(), submitter: USER.name, source: null,
    detail: o.where || '', files: [], triaged: true, activity: [{ who: USER.name, what: 'started this as a matter', when: mxNow() }] };
  const base = moBlankMatter(r.id, title, type, { facts: o.facts, where: o.where });
  moAttachParts(r, base); r.stage = 0;
  mxIntake().unshift(r); save();
  return r;
}
function moBlank() {
  const f = { name: '', type: 'Advice', owner: USER.name };
  const dlg = moDialog({
    title: 'Start a Matter', sub: 'For bigger work: tasks, key dates, decisions and money from the start. It gets a request number like any other.',
    body: () => [moField('Name', moInput(f.name, (v) => { f.name = v; }, 'e.g. Review of the new supplier code of conduct')),
      moField('Kind of Work', moPills(MO_TYPES, f.type, (k) => { f.type = k; f.owner = USER.name; dlg.paint(); })),
      moField('Owner', moPills([[USER.name, 'You'], ...(moRuleOwner(f.type) && moRuleOwner(f.type) !== USER.name ? [[moRuleOwner(f.type), `${moRuleOwner(f.type)} · usual for ${f.type.toLowerCase()} matters`]] : [])], f.owner, (k) => { f.owner = k; dlg.paint(); })),
      h('p', { class: 'mo-faint' }, `Clavia suggests 3 first tasks for ${f.type === 'Advice' || f.type === 'Employment' ? 'an' : 'a'} ${f.type.toLowerCase()} matter.`)],
    foot: (close) => [moBtn('Cancel', close), moBtn('Start Matter', () => {
      const r = moNewRequestMatter(f.name.trim() || 'Review of the new supplier code of conduct', f.type, { owner: f.owner });
      close(); MX.intake.tab = 'summary'; mxOpen('intake', r.id); pbToast(`${r.id} started as a matter. Clavia suggested 3 first tasks.`);
    }, true)],
  });
}

/* ==================================================================
   One matter
================================================================== */
/* the tabs an Intake request has, in its order: Overview, the work, Documents, Details, the people, Activity */
const MO_TABS = [['overview', 'Overview'], ['tasks', 'Tasks'], ['docs', 'Documents'], ['decisions', 'Decisions'], ['details', 'Details'], ['people', 'People'], ['activity', 'Activity']];
const MO_TAB_ALIAS = { files: 'docs', chats: 'activity', updates: 'activity', timeline: 'activity' };

function moPage(m) {
  const closed = moIsClosed(m);
  if (MO_TAB_ALIAS[MX.matters.tab]) MX.matters.tab = MO_TAB_ALIAS[MX.matters.tab];
  let tab = MO_TABS.some(t => t[0] === MX.matters.tab) ? MX.matters.tab : 'overview';
  const ask = MX.matters.ask && MX.matters.ask.id === m.id ? MX.matters.ask : null;
  if (MX.matters.ask && !ask) MX.matters.ask = null;

  const title = h('h1', { class: 'br-title rqp-title', contenteditable: closed ? 'false' : 'true', spellcheck: 'false', 'data-empty': 'Untitled matter',
    oninput: () => { m.title = title.textContent.trim() || 'Untitled matter'; save(); }, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } } });
  title.textContent = m.title;
  const src = moSrc(m), nx = closed ? null : moNextOf(m), asker = m.asked[0], af = asker.split(' ')[0];
  const meta = h('div', { class: 'br-meta rqp-meta' },
    h('span', { class: 'rqp-id' }, moNum(m)), h('span', { class: 'mt-sep' }, '·'),
    h('span', { class: 'rqp-from' }, asker === USER.name ? 'Opened by you' : `From ${asker}`, ...(src.key && asker !== USER.name ? [' via ', h('img', { class: 'rqp-via', src: brandSrc(src.key), alt: '' }), src.name] : [])),
    ...(m.from ? [h('span', { class: 'mt-sep' }, '·'), h('button', { class: 'mx-link mo-from', type: 'button', 'data-tip': 'Open the Intake request', onclick: () => { if (mxIntake().some(r => r.id === m.from)) mxOpen('intake', m.from); else pbToast(`${m.from} is an older request, kept in Intake’s history`); } }, m.from)] : []),
    ...(nx ? [h('span', { class: 'mt-sep' }, '·'), h('span', { class: 'rqp-due' }, 'Next ', moDue(nx.d))] : []),
    ...(moData().byClient ? [h('span', { class: 'mt-sep' }, '·'), moClient(m)] : []),
    m.private ? h('span', { class: 'mo-chip mo-priv' }, h('span', { html: MO_IC(MO_ICONS.Access, 11) }), 'Private') : null);
  /* who owns it, changed here; when nobody does, Clavia's suggestion is one click from being the answer */
  const owner = moOwnerBtn(m, () => moRedraw());
  const sgOwner = !m.owner && moRuleOwner(m.type);
  const controls = h('div', { class: 'rqp-ctl' }, owner, sgOwner ? h('button', { class: 'rqp-sg-ok', type: 'button', onclick: () => owner._set(sgOwner) }, 'Assign') : null);

  const ink = h('span', { class: 'br-ink', 'aria-hidden': 'true' });
  const count = { tasks: moOpenTasks(m).length, docs: m.files.length, decisions: m.decisions.length };
  const tabBtns = MO_TABS.map(([k, label]) => h('button', { class: 'br-tab', type: 'button', role: 'tab', 'data-k': k, 'aria-selected': String(k === tab),
    onclick: () => { MX.matters.tab = k; moRedraw(); } }, label, count[k] ? h('span', { class: 'rqp-tab-n' }, String(count[k])) : null));
  const tabs = h('div', { class: 'br-tabs mo-tabs', role: 'tablist' }, ...tabBtns, ink);
  requestAnimationFrame(() => { const on = tabBtns.find(b => b.dataset.k === tab); if (on?.offsetWidth) { ink.style.setProperty('--w', on.offsetWidth + 'px'); ink.style.setProperty('--x', on.offsetLeft + 'px'); } });

  const body = h('div', { class: 'rqp-body mo-body', 'data-tab': tab }, ...[].concat(MO_TAB_BODY[tab](m)).filter(Boolean));

  const more = h('button', { class: 'br-dots', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions', html: PB_SVG.dots,
    onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(more, [
      asker !== USER.name ? { label: `Message ${af}`, icon: 'ask', run: () => { moSetTab('activity'); MX.matters.upd = { id: m.id, text: '', vis: 'shared' }; moRedraw(); setTimeout(() => document.querySelector('.mo-cmp-in')?.focus(), 60); } } : null,
      !closed ? { label: 'Hand Over', icon: 'share', run: () => moHandOver(m) } : null,
      !closed ? { label: 'Close Matter', icon: 'use', run: () => moClose(m) } : { label: 'Reopen', icon: 'use', run: () => moReopen(m) },
      asker !== USER.name ? { label: `Open ${af}’s View`, icon: 'open', run: () => { MX.matters.open = m.id + '/asker'; go('matters'); } } : null,
      { label: 'Share', icon: 'share', run: () => { navigator.clipboard?.writeText(location.href).catch(() => {}); pbToast('Link copied. Anyone in legal can open it.'); } },
      { label: 'Copy Link', icon: 'copy', run: () => { navigator.clipboard?.writeText(location.href).catch(() => {}); pbToast('Link copied'); } },
      { rule: true },
      { label: 'Delete Matter', icon: 'trash', danger: true, run: () => pbConfirm({ title: `Delete ${moNum(m)}?`, lead: `“${m.title}”, its files, decisions and history are deleted.`, action: 'Delete',
        run: () => { const l = moData().matters; l.splice(l.indexOf(m), 1); save(); MX.matters.open = null; go('matters'); pbToast(`${moNum(m)} deleted`); } }) },
    ]); } });
  /* the document can be put away, as on a request, and brought back from here */
  const docBack = MX.matters.paneOff && !ask ? h('button', { class: 'btn mo-top-btn', type: 'button', onclick: () => { MX.matters.paneOff = false; moRedraw(); } }, 'Show Document') : null;
  const top = h('div', { class: 'br-top' },
    h('button', { class: 'br-back', type: 'button', onclick: () => { MX.matters.open = null; MX.matters.ask = null; go('matters'); } },
      h('span', { class: 'br-back-a', html: MO_IC('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15) }), 'Matters'),
    h('div', { class: 'br-top-r' }, docBack, moStatusBtn(m, () => moRedraw(), true), more));

  const banner = closed ? h('div', { class: 'rqp-old mo-closed' }, h('span', {}, `Closed ${moSay(m.closed.when)} by ${m.closed.by} · ${m.closed.outcome}. Clavia uses the closing summary for similar matters.`),
    h('button', { class: 'mx-link', type: 'button', onclick: () => moReopen(m) }, 'Reopen')) : null;

  const askIn = h('input', { class: 'mt-ask-in', type: 'text', placeholder: `Ask about ${moNum(m)}`, 'aria-label': `Ask about ${m.title}`,
    onkeydown: (e) => { if (e.key === 'Enter' && askIn.value.trim()) { e.preventDefault(); moAsk(m, askIn.value.trim()); } },
    onfocus: () => { if (!ask) { MX.matters.ask = { id: m.id, conv: [] }; moRedraw(); setTimeout(() => document.querySelector('.mo-ask-in')?.focus(), 30); } } });
  const dock = ask ? null : h('div', { class: 'rqp-dock' }, h('div', { class: 'mt-ask rqp-ask-bar' }, h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), askIn));

  const left = h('div', { class: 'rqp-left' },
    h('div', { class: 'rqp-left-in' }, top, title, meta, controls, banner, tabs, body), dock);
  /* as on an Intake request: the page on the left, the document on the right; Ask Clavia takes its place while it is open */
  const off = MX.matters.paneOff && !ask;
  const grid = h('div', { class: 'rqp mo-page' + (ask ? ' has-ask' : '') + (off ? ' is-doc-hidden' : '') }, left, ask ? moAskPanel(m, ask) : moDocPane(m));
  if (off) grid.style.gridTemplateColumns = 'minmax(0, 1fr) 0px';
  return h('div', { class: 'rqp-host' }, grid);
}

const MO_TAB_BODY = {
  overview: moTabOverview, tasks: moTabTasks, docs: moTabFiles, decisions: moTabDecisions, details: moTabDetails, people: moTabPeople, activity: moTabActivity,
};
/* Activity, as on an Intake request: one box to add a comment (legal only) or message the person who asked
   (it goes out in their own channel, and their reply comes back here), then everything, newest first, by day */
const MO_REPLIES = { 'MT-208': 'Sent them just now. The June delivery was 9 days late, not 5 weeks, so May is the only one over 14 days.',
  'MT-201': 'Thanks Roger. Vantage want to sign by the end of next week if they can.', 'MT-188': 'Will do, the India sales figures are on their way.',
  'MT-190': 'Spoke to Ironclad, they’ll sign tomorrow morning.', 'MT-176': 'Brindle say the data stays in their UK data centre and is kept for 12 months.' };
function moTabActivity(m) {
  const asker = m.asked[0], first = asker.split(' ')[0], self = asker === USER.name, ch = moSrc(m);
  const where = ch.key === 'teams' || ch.key === 'slack' ? ch.name : 'Outlook', viaKey = ch.key === 'teams' || ch.key === 'slack' ? ch.key : 'outlook';
  const u = MX.matters.upd && MX.matters.upd.id === m.id ? MX.matters.upd : null;
  let mode = self ? 'legal' : (u ? u.vis : 'legal');
  const I = (p, w = 15) => MO_IC(p, w);
  const box = h('textarea', { class: 'mx-reply-in mo-cmp-in', rows: '1', 'aria-label': 'Add a comment' });
  if (u) box.value = u.text || '';
  const send = h('button', { class: 'mx-rq-send', type: 'button', disabled: !box.value.trim(), 'aria-label': 'Send', html: MO_IC('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 13) });
  const seg = self ? null : h('div', { class: 'mo-pills mo-cmp-mode' }, ...[['legal', 'Comment'], ['shared', `Message ${first}`]].map(([k, label]) =>
    h('button', { class: 'mo-pill' + (k === mode ? ' is-on' : ''), type: 'button', onclick: () => { mode = k; paintMode(); box.focus(); } }, label)));
  const draft = !self && m.draft ? h('button', { class: 'mx-link mo-cmp-draft', type: 'button', onclick: () => { mode = 'shared'; box.value = m.draft; paintMode(); send.disabled = false; box.focus(); } },
    h('span', { class: 'mo-btn-spark', html: SPARK_ONE }), 'Draft with Clavia') : null;
  const say = h('span', { class: 'mo-faint mo-cmp-say' });
  const atBtn = h('button', { class: 'rqx-c-b', type: 'button', 'aria-label': 'Mention someone', 'data-tip': 'Mention Someone', html: I('<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.5 7"/>'),
    onclick: (e) => { e.stopPropagation(); menu(atBtn, MX_LEGAL.filter(p => p.name !== USER.name && !m.keptOut.some(k => k.who === p.name)).map(p => ({ label: p.name, run: () => { box.value += (box.value && !/\s$/.test(box.value) ? ' ' : '') + '@' + p.name + ' '; box.focus(); send.disabled = false; } }))); } });
  const composer = h('div', { class: 'mx-rq-composer rqx-compose mo-cmp' }, h('div', { class: 'rqx-c-row' }, box, atBtn, send),
    h('div', { class: 'mo-cmp-foot' }, seg, draft, say));
  const paintMode = () => {
    composer.classList.toggle('is-note', mode === 'legal');
    box.placeholder = mode === 'legal' ? 'Add a comment for the legal team' : `Write to ${first}…`;
    say.replaceChildren(mode === 'legal' ? 'Only legal sees this.' : h('span', {}, 'Goes to ', first, ' in ', h('img', { class: 'rqx-via', src: brandSrc(viaKey), alt: '' }), where));
    seg?.querySelectorAll('.mo-pill').forEach((b, i) => b.classList.toggle('is-on', (i === 0) === (mode === 'legal')));
  };
  const post = () => {
    const text = box.value.trim(); if (!text) return;
    m.updates.unshift({ who: USER.name, vis: mode, text: text[0].toUpperCase() + text.slice(1), when: mxNow() });
    MX.matters.upd = null; save(); moRedraw();
    pbToast(mode === 'legal' ? 'Comment added for the legal team' : `Sent to ${first} in ${where}`);
    if (mode === 'shared' && /\?/.test(text) && MO_REPLIES[m.id]) setTimeout(() => {
      m.updates.unshift({ who: asker, vis: 'reply', text: MO_REPLIES[m.id], when: mxNow() }); save();
      if (MX.matters.open === m.id) moRedraw();
      pbToast(`${first} replied in ${where}`);
    }, 4500);
  };
  box.addEventListener('input', () => { send.disabled = !box.value.trim(); if (u) u.text = box.value; });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(); } });
  send.onclick = post;
  paintMode();

  /* everything that happened, as one stream */
  const items = [
    ...m.updates.map(x => ({ when: x.when, who: x.who, kind: x.vis === 'legal' ? 'note' : x.vis === 'reply' ? 'reply' : 'message', text: x.text })),
    ...m.chats.map(c => ({ when: c.when, who: c.who, kind: 'chat', text: c.t, c })),
    ...m.tl.filter(e => e.kind !== 'Update' && e.kind !== 'Chat').map(e => ({ when: e.when, who: e.who, kind: 'event', text: e.text, ek: e.kind })),
  ].sort((a, b) => (a.when < b.when ? 1 : -1));
  const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const face = (who) => who === 'Clavia' ? h('span', { class: 'rqx-av rqx-av--clavia' }, quillEl('static', { cls: 'rqx-q' })) : mxFace(who, 'rqx-av');
  const out = []; let day = null;
  for (const it of items) {
    const dd = moDays(it.when) === 0 ? 'Today' : moDays(it.when) === -1 ? 'Yesterday' : new Date(it.when).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    if (dd !== day) { day = dd; out.push(h('div', { class: 'rqa-day' }, dd)); }
    const name = it.who === USER.name ? 'You' : it.who;
    if (it.kind === 'event') {
      out.push(h('div', { class: 'rqx' }, h('span', { class: 'rqx-face' }, face(it.who)),
        h('div', { class: 'rqx-b' }, h('div', { class: 'rqx-h' }, h('span', { class: 'rqx-what mo-ev-t' }, it.text), h('span', { class: 'mo-chip mo-ev-k' }, it.ek), h('span', { class: 'rqx-time' }, time(it.when))))));
    } else if (it.kind === 'chat') {
      out.push(h('div', { class: 'rqx' }, h('span', { class: 'rqx-face' }, face(it.who)),
        h('div', { class: 'rqx-b' }, h('div', { class: 'rqx-h' }, h('span', { class: 'rqx-who' }, name), ' ', h('span', { class: 'rqx-what' }, 'asked Clavia'), h('span', { class: 'rqx-time' }, time(it.when))),
          h('button', { class: 'rqx-t mo-chat-t', type: 'button', onclick: () => moChat(m, it.c) }, h('span', { class: 'mo-btn-spark', html: SPARK_ONE }), it.text))));
    } else {
      const what = it.kind === 'note' ? 'commented' : it.kind === 'reply' ? 'replied' : `wrote to ${first}`;
      out.push(h('div', { class: 'rqx is-said' }, h('span', { class: 'rqx-face' }, face(it.who)),
        h('div', { class: 'rqx-b' }, h('div', { class: 'rqx-h' }, h('span', { class: 'rqx-who' }, name), ' ', h('span', { class: 'rqx-what' }, what),
          it.kind !== 'note' ? h('img', { class: 'rqx-via', src: brandSrc(viaKey), alt: '' }) : null, h('span', { class: 'rqx-time' }, time(it.when))),
          h('div', { class: 'rqx-t' + (it.kind === 'note' ? ' is-note' : it.kind === 'reply' ? ' is-them' : '') }, it.text))));
    }
  }
  return [composer, h('div', { class: 'rqa mo-stream' }, ...out)];
}
/* Details, as a request's: groups of label and value, each value changed by clicking it */
function moTabDetails(m) {
  const closed = moIsClosed(m);
  const sec = (title, ...cells) => h('section', { class: 'rqv' }, h('h3', { class: 'rqv-h' }, title), h('div', { class: 'rqv-rows' }, ...cells.filter(Boolean)));
  const cell = (label, val, edit) => {
    const v = h('span', { class: 'rqd-v' + (edit && !closed ? ' is-edit' : '') }, val ?? '');
    if (edit && !closed) { v.contentEditable = 'plaintext-only'; v.spellcheck = false; v.dataset.empty = 'Add';
      v.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); v.blur(); } if (e.key === 'Escape') { v.textContent = val ?? ''; v.blur(); } };
      v.onblur = () => { const t = v.textContent.trim(); if (t === String(val ?? '')) return; edit(t); save(); pbToast(`${label} saved. Clavia uses it from now on.`); }; }
    return h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, label), v);
  };
  const pick = (label, now, opts, set) => { const v = h('span', { class: 'rqd-v is-act', role: 'button', tabindex: '0' }, now, h('span', { class: 'rqv-chev', html: MO_IC('<path d="m7 10 5 5 5-5"/>', 13) }));
    if (!closed) v.onclick = (e) => { e.stopPropagation(); menu(v, opts.map(o => ({ label: o, tick: o === now, run: () => { if (o !== now) { set(o); save(); moRedraw(); } } }))); };
    return h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, label), v); };
  const mo = m.money;
  const num = (k) => (t) => { m.money ||= { budget: 0, billed: 0, okd: 0, expected: 0, firm: '' }; m.money[k] = +t.replace(/[^\d]/g, '') || 0; setTimeout(moRedraw, 0); };
  const addr = `${m.id.toLowerCase()}@legal.lumen.io`;
  return [
    sec('Matter',
      pick('Kind of work', m.type, MO_TYPES, (o) => { m.type = o; moLog(m, 'Matter', `${moMe()} changed the kind of work to ${o}`); }),
      h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, 'Status'), h('span', { class: 'rqd-v' }, moStatusBtn(m, () => moRedraw()))),
      h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, 'Owner'), h('span', { class: 'rqd-v' }, moOwnerBtn(m, () => moRedraw()))),
      cell('Asked by', h('span', { class: 'rqv-who' }, mxFace(m.asked[0], 'pb-av rqv-av'), m.asked[0], m.asked[1] ? h('span', { class: 'rqv-faint' }, m.asked[1]) : null)),
      cell('Came in', moSrcEl(m)),
      cell('Opened on', new Date(m.opened).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })),
      moData().byClient ? pick('Client', moClient(m), MO_CLIENTS.map(c => c[0]), (o) => { m.client = MO_CLIENTS.findIndex(c => c[0] === o); }) : null,
      cell('Email address', h('span', { class: 'rqv-who' }, addr, h('button', { class: 'mx-link', type: 'button', onclick: () => { navigator.clipboard?.writeText(addr).catch(() => {}); pbToast('Copied'); } }, 'Copy')))),
    h('section', { class: 'rqv' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Key Facts'), h('span', { class: 'mo-faint mo-help-s' }, 'Clavia uses these in every answer about this matter')),
      h('div', { class: 'rqv-rows' }, ...m.facts.map((f, i) => cell(f[0], f[1], (t) => { if (t) m.facts[i][1] = t; else m.facts.splice(i, 1); setTimeout(moRedraw, 0); }))),
      !closed ? h('button', { class: 'rqp-add', type: 'button', onclick: () => moFacts(m) }, '+ Add a fact') : null),
    sec('Money',
      cell('Budget for outside lawyers', mo ? moMoney(mo.budget) : '', num('budget')),
      cell('Paid', mo ? moMoney(mo.billed) : '', num('billed')),
      cell('OK’d, not billed yet', mo ? moMoney(mo.okd) : '', num('okd')),
      cell('Expected later', mo ? moMoney(mo.expected) : '', num('expected')),
      mo ? cell('Left in budget', h('b', { class: mo.budget - mo.billed - mo.okd - mo.expected < 0 ? 'mo-red' : '' }, moMoney(mo.budget - mo.billed - mo.okd - mo.expected))) : null,
      mo?.firm ? cell('Outside lawyers', mo.firm) : null),
    sec('Linked Records', ...(m.links.length ? m.links.map(([n, src]) => cell(n, h('span', { class: 'rqv-faint' }, src))) : [h('p', { class: 'rqp-empty' }, 'None yet. Records kept in other systems show here; Clavia doesn’t copy them.')])),
  ];
}

/* the right side: the document or email open on the matter, the way an Intake request shows its document */
function moDocPane(m) {
  const addr = `${m.id.toLowerCase()}@legal.lumen.io`;
  if (!m.files.length) return h('section', { class: 'rqp-right rqp-right--empty' }, h('div', { class: 'rqp-none' },
    h('span', { class: 'rqp-none-ic' }, mxTile('file', 'doc')), h('b', {}, 'No documents yet'),
    h('p', {}, `Forward emails to ${addr}, or add a file, and it shows here.`),
    h('div', { class: 'rqp-none-go' }, h('button', { class: 'btn btn--primary', type: 'button', onclick: () => pbToast('Upload a file from your computer, or drop it on this page') }, 'Add a File'))));
  const f = moShownDoc(m), email = f.kind === 'email', fi = m.files.indexOf(f);
  const vers = f.v || 1, sel = MX.matters.ver && MX.matters.ver.f === f ? MX.matters.ver.v : vers;
  const body = MO_BODIES[f.name] || (email ? `Sent to ${addr} and saved on this matter.` : `${f.name}\n\nSaved on this matter${f.note ? ' · ' + f.note.toLowerCase() : ''}. Clavia has read it and uses it in answers about ${m.title}.`);
  const I = (p) => h('span', { html: MO_IC(p, 16) });
  const tool = (tip, ic, run, cls = 'rqp-tool--icon') => h('button', { class: 'rqp-tool ' + cls, type: 'button', 'data-tip': tip, 'aria-label': tip, onclick: run }, ic, cls === 'rqp-tool--word' ? h('span', { class: 'rqp-tool-t' }, tip) : null);
  const chev = h('span', { class: 'rqp-ver-c', html: MO_IC('<path d="m7 10 5 5 5-5"/>', 14) });
  const docBtn = h('button', { class: 'rqp-docsw mo-docsw', type: 'button', 'aria-haspopup': 'listbox', onclick: (e) => { e.stopPropagation();
    menu(docBtn, [...m.files].map((x, i) => ({ x, i })).reverse().map(({ x, i }) => ({ label: x.name, tick: x === f, run: () => { MX.matters.doc = { id: m.id, i }; MX.matters.ver = null; moRedraw(); } }))); } },
    h('span', { class: 'rqp-doc-n' }, f.name.replace(/\.(docx?|pdf|xlsx?)$/i, '')), chev);
  /* versions, the way a request keeps them: the latest first, an older one shown with a note */
  const verBtn = !email ? h('button', { class: 'rqp-ver', type: 'button', 'aria-haspopup': 'listbox', onclick: (e) => { e.stopPropagation();
    menu(verBtn, Array.from({ length: vers }, (_, i) => vers - i).map(v => ({ label: `Version ${v}${v === vers ? ' · latest' : ''}`, tick: v === sel, run: () => { MX.matters.ver = { f, v }; moRedraw(); } }))); } },
    h('span', { class: 'rqp-ver-v' }, 'v' + sel), h('span', { class: 'rqp-ver-c', html: MO_IC('<path d="m7 10 5 5 5-5"/>', 12) })) : null;
  return h('section', { class: 'rqp-right' },
    h('header', { class: 'rqp-bar' },
      h('div', { class: 'rqp-bar-l' }, email ? h('span', { class: 'mo-feed-ic is-email' }, moKindIc('Email')) : null, docBtn, verBtn),
      h('div', { class: 'rqp-bar-r' },
        tool('Ask Clavia About It', h('span', { class: 'mo-tool-spark', html: SPARK_ONE }), () => moOpenAsk(m, `What does “${f.name}” say?`)),
        tool('Comments', I('<path d="M6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.3a.5.5 0 0 1-.8-.4v-2.9h.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/>'), () => {
          moSetTab('activity'); MX.matters.upd = { id: m.id, text: `On “${f.name}”: `, vis: 'legal' }; moRedraw(); setTimeout(() => { const t = document.querySelector('.mo-cmp-in'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 60); }),
        tool('Download', I('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17"/>'), () => pbToast('Downloading')),
        tool('Email with Outlook', h('img', { src: 'assets/brand/outlook.svg', alt: '' }), () => pbToast(`Opens a new email in Outlook with “${f.name}” attached`)),
        !email ? tool('Open in Word', h('img', { src: 'assets/brand/word.svg', alt: '' }), () => pbToast('Opens in Word'), 'rqp-tool--word') : null,
        h('button', { class: 'rqp-fold', type: 'button', 'aria-label': 'Close the document', 'data-tip': 'Close', html: MO_IC('<path d="M6 6l12 12M18 6 6 18"/>', 16),
          onclick: () => { MX.matters.paneOff = true; moRedraw(); } }))),
    h('div', { class: 'rqp-scroll' },
      sel !== vers ? h('div', { class: 'rqp-old' }, h('span', {}, `You’re looking at version ${sel}. The latest is version ${vers}.`), h('button', { class: 'mx-link', type: 'button', onclick: () => { MX.matters.ver = null; moRedraw(); } }, 'Show the latest')) : null,
      h('div', { class: 'doc-page rqp-page mo-docpage' + (email ? ' is-email' : '') },
        email ? h('div', { class: 'mo-mailhead' }, h('h3', { class: 'mo-doc-t' }, f.name), h('div', {}, h('span', { class: 'mo-faint' }, 'From  '), f.from), h('div', {}, h('span', { class: 'mo-faint' }, 'To  '), addr),
          f.note ? h('div', {}, h('span', { class: 'mo-faint' }, 'Attached  '), f.note) : null) : h('h3', { class: 'mo-doc-t' }, f.name.replace(/\.(docx?|pdf|xlsx?)$/i, '')),
        h('div', { class: 'mo-doc-body' }, body))));
}

const moSec = (title, right, ...kids) => h('section', { class: 'rqv' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, title), right || null), ...kids.filter(Boolean));
const moAllBtn = (label, run) => h('button', { class: 'rqv-all mo-all', type: 'button', onclick: run }, label, h('span', { html: MO_IC('<path d="M9 6l6 6-6 6"/>', 12) }));
const moTabTo = (k) => () => { moSetTab(k); moRedraw(); };
const moOpenAsk = (m, q) => { MX.matters.ask = { id: m.id, conv: [] }; if (q) moAsk(m, q); else moRedraw(); };

/* ── Overview ── */
function moTabOverview(m) {
  const closed = moIsClosed(m);
  const tasks = moOpenTasks(m).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 5);
  const dates = moUpcoming(m).slice(0, 5);
  const nextTask = tasks[0];
  const acts = [...m.tl].sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 5);
  return [
    moSummary(m, nextTask, dates),
    moSec('Next Tasks', moAllBtn('All tasks', moTabTo('tasks')), tasks.length ? h('div', { class: 'mo-tlist' }, ...tasks.map(t => moTaskRow(m, t))) : h('p', { class: 'rqp-empty' }, 'No open tasks.')),
    moSec('Next Dates', moAllBtn('All dates', moTabTo('tasks')), dates.length ? h('div', { class: 'mo-dates' }, ...dates.map(x => moDateRow(x))) : h('p', { class: 'rqp-empty' }, 'No dates yet. Forward emails to the matter’s address and Clavia picks dates out.')),
    m.files.length ? moSec('Recent Documents', moAllBtn('View all', moTabTo('docs')), h('div', { class: 'mo-ftable is-flat' }, ...[...m.files].reverse().slice(0, 3).map(f => h('button', { class: 'mo-frow' + (f === moShownDoc(m) ? ' is-on' : ''), type: 'button', onclick: () => { MX.matters.doc = { id: m.id, i: m.files.indexOf(f) }; moRedraw(); } },
      h('span', { class: 'mo-fname' }, f.kind === 'email' ? h('span', { class: 'mo-feed-ic is-email' }, moKindIc('Email')) : mxTile('file', mxExt(f.name)), h('span', { class: 'mo-late-t' }, h('span', { class: 'mo-fn' }, f.name), h('span', { class: 'mo-faint' }, `${f.from} · ${pbWhen(f.when)}`))))))) : null,
    moSec('Recent Activity', moAllBtn('View all', moTabTo('activity')), h('div', { class: 'mo-feed' }, ...acts.map(e => h('div', { class: 'mo-feed-it is-static' }, h('span', { class: 'mo-feed-ic is-' + moKindKey(e.kind) }, moKindIc(e.kind)),
      h('span', { class: 'mo-feed-t' }, h('span', { class: 'mo-feed-x' }, e.text), h('span', { class: 'mo-feed-m' }, h('span', {}, e.who === 'Clavia' ? 'Clavia' : e.who), h('span', { class: 'mo-feed-w' }, pbWhen(e.when)))))))),
  ];
}
const moTlRow = (e) => h('div', { class: 'mo-late-it' }, e.who === 'Clavia' ? h('span', { class: 'mo-ic is-clavia', html: SPARK_ONE }) : mxFace(e.who, 'pb-av mo-av'),
  h('span', { class: 'mo-late-t' }, h('span', {}, e.text), h('span', { class: 'mo-faint' }, `${e.kind} · ${pbWhen(e.when)}`)));

/* the AI Summary an Intake request opens with: one sentence, then the few things to know, each with its label */
function moSummary(m, nextTask, dates) {
  const fold = !!(MX.matters.aiFold && MX.matters.aiFold[m.id]);
  const last = [...m.tl].sort((a, b) => (a.when < b.when ? 1 : -1))[0];
  const flag = m.decisions.find(x => x.st === 'flag');
  const pts = moIsClosed(m) ? [['Closed', `${moSay(m.closed.when)} by ${m.closed.by}: ${m.closed.outcome}.`]] : [
    nextTask ? ['Next', `${nextTask.t}${nextTask.t.includes(nextTask.who.split(' ')[0]) ? '' : ' (' + (nextTask.who === USER.name ? 'you' : nextTask.who.split(' ')[0]) + ')'}${nextTask.due ? ', ' + (moDays(nextTask.due) < 0 ? 'overdue since ' + moSay(nextTask.due) : moSay(nextTask.due)) : ''}.`] : null,
    dates[0] ? ['Key date', `${dates[0].what}, ${moSay(dates[0].d)} (${moIn(dates[0].d).toLowerCase()}).`] : null,
    flag ? ['Check', `“${flag.what}” may need a fresh look.`] : null,
    last ? ['Latest', `${last.text}, ${pbWhen(last.when).replace(/^Today, /, 'today at ')}.`] : null,
  ].filter(Boolean);
  const box = h('section', { class: 'rqp-ai' + (fold ? ' is-folded' : '') });
  const head = h('button', { class: 'rqp-ai-h', type: 'button', 'aria-expanded': String(!fold), onclick: () => {
    (MX.matters.aiFold ||= {})[m.id] = !fold; box.classList.toggle('is-folded', !fold); head.setAttribute('aria-expanded', String(fold)); } },
    h('span', { class: 'rqp-ai-star', html: SPARK_ONE }), h('span', {}, 'AI Summary'),
    h('span', { class: 'rqp-ai-chev', html: MO_IC('<path d="m7 10 5 5 5-5"/>', 14) }));
  box.append(head, h('div', { class: 'rqp-ai-body' }, h('div', { class: 'rqp-ai-t' },
    h('p', { class: 'rqp-ai-intro' }, m.where),
    pts.length ? h('ul', { class: 'rqp-ai-pts' }, ...pts.map(([k, t]) => h('li', {}, h('b', {}, k), ' ', t))) : null)));
  return box;
}

/* ── Tasks and Dates ── */
function moTabTasks(m) {
  const closed = moIsClosed(m);
  const order = [...m.tasks].sort((a, b) => (a.st === 'open') !== (b.st === 'open') ? (a.st === 'open' ? -1 : 1) : (a.due || '9') < (b.due || '9') ? -1 : 1);
  const adding = h('div', { class: 'rqp-addf mo-addtask', hidden: true });
  const newIn = h('input', { class: 'rqp-addf-in', type: 'text', placeholder: 'What needs doing?', onkeydown: (e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') adding.hidden = true; } });
  const addTask = () => { const t = newIn.value.trim(); if (!t) return; m.tasks.push(moT(t, USER.name, 5)); moLog(m, 'Task', `${moMe()} added a task: ${t}`); save(); moRedraw(); pbToast('Task added, due in 5 days'); };
  adding.append(newIn, h('button', { class: 'btn btn--primary', type: 'button', onclick: addTask }, 'Add'));
  return [
    moSec('Tasks', !closed ? h('button', { class: 'rqv-all mo-all', type: 'button', onclick: () => { adding.hidden = false; newIn.focus(); } }, '+ Add Task') : null,
      order.length ? h('div', { class: 'mo-tlist' }, ...order.map(t => moTaskRow(m, t))) : h('p', { class: 'rqp-empty' }, 'No tasks yet.'), adding),
    moSec('Dates', null, h('p', { class: 'mo-faint mo-help' }, 'Each date has reminders 7 days and 1 day before, and shows in the owner’s calendar.'),
      m.dates.length ? h('div', { class: 'mo-dates' }, ...moDates(m).map(x => moDateRow(x, null, null,
        m.orbis && x.kind === 'Hearing' ? h('button', { class: 'pb-btn mo-need-go', type: 'button', onclick: () => moPrep(m) }, 'Hearing Prep Note') : null)))
        : h('p', { class: 'rqp-empty' }, 'No dates yet. Forward emails to the matter’s address and Clavia picks dates out.')),
  ];
}

/* ── Files and emails ── */
function moTabFiles(m) {
  const closed = moIsClosed(m);
  const kind = MX.matters.fkind || 'all';
  const list = [...m.files].reverse().filter(f => kind === 'all' || f.kind === kind);
  const hearing = m.dates.some(x => x.kind === 'Hearing');
  const found = m.orbis && m.found && !hearing;
  return [
    h('p', { class: 'mo-faint mo-help' }, 'Everything sent to ', h('b', {}, `${m.id.toLowerCase()}@legal.lumen.io`), ' lands here, newest first.'),
    m.orbis && !closed && !hearing && !found ? h('div', { class: 'mo-demo' }, h('button', { class: 'btn', type: 'button', onclick: () => {
      m.files.push({ kind: 'email', from: 'Harlow & Co (Orbis’s lawyers)', name: 'Claim form and notice of hearing', note: '2 files', when: mxNow() });
      m.found = true; m.stage = Math.max(m.stage, 2); moLog(m, 'Email', 'Harlow & Co sent a claim form and notice of hearing', 'Tom Becker'); save(); moRedraw();
    } }, 'Forward an Email (Demo)')) : null,
    found ? moClaviaSays(h('b', {}, 'Clavia found a date in Harlow & Co’s email'),
      h('div', {}, `Court hearing at Croydon County Court, ${new Date(moDay(20)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, 10:00`),
      h('div', { class: 'mo-faint' }, 'From page 1 of “Notice of hearing.pdf”'),
      h('div', { class: 'mo-says-go' }, h('button', { class: 'btn btn--primary', type: 'button', onclick: () => moAddHearing(m) }, 'Add to Key Dates, With Reminders'),
        h('button', { class: 'btn', type: 'button', onclick: () => { m.found = false; save(); moRedraw(); } }, 'Not Now'))) : null,
    h('div', { class: 'mo-ftop' }, moPills([['all', `All · ${m.files.length}`], ['file', `Files · ${m.files.filter(f => f.kind === 'file').length}`], ['email', `Emails · ${m.files.filter(f => f.kind === 'email').length}`]], kind, (k) => { MX.matters.fkind = k; moRedraw(); }),
      !closed ? h('button', { class: 'btn mo-fup', type: 'button', onclick: () => pbToast('Upload a file from your computer, or drop it on this page') }, icon('plus', 'ico ico-14'), 'Add a File') : null),
    list.length ? h('div', { class: 'mo-ftable' },
      h('div', { class: 'mo-frow mo-fhead' }, h('span', {}, 'Name'), h('span', {}, 'From'), h('span', {}, 'Added')),
      ...list.map(f => h('button', { class: 'mo-frow' + (!m.request && f === moShownDoc(m) ? ' is-on' : ''), type: 'button', onclick: () => { if (m.request) return moOpenFile(m, f); MX.matters.doc = { id: m.id, i: m.files.indexOf(f) }; moRedraw(); } },
        h('span', { class: 'mo-fname' }, f.kind === 'email' ? h('span', { class: 'mo-feed-ic is-email' }, moKindIc('Email')) : mxTile('file', mxExt(f.name)),
          h('span', { class: 'mo-late-t' }, h('span', { class: 'mo-fn' }, f.name), h('span', { class: 'mo-faint' }, [f.kind === 'email' ? 'Email' : mxExt(f.name).toUpperCase() + ' file', f.note].filter(Boolean).join(' · ')))),
        h('span', { class: 'mo-ffrom' }, f.from === 'Clavia' ? h('span', { class: 'mo-feed-ic is-clavia' }, moKindIc('Clavia')) : mxFace(f.from, 'pb-av mo-av-xs'), h('span', {}, f.from)),
        h('span', { class: 'mo-faint mo-fwhen' }, pbWhen(f.when)))))
      : moEmpty(MO_ICONS.File, 'No files or emails yet', 'Forward emails to the matter’s address, or drop files here. Clavia reads each one and picks out dates.'),
  ];
}
const moShownDoc = (m) => (MX.matters.doc && MX.matters.doc.id === m.id ? m.files[MX.matters.doc.i] : null) || m.files[m.files.length - 1];
/* an email or a file opens where you are, with what it says */
const MO_BODIES = {
  'Orbis invoices and supplier contract': 'Hi legal team,\n\nOrbis Supplies emailed asking for £64,000 for 8 invoices we haven’t paid (April to June). We held back payment because two deliveries were late, in May and June. I chased Orbis in writing on 2 and 19 May.\n\nThe invoices and the supplier contract are attached. Can legal take this?\n\nThanks,\nTom',
  'Claim form and notice of hearing': 'Dear Sirs,\n\nWe act for Orbis Supplies Ltd. Please find attached our client’s claim form and the court’s notice of hearing. The hearing will take place at Croydon County Court at 10:00.\n\nYours faithfully,\nHarlow & Co',
  'Their changes (marked-up contract)': 'Hi Roger,\n\nPlease find our comments on the renewal contract attached. We have made 14 changes, mostly small. The main points are the cap on liability, payment terms and ownership of features built for us.\n\nBest regards,\nVantage legal',
  'Notice of hearing': 'The tribunal has listed the claim of J. Rowe against Lumen Analytics Ltd for a full hearing. Both sides must send their documents 3 days before the hearing.',
  'Court listing for the hearing': 'Dear Elena,\n\nThe Delhi High Court has listed the matter for hearing at 10:30. Could you send us the India sales figures by the end of the week, so we can show the court how the name is being used?\n\nRegards,\nSen & Rao',
  'Their data sharing agreement': 'Hi Daniel,\n\nAttached is our data sharing agreement for the pilot. We would like to start sharing patient data next month. Let us know if your legal team has comments.\n\nBrindle Health',
};
function moOpenFile(m, f) {
  const email = f.kind === 'email';
  const body = MO_BODIES[f.name] || (email ? `Sent to ${m.id.toLowerCase()}@legal.lumen.io and saved on this matter.` : `${f.name}\n\nSaved on this matter${f.note ? ' · ' + f.note.toLowerCase() : ''}. Clavia has read it and uses it in answers about ${m.title}.`);
  moDialog({ title: f.name, sub: `${email ? 'Email from' : 'Added by'} ${f.from} · ${pbWhen(f.when)}`, wide: true,
    body: [email ? h('div', { class: 'mo-mailhead' }, h('div', {}, h('span', { class: 'mo-faint' }, 'From  '), f.from), h('div', {}, h('span', { class: 'mo-faint' }, 'To  '), `${m.id.toLowerCase()}@legal.lumen.io`),
        f.note ? h('div', {}, h('span', { class: 'mo-faint' }, 'Attached  '), f.note) : null) : null,
      h('div', { class: email ? 'mo-mailbody' : 'mo-filepage' }, body),
      moClaviaSays(email ? 'Clavia saved this email on the matter and checked it for dates and new facts.' : 'Clavia has read this file. Ask about it from the bar at the foot of the matter.')],
    foot: (close) => [email ? null : moBtn('Open in Word', () => { close(); pbToast('Opens in Word'); }), moBtn('Ask Clavia About It', () => { close(); moOpenAsk(m, `What does “${f.name}” say?`); }), moBtn('Close', close, true)] });
}
/* an empty tab: a mark, what goes here, and how it gets here */
const moEmpty = (ic, title, say, ...acts) => h('div', { class: 'mo-empty' }, h('span', { class: 'mo-empty-ic', html: MO_IC(ic, 20) }), h('b', {}, title), h('p', {}, say), acts.length ? h('div', { class: 'mo-empty-go' }, ...acts) : null);

function moAddHearing(m) {
  const day = moDay(20);
  m.dates.push({ d: day, what: 'Court hearing, Croydon County Court, 10:00', kind: 'Hearing' });
  m.tasks.push(moT('Prepare for the hearing', USER.name, 17));
  m.found = false; m.stage = 3; m.status = 'hearing';
  m.where = `Orbis’s lawyers started a court claim. The hearing is on ${new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at Croydon County Court. We still need the delivery records from Tom to show the deliveries were late.`;
  m.facts.push(['Their lawyers', 'Harlow & Co'], ['Court', 'Croydon County Court']);
  m.people.push(['Harlow & Co', 'Their lawyers (for Orbis)']);
  moLog(m, 'Key date', `Court hearing added: ${moSay(day)}`);
  save(); moSetTab('tasks'); moRedraw();
  pbToast('Added. Reminders are set, and it’s in your Outlook calendar.');
}
function moPrep(m) {
  const h1 = m.dates.find(x => x.kind === 'Hearing');
  const lines = [['What it’s about.', 'Orbis claims £64,000 for 8 invoices (April to June). We held back payment because 2 deliveries were 3 and 5 weeks late.'],
    ['What the contract says.', 'Section 6.3: if a delivery is more than 14 days late, we may hold back payment for that delivery. Section 14: disputes go to the courts of England.'],
    ['Our position.', 'We owe £41,200 for on-time deliveries. We don’t owe £22,800 for the late ones.'],
    ['Bring.', 'Delivery records for May and June, the 3 emails chasing Orbis, the signed contract.'],
    ['They may ask.', 'Why we didn’t complain in writing straight away. Answer: Tom emailed on 2 and 19 May (both in Files).']];
  moDialog({ title: 'Hearing Prep Note', sub: `${m.title} · Croydon County Court · ${h1 ? moSay(h1.d) : ''}, 10:00`,
    body: [moClaviaSays(`Written from the ${m.files.length} files and emails on this matter. Click a line to see where it came from.`),
      ...lines.map(([b, t]) => h('button', { class: 'mo-prep', type: 'button', onclick: () => pbToast('Opens the source file') }, h('b', {}, b), ' ', t))],
    foot: (close) => [moBtn('Download as Word', () => { close(); pbToast('Saved to Files'); }), moBtn('Close', close, true)] });
}

/* ── Chats ── */
function moTabChats(m) {
  const starts = m.ask.slice(0, 3).map(([q]) => q);
  return [
    m.chats.length ? h('p', { class: 'mo-faint mo-help' }, 'Chats about this matter. Clavia used its key facts in each one.') : null,
    m.chats.length ? h('div', { class: 'mo-ftable' }, ...m.chats.map(c => h('button', { class: 'mo-frow mo-chatrow', type: 'button', onclick: () => moChat(m, c) },
      h('span', { class: 'mo-fname' }, h('span', { class: 'mo-feed-ic is-clavia' }, moKindIc('Clavia')), h('span', { class: 'mo-late-t' }, h('span', { class: 'mo-fn' }, c.t), h('span', { class: 'mo-faint' }, 'Clavia used this matter’s key facts'))),
      h('span', { class: 'mo-ffrom' }, mxFace(c.who, 'pb-av mo-av-xs'), h('span', {}, moFirstName(c.who))),
      h('span', { class: 'mo-faint mo-fwhen' }, pbWhen(c.when))))) : null,
    !m.chats.length ? h('div', { class: 'mo-mini-empty' },
      h('div', { class: 'mo-mini-row' }, h('span', { class: 'mo-feed-ic is-clavia' }, moKindIc('Clavia')),
        h('span', { class: 'mo-late-t' }, h('span', {}, 'No chats kept yet'), h('span', { class: 'mo-faint' }, 'Ask Clavia about this matter and keep the useful answers here.')),
        h('button', { class: 'btn mo-fup', type: 'button', onclick: () => moOpenAsk(m) }, 'Ask Clavia')),
      starts.length ? h('div', { class: 'mo-askcard-sugg' }, h('span', { class: 'mo-faint' }, 'Try'), ...starts.map(q => h('button', { class: 'mo-askchip', type: 'button', onclick: () => moOpenAsk(m, q) }, q))) : null) : null,
  ];
}
/* a saved chat opens as a full conversation, with the matter as what was read */
function moChat(m, c) {
  const a = c.a || moAnswer(m, c.t);
  openSession({ id: 'mo-ses-' + m.id + '-' + m.chats.indexOf(c), label: c.t, meta: 'now', people: [{ name: USER.name, online: true, owner: true }],
    messages: [{ role: 'user', text: c.t, context: { where: 'In matter', artifact: m.title } },
      { role: 'bot', cites: null, steps: [{ source: 'project', query: 'Read ' + m.title, count: `${mxPlural(m.files.length, 'file')} · ${mxPlural(m.decisions.length, 'decision')}` }], answer: a.text }] });
}

/* ── Decisions ── */
function moTabDecisions(m) {
  const closed = moIsClosed(m);
  const flagged = m.decisions.filter(x => x.st === 'flag').length;
  const ST = { in: ['In force', 'is-green'], flag: ['Needs a fresh look', 'is-amber'], changed: ['Changed', 'is-blue'] };
  return [
    h('p', { class: 'mo-faint mo-help' }, 'Who decided what, and why. If a fact behind a decision changes, Clavia flags only the decisions that depend on it.'),
    !closed ? h('div', { class: 'mo-demo' },
      m.orbis && !m.recordsIn ? h('button', { class: 'btn', type: 'button', onclick: () => moRecordsArrive(m) }, 'New Delivery Records Arrive (Demo)') : null,
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => moDecide(m) }, icon('plus', 'ico ico-14'), 'Record a Decision')) : null,
    m.decisions.length ? h('div', { class: 'mo-decs' }, ...m.decisions.map((x, i) => h('section', { class: 'mo-dec' + (x.st === 'flag' ? ' is-flag' : '') },
      h('div', { class: 'mo-dec-h' }, h('b', {}, x.what), h('span', { class: 'mo-chip' + (x.vis === 'legal' ? '' : ' is-blue') }, x.vis === 'legal' ? 'Legal only' : 'Shared with the team'),
        h('span', { class: 'mo-chip ' + ST[x.st][1] }, ST[x.st][0])),
      h('div', { class: 'mo-dec-by' }, h('span', { class: 'rqv-who' }, mxFace(x.who, 'pb-av rqv-av'), `${x.who} · ${pbWhen(x.when)}`)),
      h('p', { class: 'mo-dec-t' }, h('span', { class: 'mo-faint' }, 'Why: '), x.why),
      h('p', { class: 'mo-dec-t mo-faint' }, 'Based on: ', x.on),
      x.st === 'flag' ? moClaviaSays(h('b', {}, 'What changed: '), 'the new delivery records show the June delivery was 9 days late, not 5 weeks. Section 6.3 only lets us hold back for deliveries more than 14 days late. So we can hold back £11,400, not £22,800.',
        h('div', { class: 'mo-says-go' },
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => {
            Object.assign(x, { what: 'Hold back £11,400 for the one late delivery', why: 'Section 6.3: only the May delivery was more than 14 days late.', when: mxNow(), st: 'changed', who: USER.name });
            moLog(m, 'Decision', `${moMe()} changed the hold-back to £11,400`); save(); moRedraw(); pbToast('Decision changed. Tom has been told.');
          } }, 'Change to £11,400'),
          h('button', { class: 'btn', type: 'button', onclick: () => { x.st = 'in'; moLog(m, 'Decision', `${moMe()} kept the hold-back as it is`); save(); moRedraw(); pbToast('Kept as it is, with your note in the timeline.'); } }, 'Keep as It Is'))) : null)))
      : h('p', { class: 'rqp-empty' }, 'No decisions recorded yet.'),
    flagged ? h('p', { class: 'mo-faint mo-help' }, `${flagged} of ${m.decisions.length} decisions is affected. The most we can settle for doesn’t depend on the delivery records, so it hasn’t changed.`) : null,
  ];
}
function moRecordsArrive(m) {
  m.recordsIn = true;
  const x = m.decisions.find(d => /22,800/.test(d.what)); if (x) x.st = 'flag';
  if (!m.files.some(f => /^Delivery records/.test(f.name))) m.files.push({ kind: 'file', from: 'Tom Becker', name: 'Delivery records May–June.xlsx', note: '1 file', when: mxNow() });
  moLog(m, 'File', 'New delivery records from Tom: the June delivery was 9 days late', 'Tom Becker');
  save(); moRedraw(); pbToast('Clavia checked the decisions against the new records.');
}
function moDecide(m) {
  const changed = m.decisions.some(x => /11,400/.test(x.what));
  const f = { what: m.orbis ? (changed ? 'Pay the £52,600 we agree we owe, now' : 'Pay the £41,200 we agree we owe, now') : '',
    who: USER.name, why: m.orbis ? 'We agree we owe it. Paying it shows good faith before the hearing.' : '', vis: 'shared' };
  const team = [...new Set([USER.name, ...m.people.map(p => p[0]).filter(n => MX_LEGAL.some(x => x.name === n)), 'Grace Coleman'])];
  const based = m.orbis ? ['Contract section 6.3', 'Delivery records', '8 unpaid invoices (SAP)'] : m.facts.slice(0, 3).map(x => x[0]);
  const dlg = moDialog({ title: 'Record a Decision', sub: 'So everyone knows what was decided, by whom and why.',
    body: () => [moField('What was decided', moInput(f.what, (v) => { f.what = v; })),
      moField('Who decided', moPills(team.map(n => [n, n === USER.name ? 'You' : n]), f.who, (k) => { f.who = k; dlg.paint(); })),
      moField('Why', moInput(f.why, (v) => { f.why = v; })),
      based.length ? moField('Based on', h('div', { class: 'mo-pills' }, ...based.map(b => h('span', { class: 'mo-chip is-green' }, '✓ ' + b))), 'Clavia flags this decision if any of these change') : null,
      moField('Who can see it', moPills([['shared', 'Everyone on the matter'], ['legal', 'Legal only']], f.vis, (k) => { f.vis = k; dlg.paint(); }))],
    foot: (close) => [moBtn('Cancel', close), moBtn('Save Decision', () => {
      if (!f.what.trim()) return pbToast('Say what was decided first');
      m.decisions.push({ what: f.what.trim(), who: f.who, when: mxNow(), why: f.why.trim(), on: based.join(' · '), vis: f.vis, st: 'in' });
      moLog(m, 'Decision', `${f.who.split(' ')[0]} decided: ${f.what.trim()}`, f.who); save(); close(); moSetTab('decisions'); moRedraw(); pbToast('Decision saved.');
    }, true)] });
}

/* ── Updates: short notes for the person who asked ── */
function moTabUpdates(m) {
  const who = m.asked[0], first = who.split(' ')[0], self = who === USER.name;
  const u = MX.matters.upd && MX.matters.upd.id === m.id ? MX.matters.upd : null;
  const ta = h('textarea', { class: 'mx-rqf-in mx-rqf-ta mo-upd-in', rows: '4', placeholder: `Write a short update for ${first}…`, oninput: (e) => { if (u) u.text = e.target.value; } });
  if (u) ta.value = u.text;
  const start = (text) => { MX.matters.upd = { id: m.id, text, vis: self ? 'legal' : 'shared' }; moRedraw(); };
  return [
    h('p', { class: 'mo-faint mo-help' }, self ? 'Short, dated notes on how the matter is going.' : `Short, dated updates keep ${first} in the loop. ${first} sees shared ones where they asked, so they never have to chase legal.`),
    u ? h('section', { class: 'mo-upd' }, ta,
      !self ? h('div', { class: 'mo-upd-bar' }, h('span', { class: 'mo-faint' }, 'Who sees it'), moPills([['shared', `${first} and legal`], ['legal', 'Legal only']], u.vis, (k) => { u.vis = k; u.text = ta.value; moRedraw(); })) : null,
      h('div', { class: 'mo-upd-bar' }, h('span', { class: 'mo-faint' }, u.vis === 'legal' ? 'Only the legal team sees this.' : `${first} sees it in Teams, where they asked.`),
        h('span', { class: 'sp' }), moBtn('Cancel', () => { MX.matters.upd = null; moRedraw(); }), moBtn('Post Update', () => {
          const text = ta.value.trim(); if (!text) return;
          m.updates.unshift({ who: USER.name, vis: u.vis, text, when: mxNow() }); MX.matters.upd = null;
          moLog(m, 'Update', `${moMe()} posted an update${u.vis === 'legal' ? ' for the legal team' : ' for ' + first}`); save(); moRedraw();
          pbToast(u.vis === 'legal' ? 'Posted for the legal team.' : `Posted. ${first} sees it in Teams.`);
        }, true)))
      : h('div', { class: 'mo-demo' }, h('button', { class: 'btn btn--primary', type: 'button', onclick: () => start(m.draft || '') },
        h('span', { class: 'mo-btn-spark', html: SPARK_ONE }), m.draft ? `Draft an Update for ${first}` : 'Write an Update'),
        m.draft ? h('span', { class: 'mo-faint' }, 'Clavia writes it from the latest activity. You check it before it goes.') : null),
    m.updates.length ? h('div', { class: 'rqa mo-upds' }, ...m.updates.map(x => h('div', { class: 'rqa-it rqa-said' }, mxFace(x.who, 'pb-av rqa-av'),
      h('div', { class: 'rqa-card' }, h('div', { class: 'rqa-card-h' }, h('b', {}, x.who), h('span', { class: 'rqa-tag' }, pbWhen(x.when)),
        h('span', { class: 'mo-chip' + (x.vis === 'legal' ? '' : ' is-blue') }, x.vis === 'legal' ? 'Legal only' : `Shared with ${first}`)), h('div', { class: 'rqa-card-t' }, x.text)))))
      : h('p', { class: 'rqp-empty' }, 'No updates yet.'),
  ];
}

/* ── People: who is on it, who it is shared with, who is kept out ── */
function moTabPeople(m) {
  const closed = moIsClosed(m);
  const dots = (items) => { const b = h('button', { class: 'br-dots mo-p-dots', type: 'button', 'aria-label': 'More actions', html: PB_SVG.dots,
    onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(b, items.filter(Boolean)); } }); return b; };
  const person = (name, role, right) => h('div', { class: 'rqp-person' }, mxFace(name, 'pb-av rqp-person-av'),
    h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-person-n' }, name), h('span', { class: 'rqp-person-r' }, role)), right || null);
  const addRow = (label, run) => !closed ? h('button', { class: 'mo-addrow', type: 'button', onclick: run }, h('span', { class: 'mo-addrow-ic', html: MO_IC('<path d="M12 5v14M5 12h14"/>', 13) }), label) : null;
  const legal = (n) => MX_LEGAL.some(p => p.name === n);
  const roleOf = (n, r) => r === 'Owner' || r === 'Asked for it' ? r : (MX_LEGAL.find(p => p.name === n) || {}).role || r;
  return [
    h('section', { class: 'rqv' }, h('h3', { class: 'rqv-h' }, 'On This Matter'),
      ...m.people.map(([n, r]) => person(n, roleOf(n, r) === r ? r : `${r} · ${roleOf(n, r)}`, dots([
        r === 'Asked for it' && n !== USER.name ? { label: `See What ${n.split(' ')[0]} Sees`, icon: 'look', run: () => { if (m.request) { MX.intake.open = m.id + '/requester'; go('intake'); } else { MX.matters.open = m.id + '/asker'; go('matters'); } } } : null,
        r === 'Asked for it' && n !== USER.name ? { label: `Message ${n.split(' ')[0]}`, icon: 'ask', run: () => { moSetTab('activity'); MX.matters.upd = { id: m.id, text: '', vis: 'shared' }; moRedraw(); } } : null,
        legal(n) && r !== 'Owner' && !closed ? { label: `Make ${n.split(' ')[0]} the Owner`, icon: 'use', run: () => { const b = moOwnerBtn(m); b._set(n); moRedraw(); } } : null,
        r !== 'Owner' && r !== 'Asked for it' && !closed ? { label: 'Remove From Matter', icon: 'trash', danger: true, run: () => { m.people = m.people.filter(p => p[0] !== n); moLog(m, 'Access', `${moMe()} took ${n.split(' ')[0]} off the matter`); save(); moRedraw(); } } : null,
        { label: 'Copy Email', icon: 'copy', run: () => { navigator.clipboard?.writeText(mxEmail(n)).catch(() => {}); pbToast('Email copied'); } },
      ]))),
      addRow('Add a person', (e) => mxPersonPicker(e.currentTarget, [...MX_LEGAL, ...MX_STAFF].filter(p => !m.people.some(x => x[0] === p.name) && !m.keptOut.some(k => k.who === p.name)),
        (p) => { m.people.push([p.name, 'Works on it']); moLog(m, 'Access', `${moMe()} added ${p.name.split(' ')[0]} to the matter`); save(); moRedraw(); pbToast(`${p.name} added`); }))),
    h('section', { class: 'rqv' }, h('h3', { class: 'rqv-h' }, 'Outside Lumen'),
      ...m.shares.map(s => person('David Keller', `Keller & Moss LLP · our outside lawyers · sees ${s.n} items · shared by ${moFirstName(s.by)}`, dots([{ label: 'See What They See', icon: 'look', run: () => moPreviewDavid(m, s.picks, true) }]))),
      !m.shares.length ? h('p', { class: 'rqp-empty' }, 'Nobody outside Lumen. Share only the parts an outside law firm needs.') : null,
      m.orbis ? addRow('Share with outside lawyers', () => moShare(m)) : null),
    h('section', { class: 'rqv' }, h('h3', { class: 'rqv-h' }, 'Kept Out'),
      ...m.keptOut.map(k => person(k.who, `${k.why} · ${k.by === 'Clavia' ? 'by Clavia’s conflict check' : 'added by ' + moFirstName(k.by)}`, h('span', { class: 'mo-chip is-red' }, 'Kept out'))),
      !m.keptOut.length ? h('p', { class: 'rqp-empty' }, 'Nobody. Use this when someone must not see a matter, for example because they used to work for the other side.') : null,
      addRow('Keep someone out', () => moKeepOut(m))),
    h('button', { class: 'mo-priv-row', type: 'button', role: 'switch', 'aria-checked': String(!!m.private), onclick: () => {
      m.private = !m.private; moLog(m, 'Access', `${moMe()} made the matter ${m.private ? 'private' : 'visible to the legal team'}`); save(); moRedraw(); } },
      h('span', { html: MO_IC(MO_ICONS.Access, 14) }), h('span', { class: 'mo-late-t' }, h('span', {}, m.private ? 'Private' : 'Visible to legal'), h('span', { class: 'mo-faint' }, m.private ? 'Only the people above can open it' : 'Anyone in legal can find it')),
      h('span', { class: 'mo-switch' + (m.private ? ' is-on' : '') }, h('i'))),
  ];
}
function moKeepOut(m) {
  const pool = MX_LEGAL.map(p => p.name).filter(n => n !== USER.name && !m.people.some(p => p[0] === n) && !m.keptOut.some(k => k.who === n));
  const f = { who: m.orbis && pool.includes('Matt Rivera') ? 'Matt Rivera' : pool[0], why: '' };
  /* the reason is filled in only when Clavia knows one: where they used to work */
  const known = (n) => MO_HISTORY[n] ? `Used to work at ${MO_HISTORY[n][0].replace(/ Ltd$/, '')} ${MO_HISTORY[n][1]}` : '';
  f.why = known(f.who);
  const dlg = moDialog({ title: 'Keep Someone Out of This Matter', sub: 'For example, someone who used to work for the other side.',
    body: () => { const fn = f.who.split(' ')[0]; return [
      moField('Who', moPills(pool.slice(0, 6), f.who, (k) => { f.who = k; f.why = known(k); dlg.paint(); })),
      moField('Why', moInput(f.why, (v) => { f.why = v; }), 'Only legal sees this'),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'What happens'),
        ...[`${fn} can’t open the matter, its files or its chats`, `It doesn’t show in ${fn}’s search, tasks or key dates`, `Clavia won’t use anything from it when ${fn} asks a question`, `${fn} isn’t told why, only that they don’t have access`]
          .map(t => h('div', { class: 'mo-ok' }, h('span', { class: 'mo-green' }, '✓'), t))),
      h('p', { class: 'mo-faint' }, 'Only the matter owner and the head of legal can change this. Every change is in the timeline.')]; },
    foot: (close) => [moBtn('Cancel', close), moBtn(`Keep ${f.who.split(' ')[0]} Out`, () => {
      m.keptOut.push({ who: f.who, why: f.why.trim() || 'No reason given', by: USER.name, when: mxNow() });
      moLog(m, 'Access', `${moMe()} kept ${f.who.split(' ')[0]} out of the matter`); save(); close(); moSetTab('people'); moRedraw();
      pbToast(`${f.who.split(' ')[0]} is kept out of this matter.`);
    }, true)] });
}
const MO_SHARE = [['Key facts', true], ['Orbis supplier contract', true], ['Invoices and delivery records', true], ['Notice of hearing', true],
  ['Decision: hold back for late deliveries', true], ['Decision: the most we can settle for', false, 'Legal only'], ['Chats with Clavia', false], ['Updates for the legal team', false]];
function moShare(m) {
  const picks = MX.matters.picks && MX.matters.picks.id === m.id ? MX.matters.picks.on : (MX.matters.picks = { id: m.id, on: MO_SHARE.map(x => x[1]) }).on;
  const dlg = moDialog({ title: 'Share With Outside Lawyers', sub: 'They see only what you tick. Nothing else on the matter.',
    body: () => [moField('Who', h('div', { class: 'mo-who' }, h('b', {}, 'David Keller · david.keller@kellermoss.com'), h('span', { class: 'mo-faint' }, 'Keller & Moss LLP · our outside lawyers for disputes'))),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'What they can see'),
        ...MO_SHARE.map(([t, , tag], i) => moCheck(picks[i], t, null, () => { picks[i] = !picks[i]; dlg.paint(); }, tag ? h('span', { class: 'mo-chip is-red' }, tag) : null))),
      picks[5] ? moClaviaSays('This is the most we can settle for, marked Legal only. Are you sure the outside lawyers should see it?') : null],
    foot: (close) => [moBtn('Cancel', close), moBtn('Preview What David Sees', () => { close(); moPreviewDavid(m, picks); }), moBtn('Share', () => {
      const n = picks.filter(Boolean).length;
      m.shares.push({ n, picks: [...picks], by: USER.name, when: mxNow() });
      m.money = { ...m.money, firm: 'Keller & Moss', billed: 2400, okd: 1600, expected: 4000 };
      moLog(m, 'Sharing', `${moMe()} shared ${n} items with Keller & Moss`); save(); close(); moSetTab('people'); moRedraw();
      pbToast('Shared with David Keller. He gets an email with a secure link.');
    }, true)] });
}
function moPreviewBody(can, hidden) {
  return [h('p', { class: 'mo-faint mo-help' }, 'Preview only. This is exactly what Clavia will show or tell them, including in answers to their questions.'),
    h('div', { class: 'mo-dlg-cap' }, 'They can see'), h('div', { class: 'rqv-rows' }, ...can.map(([k, v]) => h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, k), h('span', { class: 'rqd-v' }, v)))),
    h('div', { class: 'mo-dlg-cap' }, 'Hidden from them'), ...hidden.map(t => h('div', { class: 'mo-ok' }, h('span', { class: 'mo-red' }, '✕'), t))];
}
function moPreviewDavid(m, p, after) {
  const files = [1, 2, 3].filter(i => p[i]).map(i => MO_SHARE[i][0]);
  const decs = [p[4] ? 'Hold back for late deliveries' : null, p[5] ? 'The most we can settle for (£58,000)' : null].filter(Boolean);
  const can = [p[0] ? ['Key facts', 'Other side, claim, contract, late deliveries'] : null, files.length ? ['Files', files.join(', ')] : null,
    decs.length ? ['Decisions', decs.join(', ')] : null, p[6] ? ['Chats', mxPlural(m.chats.length, 'chat')] : null].filter(Boolean);
  const hidden = [!p[5] ? 'The most we can settle for (£58,000)' : null, !p[6] ? 'Chats with Clavia' : null, !p[7] ? 'Updates for the legal team' : null, 'Who is kept out of the matter'].filter(Boolean);
  moDialog({ title: 'What David Will See', sub: 'Keller & Moss LLP · outside lawyers', body: moPreviewBody(can, hidden),
    foot: (close) => after || m.shares.length ? [moBtn('Close', close, true)] : [moBtn('Back to Sharing', () => { close(); moShare(m); }, true)] });
}
function moPreviewTom(m) {
  const t = m.tasks.find(x => x.who === 'Tom Becker');
  moDialog({ title: 'What Tom Will See', sub: 'Finance · asked for this matter',
    body: moPreviewBody([['Where it’s at', m.where], t ? ['Tasks for Tom', t.t] : null, ['Decision', m.decisions[0]?.what || '—'], ['Updates', mxPlural(m.updates.filter(u => u.vis === 'shared').length, 'shared update')]].filter(Boolean),
      ['The most we can settle for (£58,000)', 'Chats with Clavia', 'Notes for the legal team only']),
    foot: (close) => [moBtn('Close', close, true)] });
}

/* ── Timeline: everything that happened, newest first, one day at a time ── */
function moTabTimeline(m) {
  const kinds = [...new Set([...m.tl].reverse().map(e => e.kind))];
  const on = MX.matters.tlk && kinds.includes(MX.matters.tlk) ? MX.matters.tlk : 'all';
  const list = [...m.tl].map((e, i) => ({ ...e, i })).sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : b.i - a.i)).filter(e => on === 'all' || e.kind === on);
  const days = [];
  for (const e of list) {
    const dd = moDays(e.when) === 0 ? 'Today' : moDays(e.when) === -1 ? 'Yesterday' : new Date(e.when).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!days.length || days[days.length - 1][0] !== dd) days.push([dd, []]);
    days[days.length - 1][1].push(e);
  }
  const time = (e) => new Date(e.when).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return [
    h('div', { class: 'mo-tl-bar' }, h('span', { class: 'mo-faint' }, `${mxPlural(m.tl.length, 'event')} since the matter opened`),
      h('label', { class: 'mo-tl-filter' }, h('span', { class: 'mo-faint' }, 'Show'),
        h('select', { class: 'mo-select', onchange: (e) => { MX.matters.tlk = e.target.value; moRedraw(); } },
          h('option', { value: 'all', selected: on === 'all' }, 'Everything'), ...kinds.map(k => h('option', { value: k, selected: on === k }, k + 's'))))),
    h('div', { class: 'mo-tl' }, ...days.map(([dd, evs]) => h('section', { class: 'mo-tl-day' },
      h('h4', { class: 'mo-tl-dh' }, dd, h('span', { class: 'mo-faint' }, mxPlural(evs.length, 'event'))),
      ...evs.map(e => h('div', { class: 'mo-tl-it' },
        h('span', { class: 'mo-feed-ic is-' + moKindKey(e.kind) }, moKindIc(e.kind)),
        h('div', { class: 'mo-tl-b' },
          h('div', { class: 'mo-tl-t' }, e.text),
          h('div', { class: 'mo-tl-m' }, e.who === 'Clavia' ? null : mxFace(e.who, 'pb-av mo-av-xs'), h('span', {}, e.who === 'Clavia' ? 'Clavia' : e.who),
            h('span', { class: 'mt-sep' }, '·'), h('span', {}, e.kind), h('span', { class: 'mt-sep' }, '·'), h('span', {}, time(e)))))))))];
}

/* ==================================================================
   Dialogs on a matter
================================================================== */
function moFacts(m) {
  const vals = m.facts.map(x => [...x]);
  const hearing = m.dates.find(x => x.kind === 'Hearing');
  const dlg = moDialog({ title: 'Key Facts', sub: `${m.title} · Clavia uses these in every chat about this matter`,
    body: () => [...vals.map((x, i) => moField(x[0], moInput(x[1], (v) => { vals[i][1] = v; }))),
      m.orbis && hearing && !vals.some(x => x[0] === 'Hearing') ? moClaviaSays('Add ', h('b', {}, `Hearing: ${moSay(hearing.d)}, Croydon County Court`), '? Found in “Notice of hearing.pdf”.',
        h('div', { class: 'mo-says-go' }, h('button', { class: 'btn', type: 'button', onclick: () => { vals.push(['Hearing', `${moSay(hearing.d)}, Croydon County Court`]); dlg.paint(); } }, 'Add It'))) : null,
      h('button', { class: 'rqp-add', type: 'button', onclick: () => { vals.push(['New fact', '']); dlg.paint(); } }, '+ Add a fact')],
    foot: (close) => [moBtn('Cancel', close), moBtn('Save', () => { m.facts = vals.filter(x => x[1].trim()); save(); close(); moRedraw(); pbToast('Saved. Clavia uses these from now on.'); }, true)] });
}
function moMoneyDlg(m) {
  const v = { ...(m.money || { budget: 0, billed: 0, okd: 0, expected: 0, firm: '' }) };
  const num = (k) => moInput(moMoney(v[k]), (s) => { v[k] = +s.replace(/[^\d]/g, '') || 0; });
  moDialog({ title: 'Money for This Matter', sub: 'Shared with finance for its month-end.',
    body: [moField('Budget for outside lawyers', num('budget')), moField('Paid', num('billed')), moField('Work OK’d, not billed yet', num('okd')), moField('Expected later', num('expected'), 'Their estimate'),
      h('p', { class: 'mo-faint' }, 'Clavia fills “paid” from invoices and “expected” from the law firm’s estimate. If an estimate is missing, it says so rather than guessing.')],
    foot: (close) => [moBtn('Cancel', close), moBtn('Save', () => { m.money = v; save(); close(); moRedraw(); pbToast('Saved. Finance sees the new numbers.'); }, true)] });
}
function moProof(m, t) {
  const opts = [['Delivery records May–June.xlsx', 'from Tom, just now'], ['Orbis invoices and supplier contract', '3 files']];
  let pick = 0;
  const dlg = moDialog({ title: 'Add the Proof to Close This Task', sub: t.t,
    body: () => [h('p', {}, 'This task closes only when ', h('b', {}, t.proof), ' is attached. Pick it from the matter, or upload it.'),
      ...opts.map(([n, s], i) => moCheck(pick === i, n, s, () => { pick = i; dlg.paint(); })),
      h('button', { class: 'rqp-add', type: 'button', onclick: () => pbToast('Upload a file from your computer') }, '+ Upload a file')],
    foot: (close) => [moBtn('Cancel', close), moBtn('Attach and Close Task', () => {
      t.proofFile = opts[pick][0]; t.st = 'done';
      if (!m.files.some(f => /^Delivery records/.test(f.name))) m.files.push({ kind: 'file', from: 'Tom Becker', name: 'Delivery records May–June.xlsx', note: '1 file', when: mxNow() });
      moLog(m, 'Task', `Tom’s task closed with ${opts[pick][0]} attached`, 'Tom Becker'); save(); close(); moRedraw(); pbToast('Task closed, with the proof attached.');
    }, true)] });
}
function moHandOver(m) {
  const pool = MX_LEGAL.filter(p => p.name !== m.owner).slice(0, 5);
  const out = (n) => m.keptOut.some(k => k.who === n);
  let to = pool.find(p => !out(p.name))?.name;
  const changed = m.decisions.some(x => /11,400/.test(x.what));
  const hearing = m.dates.find(x => x.kind === 'Hearing');
  const left = m.money ? m.money.budget - m.money.billed - m.money.okd - m.money.expected : null;
  const dlg = moDialog({ title: 'Hand Over This Matter', sub: 'Clavia writes a brief for the new owner. Every fact links to where it came from.', wide: true,
    body: () => { const fn = to.split(' ')[0]; return [
      moField('New owner', h('div', { class: 'mo-pills' }, ...pool.map(p => h('button', { class: 'mo-pill' + (p.name === to ? ' is-on' : ''), type: 'button', disabled: out(p.name),
        'data-tip': out(p.name) ? 'Kept out of this matter' : p.role, onclick: () => { to = p.name; dlg.paint(); } }, p.name, out(p.name) ? ' · kept out' : '')))),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, `Brief for ${fn}`),
        h('p', {}, h('b', {}, 'Where it’s at. '), m.orbis ? `Orbis claims £64,000. ${changed ? 'We agree we owe £52,600 and are holding back £11,400 for the one late delivery.' : 'We agree we owe £41,200 and are holding back £22,800 for two late deliveries.'}${hearing ? ` Court hearing on ${moSay(hearing.d)}.` : ''}` : m.where),
        m.orbis ? h('p', {}, h('b', {}, 'Agreed and not agreed. '), `Agreed: we owe ${changed ? '£52,600' : '£41,200'} for on-time deliveries. Not agreed: whether the June delivery was late (our delivery records against Orbis’s email).`) : null,
        h('p', {}, h('b', {}, 'Still open. '), `${mxPlural(moOpenTasks(m).length, 'open task')} · ${mxPlural(m.decisions.length, 'decision')}${left != null ? ` · ${moMoney(left)} left in budget` : ''}.`))]; },
    foot: (close) => [moBtn('Cancel', close), moBtn(`Hand Over to ${to.split(' ')[0]}`, () => {
      const was = m.owner; m.owner = to;
      m.people = [[to, 'Owner'], ...m.people.filter(p => p[0] !== to && p[1] !== 'Owner'), [was, 'Worked on it before']];
      moLog(m, 'Matter', `${moMe()} handed the matter over to ${to.split(' ')[0]}`); save(); close(); moRedraw();
      pbToast(`${to.split(' ')[0]} now owns the matter and has the brief.`);
    }, true)] });
}
function moClose(m) {
  const f = { how: 'Settled', amount: '£56,000', learn: true };
  const summary = m.orbis ? 'Orbis claimed £64,000 for unpaid invoices. We held back payment for late deliveries under section 6.3; the delivery records showed one delivery was more than 14 days late. Settled for £56,000 before the hearing; Orbis withdrew the claim. Lesson: complain about late deliveries in writing within 14 days, as Tom did, and keep delivery records with each invoice.'
    : `${m.where} Closed with the work done.`;
  const dlg = moDialog({ title: 'Close This Matter', sub: 'Clavia writes a closing summary, so the next similar matter starts with what we learned.', wide: true,
    body: () => { const open = moOpenTasks(m); return [
      moField('How did it end?', moPills(['Settled', 'Won', 'Lost', 'Withdrawn', 'Work done', 'Something else'], f.how, (k) => { f.how = k; dlg.paint(); })),
      f.how === 'Settled' ? moField('Settled for', moInput(f.amount, (v) => { f.amount = v; })) : null,
      open.length ? h('div', { class: 'mo-says is-amber' }, h('div', {}, h('b', {}, open.length === 1 ? '1 task is still open' : `${open.length} tasks are still open`),
        ...open.map(t => h('div', { class: 'mo-open-t' }, h('span', {}, t.t), h('span', { class: 'sp' }),
          h('button', { class: 'mx-link', type: 'button', onclick: () => { t.st = 'done'; save(); dlg.paint(); } }, 'Mark done'),
          h('button', { class: 'mx-link', type: 'button', onclick: () => { t.st = 'cancelled'; save(); dlg.paint(); } }, 'Cancel'))))) : null,
      moField('Closing summary', (() => { const ta = h('textarea', { class: 'mx-rqf-in mx-rqf-ta', rows: '4', oninput: (e) => { f.sum = e.target.value; } }); ta.value = f.sum ?? summary; return ta; })(), 'Drafted by Clavia'),
      moCheck(f.learn, 'Let Clavia use this for similar matters', null, () => { f.learn = !f.learn; dlg.paint(); })]; },
    foot: (close) => [moBtn('Cancel', close), moBtn('Close Matter', () => {
      const outcome = f.how === 'Settled' && f.amount.trim() ? `Settled for ${f.amount.trim()}` : f.how;
      m.closed = { when: mxNow(), by: USER.name, outcome, summary: f.sum ?? summary, learn: f.learn };
      m.status = 'closed'; m.stage = 4; if (m.request) m.request.status = 'done'; m.where = `Closed: ${outcome}.${m.orbis ? ' Orbis withdrew the court claim.' : ''}`;
      moLog(m, 'Matter', `${moMe()} closed the matter: ${outcome}`); save(); close(); MX.matters.ask = null; moRedraw();
      pbToast('Matter closed. The summary is saved for similar matters.');
    }, true, { disabled: moOpenTasks(m).length > 0 })] });
}
function moReopen(m) {
  m.status = 'open'; m.stage = 3; if (m.request) m.request.status = 'progress'; moLog(m, 'Matter', `${moMe()} reopened the matter`); m.closed = null; save(); moRedraw();
  pbToast('Reopened. The closing summary is kept in the timeline.');
}

/* ==================================================================
   Ask Clavia, on the right: answers from this matter only
================================================================== */
function moAnswer(m, q) {
  const hit = m.ask.find(([x]) => x.toLowerCase() === q.toLowerCase().trim());
  if (hit) return { text: hit[1], src: hit[2], draft: /^draft/i.test(hit[0]) };
  return { text: `From this matter: ${m.where} Ask me something more specific, like a date, a decision or a file, and I’ll point to where it came from.`, src: ['Where it’s at', 'Key facts'] };
}
function moAsk(m, q) {
  const a = MX.matters.ask && MX.matters.ask.id === m.id ? MX.matters.ask : (MX.matters.ask = { id: m.id, conv: [] });
  a.conv.push({ q, ...moAnswer(m, q), saved: false, task: false });
  moRedraw();
  requestAnimationFrame(() => { const b = document.querySelector('.mo-ask-body'); if (b) b.scrollTop = b.scrollHeight; });
}
function moAskPanel(m, a) {
  const first = m.asked[0].split(' ')[0];
  const asked = new Set(a.conv.map(c => c.q));
  const left = m.ask.filter(([q]) => !asked.has(q));
  const input = h('input', { class: 'mo-ask-in', type: 'text', placeholder: 'Ask about this matter…', 'aria-label': 'Ask about this matter',
    onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) moAsk(m, input.value.trim()); } });
  const turn = (c) => [h('div', { class: 'mo-q' }, c.q),
    h('div', { class: 'mo-a' }, h('div', { class: 'mo-a-t' }, c.text),
      h('div', { class: 'mo-a-src' }, h('span', { class: 'mo-faint' }, 'Based on'), ...c.src.map(s => h('span', { class: 'mo-chip' }, s))),
      h('div', { class: 'mo-a-go' },
        c.saved ? h('span', { class: 'mo-green' }, '✓ Saved to the matter') : h('button', { class: 'mx-link', type: 'button', onclick: () => {
          c.saved = true; m.chats.unshift({ t: c.q, who: USER.name, when: mxNow(), a: { text: c.text } }); moLog(m, 'Chat', `${moMe()} asked Clavia: ${c.q}`); save(); moRedraw(); pbToast('Saved to the matter’s Chats tab'); } }, 'Save to Matter'),
        c.task ? h('span', { class: 'mo-green' }, '✓ Task added') : h('button', { class: 'mx-link', type: 'button', onclick: () => {
          c.task = true; m.tasks.push(moT('Follow up: ' + c.q.replace(/\?$/, ''), USER.name, 3)); save(); moRedraw(); pbToast(`Task added for you, due ${moSayN(3)}`); } }, 'Make It a Task'),
        c.draft && first !== moMe() ? h('button', { class: 'mx-link', type: 'button', onclick: () => {
          MX.matters.ask = null; moSetTab('updates'); MX.matters.upd = { id: m.id, text: c.text, vis: 'shared' }; moRedraw(); } }, 'Post as Update') : null,
        h('button', { class: 'mx-link', type: 'button', onclick: () => { navigator.clipboard?.writeText(c.text).catch(() => {}); pbToast('Copied'); } }, 'Copy')))];
  const body = h('div', { class: 'mo-ask-body' },
    h('div', { class: 'mo-scope' }, `Answers use only this matter: its key facts, ${mxPlural(m.files.length, 'file and email', 'files and emails')}, ${mxPlural(m.decisions.length, 'decision')} and its tasks. Nothing is saved unless you choose.`),
    ...(a.conv.length ? a.conv.flatMap(turn) : [h('div', { class: 'mo-dlg-cap' }, 'Ask about this matter')]),
    left.length ? h('div', { class: 'mo-starters' }, ...left.map(([q]) => h('button', { class: 'mo-starter', type: 'button', onclick: () => moAsk(m, q) }, h('span', { class: 'mo-says-ic', html: SPARK_ONE }), q))) : null);
  return h('section', { class: 'rqp-right mo-ask' },
    h('div', { class: 'rqp-bar' }, h('div', { class: 'rqp-bar-l' }, h('span', { class: 'mo-ask-av', html: SPARK_ONE }),
      h('span', { class: 'rqp-bar-t' }, h('span', { class: 'rqp-doc-n' }, 'Ask Clavia'), h('span', { class: 'mo-faint' }, `About ${m.title}`))),
      h('div', { class: 'rqp-bar-r' }, h('button', { class: 'rqp-tool', type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: () => { MX.matters.ask = null; moRedraw(); },
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' }))),
    body,
    h('div', { class: 'mo-ask-foot' }, h('div', { class: 'mt-ask rqp-ask-bar mo-ask-bar' }, h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), input,
      h('button', { class: 'mo-send', type: 'button', 'aria-label': 'Ask', html: ARROW, onclick: () => { if (input.value.trim()) moAsk(m, input.value.trim()); } })),
      h('p', { class: 'mo-faint mo-ask-wide' }, 'For anything wider, ', h('button', { class: 'mx-link', type: 'button', onclick: () => {
        const c = a.conv[a.conv.length - 1]; moChat(m, c ? { t: c.q, a: { text: c.text } } : { t: `Tell me about ${m.title}` }); } }, 'open a full chat'), '.')));
}

/* ==================================================================
   The person who asked: their own simple page, as Intake's requester view.
   Where the matter is, who has it, what legal needs from them, the files
   shared with them and the messages. No internal notes, no decisions.
================================================================== */
function moAskerPage(m) {
  const asker = m.asked[0], first = asker.split(' ')[0], ch = moSrc(m);
  const where = ch.key === 'teams' || ch.key === 'slack' ? ch.name : 'Outlook';
  const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const when = (iso) => `${day(iso)}, ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const said = m.updates.filter(u => u.vis !== 'legal');
  const lastLegal = said.find(u => u.vis === 'shared'), waiting = lastLegal && /\?/.test(lastLegal.text) && said[0] === lastLegal;
  const nx = moIsClosed(m) ? null : moNextOf(m);
  const exit = () => { MX.matters.open = m.id; go('matters'); };
  const box = h('textarea', { class: 'mx-rqf-in mx-rqf-ta rqo-box', rows: '3', placeholder: 'Your answer', 'aria-label': 'Your answer' });
  const sendBtn = h('button', { class: 'pb-btn pb-btn--primary', type: 'button', disabled: true, onclick: () => {
    const t = box.value.trim(); if (!t) return;
    m.updates.unshift({ who: asker, vis: 'reply', text: t[0].toUpperCase() + t.slice(1), when: mxNow() }); save(); go('matters');
    pbToast(`Sent to ${m.owner ? m.owner.split(' ')[0] : 'legal'}`); } }, 'Send Answer');
  box.oninput = () => { sendBtn.disabled = !box.value.trim(); };
  const shared = m.files.filter(f => !/playbook|witness|notes/i.test(f.name));
  return h('div', { class: 'rqo' },
    h('header', { class: 'rqo-bar' },
      h('span', { class: 'rqo-brand' }, quillEl('static', { cls: 'rqo-q' }), h('span', {}, 'Lumen Legal')),
      h('span', { class: 'rqo-as' }, `Signed in as ${asker}`),
      h('button', { class: 'rqo-exit', type: 'button', 'data-tip': 'Back to the matter in Clavia', onclick: exit }, `Exit ${first}’s view`)),
    h('main', { class: 'rqo-page' },
      h('div', { class: 'rqo-head' },
        h('div', { class: 'rqo-meta' }, moNum(m), h('span', { class: 'mt-sep' }, '·'), `Opened ${day(m.opened)}`, ...(nx ? [h('span', { class: 'mt-sep' }, '·'), `Next date ${day(nx.d)}`] : [])),
        h('h1', { class: 'rqo-title' }, m.title),
        h('div', { class: 'rqo-who' }, m.owner ? [mxFace(m.owner, 'pb-av'), h('span', {}, `${m.owner} has this`)] : h('span', { class: 'rqo-faint' }, 'Waiting to be picked up by legal'),
          h('span', { class: 'mt-sep' }, '·'), waiting ? h('b', {}, 'Waiting on you') : h('span', {}, moIsClosed(m) ? 'Closed' : 'With legal')),
        h('ol', { class: 'rqo-steps' }, ...MO_STAGES.map((n, i) => h('li', { class: 'rqo-step' + (i < m.stage ? ' is-past' : i === m.stage ? ' is-now' : '') },
          h('span', { class: 'rqo-step-dot' }), h('span', { class: 'rqo-step-t' }, n))))),
      waiting ? h('section', { class: 'rqo-ask' }, h('h2', { class: 'rqo-h' }, 'Legal needs something from you'),
        h('div', { class: 'rqo-askq' }, h('span', { class: 'rqo-askq-who' }, lastLegal.who, ' · ', when(lastLegal.when)), h('p', {}, lastLegal.text)),
        box, h('div', { class: 'rqo-ask-foot' }, h('span', { class: 'rqo-or' }, `Or reply in ${where}; it lands here too.`), sendBtn)) : null,
      h('section', {}, h('h2', { class: 'rqo-h' }, 'Where it’s at'), h('p', { class: 'mo-asker-where' }, m.where)),
      h('section', {}, h('h2', { class: 'rqo-h' }, 'Documents'), h('div', { class: 'rqo-docs' }, ...(shared.length ? shared.map(f => h('div', { class: 'rqo-doc' }, mxTile('file', f.kind === 'email' ? 'msg' : mxExt(f.name)),
        h('span', { class: 'rqo-doc-n' }, f.name.replace(/\.(docx?|pdf|xlsx?)$/i, '')), h('span', { class: 'rqo-doc-v' }, `${f.v ? 'v' + f.v + ' · ' : ''}${day(f.when)}`)))
        : [h('p', { class: 'rqo-none' }, 'Nothing shared yet. Legal will add documents here as they are ready.')]))),
      h('section', {}, h('h2', { class: 'rqo-h' }, 'Messages'), h('div', { class: 'rqo-talk' }, ...(said.length ? said.map(u => h('div', { class: 'rqo-msg' + (u.who === asker ? ' is-you' : ' is-legal') },
        h('div', { class: 'rqo-msg-h' }, h('span', { class: 'rqo-msg-who' }, u.who === asker ? 'You' : u.who), h('span', { class: 'rqo-msg-at' }, when(u.when))), h('div', { class: 'rqo-msg-t' }, u.text)))
        : [h('p', { class: 'rqo-none' }, `No messages yet. ${m.owner ? m.owner.split(' ')[0] : 'Legal'} will write here, and in ${where}.`)])))));
}

/* ==================================================================
   Settings › Matters: how matters are numbered
================================================================== */
/* Settings › Matters › Kinds of Matter: what Clavia needs to know for each, as Intake's Request details */
function moKindsPage() {
  return h('div', { class: 'sx-page' },
    stHead('Kinds of Matter', 'What Clavia needs to know for each kind of matter. If the request doesn’t say, Clavia asks the person who asked before the matter opens.'),
    h('section', { class: 'sx-sec is-first' }, ...MO_TYPES.map(k => h('div', { class: 'mo-kind' },
      h('div', { class: 'mo-late-t' }, h('b', {}, k), h('span', { class: 'mo-faint' }, MO_NEEDS[k].join(' · '))),
      h('span', { class: 'mo-faint mo-kind-n' }, `First tasks: ${MO_FIRST[k].length}`),
      h('button', { class: 'mx-link', type: 'button', onclick: () => pbToast(`Change what Clavia asks for on ${k.toLowerCase()} matters`) }, 'Edit')))),
    h('section', { class: 'mo-kind-eg' }, h('div', { class: 'mo-faint' }, 'For example, in Teams'),
      h('div', { class: 'rqx is-said' }, h('span', { class: 'rqx-face' }, mxFace('Tom Becker', 'rqx-av')), h('div', { class: 'rqx-b' }, h('div', { class: 'rqx-h' }, h('span', { class: 'rqx-who' }, 'Tom Becker')),
        h('div', { class: 'rqx-t is-them' }, 'Orbis says we owe them £64,000. Can legal take this?'))),
      h('div', { class: 'rqx is-said mo-kind-reply' }, h('span', { class: 'rqx-face' }, h('span', { class: 'rqx-av rqx-av--clavia' }, quillEl('static', { cls: 'rqx-q' }))), h('div', { class: 'rqx-b' }, h('div', { class: 'rqx-h' }, h('span', { class: 'rqx-who' }, 'Clavia')),
        h('div', { class: 'rqx-t' }, 'On it, Tom. Two quick things so legal can start: is there a date they want paying by, and do you have the delivery records for May and June?')))));
}
/* Settings › Matters › Who Gets Which Matter: Intake's routing rules, for matters */
function moRulesSetPage() {
  const d = moData();
  const page = h('div', { class: 'sx-page' });
  const paint = () => page.replaceChildren(
    stHead('Who Gets Which Matter', 'When a matter opens, its kind decides who Clavia suggests as the owner. You can always pick someone else.'),
    h('section', { class: 'sx-sec is-first' },
      h('div', { class: 'mo-frow mo-fhead mo-rule' }, h('span', {}, 'Kind of matter'), h('span', {}, 'Goes to'), h('span', {}, 'On')),
      ...d.rules.map(r => { const who = h('button', { class: 'mx-atty', type: 'button', onclick: (e) => { e.stopPropagation(); mxPersonPicker(who, MX_LEGAL, (p) => { r.who = p.name; save(); paint(); pbToast(`${r.kind} matters now go to ${p.name.split(' ')[0]}`); }); } },
          mxFace(r.who), h('span', { class: 'pb-owner-n' }, r.who), h('span', { class: 'mx-atty-chev', html: MO_IC('<path d="m7 10 5 5 5-5"/>', 12) }));
        return h('div', { class: 'mo-frow mo-rule' + (r.on ? '' : ' is-off') }, h('b', {}, `${r.kind} matters`), who,
          h('span', { class: 'mo-switch' + (r.on ? ' is-on' : ''), role: 'switch', 'aria-checked': String(r.on), tabindex: '0', onclick: () => { r.on = !r.on; save(); paint(); } }, h('i'))); })),
    h('p', { class: 'mo-faint mo-help' }, 'Clavia also checks for conflicts when a matter opens: if anyone on the legal team used to work for the other side, it offers to keep them out.'));
  paint();
  return page;
}
function moSettingsPage() {
  const d = moData();
  let by = d.byClient;
  const page = h('div', { class: 'sx-page' });
  const paint = () => page.replaceChildren(
    stHead('Matters', 'How matters are numbered, and how Clavia links work to them.'),
    h('section', { class: 'sx-sec is-first' },
      h('div', { class: 'mo-dlg-cap' }, 'How we number matters'),
      moCheck(!by, 'Our own matter numbers · e.g. MT-208', 'For a legal team working for one company. Clavia numbers each matter for you.', () => { by = false; paint(); }),
      moCheck(by, 'A client and a matter number · e.g. LUM-UK · 0208', 'For teams doing work for several companies, who need to see or charge work by company.', () => { by = true; paint(); }),
      by ? h('div', { class: 'mo-clients' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Clients'), h('button', { class: 'rqv-all mo-all', type: 'button', onclick: () => pbToast('Add a client: a name and a short code') }, '+ Add Client')),
        h('div', { class: 'rqv-rows' }, ...MO_CLIENTS.map(([n, c]) => h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, n), h('span', { class: 'rqd-v' }, c)))),
        h('p', { class: 'mo-faint mo-help' }, 'Existing matters keep their number and get the client in front, so MT-208 becomes LUM-UK · 0208.')) : null,
      h('div', { class: 'mo-set-go' }, moBtn('Save', () => { d.byClient = by; save(); paint(); pbToast(by ? 'Saved. Matters now show a client and a matter number.' : 'Saved. Matters use our own numbers.'); }, true))));
  paint();
  return page;
}

/* ==================================================================
   One piece of work, one item (step 2 of joining Intake and Matters).
   A request can carry a matter's parts in r.mt: its tasks, key dates,
   decisions, money, people and the rest. moAsMatter(r) hands the matter
   screens a matter made from the request itself: the number, name, owner,
   who asked and where it came in are the request's own, so they are never
   kept twice; the matter's parts are read and written straight to r.mt.
   Nothing calls these yet; Intake looks and works exactly as before.
================================================================== */
const MO_PARTS = ['type', 'status', 'waitOn', 'private', 'client', 'where', 'facts', 'tasks', 'dates', 'files', 'decisions', 'people',
  'money', 'links', 'chats', 'updates', 'tl', 'ask', 'draft', 'keptOut', 'shares', 'closed', 'orbis', 'found', 'recordsIn'];
function moAsMatter(r) {
  if (!r || !r.mt) return null;
  const p = r.mt, m = {};
  const own = (key, get, set) => Object.defineProperty(m, key, { enumerable: true, get, set: set || (() => {}) });
  own('id', () => r.id);
  own('title', () => r.title, (v) => { r.title = v; });
  own('owner', () => r.attorney || null, (v) => { r.attorney = v; });
  own('asked', () => [r.submitter, r.team || '']);
  own('source', () => r.source || 'manual');
  own('opened', () => p.opened || r.created);
  own('from', () => null);
  own('stage', () => r.stage ?? 1, (v) => { r.stage = v; });
  own('request', () => r);
  for (const k of MO_PARTS) own(k, () => p[k], (v) => { p[k] = v; });
  return m;
}
/* give a request a matter's parts, empty or from a matter that already exists; nothing on the request itself changes */
function moAttachParts(r, from) {
  if (r.mt) return r.mt;
  const base = from || moBlankMatter(r.id, r.title, moTypeOf(r), { asked: [r.submitter, r.team || ''] });
  r.mt = {};
  for (const k of MO_PARTS) if (base[k] !== undefined) r.mt[k] = structuredClone(base[k]);
  r.mt.opened = mxNow();
  return r.mt;
}
/* every request that is a matter, as a matter */
const moRequestMatters = () => mxIntake().filter(r => r.mt).map(moAsMatter);

/* ==================================================================
   Step 3: a request that is a matter, on the Intake request page.
   Only requests with r.mt reach any of this; every other request is
   drawn by Intake exactly as before.
================================================================== */
/* the two tabs a matter adds */
function moReqTab(r, which) {
  const m = moAsMatter(r);
  return which === 'tasks' ? [moTabTasks(m)[0]] : moTabDecisions(m);
}
/* what a matter adds under a tab the request already has */
function moReqExtra(r, tab) {
  const m = moAsMatter(r);
  if (!m) return [];
  if (tab === 'summary') {
    const tasks = moOpenTasks(m).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 3), dates = moUpcoming(m).slice(0, 3);
    return [h('section', { class: 'rqv' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Next Tasks'), moAllBtn('All tasks', moTabTo('tasks'))),
        tasks.length ? h('div', { class: 'mo-tlist' }, ...tasks.map(t => moTaskRow(m, t))) : h('p', { class: 'rqp-empty' }, 'No open tasks.')),
      dates.length ? h('section', { class: 'rqv' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Next Dates'), moAllBtn('All dates', moTabTo('details'))), h('div', { class: 'mo-dates' }, ...dates.map(x => moDateRow(x)))) : null];
  }
  if (tab === 'details') return [moTabTasks(m)[1], ...moTabDetails(m).slice(1)];
  if (tab === 'team') return moTabPeople(m).slice(1);
  if (tab === 'docs') return [h('section', { class: 'rqv mo-req-files' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, 'Emails and Files on This Matter')), ...moTabFiles(m))];
  return [];
}
/* Clavia's suggestion on a request that looks big */
function moSuggestLine(r) {
  if (r.mt || mxClosed(r) || !/\b(owe|owes|owed|claim|claims|court|tribunal|dispute|sue|sued|lawsuit|unfair)\b/i.test(r.title + ' ' + (r.detail || ''))) return null;
  return h('div', { class: 'mo-says mo-req-sg' }, h('span', { class: 'mo-says-ic', html: SPARK_ONE }),
    h('div', {}, h('b', {}, 'This looks like it will take a while.'), ' Turning it into a matter adds tasks, key dates, decisions and money, and keeps the same number.'),
    h('button', { class: 'btn', type: 'button', onclick: () => moFromRequest(r) }, 'Turn into a Matter'));
}
