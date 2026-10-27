/* ── Settings ─────────────────────────────────────────────────────
   A page of its own with a sidebar, so every setting has one home:
   Workspace (General, Members), Intake (Channels, Request details,
   Routing rules) and Connections (Connectors). Addresses:
   #settings/connectors · #settings/connectors/slack · #settings/channels
   #settings/details · #settings/rules · #settings/general · #settings/members

   A connector is a page, not a dialog: before you connect it, it says
   why you would, where it then shows up in Clavia (with a preview and
   a way to go there), what it can see and do, what it never does, and
   how it is connected and by whom. After, the same page says what it is
   doing and lets you change what it can see. */

MX.settings = { open: null };

const ST_NAV = [
  { group: 'Workspace', items: [['general', 'General'], ['members', 'Members']] },
  { group: 'Intake', items: [['channels', 'Channels'], ['details', 'Request details'], ['rules', 'Routing rules']] },
  { group: 'Horizon', items: [['profile', 'Company profile'], ['delivery', 'Delivery']] },
  { group: 'Connections', items: [['connectors', 'Connectors']] },
  { group: 'Matters', items: [['matters', 'Numbering']] },
];

function stConns() {
  const d = mxData();
  /* seeded once; v3 starts everyone from the demo seed (Teams connected, ServiceNow waiting on IT, Jira to reconnect) */
  if (!d.conn || d.connV !== 3) { d.conn = structuredClone(ST_SEED); d.connV = 3; save(); }
  return d.conn;
}
const stConn = (id) => { const all = stConns(); return all[id] ||= { st: 'off', see: [] }; };
const stOf = (id) => ST_CONNECTORS.find(c => c.id === id);
const stLink = (sec) => location.origin + location.pathname + '#settings/' + sec;
const stDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
const stGo = (sec) => { MX.settings.open = sec; go('settings'); };

/* the vendor's own mark from the brand folder; where we don't have it yet, a quiet tile with the kind of thing it is */
function stMark(c, cls = '') {
  if (c.mark) return h('span', { class: 'sx-mk ' + cls }, h('img', { src: brandSrc(c.mark), alt: '' }));
  mxGlyphs();
  const g = { asks: 'ask', docs: 'files', work: 'rename', data: 'look', else: 'gear' }[c.group] || 'gear';
  return h('span', { class: 'sx-mk is-plain ' + cls, 'data-tip': `${c.name} logo to come`, html: MI(GLYPHS[g]) });
}

/* where it stands, said with a time wherever there is one */
function stState(c) {
  const x = stConn(c.id);
  if (x.st === 'on') return h('span', { class: 'sx-state is-on' }, h('span', { class: 'sx-dot' }), x.health || 'Connected');
  if (x.st === 'wait') return h('span', { class: 'sx-state is-wait' }, h('span', { class: 'sx-dot' }), 'Waiting on IT');
  if (x.st === 'fix') return h('span', { class: 'sx-state is-fix' }, h('span', { class: 'sx-dot' }), 'Reconnect');
  return null;
}

/* ── the page frame ── */
function settingsView() {
  const sec = MX.settings.open || 'connectors';
  const [top, sub] = sec.split('/');
  const side = h('aside', { class: 'sx-side' },
    h('h1', { class: 'sx-side-t' }, 'Settings'),
    ...ST_NAV.map(g => h('nav', { class: 'sx-side-g', 'aria-label': g.group },
      h('div', { class: 'sx-side-l' }, g.group),
      ...g.items.map(([k, label]) => h('button', { class: 'sx-side-i' + (top === k ? ' is-on' : ''), type: 'button', 'aria-current': top === k ? 'page' : null,
        onclick: () => stGo(k) }, label,
        k === 'connectors' ? h('span', { class: 'sx-side-n' }, String(ST_CONNECTORS.filter(c => stConn(c.id).st === 'on').length)) : null)))));
  const body = top === 'connectors' && sub ? stConnectorPage(stOf(sub)) || stConnectorsPage()
    : top === 'connectors' ? stConnectorsPage()
    : top === 'channels' ? stChannelsPage()
    : top === 'details' ? stDetailsPage()
    : top === 'rules' ? stRulesPage()
    : top === 'members' ? stMembersPage()
    : top === 'profile' ? hzProfilePage()
    : top === 'delivery' ? hzDeliveryPage()
    : top === 'matters' ? moSettingsPage()
    : stGeneralPage();
  return h('div', { class: 'sx' }, side, h('main', { class: 'sx-main' }, body));
}

const stHead = (title, line, ...acts) => h('header', { class: 'sx-head' },
  h('div', { class: 'sx-head-m' }, h('h2', { class: 'sx-title' }, title), line ? h('p', { class: 'sx-line' }, line) : null),
  acts.length ? h('div', { class: 'sx-head-a' }, ...acts) : null);

/* ── Connectors: every system, in the five places legal's work happens ── */
function stConnectorsPage() {
  const on = ST_CONNECTORS.filter(c => stConn(c.id).st === 'on').length;
  const attention = ST_CONNECTORS.filter(c => ['fix', 'wait'].includes(stConn(c.id).st));
  return h('div', { class: 'sx-page' },
    stHead('Connectors', `${on} of ${ST_CONNECTORS.length} connected. Each one says what it’s for, where it shows up, and what it can see before you connect it.`),
    attention.length ? h('div', { class: 'sx-notice' }, ...attention.map(c => h('button', { class: 'sx-notice-r', type: 'button', onclick: () => stGo('connectors/' + c.id) },
      stMark(c, 'is-xs'), h('span', {}, h('b', {}, c.name), ' ', stConn(c.id).st === 'fix' ? 'needs reconnecting. Requests from it aren’t coming in.' : 'is waiting on IT.'),
      h('span', { class: 'sx-notice-go' }, stConn(c.id).st === 'fix' ? 'Reconnect' : 'See what’s left')))) : null,
    ...ST_GROUPS.map(g => h('section', { class: 'sx-group' },
      h('div', { class: 'sx-group-h' }, h('h3', { class: 'sx-group-t' }, g.label), h('p', { class: 'sx-group-s' }, g.say)),
      h('div', { class: 'sx-list' }, ...ST_CONNECTORS.filter(c => c.group === g.k).map(c => {
        const x = stConn(c.id);
        return h('button', { class: 'sx-row', type: 'button', onclick: () => stGo('connectors/' + c.id) },
          stMark(c),
          h('span', { class: 'sx-row-m' }, h('span', { class: 'sx-row-n' }, c.name), h('span', { class: 'sx-row-s' }, c.tagline)),
          h('span', { class: 'sx-row-u' }, c.uses.map(u => ST_USES[u]).join(' · ')),
          h('span', { class: 'sx-row-r' }, stState(c) || h('span', { class: 'sx-row-go' }, x.st === 'off' ? 'Set up' : '')));
      })))));
}

/* ── one connector ── */
function stConnectorPage(c) {
  if (!c) return null;
  const x = stConn(c.id);
  const page = h('div', { class: 'sx-page sx-cx' });
  let flow = null;          // the connect steps, shown under the header while connecting
  const paint = () => page.replaceChildren(...build());
  /* a change of state redraws the whole of Settings, so the sidebar's count and the list agree */
  const done = (msg, undo) => { save(); go('settings'); pbToast(msg, undo ? { label: 'Undo', run: () => { undo(); save(); go('settings'); } } : undefined); };
  const log = (what) => (x.log ||= []).unshift({ who: USER.name, what, at: mxNow() });
  const sameSignIn = () => c.suite ? ST_CONNECTORS.filter(o => o.suite === c.suite && o.id !== c.id && stConn(o.id).st === 'off') : [];

  /* turning it on, after sign-in or a key, with what it may see */
  const finish = (see, also = []) => {
    const was = JSON.stringify(x);
    Object.assign(x, { st: 'on', by: USER.name, at: mxNow(), see, health: c.group === 'asks' ? 'Listening' : 'Ready', note: null });
    log(`connected ${c.name}${see.length ? ' · ' + see.join(', ') : ''}`);
    for (const o of also) Object.assign(stConn(o.id), { st: 'on', by: USER.name, at: mxNow(), see: [], health: 'Ready' });
    flow = null;
    done(`${c.name} is connected${also.length ? ` with ${also.map(o => o.name).join(', ')}` : ''}`, () => { Object.keys(x).forEach(k => delete x[k]); Object.assign(x, JSON.parse(was)); also.forEach(o => { stConn(o.id).st = 'off'; }); });
  };
  const choose = (title, then) => {
    const pick = c.pick;
    if (!pick && !sameSignIn().length) return then([], []);
    const chosen = new Set(x.see?.length ? x.see : pick ? pick.options.slice(0, 1) : []);
    const also = new Set(sameSignIn().map(o => o.id));
    const box = (on, label, sub, toggle) => h('label', { class: 'sx-check' }, h('input', { type: 'checkbox', checked: on, onchange: toggle }),
      h('span', {}, label, sub ? h('span', { class: 'sx-check-s' }, sub) : null));
    flow = h('section', { class: 'sx-flow' },
      h('h3', { class: 'sx-flow-t' }, title),
      pick ? h('div', { class: 'sx-flow-b' }, h('div', { class: 'sx-flow-l' }, pick.label),
        ...pick.options.map(o => box(chosen.has(o), o, null, (e) => { e.target.checked ? chosen.add(o) : chosen.delete(o); }))) : null,
      sameSignIn().length ? h('div', { class: 'sx-flow-b' }, h('div', { class: 'sx-flow-l' }, `The same ${c.suite === 'm365' ? 'Microsoft' : 'Google'} sign-in can also turn on`),
        ...sameSignIn().map(o => box(true, o.name, o.tagline, (e) => { e.target.checked ? also.add(o.id) : also.delete(o.id); }))) : null,
      h('div', { class: 'sx-flow-f' }, h('button', { class: 'pb-btn', type: 'button', onclick: () => { flow = null; paint(); } }, 'Cancel'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: () => {
          if (pick && !chosen.size) return pbToast(`Choose at least one: ${pick.label.toLowerCase()}`);
          then(pick ? pick.options.filter(o => chosen.has(o)) : [], sameSignIn().filter(o => also.has(o.id))); } }, 'Finish')));
    paint(); flow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  /* sign-in is scripted: the vendor's window would open here */
  const signIn = (btn) => {
    btn.disabled = true; btn.classList.add('is-busy');
    btn.replaceChildren(h('span', { class: 'sx-spin' }), `Waiting for ${c.suite === 'm365' ? 'Microsoft' : c.suite === 'google' ? 'Google' : c.name}…`);
    setTimeout(() => choose(`Signed in. Choose what Clavia can see in ${c.name}.`, finish), 1800);
  };
  const sendToIt = () => {
    navigator.clipboard?.writeText(stLink('connectors/' + c.id)).catch(() => {});
    const was = JSON.stringify(x);
    Object.assign(x, { st: 'wait', note: `Waiting on IT: ${c.who.toLowerCase()}`, asked: 'IT', at: mxNow(), by: USER.name });
    log('sent the setup steps to IT'); flow = null;
    done('Link copied. It opens this page, with the steps, for whoever does them.', () => { Object.keys(x).forEach(k => delete x[k]); Object.assign(x, JSON.parse(was)); });
  };
  const itSteps = () => {
    flow = h('section', { class: 'sx-flow' },
      h('h3', { class: 'sx-flow-t' }, `First, in ${c.name === 'Word' || c.suite === 'm365' ? 'Microsoft 365' : c.name}`),
      h('ol', { class: 'sx-steps is-flow' }, ...c.steps.filter(s => s[0] === 'IT').map(([who, what]) => h('li', {}, h('span', { class: 'sx-steps-w' }, who), what))),
      h('div', { class: 'sx-flow-f' },
        h('button', { class: 'pb-btn', type: 'button', onclick: sendToIt }, 'Send to IT'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: (e) => signIn(e.currentTarget) }, 'It’s done · Sign in')));
    paint();
  };
  const keyForm = () => {
    const vals = {};
    flow = h('section', { class: 'sx-flow' },
      h('h3', { class: 'sx-flow-t' }, `Paste what ${c.name} sent you`),
      ...(c.fields || []).map(([label, hint]) => h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, label),
        h('input', { class: 'mx-rqf-in sx-in', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: hint, oninput: (e) => { vals[label] = e.target.value; } }))),
      h('div', { class: 'sx-flow-f' }, h('button', { class: 'pb-btn', type: 'button', onclick: () => { flow = null; paint(); } }, 'Cancel'),
        h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: (e) => {
          if ((c.fields || []).some(([l]) => !vals[l]?.trim())) return pbToast('Paste every value first');
          const b = e.currentTarget; b.disabled = true; b.replaceChildren(h('span', { class: 'sx-spin' }), 'Checking…');
          setTimeout(() => finish([]), 1500); } }, 'Connect')));
    paint();
  };
  const start = (btn) => c.how === 'key' ? keyForm() : c.how === 'admin' ? itSteps() : signIn(btn);

  /* ── header: its mark, its name, what it's for, and the one thing to do ── */
  const primary = () => {
    if (c.how === 'mcp' || c.how === 'api') return null;
    if (x.st === 'on') return h('button', { class: 'br-dots sx-more', type: 'button', 'aria-label': 'More', 'data-tip': 'More Actions', html: PB_SVG.dots,
      onclick: (e) => { e.stopPropagation(); menu(e.currentTarget, [
        c.pick ? { label: 'Change what it can see', icon: 'look', run: () => choose(`What Clavia can see in ${c.name}`, (see) => { const was = x.see; x.see = see; log(`changed what it can see · ${see.join(', ')}`); flow = null; done('Saved', () => { x.see = was; }); }) } : null,
        { label: 'Copy link to this page', icon: 'copy', run: () => { navigator.clipboard?.writeText(stLink('connectors/' + c.id)).catch(() => {}); pbToast('Link copied'); } },
        { rule: true },
        { label: `Disconnect ${c.name}`, icon: 'trash', danger: true, run: disconnect },
      ]); } });
    if (x.st === 'fix') return h('button', { class: 'btn btn--primary', type: 'button', onclick: (e) => signIn(e.currentTarget) }, `Reconnect ${c.name}`);
    if (x.st === 'wait') return h('div', { class: 'sx-head-a' },
      h('button', { class: 'pb-btn', type: 'button', onclick: () => { navigator.clipboard?.writeText(stLink('connectors/' + c.id)).catch(() => {}); pbToast('Link copied'); } }, 'Copy link for IT'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: (e) => signIn(e.currentTarget) }, 'IT has done it · Sign in'));
    if (flow) return null;
    return h('button', { class: 'btn btn--primary', type: 'button', onclick: (e) => start(e.currentTarget) }, `Connect ${c.name}`);
  };
  const disconnect = () => pbConfirm({ title: `Disconnect ${c.name}?`, lead: `Clavia stops ${c.group === 'asks' ? `taking requests from ${c.name} and replying there` : `using ${c.name}`}. Requests and documents already in Clavia stay.`,
    items: c.uses.map(u => ({ n: ST_USES[u], t: c.shows.find(s => s.where.startsWith(ST_USES[u]))?.what || `stops using ${c.name}` })),
    action: 'Disconnect', run: () => { const was = JSON.stringify(x); Object.keys(x).forEach(k => delete x[k]); Object.assign(x, { st: 'off', see: [], log: JSON.parse(was).log });
      log(`disconnected ${c.name}`); done(`${c.name} is disconnected`, () => { Object.keys(x).forEach(k => delete x[k]); Object.assign(x, JSON.parse(was)); }); } });

  const statusLine = () => x.st === 'on' ? h('p', { class: 'sx-status' }, stState(c), h('span', { class: 'mt-sep' }, '·'),
      `Connected by ${x.by === USER.name ? 'you' : x.by} on ${stDay(x.at)}`, x.users ? [h('span', { class: 'mt-sep' }, '·'), x.users] : null)
    : x.st === 'wait' ? h('p', { class: 'sx-status' }, stState(c), h('span', { class: 'mt-sep' }, '·'), `${x.by === USER.name ? 'You' : x.by} sent the steps to ${x.asked || 'IT'} on ${stDay(x.at)}`)
    : x.st === 'fix' ? h('p', { class: 'sx-status is-fix' }, stState(c), h('span', { class: 'mt-sep' }, '·'), x.note)
    : h('p', { class: 'sx-status is-how' }, h('b', {}, ST_HOW[c.how].label), h('span', { class: 'mt-sep' }, '·'), c.who, h('span', { class: 'mt-sep' }, '·'), c.time);

  /* ── where it shows up: the list on the left, what it looks like on the right ── */
  const shows = () => {
    const pv = h('div', { class: 'sx-pv-wrap' });
    let at = 0;
    const rows = c.shows.map((s, i) => h('div', { class: 'sx-show' + (i === 0 ? ' is-on' : ''), tabindex: '0', onmouseenter: () => pick(i), onfocus: () => pick(i) },
      h('span', { class: 'sx-show-w' }, s.where), h('span', { class: 'sx-show-t' }, s.what),
      s.go ? h('button', { class: 'sx-show-go', type: 'button', onclick: (e) => { e.stopPropagation(); location.hash = '#' + s.go; } }, 'Go there') : h('span', { class: 'sx-show-in' }, `In ${s.where.replace(/^In /, '')}`)));
    const pick = (i) => { if (i === at && pv.firstChild) return; at = i; rows.forEach((r, j) => r.classList.toggle('is-on', j === i)); pv.replaceChildren(stPreview(c, c.shows[i].pv)); };
    pick(0); pv.replaceChildren(stPreview(c, c.shows[0].pv));
    return h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'Where it shows up in Clavia'),
      h('div', { class: 'sx-shows' }, h('div', { class: 'sx-shows-l' }, ...rows), pv));
  };
  const why = () => h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, `Why connect ${c.name}`),
    h('div', { class: 'sx-why' }, ...c.why.map(([b, t]) => h('div', { class: 'sx-why-i' }, h('b', {}, b), h('p', {}, t)))));
  const can = () => h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'What Clavia can see and do'),
    h('div', { class: 'sx-can' },
      h('div', {}, h('div', { class: 'sx-can-l' }, 'Can see'), x.st === 'on' && x.see?.length
        ? h('ul', {}, ...x.see.map(s => h('li', { class: 'is-set' }, s)))
        : h('ul', {}, ...c.sees.map(s => h('li', {}, s))),
        x.st === 'on' && c.pick ? h('button', { class: 'sx-link', type: 'button', onclick: () => choose(`What Clavia can see in ${c.name}`, (see) => { const was = x.see; x.see = see; log(`changed what it can see · ${see.join(', ')}`); flow = null; done('Saved', () => { x.see = was; }); }) }, 'Change') : null),
      h('div', {}, h('div', { class: 'sx-can-l' }, 'Can do'), h('ul', {}, ...c.does.map(s => h('li', {}, s)))),
      h('div', {}, h('div', { class: 'sx-can-l' }, 'Never'), h('ul', { class: 'is-never' }, ...c.never.map(s => h('li', {}, s))))),
    h('details', { class: 'sx-perm' }, h('summary', {}, 'Permissions it asks for'), h('ul', {}, ...c.scopes.map(s => h('li', {}, h('code', {}, s))))));
  const how = () => h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'How it’s connected'),
    h('ol', { class: 'sx-steps' }, ...c.steps.map(([who, what]) => h('li', {}, h('span', { class: 'sx-steps-w' }, who), what))),
    c.how === 'admin' && x.st === 'off' ? h('p', { class: 'sx-flow-s' }, 'Not the admin? ', h('button', { class: 'sx-link', type: 'button', onclick: sendToIt }, 'Send this page to IT'), ' and it will be waiting for them.') : null);
  const who = () => h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'Who can use it'),
    h('div', { class: 'sx-who' }, ...['Everyone', 'Legal'].map(k => h('button', { class: 'sx-who-o' + ((x.who || 'Everyone') === k ? ' is-on' : ''), type: 'button',
      onclick: () => { if (x.who === k) return; const was = x.who; x.who = k; log(`made it available to ${k === 'Legal' ? 'the Legal group' : 'everyone'}`); done('Saved', () => { x.who = was; }); } },
      h('span', { class: 'mx-rule-radio' }), h('span', {}, h('b', {}, k === 'Everyone' ? 'Everyone at Lumen' : 'The Legal group'),
        h('span', {}, k === 'Everyone' ? (c.group === 'asks' ? 'Anyone can ask legal here.' : 'Anyone with a Clavia seat can use it.') : 'Only the 8 people in Legal.'))))),
    c.perUser ? h('p', { class: 'sx-flow-s' }, `Each person signs in to ${c.name} for themselves the first time, so Clavia only ever sees what they can.`) : null);
  const activity = () => h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'Activity'),
    h('div', { class: 'sx-log' }, ...[...(x.log || []), ...((x.log || []).some(l => /^connected /.test(l.what)) ? [] : [{ who: x.by, what: `connected ${c.name}`, at: x.at }])].slice(0, 6)
      .map(l => h('div', { class: 'sx-log-r' }, mxFace(l.who), h('span', {}, h('b', {}, l.who === USER.name ? 'You' : l.who), ' ', l.what), h('span', { class: 'sx-log-t' }, stDay(l.at))))));

  function build() {
    const head = h('header', { class: 'sx-cx-head' },
      stMark(c, 'is-lg'),
      h('div', { class: 'sx-head-m' }, h('h2', { class: 'sx-title' }, c.name), h('p', { class: 'sx-line' }, c.tagline), statusLine()),
      h('div', { class: 'sx-head-a' }, primary()));
    const back = h('button', { class: 'mx-back', type: 'button', onclick: () => stGo('connectors') }, h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), 'Connectors');
    const special = c.how === 'mcp' ? stMcp(c, x, paint, log) : c.how === 'api' ? stApi(c, x, paint, log) : null;
    /* a connection that has broken reads like a connected one, with the fix at the top */
    return x.st === 'on' || x.st === 'fix'
      ? [back, head, flow, special, shows(), can(), c.group !== 'asks' || c.id === 'salesforce' ? who() : null, activity()].filter(Boolean)
      : [back, head, flow, why(), shows(), can(), how()].filter(Boolean);
  }
  paint();
  return page;
}

/* ── previews of where a connector shows up, built from the same pieces the app uses ── */
function stPreview(c, pv) {
  /* only marks we have; anything else gets the plain tile, never a broken image */
  const has = new Set(ST_CONNECTORS.map(x => x.mark).filter(Boolean));
  const mk = (id, cls = 'sx-pv-mk') => id && has.has(id) ? h('img', { class: cls, src: brandSrc(id), alt: '' }) : stMark(c, 'is-xs');
  const frame = (label, ...body) => h('div', { class: 'sx-pv' }, label ? h('div', { class: 'sx-pv-cap' }, label) : null, ...body);
  const q = (cls) => quillEl('static', { cls });
  switch (pv.kind) {
    case 'row': {
      const r = mxIntake().find(x => x.id === pv.id) || {};
      return frame('Intake', h('div', { class: 'sx-pv-row is-head' }, h('span', {}, 'Request #'), h('span', {}, 'Request'), h('span', {}, 'Submitter')),
        h('div', { class: 'sx-pv-row' }, h('span', { class: 'mx-req-id' }, r.id), h('span', { class: 'sx-pv-b' }, r.title),
          h('span', { class: 'sx-pv-sub' }, r.submitter, mk(pv.mark || c.mark || r.source, 'sx-pv-mk is-sm'), pv.note ? h('span', { class: 'sx-pv-faint' }, pv.note) : null)));
    }
    case 'thread':
      return frame(null, h('div', { class: 'sx-pv-chan' }, mk(c.mark), pv.chan),
        h('div', { class: 'sx-pv-msg' }, mxFace(pv.who, 'pb-av'), h('div', {}, h('b', {}, pv.who), h('p', {}, pv.said))),
        h('div', { class: 'sx-pv-msg is-reply' }, h('span', { class: 'sx-pv-q' }, q('sx-pv-qi')), h('div', {}, h('b', {}, 'Clavia'), h('p', {}, pv.reply))));
    case 'activity':
      return frame(`Request › Activity`, h('div', { class: 'sx-pv-act' }, mxFace(pv.who, 'pb-av'), h('span', {}, h('b', {}, pv.who), ' ', pv.what), mk(pv.via, 'sx-pv-mk is-sm')),
        h('div', { class: 'sx-pv-act' }, h('span', { class: 'sx-pv-q' }, q('sx-pv-qi')), h('span', {}, h('b', {}, 'Clavia'), ' let them know it’s with legal, with a link to follow it')));
    case 'split':
      return frame('Request › Activity', h('div', { class: 'sx-pv-act' }, mxFace('Priya Shah', 'pb-av'), h('span', {}, h('b', {}, 'Priya Shah'), ' emailed legal@lumen.io'), mk('outlook', 'sx-pv-mk is-sm')),
        h('div', { class: 'sx-pv-act' }, h('span', { class: 'sx-pv-q' }, q('sx-pv-qi')), h('span', {}, h('b', {}, 'Clavia'), ' made 2 requests from this email ', h('u', {}, 'RQ-1050'), ' · ', h('u', {}, 'RQ-1051'))));
    case 'lookup':
      return frame('New request', h('div', { class: 'sx-pv-trace' }, h('span', { class: 'sx-pv-q' }, q('sx-pv-qi')), 'Looked up the deal in Salesforce', mk('salesforce', 'sx-pv-mk is-sm')),
        h('div', { class: 'sx-pv-trace is-sub' }, 'Acme Corp — platform expansion · £1,240,000 · Negotiation'),
        h('div', { class: 'sx-pv-trace is-sub' }, 'Contact: Laura Chen, Procurement Lead'));
    case 'facts':
      return frame(null, h('div', { class: 'sx-pv-facts-h' }, mk(c.mark), pv.title), ...pv.rows.map(([k, v]) => h('div', { class: 'sx-pv-fact' }, h('span', {}, k), h('b', {}, v))),
        h('div', { class: 'sx-pv-faint sx-pv-src' }, `From ${c.name}`));
    case 'rule':
      return frame('Settings › Routing rules', h('div', { class: 'sx-pv-rule' }, h('b', {}, 'Large deals'), h('span', {}, pv.when), h('span', { class: 'sx-pv-faint' }, '→ Grace Coleman · Clavia first, then a lawyer')));
    case 'picker':
      return frame(null, h('div', { class: 'sx-pv-chan' }, mk(pv.mark === undefined ? c.mark : pv.mark), h('span', {}, pv.name || c.name, h('span', { class: 'sx-pv-faint' }, ' · ', pv.where))),
        ...pv.files.map(f => h('div', { class: 'sx-pv-file' }, mxTile('file', mxExt(f)), f)));
    case 'menu':
      return frame('The + menu', ...[['upload', 'Upload from this computer'], ['sharepoint', 'SharePoint'], ['onedrive', 'OneDrive'], ['imanage', 'iManage'], ['box', 'Box']]
        .map(([id, n]) => h('div', { class: 'sx-pv-mi' + (id === pv.mark ? ' is-on' : '') }, id === 'upload' ? h('span', { class: 'sx-pv-clip', html: PB_UPLOAD }) : mk(id, 'sx-pv-mk is-sm'), n)));
    case 'saveback':
      return frame('Request › Documents', h('div', { class: 'sx-pv-file' }, mxTile('file', 'doc'), 'Brightwell — MSA, our response v4'),
        h('div', { class: 'sx-pv-mi is-on' }, mk(pv.mark, 'sx-pv-mk is-sm'), `Save as a new version in ${c.name}`), h('div', { class: 'sx-pv-faint sx-pv-src' }, 'Commercial › Brightwell Energy › MSA'));
    case 'pane':
      return frame(null, h('div', { class: 'sx-pv-word' },
        h('div', { class: 'sx-pv-doc' }, h('b', {}, '3. Fees and Payment'), h('p', {}, 'Fees are payable within ', h('del', {}, 'thirty (30)'), ' ', h('ins', {}, 'sixty (60)'), ' days of the invoice date.')),
        h('div', { class: 'sx-pv-side' }, h('div', { class: 'sx-pv-side-h' }, q('sx-pv-qi'), 'Clavia'), h('div', { class: 'sx-pv-issue' }, h('b', {}, 'Payment'), h('span', {}, '60 days is outside the playbook. Fallback: 45.')),
          h('div', { class: 'sx-pv-issue' }, h('b', {}, 'Liability cap'), h('span', {}, 'Matches our position.')))));
    case 'openword':
      return frame('Request › Documents', h('div', { class: 'sx-pv-file' }, mxTile('file', 'doc'), 'Brightwell — DPA v2'), h('div', { class: 'sx-pv-mi is-on' }, mk('word', 'sx-pv-mk is-sm'), 'Open in Word'));
    case 'cite':
      return frame('Chat', h('p', { class: 'sx-pv-ans' }, 'Service credits stated as the sole remedy are generally upheld between businesses, subject to the reasonableness test ', h('span', { class: 'sx-pv-cite' }, '1'), ', and courts read them narrowly ', h('span', { class: 'sx-pv-cite' }, '2'), '.'),
        h('div', { class: 'sx-pv-faint sx-pv-src' }, 'Sources from LexisNexis, checked with Shepard’s'));
    case 'tools':
      return frame('Chat', h('div', { class: 'sx-pv-trace' }, h('span', { class: 'sx-pv-q' }, q('sx-pv-qi')), 'Searched invoices in Lumen Finance'),
        h('div', { class: 'sx-pv-trace is-sub' }, '14 invoices from Kestrel Freight this year · £186,400'));
    case 'code':
      return frame('Webhook · request.created', h('pre', { class: 'sx-pv-code' }, '{\n  "event": "request.created",\n  "request": "RQ-1052",\n  "type": "Contract review",\n  "via": "api · Procurement portal"\n}'));
  }
  return frame(null);
}

/* ── MCP: the servers added, and what each tool may do ── */
function stMcp(c, x, paint, log) {
  const servers = x.servers ||= [];
  const MODES = { allow: 'Allow', ask: 'Ask first', off: 'Off' };
  const box = h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'Servers'));
  const list = servers.map(s => h('div', { class: 'sx-srv' },
    h('div', { class: 'sx-srv-h' }, h('b', {}, s.name), h('span', { class: 'sx-pv-faint' }, s.url)),
    ...s.tools.map(t => h('div', { class: 'sx-tool' }, h('code', {}, t[0]), h('span', { class: 'sx-tool-k' + (t[1] === 'write' ? ' is-w' : '') }, t[1] === 'write' ? 'Changes things' : 'Reads'),
      h('div', { class: 'sx-seg' }, ...Object.entries(MODES).map(([k, l]) => h('button', { class: 'sx-seg-b' + (t[2] === k ? ' is-on' : ''), type: 'button',
        onclick: () => { t[2] = k; log(`set ${t[0]} to ${l.toLowerCase()}`); save(); paint(); } }, l)))))));
  const url = h('input', { class: 'mx-rqf-in sx-in', type: 'url', placeholder: 'https://mcp.example.com/mcp', spellcheck: 'false' });
  const add = h('button', { class: 'pb-btn', type: 'button', onclick: () => {
    const u = url.value.trim(); if (!/^https:\/\//.test(u)) return pbToast('Paste the server’s https address');
    add.disabled = true; add.replaceChildren(h('span', { class: 'sx-spin' }), 'Checking the server…');
    setTimeout(() => { servers.push({ name: new URL(u).hostname.replace(/^mcp\./, ''), url: u, tools: [['search', 'read', 'allow'], ['get_record', 'read', 'allow'], ['update_record', 'write', 'ask']] });
      log(`added ${u}`); save(); paint(); pbToast('Server added. Its tools that change things are set to ask first.'); }, 1600); } }, 'Add Server');
  box.append(...list, h('div', { class: 'sx-add' }, url, add));
  return box;
}

/* ── API: keys and the events your systems hear ── */
function stApi(c, x, paint, log) {
  const keys = x.keys ||= [], hooks = x.hooks ||= [];
  const sec = h('section', { class: 'sx-sec' }, h('h3', { class: 'sx-sec-t' }, 'Keys'),
    ...keys.map((k, i) => h('div', { class: 'sx-key' }, h('b', {}, k.name), h('code', {}, k.scopes), h('span', { class: 'sx-pv-faint' }, `Made ${stDay(k.made)} · used ${k.used}`),
      h('button', { class: 'sx-link is-danger', type: 'button', onclick: () => { keys.splice(i, 1); log(`revoked the ${k.name} key`); save(); paint();
        pbToast(`${k.name} key revoked`, { label: 'Undo', run: () => { keys.splice(i, 0, k); save(); paint(); } }); } }, 'Revoke'))),
    h('button', { class: 'pb-btn sx-add-b', type: 'button', onclick: () => {
      const k = { name: 'New key', scopes: 'requests:read requests:write', made: mxNow(), used: 'never' }; keys.push(k); log('created a key'); save(); paint();
      pbToast('Key created. Copy the secret now; it isn’t shown again.', { label: 'Copy', run: () => navigator.clipboard?.writeText('clv_live_' + Math.random().toString(36).slice(2, 14)).catch(() => {}) }); } }, 'Create Key'),
    h('h3', { class: 'sx-sec-t is-gap' }, 'Webhooks'),
    ...hooks.map(w => h('div', { class: 'sx-key' }, h('code', {}, w.url), h('span', { class: 'sx-pv-faint' }, w.events))));
  return sec;
}
