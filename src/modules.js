/* ==================================================================
   Vault, Templates, Requests, Projects — the shared parts, then Vault
   and Templates. (Requests and Projects are in modules-work.js.)

   Each module is the Playbooks page again: a title and the one thing
   you came to do, then everything as rows in one bordered table, with
   words for filters and a glass for search. Opening a row gives it the
   page. Nothing is on screen that is not needed until it is asked for.

   What each one is, in the terms the tools lawyers already use:
     Vault      — a set of documents, and a review table read out of them
                  (one row a document, one column a question)
     Templates  — our paper with its blanks named, filled by hand or
                  from a document that already has the answers
     Requests   — what the business asks legal for, read and triaged
                  on arrival
     Projects   — one matter: its chats, vaults, playbooks and requests,
                  and an ask box that knows all of them

   Loaded before app.js, so everything here runs at call time: h(),
   icon(), menu(), go(), state and save() all live there.
================================================================== */

const MX = {
  vault:     { open: null, list: { tab: 'all', find: '', sort: { key: 'updated', dir: -1 } }, files: {} },
  templates: { open: null, list: { tab: 'all', find: '', sort: { key: 'updated', dir: -1 } }, values: {} },
  requests:  { open: null, list: { tab: 'all', find: '', sort: { key: 'updated', dir: -1 } } },
  projects:  { open: null, list: { tab: 'all', find: '', sort: { key: 'updated', dir: -1 } }, items: {} },
  agents:    { open: null },   // 'new', 'build', 'build/done', or an agent's id
  intake:    { open: null, list: { tab: 'all', find: '', sort: { key: null, dir: 1 } } },   // as they came in, newest first; no column claims the sort until one is clicked
  flash: null,      // a row that has just arrived
  pills: null,      // what the next New Chat should start with attached
};

/* Seeded once, then the saved copy is the only copy. */
function mxData() {
  if (!state.mx || state.mxSeedV !== MX_SEED_V) { state.mx = structuredClone(MX_SEED); state.mxSeedV = MX_SEED_V; save(); }
  return state.mx;
}
const mxNow = () => new Date().toISOString();
const mxPlural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* ── routing ──────────────────────────────────────────────────
   #vault is the list and #vault/<id> one vault; the same for the
   other three. go() asks mxHash for the address of what is showing. */
function mxHash(view) { const o = MX[view]?.open; return o ? `${view}/${encodeURIComponent(o).replace(/%2F/g, '/')}` : null; }
function mxRoute(hash) {
  const m = /^(vault|templates|requests|projects|intake|settings|horizon|skills|agents|matters)(?:\/(.+))?$/.exec(hash);
  if (!m) return false;
  const v = m[1], want = m[2] ? decodeURIComponent(m[2]) : null;
  if (state.view === v && MX[v].open === want) return !!want;
  if (!want && !MX[v].open) return false;
  MX[v].open = want; go(v);
  return true;
}
function mxClose(view) { if (MX[view]) MX[view].open = null; }
function mxOpen(view, id) { MX[view].open = id; go(view); }

/* a New Chat that starts with something already attached */
function mxAsk(pills) { MX.pills = pills; go('home'); }
function mxTakePills() { const p = MX.pills || []; MX.pills = null; return p; }

/* glyphs for the row menus, in the family the rest of the menus use */
function mxGlyphs() {
  if (GLYPHS.ask) return;
  GLYPHS.ask = '<path d="M20.5 12a7.5 7.5 0 0 1-10.9 6.7L4.5 20l1.3-5.1A7.5 7.5 0 1 1 20.5 12z"/>';
  GLYPHS.open = '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v3.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6H10"/>';
  GLYPHS.look = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>';
  GLYPHS.unlink = '<path d="M9.5 14.5l5-5"/><path d="M13.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M10.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1"/>';
  GLYPHS.use = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
  GLYPHS.compare = '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>';
  GLYPHS.download = '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17"/>';
  /* a page with a pen on it: a document being filled in from a template */
  GLYPHS.fillin = '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h3.5"/><path d="M13.5 3.5 18.5 8.5v2"/><path d="M13.5 3.5v5h5"/><path d="m14 20 .6-2.6 5-5a1.4 1.4 0 0 1 2 2l-5 5z"/>';
}

/* ── the marks ────────────────────────────────────────────────
   The paper tile from the Playbooks list, in four cuts: a stack of
   sheets for a vault, a sheet with blanks for a template, a folder for
   a project, and a sheet with its type on it for a file. */
/* every brand mark, as plain paths so the build inlines them; a path built at run time
   (`assets/brand/${id}.svg`) is never seen by the build and 404s once deployed */
const BRAND_SRC = {
  'apple': 'assets/brand/apple.svg',
  'box': 'assets/brand/box.svg',
  'chrome': 'assets/brand/chrome.svg',
  'claude': 'assets/brand/claude.svg',
  'drive': 'assets/brand/drive.svg',
  'dropbox': 'assets/brand/dropbox.svg',
  'excel': 'assets/brand/excel.svg',
  'gcal': 'assets/brand/gcal.svg',
  'gdocs': 'assets/brand/gdocs.svg',
  'gemini': 'assets/brand/gemini.svg',
  'gmail': 'assets/brand/gmail.svg',
  'google': 'assets/brand/google.svg',
  'imanage': 'assets/brand/imanage.svg',
  'linkedin': 'assets/brand/linkedin.svg',
  'meet': 'assets/brand/meet.svg',
  'microsoft': 'assets/brand/microsoft.svg',
  'mistral': 'assets/brand/mistral.svg',
  'onedrive': 'assets/brand/onedrive.svg',
  'openai': 'assets/brand/openai.svg',
  'outlook': 'assets/brand/outlook.svg',
  'powerpoint': 'assets/brand/powerpoint.svg',
  'qwen': 'assets/brand/qwen.svg',
  'salesforce': 'assets/brand/salesforce.svg',
  'sharepoint': 'assets/brand/sharepoint.svg',
  'slack': 'assets/brand/slack.svg',
  'snowflake-data-cloud-icon': 'assets/brand/snowflake-data-cloud-icon.svg',
  'teams': 'assets/brand/teams.svg',
  'word': 'assets/brand/word.svg',
  'zoom': 'assets/brand/zoom.svg',
};
const brandSrc = (id) => BRAND_SRC[id] || `assets/brand/${id}.svg`;
const mxTile = (kind, ext) => h('span', { class: 'mx-tile mx-tile--' + kind, 'aria-hidden': 'true' },
  ext ? h('span', { class: 'mx-tile-ext' }, ext) : null);
const mxExt = (name) => (/\.([a-z0-9]{2,4})$/i.exec(name)?.[1] || 'doc').toLowerCase().replace('docx', 'doc').replace('xlsx', 'xls');

/* Linear's circles again: a ring while nothing has happened, filling
   as it is worked, two bars while it waits on someone, full with a tick
   once it is done. */
const MX_RING = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const MX_HALF = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
  + '<path d="M8 4.6a3.4 3.4 0 0 1 0 6.8z" fill="currentColor"/></svg>';
const MX_PAUSE = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
  + '<path d="M6.6 5.9v4.2M9.4 5.9v4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const MX_DONE = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="currentColor"/>'
  + '<path d="M5.4 8.2l1.8 1.8 3.5-3.7" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MX_CANCEL = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
  + '<path d="M5.9 5.9l4.2 4.2M10.1 5.9l-4.2 4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const MX_ST = {
  req: {
    /* a request's status is a task's (15 Oct): picked up, being worked, waiting on someone, finished — or dropped */
    new:       { label: 'New',         color: '#9A968E', svg: MX_RING },
    progress:  { label: 'In progress', color: '#C28A1E', svg: MX_HALF },
    waiting:   { label: 'Waiting',     color: '#7C8AA0', svg: MX_PAUSE },
    done:      { label: 'Completed',   color: '#3A8457', svg: MX_DONE },
    cancelled: { label: 'Cancelled',   color: '#B5B0A7', svg: MX_CANCEL },
  },
  proj: {
    active: { label: 'Active',  color: '#3A8457', svg: MX_HALF },
    hold:   { label: 'On Hold', color: '#7C8AA0', svg: MX_PAUSE },
    closed: { label: 'Closed',  color: '#B5B0A7', svg: MX_DONE },
  },
};
const mxStatus = (set, k) => h('span', { class: 'pb-st mx-st', style: `--st:${MX_ST[set][k].color}` },
  h('span', { class: 'pb-st-ic', html: MX_ST[set][k].svg }), MX_ST[set][k].label);
/* a status you can change where you see it */
function mxStatusBtn(set, item, after) {
  const paint = () => btn.replaceChildren(...mxStatus(set, item.status).childNodes);
  const btn = h('button', { class: 'pb-st mx-st mx-st-btn', type: 'button', 'data-tip': 'Change Status',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => {
      e.stopPropagation();
      pbWaysMenu(btn, 'mx-st', Object.entries(MX_ST[set]).map(([k, v]) => ({
        key: k, name: v.label, on: k === item.status,
        icon: () => h('span', { class: 'mx-st-mi', style: `color:${v.color}`, html: v.svg }) })),
      (k) => {
        if (k === item.status) return;
        item.status = k; item.updated = mxNow(); save();
        btn.style.setProperty('--st', MX_ST[set][k].color);
        paint(); btn.classList.remove('is-set'); void btn.offsetWidth; btn.classList.add('is-set');
        after?.(k);
      }, { keyboard: e.detail === 0, small: true });
    } });
  btn.style.setProperty('--st', MX_ST[set][item.status].color);
  paint();
  return btn;
}
const mxPerson = (name) => [faceEl(name, 'pb-av'), h('span', { class: 'pb-owner-n' }, name)];

/* ── the table ────────────────────────────────────────────────
   The Playbooks table, for anything: words along the top edge to
   filter, a glass to search, column names you can sort by, and rows.
   A tab can bring a body of its own in place of the rows. */
function mxTable(cfg) {
  const st = cfg.st;
  const rows = h('div', { class: 'pb-tbody', role: 'rowgroup' });
  const empty = h('div', { class: 'pb-empty' });
  const head = h('div', { class: 'pb-tr pb-thead', role: 'row' });
  const table = h('div', { class: 'pb-table', role: 'table', 'aria-label': cfg.label, style: `--pb-cols:${cfg.grid}` }, head, rows, empty);
  const alt = h('div', { class: 'mx-alt', hidden: true });
  const tabList = () => { const own = typeof cfg.tabs === 'function' ? cfg.tabs() : cfg.tabs || [], all = { k: 'all', label: cfg.allLabel || 'All' };
    return cfg.allLast ? [...own, all] : [all, ...own]; };

  const paintHead = () => head.replaceChildren(
    ...cfg.cols.map(c => {
      const on = st.sort.key === c.key;
      return h('button', { class: 'pb-th' + (on ? ' is-on' : '') + (c.num ? ' pb-th-num' : ''), type: 'button', role: 'columnheader',
        'aria-sort': on ? (st.sort.dir < 0 ? 'descending' : 'ascending') : 'none',
        onclick: () => { st.sort = on ? { key: c.key, dir: -st.sort.dir } : { key: c.key, dir: c.desc || c.num ? -1 : 1 }; paint(); } },
        c.label, h('span', { class: 'pb-th-ar', 'data-dir': on ? st.sort.dir : 0, html: PB_SVG.chev }));
    }),
    h('span', { class: 'pb-th pb-th-act', role: 'columnheader', 'aria-label': 'Actions' }));

  const bar = h('span', { class: 'pb-tab-bar', 'aria-hidden': 'true' });
  const tabs = h('div', { class: 'pb-tabs', role: 'tablist' });
  const placeBar = () => {
    const on = [...tabs.querySelectorAll('.pb-tab')].find(b => b.dataset.k === st.tab);
    if (!on?.offsetWidth) return;
    bar.style.width = on.offsetWidth + 'px';
    bar.style.transform = `translateX(${on.offsetLeft}px)`;
    bar.classList.add('is-placed');
  };
  const paintTabs = (all) => {
    const list = tabList();
    if (!list.some(t => t.k === st.tab)) st.tab = 'all';
    tabs.replaceChildren(...list.map(t => h('button', { class: 'pb-tab', type: 'button', role: 'tab', 'data-k': t.k,
      'aria-selected': String(t.k === st.tab), onclick: () => { st.tab = t.k; paint(); } },
      t.label,
      t.body && !t.n ? null : h('span', { class: 'pb-tab-n' },
        String(t.n ? t.n() : t.k === 'all' ? all.length : all.filter(x => t.in ? t.in(x) : cfg.tabOf(x) === t.k).length)))), bar);
    placeBar();
    if (!bar.classList.contains('is-placed')) requestAnimationFrame(placeBar);
  };

  const rowEl = (item) => {
    const more = cfg.menu ? h('button', { class: 'pb-row-more', type: 'button', 'aria-label': 'More actions', 'data-tip': 'More Actions',
      html: PB_SVG.dots, onclick: (e) => { e.stopPropagation(); mxGlyphs(); menu(more, cfg.menu(item, row).filter(Boolean)); } }) : null;
    const cells = cfg.cells(item);
    const row = h('div', { class: 'pb-tr pb-row' + (MX.flash === item.id ? ' is-new' : ''), role: 'row', tabindex: '0', 'data-id': item.id,
      onclick: () => cfg.open(item, row),
      onkeydown: (e) => { if (e.key === 'Enter' && e.target === row) cfg.open(item, row); } },
      ...cells.map((c, i) => h('span', { class: 'pb-td' + (i === 0 ? ' pb-td-name' : '') + (cfg.cols[i]?.num ? ' pb-td-num' : '')
        + (cfg.cols[i]?.cls ? ' ' + cfg.cols[i].cls : ''), role: 'cell' }, c)),
      h('span', { class: 'pb-td pb-td-act', role: 'cell' }, more));
    return row;
  };

  /* filters: any number of values per field; a row stays if it has one of them */
  const fval = (f, x) => f.of(x) ?? '';
  const passes = (x) => (cfg.filters || []).every(f => !(st.filters?.[f.key]?.length) || (f.test ? st.filters[f.key].some(v => f.test(v, x)) : st.filters[f.key].includes(fval(f, x))));
  function paint() {
    const q = st.find.trim().toLowerCase();
    const all = cfg.items().filter(passes);
    paintTabs(all);
    paintChips?.();
    paintDrops?.();
    const tab = tabList().find(t => t.k === st.tab);
    if (tab?.body) {
      table.hidden = true; alt.hidden = false;
      alt.replaceChildren(tab.body(q));
    } else {
      table.hidden = false; alt.hidden = true;
      const { key, dir } = st.sort;
      /* a tab can have its own test, so one row can sit under two tabs (yours, and waiting on your approval) */
      const tabDef = tabList().find(t => t.k === st.tab);
      const list = all.filter(x => st.tab === 'all' || (tabDef?.in ? tabDef.in(x) : cfg.tabOf(x) === st.tab))
        .filter(x => !q || cfg.text(x).toLowerCase().includes(q))
        .sort((a, b) => { const x = cfg.val(a, key), y = cfg.val(b, key); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
      rows.replaceChildren(...list.map(rowEl));
      empty.replaceChildren(q ? `Nothing matches “${st.find.trim()}”.`
        : st.tab === 'all' ? (cfg.empty || 'Nothing here yet.') : `Nothing under ${tab.label}.`);
      empty.hidden = list.length > 0;
      paintHead();
      pbFitWatch(table);
    }
    MX.flash = null;
  }

  const qIn = h('input', { type: 'search', placeholder: 'Search ' + cfg.label.toLowerCase(), 'aria-label': 'Search ' + cfg.label.toLowerCase(),
    value: st.find, oninput: (e) => { st.find = e.target.value; paint(); },
    onkeydown: (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); e.target.value = ''; st.find = ''; paint(); search.classList.remove('is-open'); e.target.blur();
    },
    onblur: () => { if (!st.find) search.classList.remove('is-open'); } });
  const search = h('div', { class: 'pb-find pb-list-find' + (st.find ? ' is-open' : '') },
    h('button', { class: 'pb-find-btn', type: 'button', 'aria-label': 'Search ' + cfg.label.toLowerCase(), 'data-tip': 'Search ' + cfg.label,
      html: PB_SVG.search, onclick: () => { search.classList.add('is-open'); qIn.focus(); } }),
    qIn);

  /* ── filters: a quiet funnel beside the glass; its count says how many are on, and the panel clears them ── */
  let fbtn = null, paintChips = null, dropsEl = null, paintDrops = null;
  if (cfg.filters) {
    st.filters ||= {};
    const active = () => cfg.filters.filter(f => st.filters[f.key]?.length);
    const nameOf = (f, v) => (f.label_of ? f.label_of(v) : v) || f.none || '—';
    fbtn = h('button', { class: 'pb-find-btn mx-fbtn', type: 'button', 'aria-label': 'Filter', 'data-tip': 'Filter', 'aria-haspopup': 'true',
      html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>',
      onclick: (e) => { e.stopPropagation(); openFilters(); } });
    const n = h('span', { class: 'mx-fbtn-n' });
    fbtn.append(n);
    paintChips = () => {
      const on = active();
      n.textContent = on.length ? String(on.reduce((s, f) => s + st.filters[f.key].length, 0)) : '';
      fbtn.classList.toggle('is-on', on.length > 0);
    };
    function openFilters(anchor = fbtn, only = null) {
      mxFilterPop({ anchor, filters: cfg.filters, items: cfg.items(), st, only, onChange: paint });
    }
    /* the critical fields as quiet dropdowns in place of tabs: a view, then one per field (cfg.drops) */
    if (cfg.drops) {
      const CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>';
      dropsEl = h('div', { class: 'mx-drops' });
      paintDrops = () => {
        const all = cfg.items().filter(passes);
        const tl = tabList(), cur = tl.find(t => t.k === st.tab) || tl[0];
        const count = (t) => t.n ? t.n() : t.k === 'all' ? all.length : all.filter(x => t.in ? t.in(x) : cfg.tabOf(x) === t.k).length;
        const view = h('button', { class: 'mx-dd is-view', type: 'button', 'aria-haspopup': 'menu',
          onclick: (e) => { e.stopPropagation(); mxViewPop({ anchor: e.currentTarget, views: tl.map(t => ({ label: t.label, n: count(t), on: t.k === st.tab, run: () => { st.tab = t.k; paint(); } })) }); } },
          cur.label, h('span', { class: 'mx-dd-n' }, String(count(cur))), h('span', { class: 'mx-dd-c', html: CHEV }));
        const fields = cfg.drops.map(k => cfg.filters.find(f => f.key === k)).filter(Boolean).map(f => {
          const on = st.filters[f.key] || [];
          const say = on.length ? `${f.label}: ${nameOf(f, on[0])}${on.length > 1 ? ' +' + (on.length - 1) : ''}` : f.label;
          const btn = h('button', { class: 'mx-dd' + (on.length ? ' is-on' : ''), type: 'button', 'aria-haspopup': 'true',
            onclick: (e) => { e.stopPropagation(); openFilters(btn, f.key); } }, say, h('span', { class: 'mx-dd-c', html: CHEV }));
          return btn;
        });
        dropsEl.replaceChildren(view, h('span', { class: 'mx-drops-sep' }), ...fields);
      };
    }
  }

  paint();
  return { el: h('div', { class: 'pb-card' + (cfg.filters ? ' has-filters' : '') },
    h('div', { class: 'pb-bar-list' + (dropsEl ? ' has-drops' : '') }, dropsEl || tabs, fbtn ? h('span', { class: 'mx-fwrap' }, fbtn) : null, search), table, alt), paint };
}

/* the view picker, drawn exactly like a field dropdown: a box, the name, its count; one view at a time */
function mxViewPop({ anchor, views }) {
  document.querySelector('.mx-fpop')?.remove();
  const TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 8.3 2.6 2.6L12 5.4"/></svg>';
  const pop = h('div', { class: 'mx-fpop is-one', role: 'dialog', 'aria-label': 'View' },
    h('div', { class: 'mx-fpop-secs' }, h('div', { class: 'mx-fpop-sec' }, ...views.map(v => h('button', { class: 'mx-fpop-opt' + (v.on ? ' is-on' : '') + (!v.n && !v.on ? ' is-zero' : ''), type: 'button', role: 'menuitemradio', 'aria-checked': String(!!v.on),
      onclick: () => { close(); v.run(); } },
      h('span', { class: 'mx-fpop-box', html: TICK }), h('span', { class: 'mx-fpop-t' }, v.label), h('span', { class: 'mx-fpop-n' }, String(v.n)))))));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top = (r.bottom + 6) + 'px';
  pop.style.left = Math.min(r.left, innerWidth - pop.offsetWidth - 12) + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  const close = () => { pop.remove(); anchor.setAttribute('aria-expanded', 'false'); removeEventListener('mousedown', shut, true); removeEventListener('keydown', shut, true); };
  const shut = (e) => { if (e.type === 'keydown' ? e.key !== 'Escape' : pop.contains(e.target) || anchor.contains(e.target)) return; close(); };
  addEventListener('mousedown', shut, true); addEventListener('keydown', shut, true);
}

/* the filter panel, for every field or for one (a dropdown in the list's head). Any number of values per
   field; a row stays if it has one of them. Typing finds a field or a value. Escape or a click outside closes. */
function mxFilterPop({ anchor, filters, items, st, only = null, onChange }) {
  document.querySelector('.mx-fpop')?.remove();
  st.filters ||= {};
  const fval = (f, x) => f.of(x) ?? '';
  const nameOf = (f, v) => (f.label_of ? f.label_of(v) : v) || f.none || '—';
  const list = only ? filters.filter(f => f.key === only) : filters;
  const pop = h('div', { class: 'mx-fpop' + (only ? ' is-one' : ''), role: 'dialog', 'aria-label': only ? list[0]?.label : 'Filter' });
  const fq = h('input', { class: 'mx-fpop-q', type: 'text', placeholder: only ? `Find ${list[0]?.label.toLowerCase()}…` : 'Filter by…', 'aria-label': 'Find', autocomplete: 'off', oninput: () => paintPop() });
  const secs = h('div', { class: 'mx-fpop-secs' });
  const ffoot = h('div', { class: 'mx-fpop-foot' });
  /* a search box only where there is something to search: the whole panel, or a long list */
  const longest = Math.max(...list.map(f => f.fixed ? f.fixed.length : new Set(items.map(x => fval(f, x))).size));
  const needFind = !only || longest > 7;
  /* a custom date range, for a field that has one */
  const rf = only && list[0]?.range ? list[0] : null;
  const rangeRow = rf ? h('button', { class: 'mx-fpop-opt mx-fpop-cal-go', type: 'button', onclick: () => openCal() },
    h('span', { class: 'mx-fpop-cal-ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.8" y="5" width="16.4" height="14.5" rx="2.2"/><path d="M3.8 9.6h16.4M8.5 3.4v3.2M15.5 3.4v3.2"/></svg>' }),
    h('span', { class: 'mx-fpop-t' }, 'Custom range…'), h('span', { class: 'mx-fpop-n', html: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>' })) : null;
  /* the range picker: a month, click a start and an end; the days between shade in */
  const openCal = () => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cur = (st.filters[rf.key] || []).find(v => String(v).startsWith('range:'));
    let a = cur ? cur.split(':')[1] : null, b = cur ? cur.split(':')[2] : null, hover = null;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    let month = new Date((a ? new Date(a + 'T12:00:00') : t0).getFullYear(), (a ? new Date(a + 'T12:00:00') : t0).getMonth(), 1);
    const short = (x) => new Date(x + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const cal = h('div', { class: 'mx-cal' });
    const paintCal = () => {
      const first = new Date(month), lead = (first.getDay() + 6) % 7;
      const start = new Date(first); start.setDate(1 - lead);
      const lo = a && (b || hover) ? (a < (b || hover) ? a : (b || hover)) : a, hi = a && (b || hover) ? (a < (b || hover) ? (b || hover) : a) : null;
      const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
      const say = !a ? 'Pick a start date' : !b ? `${short(a)} – pick an end` : `${short(lo)} – ${short(hi)}`;
      cal.replaceChildren(
        h('div', { class: 'mx-cal-h' },
          h('button', { class: 'mx-cal-nav', type: 'button', 'aria-label': 'Previous month', onclick: () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); paintCal(); },
            html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>' }),
          h('span', { class: 'mx-cal-m' }, month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })),
          h('button', { class: 'mx-cal-nav', type: 'button', 'aria-label': 'Next month', onclick: () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); paintCal(); },
            html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>' })),
        h('div', { class: 'mx-cal-g' }, ...['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => h('span', { class: 'mx-cal-dow' }, x)),
          ...days.map(d => { const k = iso(d), out = d.getMonth() !== month.getMonth();
            const edge = k === lo || k === hi || (k === a && !hi), mid = lo && hi && k > lo && k < hi;
            return h('button', { class: 'mx-cal-d' + (out ? ' is-out' : '') + (edge ? ' is-edge' : '') + (mid ? ' is-mid' : '') + (k === lo && hi ? ' is-lo' : '') + (k === hi && lo !== hi ? ' is-hi' : '') + (d.getTime() === t0.getTime() ? ' is-today' : ''),
              type: 'button', onmouseenter: () => { if (a && !b) { hover = k; paintCal(); } },
              onclick: () => { if (!a || b) { a = k; b = null; } else { b = k; if (b < a) [a, b] = [b, a]; } hover = null; paintCal(); } }, h('span', {}, String(d.getDate()))); })),
        h('div', { class: 'mx-cal-f' }, h('span', { class: 'mx-cal-say' }, say),
          h('button', { class: 'mx-fclear', type: 'button', onclick: () => { paintBack(); } }, 'Back'),
          h('button', { class: 'pb-btn pb-btn--primary mx-cal-ok', type: 'button', disabled: !(a && b), onclick: () => {
            const arr = (st.filters[rf.key] || []).filter(v => !String(v).startsWith('range:')); arr.push(`range:${a}:${b}`); st.filters[rf.key] = arr; onChange(); paintBack(); } }, 'Apply')));
    };
    const paintBack = () => { pop.classList.remove('is-cal'); cal.remove(); [secs, rangeRow, ffoot].forEach(x => { if (x) x.hidden = false; }); paintPop(); };
    pop.classList.add('is-cal'); [secs, rangeRow, ffoot].forEach(x => { if (x) x.hidden = true; });
    pop.append(cal); paintCal();
  };
  pop.append(...[needFind ? h('div', { class: 'mx-fpop-head' }, h('span', { class: 'mx-ap-glass', html: PB_SVG.search }), fq) : null, secs, rangeRow, ffoot].filter(Boolean));
  const onCount = () => list.reduce((n, f) => n + (st.filters[f.key]?.length || 0), 0);
  const paintFoot = () => { const n = onCount(); ffoot.hidden = !n;
    ffoot.replaceChildren(h('span', { class: 'mx-fpop-on' }, `${n} selected`),
      h('button', { class: 'mx-fclear', type: 'button', onclick: () => { list.forEach(f => { delete st.filters[f.key]; }); onChange(); paintPop(); } }, 'Clear')); };
  const paintPop = () => { paintFoot(); paintSecs(); };
  const paintSecs = () => secs.replaceChildren(...list.map(f => {
    const t = fq.value.trim().toLowerCase();
    const custom = (st.filters[f.key] || []).filter(v => String(v).startsWith('range:'));
    const vals = (f.fixed ? [...f.fixed, ...custom] : [...new Set(items.map(x => fval(f, x)))].sort((a, b) => (f.order ? (f.order(a) - f.order(b)) || String(a).localeCompare(String(b)) : String(a).localeCompare(String(b)))))
      .filter(v => !t || (!only && f.label.toLowerCase().includes(t)) || String(nameOf(f, v)).toLowerCase().includes(t));
    const countOf = (v) => items.filter(x => f.test ? f.test(v, x) : fval(f, x) === v).length;
    if (!vals.length) return '';
    return h('div', { class: 'mx-fpop-sec' }, only ? null : h('div', { class: 'mx-fpop-h' }, f.label),
      ...vals.map(v => {
        const on = st.filters[f.key]?.includes(v);
        const n = countOf(v);
        return h('button', { class: 'mx-fpop-opt' + (on ? ' is-on' : '') + (!n && !on ? ' is-zero' : ''), type: 'button', role: 'menuitemcheckbox', 'aria-checked': String(!!on),
          onclick: () => { const a = st.filters[f.key] ||= []; on ? a.splice(a.indexOf(v), 1) : a.push(v); onChange(); paintPop(); } },
          h('span', { class: 'mx-fpop-box', html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 8.3 2.6 2.6L12 5.4"/></svg>' }),
          f.mark ? f.mark(v) : null,
          h('span', { class: 'mx-fpop-t' }, nameOf(f, v)),
          h('span', { class: 'mx-fpop-n' }, String(n)));
      }));
  }));
  paintPop();
  document.body.append(pop);
  if (needFind) setTimeout(() => fq.focus(), 0);
  const r = anchor.getBoundingClientRect();
  pop.style.top = (r.bottom + 6) + 'px';
  pop.style.left = (only ? Math.min(r.left, innerWidth - pop.offsetWidth - 12) : Math.max(12, r.right - pop.offsetWidth)) + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  const shut = (e) => {
    if (e.type === 'keydown' ? e.key !== 'Escape' : pop.contains(e.target) || anchor.contains(e.target)) return;
    pop.remove(); anchor.setAttribute('aria-expanded', 'false');
    removeEventListener('mousedown', shut, true); removeEventListener('keydown', shut, true);
  };
  addEventListener('mousedown', shut, true); addEventListener('keydown', shut, true);
}

/* the page a list sits on: its name, and the one thing you came to do */
function mxListPage(title, cta, ...body) {
  return h('div', { class: 'pb mx' },
    h('header', { class: 'lib-head pb-head' }, h('h1', { class: 'view-title' }, title), cta), ...body);
}
const mxCta = (label, run, popup) => h('button', { class: 'btn btn--primary pb-new', type: 'button',
  ...(popup ? { 'aria-haspopup': 'menu', 'aria-expanded': 'false' } : {}),
  onclick: (e) => { e.stopPropagation(); run(e.currentTarget, e.detail === 0); } }, icon('plus', 'ico ico-14'), label);

/* the page one thing sits on: the way back, its mark and name (typed
   straight onto the page, no box), what can be done with it, and a line
   about it */
function mxDetailPage({ view, back, tile, item, key = 'name', placeholder, sub, actions, desc, onName }, ...body) {
  const title = h('input', { class: 'mx-title', value: item[key] || '', placeholder, 'aria-label': 'Name',
    oninput: (e) => { item[key] = e.target.value; item.updated = mxNow(); save(); onName?.(); } });
  const about = desc === false ? null : h('textarea', { class: 'mx-desc', rows: '1', placeholder: 'Add a description',
    'aria-label': 'Description', oninput: (e) => { item.description = e.target.value; save(); } });
  if (about) about.value = item.description || '';
  const page = h('div', { class: 'pb mx mx-page' },
    h('button', { class: 'mx-back', type: 'button', onclick: () => { mxClose(view); go(view); } },
      h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), back),
    h('header', { class: 'mx-head' },
      h('div', { class: 'mx-head-main' }, tile, title),
      h('div', { class: 'mx-head-acts' }, ...(actions || []))),
    sub ? h('div', { class: 'mx-sub' }, ...[].concat(sub)) : null,
    about, ...body);
  page.titleEl = title;
  return page;
}

/* something deleted leaves with a way back */
function mxRemove(list, item, row, noun, after) {
  const at = list.indexOf(item);
  if (at < 0) return;
  list.splice(at, 1); save();
  const done = () => after?.();
  if (row?.isConnected) pbLeave(row, done); else done();
  pbToast(`Deleted “${item.name || item.title || 'Untitled'}”`, { label: 'Undo', run: () => {
    list.splice(Math.min(at, list.length), 0, item); save(); MX.flash = item.id; after?.(true);
  } });
}

/* ── choosing from a list ─────────────────────────────────────
   Tick the ones you want. Groups are named; one tick or many. */
function mxPick({ title, sub, groups, one, action = 'Add', onDone }) {
  const chosen = new Set();
  const dim = h('div', { class: 'pb-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const close = () => { removeEventListener('keydown', onKey, true); dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); };
  const add = h('button', { class: 'btn btn--primary', type: 'button', disabled: true,
    onclick: () => { close(); onDone([...chosen]); } }, action);
  const rows = [];
  const list = h('div', { class: 'pb-src-list mx-pick-list' }, ...groups.filter(g => g.items.length).flatMap(g => [
    g.label ? h('div', { class: 'mx-pick-sec' }, g.label) : null,
    ...g.items.map(it => {
      const b = h('button', { class: 'pb-src-f', type: 'button', role: one ? 'radio' : 'checkbox', 'aria-checked': 'false',
        onclick: () => {
          if (one) { chosen.clear(); rows.forEach(r => r.setAttribute('aria-checked', 'false')); }
          chosen.has(it.id) ? chosen.delete(it.id) : chosen.add(it.id);
          b.setAttribute('aria-checked', String(chosen.has(it.id)));
          add.disabled = !chosen.size;
          if (!one) add.textContent = chosen.size > 1 ? `${action} ${chosen.size}` : action;
        } },
        h('span', { class: 'pb-src-box', html: PB_SVG.check }),
        h('span', { class: 'pb-src-n' }, it.label),
        it.sub ? h('span', { class: 'mx-pick-sub' }, it.sub) : null);
      rows.push(b);
      return b;
    })].filter(Boolean)));
  dim.append(h('div', { class: 'pb-dlg pb-src', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', { class: 'pb-dlg-head' },
      h('div', { class: 'pb-src-head' }, h('span', {},
        h('h2', { class: 'pb-dlg-t pb-src-t' }, title), sub ? h('span', { class: 'pb-src-where' }, sub) : null)),
      h('button', { class: 'pb-icon-btn', type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: close,
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' })),
    rows.length ? list : h('p', { class: 'mx-pick-none' }, 'Nothing left to add.'),
    h('footer', { class: 'pb-src-foot' }, h('button', { class: 'btn btn-quiet', type: 'button', onclick: close }, 'Cancel'), add)));
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => rows[0]?.focus());
}

/* ── a page that asks ─────────────────────────────────────────
   The New Chat page with a different question over the box — the same
   composer, the same + for files. What Build with AI is to a playbook. */
function mxCreatePage({ view, back, title, placeholder, run }) {
  const glyph = quillEl('greet', { cls: 'home-glyph', then: 'idle' });
  const ta = h('textarea', { rows: '2', 'aria-label': title, placeholder });
  const send = h('button', { class: 'send', type: 'button', disabled: true, 'aria-label': 'Send', html: ARROW });
  const box = h('div', { class: 'ask pb-create-ask' }, ta, h('div', { class: 'askbar' }, send));
  const status = h('div', { class: 'pb-create-status', 'aria-live': 'polite' });
  let composer = null;
  const addFile = (name, mark) => composer?.addPill({ kind: 'file', label: name, mark });
  const file = h('input', { type: 'file', multiple: true, hidden: true, accept: '.docx,.doc,.pdf,.txt,.md,.rtf,.msg,.xlsx',
    onchange: (e) => { for (const f of e.target.files) { (MX.files ||= new Map()).set(f.name, f); addFile(f.name, PB_UPLOAD); } e.target.value = ''; } });
  box.append(file);
  const attach = [
    { label: 'Upload files', mark: PB_UPLOAD, run: () => file.click() },
    ...Object.entries(PB_SOURCES).map(([id, src]) => ({ label: src.name, mark: pbBrand(id),
      run: () => sourcePicker(id, (names) => names.forEach(n => addFile(n, pbBrand(id)))) })),
  ];
  for (const t of ['dragenter', 'dragover']) box.addEventListener(t, (e) => { e.preventDefault(); box.classList.add('is-over'); });
  box.addEventListener('dragleave', () => box.classList.remove('is-over'));
  box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('is-over'); for (const f of e.dataTransfer.files) { (MX.files ||= new Map()).set(f.name, f); addFile(f.name, PB_UPLOAD); } });
  const syncSend = () => { send.disabled = !(ta.value.trim() || composer?.pills.some(p => p.kind === 'file')) || box.classList.contains('is-busy'); };
  ta.addEventListener('input', syncSend);
  new MutationObserver(syncSend).observe(box, { childList: true, subtree: true });

  const page = h('div', { class: 'home pb-create' },
    h('button', { class: 'pb-create-back', type: 'button', onclick: () => { mxClose(view); go(view); } },
      h('span', { class: 'pb-create-back-ar', html: PB_SVG.chev }), back),
    h('div', { class: 'home-head' }, glyph, h('h1', { class: 'display' }, title)),
    h('div', { class: 'askwrap' }, box, status));
  queueMicrotask(() => {
    composer = initComposer(box, { noModel: true, noTokens: true, attach,
      onSend: (_, { pills }) => {
        const text = ta.value.trim();
        const files = pills.filter(p => p.kind === 'file').map(p => p.label);
        box.classList.add('is-busy'); ta.disabled = true;
        setTimeout(() => { ta.value = text; pills.forEach(p => composer.addPill(p)); syncSend(); }, 0);
        quillState(glyph, 'work');
        run(text, files, (step) => status.replaceChildren(h('span', { class: 'pb-step' }, step)));
      } });
    syncSend();
  });
  const focus = () => { if (page.isConnected && !ta.disabled) ta.focus({ preventScroll: true }); };
  setTimeout(focus, 0); setTimeout(focus, 120);
  return page;
}

/* ==================================================================
   Vault
   A vault is a set of documents kept together, and what has been read
   out of them. The list is every vault; a vault is its files and a
   review table — one row a document, one column a question.
================================================================== */
const MX_SRC_NAME = { upload: 'Uploaded', sharepoint: 'SharePoint', onedrive: 'OneDrive', drive: 'Google Drive',
  imanage: 'iManage', dropbox: 'Dropbox', box: 'Box' };
const mxSource = (v) => h('span', { class: 'mx-src' },
  h('span', { class: 'mx-src-ic', html: v.source === 'upload' ? PB_UPLOAD : pbBrand(v.source) }), MX_SRC_NAME[v.source]);
const mxVault = (id) => mxData().vaults.find(v => v.id === id) || null;
const mxVaultEmpty = (v) => !v.name?.trim() && !v.files.length;

function vaultView() {
  const d = mxData();
  /* one that was started and never given a name or a file is not kept */
  if (!MX.vault.open) { const kept = d.vaults.filter(v => !mxVaultEmpty(v)); if (kept.length !== d.vaults.length) { d.vaults = kept; save(); } }
  const v = MX.vault.open && mxVault(MX.vault.open);
  if (MX.vault.open && !v) MX.vault.open = null;
  return v ? vaultPage(v) : vaultList();
}

function vaultList() {
  const d = mxData();
  const t = mxTable({
    label: 'Vaults', st: MX.vault.list, empty: 'No vaults yet.',
    grid: 'minmax(220px, 2.2fr) minmax(112px, 1fr) minmax(64px, 1fr) minmax(140px, 1fr) minmax(112px, 1fr) 32px',
    cols: [{ key: 'name', label: 'Name' }, { key: 'source', label: 'Source' }, { key: 'files', label: 'Files', num: true },
      { key: 'owner', label: 'Owner' }, { key: 'updated', label: 'Last updated', desc: true, cls: 'pb-td-when' }],
    tabs: [{ k: 'upload', label: 'Uploaded' }, { k: 'linked', label: 'Connected' }],
    tabOf: (v) => v.source === 'upload' ? 'upload' : 'linked',
    items: () => d.vaults,
    text: (v) => [v.name, v.owner, v.description, MX_SRC_NAME[v.source], ...v.files.map(f => f.name)].join(' '),
    val: (v, k) => k === 'files' ? v.files.length : k === 'source' ? MX_SRC_NAME[v.source] : k === 'updated' ? v.updated : (v[k] || '').toLowerCase(),
    cells: (v) => [[mxTile('vault'), h('span', { class: 'pb-row-name' }, v.name || 'Untitled vault')],
      mxSource(v), String(v.files.length), mxPerson(v.owner), pbWhen(v.updated)],
    open: (v) => mxOpen('vault', v.id),
    menu: (v, row) => [
      { label: 'Open', icon: 'files', run: () => mxOpen('vault', v.id) },
      { label: 'Ask Clavia', icon: 'ask', run: () => vaultAsk(v) },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(d.vaults, v, row, 'vault', (back) => back && t.paint()) },
    ],
  });
  return mxListPage('Vault', mxCta('New Vault', (btn, keyboard) => newVaultMenu(btn, keyboard), true), t.el);
}

const vaultAsk = (v, f) => mxAsk([{ kind: 'file', label: f ? f.name : v.name || 'Untitled vault',
  mark: f ? PB_UPLOAD : MX_VAULT_MARK }]);
const MX_VAULT_MARK = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
  + 'stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6.5" width="13" height="14" rx="2"/><path d="M8 3.5h10.5a2 2 0 0 1 2 2V17"/></svg>';

/* Upload, or bring a folder in from where the files already live */
function newVaultMenu(anchor, keyboard) {
  const make = (source, names, where) => {
    const v = { id: pbUid('vault'), name: '', description: '', source, where, owner: USER.name, updated: mxNow(), files: [] };
    mxData().vaults.unshift(v); save();
    MX.vault.add = names || 'pick';      // the page adds these, or opens the file chooser, once it is up
    mxOpen('vault', v.id);
  };
  pbWaysMenu(anchor, 'mx-vault-new', [
    { key: 'upload', name: 'Upload Files', icon: () => h('span', { html: PB_UPLOAD }) },
    { sec: 'Add from' },
    ...Object.entries(PB_SOURCES).map(([id, src]) => ({ key: id, name: src.name, icon: () => h('span', { html: pbBrand(id) }) })),
  ], (k) => k === 'upload' ? make('upload') : sourcePicker(k, (names) => make(k, names, PB_SOURCES[k].where)),
  { keyboard, small: true });
}

/* what a file probably is, from what it is called */
const mxKindOf = (name) => /\.msg$|^(re|fw):|email|notes|memo|letter/i.test(name) ? 'Correspondence'
  : /amend|addend|dpa\b|schedule|annex/i.test(name) ? 'Addendum'
  : /order form|order #|sow\b|statement of work/i.test(name) ? 'Order form'
  : /policy|code of conduct|handbook|guidance/i.test(name) ? 'Policy'
  : /agreement|msa\b|nda\b|contract|lease|terms|redline/i.test(name) ? 'Agreement' : 'Other';

function vaultPage(v) {
  const st = (MX.vault.files[v.id] ||= { tab: 'all', find: '', sort: { key: 'added', dir: -1 } });
  const count = h('span', {});
  const paintCount = () => { count.textContent = mxPlural(v.files.length, 'file'); };

  /* new files arrive at the top, are read, and then say how long they are */
  const addFiles = (names) => {
    const fresh = names.map(name => ({ id: pbUid('f'), name, kind: mxKindOf(name), size: null, by: USER.name,
      added: mxNow(), summary: null, facts: null, reading: true }));
    v.files.unshift(...fresh); v.updated = mxNow();
    /* an unnamed vault takes the name of the folder it came from, or of its first file */
    if (!v.name.trim()) { v.name = v.where ? v.where.split(' · ').pop() : names[0].replace(/\.[a-z0-9]+$/i, ''); page.titleEl.value = v.name; }
    save(); MX.flash = fresh[0].id; t.paint(); paintCount(); paintDrop();
    fresh.forEach((f, i) => setTimeout(() => {
      f.reading = false;
      const ext = mxExt(f.name);
      f.size = ext === 'xls' ? '2 sheets' : ext === 'msg' ? '1 message' : `${6 + Math.floor(Math.random() * 22)} pages`;
      f.summary = 'Read just now. Ask Clavia about it, or add a column in Review to pull a term out of it.';
      save();
      const cell = page.querySelector(`.pb-row[data-id="${f.id}"] .mx-size`);
      if (cell) { cell.textContent = f.size; cell.classList.remove('is-reading'); cell.classList.add('is-read'); }
    }, 1100 + i * 420));
  };
  const picker = h('input', { type: 'file', multiple: true, hidden: true,
    onchange: (e) => { if (e.target.files.length) addFiles([...e.target.files].map(f => f.name)); e.target.value = ''; } });
  const addMenu = (anchor, keyboard) => pbWaysMenu(anchor, 'mx-vault-add', [
    { key: 'upload', name: 'Upload Files', icon: () => h('span', { html: PB_UPLOAD }) },
    { sec: 'Add from' },
    ...Object.entries(PB_SOURCES).map(([id, src]) => ({ key: id, name: src.name, icon: () => h('span', { html: pbBrand(id) }) })),
  ], (k) => k === 'upload' ? picker.click() : sourcePicker(k, addFiles), { keyboard, small: true });

  const t = mxTable({
    label: 'Files', st, allLabel: 'Files', empty: '',
    grid: 'minmax(232px, 2.2fr) minmax(104px, 1fr) minmax(84px, 1fr) minmax(140px, 1fr) minmax(112px, 1fr) 32px',
    cols: [{ key: 'name', label: 'Name' }, { key: 'kind', label: 'Type' }, { key: 'size', label: 'Length' },
      { key: 'by', label: 'Added by' }, { key: 'added', label: 'Added', desc: true, cls: 'pb-td-when' }],
    /* the second way to look at a vault: what was read out of every file */
    tabs: () => [{ k: 'review', label: 'Review', body: (q) => vaultReview(v, q) }],
    tabOf: () => 'all',
    items: () => v.files,
    text: (f) => [f.name, f.kind, f.by, f.summary, ...Object.values(f.facts || {})].join(' '),
    val: (f, k) => k === 'added' ? f.added : k === 'size' ? (parseInt(f.size) || 0) : (f[k] || '').toLowerCase(),
    cells: (f) => [[mxTile('file', mxExt(f.name)), h('span', { class: 'pb-row-name' }, f.name)], f.kind,
      h('span', { class: 'mx-size' + (f.reading ? ' is-reading' : '') }, f.reading ? 'Reading…' : f.size),
      mxPerson(f.by), pbWhen(f.added)],
    open: (f) => fileLook(v, f),
    menu: (f, row) => [
      { label: 'Quick Look', icon: 'look', run: () => fileLook(v, f) },
      { label: 'Ask Clavia', icon: 'ask', run: () => vaultAsk(v, f) },
      { rule: true },
      { label: 'Remove', icon: 'trash', danger: true, run: () => {
        const at = v.files.indexOf(f); v.files.splice(at, 1); save();
        pbLeave(row, () => { paintCount(); paintDrop(); t.paint(); });
        pbToast(`Removed “${f.name}”`, { label: 'Undo', run: () => { v.files.splice(at, 0, f); save(); MX.flash = f.id; t.paint(); paintCount(); paintDrop(); } });
      } },
    ],
  });

  /* an empty vault is an invitation, not a table with nothing in it */
  const drop = h('button', { class: 'mx-dd', type: 'button', onclick: (e) => addMenu(e.currentTarget, e.detail === 0) },
    h('span', { class: 'mx-dd-ic', html: PB_UPLOAD }),
    h('span', { class: 'mx-dd-t' }, 'Drop files here'),
    h('span', { class: 'mx-dd-s' }, 'or choose where to add them from'));
  const paintDrop = () => { drop.hidden = v.files.length > 0; t.el.hidden = !v.files.length; };

  const page = mxDetailPage({
    view: 'vault', back: 'Vault', tile: mxTile('vault'), item: v, placeholder: 'Untitled vault',
    sub: [mxSource(v), v.where ? h('span', { class: 'mx-dot' }, v.where) : null, h('span', { class: 'mx-dot' }, count)].filter(Boolean),
    actions: [
      h('button', { class: 'btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
        onclick: (e) => { e.stopPropagation(); addMenu(e.currentTarget, e.detail === 0); } }, icon('plus', 'ico ico-14'), 'Add Files'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => vaultAsk(v) }, 'Ask Clavia'),
    ],
  }, picker, drop, t.el, h('div', { class: 'mx-over', 'aria-hidden': 'true' }, h('span', {}, 'Drop to add to this vault')));
  paintCount(); paintDrop();

  /* files dragged from the desktop land in the vault, wherever they are let go */
  let depth = 0;
  page.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); depth++; page.classList.add('is-over'); } });
  page.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  page.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; page.classList.remove('is-over'); } });
  page.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault(); depth = 0; page.classList.remove('is-over');
    addFiles([...e.dataTransfer.files].map(f => f.name));
  });

  /* arriving from New Vault: the files that were chosen, or the chooser */
  const add = MX.vault.add; MX.vault.add = null;
  if (Array.isArray(add)) setTimeout(() => addFiles(add), 260);
  else if (!v.name) setTimeout(() => page.titleEl.focus({ preventScroll: true }), 80);
  return page;
}

/* ── Review ───────────────────────────────────────────────────
   One row a document, one column a question. The columns a vault
   starts with are the terms most of its documents state; a new one is
   a question in your own words, answered file by file as you watch. */
function vaultReview(v, q) {
  const all = v.files.filter(f => f.facts);
  if (!v.review) {
    const n = {};
    for (const f of all) for (const k of Object.keys(f.facts)) n[k] = (n[k] || 0) + 1;
    v.review = { cols: Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 4).map(k => ({ id: pbUid('col'), label: k.replace(/_/g, ' ') })) };
  }
  const cols = v.review.cols;
  const wrap = h('div', { class: 'mx-rev' });
  /* the answer to a question, for one file: the term whose name shares a word with it */
  const answer = (f, col) => {
    if (!f.facts) return null;
    if (col.answers?.[f.id] !== undefined) return col.answers[f.id];
    const words = col.label.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3);
    const hit = Object.keys(f.facts).find(k => k.replace(/_/g, ' ').toLowerCase() === col.label.toLowerCase())
      || Object.keys(f.facts).find(k => words.some(w => k.toLowerCase().includes(w.slice(0, 5))));
    return hit ? f.facts[hit] : null;
  };
  const paint = (fresh) => {
    const files = v.files.filter(f => !q || (f.name + ' ' + Object.values(f.facts || {}).join(' ')).toLowerCase().includes(q));
    const head = h('div', { class: 'mx-rev-tr mx-rev-head' },
      h('span', { class: 'mx-rev-th' }, 'Document'),
      ...cols.map(c => h('span', { class: 'mx-rev-th' }, h('span', { class: 'mx-rev-th-t' }, c.label),
        h('button', { class: 'mx-rev-x', type: 'button', 'aria-label': 'Remove column', 'data-tip': 'Remove Column', html: PBV_X,
          onclick: () => { cols.splice(cols.indexOf(c), 1); save(); paint(); } }))),
      h('span', { class: 'mx-rev-th mx-rev-th-add' }, addBtn));
    wrap.style.setProperty('--mx-rev-cols', `minmax(230px, 1.5fr) repeat(${cols.length}, minmax(132px, 1fr)) 44px`);
    wrap.style.setProperty('--mx-rev-n', cols.length);
    wrap.replaceChildren(head, ...files.map((f, i) => h('div', { class: 'mx-rev-tr mx-rev-row', onclick: () => fileLook(v, f) },
      h('span', { class: 'mx-rev-td mx-rev-doc' }, mxTile('file', mxExt(f.name)), h('span', { class: 'pb-row-name' }, f.name)),
      ...cols.map(c => {
        const a = answer(f, c);
        const td = h('span', { class: 'mx-rev-td' + (a ? '' : ' is-none') }, a || '—');
        /* a new column is answered down the page, one file after another */
        if (fresh === c.id) {
          td.textContent = ''; td.classList.add('is-reading');
          setTimeout(() => { td.classList.remove('is-reading'); td.textContent = a || '—'; td.classList.add('is-read'); }, 500 + i * 190);
        }
        return td;
      }),
      h('span', { class: 'mx-rev-td' }))),
      files.length ? '' : h('div', { class: 'pb-empty' }, q ? 'Nothing matches that search.' : 'Add files and Clavia will read them into this table.'));
  };
  const addCol = (label) => {
    label = label.trim().replace(/\?+$/, '');
    if (!label) return;
    const c = { id: pbUid('col'), label: label[0].toUpperCase() + label.slice(1) };
    cols.push(c); save(); paint(c.id);
  };
  const addBtn = h('button', { class: 'mx-rev-add', type: 'button', 'aria-label': 'Add column', 'data-tip': 'Add Column',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => {
      e.stopPropagation();
      /* what the documents state that is not yet a column, then your own question */
      const have = new Set(cols.map(c => c.label.toLowerCase()));
      const more = [...new Set(all.flatMap(f => Object.keys(f.facts)))].map(k => k.replace(/_/g, ' ')).filter(k => !have.has(k.toLowerCase())).slice(0, 6);
      pbWaysMenu(addBtn, 'mx-rev-add', [
        { key: '?', name: 'Ask a Question…', icon: () => h('span', { html: MX_ASK_IC }) },
        ...(more.length ? [{ sec: 'Suggested' }] : []),
        ...more.map(k => ({ key: k, name: k, icon: () => h('span', { html: MX_COL_IC }) })),
      ], (k) => k === '?' ? askCol() : addCol(k), { keyboard: e.detail === 0, small: true });
    } }, icon('plus', 'ico ico-14'));
  /* the question is typed where the column will be */
  const askCol = () => {
    const input = h('input', { class: 'mx-rev-q', placeholder: 'What do you want to know?', 'aria-label': 'Column question',
      onkeydown: (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { const t = input.value; cell.remove(); addCol(t); }
        if (e.key === 'Escape') cell.remove();
      }, onblur: () => setTimeout(() => cell.remove(), 120) });
    const cell = h('div', { class: 'mx-rev-ask' }, input);
    wrap.querySelector('.mx-rev-head').after(cell);
    input.focus();
  };
  paint();
  return h('div', { class: 'mx-rev-scroll' }, wrap);
}
const MX_ASK_IC = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M13.5 8a5.5 5.5 0 0 1-8 4.9L2.5 13.5l.8-2.9A5.5 5.5 0 1 1 13.5 8z"/></svg>';
const MX_COL_IC = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="2.5" y="3" width="11" height="10" rx="2"/><path d="M8 3v10"/></svg>';

/* ── Quick Look ───────────────────────────────────────────────
   What a file is and what was read out of it, without leaving the list. */
function fileLook(v, f) {
  const dim = h('div', { class: 'pb-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const close = () => { removeEventListener('keydown', onKey, true); dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); };
  dim.append(h('div', { class: 'pb-dlg mx-look', role: 'dialog', 'aria-modal': 'true', 'aria-label': f.name },
    h('header', { class: 'mx-look-head' },
      mxTile('file', mxExt(f.name)),
      h('div', { class: 'mx-look-id' },
        h('h2', { class: 'pb-dlg-t' }, f.name.replace(/\.[a-z0-9]+$/i, '')),
        h('span', { class: 'mx-look-meta' }, [f.kind, f.size, `Added by ${f.by}`, pbWhen(f.added)].filter(Boolean).join(' · '))),
      h('button', { class: 'pb-icon-btn', type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: close,
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' })),
    f.summary ? h('p', { class: 'mx-look-sum' }, f.summary) : null,
    f.facts ? h('dl', { class: 'mx-facts' }, ...Object.entries(f.facts).flatMap(([k, val]) =>
      [h('dt', {}, k.replace(/_/g, ' ')), h('dd', {}, val)])) : null,
    h('footer', { class: 'pb-confirm-foot' },
      h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Close'),
      h('button', { class: 'btn btn--primary mx-look-ask', type: 'button', onclick: () => { close(); vaultAsk(v, f); } }, 'Ask Clavia'))));
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => dim.querySelector('.mx-look-ask')?.focus());
}

/* ==================================================================
   Templates
   Our paper, with its blanks named. A template opens as the document
   itself beside its fields: type into a field and the document fills
   as you go, or hand it a document that already has the answers.
================================================================== */
const mxTemplate = (id) => mxData().templates.find(t => t.id === id) || null;
/* the seeded templates have been revised a few times; anything made here starts at 1 */
const MX_TPL_VER = { 'mutual-nda': 4, 'one-way-nda': 2, 'msa-short': 3, dpa: 2, 'order-form': 5, 'non-renewal': 1, reseller: 1 };
const mxTplVer = (t) => t.version || MX_TPL_VER[t.id] || 1;
const MX_TPL_TABS = { Agreement: 'Agreements', Addendum: 'Addenda', 'Order form': 'Order Forms', Letter: 'Letters' };

function templatesView() {
  const o = MX.templates.open;
  if (o === 'new') return mxCreatePage({ view: 'templates', back: 'Templates', title: 'Create New Template',
    placeholder: 'Describe the document you want a template for, or add one of your own', run: buildTemplate });
  /* #templates/<id> is the template itself; #templates/<id>/use is a document being made from it */
  const [id, sub] = (o || '').split('/');
  const t = id && mxTemplate(id);
  if (o && !t) MX.templates.open = null;
  return t ? templatePage(t, sub === 'use') : templateList();
}

function templateList() {
  const d = mxData();
  const t = mxTable({
    label: 'Templates', st: MX.templates.list, empty: 'No templates yet.',
    grid: 'minmax(190px, 2.2fr) minmax(84px, 1fr) minmax(96px, 1fr) minmax(60px, 1fr) minmax(48px, 1fr) minmax(132px, 1fr) minmax(112px, 1fr) 32px',
    cols: [{ key: 'name', label: 'Name' }, { key: 'kind', label: 'Type' }, { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version', num: true }, { key: 'used', label: 'Used', num: true },
      { key: 'owner', label: 'Owner' }, { key: 'updated', label: 'Last updated', desc: true, cls: 'pb-td-when' }],
    tabs: () => Object.entries(MX_TPL_TABS).filter(([k]) => d.templates.some(x => x.kind === k)).map(([k, label]) => ({ k, label })),
    tabOf: (x) => x.kind,
    items: () => d.templates,
    text: (x) => [x.name, x.kind, x.owner, x.description].join(' '),
    val: (x, k) => k === 'used' ? x.used : k === 'updated' ? x.updated : k === 'version' ? mxTplVer(x)
      : k === 'status' ? PB_ORDER[x.status] : (x[k] || '').toLowerCase(),
    cells: (x) => [[mxTile('tpl'), h('span', { class: 'pb-row-name' }, x.name || 'Untitled template')], x.kind, pbStatus(x.status), 'v' + mxTplVer(x),
      String(x.used), mxPerson(x.owner), pbWhen(x.updated)],
    open: (x) => mxOpen('templates', x.id),
    menu: (x, row) => [
      { label: 'Use Template', icon: 'fillin', run: () => mxOpen('templates', x.id + '/use') },
      { label: 'Open', icon: 'files', run: () => mxOpen('templates', x.id) },
      { label: 'Duplicate', icon: 'copy', run: () => {
        const c = structuredClone(x);
        Object.assign(c, { id: pbUid('tpl'), name: (x.name || 'Untitled template') + ' copy', status: 'draft', used: 0, version: 1, owner: USER.name, updated: mxNow() });
        d.templates.splice(d.templates.indexOf(x) + 1, 0, c); save(); MX.flash = c.id; t.paint();
      } },
      { rule: true },
      { label: 'Delete', icon: 'trash', danger: true, run: () => mxRemove(d.templates, x, row, 'template', (back) => back && t.paint()) },
    ],
  });
  return mxListPage('Templates', mxCta('New Template', (btn, keyboard) => pbWaysMenu(btn, 'mx-tpl-new', [
    { key: 'ai', name: 'Build with AI', desc: 'Describe the document, and Clavia drafts it with its blanks named.',
      icon: () => quillEl('static', { cls: 'pb-way-quill' }) },
    { key: 'upload', name: 'Upload Template', desc: 'Upload one of your own agreements, and its terms become the blanks.',
      icon: () => { const w = h('span', { html: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + APM_IC.upload + '</svg>' }); return w.firstChild; } },
    { key: 'blank', name: 'Start blank', desc: 'An empty page. Write it, and mark the blanks yourself.', icon: PB_WAYS[2].icon },
  ], (k) => {
    if (k === 'ai') return mxOpen('templates', 'new');
    if (k === 'upload') {
      /* a file from your computer: its name and kind are enough to start from, as with Build with AI */
      const pick = h('input', { type: 'file', accept: '.doc,.docx,.pdf,.rtf,.txt,.odt', style: 'display:none' });
      pick.onchange = () => {
        const f = pick.files?.[0]; pick.remove();
        if (!f) return;
        newTemplate(templateFrom(f.name, f.name), true);
        pbToast(`Made a template from “${f.name}”`);
      };
      document.body.append(pick); pick.click();
      return;
    }
    newTemplate({ name: '', kind: 'Agreement', description: '', fields: [], body: [{ h: '' }, { p: '' }] });
  }, { keyboard }), true), t.el);
}

function newTemplate(fields, flash) {
  const t = { id: pbUid('tpl'), status: 'draft', owner: USER.name, updated: mxNow(), used: 0, version: 1, ...fields };
  mxData().templates.unshift(t); save();
  if (flash) MX.flash = t.id;
  mxOpen('templates', t.id);
  return t;
}
/* Scripted for now: the nearest template we have, under the name you gave it. */
const MX_TPL_KINDS = [[/\bone[- ]way|unilateral/i, 'one-way-nda'], [/\b(nda|non-?disclosure|confidential)/i, 'mutual-nda'],
  [/\b(dpa|data processing|privacy)/i, 'dpa'], [/\border form\b/i, 'order-form'], [/\b(notice|non-?renewal|terminate)/i, 'non-renewal'],
  [/\breseller|channel|distribut/i, 'reseller'], [/./, 'msa-short']];
function templateFrom(text, name) {
  const seed = MX_SEED.templates.find(t => t.id === MX_TPL_KINDS.find(([re]) => re.test(text))[1]);
  const clean = name ? name.replace(/\.[a-z0-9]+$/i, '').replace(/\s*\((signed|their paper)\)/i, '') : draftName(text);
  return { name: clean || seed.name, kind: seed.kind, description: seed.description,
    fields: structuredClone(seed.fields), body: structuredClone(seed.body) };
}
function buildTemplate(text, files, step) {
  const from = text || files.join(' ');
  step(files.length ? `Reading ${files[0]}` : 'Working out what the document needs');
  setTimeout(() => step('Drafting it, and naming the blanks'), 1100);
  setTimeout(() => { MX.templates.open = null; newTemplate(templateFrom(from, text ? null : files[0]), true); }, 2300);
}

const mxFieldLabel = (t, key) => t.fields.find(f => f.key === key)?.label || key;

/* ── a sentence about the deal, read into a template's blanks ─────────
   Scripted for now: the kinds of thing people say when they ask for an
   NDA or an order form ("with Northwind Ltd of 14 Calder Street, Leeds,
   English law, three years, signed by Roger Bennett"). Only what the
   sentence really says is filled; the rest stays blank. */
const MX_NUM_W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, eighteen: 18, twenty: 20, 'twenty-four': 24, thirty: 30, 'thirty-six': 36 };
const MX_LAW = [[/\b(english|england(?: and wales)?|uk|british)\b/i, 'England and Wales'], [/\b(scottish|scots|scotland)\b/i, 'Scotland'],
  [/\bnew york\b/i, 'New York'], [/\bdelaware\b/i, 'Delaware'], [/\bcaliforni/i, 'California'], [/\b(irish|ireland)\b/i, 'Ireland'],
  [/\b(german|germany)\b/i, 'Germany'], [/\bsingapore\b/i, 'Singapore'], [/\b(dubai|uae|emirates)\b/i, 'the United Arab Emirates']];
function mxReadDeal(t, text) {
  const got = {}, has = (k) => t.fields.some(f => f.key === k);
  const put = (k, v) => { if (v && has(k)) got[k] = v.trim().replace(/[.,;]+$/, ''); };
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  /* who it is with: a name in capitals after "with", "for" or "and" */
  const who = /\b(?:with|for|between us and|counterparty(?: is)?:?)\s+((?:[A-Z][\w&'.-]*)(?:\s+(?:[A-Z][\w&'.-]*|&|of(?= [A-Z])|Ltd|Limited|Inc\.?|LLC|plc|GmbH|Corp\.?))*)/.exec(text);
  if (who) put('counterparty', who[1].replace(/\s+(?:of|on|in)$/, ''));
  /* where they are: an address after their name, "of" or "at" a street */
  const at = /\b(?:of|at|based at|address(?: is)?:?)\s+(\d+[\w\s]*?(?:Street|St|Road|Rd|Avenue|Ave|Lane|Way|Square|Place|Park|House)\b[^.;]*?)(?=,?\s+(?:under|governed|for|with|to|from|signed|starting|effective|on|and the|;|\.)|$)/i.exec(text);
  if (at) put('counterparty_address', at[1]);
  /* the law */
  const lawBit = /([\w\s]{0,30})\b(?:law|laws)\b|governed by ([^,.;]+)/i.exec(text);
  if (lawBit) { const m = MX_LAW.find(([re]) => re.test(lawBit[0])); if (m) put('governing_law', m[1]); }
  /* when it starts */
  const date = /\b(?:from|starting|effective(?: from| on)?|dated|on)\s+((?:\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?)|today|tomorrow)/i.exec(text);
  if (date) {
    const d = /today/i.test(date[1]) ? today : /tomorrow/i.test(date[1])
      ? new Date(Date.now() + 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : /\d{4}$/.test(date[1]) ? date[1] : `${date[1]} ${new Date().getFullYear()}`;
    for (const f of t.fields) if (/(^|_)date$/.test(f.key) && f.key !== 'end_date') put(f.key, d);
  }
  /* how long: years for a confidentiality period, months for a term */
  const len = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|twenty-four|thirty-six)[\s-]*(years?|months?)\b/i.exec(text);
  if (len) {
    const n = /^\d+$/.test(len[1]) ? +len[1] : MX_NUM_W[len[1].toLowerCase()], unit = len[2].toLowerCase().replace(/s$/, '');
    const words = (k) => `${Object.keys(MX_NUM_W).find(w => MX_NUM_W[w] === k) || k} ${unit}${k === 1 ? '' : 's'}`;
    put('term_years', words(n));
    for (const k of ['initial_term', 'term']) put(k, `${unit === 'year' ? n * 12 : n} months`);
  }
  /* what for */
  const why = /\b(?:to|for|so (?:we|they) can)\s+((?:evaluat|explor|discuss|assess|review|consider|test|pilot)\w*\b[^,.;]*)/i.exec(text);
  if (why) put('purpose', why[1].replace(/^evaluate\b/i, 'evaluating').replace(/^explore\b/i, 'exploring').replace(/^discuss\b/i, 'discussing').replace(/^assess\b/i, 'assessing'));
  /* who signs for us */
  const sig = /\bsign(?:ed|s|atory(?: is)?)?(?: by)?:?\s+([A-Z][a-z]+ [A-Z][a-z]+(?:,\s*[A-Z][\w ]+?)?)(?=[.;]|$|,\s*(?:under|governed|for|with))/.exec(text);
  if (sig) put('signatory', sig[1]);
  /* the commercial numbers */
  const seats = /\b(\d[\d,]*)\s*(?:seats|users|licen[cs]es)\b/i.exec(text); if (seats) put('seats', seats[1]);
  const pay = /\b(?:net\s*(\d+)|(\d+)\s*days?\s*(?:to pay|payment|from invoice))/i.exec(text); if (pay) put('payment_days', pay[1] || pay[2]);
  const cap = /\bcap(?:ped)?(?: at| of)?\s*(\d+|twelve|six|eighteen|twenty-four)\s*months?/i.exec(text); if (cap) put('cap_months', String(/^\d+$/.test(cap[1]) ? cap[1] : MX_NUM_W[cap[1].toLowerCase()]));
  const fee = /([£$€]\s?[\d,]+(?:\.\d+)?(?:\s?(?:k|m))?)/i.exec(text); if (fee) put('annual_fee', fee[1].replace(/\s/g, ''));
  const disc = /\b(\d+)\s*%\s*(?:discount|off)?/i.exec(text); if (disc && has('discount')) put('discount', disc[1] + '%');
  return got;
}

/* Two pages from one: the template itself, where its wording and its blanks
   are written and kept (use = false), and a document being made from it,
   where the blanks are filled by hand, from a document, or from a sentence
   about the deal (use = true). Only the second has values. */
function templatePage(t, use = false) {
  const vals = use ? (MX.templates.values[t.id] ||= {}) : {};
  const filled = () => t.fields.filter(f => vals[f.key]?.trim()).length;
  const prog = h('span', { class: 'mx-fill-n' });
  const paintProg = () => { prog.textContent = !t.fields.length ? '' : use ? `${filled()} of ${t.fields.length} filled` : mxPlural(t.fields.length, 'field'); };

  /* ── the document: every blank a chip that fills as its field is typed ── */
  const chip = (key) => h('span', { class: 'mx-chip', 'data-key': key, contenteditable: 'false', tabindex: '-1' });
  const paintChips = (only, flash) => {
    for (const el of sheet.querySelectorAll('.mx-chip')) {
      const k = el.dataset.key;
      if (only && k !== only) continue;
      const val = vals[k]?.trim();
      el.textContent = val || mxFieldLabel(t, k);
      el.classList.toggle('is-set', !!val);
      if (flash && val) { el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit'); }
    }
  };
  const fill = (el, text) => {
    el.replaceChildren(...text.split(/(\{\{[a-z0-9_]+\}\})/i).filter(Boolean).map(part => {
      const m = /^\{\{([a-z0-9_]+)\}\}$/i.exec(part);
      return m ? chip(m[1]) : part;
    }));
  };
  /* reading a paragraph back off the page: its words, and its blanks by name */
  const read = (el) => [...el.childNodes].map(n => n.nodeType === 3 ? n.data
    : n.classList?.contains('mx-chip') ? `{{${n.dataset.key}}}` : n.textContent).join('');
  let last = null;       // where the caret last was, for a new blank
  const block = (b) => {
    const isH = b.h !== undefined;
    if (use) { const el = h(isH ? 'h2' : 'p', { class: isH ? 'mx-doc-h' : 'mx-doc-p' }); fill(el, isH ? b.h : b.p); return el; }
    const el = h(isH ? 'h2' : 'p', { class: isH ? 'mx-doc-h' : 'mx-doc-p', contenteditable: 'plaintext-only', spellcheck: 'false',
      'data-ph': isH ? 'Heading' : 'Write here',
      oninput: () => { b[isH ? 'h' : 'p'] = read(el); t.updated = mxNow(); save(); },
      onkeydown: (e) => {
        if (e.key !== 'Enter') return;
        /* Enter starts the next paragraph rather than breaking this one */
        e.preventDefault();
        const nb = { p: '' };
        t.body.splice(t.body.indexOf(b) + 1, 0, nb); save();
        const ne = block(nb); el.after(ne); ne.focus();
      },
      onblur: () => { const s = getSelection(); if (s.rangeCount && el.contains(s.anchorNode)) last = s.getRangeAt(0).cloneRange(); } });
    fill(el, isH ? b.h : b.p);
    el.addEventListener('keyup', () => { const s = getSelection(); if (s.rangeCount) last = s.getRangeAt(0).cloneRange(); });
    el.addEventListener('mouseup', () => { const s = getSelection(); if (s.rangeCount) last = s.getRangeAt(0).cloneRange(); });
    el.__b = b;
    return el;
  };
  /* a long name takes a second line rather than being cut off */
  const title = h('textarea', { class: 'mx-doc-title', rows: '1', placeholder: 'Untitled template', 'aria-label': 'Template name',
    oninput: (e) => { t.name = e.target.value.replace(/\n/g, ' '); t.updated = mxNow(); save(); },
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); docBody.firstElementChild?.focus(); } } });
  title.value = t.name;
  const docBody = h('div', { class: 'mx-doc-body' }, ...t.body.filter(b => !use || (b.h ?? b.p).trim()).map(block));
  const sheet = h('article', { class: 'mx-doc' + (use ? ' is-use' : '') },
    use ? h('h1', { class: 'mx-doc-title' }, t.name || 'Untitled template') : title, docBody);
  /* a blank in the document and its field find each other */
  sheet.addEventListener('click', (e) => {
    const c = e.target.closest('.mx-chip');
    if (c) fieldsEl.querySelector(`input[data-key="${c.dataset.key}"]`)?.focus();
  });
  const lit = (key, on) => {
    for (const el of sheet.querySelectorAll('.mx-chip')) el.classList.toggle('is-lit', on && el.dataset.key === key);
  };

  /* ── the fields ── */
  const focusChip = (key) => {
    lit(key, true);
    const first = sheet.querySelector(`.mx-chip[data-key="${key}"]`);
    if (first) { const r = first.getBoundingClientRect(), box = docScroll.getBoundingClientRect();
      if (r.top < box.top + 40 || r.bottom > box.bottom - 40) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  };
  const fieldRow = (f) => {
    if (use) {
      /* filling: the field's name, and its value */
      const input = h('input', { class: 'mx-f-in', 'data-key': f.key, value: vals[f.key] || '', placeholder: f.hint ? 'e.g. ' + f.hint : '',
        'aria-label': f.label,
        oninput: (e) => { vals[f.key] = e.target.value; paintChips(f.key, true); paintProg(); },
        onfocus: () => focusChip(f.key), onblur: () => lit(f.key, false) });
      return h('label', { class: 'mx-f' }, h('div', { class: 'mx-f-top' }, h('span', { class: 'mx-f-l' }, f.label || 'Untitled field')), input);
    }
    /* keeping the template: the field's name, and an example of what goes in it */
    const hint = h('input', { class: 'mx-f-in mx-f-hint', 'data-key': f.key, value: f.hint || '', placeholder: 'An example value',
      'aria-label': `Example for ${f.label}`,
      oninput: (e) => { f.hint = e.target.value; t.updated = mxNow(); save(); },
      onfocus: () => focusChip(f.key), onblur: () => lit(f.key, false) });
    const name = h('input', { class: 'mx-f-l', value: f.label, 'aria-label': 'Field name', placeholder: 'Field name',
      oninput: (e) => { f.label = e.target.value; save(); paintChips(f.key); },
      onfocus: () => focusChip(f.key), onblur: () => lit(f.key, false) });
    return h('div', { class: 'mx-f is-keep' },
      h('div', { class: 'mx-f-top' }, name,
        h('button', { class: 'pbv-icon mx-f-del', type: 'button', 'aria-label': 'Delete field', 'data-tip': 'Delete Field', html: PBV_TRASH,
          onclick: () => {
            t.fields.splice(t.fields.indexOf(f), 1);
            /* its blanks go back to being plain words */
            for (const el of [...sheet.querySelectorAll(`.mx-chip[data-key="${f.key}"]`)]) {
              const host = el.closest('[contenteditable]'); el.replaceWith(f.label); host.__b[host.tagName === 'H2' ? 'h' : 'p'] = read(host);
            }
            save(); paintFields(); paintProg();
          } })),
      h('label', { class: 'mx-f-eg' }, h('span', {}, 'e.g.'), hint));
  };
  const fieldsEl = h('div', { class: 'mx-fs' });
  const paintFields = () => fieldsEl.replaceChildren(...t.fields.map(fieldRow));
  /* a new blank goes where the caret last was in the document */
  const addField = () => {
    let n = t.fields.length + 1, key;
    do { key = 'field_' + n++; } while (t.fields.some(f => f.key === key));
    const f = { key, label: 'New field', hint: '' };
    t.fields.push(f);
    const c = chip(key);
    const host = last && sheet.contains(last.startContainer) ? last.startContainer.parentElement.closest('[contenteditable]') || last.startContainer : null;
    if (host && last) { last.collapse(false); last.insertNode(c); }
    else { const p = docBody.querySelector('.mx-doc-p:last-of-type') || docBody.lastElementChild; p.append(' ', c); }
    const el = c.closest('[contenteditable]'); el.__b[el.tagName === 'H2' ? 'h' : 'p'] = read(el);
    save(); paintFields(); paintChips(); paintProg();
    const name = fieldsEl.querySelector('.mx-f:last-child .mx-f-l'); name.focus(); name.select();
  };

  /* values arrive one after another, so you can see where each one went */
  const putVals = (got) => {
    let n = 0;
    for (const fd of t.fields) {
      const val = got[fd.key];
      if (!val) continue;
      setTimeout(() => {
        vals[fd.key] = val;
        const input = fieldsEl.querySelector(`input.mx-f-in[data-key="${fd.key}"]`);
        if (input) { input.value = val; input.classList.remove('is-hit'); void input.offsetWidth; input.classList.add('is-hit'); }
        paintChips(fd.key, true); paintProg();
      }, 260 + (n++) * 240);
    }
    return n;
  };

  /* ── fill it from a document that already has the answers ── */
  const fillFrom = () => mxPick({ title: 'Fill from a document', sub: 'Clavia reads it and fills what it can', one: true, action: 'Fill',
    groups: mxData().vaults.map(v => ({ label: v.name, items: v.files.filter(f => f.facts).map(f => ({ id: v.id + '|' + f.id, label: f.name, sub: f.size })) })),
    onDone: ([id]) => {
      const [vid, fid] = id.split('|'); const f = mxVault(vid).files.find(x => x.id === fid);
      const F = f.facts;
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      /* only what the document really states for that blank: a wrong guess
         in a contract is worse than a blank */
      const READ = [
        [/^(counterparty|customer|supplier|recipient|reseller)$/, () => F.Counterparty],
        [/^governing_law$/, () => F['Governing law']],
        [/^(initial_term|term)$/, () => /^\d+ months$/.test(F.Term || '') ? F.Term : null],
        [/^cap_months$/, () => (/^(\d+) months/.exec(F['Liability cap'] || '') || [])[1]],
        [/^payment_days$/, () => (/(\d+)/.exec(F.Payment || '') || [])[1]],
        [/^seats$/, () => F.Seats],
        [/(^|_)date$/, () => today],
      ];
      const got = {};
      for (const fd of t.fields) { const val = READ.find(([re]) => re.test(fd.key))?.[1]() || null; if (val) got[fd.key] = val; }
      const n = putVals(got);
      pbToast(n ? `Filled ${mxPlural(n, 'field')} from “${f.name}”` : `Nothing in “${f.name}” matched these fields`);
    } });

  /* ── fill it from a sentence about the deal ── */
  function fillAsk() {
    const ta = h('textarea', { class: 'mx-fa-in', rows: '2', placeholder: 'Describe the deal, or attach a document',
      'aria-label': 'Describe the deal',
      oninput: () => { send.disabled = !ta.value.trim(); },
      onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go1(); } } });
    const go1 = () => {
      const text = ta.value.trim();
      if (!text) return;
      const n = putVals(mxReadDeal(t, text));
      if (n) { ta.value = ''; send.disabled = true; }
      else { box.classList.remove('is-miss'); void box.offsetWidth; box.classList.add('is-miss'); }
    };
    const clip = h('button', { class: 'mx-fa-clip', type: 'button', onclick: fillFrom, 'aria-label': 'Attach a document',
      'data-tip': 'Fill from a document in your Vault', html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m20.5 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/></svg>' });
    const send = h('button', { class: 'mx-fa-send', type: 'button', onclick: go1, disabled: true, 'aria-label': 'Fill', 'data-tip': 'Fill',
      html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>' });
    const box = h('div', { class: 'mx-fa' }, ta, h('div', { class: 'mx-fa-row' }, clip, h('span', { class: 'pb-grow' }), send));
    return box;
  }

  /* ── the draft: the template with what you filled in, as a document in a chat ── */
  const draft = () => {
    const txt = (s) => s.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, k) => vals[k]?.trim() || `[${mxFieldLabel(t, k)}]`);
    const blocks = [{ t: 'h1', v: t.name || 'Untitled' },
      ...t.body.filter(b => (b.h ?? b.p).trim()).map(b => b.h !== undefined ? { t: 'h2', v: txt(b.h) } : { t: 'p', v: txt(b.p) })];
    const who = vals.counterparty?.trim();
    const id = pbUid('draft'), n = filled(), left = t.fields.filter(f => !vals[f.key]?.trim());
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const a = defineArtifact({ id, kind: 'doc', name: `${t.name || 'Draft'}${who ? ' — ' + who : ''}`, ext: 'docx',
      sub: 'From template', versions: [{ name: 'First draft', when: 'Today · ' + now, by: 'Assistant', blocks }] });
    t.used++; t.updated = mxNow(); save();
    /* the request it was made for hears about it */
    const req = from && typeof mxIntake === 'function' && mxIntake().find(x => x.id === from.id);
    if (req) {
      /* a draft made for a request becomes that request's next version, and you go back to it */
      const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const prev = mxDocuments(req).find(d => d.source === t.id);
      const v = { name: prev ? 'Revised draft' : 'First draft', by: USER.name, when: mxNow(),
        file: `${who || req.counterparty || 'Draft'} — ${t.name}.docx`, blocks: blocks.map(b => ({ ...b, v: esc(b.v) })) };
      const d = mxAddVersion(req, v, prev?.id);
      d.source = t.id;
      mxLog(req, { ev: 'version', what: `drafted v${d.versions.length} from ${t.name}`, ref: { doc: d.id, v: d.versions.length } });
      MX.intake.focus = { doc: d.id, v: d.versions.length };
      if (mxStage(req) === 0) { mxSetStage(req, 1); mxLog(req, { ev: 'status', what: `moved this to ${mxStages(req)[1]}` }); }
      save();
      MX.templates.open = null; MX.templates.from = null;
      mxOpen('intake', req.id);
      pbToast(`v${d.versions.length} is on ${req.id}`);
      return;
    }
    openSession({ id: 'tpl-ses-' + id, artifact: a.id, label: a.name, meta: 'now',
      people: [{ name: USER.name, online: true, owner: true }],
      messages: [
        { role: 'user', text: `Draft ${/^[aeiou]/i.test(t.name) ? 'an' : 'a'} ${t.name}${who ? ' for ' + who : ''}.` },
        { role: 'bot', cites: null,
          steps: [{ source: 'template', query: 'Filled the ' + (t.name || 'template'), count: `${n} of ${t.fields.length} fields` }],
          answer: `Here is the draft, from the ${t.name} template with ${n} of ${t.fields.length} fields filled.`
            + (left.length ? `\n\nStill to fill: ${left.map(f => f.label).join(', ')}. They are in square brackets in the draft.` : '\n\nNothing is left blank.')
            + '\n\nTell me what to change and I will make it a new version.',
          artifact: a.id,
          suggest: [who ? `Check this against our playbook before it goes to ${who}` : 'Check this against our playbook',
            left.length ? `What should ${left[0].label} be?` : 'Read it through for anything that looks unusual',
            'Write a short cover note to send with it'] },
      ] });
    queueMicrotask(() => openArtifact(a));
  };

  /* ── Open in Word: the template as it stands, filled where it is filled, as a file Word opens ── */
  const toWord = () => {
    const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const txt = (x) => esc(x).replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, k) => esc(vals[k]?.trim() || `[${mxFieldLabel(t, k)}]`));
    const body = t.body.filter(b => (b.h ?? b.p).trim()).map(b => b.h !== undefined ? `<h2>${txt(b.h)}</h2>` : `<p>${txt(b.p)}</p>`).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">`
      + `<title>${esc(t.name || 'Untitled template')}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5}`
      + `h1{font-size:20pt;font-weight:normal;margin:0 0 18pt}h2{font-size:12pt;margin:18pt 0 6pt}p{margin:0 0 10pt}</style></head>`
      + `<body><h1>${esc(t.name || 'Untitled template')}</h1>${body}</body></html>`;
    const a = h('a', { href: URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/msword' })),
      download: `${(t.name || 'Untitled template').replace(/[\\/:*?"<>|]+/g, ' ').trim()}.doc` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    pbToast(`“${t.name || 'Untitled template'}” is downloading for Word`);
  };

  const docScroll = h('div', { class: 'mx-tpl-doc' }, sheet);
  /* a draft started from a request goes back to that request */
  const from = use && MX.templates.from?.tpl === t.id ? MX.templates.from : null;
  const back = use
    ? h('button', { class: 'mx-back', type: 'button', onclick: () => from ? (MX.templates.open = null, mxOpen('intake', from.id)) : mxOpen('templates', t.id) },
        h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), from ? from.id : t.name || 'Untitled template')
    : h('button', { class: 'mx-back', type: 'button', onclick: () => { mxClose('templates'); go('templates'); } },
        h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), 'Templates');
  const word = h('button', { class: 'btn mx-word', type: 'button', onclick: toWord },
    h('img', { src: 'assets/brand/word.svg', alt: '', 'aria-hidden': 'true' }), 'Open in Word');
  const page = h('div', { class: 'mx-tpl' + (use ? ' is-use' : '') },
    h('aside', { class: 'mx-tpl-side' }, back,
      use ? fillAsk() : null,
      h('div', { class: 'mx-tpl-side-head' },
        h('span', { class: 'mx-tpl-side-t' }, h('span', { class: 'pbv-cap' }, use ? 'Fill in' : 'Fields'), prog)),
      fieldsEl,
      use ? null : h('div', { class: 'mx-tpl-links' },
        h('button', { class: 'pbv-add-fb', type: 'button', onclick: addField }, 'Add Field'))),
    h('div', { class: 'mx-tpl-main' },
      h('div', { class: 'mx-tpl-bar' },
        use
          ? h('span', { class: 'mx-tpl-kind' }, h('span', { class: 'mx-tpl-new' }, `New ${t.name || 'document'}`),
              h('span', { class: 'mx-dot' }, 'from the template'))
          : h('span', { class: 'mx-tpl-kind' }, pbStatus(t.status), h('span', { class: 'mx-dot' }, t.kind),
              h('span', { class: 'mx-dot' }, 'v' + mxTplVer(t)),
              h('span', { class: 'mx-dot' }, `Used ${mxPlural(t.used, 'time')}`)),
        h('span', { class: 'pb-grow' }),
        !use && t.status === 'draft' ? h('button', { class: 'btn', type: 'button',
          onclick: () => { t.status = 'live'; t.updated = mxNow(); save(); go('templates'); pbToast(`“${t.name || 'Untitled template'}” is published`); } }, 'Publish') : null,
        word,
        use
          ? h('button', { class: 'btn btn--primary', type: 'button', onclick: draft }, 'Create Draft')
          : h('button', { class: 'btn btn--primary', type: 'button', onclick: () => mxOpen('templates', t.id + '/use') }, 'Use Template')),
      docScroll));
  paintFields(); paintChips(); paintProg();
  if (!t.name && !use) setTimeout(() => title.focus({ preventScroll: true }), 80);
  return page;
}

/* what the trace says it read, for the steps these modules add */
SOURCES.template = { label: 'the template', verb: 'Used',
  icon: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 8h7M8.5 12h3.5M14 12h1.5M8.5 16h2M12.5 16h3"/>' };
SOURCES.request = { label: 'the request', verb: 'Read',
  icon: '<path d="M4 13.5 6 5h12l2 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>' };
SOURCES.project = { label: 'the project', verb: 'Read',
  icon: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>' };
