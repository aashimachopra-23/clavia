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
    state.mo = { matters: moSeed(), view: 'overview', byClient: false };
    state.moSeedV = MO_SEED_V; save();
  }
  return state.mo;
}
const moGet = (id) => moData().matters.find(m => m.id === id) || null;
const moFirstName = (n) => n === USER.name ? 'You' : n.split(' ')[0];
const moMe = () => USER.name.split(' ')[0];
const moIsClosed = (m) => m.status === 'closed';
const moOpenMatters = () => moData().matters.filter(m => !moIsClosed(m));

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
const moLog = (m, kind, text, who = USER.name) => { m.tl.push({ when: mxNow(), kind, text, who }); m.updated = mxNow(); };

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
function moRedraw() {
  const keep = ['.rqp-left-in', '.mo-ask-body', '#view'].map(q => [q, document.querySelector(q)?.scrollTop || 0]);
  go('matters');
  for (const [q, top] of keep) { const el = document.querySelector(q); if (el) el.scrollTop = top; }
}
const moGo = (id, tab) => { MX.matters.open = id; MX.matters.tab = tab || 'overview'; go('matters'); document.getElementById('view').scrollTop = 0; };

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
  const d = moData();
  const m = MX.matters.open && moGet(MX.matters.open);
  if (MX.matters.open && !m) MX.matters.open = null;
  return m ? moPage(m) : moList(d);
}

const MO_VIEWS = [['overview', 'Overview'], ['all', 'All Matters'], ['tasks', 'Tasks'], ['dates', 'Key Dates']];
function moList(d) {
  const view = MO_VIEWS.some(v => v[0] === d.view) ? d.view : 'overview';
  const myTasks = moOpenMatters().flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name));
  const seg = h('div', { class: 'mo-seg', role: 'tablist', 'aria-label': 'View' }, ...MO_VIEWS.map(([k, label]) => {
    const n = k === 'all' ? moOpenMatters().length : k === 'tasks' ? myTasks.length : null;
    return h('button', { class: 'mo-seg-b', type: 'button', role: 'tab', 'aria-selected': String(k === view),
      onclick: () => { d.view = k; save(); go('matters'); } }, label,
      n != null ? h('span', { class: 'mo-seg-n' + (k === 'tasks' && myTasks.some(moLate) ? ' is-late' : '') }, String(n)) : null);
  }));
  const hearings = d.matters.flatMap(m => m.dates.filter(x => x.kind === 'Hearing' && moDays(x.d) >= 0 && moDays(x.d) <= 30)).length;
  const body = view === 'all' ? moAll(d) : view === 'tasks' ? moTasksView(d) : view === 'dates' ? moDatesView(d) : moOverview(d);
  return h('div', { class: 'pb mx mo' },
    h('header', { class: 'lib-head pb-head mo-head' },
      h('div', {}, h('h1', { class: 'view-title' }, 'Matters'),
        h('p', { class: 'mo-lede' }, `${mxPlural(moOpenMatters().length, 'open matter')} · ${mxPlural(hearings, 'hearing')} in the next 30 days`)),
      h('div', { class: 'mo-head-r' }, seg, mxCta('New Matter', (b) => moNewMatter(b), true))),
    body);
}

/* ── Overview: what needs you today ── */
function moOverview(d) {
  const open = moOpenMatters();
  const mine = open.filter(m => m.owner === USER.name);
  const myTasks = open.flatMap(m => moOpenTasks(m).filter(t => t.who === USER.name).map(t => ({ t, m })))
    .sort((a, b) => (a.t.due || '9') < (b.t.due || '9') ? -1 : 1);
  const teamLate = open.flatMap(m => moOpenTasks(m).filter(moLate).map(t => ({ t, m })));
  const week = myTasks.filter(x => x.t.due && moDays(x.t.due) <= 7);
  const soon = open.flatMap(m => moUpcoming(m).filter(x => moDays(x.d) <= 21).map(x => ({ ...x, m }))).sort((a, b) => (a.d < b.d ? -1 : 1));
  const orbis = moGet('MT-208');
  const rq = mxIntake().find(r => r.id === mxData().orbisRq && !r.matter);

  /* what needs you, most pressing first */
  const items = [];
  if (!orbis && rq) items.push({ hi: true, chip: 'From Intake', title: rq.title, meta: [`${rq.submitter}, finance`, pbWhen(rq.created), '2 files', '£64,000 claimed'],
    says: 'Open it as a dispute matter. Clavia brings across the facts and files, so nothing is typed twice.',
    act: ['Open as a Matter', () => moFromRequest(rq)], ask: () => mxOpen('intake', rq.id), askLabel: 'See the Request' });
  if (orbis && !moIsClosed(orbis) && orbis.decisions.some(x => x.st === 'flag')) items.push({ hi: true, chip: 'Decision', title: 'New delivery records may change a decision',
    meta: [orbis.title, '£22,800 held back', 'New delivery records'], says: 'Only the May delivery may count now: £11,400, not £22,800.',
    act: ['Review Decision', () => moGo('MT-208', 'decisions')] });
  if (orbis && !moIsClosed(orbis) && !orbis.keptOut.length) items.push({ title: 'Matt used to work at Orbis', sub: `Clavia suggests keeping him out of the ${orbis.title}`,
    st: ['Access', 'Today'], act: ['Review', () => { moGo('MT-208', 'people'); }] });
  for (const { t, m } of myTasks.filter(x => moLate(x.t))) items.push({ title: t.t, sub: `${m.title} · task`, st: ['Overdue', moSay(t.due)], late: true, act: ['Mark Done', () => moTick(m, t)] });
  for (const { t, m } of myTasks.filter(x => x.t.due && moDays(x.t.due) === 0)) items.push({ title: t.t, sub: `${m.title} · ${moOpenTasks(m).length} open tasks`, st: ['Due today', moSay(t.due)], act: ['Open', () => moGo(m.id, 'tasks')] });
  if (orbis && !moIsClosed(orbis)) { const t = orbis.tasks.find(x => x.proof && x.st === 'open'); if (t) items.push({ title: 'Delivery records for May and June', sub: `${orbis.title} · waiting on Tom`, st: ['Waiting', moSay(t.due)], act: ['Nudge Tom', () => pbToast('Clavia sent Tom a reminder in Teams')] }); }
  const otherLate = teamLate.filter(x => x.t.who !== USER.name);
  if (otherLate.length) items.push({ title: `${mxPlural(otherLate.length, 'overdue task')} across the team`, sub: otherLate.map(x => `${x.t.who.split(' ')[0]}: ${x.t.t}`).join(' · '), st: ['Overdue', ''], late: true, act: ['See Tasks', () => { d.view = 'tasks'; MX.matters.scope = 'team'; save(); go('matters'); }] });
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
  const setView = (v) => () => { d.view = v; save(); go('matters'); };

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
    moOverviewAsk(),
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
    const hs = moData().matters.flatMap(m => moUpcoming(m).filter(x => x.kind === 'Hearing').map(x => `${moSay(x.d)}: ${x.what} (${m.title}, ${m.owner})`));
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
function moOverviewAsk() {
  const ta = h('textarea', { rows: '1', 'aria-label': 'Ask about your matters', placeholder: 'Ask about your matters, deadlines or decisions' });
  const send = h('button', { class: 'send', type: 'button', disabled: true, 'aria-label': 'Send', html: ARROW });
  const box = h('div', { class: 'ask ask-mini mo-ov-ask' }, ta, h('div', { class: 'askbar' }, send));
  queueMicrotask(() => { if (box.isConnected) initComposer(box, { noModel: true, noTokens: true, attach: [], onSend: (text) => moAskAll(text) }); });
  return h('section', { class: 'mo-askcard' },
    h('div', { class: 'mo-askcard-h' }, h('span', { class: 'rqp-ai-star', html: SPARK_ONE }), h('span', { class: 'mo-askcard-t' }, 'Ask Clavia'),
      h('span', { class: 'mo-askcard-s' }, `Answers from all ${mxPlural(moOpenMatters().length, 'open matter')}: their tasks, dates, decisions and files`)),
    box,
    h('div', { class: 'mo-askcard-sugg' }, h('span', { class: 'mo-faint' }, 'Try'), ...Object.keys(MO_ASK_ALL).map(q => h('button', { class: 'mo-askchip', type: 'button', onclick: () => moAskAll(q) }, q))));
}

/* a date with its day in a small calendar box */
const moDateRow = (x, m, run, extra) => h(run ? 'button' : 'div', { class: 'mo-date', ...(run ? { type: 'button', onclick: run } : {}) },
  h('span', { class: 'mo-cal' + (moDays(x.d) <= 2 && moDays(x.d) >= 0 ? ' is-soon' : '') }, h('span', {}, new Date(x.d).toLocaleDateString('en-GB', { month: 'short' })), h('b', {}, String(new Date(x.d).getDate()))),
  h('span', { class: 'mo-date-t' }, h('span', {}, x.what), h('span', { class: 'mo-faint' }, m ? `${m.title} · ${x.kind}` : `${x.kind} · ${moIn(x.d).toLowerCase()} · reminders 7 days and 1 day before`)),
  m ? h('span', { class: 'mo-chip' + (x.kind === 'Hearing' ? ' is-amber' : '') }, moIn(x.d)) : null, extra || null);

/* ── All Matters: the table ── */
function moAll(d) {
  const nextDate = (m) => moUpcoming(m)[0] || null;
  const used = (m) => m.money ? m.money.billed + m.money.okd : null;
  const st = MX.matters.list;
  const t = mxTable({
    label: 'Matters', st, empty: 'No matters yet.',
    grid: `minmax(240px, 2.4fr) minmax(130px, 1fr) minmax(150px, 1.1fr) minmax(170px, 1.4fr) minmax(110px, .9fr) minmax(120px, .9fr) 32px`,
    cols: [{ key: 'title', label: 'Matter' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Where It’s At' },
      { key: 'nextstep', label: 'Next Step' }, { key: 'next', label: 'Next Date' }, { key: 'budget', label: 'Budget Used', num: true }],
    tabs: [{ k: 'open', label: 'Open', in: (m) => !moIsClosed(m) }, { k: 'mine', label: 'Mine', in: (m) => m.owner === USER.name && !moIsClosed(m) },
      { k: 'waiting', label: 'Waiting on Others', in: (m) => m.status === 'waiting' }, { k: 'closed', label: 'Closed', in: (m) => moIsClosed(m) }],
    allLast: true, tabOf: () => null,
    items: () => d.matters,
    text: (m) => [m.title, m.id, moNum(m), m.type, m.owner, moStLabel(m)].join(' '),
    val: (m, k) => k === 'next' ? (nextDate(m)?.d || '9') : k === 'budget' ? (used(m) ?? -1) : k === 'status' ? moStLabel(m) : k === 'client' ? moClient(m) : k === 'nextstep' ? (moOpenTasks(m)[0]?.t || '') : (m[k] || '').toLowerCase(),
    cells: (m) => {
      const late = moOpenTasks(m).filter(moLate).length, n = nextDate(m), u = used(m);
      const nextTask = moOpenTasks(m).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1)[0];
      return [
        [mxTile('proj'), h('span', { class: 'mo-name' }, h('span', { class: 'pb-row-name' }, m.private ? h('span', { class: 'mo-lock', 'data-tip': 'Private matter', html: MO_IC(MO_ICONS.Access, 12) }) : null, m.title),
          h('span', { class: 'mo-faint mo-name-s', 'data-tip': d.byClient ? moClient(m) : null }, `${moNum(m)} · ${m.type}`))],
        mxPerson(m.owner),
        h('span', { class: 'mo-where' }, moStatus(m), late ? h('span', { class: 'mo-chip is-red' }, `${late} overdue`) : null,
          m.decisions.some(x => x.st === 'flag') ? h('span', { class: 'mo-chip is-amber' }, 'Decision to check') : null),
        h('span', { class: 'mo-clip' }, moIsClosed(m) ? '—' : nextTask ? nextTask.t : '—'),
        n ? h('span', { class: 'mo-name' }, h('span', {}, moSay(n.d)), h('span', { class: 'mo-faint mo-name-s' }, n.kind)) : h('span', { class: 'mo-faint' }, '—'),
        u == null ? h('span', { class: 'mo-faint' }, '—') : h('span', { class: 'mo-used' + (u / m.money.budget > .8 ? ' is-amber' : '') }, h('span', { class: 'mo-bar' }, h('i', { style: `width:${Math.min(100, u / m.money.budget * 100)}%` })), `${moK(u)} of ${moK(m.money.budget)}`)];
    },
    open: (m) => moGo(m.id),
    menu: (m) => [{ label: 'Open', icon: 'files', run: () => moGo(m.id) }, { label: 'Copy Link', icon: 'copy', run: () => { navigator.clipboard?.writeText(location.origin + location.pathname + '#matters/' + m.id).catch(() => {}); pbToast('Link copied'); } }],
  });
  return t.el;
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
      (k) => { MX.matters.scope = k; go('matters'); }), h('span', { class: 'mo-faint' }, 'Ticking a task here ticks it on the matter.')),
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
  const items = () => d.matters.flatMap(m => m.dates.map((x, i) => ({ ...x, id: m.id + ':' + i, m, owner: m.owner })));
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
function moNewMatter(anchor) {
  pbWaysMenu(anchor, 'mo-new', [
    { key: 'intake', name: 'From an Intake Request', desc: 'Its facts, files and the person who asked come across', icon: () => h('span', { html: MX_REQ_IC }) },
    { key: 'blank', name: 'Start Blank', desc: 'For work legal found itself', icon: () => h('span', { html: MO_IC(MO_ICONS.Matter, 16) }) },
  ], (k) => {
    if (k === 'blank') return moBlank();
    const reqs = mxIntake().filter(r => !r.matter && r.status !== 'done' && r.status !== 'cancelled');
    mxPick({ title: 'Open a Matter From a Request', sub: 'Requests in Intake that need more than one answer', one: true, action: 'Next',
      groups: [{ items: reqs.map(r => ({ id: r.id, label: r.title, sub: `${r.id} · ${r.submitter}` })) }],
      onDone: ([id]) => moFromRequest(mxIntake().find(r => r.id === id)) });
  });
}
const moTypeOf = (r) => /dispute|owe|claim|court|tribunal/i.test(r.title + ' ' + (r.detail || '')) ? 'Dispute'
  : /employ|dismiss|hr\b/i.test(r.title) ? 'Employment' : r.type === 'Advice' || r.type === 'Privacy' ? 'Advice' : 'Contract';

/* the Open a Matter dialog: what came across, the first tasks, who can see it */
function moFromRequest(r) {
  if (!r) return;
  if (r.matter && moGet(r.matter)) return moGo(r.matter);
  const orbis = r.id === mxData().orbisRq && !moGet('MT-208');
  const f = { name: orbis ? 'Orbis supplier dispute' : r.title, type: moTypeOf(r), keep: [true, true, true], priv: false };
  const first = r.submitter.split(' ')[0];
  const tasks = () => orbis ? [['Collect the supplier contract and all invoices', USER.name, null], ['Get delivery records for May and June from Tom', 'Tom Becker', 2], ['Check what the contract says about late delivery', USER.name, 3]]
    : MO_FIRST[f.type].map((t, i) => [t, USER.name, i + 2]);
  const facts = orbis ? [['Other side', 'Orbis Supplies Ltd'], ['What they claim', '£64,000 in unpaid invoices'], ['Why we held back', '2 late deliveries, May and June'], ['Asked by', 'Tom Becker, finance']]
    : [['Other side', r.counterparty || '—'], ['Kind of work', r.type], ['Asked by', `${r.submitter}${r.team ? ', ' + r.team.toLowerCase() : ''}`], ['Needed by', r.due ? moSay(r.due) : '—']];
  const files = (r.files || []).map(n => typeof n === 'string' ? n : n.name);
  const dlg = moDialog({
    title: 'Open a Matter', sub: `From ${r.submitter}’s request ${r.id}`, wide: true,
    body: () => [
      moField('Matter Name', moInput(f.name, (v) => { f.name = v; })),
      moField('Kind of Work', moPills(MO_TYPES, f.type, (k) => { f.type = k; dlg.paint(); })),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Clavia brought this across, so nothing is typed again'),
        h('div', { class: 'rqd-grid mo-dlg-facts' }, ...facts.map(([k, v]) => h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, k), h('span', { class: 'rqd-v' }, v)))),
        files.length ? h('div', { class: 'mo-files-chips' }, ...files.map(n => h('span', { class: 'mo-fchip' }, mxTile('file', mxExt(n)), n))) : null),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, `First tasks, suggested for ${f.type === 'Advice' || f.type === 'Employment' ? 'an' : 'a'} ${f.type.toLowerCase()} · ${f.keep.filter(Boolean).length} of 3 kept`),
        ...tasks().map(([t, who, due], i) => moCheck(f.keep[i], t, `${who === USER.name ? 'You' : who}${due != null ? ' · ' + moSayN(due) : ''}`, () => { f.keep[i] = !f.keep[i]; dlg.paint(); }))),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'Who can see it'),
        moCheck(f.priv, 'Private', f.priv ? `Only you and ${first} can open it.` : 'Off: anyone in legal can find it. Turn this on for sensitive matters.', () => { f.priv = !f.priv; dlg.paint(); })),
    ],
    foot: (close) => [h('span', { class: 'mo-faint mo-foot-say' }, `${first} is told when the matter opens.`), moBtn('Cancel', close), moBtn('Open Matter', () => {
      close();
      const d = moData();
      let m;
      if (orbis) m = moOrbis(r.id, f.keep, f.priv);
      else {
        const id = 'MT-' + (Math.max(208, ...d.matters.map(x => +x.id.split('-')[1])) + 1);
        m = moBlankMatter(id, f.name.trim() || r.title, f.type, { asked: [r.submitter, r.team || ''], from: r.id, priv: f.priv,
          facts: facts.filter(x => x[1] !== '—' && x[0] !== 'Asked by'), tasks: tasks().filter((_, i) => f.keep[i]).map(([t, who, due]) => moT(t, who, due)),
          files: files.map(n => ({ kind: 'file', from: r.submitter, name: n, note: `From ${r.id}`, when: mxNow() })), where: `Opened from ${first}’s request: ${r.title}. Clavia keeps this line up to date as emails, files and tasks come in.` });
      }
      if (orbis) m.title = f.name.trim() || m.title;
      d.matters.unshift(m);
      r.matter = m.id; r.updated = mxNow(); r.attorney ||= USER.name; if (r.status === 'new') r.status = 'progress'; (r.activity ||= []).push({ who: USER.name, ev: 'status', what: `opened this as matter ${m.id}`, when: mxNow() });
      save(); moGo(m.id); pbToast(`Matter ${m.id} opened. ${first} has been told.`);
    }, true)],
  });
}
function moBlankMatter(id, title, type, o = {}) {
  return { id, title, type, owner: USER.name, status: 'open', stage: 0, private: !!o.priv, opened: mxNow(), client: 0,
    asked: o.asked || [USER.name, 'Legal'], from: o.from || null,
    where: o.where || 'Just opened. Clavia keeps this line up to date as emails, files and tasks come in.',
    facts: o.facts || [], tasks: o.tasks || MO_FIRST[type].map(t => moT(t, USER.name, null)), dates: [], files: o.files || [], decisions: [],
    people: [[USER.name, 'Owner'], ...(o.asked && o.asked[0] !== USER.name ? [[o.asked[0], 'Asked for it']] : [])], money: null,
    links: o.from ? [[`Intake request ${o.from}`, 'Intake']] : [], chats: [], updates: [],
    tl: [{ when: mxNow(), kind: 'Matter', text: `${moMe()} opened the matter${o.from ? ' from request ' + o.from : ''}`, who: USER.name }],
    ask: [], draft: '', keptOut: [], shares: [] };
}
function moBlank() {
  const f = { name: '', type: 'Advice' };
  const dlg = moDialog({
    title: 'New Matter', sub: 'For work that didn’t come through Intake, for example something legal found itself.',
    body: () => [moField('Name', moInput(f.name, (v) => { f.name = v; }, 'e.g. Review of the new supplier code of conduct')),
      moField('Kind of Work', moPills(MO_TYPES, f.type, (k) => { f.type = k; dlg.paint(); })),
      moField('Owner', h('span', { class: 'rqv-who' }, mxFace(USER.name, 'pb-av rqv-av'), USER.name)),
      h('p', { class: 'mo-faint' }, `Clavia suggests 3 first tasks for ${f.type === 'Advice' || f.type === 'Employment' ? 'an' : 'a'} ${f.type.toLowerCase()} matter once it’s open.`)],
    foot: (close) => [moBtn('Cancel', close), moBtn('Open Matter', () => {
      const d = moData(), id = 'MT-' + (Math.max(208, ...d.matters.map(x => +x.id.split('-')[1])) + 1);
      const m = moBlankMatter(id, f.name.trim() || 'Review of the new supplier code of conduct', f.type);
      d.matters.unshift(m); save(); close(); moGo(m.id); pbToast(`Matter ${id} opened. Clavia suggested 3 first tasks.`);
    }, true)],
  });
}

/* ==================================================================
   One matter
================================================================== */
const MO_TABS = [['overview', 'Overview'], ['tasks', 'Tasks and Dates'], ['files', 'Files'], ['decisions', 'Decisions'], ['activity', 'Activity']];
/* five tabs, not eight: updates, chats and the timeline are one Activity tab, and people sit in the side panel */
const MO_TAB_ALIAS = { chats: 'activity', updates: 'activity', timeline: 'activity', people: 'overview' };

function moPage(m) {
  const closed = moIsClosed(m);
  if (MO_TAB_ALIAS[MX.matters.tab]) MX.matters.tab = MO_TAB_ALIAS[MX.matters.tab];
  let tab = MO_TABS.some(t => t[0] === MX.matters.tab) ? MX.matters.tab : 'overview';
  const ask = MX.matters.ask && MX.matters.ask.id === m.id ? MX.matters.ask : null;
  if (MX.matters.ask && !ask) MX.matters.ask = null;

  const title = h('h1', { class: 'br-title rqp-title', contenteditable: closed ? 'false' : 'true', spellcheck: 'false', 'data-empty': 'Untitled matter',
    oninput: () => { m.title = title.textContent.trim() || 'Untitled matter'; save(); }, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } } });
  title.textContent = m.title;
  const meta = h('div', { class: 'br-meta rqp-meta' },
    h('span', { class: 'rqp-id' }, moNum(m)), ...(moData().byClient ? [h('span', { class: 'mt-sep' }, '·'), `Client: ${moClient(m)}`] : []),
    h('span', { class: 'mt-sep' }, '·'), m.type, h('span', { class: 'mt-sep' }, '·'), h('span', { class: 'rqv-who' }, mxFace(m.owner, 'pb-av rqv-av'), m.owner),
    ...(m.from ? [h('span', { class: 'mt-sep' }, '·'), 'Opened from\u00a0', h('button', { class: 'mx-link mo-from', type: 'button', onclick: () => { if (mxIntake().some(r => r.id === m.from)) mxOpen('intake', m.from); else pbToast(`${m.from} is an older request, kept in Intake’s history`); } }, m.from)] : []),
    m.private ? h('span', { class: 'mo-chip mo-priv' }, h('span', { html: MO_IC(MO_ICONS.Access, 11) }), 'Private') : null);

  /* the five stages every matter goes through */
  const steps = h('div', { class: 'rqp-steps mo-steps', role: 'list', 'aria-label': 'Stage' }, ...MO_STAGES.flatMap((name, i) => [
    i ? h('span', { class: 'rqp-step-rule' + (i <= m.stage ? ' is-past' : ''), 'aria-hidden': 'true' }) : '',
    h('span', { class: 'rqp-step' + (i < m.stage ? ' is-past' : i === m.stage ? ' is-now' : ''), role: 'listitem', 'aria-current': i === m.stage ? 'step' : null },
      h('span', { class: 'rqp-step-dot' }, i < m.stage ? h('span', { html: MO_IC('<path d="m5.5 12.5 4 4 9-9.5"/>', 11) }) : String(i + 1)), h('span', { class: 'rqp-step-t' }, name))]));

  const ink = h('span', { class: 'br-ink', 'aria-hidden': 'true' });
  const count = { tasks: moOpenTasks(m).length, files: m.files.length, decisions: m.decisions.length };
  const tabBtns = MO_TABS.map(([k, label]) => h('button', { class: 'br-tab', type: 'button', role: 'tab', 'data-k': k, 'aria-selected': String(k === tab),
    onclick: () => { MX.matters.tab = k; moRedraw(); } }, label, count[k] ? h('span', { class: 'rqp-tab-n' }, String(count[k])) : null));
  const tabs = h('div', { class: 'br-tabs mo-tabs', role: 'tablist' }, ...tabBtns, ink);
  requestAnimationFrame(() => { const on = tabBtns.find(b => b.dataset.k === tab); if (on?.offsetWidth) { ink.style.setProperty('--w', on.offsetWidth + 'px'); ink.style.setProperty('--x', on.offsetLeft + 'px'); } });

  const body = h('div', { class: 'rqp-body mo-body', 'data-tab': tab }, ...[].concat(MO_TAB_BODY[tab](m)).filter(Boolean));

  const more = h('button', { class: 'br-dots', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions', html: PB_SVG.dots,
    onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(more, [
      !closed ? { label: 'Hand Over', icon: 'share', run: () => moHandOver(m) } : null,
      { label: m.private ? 'Make It Visible to Legal' : 'Make It Private', icon: 'look', run: () => { m.private = !m.private; moLog(m, 'Access', `${moMe()} made the matter ${m.private ? 'private' : 'visible to the legal team'}`); save(); moRedraw(); pbToast(m.private ? 'Private. Only the people on it can open it.' : 'Anyone in legal can find it now.'); } },
      { label: 'Copy Link', icon: 'copy', run: () => { navigator.clipboard?.writeText(location.href).catch(() => {}); pbToast('Link copied'); } },
      closed ? { label: 'Reopen', icon: 'use', run: () => moReopen(m) } : null,
    ]); } });
  const top = h('div', { class: 'br-top' },
    h('button', { class: 'br-back', type: 'button', onclick: () => { MX.matters.open = null; MX.matters.ask = null; go('matters'); } },
      h('span', { class: 'br-back-a', html: MO_IC('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15) }), 'Matters'),
    h('div', { class: 'br-top-r' }, moStatus(m),
      !closed ? h('button', { class: 'btn mo-top-btn', type: 'button', onclick: () => moClose(m) }, 'Close Matter') : null, more));

  const banner = closed ? h('div', { class: 'rqp-old mo-closed' }, h('span', {}, `Closed ${moSay(m.closed.when)} by ${m.closed.by} · ${m.closed.outcome}. Clavia uses the closing summary for similar matters.`),
    h('button', { class: 'mx-link', type: 'button', onclick: () => moReopen(m) }, 'Reopen')) : null;

  const askIn = h('input', { class: 'mt-ask-in', type: 'text', placeholder: `Ask about ${moNum(m)}`, 'aria-label': `Ask about ${m.title}`,
    onkeydown: (e) => { if (e.key === 'Enter' && askIn.value.trim()) { e.preventDefault(); moAsk(m, askIn.value.trim()); } },
    onfocus: () => { if (!ask) { MX.matters.ask = { id: m.id, conv: [] }; moRedraw(); setTimeout(() => document.querySelector('.mo-ask-in')?.focus(), 30); } } });
  const dock = ask ? null : h('div', { class: 'rqp-dock' }, h('div', { class: 'mt-ask rqp-ask-bar' }, h('span', { class: 'rqp-ask-ic', html: SPARK_ONE }), askIn));

  const left = h('div', { class: 'rqp-left' },
    h('div', { class: 'rqp-left-in' }, top, title, meta, banner, h('div', { class: 'mo-steps-w' }, steps), tabs, body), dock);
  /* the right side is never empty: the matter's facts, people and money, or Ask Clavia while it is open */
  const grid = h('div', { class: 'rqp mo-page ' + (ask ? 'has-ask' : 'has-side') }, left, ask ? moAskPanel(m, ask) : moSide(m));
  if (!ask) grid.style.gridTemplateColumns = 'minmax(0, 1fr) 360px';
  return h('div', { class: 'rqp-host' }, grid);
}

const MO_TAB_BODY = {
  overview: moTabOverview, tasks: moTabTasks, files: moTabFiles, decisions: moTabDecisions, activity: moTabActivity,
};
/* Activity: what was said to the person who asked, the chats kept, and everything that happened */
function moTabActivity(m) {
  const h3 = (t, n) => h('div', { class: 'rqv-hrow mo-act-h' }, h('h3', { class: 'rqv-h' }, t, n ? h('span', { class: 'rqp-tab-n' }, String(n)) : null));
  return [h('section', { class: 'rqv' }, h3('Updates', m.updates.length), ...moTabUpdates(m).filter(Boolean)),
    h('section', { class: 'rqv' }, h3('Chats', m.chats.length), ...moTabChats(m).filter(Boolean)),
    h('section', { class: 'rqv' }, h3('Timeline', m.tl.length), ...moTabTimeline(m).filter(Boolean))];
}
/* the side panel: what you need to hand whichever tab you are on */
function moSide(m) {
  const closed = moIsClosed(m);
  const cell = (k, v) => h('div', { class: 'rqd-c' }, h('span', { class: 'rqd-l' }, k), h('span', { class: 'rqd-v' }, v));
  const mo = m.money, left = mo ? mo.budget - mo.billed - mo.okd - mo.expected : 0;
  const link = (label, run) => h('button', { class: 'rqv-all mo-all', type: 'button', onclick: run }, label);
  const person = (name, role, right) => h('div', { class: 'mo-sp' }, mxFace(name, 'pb-av mo-av'),
    h('span', { class: 'mo-late-t' }, h('span', {}, name), h('span', { class: 'mo-faint' }, role)), right || null);
  return h('aside', { class: 'rqp-right mo-side' }, h('div', { class: 'mo-side-in' },
    moSec('Key Facts', !closed ? link('Edit', () => moFacts(m)) : null,
      h('div', { class: 'rqv-rows' }, ...[moData().byClient ? ['Client', moClient(m)] : null, ...m.facts, ['Asked by', `${m.asked[0]}${m.asked[1] ? ', ' + m.asked[1].toLowerCase() : ''}`]].filter(Boolean).map(([k, v]) => cell(k, v))),
      h('div', { class: 'mo-mail' }, h('span', { html: MO_IC(MO_ICONS.Email, 15) }), h('span', { class: 'mo-mail-t' }, h('b', {}, `${m.id.toLowerCase()}@legal.lumen.io`), h('span', { class: 'mo-faint' }, 'Forward emails here. Clavia saves them and picks out dates.')),
        h('button', { class: 'mx-link', type: 'button', onclick: () => { navigator.clipboard?.writeText(`${m.id.toLowerCase()}@legal.lumen.io`).catch(() => {}); pbToast('Copied'); } }, 'Copy'))),
    moSec('People', !closed ? h('button', { class: 'rqv-all mo-all', type: 'button', 'aria-haspopup': 'menu', onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(e.currentTarget, [
        m.orbis ? { label: 'Share With Outside Lawyers', icon: 'share', run: () => moShare(m) } : null,
        { label: 'Keep Someone Out', icon: 'look', run: () => moKeepOut(m) },
        { label: 'Hand Over', icon: 'use', run: () => moHandOver(m) }]); } }, 'Manage') : null,
      ...m.people.map(([n, r]) => person(n, r, r === 'Asked for it' && m.orbis ? h('button', { class: 'mx-link mo-sp-go', type: 'button', onclick: () => moPreviewTom(m) }, 'What they see') : null)),
      ...m.shares.map(s => person('David Keller', `Keller & Moss · outside lawyers · sees ${s.n} items`, h('button', { class: 'mx-link mo-sp-go', type: 'button', onclick: () => moPreviewDavid(m, s.picks, true) }, 'What they see'))),
      ...m.keptOut.map(k => person(k.who, k.why, h('span', { class: 'mo-chip is-red' }, 'Kept out'))),
      h('button', { class: 'mo-priv-row', type: 'button', role: 'switch', 'aria-checked': String(!!m.private), onclick: () => {
        m.private = !m.private; moLog(m, 'Access', `${moMe()} made the matter ${m.private ? 'private' : 'visible to the legal team'}`); save(); moRedraw(); } },
        h('span', { html: MO_IC(MO_ICONS.Access, 14) }), h('span', { class: 'mo-late-t' }, h('span', {}, m.private ? 'Private' : 'Visible to legal'), h('span', { class: 'mo-faint' }, m.private ? 'Only the people above can open it' : 'Anyone in legal can find it')),
        h('span', { class: 'mo-switch' + (m.private ? ' is-on' : '') }, h('i')))),
    moSec('Money', !closed ? link(mo ? 'Edit' : 'Add a Budget', () => moMoneyDlg(m)) : null,
      mo ? h('div', { class: 'mo-money' },
        h('div', { class: 'mo-money-top' }, h('span', { class: 'mo-faint' }, 'Budget for outside lawyers'), h('b', {}, moMoney(mo.budget))),
        h('div', { class: 'mo-stack' }, ...[['is-paid', mo.billed], ['is-ok', mo.okd], ['is-exp', mo.expected]].map(([c, v]) => h('i', { class: c, style: `width:${mo.budget ? Math.min(100, v / mo.budget * 100) : 0}%` }))),
        h('div', { class: 'rqv-rows mo-legend' },
          cell(h('span', {}, h('span', { class: 'mo-sw is-paid' }), 'Paid'), moMoney(mo.billed)),
          cell(h('span', {}, h('span', { class: 'mo-sw is-ok' }), 'OK’d, not billed'), moMoney(mo.okd)),
          cell(h('span', {}, h('span', { class: 'mo-sw is-exp' }), 'Expected later'), moMoney(mo.expected)),
          cell(h('b', {}, 'Left in budget'), h('b', { class: left < 0 ? 'mo-red' : '' }, moMoney(left)))),
        h('p', { class: 'mo-faint mo-help' }, 'Finance sees the same numbers. ', mo.firm ? `Estimate from ${mo.firm}.` : 'No outside lawyers yet, so these are our own guesses.'))
        : h('p', { class: 'rqp-empty' }, 'No outside lawyers, so no budget is needed.')),
    moSec('Linked Records', null, h('p', { class: 'mo-faint mo-help' }, 'Kept in their own systems. Clavia shows them here and doesn’t copy them.'),
      m.links.length ? h('div', { class: 'rqv-rows' }, ...m.links.map(([n, s]) => cell(n, h('span', { class: 'mo-faint' }, s)))) : h('p', { class: 'rqp-empty' }, 'None yet.'))));
}
const moSec = (title, right, ...kids) => h('section', { class: 'rqv' }, h('div', { class: 'rqv-hrow' }, h('h3', { class: 'rqv-h' }, title), right || null), ...kids.filter(Boolean));
const moAllBtn = (label, run) => h('button', { class: 'rqv-all mo-all', type: 'button', onclick: run }, label, h('span', { html: MO_IC('<path d="M9 6l6 6-6 6"/>', 12) }));
const moTabTo = (k) => () => { MX.matters.tab = k; moRedraw(); };
const moOpenAsk = (m, q) => { MX.matters.ask = { id: m.id, conv: [] }; if (q) moAsk(m, q); else moRedraw(); };

/* ── Overview ── */
function moTabOverview(m) {
  const closed = moIsClosed(m);
  const tasks = moOpenTasks(m).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 5);
  const dates = moUpcoming(m).slice(0, 5);
  const nextTask = tasks[0];
  const acts = [...m.tl].sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 5);
  return [
    h('section', { class: 'rqp-ai' },
      h('div', { class: 'rqp-ai-h' }, h('span', { class: 'rqp-ai-star', html: SPARK_ONE }), h('span', {}, 'Where It’s At'), h('span', { class: 'mo-ai-when' }, closed ? `Kept up to date by Clavia · ${moSay(m.closed.when)}` : 'Kept up to date by Clavia · today')),
      h('p', { class: 'rqp-ai-t' }, m.where),
      !closed ? h('div', { class: 'mo-ai-go' },
        nextTask ? h('span', { class: 'mo-chip' }, `Next: ${nextTask.t}${nextTask.due ? ' · ' + moSay(nextTask.due) : ''}`) : dates[0] ? h('span', { class: 'mo-chip' }, `${dates[0].what} · ${moSay(dates[0].d)}`) : null,
        h('button', { class: 'mx-link mo-ai-ask', type: 'button', onclick: () => moOpenAsk(m) }, 'Ask Clavia about this matter')) : null),
    moSec('Next Tasks', moAllBtn('All tasks', moTabTo('tasks')), tasks.length ? h('div', { class: 'mo-tlist' }, ...tasks.map(t => moTaskRow(m, t))) : h('p', { class: 'rqp-empty' }, 'No open tasks.')),
    moSec('Next Dates', moAllBtn('All dates', moTabTo('tasks')), dates.length ? h('div', { class: 'mo-dates' }, ...dates.map(x => moDateRow(x))) : h('p', { class: 'rqp-empty' }, 'No dates yet. Forward emails to the matter’s address and Clavia picks dates out.')),
    moSec('Recent Activity', moAllBtn('All activity', moTabTo('activity')), h('div', { class: 'mo-feed' }, ...acts.map(e => h('div', { class: 'mo-feed-it is-static' }, h('span', { class: 'mo-feed-ic is-' + moKindKey(e.kind) }, moKindIc(e.kind)),
      h('span', { class: 'mo-feed-t' }, h('span', { class: 'mo-feed-x' }, e.text), h('span', { class: 'mo-feed-m' }, h('span', {}, e.who === 'Clavia' ? 'Clavia' : e.who), h('span', { class: 'mo-feed-w' }, pbWhen(e.when)))))))),
  ];
}
const moTlRow = (e) => h('div', { class: 'mo-late-it' }, e.who === 'Clavia' ? h('span', { class: 'mo-ic is-clavia', html: SPARK_ONE }) : mxFace(e.who, 'pb-av mo-av'),
  h('span', { class: 'mo-late-t' }, h('span', {}, e.text), h('span', { class: 'mo-faint' }, `${e.kind} · ${pbWhen(e.when)}`)));

/* ── Tasks and Dates ── */
function moTabTasks(m) {
  const closed = moIsClosed(m);
  const order = [...m.tasks].sort((a, b) => (a.st === 'open') !== (b.st === 'open') ? (a.st === 'open' ? -1 : 1) : (a.due || '9') < (b.due || '9') ? -1 : 1);
  const adding = h('div', { class: 'rqp-addf', hidden: true });
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
      ...list.map(f => h('button', { class: 'mo-frow', type: 'button', onclick: () => moOpenFile(m, f) },
        h('span', { class: 'mo-fname' }, f.kind === 'email' ? h('span', { class: 'mo-feed-ic is-email' }, moKindIc('Email')) : mxTile('file', mxExt(f.name)),
          h('span', { class: 'mo-late-t' }, h('span', { class: 'mo-fn' }, f.name), h('span', { class: 'mo-faint' }, [f.kind === 'email' ? 'Email' : mxExt(f.name).toUpperCase() + ' file', f.note].filter(Boolean).join(' · ')))),
        h('span', { class: 'mo-ffrom' }, f.from === 'Clavia' ? h('span', { class: 'mo-feed-ic is-clavia' }, moKindIc('Clavia')) : mxFace(f.from, 'pb-av mo-av-xs'), h('span', {}, f.from)),
        h('span', { class: 'mo-faint mo-fwhen' }, pbWhen(f.when)))))
      : moEmpty(MO_ICONS.File, 'No files or emails yet', 'Forward emails to the matter’s address, or drop files here. Clavia reads each one and picks out dates.'),
  ];
}
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
  save(); MX.matters.tab = 'tasks'; moRedraw();
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
      moLog(m, 'Decision', `${f.who.split(' ')[0]} decided: ${f.what.trim()}`, f.who); save(); close(); MX.matters.tab = 'decisions'; moRedraw(); pbToast('Decision saved.');
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
  const person = (name, role, right) => h('div', { class: 'rqp-person' }, mxFace(name, 'pb-av rqp-person-av'),
    h('span', { class: 'rqp-person-t' }, h('span', { class: 'rqp-person-n' }, name), h('span', { class: 'rqp-person-r' }, role)), right || null);
  return [
    moSec('On This Matter', null, ...m.people.map(([n, r]) => person(n, r, r === 'Asked for it' && m.orbis ? h('button', { class: 'mx-link', type: 'button', onclick: () => moPreviewTom(m) }, `See what ${n.split(' ')[0]} sees`) : null))),
    m.orbis ? moSec('Shared Outside Lumen', !closed ? h('button', { class: 'rqv-all mo-all', type: 'button', onclick: () => moShare(m) }, 'Share With Outside Lawyers') : null,
      m.shares.length ? h('div', {}, ...m.shares.map(s => person('David Keller', `Keller & Moss LLP · our outside lawyers · can see ${s.n} items · shared by ${moFirstName(s.by)}, ${pbWhen(s.when)}`,
        h('button', { class: 'mx-link', type: 'button', onclick: () => moPreviewDavid(m, s.picks, true) }, 'See what they see'))))
        : h('p', { class: 'rqp-empty' }, 'Nobody outside Lumen. Share only the parts an outside law firm needs.')) : null,
    moSec('Who Can See It', null, moCheck(m.private, 'Private', m.private ? 'Only the people above can open this matter.' : 'Off: anyone in legal can find it.', () => {
      m.private = !m.private; moLog(m, 'Access', `${moMe()} made the matter ${m.private ? 'private' : 'visible to the legal team'}`); save(); moRedraw(); })),
    moSec('Kept Out of This Matter', !closed ? h('button', { class: 'rqv-all mo-all', type: 'button', onclick: () => moKeepOut(m) }, 'Keep Someone Out') : null,
      m.keptOut.length ? h('div', {}, ...m.keptOut.map(k => person(k.who, `${k.why} · added by ${moFirstName(k.by)}, ${pbWhen(k.when)}`, h('span', { class: 'mo-chip is-red' }, 'Kept out'))))
        : h('p', { class: 'rqp-empty' }, 'Nobody. Use this when someone must not see a matter, for example because they used to work for the other side.')),
  ];
}
function moKeepOut(m) {
  const pool = MX_LEGAL.map(p => p.name).filter(n => n !== USER.name && !m.people.some(p => p[0] === n) && !m.keptOut.some(k => k.who === n));
  const f = { who: m.orbis && pool.includes('Matt Rivera') ? 'Matt Rivera' : pool[0], why: m.orbis ? 'Used to work at Orbis until 2025' : '' };
  const dlg = moDialog({ title: 'Keep Someone Out of This Matter', sub: 'For example, someone who used to work for the other side.',
    body: () => { const fn = f.who.split(' ')[0]; return [
      moField('Who', moPills(pool.slice(0, 6), f.who, (k) => { f.who = k; dlg.paint(); })),
      moField('Why', moInput(f.why, (v) => { f.why = v; }), 'Only legal sees this'),
      h('div', { class: 'mo-dlg-sec' }, h('div', { class: 'mo-dlg-cap' }, 'What happens'),
        ...[`${fn} can’t open the matter, its files or its chats`, `It doesn’t show in ${fn}’s search, tasks or key dates`, `Clavia won’t use anything from it when ${fn} asks a question`, `${fn} isn’t told why, only that they don’t have access`]
          .map(t => h('div', { class: 'mo-ok' }, h('span', { class: 'mo-green' }, '✓'), t))),
      h('p', { class: 'mo-faint' }, 'Only the matter owner and the head of legal can change this. Every change is in the timeline.')]; },
    foot: (close) => [moBtn('Cancel', close), moBtn(`Keep ${f.who.split(' ')[0]} Out`, () => {
      m.keptOut.push({ who: f.who, why: f.why.trim() || 'No reason given', by: USER.name, when: mxNow() });
      moLog(m, 'Access', `${moMe()} kept ${f.who.split(' ')[0]} out of the matter`); save(); close(); MX.matters.tab = 'people'; moRedraw();
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
      moLog(m, 'Sharing', `${moMe()} shared ${n} items with Keller & Moss`); save(); close(); MX.matters.tab = 'people'; moRedraw();
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
      m.status = 'closed'; m.stage = 4; m.where = `Closed: ${outcome}.${m.orbis ? ' Orbis withdrew the court claim.' : ''}`;
      moLog(m, 'Matter', `${moMe()} closed the matter: ${outcome}`); save(); close(); MX.matters.ask = null; moRedraw();
      pbToast('Matter closed. The summary is saved for similar matters.');
    }, true, { disabled: moOpenTasks(m).length > 0 })] });
}
function moReopen(m) {
  m.status = 'open'; m.stage = 3; moLog(m, 'Matter', `${moMe()} reopened the matter`); m.closed = null; save(); moRedraw();
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
          MX.matters.ask = null; MX.matters.tab = 'updates'; MX.matters.upd = { id: m.id, text: c.text, vis: 'shared' }; moRedraw(); } }, 'Post as Update') : null,
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
   Settings › Matters: how matters are numbered
================================================================== */
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
