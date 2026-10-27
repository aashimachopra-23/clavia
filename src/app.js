/* ------------------------------------------------------------------
   Clavia workspace shell.

   Add a capability with register(). It gets a rail item, a route
   (#id) and the whole view area. Nav data lives in NAV / AGENTS /
   HISTORY below.
------------------------------------------------------------------ */

/* ---------------- tiny dom helper ---------------- */

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** <svg class="…"><use href="#i-name"></use></svg> */
function icon(name, cls = 'ico') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

/* ---------------- state ---------------- */

const KEY = 'clavia:state';
const state = (() => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
})();
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
};

const USER = {
  name: 'Roger Bennett',
  email: 'roger.bennett@unifyapps.com',
  greeting: 'Roger',
};

/* ---------------- nav data ---------------- */

/* Skills is off for now (15 Oct): out of the rail, and #skills goes home. Set true to bring it back. */
const SHOW_SKILLS = false;
const NAV = [
  { id: 'home',      label: 'New Chat', icon: 'plus', primary: true },
  { id: 'playbooks', label: 'Playbooks',   icon: 'playbooks' },
  { id: 'templates', label: 'Templates',   icon: 'templates' },
  { id: 'intake',    label: typeof INTAKE_NAME !== 'undefined' ? INTAKE_NAME : 'Requests',    icon: 'intake' },     // what the business asks legal for; to be defined
  { id: 'agents',    label: 'Agents',      icon: 'agents' },     // to be defined (15 Oct): the nav item and an empty page for now
  { id: 'vault',     label: 'Vault',       icon: 'vault' },
  ...(SHOW_SKILLS ? [{ id: 'skills',    label: 'Skills',      icon: 'skills' }] : []),      // how we do a piece of work, written down once (skills.js); off for now
  { id: 'requests',  label: 'Contracts',   icon: 'requests' },   // the module once called Requests; ids and routes keep the old name
  /* hidden for now (16 Oct); the view and #horizon still work */
  // { id: 'horizon',   label: 'Horizon',     icon: 'routines' },   // legal's standing watch on the law (horizon.js)
  { id: 'projects',  label: 'Projects',    icon: 'projects' },
];

const AGENTS = [
  { id: 'agent-financial', label: 'Financial Analysis Agent', tint: 'purple' },
  { id: 'agent-sheet',     label: 'Sheet Sage Agent',         tint: 'blue' },
  { id: 'agent-formula',   label: 'Formula Falcon Agent',     tint: 'orange' },
];


/* ── sessions that already happened ───────────────────────────
   Four finished conversations, one per artifact kind, so the app can
   be read without waiting for a run. They render complete: steps
   already seen, trace folded, artifact attached. */
const SESSIONS = [
  /* The finished version of the live demo, and it is about the thing it
     produces: the quarter, the gap, and the six deals carrying it. A
     conversation that ends in a pipeline dashboard should have been about
     the pipeline the whole way down. */
  /* The same draft, rendered where it was written. One artifact object
     behind both sessions, so a change made here is a change there. */
  {
    id: 'ses-mail-inline', label: 'AI round-up, written in the thread', meta: '4m',
    artifact: null,
    messages: [
      { role: 'user', text: 'Write an email to my team on what has actually moved in AI '
            + 'over the last couple of weeks.' },
      { role: 'bot',
        artifact: null, inline: 'mail-ai-roundup',
        answer: 'Here is a version you can send. Edit it in place — recipients, subject, any '
              + 'line of it — and press Send when you are happy.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what the team has flagged in the last fortnight', rows: [
            { source: 'slack', title: '#ai-watch — long context benchmarks', meta: '6 days ago' },
            { source: 'slack', title: '#ai-watch — new pricing, mid-tier', meta: 'Last week' },
            { source: 'drive', title: 'Model evaluation — Q3.gsheet', meta: 'Platform' },
          ] },
          { source: 'web', query: 'model releases and pricing changes, last 30 days', rows: [
            { title: 'Frontier releases and the million-token window', meta: 'research roundup' },
            { title: 'Mid-tier inference pricing, six-month trend', meta: 'pricing tracker' },
          ] },
          { source: 'think', query: 'Capability is commoditising; context and evaluation are not.' },
          { source: 'outlook', query: 'Drafted the update', count: 'not sent' },
        ] },
    ],
  },

  /* The email demo, already run, so it can be shown without waiting for
     it — the live one from New Chat produces exactly this. */
  {
    id: 'ses-mail', label: 'What moved in AI this fortnight', meta: '6m',
    artifact: 'mail-ai-roundup',
    messages: [
      { role: 'user', text: 'Draft an email to the team on what has actually moved in AI '
            + 'over the last two weeks.' },
      { role: 'bot',
        answer: 'Drafted. Four things actually changed; the rest was noise.[1]\n\n'
              + '- **Long context stopped being a headline** — a million tokens is table '
              + 'stakes, and the interesting number is how much of the window a model uses '
              + 'well.\n'
              + '- **Inference prices fell about 40% on the mid-tier** since spring, which '
              + 'makes several things we ruled out on cost worth costing again.[2]\n'
              + '- **Open weights closed most of the gap** on classification, extraction and '
              + 'routing — not on the hardest reasoning.\n'
              + '- **Small models got genuinely good at routing**, which is what makes a '
              + 'routing layer worth building properly rather than a way to save money '
              + 'badly.\n\n'
              + 'Two judgement calls in the draft worth your eye. I have written that '
              + '**capability is commoditising and context and evaluation are not**, which '
              + 'is a claim rather than an observation. And I have ended on this being '
              + 'confirmation of the plan rather than a change to it, which is only true if '
              + 'you agree.\n\n'
              + 'To is Pavitar and Sumeet, Shivam on Cc. Nothing has been sent.',
        cites: [
          { source: 'slack', label: 'Team', title: '#ai-watch — long context benchmarks · 6 days ago' },
          { source: 'web',   label: 'Pricing', title: 'Mid-tier inference pricing, six-month trend' },
        ],
        steps: [
          { source: 'internal', query: 'what the team has flagged in the last fortnight', rows: [
            { source: 'slack', title: '#ai-watch — long context benchmarks', meta: '6 days ago' },
            { source: 'slack', title: '#ai-watch — new pricing, mid-tier', meta: 'Last week' },
            { source: 'drive', title: 'Model evaluation — Q3.gsheet', meta: 'Platform' },
          ] },
          { source: 'web', query: 'model releases and pricing changes, last 30 days', rows: [
            { title: 'Frontier releases and the million-token window', meta: 'research roundup' },
            { title: 'Mid-tier inference pricing, six-month trend', meta: 'pricing tracker' },
            { title: 'Open-weight models on extraction and routing', meta: 'benchmark' },
            { title: 'Small models as routers', meta: 'paper' },
          ] },
          { source: 'read',  query: 'Mid-tier inference pricing, six-month trend', count: 'pricing tracker', link: true },
          { source: 'think', query: 'Capability is commoditising; context and evaluation are not.' },
          { source: 'skill', query: 'Team update — what moved, what it means for us', count: 'applied' },
          { source: 'outlook', query: 'Drafted the update', count: 'not sent' },
        ] },
    ],
  },


  /* The month runs out mid-chat. Nothing about the conversation is
     wrong — there is simply no room left to continue it, which is a
     different state from a chat that has cost too much. */
  {
    id: 'ses-capped', label: 'Redwood \u2014 who owns it now', meta: '5m',
    artifact: 'sheet-churn',
    usage: { spent: 250, limit: 250, resets: 12, on: '1 October' },
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: 'Who replaced Priya Raman at Redwood?' },
      { role: 'bot',
        artifact: null,
        answer: 'Nobody on our records. The ops lead contact has been vacant since 11 '
              + 'July and no one new has been added on either side.\n\nTheir last touch '
              + 'with us was in June, which is the same month the usage starts falling.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Redwood contacts and when they last spoke to us', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'outlook', title: 'Redwood — last touch', meta: 'June' },
            { source: 'slack', title: '#cs-iron-mountain', meta: 'Quiet' },
          ] },
          { source: 'web', query: 'the Redwood contacts and when they last spoke to us', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'outlook', title: 'Redwood — last touch', meta: 'June' },
            { source: 'slack', title: '#cs-iron-mountain', meta: 'Quiet' },
          ] },
          { source: 'think', query: 'Looked for a replacement and did not find one.' },
        ] },

      { role: 'user', text: 'Who else at Redwood has ever logged in?' },
      { role: 'bot',
        artifact: null,
        answer: 'Fourteen people, and eleven of them are in Operations — the team that '
              + 'stopped. Of the three outside it, two are in finance and one is a '
              + 'security reviewer from the original rollout.\n\nSo there is no obvious '
              + 'second champion. Whoever picks this up is starting from the reviewer '
              + 'or from finance.',
        cites: null,
        steps: [
          { source: 'internal', query: 'who at Redwood has used it, and in what team', rows: [
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: '$620k · January' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
            { source: 'outlook', title: 'Out of office — Priya Raman', meta: '11 July' },
            { source: 'drive', title: 'Weekly active by team — Redwood', meta: 'Analytics' },
          ] },
          { source: 'web', query: 'who at Redwood has used it, and in what team', rows: [
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: '$620k · January' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
            { source: 'outlook', title: 'Out of office — Priya Raman', meta: '11 July' },
            { source: 'drive', title: 'Weekly active by team — Redwood', meta: 'Analytics' },
          ] },
          { source: 'think', query: 'Sorted the users by team to find a way back in.' },
        ] },
    ],
  },

  /* A short chat. Three questions, no artifact built — the ordinary shape,
     and the price the dial calls blue. */
  {
    id: 'ses-blue', label: 'Where the Brightpath sign-off is stuck', meta: '20m',
    artifact: 'doc-renewal-brief',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: 'Where has the Brightpath security sign-off got to?' },
      { role: 'bot',
        artifact: null,
        answer: 'It is sitting with us. Callum Reid sent their questionnaire on 22 '
              + 'August, it went to legal@ on the 23rd, and it has not moved since — '
              + 'eleven days, no owner on it.\n\nTheir side has chased twice, on the 29th '
              + 'and again on Tuesday.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Brightpath questionnaire and where it went', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: 'Callum Reid · 22 Aug' },
            { source: 'gmail', title: 'You → legal@ — please review', meta: '23 Aug' },
          ] },
          { source: 'web', query: 'the Brightpath questionnaire and where it went', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: 'Callum Reid · 22 Aug' },
            { source: 'gmail', title: 'You → legal@ — please review', meta: '23 Aug' },
          ] },
          { source: 'think', query: 'Traced eleven days to a mail with nobody on it.' },
        ] },

      { role: 'user', text: 'How much of it can we answer from the standard pack?' },
      { role: 'bot',
        artifact: null,
        answer: 'Nine of the fourteen, word for word. The other five are all about the '
              + 'Context Graph\'s retention window, and the architecture note covers '
              + 'every one of them.\n\nNothing in here needs a decision. It needs '
              + 'somebody to send it.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what the fourteen questions ask, and what we already answer', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Brightpath', meta: 'Legal · March' },
          ] },
          { source: 'web', query: 'what the fourteen questions ask, and what we already answer', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Brightpath', meta: 'Legal · March' },
          ] },
          { source: 'think', query: 'Matched nine to the pack and five to the note.' },
        ] },

      { role: 'user', text: 'What is it holding up?' },
      { role: 'bot',
        artifact: null,
        answer: 'Phase two of their rollout, which has been paused since the day the '
              + 'questionnaire went out. Their renewal is in February at $410k.\n\nEleven '
              + 'days of that pause were ours.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what the pause is blocking, and what the account is worth', rows: [
            { source: 'salesforce', title: 'Brightpath — renewal FY27', meta: '$410k · February' },
            { source: 'gmail', title: 'Re: any update on this?', meta: 'Callum Reid · Tuesday' },
          ] },
          { source: 'web', query: 'what the pause is blocking, and what the account is worth', rows: [
            { source: 'salesforce', title: 'Brightpath — renewal FY27', meta: '$410k · February' },
            { source: 'gmail', title: 'Re: any update on this?', meta: 'Callum Reid · Tuesday' },
          ] },
          { source: 'think', query: 'Tied the pause to the renewal it sits in front of.' },
        ] },
    ],
  },


  /* Four turns and a drafted page. Heavier: more retrieval, and something
     made at the end of it. */
  {
    id: 'ses-amber', label: 'Vantage — the residency answer', meta: '45m',
    artifact: 'doc-renewal-brief',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: 'What exactly did Vantage ask on the QBR?' },
      { role: 'bot',
        artifact: null,
        answer: 'Two questions, both from Meera Nair, both about where things '
              + 'physically are.\n\nFirst, which region the Context Graph is built in for '
              + 'an EU tenant. Second, what our model providers actually receive — she '
              + 'was specific that “nothing identifiable” was the answer she needed.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Vantage QBR and what was asked on it', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
          ] },
          { source: 'web', query: 'the Vantage QBR and what was asked on it', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
          ] },
          { source: 'think', query: 'Pulled the two questions out of the transcript.' },
        ] },

      { role: 'user', text: 'What is the honest answer on the second one?' },
      { role: 'bot',
        artifact: null,
        answer: 'Three providers see traffic. Two receive text spans with identifiers '
              + 'already stripped; the third receives embeddings only and never sees '
              + 'text at all.\n\nSo the honest answer is “no”, but it is a “no” with a '
              + 'mechanism behind it, and the mechanism is the part she will want in '
              + 'writing.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what each model provider receives, and what the DPA says', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Vantage', meta: 'Legal · 2024' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
          ] },
          { source: 'web', query: 'what each model provider receives, and what the DPA says', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Vantage', meta: 'Legal · 2024' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
          ] },
          { source: 'think', query: 'Checked each provider against the signed DPA.' },
        ] },

      { role: 'user', text: 'Draft the answer to both.' },
      { role: 'bot',
        artifact: 'doc-renewal-brief',
        answer: 'Drafted. It runs to a page: region first, then the three providers '
              + 'with what each one receives, then the retention window with the reason '
              + 'it is thirty days.\n\nThe language is lifted from the architecture note '
              + 'rather than written fresh, so it should not need a second legal read.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what we already say about residency and providers', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Vantage', meta: 'Legal · 2024' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
          ] },
          { source: 'web', query: 'what we already say about residency and providers', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Vantage', meta: 'Legal · 2024' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
          ] },
          { source: 'think', query: 'Wrote it out of the note rather than from scratch.' },
        ] },

      { role: 'user', text: 'When did I say I would come back to her?' },
      { role: 'bot',
        artifact: null,
        answer: 'Within the week, on the call itself. That was the 28th, so it is nine '
              + 'days late.\n\nTheir renewal review is in February. Anything still open '
              + 'now becomes a condition then.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what was promised on the call and when', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
          ] },
          { source: 'web', query: 'what was promised on the call and when', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
          ] },
          { source: 'think', query: 'Found the promise and the date on it.' },
        ] },
    ],
  },

  /* A long chat, on purpose. Renewal season is the kind of question that
     turns into eight of them, and by the eighth the thread behind each
     one is doing most of the spending — which is what the session notice
     is there to say. */
  {
    id: 'ses-red', label: 'Renewal season \u2014 what is at risk', meta: '2h',
    artifact: 'sheet-churn',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [
      { role: 'user', text: 'Renewal season starts next month. What is actually at risk?' },
      { role: 'bot',
        artifact: null,
        answer: 'Eleven accounts renew before March. Four of them I would not call '
              + 'safe.\n\n- **Brightpath** — the rollout has been paused since 22 August '
              + 'waiting on a security sign-off nobody has chased.\n- **Vantage** — their '
              + 'head of IT asked a data residency question on the QBR and it is still '
              + 'unanswered.\n- **Fieldstone** — no reply on the working thread in '
              + 'twelve days, and they renew on 30 November.\n- **Redwood** — usage '
              + 'is down 40% quarter on quarter and nobody has asked why.\n\nThe other '
              + 'seven are healthy on both usage and engagement. These four are the list.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the accounts renewing before March, with health and engagement', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'gmail', title: 'Re: rollout paused pending security', meta: 'Callum Reid · 22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'slack', title: '#cs-renewals — the November list', meta: 'Last week' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
          ] },
          { source: 'web', query: 'the accounts renewing before March, with health and engagement', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'gmail', title: 'Re: rollout paused pending security', meta: 'Callum Reid · 22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'slack', title: '#cs-renewals — the November list', meta: 'Last week' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
          ] },
          { source: 'think', query: 'Cut eleven down to the four where something is actually stuck.' },
        ] },

      { role: 'user', text: 'Start with Brightpath. What is the security sign-off waiting on?' },
      { role: 'bot',
        artifact: null,
        answer: 'It is waiting on us, not on them.\n\nCallum Reid sent their security '
              + 'questionnaire on 22 August. It went to legal@ on the 23rd and has not '
              + 'moved since — eleven days, no owner on it. Their side has chased twice, '
              + 'on 29 August and again on Tuesday.\n\nNothing in the questionnaire looks '
              + 'hard. Nine of the fourteen questions are answered verbatim in the '
              + 'standard security pack; the other five are about the Context Graph\'s '
              + 'retention window, which the architecture note already covers.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Brightpath security questionnaire and where it went', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: 'Callum Reid · 22 Aug' },
            { source: 'gmail', title: 'You → legal@ — please review', meta: '23 Aug' },
            { source: 'gmail', title: 'Re: any update on this?', meta: 'Callum Reid · Tuesday' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'slack', title: '#legal-requests — the queue', meta: 'Yesterday' },
          ] },
          { source: 'web', query: 'the Brightpath security questionnaire and where it went', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: 'Callum Reid · 22 Aug' },
            { source: 'gmail', title: 'You → legal@ — please review', meta: '23 Aug' },
            { source: 'gmail', title: 'Re: any update on this?', meta: 'Callum Reid · Tuesday' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'slack', title: '#legal-requests — the queue', meta: 'Yesterday' },
          ] },
          { source: 'think', query: 'Traced the eleven days to a mail with nobody on it.' },
        ] },

      { role: 'user', text: 'Draft the answers to the five that are not in the standard pack.' },
      { role: 'bot',
        artifact: 'doc-renewal-brief',
        answer: 'Drafted. Each of the five is answered out of the architecture note '
              + 'rather than written fresh, so none of it needs a second legal read — it '
              + 'is the language legal already signed off in the DPA.\n\nThe retention '
              + 'answer is the one to look at. Their question assumes we hold raw source '
              + 'documents. We hold embeddings and pointers, and that distinction is what '
              + 'makes the thirty-day window acceptable to them.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what the five open questions ask, and what we already say', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Brightpath', meta: 'Legal · March' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'salesforce', title: 'Brightpath — renewal FY27', meta: '$410k · February' },
            { source: 'drive', title: 'Architecture note — what leaves the region', meta: 'Platform' },
          ] },
          { source: 'web', query: 'what the five open questions ask, and what we already say', rows: [
            { source: 'sharepoint', title: 'Context Graph — retention and residency', meta: 'Platform' },
            { source: 'drive', title: 'Signed DPA — Brightpath', meta: 'Legal · March' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'salesforce', title: 'Brightpath — renewal FY27', meta: '$410k · February' },
            { source: 'drive', title: 'Architecture note — what leaves the region', meta: 'Platform' },
          ] },
          { source: 'think', query: 'Answered five from the note; none of it is new language.' },
        ] },

      { role: 'user', text: 'Now Vantage. What exactly did they ask on the QBR?' },
      { role: 'bot',
        artifact: null,
        answer: 'Two questions, both from Meera Nair, both about where things physically '
              + 'are.\n\nFirst, which region the Context Graph is built in for an EU '
              + 'tenant. Second, what our model providers actually receive — she was '
              + 'specific that “nothing identifiable” was the answer she needed.\n\nYou '
              + 'said on the call you would come back within the week. That was the 28th. '
              + 'Their renewal review is in February, and anything still open now becomes '
              + 'a condition then.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Vantage QBR, and what was promised on it', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'slack', title: '#cs-vantage — after the QBR', meta: '28 Aug' },
          ] },
          { source: 'web', query: 'the Vantage QBR, and what was promised on it', rows: [
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Vantage QBR — transcript', meta: '60 min' },
            { source: 'salesforce', title: 'Vantage Labs — renewal FY27', meta: '$540k · February' },
            { source: 'sharepoint', title: 'EU tenancy — where the graph is built', meta: 'Platform' },
            { source: 'drive', title: 'Model providers — what each receives', meta: 'Security' },
            { source: 'slack', title: '#cs-vantage — after the QBR', meta: '28 Aug' },
          ] },
          { source: 'think', query: 'Pulled the two questions and the date you gave.' },
        ] },

      { role: 'user', text: 'Fieldstone has gone quiet. Who was the last person talking to us?' },
      { role: 'bot',
        artifact: null,
        answer: 'Mark Feltner, and he stopped mid-thread.\n\nThree mails from us since the '
              + '21st and no reply to any of them. Before that he was answering inside a '
              + 'day. The last thing he said was that procurement had “one more question” '
              + 'about the seat count — and then nothing.\n\nWorth knowing: they renew on '
              + '30 November and they are on the legacy seat pricing, which is exactly '
              + 'what procurement would be looking at.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Fieldstone thread and who stopped replying', rows: [
            { source: 'outlook', title: 'Re: seat count for renewal', meta: 'Mark Feltner · 21 Aug' },
            { source: 'outlook', title: 'You → Mark — following up', meta: 'Three mails, no reply' },
            { source: 'salesforce', title: 'Fieldstone — renewal FY27', meta: '$290k · 30 November' },
            { source: 'salesforce', title: 'Contract — legacy seat pricing', meta: 'Signed 2024' },
            { source: 'slack', title: '#cs-advance-auto — quiet', meta: '12 days' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
          ] },
          { source: 'web', query: 'the Fieldstone thread and who stopped replying', rows: [
            { source: 'outlook', title: 'Re: seat count for renewal', meta: 'Mark Feltner · 21 Aug' },
            { source: 'outlook', title: 'You → Mark — following up', meta: 'Three mails, no reply' },
            { source: 'salesforce', title: 'Fieldstone — renewal FY27', meta: '$290k · 30 November' },
            { source: 'salesforce', title: 'Contract — legacy seat pricing', meta: 'Signed 2024' },
            { source: 'slack', title: '#cs-advance-auto — quiet', meta: '12 days' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
          ] },
          { source: 'think', query: 'Found the point the thread stopped, and why it would have.' },
        ] },

      { role: 'user', text: 'Redwood usage is down 40%. Where did it go?' },
      { role: 'bot',
        artifact: null,
        answer: 'One team stopped, and it is the team that was carrying the '
              + 'number.\n\nOperations was 71% of weekly active use through June and is now '
              + 'near zero. Everyone else is flat. The drop starts the week of 14 July, '
              + 'which is the week their ops lead changed — Priya Raman left and the '
              + 'seats were never reassigned.\n\nThis is not a product problem. Forty-one '
              + 'seats are sitting unused on an account that renews in January, and '
              + 'nobody on our side noticed for seven weeks.',
        cites: null,
        steps: [
          { source: 'internal', query: 'Redwood usage by team, and what changed in July', rows: [
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'drive', title: 'Weekly active by team — Redwood', meta: 'Analytics' },
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: '$620k · January' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
            { source: 'slack', title: '#cs-iron-mountain — last touch', meta: 'June' },
            { source: 'outlook', title: 'Out of office — Priya Raman', meta: '11 July' },
          ] },
          { source: 'web', query: 'Redwood usage by team, and what changed in July', rows: [
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'drive', title: 'Weekly active by team — Redwood', meta: 'Analytics' },
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: '$620k · January' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
            { source: 'slack', title: '#cs-iron-mountain — last touch', meta: 'June' },
            { source: 'outlook', title: 'Out of office — Priya Raman', meta: '11 July' },
          ] },
          { source: 'think', query: 'Traced the whole drop to one team and one departure.' },
        ] },

      { role: 'user', text: 'Build me a view of all four with what each one is waiting on.' },
      { role: 'bot',
        artifact: 'sheet-churn',
        answer: 'Built. Four accounts, $1.86M of renewal value, and every one of them is '
              + 'waiting on something we control rather than something they have to '
              + 'decide.\n\nBrightpath is waiting on a mail. Vantage is waiting on an answer you '
              + 'promised. Fieldstone is waiting on a pricing conversation nobody has '
              + 'started. Redwood is waiting on somebody to notice, which is '
              + 'now.\n\nSorted by renewal date, so the top of the list has the least room.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the four accounts, their value, dates and what each is blocked on', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Re: seat count for renewal', meta: '21 Aug' },
          ] },
          { source: 'web', query: 'the four accounts, their value, dates and what each is blocked on', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'outlook', title: 'Re: seat count for renewal', meta: '21 Aug' },
          ] },
          { source: 'think', query: 'Put the four in one place, ordered by how little room each has.' },
        ] },

      { role: 'user', text: 'What would you do first tomorrow morning?' },
      { role: 'bot',
        artifact: null,
        answer: 'Send the Brightpath answers. It is the only one of the four that is finished '
              + 'and waiting on a click, their questionnaire has been open eleven days, '
              + 'and it is the shortest distance between where we are now and an account '
              + 'that stops being at risk.\n\nThen Vantage, because that one is a promise '
              + 'with a date on it and the date has passed. Fieldstone needs a pricing '
              + 'position before you write to Mark, so it is not a morning job. Iron '
              + 'Mountain needs a conversation with whoever replaced Priya, and finding '
              + 'out who that is is the first step.',
        cites: null,
        steps: [
          { source: 'internal', query: 'what is finished, what is blocked, and what is only waiting on us', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'salesforce', title: 'Fieldstone — renewal FY27', meta: '30 November' },
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: 'January' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
          ] },
          { source: 'web', query: 'what is finished, what is blocked, and what is only waiting on us', rows: [
            { source: 'gmail', title: 'Security questionnaire — Brightpath', meta: '22 Aug' },
            { source: 'outlook', title: 'Vantage QBR — recording and notes', meta: 'Monday' },
            { source: 'salesforce', title: 'Fieldstone — renewal FY27', meta: '30 November' },
            { source: 'salesforce', title: 'Redwood — renewal FY27', meta: 'January' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'salesforce', title: 'Contacts — ops lead vacant', meta: 'Since July' },
          ] },
          { source: 'think', query: 'Ranked them by what is finished against what is only waiting on us.' },
        ] },

      { role: 'user', text: 'What about Trellis? They are the biggest one on the list.' },
      { role: 'bot',
        artifact: null,
        answer: 'Healthy, and the one I would leave alone. Twelve named users, usage '
              + 'flat since the store pilot closed, and their quarterly review on 2 '
              + 'September had no open actions.\n\n$1.1M in March, and nothing about it '
              + 'is at risk today.',
        cites: null,
        steps: [
          { source: 'internal', query: 'Trellis usage, engagement and open actions', rows: [
            { source: 'salesforce', title: 'Trellis — renewal FY27', meta: '$1.1M · March' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'outlook', title: 'Trellis — quarterly review', meta: '2 Sep' },
            { source: 'slack', title: '#cs-trellis — store rollout', meta: 'Last week' },
            { source: 'sharepoint', title: 'Store pilot — results', meta: 'Delivery' },
            { source: 'salesforce', title: 'Contacts — Trellis', meta: '12 named' },
          ] },
          { source: 'web', query: 'Trellis usage, engagement and open actions', rows: [
            { source: 'salesforce', title: 'Trellis — renewal FY27', meta: '$1.1M · March' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'outlook', title: 'Trellis — quarterly review', meta: '2 Sep' },
            { source: 'slack', title: '#cs-trellis — store rollout', meta: 'Last week' },
            { source: 'sharepoint', title: 'Store pilot — results', meta: 'Delivery' },
            { source: 'salesforce', title: 'Contacts — Trellis', meta: '12 named' },
          ] },
          { source: 'think', query: 'Checked it and found nothing to do.' },
        ] },

      { role: 'user', text: 'Any of the prospects worth pulling forward instead?' },
      { role: 'bot',
        artifact: null,
        answer: 'Sentinel. Their security review is the last thing between us and a '
              + 'decision, and the pack they asked for is the same one Brightpath is '
              + 'waiting on.\n\nOne document, two accounts. That is the argument for '
              + 'doing it tomorrow.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the prospects and what each is waiting on', rows: [
            { source: 'salesforce', title: 'Sentinel — new business', meta: '$480k · Proposal' },
            { source: 'outlook', title: 'Security review — next steps', meta: 'Their team' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'drive', title: 'Pen test summary — 2026', meta: 'Security' },
            { source: 'slack', title: '#deal-sentinel', meta: 'Yesterday' },
            { source: 'gmail', title: 'Re: evaluation timeline', meta: 'Last Thursday' },
          ] },
          { source: 'web', query: 'the prospects and what each is waiting on', rows: [
            { source: 'salesforce', title: 'Sentinel — new business', meta: '$480k · Proposal' },
            { source: 'outlook', title: 'Security review — next steps', meta: 'Their team' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'drive', title: 'Pen test summary — 2026', meta: 'Security' },
            { source: 'slack', title: '#deal-sentinel', meta: 'Yesterday' },
            { source: 'gmail', title: 'Re: evaluation timeline', meta: 'Last Thursday' },
          ] },
          { source: 'think', query: 'Found one document that unblocks two of them.' },
        ] },

      { role: 'user', text: 'What is Sentinel’s timeline?' },
      { role: 'bot',
        artifact: null,
        answer: 'They said a decision by the end of the month on the call last '
              + 'Thursday, and their security review is booked for the 18th.\n\nIf the '
              + 'pack goes this week they walk into that review with it. If it goes '
              + 'next week they do not.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Sentinel evaluation timeline and the review date', rows: [
            { source: 'salesforce', title: 'Sentinel — new business', meta: '$480k · Proposal' },
            { source: 'outlook', title: 'Security review — next steps', meta: 'Their team' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'drive', title: 'Pen test summary — 2026', meta: 'Security' },
            { source: 'slack', title: '#deal-sentinel', meta: 'Yesterday' },
            { source: 'gmail', title: 'Re: evaluation timeline', meta: 'Last Thursday' },
          ] },
          { source: 'web', query: 'the Sentinel evaluation timeline and the review date', rows: [
            { source: 'salesforce', title: 'Sentinel — new business', meta: '$480k · Proposal' },
            { source: 'outlook', title: 'Security review — next steps', meta: 'Their team' },
            { source: 'sharepoint', title: 'Standard security pack v4', meta: 'Legal' },
            { source: 'drive', title: 'Pen test summary — 2026', meta: 'Security' },
            { source: 'slack', title: '#deal-sentinel', meta: 'Yesterday' },
            { source: 'gmail', title: 'Re: evaluation timeline', meta: 'Last Thursday' },
          ] },
          { source: 'think', query: 'Put their date against ours.' },
        ] },

      { role: 'user', text: 'Where did Halden’s expansion pricing land?' },
      { role: 'bot',
        artifact: null,
        answer: 'Deal desk approved the structure on Friday. You told Rachel you would '
              + 'have numbers to her, and that has not gone.\n\nTheir board meets '
              + 'Thursday. If the pricing is not in front of them this week the '
              + 'expansion moves a quarter.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Halden expansion and where the pricing got to', rows: [
            { source: 'salesforce', title: 'Halden Manufacturing — expansion', meta: '$380k · Proposal' },
            { source: 'gmail', title: 'Re: pricing for 120 more seats', meta: 'Rachel · Tuesday' },
            { source: 'drive', title: 'Deal desk — approved floor', meta: 'Friday' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'slack', title: '#deal-halden', meta: 'This week' },
            { source: 'outlook', title: 'Halden board — Thursday', meta: 'Calendar' },
          ] },
          { source: 'web', query: 'the Halden expansion and where the pricing got to', rows: [
            { source: 'salesforce', title: 'Halden Manufacturing — expansion', meta: '$380k · Proposal' },
            { source: 'gmail', title: 'Re: pricing for 120 more seats', meta: 'Rachel · Tuesday' },
            { source: 'drive', title: 'Deal desk — approved floor', meta: 'Friday' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'slack', title: '#deal-halden', meta: 'This week' },
            { source: 'outlook', title: 'Halden board — Thursday', meta: 'Calendar' },
          ] },
          { source: 'think', query: 'Found an approval with nothing sent after it.' },
        ] },

      { role: 'user', text: 'Price the three structures against the approved floor.' },
      { role: 'bot',
        artifact: 'sheet-churn',
        answer: 'Priced. All three sit at or above the floor, and the 36-month option '
              + 'is the one deal desk prefers and the one that is better for them — it '
              + 'takes 14% off their unit cost.\n\nThat is the number Rachel will be '
              + 'asked about, so I have put it first.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the approved floor and what each structure does to unit cost', rows: [
            { source: 'salesforce', title: 'Halden Manufacturing — expansion', meta: '$380k · Proposal' },
            { source: 'gmail', title: 'Re: pricing for 120 more seats', meta: 'Rachel · Tuesday' },
            { source: 'drive', title: 'Deal desk — approved floor', meta: 'Friday' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'slack', title: '#deal-halden', meta: 'This week' },
            { source: 'outlook', title: 'Halden board — Thursday', meta: 'Calendar' },
          ] },
          { source: 'web', query: 'the approved floor and what each structure does to unit cost', rows: [
            { source: 'salesforce', title: 'Halden Manufacturing — expansion', meta: '$380k · Proposal' },
            { source: 'gmail', title: 'Re: pricing for 120 more seats', meta: 'Rachel · Tuesday' },
            { source: 'drive', title: 'Deal desk — approved floor', meta: 'Friday' },
            { source: 'drive', title: 'Seat pricing — legacy vs current', meta: 'Deal desk' },
            { source: 'slack', title: '#deal-halden', meta: 'This week' },
            { source: 'outlook', title: 'Halden board — Thursday', meta: 'Calendar' },
          ] },
          { source: 'think', query: 'Priced three and flagged the one that helps them most.' },
        ] },

      { role: 'user', text: 'Harborview has been quiet since the demo. Is it real?' },
      { role: 'bot',
        artifact: null,
        answer: 'Hard to say, and that is the answer. Three named contacts, no reply in '
              + 'two weeks, and the intro call notes have no budget or timeline in '
              + 'them.\n\nIt is in discovery on the board but it has never actually been '
              + 'qualified.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the Harborview thread and what we know about them', rows: [
            { source: 'salesforce', title: 'Harborview — new business', meta: '$210k · Discovery' },
            { source: 'outlook', title: 'Intro call — notes', meta: '25 Aug' },
            { source: 'slack', title: '#deal-harborview', meta: 'Two weeks' },
            { source: 'drive', title: 'Discovery questions — template', meta: 'Sales' },
            { source: 'gmail', title: 'Re: next steps after the demo', meta: 'Quiet' },
            { source: 'salesforce', title: 'Contacts — Harborview', meta: '3 named' },
          ] },
          { source: 'web', query: 'the Harborview thread and what we know about them', rows: [
            { source: 'salesforce', title: 'Harborview — new business', meta: '$210k · Discovery' },
            { source: 'outlook', title: 'Intro call — notes', meta: '25 Aug' },
            { source: 'slack', title: '#deal-harborview', meta: 'Two weeks' },
            { source: 'drive', title: 'Discovery questions — template', meta: 'Sales' },
            { source: 'gmail', title: 'Re: next steps after the demo', meta: 'Quiet' },
            { source: 'salesforce', title: 'Contacts — Harborview', meta: '3 named' },
          ] },
          { source: 'think', query: 'Looked for qualification and did not find any.' },
        ] },

      { role: 'user', text: 'Add up what the four at-risk accounts are worth.' },
      { role: 'bot',
        artifact: null,
        answer: '$1.86M. Redwood $620k in January, Vantage $540k in February, '
              + 'Brightpath $410k in February, Fieldstone $290k on 30 November.\n\nAgainst '
              + '$8.4M of total renewal value before March, so it is 22% of the book '
              + 'sitting on four things nobody has finished.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the four accounts and what each is worth', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'FY27 renewal forecast.gsheet', meta: 'Finance' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'sharepoint', title: 'Renewal playbook', meta: 'CS' },
            { source: 'slack', title: '#cs-renewals', meta: 'This week' },
          ] },
          { source: 'web', query: 'the four accounts and what each is worth', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'FY27 renewal forecast.gsheet', meta: 'Finance' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'sharepoint', title: 'Renewal playbook', meta: 'CS' },
            { source: 'slack', title: '#cs-renewals', meta: 'This week' },
          ] },
          { source: 'think', query: 'Added them up against the whole book.' },
        ] },

      { role: 'user', text: 'Put the whole thing in one place I can send to my manager.' },
      { role: 'bot',
        artifact: 'sheet-churn',
        answer: 'Done. Eleven accounts, the four at risk marked, what each is waiting '
              + 'on, who owns it and the renewal date.\n\nThe four are at the top. '
              + 'Everything else is one line each, because the point of sending this is '
              + 'the four.',
        cites: null,
        steps: [
          { source: 'internal', query: 'the eleven accounts with owners, dates and blockers', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'FY27 renewal forecast.gsheet', meta: 'Finance' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'sharepoint', title: 'Renewal playbook', meta: 'CS' },
            { source: 'slack', title: '#cs-renewals', meta: 'This week' },
          ] },
          { source: 'web', query: 'the eleven accounts with owners, dates and blockers', rows: [
            { source: 'salesforce', title: 'Renewals — FY27 Q1 to Q3 (11)', meta: 'Opportunity' },
            { source: 'drive', title: 'FY27 renewal forecast.gsheet', meta: 'Finance' },
            { source: 'salesforce', title: 'Account health scores — all', meta: 'Health' },
            { source: 'drive', title: 'Usage by account — Q3.gsheet', meta: 'Analytics' },
            { source: 'sharepoint', title: 'Renewal playbook', meta: 'CS' },
            { source: 'slack', title: '#cs-renewals', meta: 'This week' },
          ] },
          { source: 'think', query: 'Ordered it so the four are the first thing read.' },
        ] },
    ],
  },

  {
    id: 'ses-team', label: 'How does commit actually look', meta: '12m',
    artifact: 'app-pipeline',
    people: [
      { name: USER.name,       online: true, owner: true },
      { name: 'Matt Rivera',   online: true },
      { name: 'John Whitaker', online: true },
      { name: 'Grace Coleman', online: true },
    ],
    messages: [
      { role: 'user', text: 'We are two-thirds through the quarter. How does commit '
            + 'actually look?' },
      { role: 'bot',
        artifact: null,
        answer: 'Commit is $8.4M against a $9.2M quota with a third of the quarter left — '
              + '$0.8M short, and the shortfall is more specific than that number '
              + 'suggests.[1]\n\n'
              + '- **$5.6M is already closed won.** That part is not in question.\n'
              + '- **$2.8M is open and in commit**, carried by four deals with security '
              + 'reviews or order forms in flight.\n'
              + '- **$1.49M sits in six deals that are not forecast in commit at all**, '
              + 'and four of those six have no next step logged.[2]\n\n'
              + 'That last line is the whole gap. It is not that the quarter is short of '
              + 'pipeline — coverage is 2.7x — it is that six deals stopped moving and '
              + 'nobody marked them. Two sit on accounts scoring below 60 health, one has '
              + 'been idle 34 days, and Atlas Data Cloud is present on three of them.\n\n'
              + 'My read: commit is optimistic rather than short. Before anyone forecasts '
              + 'against it, those six need a next step or a close-lost.',
        cites: [
          { source: 'drive',      label: 'Reforecast', title: 'FY26 reforecast — Aug.gsheet · Finance · 25 Aug' },
          { source: 'salesforce', label: 'Pipeline',   title: 'Open opportunities — Q3 26 (14)' },
        ],
        steps: [
          { source: 'internal', query: 'the quarter — quota, commit and what is open', rows: [
            { source: 'salesforce', title: 'Open opportunities — Q3 26 (14)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Quota and attainment by rep',      meta: 'Forecast' },
            { source: 'drive',      title: 'FY26 reforecast — Aug.gsheet',     meta: 'Finance · 25 Aug' },
            { source: 'sharepoint', title: 'Competitive log — Atlas.xlsx',     meta: 'Deal desk' },
          ] },
          { source: 'think', query: 'Traced the gap to the deals that are not in commit.' },
        ],
      },

      { role: 'system', text: 'Matt Rivera, John Whitaker and Grace Coleman joined the chat' },

      { role: 'user', text: '@Matt Rivera you own most of those six — which of them are '
            + 'actually still live?' },
      { role: 'peer', from: 'Matt Rivera', at: '12m',
        text: 'Two of those six I would write off today. Vertex has been chasing a new exec '
            + 'sponsor for three weeks and Atlas is already inside — I think that one is '
            + 'gone and nobody has marked it. Summit has been pushed twice and their '
            + 'champion left in July.' },
      { role: 'peer', from: 'Matt Rivera', at: '11m',
        text: 'The other four are real. Orion’s analytics add-on is the one I would '
            + 'fight for — $120k, and the only thing holding it is Maya going quiet while a '
            + 'Sev-2 has been open nine days. Clear the ticket and that deal moves this '
            + 'month.' },
      { role: 'peer', from: 'Matt Rivera', at: '10m',
        text: 'Easier to show you than describe it.' },
      { role: 'peer', from: 'Matt Rivera', at: '10m',
        text: '@Assistant give me an interactive view of the quarter — the gap against '
            + 'quota, and the deals carrying it with what each one is waiting on.' },

      { role: 'bot',
        answer: 'Interactive. Forecast against quota, the stage funnel, where the quarter '
              + 'moved, the rep leaderboard and the deals the graph flagged — all off one '
              + 'opportunity spine, so nothing in it can disagree with anything else.\n\n'
              + 'Matt’s six are in the at-risk table with what each is waiting on and how '
              + 'long it has been idle. Pick a stage and the funnel and the deal list move '
              + 'together.',
        steps: [
          { source: 'internal', query: 'open opportunities, stage history and engagement, this quarter', rows: [
            { source: 'salesforce', title: 'Open opportunities — Q3 26 (14)', meta: 'Opportunity' },
            { source: 'salesforce', title: 'Stage history, last 90 days',      meta: 'Opportunity' },
            { source: 'salesforce', title: 'Quota and attainment by rep',      meta: 'Forecast' },
            { source: 'drive',      title: 'Forecast rollup Q3.gsheet',        meta: 'Revenue ops' },
            { source: 'sharepoint', title: 'Competitive log — Atlas.xlsx',     meta: 'Deal desk' },
          ] },
          { source: 'think', query: 'Checked the rollup against the individual records and used the records.' },
          { source: 'skill', query: 'Pipeline Command — forecast, funnel and exposure on one spine', count: 'applied' },
          { source: 'app',   query: 'Built an interactive pipeline view', count: 'Interactive HTML' },
        ],
      },

      /* the room works on the thing that got made */
      { role: 'peer', from: 'John Whitaker', at: '4m',
        text: 'Coverage by rep is the number I would act on. Marcus at 1.9x with five '
            + 'slipping is a staffing problem, not a forecasting one.' },
      { role: 'peer', from: 'Grace Coleman', at: '2m',
        text: 'Can it flag where Atlas is present? Three of the six is a pattern, and it '
            + 'should be on the board slide rather than in a table.' },
    ],
    /* two asks arrived while it was still on the last one */
    queue: [
      { from: 'John Whitaker', ask: 'Sort the leaderboard by coverage',   state: 'running' },
      { from: 'Grace Coleman', ask: 'Flag the deals Atlas is present on', state: 'waiting' },
    ],
  },
  {
    id: 'ses-deck', label: 'Board briefing on AI adoption', meta: '2h',
    prompt: 'Build me a research presentation on where we stand on AI adoption',
    artifact: 'deck-ai-adoption',
    answer: 'Six slides, in the order a board reads them: the question, where the market got to, '
          + 'where we actually are inside, the two renewals now tied to it, the policy constraint, '
          + 'and the three decisions I would put to them.',
    steps: [
      { source: 'internal', query: 'AI adoption — research, policy and pipeline', rows: [
        { source: 'drive',      title: 'AI adoption survey — Q3 raw.gsheet', meta: 'People analytics' },
        { source: 'drive',      title: 'Platform strategy 2026.gdoc',        meta: 'You edited 2d ago' },
        { source: 'sharepoint', title: 'AI Usage Policy v3.docx',            meta: 'Legal' },
        { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26',   meta: '$840k · Negotiation' },
        { source: 'salesforce', title: 'Emirates NBD — Platform expansion',  meta: '$1.2m · Proposal' },
      ] },
      { source: 'web', query: 'enterprise AI adoption benchmarks, peer set', rows: [
        { title: 'Enterprise AI adoption benchmarks 2026', meta: 'northstarresearch.com' },
        { title: 'Operating models for AI-native teams',   meta: 'halloway.com' },
        { title: 'What changed in agent tooling this year', meta: 'a16z.com' },
      ] },
      { source: 'read',  query: 'Enterprise AI adoption benchmarks 2026', count: 'northstarresearch.com', link: true },
      { source: 'think', query: 'Set our own numbers against the peer median and found the gap.' },
      { source: 'skill', query: 'Board Briefing — six slides, decisions last', count: 'applied' },
      { source: 'deck',  query: 'Built a six-slide board briefing', count: 'PPTX' },
    ],
  },
  {
    id: 'ses-sheet', label: 'Churn risk at renewal', meta: '4h',
    prompt: 'Score every account coming up for renewal on churn risk and put it in a sheet',
    artifact: 'sheet-churn',
    answer: 'Ten accounts, scored on usage decline, ticket rate and NPS, weighted 45/35/20. '
          + 'Three sit above 80 and all three renew inside six weeks — Pinewood, Halden and '
          + 'Kestrel. The scoring sheet carries the formula so you can argue with the weights.',
    steps: [
      { source: 'internal', query: 'renewals in the next two quarters, usage and support history', rows: [
        { source: 'salesforce', title: 'Renewals — next 2 quarters (10)',  meta: 'Opportunity' },
        { source: 'salesforce', title: 'Support tickets by account, 90d',   meta: 'Case' },
        { source: 'drive',      title: 'Product usage — weekly actives.gsheet', meta: 'Data team' },
        { source: 'drive',      title: 'NPS Q2 — verbatims and scores.gsheet',  meta: 'CX' },
      ] },
      { source: 'think', query: 'Weighted the three signals and normalised to a 0–100 score.' },
      { source: 'skill', query: 'Churn Scoring — 45/35/20, weights kept arguable', count: 'applied' },
      { source: 'sheet', query: 'Built a four-tab risk workbook', count: 'XLSX' },
    ],
  },
  {
    id: 'ses-doc', label: 'Kestrel renewal position brief', meta: '6h',
    prompt: 'Write the position brief for the Kestrel renewal',
    artifact: 'doc-renewal-brief',
    answer: 'Two pages: where the deal stands, what we can say now, and a recommendation. '
          + 'The one thing I would not soften is the nineteen-day approval median — it is '
          + 'their number, from their own tracker, and it is why we cannot give a date today.',
    steps: [
      { source: 'internal', query: 'Kestrel — the thread, the record and the pricing work', rows: [
        { source: 'gmail',      title: 'Re: Renewal terms — Kestrel',       meta: 'Priya Raman' },
        { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26', meta: '$840k · Negotiation' },
        { source: 'drive',      title: 'Kestrel pricing — working.gsheet',  meta: 'Deal desk' },
        { source: 'sharepoint', title: 'Approval SLA tracker FY26.xlsx',   meta: 'Legal ops' },
      ] },
      { source: 'think', query: 'Checked the redlines against what we have actually committed.' },
      { source: 'skill', query: 'Position Brief — stand, say, recommend', count: 'applied' },
      { source: 'doc',   query: 'Wrote a two-page position brief', count: 'DOCX' },
    ],
  },
  {
    id: 'ses-app', label: 'Q3 forecast and the deals at risk', meta: '1d',
    prompt: 'Build me an interactive view of the quarter — forecast, funnel and the deals at risk',
    artifact: 'app-pipeline',
    answer: 'Interactive. Commit lands $0.8M under quota with a third of the quarter left, and '
          + 'the whole gap sits inside six deals that are not forecast in commit at all. Pick a '
          + 'stage and the funnel and the deal list move together.',
    steps: [
      { source: 'internal', query: 'open opportunities, stage history and engagement, this quarter', rows: [
        { source: 'salesforce', title: 'Open opportunities — Q3 26 (14)', meta: 'Opportunity' },
        { source: 'salesforce', title: 'Stage history, last 90 days',      meta: 'Opportunity' },
        { source: 'salesforce', title: 'Quota and attainment by rep',      meta: 'Forecast' },
        { source: 'drive',      title: 'Forecast rollup Q3.gsheet',        meta: 'Revenue ops' },
        { source: 'sharepoint', title: 'Competitive log — Atlas.xlsx',     meta: 'Deal desk' },
      ] },
      { source: 'think', query: 'Checked the rollup against the individual records and used the records.' },
      { source: 'skill', query: 'Pipeline Explorer — one filter drives every view', count: 'applied' },
      { source: 'app',   query: 'Built an interactive pipeline view', count: 'Interactive' },
    ],
  },
];

/* a finished session renders whole — nothing replays */
const seededBot = (m, ses) => ({
  role: 'bot', text: m.answer, thinking: false,
  steps: m.steps.map(x => ({ ...x, seen: true })),
  /* a seeded answer cites its sources the same way a live one does */
  cites: m.cites || null,
  artifact: 'artifact' in m ? m.artifact : ses.artifact,
  inline: m.inline || null, traceOpen: false,
  suggest: m.suggest || null,
});

function openSession(ses) {
  thread = {
    id: ses.id,
    title: ses.label,
    /* a chat can carry its own reading of the month */
    usage: ses.usage || null,
    /* who is in the room, and who is in it right now */
    people: ses.people ? ses.people.map(p => ({ ...p })) : null,
    queue: ses.queue ? ses.queue.map(q => ({ ...q })) : null,
    messages: ses.messages
      ? ses.messages.map(m => (m.role === 'bot' ? seededBot(m, ses) : { ...m }))
      : [
          { role: 'user', text: ses.prompt },
          seededBot({ answer: ses.answer, steps: ses.steps }, ses),
        ],
  };
  go('thread');
}

/* Being made an editor is being let into the room, so the room says so.
   Called from the share dialog the moment Send grants edit. */
function joinChat(names) {
  if (!thread || !names.length) return;
  thread.people = thread.people || [{ name: USER.name, online: true, owner: true }];
  const fresh = names.filter(n => !thread.people.some(p => p.name === n));
  if (!fresh.length) return;
  fresh.forEach(n => thread.people.push({ name: n, online: true }));
  thread.messages.push({ role: 'system', text: `${listOf(fresh)} joined the chat` });
  paintThread();
  paintPresence();
  paintReplies();
}

/* "Ananya", "Ananya and Dan", "Ananya, Dan and Priya" */
const listOf = (xs) => xs.length < 3
  ? xs.join(' and ')
  : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

const HISTORY = SESSIONS.map(x => ({ id: x.id, label: x.label, meta: x.meta }));

/* ---------------- views ---------------- */

const views = new Map();
const register = (id, render) => views.set(id, render);

const app = document.getElementById('app');
const view = document.getElementById('view');

function navItem({ id, label, icon: name, tint, meta, primary }) {
  return h('button', {
    class: 'rail-item' + (primary ? ' rail-item-new' : ''),
    type: 'button',
    'data-id': id,
    onclick: () => {
      const ses = SESSIONS.find(x => x.id === id);
      if (ses) { thread = null; openSession(ses); }
      else if (LIVE[id]) { thread = LIVE[id]; threadScroll = null; go('thread'); }
      else { if (id === 'playbooks') closePlaybook();  mxClose(id); go(id); }
    },
  },
    name ? icon(name) : tint ? icon('agent', 'avatar avatar-' + tint) : null,
    h('span', { class: 'rail-item-label' }, label),
    meta && h('span', { class: 'rail-item-meta' }, meta),
  );
}

function go(id) {
  /* an open artifact takes the room the view needs — and when expanded it
     takes all of it, so navigating looked like nothing happened */
  const main = document.getElementById('main');
  if (main && main.dataset.artifact === 'open') closeArtifact();
  clearTimeout(typingTimer);

  if (id === 'home' && thread) {
    /* the thread stays in History — it happened, and you may want it back */
    thread = null; threadScroll = null;
    mountNav(); mountFolds();
  }
  const render = views.get(id) || views.get('home');
  state.view = views.has(id) ? id : 'home';
  /* which view is showing, so a panel can sit under that view's own header
     rather than starting at the top of the window */
  if (main) main.dataset.view = state.view;
  save();
  /* A conversation is a place, so it has an address — #chat/<id>. Every
     view shared one hash before, which meant you could not send someone a
     thread, and reloading always landed you on whichever one was last. */
  const want = (state.view === 'thread' && thread?.id) ? 'chat/' + thread.id
    : (state.view === 'playbooks' && PB.open) ? 'playbooks/' + PB.open
    : mxHash(state.view) || state.view;
  if (location.hash.slice(1) !== want) location.hash = want;

  view.replaceChildren(render());
  for (const b of document.querySelectorAll('.rail-item')) {
    b.setAttribute('aria-current', String(b.dataset.id === state.view));
  }
}

function mountNav() {
  document.getElementById('navPrimary').replaceChildren(...NAV.map(navItem));
  document.getElementById('navHistory').replaceChildren(...HISTORY.map(navItem));

  const you = document.getElementById('railUser');
  you.replaceChildren(
    faceEl(USER.name, 'rail-user-avatar'),
    h('span', { class: 'rail-user-text' },
      h('span', { class: 'rail-user-name' }, USER.name),
    ),
  );
  /* it had the pointer and the hover ground of something that opens, and
     opened nothing */
  you.setAttribute('aria-haspopup', 'dialog');
  you.onclick = (e) => { e.stopPropagation(); accountCard(e.currentTarget); };
}

/* ── the systems the assistant reads ────────────────────────────
   The Microsoft set the product is built on, and the two warehouses the
   numbers live in. One list, one state: connecting here is connecting
   everywhere, because it writes the same set the first-run card reads. */
const BQ_MK = '<svg viewBox="0 0 24 24"><path d="M6.2 2.8h11.6L23.6 12l-5.8 9.2H6.2L.4 12z" fill="#4386FA"/>'
  + '<circle cx="11" cy="11.2" r="4.4" fill="none" stroke="#fff" stroke-width="2"/>'
  + '<path d="M9.2 12.6v-1.8M11 12.6V9.6M12.8 12.6v-1.2" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>'
  + '<path d="m14.3 14.5 3.2 3.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';
/* the mark from the brand folder, not a drawing of it; the build inlines
   it like every other asset */
const SF_MK = '<img src="assets/brand/snowflake-data-cloud-icon.svg" alt="" style="width:100%;height:100%;display:block;object-fit:contain">';
const brandMk = (id) => `<svg viewBox="0 0 24 24"><use href="#b-${id}"></use></svg>`;
const ACCT_CX = [
  { id: 'outlook',    name: 'Outlook',    say: 'Mail and calendar',            mark: brandMk('outlook') },
  { id: 'teams',      name: 'Teams',      say: 'Chats, channels and meetings', mark: brandMk('teams') },
  { id: 'sharepoint', name: 'SharePoint', say: 'Team sites and documents',     mark: brandMk('sharepoint') },
  { id: 'onedrive',   name: 'OneDrive',   say: 'Your files and shared files',  mark: brandMk('onedrive') },
  { id: 'bigquery',   name: 'BigQuery',   say: 'Tables and saved queries',     mark: BQ_MK },
  { id: 'snowflake',  name: 'Snowflake',  say: 'Warehouses and shared data',   mark: SF_MK },
];

/* ── connecting Snowflake ─────────────────────────────────────────
   Snowflake is not a sign-in button: somebody has to make an OAuth
   integration on their side first and bring three values back. So the
   dialog explains the one thing to do in Snowflake, hands over the
   address it needs, and then asks for the values in the order that page
   gives them — each with a line saying where it comes from. It has its
   own address, so an admin can be sent straight to it. */
const UA_REDIRECT = 'https://api.unifyapps.com/workspaces/connectors/standard/oauth/callback';
/* Snowflake blocks these from every OAuth integration, and they can't be removed */
const SF_BLOCKED = ['ACCOUNTADMIN', 'SECURITYADMIN', 'ORGADMIN', 'GLOBALORGADMIN'];
const SF_SAVED = {};

function connectLink(id) {
  return location.origin + location.pathname.replace(/[^/]*$/, '') + 'connect-' + id + '.html';
}

function snowflakeDialog() {
  closeMenu();
  /* the address can ask for it more than once while the app boots (the
     boot and the hash both route); the second ask replaced the first
     dialog under whoever was already clicking in it */
  if (document.querySelector('.cx-dim')) return;
  const v = { url: SF_SAVED.url || '', id: SF_SAVED.id || '', secret: '', role: SF_SAVED.role || 'SYSADMIN' };
  let shown = false, busy = false, done = CONNECTED.has('snowflake');

  const close = () => {
    dim.remove();
    removeEventListener('keydown', onKey);
    if (/^#connect\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const dim = h('div', { class: 'sh-dim cx-dim', onclick: (e) => { if (e.target === dim) close(); } });

  const COPY = MI(GLYPHS.copy);
  const copy = (text, btn, said) => navigator.clipboard.writeText(text).then(() => {
    btn.dataset.done = 'true'; btn.title = said;
    setTimeout(() => { btn.dataset.done = 'false'; btn.title = 'Copy'; }, 1400);
  }, () => {});

  const EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round"><path d="M8 16 16 8M9.5 8H16v6.5"/></svg>';
  const ext = (href, label) => h('a', { class: 'cx-get', href, target: '_blank', rel: 'noopener' },
    label, h('span', { 'aria-hidden': 'true', html: EXT }));

  const field = (key, label, hint, o = {}) => {
    const input = h('input', {
      class: 'cx-in', type: o.secret && !shown ? 'password' : 'text', value: v[key],
      placeholder: o.ph || '', spellcheck: 'false', autocomplete: 'off',
      'aria-label': label,
      oninput: (e) => { v[key] = key === 'role' ? e.target.value.toUpperCase() : e.target.value;
                        if (key === 'role') e.target.value = v.role; paintFoot(); paintRole(); },
    });
    const eye = o.secret ? h('button', {
      class: 'cx-eye', type: 'button', 'aria-label': shown ? 'Hide secret' : 'Show secret',
      html: shown
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5c2.2 3 5.4 4.8 9 4.8s6.8-1.8 9-4.8M6.4 13.9 4.8 16.4M17.6 13.9l1.6 2.5M12 15.3v2.9"/></svg>',
      onclick: () => { shown = !shown; paint(); },
    }) : null;
    return h('div', { class: 'cx-f', 'data-key': key },
      h('div', { class: 'cx-f-h' },
        h('label', { class: 'cx-l' }, label),
        o.doc ? ext(o.doc[0], o.doc[1]) : null),
      h('div', { class: 'cx-box' + (o.secret ? ' has-eye' : '') }, input, eye),
      hint ? h('p', { class: 'cx-hint' }, hint) : null);
  };

  const body = h('div', { class: 'sh-body cx-body' });
  const side = h('aside', { class: 'cx-side' });
  const foot = h('footer', { class: 'sh-foot cx-foot' });
  let steps = false;
  const roleOk = () => v.role.trim() && !SF_BLOCKED.includes(v.role.trim());

  const DOC_OAUTH = 'https://docs.snowflake.com/en/user-guide/oauth-custom';
  const DOC_ACCT  = 'https://docs.snowflake.com/en/user-guide/admin-account-identifier';
  const DOC_ROLES = 'https://docs.snowflake.com/en/user-guide/security-access-control-overview';
  const DOC_KEYS  = 'https://docs.snowflake.com/en/sql-reference/functions/system_show_oauth_client_secrets';
  const HELP_UA   = 'https://help.unifyapps.com/connectors/snowflake';

  function paintRole() {
    const f = body.querySelector('[data-key="role"]'); if (!f) return;
    const bad = !!v.role.trim() && !roleOk();
    f.dataset.bad = String(bad);
    f.querySelector('.cx-hint').textContent = bad
      ? `Snowflake blocks ${v.role.trim()} from OAuth connections. Use a role like SYSADMIN or one made for reading data.`
      : 'Queries run as this role. Snowflake doesn’t allow ACCOUNTADMIN, SECURITYADMIN or ORGADMIN here.';
  }

  function paintSide() {
    const SQL_MAKE = [
      'CREATE SECURITY INTEGRATION unifyapps_oauth',
      '  TYPE = OAUTH',
      '  ENABLED = TRUE',
      '  OAUTH_CLIENT = CUSTOM',
      "  OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'",
      `  OAUTH_REDIRECT_URI = '${UA_REDIRECT}'`,
      '  OAUTH_ISSUE_REFRESH_TOKENS = TRUE;',
    ].join('\n');
    const SQL_KEYS = "SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('UNIFYAPPS_OAUTH');";
    /* the copy control sits on a bar of its own above the code, so it
       never lands on top of the text, and the code wraps rather than
       running out of its box */
    const code = (text, label) => h('div', { class: 'cx-code' },
      h('div', { class: 'cx-code-h' },
        h('span', {}, 'SQL'),
        h('button', { class: 'cx-code-copy', type: 'button', 'aria-label': label,
                      onclick: (e) => copy(text, e.currentTarget, 'Copied') },
          h('span', { class: 'cx-code-ic', 'aria-hidden': 'true', html: COPY }), 'Copy')),
      h('pre', {}, text));
    /* the number is part of the title, not a column of its own: a
       gutter of 01, 02 pushed everything under it in by its width */
    const step = (n, t, sub, ...kids) => h('li', { class: 'cx-s' },
      h('p', { class: 'cx-s-t' }, h('span', { class: 'cx-s-n' }, n + '.'), t),
      sub ? h('p', { class: 'cx-s-sub' }, sub) : null,
      ...kids);

    side.replaceChildren(
      h('div', { class: 'cx-side-h' },
        h('p', { class: 'cx-side-t' }, 'Setup guide')),
      h('ol', { class: 'cx-steps' },
        step(1, 'Open a worksheet as ACCOUNTADMIN',
          'In Snowsight, open a SQL worksheet and switch to ACCOUNTADMIN, or a role with the CREATE INTEGRATION privilege.'),
        step(2, 'Create the integration',
          'This registers UnifyApps with Snowflake and sets the redirect URI.',
          code(SQL_MAKE, 'Copy the create statement')),
        step(3, 'Get the client ID and secret',
          'Returns oauth_client_id and oauth_client_secret. Paste them into the form.',
          code(SQL_KEYS, 'Copy the query')),
        step(4, 'Copy your account URL',
          'Open the account selector, choose View account details, and copy the Account/Server URL.')));
  }

  function paintShape() {
    /* the height the form has on its own is the height of the dialog:
       opening the guide makes it wider, never taller, and the guide
       scrolls inside that height */
    if (!card.style.height && card.isConnected) card.style.height = card.offsetHeight + 'px';
    card.dataset.steps = String(steps);
    side.inert = !steps;
    side.setAttribute('aria-hidden', String(!steps));
    const toggle = card.querySelector('.cx-how');
    if (toggle) toggle.textContent = steps ? 'Hide guide' : 'View guide';
  }

  function paint() {
    body.replaceChildren(
      h('div', { class: 'cx-f', 'data-key': 'uri' },
        h('div', { class: 'cx-f-h' }, h('span', { class: 'cx-l' }, 'Redirect URI')),
        h('div', { class: 'cx-uri' },
          h('code', {}, UA_REDIRECT),
          h('button', { class: 'cx-copy', type: 'button', title: 'Copy', 'aria-label': 'Copy redirect URI',
                        html: COPY, onclick: (e) => copy(UA_REDIRECT, e.currentTarget, 'Copied') })),
        h('p', { class: 'cx-hint' }, 'Add this to your Snowflake OAuth integration.')),
      field('url', 'Account URL', 'In Snowsight: account selector › View account details › Account/Server URL.',
            { ph: 'https://myorg-myaccount.snowflakecomputing.com', doc: [DOC_ACCT, 'Find it'] }),
      field('id', 'Client ID', 'OAuth client ID from your Snowflake security integration',
            { ph: 'Paste the client ID', doc: [DOC_KEYS, 'Get value'] }),
      field('secret', 'Client secret', 'OAuth client secret from your Snowflake security integration',
            { ph: 'Paste the client secret', secret: true }),
      field('role', 'Role', ' ', { ph: 'SYSADMIN' }),
    );
    paintRole();
    paintSide();
    paintFoot();
  }

  function paintFoot() {
    const ready = v.url.trim() && v.id.trim() && v.secret.trim() && roleOk();
    foot.replaceChildren(
      h('p', { class: 'cx-foot-n' }, done ? 'Connected. The assistant can query Snowflake now.' : ''),
      h('span', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: close }, done ? 'Close' : 'Cancel'),
        done ? null : h('button', {
          class: 'btn btn--primary', type: 'button', disabled: !ready || busy || null,
          onclick: () => {
            busy = true; paintFoot();
            setTimeout(() => {
              Object.assign(SF_SAVED, { url: v.url.trim(), id: v.id.trim(), role: v.role.trim() });
              CONNECTED.add('snowflake');
              paintConnections?.();
              busy = false; done = true; paintFoot();
              setTimeout(close, 1100);
            }, 1200);
          },
        }, busy ? 'Connecting…' : 'Connect')));
  }

  /* two whole columns when the guide is open: the dialog (its header,
     the form, its buttons) on the left, and the guide on the right from
     the top edge to the bottom, so the rule between them runs the full
     height instead of hanging off the header */
  const card = h('div', { class: 'sh-card cx-card', role: 'dialog', 'aria-modal': 'true',
                          'aria-label': 'Connect Snowflake' },
   h('div', { class: 'cx-left' },
    h('header', { class: 'sh-head sfd-head' },
      h('span', { class: 'cx-mk', 'aria-hidden': 'true', html: SF_MK }),
      h('div', { class: 'cx-head-m' },
        h('h2', { class: 'sh-title' }, 'Connect Snowflake')),
      h('div', { class: 'sh-head-act' },
        /* the guide is about the dialog, not one field in it, so it sits
           with the dialog's own controls */
        h('button', { class: 'cx-how', type: 'button',
                      onclick: () => { steps = !steps; paintShape(); } }, 'View guide'),
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close', onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),
    body, foot),
   side);

  paint();
  paintShape();
  dim.append(card);
  document.body.append(dim);
  addEventListener('keydown', onKey);
  card.style.height = card.offsetHeight + 'px';
  /* no focus on open: it would scroll the form past the steps that
     explain it, and the steps are the part a newcomer needs first */
}

/* ── connecting BigQuery ───────────────────────────────────────────
   Two honest ways in, and they need different things. Signing in with
   Google is the quick one: a project to bill queries to, and one scope
   approved on Google's own screen. A service account through Workload
   Identity Federation is the one a platform team will want — no keys,
   UnifyApps trades its own token for short-lived Google credentials — and
   it needs three values from their side. The choice sits at the top; the
   form and the guide beside it both follow it. */
const BQ_SAVED = {};
const UA_WORKSPACE_ID = 'uaw_7Kq2mN8pR4tXv9Lc';
const UA_ISSUER = 'https://auth.unifyapps.com';
const GOOGLE_MK = '<img src="assets/brand/google.svg" alt="" style="width:100%;height:100%;display:block">';

function bigqueryDialog() {
  closeMenu();
  if (document.querySelector('.cx-dim')) return;
  const v = { method: BQ_SAVED.method || 'google', project: BQ_SAVED.project || '',
              audience: BQ_SAVED.audience || '', sa: BQ_SAVED.sa || '' };
  let busy = false, done = CONNECTED.has('bigquery'), steps = false;

  const close = () => {
    dim.remove();
    removeEventListener('keydown', onKey);
    if (/^#connect\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const dim = h('div', { class: 'sh-dim cx-dim', onclick: (e) => { if (e.target === dim) close(); } });

  const COPY = MI(GLYPHS.copy);
  const copy = (text, btn, said) => navigator.clipboard.writeText(text).then(() => {
    btn.dataset.done = 'true'; btn.title = said;
    setTimeout(() => { btn.dataset.done = 'false'; btn.title = 'Copy'; }, 1400);
  }, () => {});
  const EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round"><path d="M8 16 16 8M9.5 8H16v6.5"/></svg>';
  const ext = (href, label) => h('a', { class: 'cx-get', href, target: '_blank', rel: 'noopener' },
    label, h('span', { 'aria-hidden': 'true', html: EXT }));

  const DOC_PROJECT = 'https://cloud.google.com/resource-manager/docs/creating-managing-projects#identifying_projects';
  const DOC_WIF     = 'https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers';
  const DOC_SA      = 'https://cloud.google.com/iam/docs/service-accounts-create';

  const field = (key, label, hint, o = {}) => h('div', { class: 'cx-f', 'data-key': key },
    h('div', { class: 'cx-f-h' }, h('label', { class: 'cx-l' }, label), o.doc ? ext(o.doc[0], o.doc[1]) : null),
    h('div', { class: 'cx-box' }, h('input', {
      class: 'cx-in', type: 'text', value: v[key], placeholder: o.ph || '',
      spellcheck: 'false', autocomplete: 'off', 'aria-label': label,
      oninput: (e) => { v[key] = e.target.value; paintFoot(); paintChecks(); },
    })),
    h('p', { class: 'cx-hint' }, hint));

  const shown = (label, value, hint) => h('div', { class: 'cx-f' },
    h('div', { class: 'cx-f-h' }, h('span', { class: 'cx-l' }, label)),
    h('div', { class: 'cx-uri' }, h('code', {}, value),
      h('button', { class: 'cx-copy', type: 'button', title: 'Copy', 'aria-label': 'Copy ' + label,
                    html: COPY, onclick: (e) => copy(value, e.currentTarget, 'Copied') })),
    h('p', { class: 'cx-hint' }, hint));

  /* the audience has one shape, and the most common mistake in it is the
     project ID where the project number goes */
  const AUD_RE = /^\/\/iam\.googleapis\.com\/projects\/(\d+)\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/;
  const SA_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;
  const PROJ_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

  function paintChecks() {
    const mark = (key, ok, bad, good) => {
      const f = body.querySelector(`[data-key="${key}"]`); if (!f) return;
      const val = (v[key] || '').trim();
      f.dataset.bad = String(!!val && !ok);
      f.querySelector('.cx-hint').textContent = val && !ok ? bad : good;
    };
    mark('project', PROJ_RE.test(v.project.trim()),
      'Project IDs are lowercase letters, numbers and hyphens, like my-gcp-project. It’s not the project name.',
      'The project queries run in and are billed to.');
    if (v.method === 'wif') {
      const a = v.audience.trim();
      const usesId = /^\/\/iam\.googleapis\.com\/projects\/[a-z][^/]*\//.test(a);
      mark('audience', AUD_RE.test(a),
        usesId ? 'This uses the project ID. The audience needs the project number, the long number on the project’s dashboard.'
               : 'It should look like //iam.googleapis.com/projects/NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER',
        'The provider’s full resource name. It uses your project number, not the project ID.');
      mark('sa', SA_RE.test(v.sa.trim()),
        'It should end in .iam.gserviceaccount.com.',
        'The account UnifyApps acts as. It needs BigQuery Job User and BigQuery Data Viewer.');
    }
  }

  const ready = () => PROJ_RE.test(v.project.trim())
    && (v.method === 'google' || (AUD_RE.test(v.audience.trim()) && SA_RE.test(v.sa.trim())));

  const choice = (key, title, sub) => h('button', {
    class: 'cx-opt', type: 'button', role: 'radio', 'aria-checked': String(v.method === key),
    onclick: () => { if (v.method === key) return; v.method = key; paint(); },
  },
    h('span', { class: 'cx-opt-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'cx-opt-m' },
      h('span', { class: 'cx-opt-t' }, title),
      h('span', { class: 'cx-opt-s' }, sub)));

  const body = h('div', { class: 'sh-body cx-body' });
  const side = h('aside', { class: 'cx-side' });
  const foot = h('footer', { class: 'sh-foot cx-foot' });

  function paint() {
    const common = field('project', 'Google Cloud project ID', '',
      { ph: 'my-gcp-project', doc: [DOC_PROJECT, 'Find it'] });
    body.replaceChildren(
      h('div', { class: 'cx-opts', role: 'radiogroup', 'aria-label': 'How to connect' },
        choice('google', 'Sign in with Google', 'Uses your own Google account'),
        choice('wif', 'Service account', 'Workload Identity Federation, no keys')),
      common,
      ...(v.method === 'google' ? [
        h('div', { class: 'cx-f' },
          h('div', { class: 'cx-f-h' }, h('span', { class: 'cx-l' }, 'Access')),
          h('div', { class: 'cx-scope' },
            h('span', { class: 'cx-scope-m' },
              h('span', { class: 'cx-scope-t' }, 'Run queries and read results'),
              h('code', {}, 'https://www.googleapis.com/auth/bigquery')),
            h('span', { class: 'cx-scope-req' }, 'Required')),
          h('p', { class: 'cx-hint' }, 'You’ll approve this on Google’s sign-in screen. The assistant can only see datasets your account can.')),
      ] : [
        shown('Workspace ID', UA_WORKSPACE_ID, 'Use this in the provider’s attribute condition, so only this workspace can use it.'),
        field('audience', 'WIF audience', '',
          { ph: '//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/unifyapps/providers/unifyapps-oidc',
            doc: [DOC_WIF, 'How it works'] }),
        field('sa', 'Service account email', '',
          { ph: 'bq-reader@my-gcp-project.iam.gserviceaccount.com', doc: [DOC_SA, 'Create one'] }),
      ]),
    );
    paintChecks();
    paintSide();
    paintFoot();
  }

  function paintSide() {
    const code = (text, label) => h('div', { class: 'cx-code' },
      h('div', { class: 'cx-code-h' },
        h('span', {}, 'gcloud'),
        h('button', { class: 'cx-code-copy', type: 'button', 'aria-label': label,
                      onclick: (e) => copy(text, e.currentTarget, 'Copied') },
          h('span', { class: 'cx-code-ic', 'aria-hidden': 'true', html: COPY }), 'Copy')),
      h('pre', {}, text));
    const step = (n, t, sub, ...kids) => h('li', { class: 'cx-s' },
      h('p', { class: 'cx-s-t' }, h('span', { class: 'cx-s-n' }, n + '.'), t),
      sub ? h('p', { class: 'cx-s-sub' }, sub) : null, ...kids);
    const P = (v.project.trim() || 'PROJECT_ID');
    const SA = v.sa.trim() || `bq-reader@${P}.iam.gserviceaccount.com`;

    const google = [
      step(1, 'Pick the project', 'Queries run in this project and are billed to it. Copy its ID from the project picker in the Cloud console.'),
      step(2, 'Give your account access',
        'The Google account you sign in with needs to run jobs in the project and read the datasets you want to ask about.',
        code([
          `gcloud projects add-iam-policy-binding ${P} \\`,
          '  --member="user:YOU@COMPANY.COM" \\',
          '  --role="roles/bigquery.jobUser"',
          '',
          `gcloud projects add-iam-policy-binding ${P} \\`,
          '  --member="user:YOU@COMPANY.COM" \\',
          '  --role="roles/bigquery.dataViewer"',
        ].join('\n'), 'Copy the role grants')),
      step(3, 'Connect', 'Press Continue with Google, sign in, and approve BigQuery access.'),
    ];
    const wif = [
      step(1, 'Create a pool and a provider for UnifyApps',
        'The condition means only tokens from this workspace are accepted.',
        code([
          'gcloud iam workload-identity-pools create unifyapps \\',
          '  --location="global" --display-name="UnifyApps"',
          '',
          'gcloud iam workload-identity-pools providers create-oidc unifyapps-oidc \\',
          '  --location="global" --workload-identity-pool="unifyapps" \\',
          `  --issuer-uri="${UA_ISSUER}" \\`,
          '  --attribute-mapping="google.subject=assertion.sub,attribute.workspace_id=assertion.workspace_id" \\',
          `  --attribute-condition="attribute.workspace_id=='${UA_WORKSPACE_ID}'"`,
        ].join('\n'), 'Copy the pool and provider commands')),
      step(2, 'Create a service account and give it BigQuery access',
        'Job User lets it run queries. Data Viewer lets it read the data.',
        code([
          'gcloud iam service-accounts create bq-reader --display-name="UnifyApps BigQuery"',
          '',
          `gcloud projects add-iam-policy-binding ${P} \\`,
          `  --member="serviceAccount:${SA}" --role="roles/bigquery.jobUser"`,
          '',
          `gcloud projects add-iam-policy-binding ${P} \\`,
          `  --member="serviceAccount:${SA}" --role="roles/bigquery.dataViewer"`,
        ].join('\n'), 'Copy the service account commands')),
      step(3, 'Let the pool use the service account',
        'Replace PROJECT_NUMBER with your project number, not the ID.',
        code([
          `gcloud iam service-accounts add-iam-policy-binding ${SA} \\`,
          '  --role="roles/iam.workloadIdentityUser" \\',
          `  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/unifyapps/attribute.workspace_id/${UA_WORKSPACE_ID}"`,
        ].join('\n'), 'Copy the binding')),
      step(4, 'Fill in the audience and service account',
        'The audience is //iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/unifyapps/providers/unifyapps-oidc.'),
    ];
    side.replaceChildren(
      h('div', { class: 'cx-side-h' }, h('p', { class: 'cx-side-t' }, 'Setup guide')),
      h('ol', { class: 'cx-steps' }, ...(v.method === 'google' ? google : wif)));
  }

  function paintShape() {
    card.dataset.steps = String(steps);
    side.inert = !steps;
    side.setAttribute('aria-hidden', String(!steps));
    const t = card.querySelector('.cx-how');
    if (t) t.textContent = steps ? 'Hide guide' : 'View guide';
  }

  function paintFoot() {
    const ok = ready();
    const label = v.method === 'google' ? 'Continue with Google' : 'Connect';
    foot.replaceChildren(
      h('p', { class: 'cx-foot-n' }, done ? 'Connected. The assistant can query BigQuery now.' : ''),
      h('span', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: close }, done ? 'Close' : 'Cancel'),
        done ? null : h('button', {
          class: 'btn btn--primary cx-go-btn', type: 'button', disabled: !ok || busy || null,
          onclick: () => {
            busy = true; paintFoot();
            setTimeout(() => {
              Object.assign(BQ_SAVED, { method: v.method, project: v.project.trim(),
                                        audience: v.audience.trim(), sa: v.sa.trim() });
              CONNECTED.add('bigquery');
              paintConnections?.();
              busy = false; done = true; paintFoot();
              setTimeout(close, 1100);
            }, 1300);
          },
        },
          v.method === 'google' && !busy
            ? h('span', { class: 'cx-g', 'aria-hidden': 'true', html: GOOGLE_MK }) : null,
          busy ? (v.method === 'google' ? 'Waiting for Google…' : 'Connecting…') : label)));
  }

  const card = h('div', { class: 'sh-card cx-card', role: 'dialog', 'aria-modal': 'true',
                          'aria-label': 'Connect BigQuery' },
   h('div', { class: 'cx-left' },
    h('header', { class: 'sh-head sfd-head' },
      h('span', { class: 'cx-mk cx-mk--bq', 'aria-hidden': 'true', html: BQ_MK }),
      h('div', { class: 'cx-head-m' }, h('h2', { class: 'sh-title' }, 'Connect BigQuery')),
      h('div', { class: 'sh-head-act' },
        h('button', { class: 'cx-how', type: 'button',
                      onclick: () => { steps = !steps; paintShape(); } }, 'View guide'),
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close', onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),
    body, foot),
   side);

  dim.append(card);
  document.body.append(dim);
  addEventListener('keydown', onKey);
  /* the height is the taller of the two ways in, so switching between
     them never makes the dialog jump */
  const start = v.method;
  v.method = 'wif'; paint(); const hW = card.offsetHeight;
  v.method = 'google'; paint(); const hG = card.offsetHeight;
  v.method = start; paint();
  card.style.height = Math.max(hW, hG) + 'px';
  paintShape();
}

function paintConnectors(el, anchor) {
  const back = h('button', {
    class: 'menu-item acct-back', type: 'button',
    onclick: (e) => { e.stopPropagation(); accountCard(anchor); },
  }, h('span', { class: 'acct-back-ic', 'aria-hidden': 'true',
                 html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
                     + 'stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5 9 12l5.5 5.5"/></svg>' }),
     h('span', { class: 'menu-label' }, 'Connectors'));

  const rows = ACCT_CX.map(c => {
    const on = CONNECTED.has(c.id);
    return h('div', { class: 'acct-cx', 'data-on': String(on) },
      h('span', { class: 'acct-cx-mk', 'aria-hidden': 'true', html: c.mark }),
      h('span', { class: 'acct-cx-m' },
        h('span', { class: 'acct-cx-n' }, c.name),
        h('span', { class: 'acct-cx-s' }, c.say)),
      on
        ? h('span', { class: 'acct-cx-on' }, 'Connected')
        : h('button', {
            class: 'acct-cx-go', type: 'button',
            onclick: (e) => {
              e.stopPropagation();
              if (c.id === 'snowflake') return snowflakeDialog();
              if (c.id === 'bigquery') return bigqueryDialog();
              CONNECTED.add(c.id);
              paintConnections?.();
              paintConnectors(el, anchor);
            },
          }, 'Connect'));
  });

  el.replaceChildren(back, h('div', { class: 'menu-rule' }), ...rows);
  /* it grew from the foot of the rail, so it keeps its foot where it was */
  const r = anchor.getBoundingClientRect();
  const foot = Math.min(r.bottom, innerHeight - 12);
  el.style.top = Math.max(12, foot - el.offsetHeight) + 'px';
}

/* ── who you are signed in as ──
   The only thing at the foot of the rail, so it answers the two questions
   anybody has of it: which account this is, and how much of the month is
   left. Everything else is a row. */
function accountCard(anchor) {
  closeMenu();
  const u = meUsage();
  const pct = Math.min(u.spent / u.limit, 1);
  const out = u.spent >= u.limit;

  const row = (label, icon, run) => h('button', {
    class: 'menu-item', type: 'button', role: 'menuitem',
    onclick: () => { closeMenu(); run(); },
    html: MI(GLYPHS[icon]),
  }, h('span', { class: 'menu-label' }, label));

  const el = h('div', { class: 'menu acct' },
    h('div', { class: 'acct-top' },
      faceEl(USER.name, 'acct-av'),
      h('div', { class: 'acct-m' },
        h('span', { class: 'acct-n' }, USER.name),
        h('span', { class: 'acct-e' }, USER.email))),
    h('div', { class: 'acct-use' },
      h('div', { class: 'acct-use-l' },
        h('span', {}, 'Usage this month'),
        h('span', { class: 'acct-use-v', 'data-out': String(out) },
          `${usd(u.spent)} of ${usd0(u.limit)}`)),
      h('div', { class: 'acct-bar' },
        h('span', { class: 'acct-bar-on', 'data-out': String(out),
                    style: `width:${Math.max(pct * 100, 2)}%` })),
      h('p', { class: 'acct-use-s' }, `Resets on ${u.on}`)),
    h('div', { class: 'menu-rule' }),
    row('Settings', 'gear', () => { MX.settings.open = null; go('settings'); }),
    /* the list opens in the same card rather than a toast saying it will
       exist one day: which systems the assistant can read is a question
       people actually ask of their account */
    h('button', {
      class: 'menu-item', type: 'button', role: 'menuitem',
      html: MI(GLYPHS.files),
      onclick: (e) => { e.stopPropagation(); paintConnectors(el, anchor); },
    }, h('span', { class: 'menu-label' }, 'Connectors'),
       h('span', { class: 'acct-cn-n' }, `${ACCT_CX.filter(c => CONNECTED.has(c.id)).length} of ${ACCT_CX.length}`),
       h('span', { class: 'menu-more', 'aria-hidden': 'true' })),
    h('div', { class: 'menu-rule' }),
    row('Sign out', 'out', () => toast('Signed out.')));

  document.body.append(el);
  openMenu = el;
  const r = anchor.getBoundingClientRect();
  el.style.left = (r.right + 8) + 'px';
  /* it sits on the foot of the rail, so it rises from it — clamped so it
     never runs off the bottom of the window it is rising against */
  const foot = Math.min(r.bottom, innerHeight - 12);
  el.style.top = Math.max(12, foot - el.offsetHeight) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
}

const collapseBtn = document.querySelector('[data-action="collapse"]');

function setRail(mode) {
  state.rail = mode;
  app.dataset.rail = mode;
  collapseBtn.setAttribute('aria-label',
    mode === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar');
  save();
}

collapseBtn.addEventListener('click', () =>
  setRail(app.dataset.rail === 'collapsed' ? 'expanded' : 'collapsed'));

// the whole collapsed head is a hit target, not just the button
document.querySelector('.rail-head').addEventListener('click', e => {
  if (app.dataset.rail === 'collapsed' && !e.target.closest('.icon-btn')) {
    e.preventDefault();
    setRail('expanded');
  }
});

setRail(state.rail === 'collapsed' ? 'collapsed' : 'expanded');

/* ── folding sections ──────────────────────────────────────────
   Height is measured before it is animated, because `auto` will not
   transition. Folded state rides in localStorage with everything else. */
state.folds = state.folds || {};
/* History starts folded in Clavia; it opens once you open it, and stays as you left it */
const FOLD_DEFAULT = { history: false };
const foldOpen = (key) => state.folds[key] ?? FOLD_DEFAULT[key] ?? true;

function setFold(key, open) {
  state.folds[key] = open;
  save();
  const fold = document.getElementById(key === 'agents' ? 'navAgents' : 'navHistory');
  if (!fold) return;
  fold.dataset.folded = String(!open);
  fold.style.height = open ? fold.scrollHeight + 'px' : '0px';
  for (const b of document.querySelectorAll(`[data-fold="${key}"]`)) {
    b.setAttribute('aria-expanded', String(open));
    if (b.classList.contains('chev')) {
      b.setAttribute('aria-label', (open ? 'Collapse ' : 'Expand ') + key);
    }
  }
}

function mountFolds() {
  for (const key of ['history']) {
    const open = foldOpen(key);
    const fold = document.getElementById(key === 'agents' ? 'navAgents' : 'navHistory');
    fold.dataset.folded = String(!open);
    fold.style.height = open ? fold.scrollHeight + 'px' : '0px';
    for (const b of document.querySelectorAll(`[data-fold="${key}"]`)) {
      b.setAttribute('aria-expanded', String(open));
      b.addEventListener('click', () => setFold(key, !foldOpen(key)));
    }
  }
}

/* an open fold is pinned to a measured height, so it has to be re-measured */
addEventListener('resize', () => {
  for (const key of ['history']) {
    if (!foldOpen(key)) continue;
    const fold = document.getElementById(key === 'agents' ? 'navAgents' : 'navHistory');
    if (fold) { fold.style.height = 'auto'; fold.style.height = fold.scrollHeight + 'px'; }
  }
});

/* ── resizing the artifact panel ───────────────────────────────
   The width lives in a custom property on .main, so the grid stays
   declarative and the transition can be suppressed only while a drag
   is actually in flight. */
(function splitter() {
  const main = document.getElementById('main');
  const bar = document.getElementById('split');
  if (!main || !bar) return;

  const MIN = 380, MIN_CHAT = 320;
  const clamp = (px) => Math.max(MIN, Math.min(px, innerWidth - MIN_CHAT));
  const set = (px) => {
    state.artifactW = clamp(px);
    main.style.setProperty('--artifact-w', state.artifactW + 'px');
    save();
  };
  if (state.artifactW) main.style.setProperty('--artifact-w', clamp(state.artifactW) + 'px');

  const onMove = (e) => set(innerWidth - e.clientX);
  const stop = () => {
    main.dataset.dragging = 'false';
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', stop);
  };
  bar.addEventListener('pointerdown', e => {
    if (main.dataset.artifact !== 'open') return;
    e.preventDefault();
    main.dataset.dragging = 'true';
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', stop);
  });
  /* a separator has to be reachable without a pointer */
  bar.addEventListener('keydown', e => {
    const w = parseInt(getComputedStyle(main).getPropertyValue('--artifact-w')) || 640;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); set(w + 24); }
    if (e.key === 'ArrowRight') { e.preventDefault(); set(w - 24); }
  });
  addEventListener('resize', () => { if (state.artifactW) set(state.artifactW); });
})();

/* go() writes the hash itself, and the browser fires hashchange for that
   write a tick later — which re-entered go(), and the second pass closed
   the artifact the first pass had just been asked to open. Only react to a
   hash that is not the one we are already showing. */
/* #chat/<id> opens that conversation — seeded or one started here. */
let hashArtifact = null;
/* Opening one from the library gives it its address, so the link in the
   bar is always the link to what is on screen. Closing gives it back. */
function setArtifactHash(a) {
  hashArtifact = a.id;
  const want = 'artifact/' + a.id;
  if (location.hash.slice(1) !== want) location.hash = want;
}
function clearArtifactHash() {
  if (!/^#artifact\//.test(location.hash)) return;
  hashArtifact = null;
  location.hash = state.view || 'artifacts';
}
function openByHash(hash) {
  /* a connector's own page: the link an admin is sent */
  if (/^connect\/(snowflake|bigquery)$/.test(hash)) {
    if (!state.view || state.view === 'thread') go('home');
    setTimeout(hash.endsWith('bigquery') ? bigqueryDialog : snowflakeDialog, 60);
    return true;
  }
  /* one meeting, on its own, for the panel the desktop shell runs */
  if (briefRoute(hash)) return true;
  if (playbookRoute(hash)) return true;
  if (mxRoute(hash)) return true;
  /* An artifact has an address of its own, so a link can land on the
     thing rather than on the app that contains it. This is the other end
     of a granted request: you were let in, and this is where you arrive. */
  const art = /^artifact\/(.+)$/.exec(hash);
  if (art) {
    const aid = decodeURIComponent(art[1]);
    const a = ARTIFACTS[aid] || (typeof pbArtifactById === 'function' ? pbArtifactById(aid) : null);
    /* the link named an artifact and there is none — that is the 404,
       arrived at the way it actually happens */
    if (!a) { go('artifacts'); notFound(); return true; }
    if (hashArtifact === a.id) return true;   // go() rewrote the hash; not a new request
    hashArtifact = a.id;
    /* a playbook lives in Playbooks, so that is what sits behind it and
       what closing it comes back to */
    go(a.kind === 'playbook' ? 'playbooks' : 'artifacts');
    /* the address of an artifact opens the artifact, not the library with
       something docked beside it — a link somebody sends you should land
       on the thing itself */
    openArtifact(a, { full: true });
    /* go() writes its own view into the hash, which would throw the
       address away the moment the link was used. Put it back, so a
       refresh lands where the link did. */
    location.hash = 'artifact/' + a.id;
    return true;
  }
  const m = /^chat\/(.+)$/.exec(hash);
  if (!m) return false;
  const id = decodeURIComponent(m[1]);
  if (thread?.id === id) return true;
  const ses = SESSIONS.find(x => x.id === id);
  if (ses) { thread = null; openSession(ses); return true; }
  if (LIVE[id]) { thread = LIVE[id]; threadScroll = null; go('thread'); return true; }
  /* a playbook's conversation is made when it is first opened, so a link
     to it makes it again */
  if (typeof pbSessionRoute === 'function' && pbSessionRoute(id)) return true;
  return false;
}

addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (openByHash(hash)) return;
  if (hash && hash !== state.view) go(hash);
});

/* ==================================================================
   Capabilities
================================================================== */

const SKILL_LIST = [
  'Board update', 'Deal review', 'Meeting brief',
  'Weekly pipeline', 'Cash flow', 'Churn watch',
];
const PROJECT_LIST = ['Kestrel', 'Gulf expansion', 'Series C readiness', 'Board Q4'];

/* every agent there is, read when a menu opens: the ones made in chats, the team's agents
   (the built one first once it is published), then the workspace's original three */
const agentPicks = () => [
  ...(typeof AC_MINE !== 'undefined' && typeof acIcon === 'function'
    ? AC_MINE.map(a => ({ label: a.name, mark: acIcon(a.id).replace('<svg ', '<svg class="av2 ag-pick" ') })) : []),
  ...(typeof agAll === 'function' && typeof agIcon === 'function'
    ? agAll().map(a => ({ label: a.name, mark: agIcon(a.mark || a.id).replace('class="ag-ic', 'class="av2 ag-pick ag-ic') })) : []),
  ...AGENTS.map(a => ({
    label: a.label,
    mark: `<svg class="av2" viewBox="0 0 20 20" style="color:var(--agent-${a.tint})"><use href="#i-agent"></use></svg>`,
  })),
];

const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';


/* ── a small popover menu ──────────────────────────────────────
   Anchored to whatever opened it, closes on outside click or Escape,
   and flips above the anchor when the window runs out underneath. */
const MI = (d) => '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

/* Same family as the composer's + menu: 24 grid, 1.7 stroke, round caps,
   geometric rather than illustrative. `project` is the composer's own path,
   used verbatim so the two menus cannot drift. */
const GLYPHS = {
  /* the invitation itself, as opposed to anything you do to it */
  calendar: '<rect x="3.8" y="5" width="16.4" height="14.5" rx="2.2"/>'
          + '<path d="M3.8 9.6h16.4M8.5 3.4v3.2M15.5 3.4v3.2"/>',
  files:   '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/>',
  pin:     '<path d="M9.5 4.5h5l-.8 5.2 3.3 2.8H7l3.3-2.8z"/><path d="M12 12.5v7"/>',
  unread:  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 6.5 12 13l8.4-6.5"/>',
  rename:  '<path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z"/><path d="M14.5 7.5l2 2"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4" rx="1.5"/><path d="M5 8.5v9.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5"/><path d="M10 12.5h4"/>',
  trash:   '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5"/><path d="M6.5 6.5v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-12"/>',
  project: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.4a2 2 0 0 1 1.6.8l1 1.35a2 2 0 0 0 1.6.8H18a2.5 2.5 0 0 1 2.5 2.5V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18z"/>',
  copy:    '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5H5.5A2 2 0 0 0 3.5 7.5v10"/>',
  /* sharing a conversation is about who can see it, not about a file
     leaving the machine — so it is people, not an upload arrow */
  share:   '<circle cx="9" cy="7.8" r="3.3"/>'
         + '<path d="M3 19.4a6 6 0 0 1 12 0"/>'
         + '<path d="M16 5.2a3.3 3.3 0 0 1 0 5.2"/>'
         + '<path d="M17.4 13.8a6 6 0 0 1 3.6 5.1"/>',
  retry:   '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
  gear:    '<path d="M4 8h9"/><path d="M17 8h3"/><circle cx="15" cy="8" r="2.2"/>'
         + '<path d="M4 16h3"/><path d="M11 16h9"/><circle cx="9" cy="16" r="2.2"/>',
  out:     '<path d="M15.5 20.5H6.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h9"/><path d="M15.5 16l4.5-4-4.5-4"/><path d="M20 12H9.5"/>',
  person:  '<circle cx="9.5" cy="8" r="3.4"/>'
         + '<path d="M3.2 19.6a6.4 6.4 0 0 1 12.6 0"/>'
         + '<path d="M18.5 8.5v5"/><path d="M16 11h5"/>',
  dots:    '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
};

/* Q toggles the queue — but never while you are writing, where q is just
   a letter. */
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const k = e.key.toLowerCase();

  if (k === 'q' && thread) {
    e.preventDefault();
    if (!thread.queue?.some(x => x.state !== 'done')) return toast('Nothing queued.');
    queueShown = !queueShown;
    paintQueue();
  }

  /* E — what the other end of a shared link looks like when the person
     opening it has not been given access */
  if (k === 'e') {
    e.preventDefault();
    const open = document.querySelector('.aw');
    if (open) return open.remove();
    accessWall(lastArtifactIn?.() || 'app-pipeline');
    return;
  }

  /* N on Home — the other heading */
  if (k === 'n' && state.view === 'home' && !thread) {
    e.preventDefault();
    homeLayout = homeLayout === 'stack' ? 'sign' : 'stack';
    document.querySelector('.home-head')?.replaceWith(homeHead());
    return;
  }

  /* N — the meetings page as somebody sees it on their first morning */
  if (k === 'n' && (state.view === 'meetings' || state.view === 'meetings-setup')) {
    e.preventDefault();
    return go(state.view === 'meetings' ? 'meetings-setup' : 'meetings');
  }

  /* C — cues, on the meeting you have open. Off until you ask for them:
     something that starts talking on its own is something people turn
     off for good. */
  if (k === 'c' && document.querySelector('.br-dock')) {
    const m = CUE_ME;
    if (!m?.key) return;
    e.preventDefault();
    /* pressing it again puts the pane away and stops listening — the
       same key both ways, because it is one switch */
    if (CUES.on && CUES.key === m.key) { cueStop(); return closeArtifact?.(); }
    cueStart(m.key);
    return cuePanel(m);
  }

  /* X — the meeting's other three pages, as one pane. Same key closes
     it, because it is one switch. */
  if (k === 'x' && document.querySelector('.br-dock')) {
    const m = CUE_ME;
    if (!m?.key) return;
    e.preventDefault();
    const openHub = document.querySelector('#artifactPanel .cp-top[data-hub]');
    if (openHub) return closeArtifact?.();
    return hubPanel(m);
  }

  /* M — who else has this meeting open */
  if (k === 'm' && document.querySelector('.br-dock')) {
    const m = CUE_ME;
    if (!m?.key) return;
    e.preventDefault();
    const anchor = document.querySelector('.br-live') || document.querySelector('.br-share');
    if (anchor) livePanel(anchor, m);
    return;
  }

  if (k === 't' && thread?.people) {
    e.preventDefault();
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null;
                       thread.typing = []; paintTyping(); }
    else runTypingDemo();
  }
});

let openMenu = null;
function closeMenu() {
  /* a cascading panel is a second element, so closing the menu has to
     take it with it */
  document.querySelectorAll('.menu-sub').forEach(n => n.remove());
  openMenu?.remove(); openMenu = null;
}
document.addEventListener('click', closeMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ── the plus, on the meetings box ────────────────────────────
   The composer's own menu, minus everything that makes a new document:
   this box asks about meetings, so what belongs in it is what it can
   read — a file, the web, your apps — and the things you can point it
   at. Apps, Skills, Agents and Projects open in place rather than
   floating out sideways, because the menu is already at the edge of the
   column and a panel to its right would leave the page. */
const ASK_SRC = { web: false, deep: false };

const APM_IC = {
  upload:  '<path d="M12 15.5V3.5M8 7.5l4-4 4 4"/>'
         + '<path d="M4 14v5a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-5"/>',
  web:     '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/>'
         + '<path d="M12 3.5c2.4 2.7 2.4 14.3 0 17M12 3.5c-2.4 2.7-2.4 14.3 0 17"/>',
  deep:    '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'
         + '<path d="M8.5 11.5l1.8 1.8 3.2-3.6"/>',
  apps:    '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/>'
         + '<rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/>'
         + '<rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/>'
         + '<path d="M16.75 13.75v6M13.75 16.75h6"/>',
  skills:  '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9.5h8M8 13.5h5"/>',
  agents:  '<path d="M12 4.5c.57 4.2 3.28 6.93 7.5 7.5-4.22.57-6.93 3.28-7.5 7.5-.57-4.2-3.28-6.93-7.5-7.5 4.22-.57 6.93-3.28 7.5-7.5z"/>',
  project: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.4a2 2 0 0 1 1.6.8l1 1.35a2 2 0 0 0 1.6.8H18a2.5 2.5 0 0 1 2.5 2.5V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18z"/>',
  back:    '<path d="M15 6l-6 6 6 6"/>',
};
const apmIc = (k) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
  + APM_IC[k] + '</svg>';
const APM_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const APM_ARW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M9 6l6 6-6 6"/></svg>';

function askPlus(btn, field) {
  closeMenu();
  const el = h('div', { class: 'menu apm', role: 'menu' });

  /* one row: a mark, a name, and whatever the row reports on its right */
  const row = (o) => h('button', {
    class: 'menu-item apm-row' + (o.on ? ' is-on' : ''), type: 'button', role: 'menuitem',
    onclick: (e) => { e.stopPropagation(); o.run(); },
    html: o.mark ? `<span class="apm-mk">${o.mark}</span>` : '',
  },
    h('span', { class: 'menu-label' }, o.label),
    o.note ? h('span', { class: 'apm-note' }, o.note) : null,
    o.tick ? h('span', { class: 'apm-tick', 'aria-hidden': 'true', html: APM_TICK }) : null,
    o.more ? h('span', { class: 'apm-arw', 'aria-hidden': 'true', html: APM_ARW }) : null);

  const put = (name) => {
    closeMenu();
    field.value = field.value ? `${field.value.trim()} ${name}` : name;
    field.dispatchEvent(new Event('input'));
    field.focus();
  };

  const list = (kind) => {
    const back = row({ mark: apmIc('back'), label: kind[0].toUpperCase() + kind.slice(1),
                       run: () => draw('root') });
    back.classList.add('apm-back');
    const rows = kind === 'apps'
      ? CONNECTORS.map(c => row({
          mark: `<svg viewBox="0 0 24 24"><use href="#b-${c.id}"></use></svg>`,
          label: c.name, on: CONNECTED.has(c.id),
          note: CONNECTED.has(c.id) ? null : 'Connect',
          tick: CONNECTED.has(c.id),
          run: () => { CONNECTED.add(c.id); paintConnections(); draw('apps'); },
        }))
      : kind === 'skills' ? SKILL_LIST.map(n => row({ label: n, run: () => put(n) }))
      : kind === 'agents' ? agentPicks().map(a => row({ mark: a.mark, label: a.label,
                                                        run: () => put(a.label) }))
      : PROJECT_LIST.map(n => row({ mark: apmIc('project'), label: n, run: () => put(n) }));
    return [back, h('div', { class: 'menu-rule' }), ...rows];
  };

  const root = () => {
    const n = CONNECTORS.filter(c => CONNECTED.has(c.id)).length;
    return [
      row({ mark: apmIc('upload'), label: 'Upload file',
            run: () => { closeMenu(); toast('Attaching a file comes in the next pass.'); } }),
      row({ mark: apmIc('web'), label: 'Web search', tick: ASK_SRC.web, on: ASK_SRC.web,
            run: () => { ASK_SRC.web = !ASK_SRC.web; draw('root'); } }),
      row({ mark: apmIc('deep'), label: 'Deep research', tick: ASK_SRC.deep, on: ASK_SRC.deep,
            run: () => { ASK_SRC.deep = !ASK_SRC.deep; draw('root'); } }),
      row({ mark: apmIc('apps'), label: 'Apps', more: true,
            note: n ? `${n} connected` : null, run: () => draw('apps') }),
      h('div', { class: 'menu-rule' }),
      h('div', { class: 'apm-sec' }, 'Use'),
      row({ mark: apmIc('skills'), label: 'Skills', more: true, run: () => draw('skills') }),
      row({ mark: apmIc('agents'), label: 'Agents', more: true, run: () => draw('agents') }),
      row({ mark: apmIc('project'), label: 'Projects', more: true, run: () => draw('projects') }),
    ];
  };

  const draw = (view) => el.replaceChildren(...(view === 'root' ? root() : list(view)));
  draw('root');

  document.body.append(el);
  openMenu = el;
  const r = btn.getBoundingClientRect();
  el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
  el.style.top = (innerHeight - r.bottom < el.offsetHeight + 16
    ? Math.max(12, r.top - el.offsetHeight - 8) : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
}

function menu(anchor, items) {
  closeMenu();
  /* a list of fifty times scrolls; a list of five does not need to, and
     a card that scrolls inside another card that scrolls is two bars */
  const long = items.filter(Boolean).length > 12;
  const el = h('div', { class: 'menu' + (long ? ' menu--long' : ''), role: 'menu' },
    items.filter(Boolean).map(it => it.rule
      ? h('div', { class: 'menu-rule' })
      : h('button', {
          class: 'menu-item' + (it.danger ? ' danger' : ''),
          type: 'button', role: 'menuitem',
          onclick: () => { closeMenu(); it.run?.(); },
          html: it.html
            ? `<span class="brand-ic">${it.html}</span>`
            : it.icon ? MI(GLYPHS[it.icon]) : '',
        },
          h('span', { class: 'menu-label' }, it.label),
          it.key ? h('kbd', { class: 'menu-key' }, it.key) : null,
          /* the one already chosen is marked at the end of the row: a
             mark in front of the label pushes every other label along */
          it.tick ? h('span', { class: 'menu-tick', 'aria-hidden': 'true',
                                html: TICK_IC }) : null,
          it.more ? h('span', { class: 'menu-more', 'aria-hidden': 'true' }) : null,
        )),
  );
  document.body.append(el);
  openMenu = el;

  const r = anchor.getBoundingClientRect();
  const flip = innerHeight - r.bottom < el.offsetHeight + 16;
  el.style.top = (flip ? r.top - el.offsetHeight - 6 : r.bottom + 6) + 'px';
  el.style.left = Math.max(12, Math.min(r.right - el.offsetWidth, innerWidth - el.offsetWidth - 12)) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', e => e.stopPropagation());
}


/* ── sharing a conversation ───────────────────────────────────
   Two questions, in the order people ask them: who specifically, and
   then what everyone else can do. Adding someone is one click and
   carries the role already chosen beside the search, so the common
   case — invite two people as viewers — is three clicks, not a form. */

const ROLES = {
  edit: { label: 'Can edit', sub: 'Reply, rename, and change what is in it' },
  view: { label: 'Can view', sub: 'Read it, and open anything it produced' },
};

const GENERAL = {
  invited: { label: 'Only invited people', sub: 'Nobody else can open it' },
  org:     { label: 'Everyone at UnifyApps', sub: 'Anyone signed in to your workspace' },
  link:    { label: 'Anyone with the link', sub: 'Public — no sign-in needed' },
};

const initials = (n) => n.split(' ').map(w => w[0]).join('').slice(0, 2);

/* Parked: the header's Share button was removed for now. The dialog stays
   put — bringing it back is one button in the thread actions, and it is the
   shape the publish dialog was built to match. */
function shareDialog() {
  if (!thread) return;
  thread.share = thread.share || {
    people: [{ name: USER.name, role: 'owner' }],
    general: { scope: 'invited', role: 'view' },
  };
  const S = thread.share;
  let query = '', pending = 'view';

  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const body = h('div', { class: 'sh-body' });

  /* a role chooser, used both per person and for the whole workspace */
  const rolePicker = (value, onPick, opts = ROLES, extra = '') => {
    const btn = h('button', {
      class: 'sh-role ' + extra, type: 'button', 'aria-haspopup': 'menu',
      onclick: (e) => {
        e.stopPropagation();
        menu(e.currentTarget, Object.entries(opts).map(([k, r]) => ({
          label: r.label,
          run: () => { onPick(k); paint(); },
        })));
      },
    }, opts[value]?.label || value, h('span', { class: 'caret', 'aria-hidden': 'true' }));
    return btn;
  };

  const paint = () => {
    const taken = new Set(S.people.map(p => p.name));
    const matches = query
      ? PEOPLE.filter(p => !taken.has(p.name) && p.name.toLowerCase().includes(query))
      : [];

    const search = h('input', {
      class: 'sh-search', type: 'search', value: query,
      placeholder: 'Add people by name…', 'aria-label': 'Add people',
      oninput: (e) => { query = e.target.value.trim().toLowerCase(); paint(); },
    });

    body.replaceChildren(
      h('div', { class: 'sh-add' },
        h('div', { class: 'sh-add-field' },
          search,
          rolePicker(pending, (r) => { pending = r; }, ROLES, 'sh-role-flat')),
        matches.length ? h('div', { class: 'sh-suggest' }, matches.map(p => h('button', {
          class: 'sh-sugg', type: 'button',
          onclick: () => { S.people.push({ name: p.name, role: pending }); query = ''; paint(); },
        },
          h('span', { class: 'sh-av' }, initials(p.name)),
          h('span', { class: 'sh-sugg-main' },
            h('span', { class: 'sh-name' }, p.name),
            h('span', { class: 'sh-sub' }, p.role)),
          h('span', { class: 'sh-plus', 'aria-hidden': 'true' }, '+'),
        ))) : null,
      ),

      h('div', { class: 'sh-sec' }, 'People with access'),
      h('div', { class: 'sh-list' }, S.people.map((p, i) => h('div', { class: 'sh-row' },
        h('span', { class: 'sh-av' }, initials(p.name)),
        h('span', { class: 'sh-row-main' },
          h('span', { class: 'sh-name' },
            p.name, p.name === USER.name ? h('span', { class: 'sh-you' }, 'You') : null),
          h('span', { class: 'sh-sub' }, PEOPLE.find(x => x.name === p.name)?.role || '')),
        p.role === 'owner'
          ? h('span', { class: 'sh-owner' }, 'Owner')
          : h('span', { class: 'sh-row-act' },
              rolePicker(p.role, (r) => { p.role = r; }),
              h('button', {
                class: 'sh-remove', type: 'button', 'aria-label': `Remove ${p.name}`,
                title: 'Remove',
                onclick: () => { S.people.splice(i, 1); paint(); },
                html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
                    + 'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
              })),
      ))),

      h('div', { class: 'sh-sec' }, 'General access'),
      h('div', { class: 'sh-general' },
        h('button', {
          class: 'sh-gen', type: 'button', 'aria-haspopup': 'menu',
          onclick: (e) => {
            e.stopPropagation();
            menu(e.currentTarget, Object.entries(GENERAL).map(([k, g]) => ({
              label: g.label,
              run: () => { S.general.scope = k; paint(); },
            })));
          },
        },
          h('span', { class: 'sh-gen-main' },
            h('span', { class: 'sh-name' }, GENERAL[S.general.scope].label),
            h('span', { class: 'sh-sub' }, GENERAL[S.general.scope].sub)),
          h('span', { class: 'caret', 'aria-hidden': 'true' })),
        S.general.scope === 'invited' ? null
          : rolePicker(S.general.role, (r) => { S.general.role = r; }),
      ),
    );
  };

  paint();

  const card = h('div', { class: 'sh-card', role: 'dialog', 'aria-modal': 'true',
                          'aria-label': 'Share this chat' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' }, 'Share this chat'),
        h('p', { class: 'sh-of' }, thread.title)),
      h('button', {
        class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
        onclick: close,
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
            + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
      })),
    body,
    h('footer', { class: 'sh-foot' },
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          navigator.clipboard?.writeText(location.origin + '/#' + (thread.id || 'thread')).then(
            () => toast('Link copied.'), () => toast('Could not reach the clipboard.'));
        },
        html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.4 6.4"/>'
            + '<path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/></svg>',
      }, 'Copy link'),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => {
          const n = S.people.length - 1;
          close();
          toast(n ? `Shared with ${n} ${n === 1 ? 'person' : 'people'}.` : 'Sharing updated.');
        },
      }, 'Done')),
  );

  dim.append(card);
  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => card.querySelector('.sh-search')?.focus());
}

/* ==================================================================
   A conversation
================================================================== */

/* the title is the first thing you said, trimmed to something a rail
   item can hold — the same way every chat app names a new thread */
function titleFor(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  const cut = t.length > 38 ? t.slice(0, 38).replace(/\s\S*$/, '') + '…' : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

/* One dial for how fast a turn plays out. There is no model behind this, so
   the pace is a design decision: a run you cannot read is not a trace. */
const PACE = {
  lead:    1400,   // before the first call goes out
  working: 2800,   // a call is out and waiting
  settle:  1500,   // a beat to read what came back
  answer:  1200,   // after the last call, before the reply
};

/* A full deck run is ~28s, which reads well and demos badly. ?pace=fast
   halves it, ?pace=instant collapses it to a beat. Anything else, or
   nothing, leaves the considered pace alone. */
let PACE_SCALE = 1;
{
  const scale = { fast: 0.45, instant: 0.08 }[
    new URLSearchParams(location.search).get('pace')];
  if (scale) {
    PACE_SCALE = scale;
    for (const k of Object.keys(PACE)) PACE[k] = Math.round(PACE[k] * scale);
  }
}


/* renaming edits the title in place, and the rail row follows it */
function renameThread() {
  const btn = document.querySelector('.thread-title');
  const label = btn?.querySelector('.thread-title-text');
  if (!label) return;
  const input = h('input', {
    class: 'thread-rename', type: 'text', value: thread.title,
    'aria-label': 'Conversation name',
  });
  btn.replaceWith(input);
  input.focus(); input.select();

  const commit = (save) => {
    if (save && input.value.trim()) {
      thread.title = input.value.trim();
      const row = HISTORY.find(x => x.id === 'thread');
      if (row) { row.label = thread.title; mountNav(); mountFolds(); }
    }
    go('thread');
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    if (e.key === 'Escape') { e.preventDefault(); commit(false); }
  });
  input.addEventListener('blur', () => commit(true));
}

let thread = null;

/* Conversations you start in this session, kept so History can offer them
   back. They used to be dropped the moment you went home, which meant a
   demo could not show its own trail. */
const LIVE = {};
let liveN = 0;

/* ── asking from a page you are still reading ─────────────────
   A question about a brief is asked while you are looking at it, so the
   answer arrives beside it rather than instead of it: the panel opens on
   the right and the conversation starts there. Navigating away to the
   chat view answered the question and lost the thing the question was
   about.

   It is a real thread — the same object the full view uses, in History,
   with the same steps and the same answers — so "open it properly" is a
   link rather than a migration.
*/
const HIST_IC = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
  + 'stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/>'
  + '<path d="M3.5 4.5V9H8"/><path d="M12 7.8V12l3 1.8"/></svg>';

/* every conversation started from a meeting, kept against that meeting
   — the questions you asked about this call last week are the ones you
   are most likely to want again */
const MEET_CHATS = {};

/* one you had before: the thread exists, so this only puts the pane
   back around it */
function chatPast(id, about) {
  const t = LIVE[id];
  if (!t) return;
  closeMenu();
  chatPanel(t.title, 'past', about, t);
}

function chatPanel(q, pre, about, existing) {
  closeMenu();
  delete document.getElementById('main')?.dataset.hub;
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');

  const id = existing ? existing.id : 'live-' + (++liveN);
  thread = existing || { id, title: titleFor(q), messages: [], live: true };
  LIVE[id] = thread;
  if (!existing) HISTORY.unshift({ id, label: thread.title, meta: 'now' });
  const bucket = about?.key || (about?.person && 'person:' + about.person);
  if (!existing && bucket) {
    (MEET_CHATS[bucket] = MEET_CHATS[bucket] || [])
      .unshift({ id, title: thread.title, at: new Date() });
  }
  mountNav(); mountFolds();

  /* the panel's scroller becomes the one paintThread writes into, and
     the full view's other hosts are stood down so its painters no-op */
  threadScroll = h('div', { class: 'thread-scroll cp-scroll' });
  presenceHost = typingHost = queueHost = shareHost = costHost = artsHost = limitHost
    = repHost = null;

  const close = closeArtifact = () => {
    main.dataset.artifact = 'closed';
    delete main.dataset.pane;
    threadScroll = null;
    setTimeout(() => { if (main.dataset.artifact === 'closed') host.replaceChildren(); }, 260);
  };

  const send = (text) => {
    if (!thread) return;
    say('user', text);
    paintThread();
    answer(text);
  };

  const field = h('input', {
    class: 'mt-ask-in', type: 'text', spellcheck: 'false',
    placeholder: about?.person
      ? `Ask anything about ${about.person.split(' ')[0]}`
      : 'Ask a follow-up',
    'aria-label': about?.person ? `Ask about ${about.person}` : 'Ask a follow-up',
    onkeydown: (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      fire();
    },
    oninput: () => {
      const on = !!field.value.trim();
      go.hidden = !on; mic.hidden = on;
    },
  });
  const fire = () => {
    const v = field.value.trim();
    if (!v) return;
    field.value = ''; go.hidden = true; mic.hidden = false;
    send(v);
  };
  const go = h('button', {
    class: 'mt-ask-go', type: 'button', hidden: true, 'aria-label': 'Ask',
    html: ARROW, onclick: fire,
  });
  /* the same box as the day, the brief and the person: a plus, the
     question, and the two ways to send it */
  const mic = h('button', {
    class: 'mt-ask-mic', type: 'button', 'aria-label': 'Ask out loud',
    title: 'Ask out loud', html: MIC_IC,
    onclick: () => toast('Talking to it comes in the next pass.'),
  });
  const plus = h('button', {
    class: 'mt-ask-mk mt-ask-plus', type: 'button',
    'aria-label': 'Add context', title: 'Add context', html: PLUS_IC,
    onclick: (e) => { e.stopPropagation(); askPlus(e.currentTarget, field); },
  });

  host.replaceChildren(h('div', { class: 'cp' },
    h('header', { class: 'cp-top' },
      /* a conversation started from a person came from somewhere, and
         the way back is where it came from */
      about?.person || about?.cues ? h('button', {
        class: 'icon-btn icon-btn-canvas', type: 'button',
        'aria-label': about.cues ? 'Back to cues' : `Back to ${about.person}`,
        'data-tip': about.cues ? 'Back to cues' : `Back to ${about.person}`,
        onclick: () => (about.cues ? cuePanel(about.cues) : personPanel(about.person)),
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
            + 'stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
      }) : null,
      h('h2', { class: 'cp-h' }, thread.title),
      h('div', { class: 'cp-top-r' },
        /* what you have already asked about this meeting, beside the way
           out of what you are asking now */
        bucket ? h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button',
          'aria-label': 'Earlier conversations', title: 'Earlier conversations',
          'aria-haspopup': 'menu',
          onclick: (e) => {
            e.stopPropagation();
            const list = (MEET_CHATS[bucket] || []).filter(c => c.id !== thread.id);
            if (!list.length) {
              return menu(e.currentTarget, [{ label: 'Nothing else asked yet' }]);
            }
            menu(e.currentTarget, list.slice(0, 8).map(c => ({
              label: c.title, icon: 'unread',
              run: () => chatPast(c.id, about),
            })));
          },
          html: HIST_IC,
        }) : null,
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),
    threadScroll,
    h('footer', { class: 'cp-foot' },
      h('div', { class: 'mt-ask pp-ask' }, plus, field, mic, go))));

  main.dataset.artifact = 'open';
  main.dataset.pane = 'chat';

  /* a conversation you are coming back to arrives whole */
  if (pre === 'past') {
    paintThread();
    requestAnimationFrame(() => field.focus());
    return;
  }

  /* a cue arrives with both halves already written: the room's question
     and the answer that was found while you were still talking */
  if (pre) {
    pre.forEach(msg => say(msg.role, msg.text, msg));
    paintThread();
  } else {
    say('user', q);
    paintThread();
    answer(q);
  }
  requestAnimationFrame(() => field.focus());
}

function startThread(text) {
  const id = 'live-' + (++liveN);
  thread = { id, title: titleFor(text), messages: [], live: true };
  LIVE[id] = thread;
  HISTORY.unshift({ id, label: thread.title, meta: 'now' });
  say('user', text);
  mountNav();
  mountFolds();
  go('thread');
  answer(text);
}

function say(role, text, extra) {
  const m = Object.assign({ role, text }, extra);
  thread.messages.push(m);
  return m;
}

/* ── what the assistant would go and do ────────────────────────
   No model behind this yet, so a plan is chosen from the ask. Two
   shapes matter: a SEARCH, which asks one question and gets answers
   back from whichever systems hold them, and an ACTION, which
   necessarily happens inside one system.

   When the ask names something to build, the run ends the same way
   every time: research, reasoning, the skill that shapes the output,
   then the artifact itself. */

const BUILDS = {
  /* Mail comes first, because "write me an email about X" also matches the
     document pattern on "write me" and the wrong one would win. */
  mail: {
    match: /e-?mail|draft (a|an|the) (note|reply|message)|write to |send (a|an) (note|update)/,
    artifact: 'mail-ai-roundup',
    skill: 'Team update — what moved, what it means for us',
    step: { source: 'outlook', query: 'Drafted the update', count: 'not sent' },
    answer: 'Drafted. Four things that actually changed — long context, inference prices, '
          + 'open weights and small models as routers — then the pattern underneath them and '
          + 'the two things I would take from it.\n\n'
          + 'Two judgement calls worth your eye. I have written that <b>capability is '
          + 'commoditising and context and evaluation are not</b>, which is a claim rather '
          + 'than an observation. And I have ended on this being confirmation of the plan '
          + 'rather than a change to it, which is only true if you agree.\n\n'
          + 'To is Pavitar and Sumeet, Shivam on Cc. Nothing has been sent.',
  },
  deck: {
    match: /presentation|deck|slide|ppt|powerpoint|pitch|board pack|briefing/,
    artifact: 'deck-ai-adoption',
    skill: 'Board Briefing — six slides, decisions last',
    step: { source: 'deck', query: 'Built a six-slide board briefing', count: 'PPTX' },
    answer: 'Six slides, in the order a board reads them: the question, where the market got '
          + 'to, where we actually are inside, the two renewals now tied to it, the policy '
          + 'constraint, and the three decisions I would put to them.',
  },
  sheet: {
    match: /spreadsheet|excel|workbook|xlsx|google sheet|tracker|scor(e|ing)|model the|risk model|in a sheet/,
    artifact: 'sheet-churn',
    skill: 'Churn Scoring — 45/35/20, weights kept arguable',
    step: { source: 'sheet', query: 'Built a four-tab risk workbook', count: 'XLSX' },
    answer: 'Ten accounts, scored on usage decline, ticket rate and NPS, weighted 45/35/20. '
          + 'Three sit above 80 and all three renew inside six weeks. The Method tab carries '
          + 'the weights so you can argue with them.',
  },
  doc: {
    match: /document|docx|word doc|google doc|brief|memo|one-?pager|write (the|a|me|up)|position paper/,
    artifact: 'doc-renewal-brief',
    skill: 'Position Brief — stand, say, recommend',
    step: { source: 'doc', query: 'Wrote a two-page position brief', count: 'DOCX' },
    answer: 'Two pages: where the deal stands, what we can say now, and a recommendation. '
          + 'The one thing I would not soften is the nineteen-day approval median — it is '
          + 'their number, from their own tracker.',
  },
  app: {
    match: /interactive|dashboard|chart|graph|visuali[sz]|explorer|explore|live view|html/,
    artifact: 'app-pipeline',
    skill: 'Pipeline Command — forecast, funnel and exposure on one spine',
    step: { source: 'app', query: 'Built an interactive pipeline view', count: 'Interactive HTML' },
    answer: 'Interactive. Forecast against quota, the stage funnel, where the quarter moved, '
          + 'the rep leaderboard and the deals the graph flagged — all off one opportunity spine, '
          + 'so nothing in it can disagree with anything else.',
  },
};

/* Bringing something up to date is not the same as making it. It reads
   the sources that have moved since — mail, yesterday's calls — and
   versions the thing that already exists rather than producing a second
   one beside it. */
const UPDATE_MATCH = /\bupdate\b|\brefresh\b|bring .* up to date|based on (my |the )?(mail|email|meeting|call)/;

const UPDATE_BUILD = {
  skill: 'Recompute — re-read what moved, version the change',
  step:  { source: 'app', query: 'Updated the interactive view', count: 'new version' },
  steps: [
    { source: 'internal', query: 'what moved since this was built', rows: [
      { source: 'gmail',      title: 'Re: Analytics add-on — Orion',   meta: 'Yesterday · 08:42' },
      { source: 'outlook',    title: 'Deal review — Tue 09:30',            meta: 'Notes · 6 deals' },
      { source: 'salesforce', title: 'Orion Logistics — Analytics',    meta: '$120k · Proposal' },
      { source: 'salesforce', title: 'Ashford Labs — Analytics platform', meta: '$180k · Discovery' },
    ] },
    { source: 'think', query: 'Two of the six have a next step now; commit moves with them.' },
  ],
  answer: 'Updated — **v2**, and two of the six move off the at-risk list.\n\n'
        + '- **Orion Logistics** — analytics add-on. Your mail has a scoping call with '
        + 'Procurement on Thursday at 11:00. That is a next step, so it is no longer silent.\n'
        + '- **Ashford Labs** — the deal review put their data lead on the call, so it is '
        + 'no longer single-threaded on one contact.\n\n'
        + 'That changes the top of the view as well as the table. Exposure drops from '
        + '**$1.49M** across six deals to **$1.19M** across four, the $300k those two carry '
        + 'moves into commit, and **commit goes $8.4M → $8.7M** with **best case $11.2M → '
        + '$11.5M**. The gap against quota closes from $0.8M to $0.5M. Version 1 is still in '
        + 'the history if you want to show what changed.',
};

const buildFor = (q) => Object.entries(BUILDS).find(([, b]) => b.match.test(q))?.[1] || null;

/* the research that precedes a build, chosen by what is being built */
const RESEARCH = {
  'mail-ai-roundup': [
    { source: 'internal', query: 'what the team has flagged in the last fortnight', rows: [
      { source: 'slack', title: '#ai-watch — long context benchmarks', meta: '6 days ago' },
      { source: 'slack', title: '#ai-watch — new pricing, mid-tier', meta: 'Last week' },
      { source: 'drive', title: 'Model evaluation — Q3.gsheet', meta: 'Platform' },
    ] },
    { source: 'web', query: 'model releases and pricing changes, last 30 days', rows: [
      { title: 'Frontier releases and the million-token window', meta: 'research roundup' },
      { title: 'Mid-tier inference pricing, six-month trend',    meta: 'pricing tracker' },
      { title: 'Open-weight models on extraction and routing',   meta: 'benchmark' },
      { title: 'Small models as routers',                        meta: 'paper' },
    ] },
    { source: 'read',  query: 'Mid-tier inference pricing, six-month trend', count: 'pricing tracker', link: true },
    { source: 'think', query: 'Capability is commoditising; context and evaluation are not.' },
  ],
  'deck-ai-adoption': [
    { source: 'internal', query: 'AI adoption — research, policy and pipeline', rows: [
      { source: 'drive',      title: 'AI adoption survey — Q3 raw.gsheet', meta: 'People analytics' },
      { source: 'drive',      title: 'Platform strategy 2026.gdoc',        meta: 'You edited 2d ago' },
      { source: 'drive',      title: 'Board Q4 — narrative draft.gslides', meta: 'Shared with you' },
      { source: 'sharepoint', title: 'AI Usage Policy v3.docx',            meta: 'Legal' },
      { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26',   meta: '$840k · Negotiation' },
      { source: 'salesforce', title: 'Emirates NBD — Platform expansion',  meta: '$1.2m · Proposal' },
    ] },
    { source: 'web', query: 'enterprise AI adoption benchmarks, peer set', rows: [
      { title: 'Enterprise AI adoption benchmarks 2026', meta: 'northstarresearch.com' },
      { title: 'Operating models for AI-native teams',   meta: 'halloway.com' },
      { title: 'What changed in agent tooling this year', meta: 'a16z.com' },
    ] },
    { source: 'read',  query: 'Enterprise AI adoption benchmarks 2026', count: 'northstarresearch.com', link: true },
    { source: 'think', query: 'Set our own numbers against the peer median and found the gap.' },
  ],
  'sheet-churn': [
    { source: 'internal', query: 'renewals in the next two quarters, usage and support history', rows: [
      { source: 'salesforce', title: 'Renewals — next 2 quarters (10)',        meta: 'Opportunity' },
      { source: 'salesforce', title: 'Support tickets by account, 90d',         meta: 'Case' },
      { source: 'drive',      title: 'Product usage — weekly actives.gsheet',   meta: 'Data team' },
      { source: 'drive',      title: 'NPS Q2 — verbatims and scores.gsheet',    meta: 'CX' },
    ] },
    { source: 'think', query: 'Weighted the three signals and normalised to a 0–100 score.' },
  ],
  'doc-renewal-brief': [
    { source: 'internal', query: 'Kestrel — the thread, the record and the pricing work', rows: [
      { source: 'gmail',      title: 'Re: Renewal terms — Kestrel',       meta: 'Priya Raman' },
      { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26', meta: '$840k · Negotiation' },
      { source: 'drive',      title: 'Kestrel pricing — working.gsheet',  meta: 'Deal desk' },
      { source: 'sharepoint', title: 'Approval SLA tracker FY26.xlsx',   meta: 'Legal ops' },
    ] },
    { source: 'think', query: 'Checked the redlines against what we have actually committed.' },
  ],
  'app-pipeline': [
    { source: 'internal', query: 'open opportunities, stage history and engagement, this quarter', rows: [
      { source: 'salesforce', title: 'Open opportunities — Q3 26 (14)', meta: 'Opportunity' },
      { source: 'salesforce', title: 'Stage history, last 90 days',      meta: 'Opportunity' },
      { source: 'salesforce', title: 'Quota and attainment by rep',      meta: 'Forecast' },
      { source: 'drive',      title: 'Forecast rollup Q3.gsheet',        meta: 'Revenue ops' },
      { source: 'sharepoint', title: 'Competitive log — Atlas.xlsx',     meta: 'Deal desk' },
    ] },
    { source: 'think', query: 'Checked the rollup against the individual records and used the records.' },
  ],
};

function planFor(prompt) {
  const q = prompt.toLowerCase();

  const build = buildFor(q);
  if (build) {
    return [
      ...RESEARCH[build.artifact],
      { source: 'skill', query: build.skill, count: 'applied' },
      build.step,
    ];
  }

  if (/(mail|email|reply|inbox)/.test(q)) return [
    { source: 'internal', query: 'the Kestrel renewal — threads and the record', rows: [
      { source: 'gmail',      title: 'Re: Renewal terms — Kestrel',      meta: 'Priya Raman' },
      { source: 'gmail',      title: 'Q3 numbers for the board pack',    meta: 'Dan Whitfield' },
      { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26', meta: '$840k · Negotiation' },
    ] },
    { source: 'think', query: 'Checked the redlines against what we have actually committed.' },
    { source: 'skill', query: 'Account Reply — commitments first, no new promises', count: 'applied' },
    { source: 'gmail', query: 'Drafted a reply to Priya Raman', count: 'saved, not sent' },
  ];

  /* Different questions read different things. One fixed trace under every
     answer is the tell that nothing was actually looked up. */
  if (/renewal|churn|at risk|retention|account/.test(q)) return [
    { source: 'internal', query: 'renewals in play, and what each is waiting on', rows: [
      { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26',  meta: '$840k · Negotiation' },
      { source: 'salesforce', title: 'Emirates NBD — Platform expansion', meta: '$1.2m · Proposal' },
      { source: 'gmail',      title: 'Re: Renewal terms — Kestrel',        meta: 'Matt Rivera' },
      { source: 'sharepoint', title: 'AI Usage Policy v3.docx',           meta: 'Legal' },
    ] },
    { source: 'think', query: 'Both are blocked on the same clause, not on the product.' },
  ];

  if (/forecast|quota|pipeline|commit|number/.test(q)) return [
    { source: 'internal', query: 'the quarter — quota, commit and what is open', rows: [
      { source: 'salesforce', title: 'Open opportunities — Q3 26 (14)', meta: 'Opportunity' },
      { source: 'salesforce', title: 'Quota and attainment by rep',      meta: 'Forecast' },
      { source: 'drive',      title: 'FY26 reforecast — Aug.gsheet',     meta: 'Finance · 25 Aug' },
    ] },
    { source: 'think', query: 'Traced the gap to the deals that are not in commit.' },
  ];

  if (/polic|legal|approval|compliance/.test(q)) return [
    { source: 'internal', query: 'the policy, and who owns changing it', rows: [
      { source: 'sharepoint', title: 'AI Usage Policy v3.docx',          meta: 'Legal' },
      { source: 'drive',      title: 'Platform strategy 2026.gdoc',      meta: 'You edited 2d ago' },
      { source: 'sharepoint', title: 'Approval SLA tracker FY26.xlsx',   meta: 'Legal ops' },
    ] },
    { source: 'think', query: 'One clause, not a rewrite — and it has an owner.' },
  ];

  return [
    { source: 'internal', query: 'adoption, and what is holding it', rows: [
      { source: 'drive',      title: 'AI adoption survey — Q3 raw.gsheet', meta: 'People analytics' },
      { source: 'drive',      title: 'Platform strategy 2026.gdoc',        meta: 'You edited 2d ago' },
      { source: 'sharepoint', title: 'AI Usage Policy v3.docx',            meta: 'Legal' },
      { source: 'salesforce', title: 'Kestrel Industries — Renewal FY26',   meta: '$840k · Negotiation' },
    ] },
    { source: 'web', query: 'where the market got to on the same question', rows: [
      { title: 'Enterprise AI adoption benchmarks 2026', meta: 'northstarresearch.com' },
      { title: 'Operating models for AI-native teams',   meta: 'halloway.com' },
    ] },
    { source: 'think', query: 'Set our own numbers against the peer median and found the gap.' },
  ];
}


/* An answer that names what it found. The old one described the prototype
   instead of answering, which is fine in a README and fatal in a demo. */
const ANSWERS = [
  { on: /renewal|churn|at risk|retention/,
    say: 'Two renewals are holding on the same answer, and it is not a product answer.\n\n'
       + '- **Kestrel Industries** — $840k, in negotiation, closing 14 November. Their legal '
       + 'asked for the AI roadmap in writing before they sign.[1]\n'
       + '- **Emirates NBD** — $1.2m expansion, still in proposal. Raised the same question '
       + 'a week earlier, through their procurement rather than legal.[2]\n\n'
       + 'Both are waiting on the same clause: the usage policy has not been signed off for '
       + 'customer-facing work, so neither account can be told what they are actually '
       + 'buying into.[3] That is one approval, not two negotiations — and it is the '
       + 'difference between $2m closing this quarter and $2m slipping to the next.\n\n'
       + 'Worth knowing before you act on it: neither has said no. Both have said not yet, '
       + 'which is a much shorter distance to travel, and both have a named champion still '
       + 'answering mail.',
    cites: [
      { source: 'salesforce', label: 'Kestrel',       title: 'Kestrel Industries — Renewal FY26 · $840k · Negotiation' },
      { source: 'salesforce', label: 'Emirates NBD', title: 'Emirates NBD — Platform expansion · $1.2m · Proposal' },
      { source: 'sharepoint', label: 'Policy v3',    title: 'AI Usage Policy v3.docx · Legal' },
    ] },

  { on: /adopt|usage|where do we stand|how are we doing/,
    say: 'Deep in three teams, absent in the other nine. It reads as a rollout problem and '
       + 'it is not one.\n\n'
       + '- **Support, revenue ops and the data team** sit at 60–70% weekly use. They were '
       + 'in the March pilot and never came off it.[1]\n'
       + '- **The remaining nine teams** are under 8%, and the drop is not gradual — it is '
       + 'a cliff at the pilot boundary.\n\n'
       + 'The three teams above the line all work on internal data. Every team below it '
       + 'touches customers, and the usage policy has not been signed off for '
       + 'customer-facing work.[2] So the people who would get the most out of this are '
       + 'precisely the ones who are not allowed to use it yet.\n\n'
       + 'Against the peer median we are behind on breadth and ahead on depth, which is the '
       + 'signature of a policy constraint rather than a capability one. Fix the clause and '
       + 'the nine teams do not need a rollout — they need permission.',
    cites: [
      { source: 'drive',      label: 'Adoption survey', title: 'AI adoption survey — Q3 raw.gsheet · People analytics' },
      { source: 'sharepoint', label: 'Policy v3',       title: 'AI Usage Policy v3.docx · Legal' },
    ] },

  { on: /forecast|quota|pipeline|number|commit/,
    say: 'Commit is $8.4M against a $9.2M quota with a third of the quarter left — $0.8M '
       + 'short, and the shortfall is more specific than it looks.[1]\n\n'
       + '- **$5.6M is already closed won.** That part is not in question.\n'
       + '- **$2.8M is open and in commit**, carried by four deals with security reviews or '
       + 'order forms in flight.\n'
       + '- **$1.49M sits in six deals that are not forecast in commit at all**, and four of '
       + 'those six have no next step logged.[2]\n\n'
       + 'That last line is the whole gap. It is not that the quarter is short of pipeline — '
       + 'coverage is 2.7x — it is that six deals stopped moving and nobody marked them. '
       + 'Two are on accounts scoring below 60 health, and one has been idle 34 days.\n\n'
       + 'My read: commit is optimistic rather than short. Before anyone forecasts against '
       + 'it, those six need a next step or a close-lost.',
    cites: [
      { source: 'drive',      label: 'Reforecast', title: 'FY26 reforecast — Aug.gsheet · Finance · 25 Aug' },
      { source: 'salesforce', label: 'Pipeline',   title: 'Open opportunities — Q3 26 (14)' },
    ] },

  { on: /polic|legal|approval|compliance/,
    say: 'The policy is v3, owned by Legal, and it does not cover customer-facing work.[1] '
       + 'That is one clause, not a rewrite.\n\n'
       + '- **What it blocks:** two renewals worth $2m that have asked for the roadmap in '
       + 'writing,[2] and nine teams sitting under 8% weekly use.\n'
       + '- **What it would take:** an approved exception for customer-facing work, with a '
       + 'named owner and a date. Legal has been ready since June.\n'
       + '- **What is actually stuck:** nobody owns putting it in front of the approval '
       + 'committee, and that committee sits fortnightly.\n\n'
       + 'So this is not a legal problem or a product problem. It is an ownership one, and '
       + 'it has been unowned long enough that two customers have noticed.',
    cites: [
      { source: 'sharepoint', label: 'Policy v3', title: 'AI Usage Policy v3.docx · Legal' },
      { source: 'salesforce', label: 'Kestrel',    title: 'Kestrel Industries — Renewal FY26 · $840k' },
    ] },

  { on: /board|thursday|meeting|present/,
    say: 'Thursday needs three decisions, not a status update. A board that is asked to '
       + 'note progress will ask questions instead; a board that is asked to approve three '
       + 'things will approve or refuse them.[1]\n\n'
       + '- **Approve the usage policy exception** for customer-facing work.\n'
       + '- **Name an owner** for taking it to the approval committee.\n'
       + '- **Put a date on it** — the committee sits fortnightly, so the next one is the '
       + 'decision that matters.\n\n'
       + 'Everything else in the pack is evidence for why those three cannot wait: two '
       + 'renewals holding, nine teams at under 8%, and a peer set that is ahead of us on '
       + 'breadth. Lead with the ask and use the rest to answer the follow-ups.',
    cites: [
      { source: 'drive', label: 'Board draft', title: 'Board Q4 — narrative draft.gslides · Shared with you' },
    ] },
];

const ANSWER = 'Pulled what we have on it. The short version: the constraint is the usage '
  + 'policy, not the tooling[1] — it has not been signed off for customer-facing work, '
  + 'which is where the teams with the most to gain actually sit.';
const ANSWER_CITES = [
  { source: 'sharepoint', label: 'Policy v3', title: 'AI Usage Policy v3.docx · Legal' },
];

const answerFor = (q) => ANSWERS.find(x => x.on.test(q)) || { say: ANSWER, cites: ANSWER_CITES };

const DECK_ANSWER = 'Six slides, in the order a board reads them: the question, where the market got '
  + 'to, where we actually are inside, the two renewals now tied to it, the policy constraint, and the '
  + 'three decisions I would put to them. Every slide carries the sources it was written from — open it '
  + 'and the rail shows them per slide.';

/* ── a bot turn, rendered in place ─────────────────────────────
   The node is kept and mutated rather than re-rendered, so the
   thread above it does not replay its entrance on every step. */
/* The moment there is something to look at, the other people in the room
   have opinions about it — and the assistant can only take them one at a
   time, which is what the queue is for. Press Q to see it. */
function queueTheRoom() {
  if (!thread || thread.queue?.length) return;
  const others = (thread.people || [])
    .filter(p => p.online && p.name !== USER.name && PEER_VOICE[p.name]?.queued)
    .slice(0, 2);
  if (others.length < 1) return;
  thread.queue = others.map((p, i) => ({
    from: p.name,
    ask: PEER_VOICE[p.name].queued,
    state: i ? 'waiting' : 'running',
  }));
  paintQueue();
}

const lastArtifactIn = () => {
  for (let i = (thread?.messages.length || 0) - 1; i >= 0; i--) {
    const a = thread.messages[i].artifact;
    if (a) return a;
  }
  return null;
};

function botTurn(prompt) {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();

  const el = m.el;
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  /* A comment that says what a heading should say instead. Nothing is
     searched, because nothing needs to be — the text to change is under
     the cursor and the new text is in the sentence. One step, one line. */
  const cmt = commentOn();
  const to = cmt && ARTIFACTS[cmt.id] ? renameTo(prompt.trim()) : null;

  /* an update works on the thing this conversation already made */
  const upd = !to && UPDATE_MATCH.test(prompt.toLowerCase()) ? lastArtifactIn() : null;
  const plan = to
    ? [{ source: 'edit', query: `\u201c${cmt.where}\u201d \u2192 \u201c${to}\u201d`, count: 'text only' }]
    : upd
    ? [...UPDATE_BUILD.steps,
       { source: 'skill', query: UPDATE_BUILD.skill, count: 'applied' },
       UPDATE_BUILD.step]
    : planFor(prompt);
  /* a rename is one call and it is instant; the considered pace is for
     work that is actually being done */
  const P = to ? { lead: 260, working: 620, settle: 200, answer: 260 } : PACE;
  let t = P.lead;
  plan.forEach((step, i) => {
    at(t, () => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); });
    t += P.working;
    at(t, () => { Object.assign(m.steps[i], step, { running: false }); renderBot(m); });
    t += P.settle;
  });
  t += P.answer;

  const build = buildFor(prompt.toLowerCase());
  at(t, () => {
    m.thinking = false;
    if (to) {
      const art = ARTIFACTS[cmt.id];
      const was = (bodyOf(art, 'labels') || {})[cmt.key] || cmt.key;
      const n = bumpVersion(art, { by: 'Assistant' },
        { labels: { ...(bodyOf(art, 'labels') || {}), [cmt.key]: to } });
      m.text = `Done \u2014 that heading reads **${to}** now. `
             + `Only the text changed; the numbers under it are the same ones from v${(n || 2) - 1}, `
             + `and \u201c${was}\u201d is still there in the version history.`;
      m.cites = null;
      m.artifact = cmt.id;
      m.steps[m.steps.length - 1].count = 'Version ' + (n || 2);
      /* the canvas is open on the thing that just changed, so it should
         show the change rather than wait to be reopened */
      if (document.getElementById('main')?.dataset.artifact === 'open') openArtifact(art);
    } else if (upd) {
      const n = bumpVersion(ARTIFACTS[upd], { by: 'Assistant' });
      m.text = UPDATE_BUILD.answer;
      m.cites = null;
      m.artifact = upd;
      m.steps[m.steps.length - 1].count = 'Version ' + (n || 2);
    } else {
      const found = build ? null : answerFor(prompt.toLowerCase());
      m.text = build ? build.answer : found.say;
      m.cites = build ? build.cites : found.cites;
      m.artifact = build ? build.artifact : null;
      /* made in this conversation, so its history starts here */
      if (build) {
        startVersions(ARTIFACTS[build.artifact]);
        queueTheRoom();
      }
    }
    /* the working folds itself away when the answer arrives — it is evidence,
       and evidence belongs behind one line until someone wants it */
    if (m.traceOpen == null) m.traceOpen = false;
    renderBot(m);
  });
}

/* A claim and the thing it came from, joined where the claim is made. The
   trace already lists every source; a citation is the same source said
   again at the exact sentence it paid for, which is the only place it can
   be checked without scrolling. */
/* **bold** is the only markup an answer needs — it is what a person uses
   when they are naming the thing the sentence is about */
function bolded(str) {
  const out = [];
  let last = 0, b;
  const re = /\*\*([^*]+)\*\*/g;
  while ((b = re.exec(str))) {
    if (b.index > last) out.push(str.slice(last, b.index));
    out.push(h('b', {}, b[1]));
    last = b.index + b[0].length;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

function inlineCites(text, cites, m) {
  if (!cites || !cites.length) return bolded(text);
  const out = [];
  let last = 0, mm;
  const re = /\[(\d+)\]/g;
  while ((mm = re.exec(text))) {
    if (mm.index > last) out.push(...bolded(text.slice(last, mm.index)));
    const c = cites[+mm[1] - 1];
    if (c) out.push(h('button', {
      class: 'cite', type: 'button', title: c.title,
      'aria-label': `Source: ${c.title}`,
      onclick: () => {
        /* open the working, so the row it points at is on screen */
        if (m) { m.traceOpen = true; renderBot(m); }
        toast(c.title);
      },
    },
      /* the logo says which system; the name says which record, which is
         the part you cannot infer */
      h('span', { class: 'cite-mark', 'aria-hidden': 'true', html: glyph(c.source, 'cite-ic') }),
      c.label || c.title));
    last = mm.index + mm[0].length;
  }
  if (last < text.length) out.push(...bolded(text.slice(last)));
  return out;
}

/* An answer of any length: blank lines make paragraphs, leading dashes
   make a list. Anything longer than a sentence needs somewhere to breathe,
   and a wall of prose is where findings go to be skimmed past. */
function proseCites(text, cites, m) {
  const blocks = String(text).split(/\n{2,}/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split('\n');
    if (lines.every(l => l.trim().startsWith('-'))) {
      out.push(h('ul', { class: 'prose-ul' }, lines.map(l =>
        h('li', {}, ...inlineCites(l.replace(/^\s*-\s*/, ''), cites, m)))));
    } else {
      out.push(h('p', { class: 'prose-p' }, ...inlineCites(b.replace(/\n/g, ' '), cites, m)));
    }
  }
  return out;
}

/* Nodes are kept and updated rather than rebuilt: re-attaching an element
   restarts its CSS animations, which would make the mark stutter every time
   a step lands. */
/* ── what a turn cost ──────────────────────────────────────────
   Money is the one number nobody in a business can wave away, and an
   assistant that reads a CRM, searches a graph and builds a deck is not
   free. So every turn carries its price, the chat carries its running
   total, and both open onto the same question: what drove it.

   The figure is derived from what the turn actually did — sources read,
   systems called, artifacts built — rather than stored, so it always
   agrees with the trace sitting above it. It is cached on the message
   the first time it is asked for, because a number that moves when the
   thread repaints is a number nobody trusts. */

const COST_TIER = {
  opus:   { label: 'Opus 4.6',   in: 15, out: 75 },   // $ per million tokens
  sonnet: { label: 'Sonnet 4.6', in: 3,  out: 15 },
};

const usd = (n) => (n < 0.01 && n > 0 ? '<$0.01' : '$' + n.toFixed(2));
const usd0 = (n) => '$' + Math.round(n).toLocaleString();
const tok = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n);

/* Which systems a turn actually reached out to, named the way the trace
   names them, so the line can be read against the rows above it. */
const COST_SYS = {
  salesforce: 'Salesforce', outlook: 'Outlook', gmail: 'Gmail', slack: 'Slack',
  drive: 'Drive', sharepoint: 'SharePoint', teams: 'Teams', onedrive: 'OneDrive',
  internal: 'Context Graph', web: 'Web', think: null,
};

function costOf(m) {
  if (m.cost) return m.cost;
  const steps = m.steps || [];
  const searches = steps.filter(s => s.source !== 'think');
  const rows = searches.reduce((n, s) => n + (s.rows?.length || 0), 0);
  const words = (m.text || '').split(/\s+/).filter(Boolean).length;
  const art = (m.artifact || m.inline) ? 1 : 0;
  /* The bigger model is for turns that read the graph and build something.
     A reply that only writes prose does not need it, and saying so is half
     the point of showing the bill. */
  const tier = (art || rows > 4) ? 'opus' : 'sonnet';
  const R = COST_TIER[tier];
  const tin = 8000 + rows * 4200 + searches.length * 1500;
  const tout = Math.round(words * 1.35) + art * 900;

  const lines = [{
    key: 'model', label: R.label, meta: `${tok(tin)} in · ${tok(tout)} out`,
    usd: (tin * R.in + tout * R.out) / 1e6,
  }];
  if (searches.length) {
    lines.push({
      key: 'graph', label: 'Context Graph',
      meta: `${searches.length} ${searches.length === 1 ? 'search' : 'searches'} · `
          + `${rows} ${rows === 1 ? 'source' : 'sources'} read`,
      usd: searches.length * 0.018 + rows * 0.011,
    });
  }
  const sys = [...new Set(searches.flatMap(st =>
    (st.rows || []).map(r => COST_SYS[r.source]).filter(Boolean)))]
    .filter(x => x !== 'Context Graph');
  if (sys.length) {
    lines.push({ key: 'apps', label: 'Connected apps',
                 meta: sys.slice(0, 3).join(', ') + (sys.length > 3 ? ` +${sys.length - 3}` : ''),
                 usd: sys.length * 0.014 });
  }
  if (art) {
    const a = ARTIFACTS[m.artifact || m.inline];
    lines.push({ key: 'artifact', label: 'Building the ' + (NOUN[a?.kind] || 'artifact'),
                 meta: a?.name || '', usd: 0.09 });
  }
  const total = lines.reduce((n, l) => n + l.usd, 0);
  m.cost = { lines, total, tier: R.label, tin, tout };
  return m.cost;
}

const threadCost = (t = thread) => (t?.messages || [])
  .filter(x => x.role === 'bot' && x.text)
  .reduce((n, x) => n + costOf(x).total, 0);

/* Rolled up the way finance would ask for it: not eleven turns, but the
   four things the money went on. */
function costRollup(t = thread) {
  const bots = (t?.messages || []).filter(x => x.role === 'bot' && x.text);
  const by = new Map();
  for (const m of bots) {
    for (const l of costOf(m).lines) {
      const k = l.key === 'artifact' ? 'artifact' : l.key;
      const label = l.key === 'model' ? 'Model inference'
                  : l.key === 'artifact' ? 'Artifacts' : l.label;
      const cur = by.get(k) || { label, usd: 0, n: 0 };
      cur.usd += l.usd; cur.n += 1;
      by.set(k, cur);
    }
  }
  return { turns: bots.length, total: threadCost(t), lines: [...by.values()] };
}


/* Your own month, not the company's. A workspace figure is somebody
   else's problem until it is exceeded; the number that changes how a
   person works is the one with their name on it. */
const COST_ME = { spent: 128.40, limit: 250, resets: 12, on: '1 October' };
/* A chat can carry its own reading of the month, which is how the capped
   state is demonstrable without waiting for anybody to spend $250. */
const meUsage = () => (thread && thread.usage) || COST_ME;
const meOut = () => { const u = meUsage(); return u.spent >= u.limit; };
/* What was asked for, once it has been asked for. Held here rather than
   on the thread because a usage request is about the month, not the
   conversation you happened to be in when you ran out. */
let MORE_ASKED = null;

/* Three bands, because a running figure is only a fact until something
   says whether it is a lot. Under two dollars is an ordinary chat; past
   five, somebody should look at what they are asking for. The ring fills
   against that upper mark, so the arc and the colour say the same thing
   twice — which is what makes it readable at 14 pixels. */
const COST_BANDS = [
  { max: 2, key: 'low',  range: 'Under limit',
    say: 'well inside the $5 a chat session gets.' },
  { max: 5, key: 'mid',  range: 'Approaching limit',
    say: 'getting close to the $5 a chat session gets.' },
  { max: Infinity, key: 'high', range: 'Over limit',
    say: 'past the $5 a chat session gets. Start a new one.' },
];
const costBand = (n) => COST_BANDS.find(b => n < b.max) || COST_BANDS[2];

/* ── what the colour means ──
   A dial that changes colour without saying why is a warning light with
   no label. Hovering it lays out the three bands and marks the one this
   figure is in, so the colour teaches itself the first time. */
let bandCard = null, bandTimer = null;
const closeBandCard = () => { clearTimeout(bandTimer); bandCard?.remove(); bandCard = null; };
document.addEventListener('click', closeBandCard);

function showBandCard(anchor, total, what) {
  closeBandCard();
  const here = costBand(total);
  /* One scale rather than three paragraphs. The bands are segments of it,
     drawn at their real widths against an eight-dollar run, and a mark
     sits where this figure lands — so where you are and what the colour
     means are the same picture. Only the band you are in is explained;
     the other two explain themselves by being on the same line. */
  const CEIL = 8;
  const at = Math.min(total / CEIL, 1) * 100;
  const el = h('div', { class: 'band-pop' },
    h('div', { class: 'band-top' },
      h('span', {}, what), h('b', {}, usd(total))),
    h('div', { class: 'band-scale' },
      h('span', { class: 'band-mark', style: `--x:${at.toFixed(1)}%` }),
      h('div', { class: 'band-segs' },
        ...COST_BANDS.map((b, i) => h('span', {
          class: 'band-seg', 'data-band': b.key, 'data-on': String(b === here),
          style: `--f:${i === 0 ? 2 : 3}`,
        }))),
      h('div', { class: 'band-ticks' },
        h('span', { style: '--x:0%' }, '$0'),
        h('span', { style: '--x:25%' }, '$2'),
        h('span', { style: '--x:62.5%' }, '$5'))),
    h('p', { class: 'band-say' },
      h('b', { 'data-band': here.key }, here.range), ' \u2014 ', here.say));

  document.body.append(el);
  bandCard = el;
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = Math.max(10, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 10)) + 'px';
  el.style.top = (r.bottom + hgt + 12 > innerHeight ? r.top - hgt - 8 : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('mouseenter', () => clearTimeout(bandTimer));
  el.addEventListener('mouseleave', () => { bandTimer = setTimeout(closeBandCard, 140); });
}

const costRing = (total, what = 'This chat') => {
  const band = costBand(total);
  const C = 37.7;                                   // 2πr, r = 6
  const on = Math.min(total / 5, 1) * C;
  return h('span', {
    class: 'cost-ring', 'data-band': band.key, 'aria-hidden': 'true',
    onmouseenter: (e) => {
      const a = e.currentTarget;
      clearTimeout(bandTimer);
      bandTimer = setTimeout(() => showBandCard(a, total, what), 240);
    },
    onmouseleave: () => { clearTimeout(bandTimer); bandTimer = setTimeout(closeBandCard, 140); },
    html: '<svg viewBox="0 0 16 16">'
        + '<circle class="cost-ring-t" cx="8" cy="8" r="6" fill="none" stroke-width="2.5"/>'
        + `<circle class="cost-ring-f" cx="8" cy="8" r="6" fill="none" stroke-width="2.5" `
        + `stroke-linecap="round" stroke-dasharray="${on.toFixed(2)} ${(C - on).toFixed(2)}" `
        + 'transform="rotate(-90 8 8)"/></svg>',
  });
};

/* ── asking for more ──
   The month is a number somebody set, so running out of it is a
   conversation rather than a wall. Two fields, because an admin
   approving this needs to know how much and what for. */
function moreDialog() {
  let amount = '', why = '';
  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const send = h('button', { class: 'btn btn--primary', type: 'button', disabled: true,
    onclick: () => {
      MORE_ASKED = Number(String(amount).replace(/[^0-9.]/g, '')) || 0;
      close();
      paintCapped();
      toast('Request sent to your workspace administrator.');
    } }, 'Send request');
  const check = () => { send.disabled = !(amount.trim() && why.trim()); };

  const amt = h('input', {
    class: 'more-amt', type: 'text', inputmode: 'decimal', placeholder: '100',
    'aria-label': 'How much more', oninput: (e) => { amount = e.currentTarget.value; check(); },
  });
  const rsn = h('textarea', {
    class: 'more-why', rows: '3', placeholder: 'What you are working on, and why it needs the additional usage',
    'aria-label': 'Reason', oninput: (e) => { why = e.currentTarget.value; check(); },
  });

  const me = meUsage();
  dim.append(h('div', { class: 'sh-card more-card', role: 'dialog', 'aria-modal': 'true' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' }, 'Request additional usage'),
        h('p', { class: 'sh-of' },
          `${usd0(me.spent)} of ${usd0(me.limit)} used this month.`))),
    h('div', { class: 'sh-body' },
      h('label', { class: 'more-l' }, 'Additional amount'),
      h('div', { class: 'more-field' }, h('span', { class: 'more-cur' }, '$'), amt),
      h('label', { class: 'more-l' }, 'Reason for additional usage'),
      h('div', { class: 'more-field more-field-tall' }, rsn)),
    h('footer', { class: 'sh-foot' },
      h('span', { class: 'more-note' }, 'Sent to your workspace administrator.'),
      h('div', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        send))));

  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => amt.focus());
}

/* ── asking for it again ──
   A brief is a reading of the evidence, so a different reading is a
   legitimate thing to want. The field is optional: most of the time you
   just want it run again against what has changed since. */
/* A summary can be written several ways, so the shape is a choice
   before the instruction is. A brief has one shape and does not offer
   the question. */
function regenDialog(what, onGo, opts = {}) {
  let note = '', tpl = null;
  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const field = h('textarea', {
    class: 'more-why', rows: '6',
    placeholder: opts.ask
      || `Add additional context to generate the ${what} for this meeting.`,
    'aria-label': opts.label || 'Additional context',
    oninput: (e) => { note = e.currentTarget.value; },
  });

  /* The shape, if this thing has more than one — a dropdown rather than a
     row of chips, because five of them wrapped onto two lines and read as
     five decisions rather than one. */
  const pick = h('button', { class: 'regen-sel', type: 'button', 'aria-haspopup': 'menu' });
  const paintPick = () => {
    const cur = (opts.templates || []).find(t => t.name === tpl);
    pick.replaceChildren(
      h('span', { class: 'note-ic', 'aria-hidden': 'true',
                  html: cur ? cur.ic : NOTE_IC.all }),
      h('span', { class: 'regen-sel-l' }, tpl || 'Choose a template'),
      h('span', { class: 'caret', 'aria-hidden': 'true' }));
  };
  pick.onclick = (e) => {
    e.stopPropagation();
    closeMenu();
    const row = (ic, label, run, on) => h('button', {
      class: 'menu-item note-item', type: 'button', role: 'menuitem',
      'aria-selected': String(!!on),
      onclick: (ev) => { ev.stopPropagation(); closeMenu(); run(); },
    },
      h('span', { class: 'note-ic', 'aria-hidden': 'true', html: ic }),
      h('span', { class: 'menu-label' }, label));

    const el = h('div', { class: 'menu note-menu', role: 'menu' },
      ...opts.templates.map(t => row(t.ic, t.name,
        () => { tpl = t.name; paintPick(); }, tpl === t.name)),
      tpl ? h('div', { class: 'menu-rule' }) : null,
      tpl ? row(NOTE_IC.all, 'No template', () => { tpl = null; paintPick(); }) : null);

    document.body.append(el);
    openMenu = el;
    const r = pick.getBoundingClientRect();
    /* the width of the thing it drops from — a menu narrower than its
       own trigger reads as a different control */
    el.style.width = r.width + 'px';
    el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
    el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
      ? Math.max(12, r.top - el.offsetHeight - 6) : r.bottom + 6) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (ev) => ev.stopPropagation());
  };
  paintPick();

  dim.append(h('div', { class: 'sh-card more-card', role: 'dialog', 'aria-modal': 'true' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' }, opts.title || `Regenerate the ${what}`))),
    h('div', { class: 'sh-body' },
      ...(opts.templates ? [h('label', { class: 'more-l' }, 'Template'), pick] : []),
      h('label', { class: 'more-l' }, opts.label || 'Additional context'),
      h('div', { class: 'more-field more-field-tall' }, field)),
    h('footer', { class: 'sh-foot regen-foot' },
      h('div', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'btn btn--primary', type: 'button',
                      onclick: () => { close(); onGo(note.trim(), tpl); } },
          /* a first run is not a second one */
          opts.go || 'Regenerate')))));

  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => field.focus());
}

/* ── the panel both prices open onto ── */
function costPop(anchor) {
  closeMenu();
  const el = h('div', { class: 'cost-pop' });

  const bar = (frac, k) => h('span', { class: 'cost-bar' },
    h('span', { class: 'cost-bar-f', 'data-k': k, style: `--w:${Math.max(frac * 100, 1.5)}%` }));

  const line = (l, total, k) => h('div', { class: 'cost-line' },
    h('span', { class: 'cost-line-l' },
      h('span', { class: 'cost-line-n' }, l.label),
      l.meta ? h('span', { class: 'cost-line-m' }, l.meta) : null),
    h('span', { class: 'cost-line-r' },
      h('span', { class: 'cost-line-v' }, usd(l.usd)),
      bar(total ? l.usd / total : 0, k)));

  {
    const r = costRollup();
    const me = meUsage();
    const mePct = Math.min(me.spent / me.limit, 1);
    /* Who ran what, because a shared chat is shared spend and the person
       who opened it is not always the person who drove it. A turn is
       charged to whoever asked for it — the message directly above it,
       which is a colleague whenever one handed the work over. */
    const people = (thread?.people || [{ name: USER.name }]);
    const tally = new Map();
    /* And what each turn cost, against the question that caused it —
       "model inference, $2.41" tells nobody which of their questions was
       the expensive one, and that is the only thing anybody changes. */
    const asks = [];
    let asker = USER.name, question = thread?.title || 'Opening question';
    for (const x of (thread?.messages || [])) {
      if (x.role === 'user') { asker = USER.name; question = x.text || question; }
      else if (x.role === 'peer') { asker = x.from || asker; question = x.text || question; }
      else if (x.role === 'bot' && x.text) {
        const c = costOf(x);
        const cur = tally.get(asker) || { name: asker, turns: 0, usd: 0 };
        cur.turns += 1; cur.usd += c.total;
        tally.set(asker, cur);
        asks.push({ q: question.replace(/\s+/g, ' ').trim(), usd: c.total });
      }
    }
    const share = [...tally.values()].sort((x, y) => y.usd - x.usd);

    /* append does not filter what h() would — a null child reaching it
       lands in the panel as the word "null" */
    el.append(...[
      h('div', { class: 'cost-top' },
        h('span', { class: 'cost-top-k' }, 'This chat'),
        /* the same dial the button carries, so the panel it opens is
           plainly the same figure enlarged */
        h('span', { class: 'cost-top-r' }, costRing(r.total),
          h('span', { class: 'cost-top-v' }, usd(r.total)))),
      /* A chat with thirty questions in it would run the panel off the
         bottom of the screen. The list is the part that grows, so it is
         the part that scrolls — the total above and the month below stay
         where they are, and the column heads stay with the column. */
      h('div', { class: 'cost-scroll' },
        h('div', { class: 'cost-tbl' },
          h('div', { class: 'cost-hrow' },
            h('span', {}, 'Query'),
            h('span', {}, 'Cost')),
          ...asks.map(x => h('div', { class: 'cost-row' },
            h('span', { class: 'cost-q', title: x.q }, x.q),
            h('span', { class: 'cost-v' }, usd(x.usd))))),
        share.length > 1 ? h('div', { class: 'cost-sect' }, 'Who ran what') : null,
        share.length > 1 ? h('div', { class: 'cost-lines' },
          ...share.map(x => line({
            label: x.name,
            meta: `${x.turns} ${x.turns === 1 ? 'turn' : 'turns'}`,
            usd: x.usd,
          }, r.total, 'who'))) : null),
      /* Sunk onto its own ground at the foot of the panel. It is context
         for the figure above, not another figure — so it gets a quieter
         ground, smaller type and a link rather than a button competing
         with the thing you actually opened this for. */
      h('div', { class: 'cost-month', 'data-out': String(meOut()) },
        h('div', { class: 'cost-month-top' },
          h('span', {}, meOut() ? 'Monthly usage limit reached' : 'Your usage this month'),
          h('b', {}, `${usd0(me.spent)} of ${usd0(me.limit)}`)),
        h('span', { class: 'cost-meter' },
          h('span', { class: 'cost-meter-f', style: `--w:${(mePct * 100).toFixed(0)}%`,
                      'data-hot': String(mePct > 0.8) })),
        h('div', { class: 'cost-month-foot' },
          /* what is left of the month is only useful as the date it comes
             back — "12 days left" asks you to do that sum yourself */
          h('span', {}, meOut()
            ? `Resets on ${me.on}`
            : `${Math.round(mePct * 100)}% used · Resets in `
              + `${me.resets} ${me.resets === 1 ? 'day' : 'days'}`),
          meOut() && MORE_ASKED
            ? h('span', { class: 'cost-waiting' }, 'Request pending')
            : h('button', { class: 'cost-go', type: 'button',
                            onclick: () => {
                              closeMenu();
                              if (meOut()) moreDialog();
                              else toast('Usage reporting comes in the next pass.');
                            } },
                meOut() ? 'Request more' : 'See your usage'))),
    ].filter(Boolean));
  }

  document.body.append(el);
  openMenu = el;
  /* One panel, in one place. It answers the same question wherever you
     asked it from, so opening it from a price halfway down the thread
     and finding it somewhere new reads as a second panel rather than the
     same one. It hangs off the chat's own total whenever that is on
     screen, whichever price was clicked. */
  const home = document.querySelector('.cost-btn') || anchor;
  const r = home.getBoundingClientRect();
  const w = el.offsetWidth, hgt = el.offsetHeight;
  let left = r.right - w;
  if (left < 12) left = r.left;
  el.style.left = Math.max(12, Math.min(left, innerWidth - w - 12)) + 'px';
  el.style.top = (r.bottom + hgt + 14 > innerHeight ? r.top - hgt - 8 : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
}

/* the price of one turn, sitting with the other things you can do to it.
   Same dial, same thresholds as the chat's — a colour that means one
   thing in the header and another under a message means nothing. */
const costChip = (m) => {
  const total = costOf(m).total;
  return h('button', {
    class: 'cost-chip', type: 'button', 'data-band': costBand(total).key,
    title: 'What this turn cost', 'aria-haspopup': 'dialog',
    /* the same panel the header opens — one answer to "what did this
       cost", reachable from either price */
    onclick: (e) => { e.stopPropagation(); costPop(e.currentTarget); },
  }, costRing(total, 'This turn'), h('span', { class: 'cost-chip-v' }, usd(total)));
};

function renderBot(m) {
  const el = m.el;
  if (!el) return;

  if (m.steps.length) {
    if (!m.traceHost) {
      m.traceHost = h('div', { class: 'trace-host' });
      el.append(m.traceHost);
    }
    m.traceHost.replaceChildren(traceEl(m.steps, {
      open: m.traceOpen ?? true,
      onToggle: (v) => { m.traceOpen = v; },
      busy: !!m.thinking,
    }));
  }

  if (m.text && !m.proseEl) {
    m.proseEl = h('div', { class: 'prose' }, ...proseCites(m.text, m.cites, m));
    el.append(m.proseEl);
    /* Some things are better read where they were made. The same component
       the canvas uses, on the same artifact object — edit it here and the
       canvas has the change, because there is only one draft. */
    if (m.sent) {
      el.append(sentCard(m.sent.a, m.sent.to, m.sent.cc, m.sent.when));
    } else if (m.inline && ARTIFACTS[m.inline]) {
      const a = ARTIFACTS[m.inline];
      el.append(h('div', { class: 'msg-inline' }, RENDER[a.kind](a, { inline: true })));
    } else if (m.artifact) el.append(artifactCard(m.artifact));
    el.append(msgActions(m));
    if (m.suggest?.length) el.append(suggestList(m));
    /* the header total is the sum of these, so it moves when one lands,
       and so does what the chat has made */
    paintCost();
    paintArts();
    paintLimit();
  }

  if (m.thinking) threadScroll?.scrollTo({ top: threadScroll.scrollHeight, behavior: 'smooth' });
}

/* ── a question addressed to a person ─────────────────────────
   Tag someone and the assistant stays out of it: what comes back is that
   person, answering from what they actually own. They reply, and then —
   because this is how it goes in a real room — they hand the work on to
   the assistant themselves, which is the moment the artifact gets made. */
const PEER_VOICE = {
  /* Two answers each, then they hand it over. A colleague who replies once
     and immediately produces a deliverable is a script; one you can ask a
     follow-up of is a person. Each reply adds what a record cannot hold —
     the assistant has already read the CRM, and hearing it back in
     somebody's voice is the fastest way to make this look staged. */
  'Matt Rivera': {
    card: 'Owns revenue operations. The approval path you are about to use is one he is rewriting this quarter.',
    replies: [
      'Two of those six I would write off today. Vertex has been chasing a new exec '
        + 'sponsor for three weeks and Atlas is already inside — I think that one is gone '
        + 'and nobody has marked it. Summit has been pushed twice and their champion left '
        + 'in July.',
      'The other four are real. Orion’s analytics add-on is the one I would fight for '
        + '— $120k, and the only thing holding it is Maya going quiet while a Sev-2 has '
        + 'been open nine days. Clear the ticket and that deal moves this month.',
    ],
    queued: 'Sort the at-risk deals by exposure',
    hand: 'Easier to show you than describe it.',
    ask:  '@Assistant give me an interactive view of the quarter — the gap against quota, '
        + 'and the deals carrying it with what each one is waiting on.',
  },
  'John Whitaker': {
    card: 'Sales engineer on security reviews. He has the architecture answers; Legal has the commitments.',
    replies: [
      'That is the reported number. What it does not show is that four of those six have '
        + 'no next step logged — my read is two are already gone and nobody has marked '
        + 'them, which makes commit optimistic rather than short.',
      'If you strip those two out, the gap is $1.1M and it is carried by three deals I '
        + 'would call real. That is a number I can defend in the room. The $0.8M as '
        + 'reported I cannot, because the first question will be about the six.',
    ],
    queued: 'Sort the leaderboard by coverage',
    hand: 'This should go in front of the board, not into a thread.',
    ask:  '@Assistant put the forecast in front of the board as slides — the gap, what is '
        + 'carrying it, and the decision I want out of the room.',
  },
  'Sana Kaur': {
    replies: [
      'Two things from legal. Vertex’s MSA auto-renews on 30 November unless somebody '
        + 'serves notice — if we are writing it off, that has to be said before then or it '
        + 'renews at the old rate. And Atlas sitting on three of these is worth checking '
        + 'against the comparison claims they made in June.',
      'Nothing here is actually blocked on legal. The paper on all six is standard. The '
        + 'only one that needs me is Orion, because the analytics add-on changes the '
        + 'data-processing schedule and that needs a signature, not a conversation.',
    ],
    queued: 'Add the renewal dates to each row',
    hand: 'I will put the paper position in writing so nobody has to ask me twice.',
    ask:  '@Assistant write a position brief on the six at-risk deals — what each is '
        + 'waiting on, and which ones need paper before the quarter closes.',
  },
  'Dan Whitfield': {
    replies: [
      'The hygiene is the story. Four of six with no next step is not a coincidence — they '
        + 'are all on reps carrying more than twelve accounts. Elena has sixteen and four '
        + 'slipping. Marcus has seven and five.',
      'If you change one thing, make a next step mandatory to keep a deal in commit. That '
        + 'alone would have flagged five of these three weeks ago, while there was still '
        + 'time to do something about them.',
    ],
    queued: 'Show days idle on every row',
    hand: 'Let me put the six side by side so it is arguable.',
    ask:  '@Assistant put the six in a tracker — owner, days idle, what is missing, and '
        + 'whether it is in commit.',
  },
  'Priya Raman': {
    card: 'Runs sales for EMEA and NA. Wants the number and the risk in the first sentence.',
    replies: [
      'Three of those six are mine. Pinnacle I would keep — their security questionnaire '
        + 'came back Tuesday and nobody has logged it. Ashford and Quantum I would drop; '
        + 'both went quiet after the pilot and neither has a second contact.',
      'What is not in the numbers: Atlas went 18% under us on Vertex. If they are doing '
        + 'that on the other two, we are not losing on product and the discount desk should '
        + 'hear about it before we lose a fourth.',
    ],
    queued: 'Flag the deals Atlas is present on',
    hand: 'This needs to be in front of the board, not in a thread.',
    ask:  '@Assistant put the quarter in front of the board as slides — the gap, what is '
        + 'carrying it, and the decision I want out of the room.',
  },
  'Ananya Rao': {
    replies: [
      'Reading it as a board would: the six deals are the finding, and they are the last '
        + 'thing on the page. Whoever opens this sees a quota bar first, which is the one '
        + 'number they already know.',
      'I would lead with the $1.49M and the four with no next step. The funnel and the '
        + 'leaderboard are the evidence for it, not the headline.',
    ],
    queued: 'Lead with the six, not the quota bar',
    hand: 'I will write the version that leads with the finding.',
    ask:  '@Assistant write a position brief on the quarter — lead with the six deals and '
        + 'what each is waiting on, and keep the forecast as the evidence.',
  },
  'Grace Coleman': {
    card: 'Runs presales. Knows which of your deals is actually technical and which is a pricing conversation wearing a hat.',
    /* One reply, not two. She is being asked to review, not to present —
       the second thought was restating the first in different words, which
       is what padding sounds like. */
    replies: [
      'Yes — two of those six are waiting on us, not on them. Orion’s analytics '
        + 'add-on has been silent 26 days with nobody named on our side, and Ashford has '
        + 'one contact engaged and no second thread.',
    ],
    queued: 'Mark the two that are waiting on us',
    hand: 'Both of those moved after the view was built, so let me get it current.',
    ask:  '@Assistant update the interactive view on the basis of my mail and yesterday '
        + 'morning’s deal review call. Orion and Ashford both changed.',
  },
};

/* who, if anyone, this message was addressed to */
function taggedPerson(text) {
  const names = (thread?.people || []).map(p => p.name).filter(n => n !== USER.name);
  return names.find(n => text.includes('@' + n)) || null;
}

/* One tag runs the whole thing. Asking someone a question and then having
   to ask again to get the rest is fine in a real room, where the other
   person is real; in a demo it is a hidden second step, and the journey
   stops at the first reply. So the tag starts a sequence — what they know,
   then what it means, then handing it to the assistant, which is the
   moment the artifact gets made. */
let peerRunning = false;

function answer(prompt) {
  /* a conversation building a skill answers as the skill; a prompt that
     carries a skill runs it (skills.js) */
  if (thread?.id?.startsWith('sk-ses-') && typeof skBuildTurn === 'function') return skBuildTurn(ARTIFACTS[thread.id.slice(7)], prompt);
  if (typeof skillAnswer === 'function' && skillAnswer(prompt)) return;
  /* a conversation working on a playbook is asked about that playbook */
  const onPb = ARTIFACTS[lastArtifactIn()];
  if (onPb?.kind === 'playbook' && typeof playbookTurn === 'function') return playbookTurn(onPb, prompt);
  /* a conversation building a request answers as the request */
  const onRq = thread?.id?.startsWith('rq-ses-') ? ARTIFACTS[thread.id.slice(7)] : null;
  if ((onRq || onPb)?.kind === 'request' && typeof requestTurn === 'function') return requestTurn(onRq || onPb, prompt);
  const who = taggedPerson(prompt);
  if (!who) return botTurn(prompt);
  if (peerRunning) return;

  /* Everyone on the roster has something to say. This is the floor for
     anyone who somehow does not — and it is still about the thing on
     screen rather than a shrug. */
  const v = PEER_VOICE[who] || {
    replies: [
      'Reading it now. The part that stands out is the six with no next step — that is a '
        + 'hygiene problem before it is a forecasting one.',
    ],
    hand: 'Worth having it written down rather than argued in a thread.',
    ask:  '@Assistant write a position brief on the quarter — the gap, the six deals '
        + 'carrying it, and what each one is waiting on.',
  };

  const beats = [
    ...v.replies.map(text => ({ text })),
    { text: v.hand },
    { text: v.ask, build: true },
  ];

  /* Both waits are read off the message itself. Typing takes as long as
     typing that much would; the pause after it is how long the person who
     just received it needs. A four-line finding landing in the same beat
     as "easier to show you" is not a conversation, it is a dump. */
  const words = (t) => t.split(/\s+/).length;
  const typeFor = (t) => Math.min(6200, 1250 + words(t) * 60);
  const readFor = (t) => Math.min(5400, 1400 + words(t) * 78);

  peerRunning = true;
  let i = 0;
  const step = () => {
    if (!thread) { peerRunning = false; return; }
    const b = beats[i++];
    thread.typing = [who];
    paintTyping();
    setTimeout(() => {
      if (!thread) { peerRunning = false; return; }
      thread.typing = [];
      paintTyping();
      say('peer', b.text, { from: who, at: 'now' });
      paintThread();
      if (b.build) { peerRunning = false; return botTurn(b.text); }
      setTimeout(step, Math.round(readFor(b.text) * PACE_SCALE));
    }, Math.round(typeFor(b.text) * PACE_SCALE));
  };
  step();
}

/* actions sit under the message and appear on hover, so a quiet thread
   stays quiet and every turn still has its handles */
/* Where to go next, offered under the answer. Each one is a message you
   could have typed; picking it sends it, and the list goes. */
function suggestList(m) {
  const box = h('div', { class: 'sugg' },
    h('div', { class: 'sugg-h' }, 'Suggestions'),
    ...m.suggest.map(t => h('button', { class: 'sugg-it', type: 'button',
      onclick: () => {
        m.suggest = null; box.remove();
        say('user', t); paintThread(); answer(t);
      } },
      h('span', { class: 'sugg-ar', 'aria-hidden': 'true', html: '<svg viewBox="0 0 16 16" fill="none" '
        + 'stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M4 3v5.5a2 2 0 0 0 2 2h6.5"/><path d="M10 8l2.5 2.5L10 13"/></svg>' }),
      h('span', {}, t))));
  return box;
}

function msgActions(m) {
  const act = (label, icon, run) => h('button', {
    class: 'msg-act', type: 'button', 'aria-label': label, title: label,
    html: MI(GLYPHS[icon]), onclick: run,
  });
  const copy = () => {
    navigator.clipboard?.writeText(m.text).then(
      () => toast('Copied.'), () => toast('Could not copy.'));
  };
  return h('div', { class: 'msg-acts' },
    /* First and always visible. The rest of this row is what you can do to
       the turn and waits for the pointer; the price is what the turn
       already cost, and a cost you have to go looking for sensitises
       nobody. */
    m.role === 'bot' && m.text ? costChip(m) : null,
    act('Copy', 'copy', copy),
    m.role === 'bot' && act('Retry', 'retry', () => toast('Retry comes in the next pass.')),
    m.role === 'user' && act('Edit', 'rename', () => toast('Editing comes in the next pass.')),
    m.role === 'bot' && h('button', {
      class: 'msg-act', type: 'button', 'aria-label': 'More', title: 'More',
      'aria-haspopup': 'menu', html: MI(GLYPHS.dots),
      onclick: (e) => {
        e.stopPropagation();
        menu(e.currentTarget, [
          { label: 'Copy',           icon: 'copy',   run: copy },
          { label: 'Move to project', icon: 'project', run: () => toast('Projects come in the next pass.') },
        ]);
      },
    }),
  );
}

/* A name with an @ on it is addressed to that person, and the thread has
   to show it — it is the difference between asking the room and asking
   John, and it is why the assistant stays quiet on the next turn. */
const NAMED = () => ['Assistant', ...(thread?.people || []).map(p => p.name)];

function bubbleText(text) {
  const names = NAMED();
  if (!names.length || text.indexOf('@') < 0) return [text];
  const re = new RegExp('@(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') + ')', 'g');
  const out = [];
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h('span', { class: 'mention' }, '@' + m[1]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function messageEl(m) {
  /* someone arriving is not a turn — it is a note in the margin of one */
  if (m.role === 'system') {
    return h('div', { class: 'msg msg-system' },
      h('span', { class: 'sys-line' }, m.text));
  }

  if (m.role === 'user') {
    return h('div', { class: 'msg msg-user' },
      h('div', { class: 'msg-col' },
        /* a comment knows the thing it was made on; the chip says which */
        m.context ? h('div', { class: 'ctx' },
          h('span', { class: 'ctx-ic', 'aria-hidden': 'true',
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M20.5 12a7.5 7.5 0 0 1-10.9 6.7L4.5 20l1.3-5.1A7.5 7.5 0 1 1 20.5 12z"/>'
                + '</svg>' }),
          h('span', { class: 'ctx-t' }, m.context.where),
          h('span', { class: 'ctx-of' }, m.context.artifact)) : null,
        /* the files you gave it ride above what you asked */
        m.files?.length ? h('div', { class: 'msg-files' }, ...m.files.map(f => h('span', { class: 'msg-file' },
          /\.pdf$/i.test(f.name)
            ? h('span', { class: 'msg-file-pdf', html: '<svg viewBox="0 0 24 24"><path d="M6 2.5h8.5L20 8v12a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5z" fill="#E5484D"/><path d="M14.5 2.5V8H20" fill="#F7A5A7"/><text x="12" y="17.6" text-anchor="middle" font-family="Geist, sans-serif" font-size="5.6" font-weight="700" fill="#fff">PDF</text></svg>' })
            : h('img', { src: brandSrc(/\.xlsx?$/i.test(f.name) ? 'excel' : 'word'), alt: '' }),
          h('span', { class: 'msg-file-t' }, h('span', { class: 'msg-file-n' }, f.name),
            h('span', { class: 'msg-file-m' }, /\.xlsx?$/i.test(f.name) ? 'Excel' : /\.pdf$/i.test(f.name) ? 'PDF' : 'Word'))))) : null,
        h('div', { class: 'bubble' }, ...bubbleText(m.text)),
        msgActions(m)));
  }

  /* Another person says it the way you say it — same bubble, same weight —
     but from the other side, with a face and a name, because in a room of
     four the question "who said that" comes before "what did they say". */
  if (m.role === 'peer') {
    return h('div', { class: 'msg msg-peer' },
      faceEl(m.from, '', { title: m.from }),
      h('div', { class: 'msg-col' },
        h('div', { class: 'peer-who' },
          h('span', { class: 'peer-name' }, m.from),
          m.at ? h('span', { class: 'peer-at' }, m.at) : null),
        h('div', { class: 'bubble' }, ...bubbleText(m.text)),
        msgActions(m)));
  }
  const el = h('div', { class: 'msg msg-bot' });
  /* a repaint builds a new node, so the cached children have to go with the
     old one — otherwise renderBot sees them as already placed and appends
     nothing, leaving an empty turn */
  m.el = el;
  m.traceHost = null; m.proseEl = null;
  queueMicrotask(() => renderBot(m));
  return el;
}

/* ── faces ─────────────────────────────────────────────────────
   Drawn, not lettered. Two initials in a circle is a label for a person;
   at 26px in a row of four you want to recognise them, and a face does
   that faster than reading does. Deterministic from the name, so the same
   person is the same face everywhere — and swap-ready: drop real photos
   in src/assets/people/ and these become <img> without touching anything
   that calls them. */
const FACE_SET = [
  { g1: '#F0E7D6', g2: '#E3D6BC', hair: '#3E2F1B', skin: '#E4BC96', cut: 'crop',  specs: false },
  { g1: '#DFE9E1', g2: '#CBDDD1', hair: '#241C14', skin: '#8A5A3B', cut: 'fade',  specs: true  },
  { g1: '#E8E3F0', g2: '#DAD2E8', hair: '#6B4A2A', skin: '#EAC5A3', cut: 'long',  specs: false },
  { g1: '#F4E3DC', g2: '#E8CFC4', hair: '#5A2E22', skin: '#BE855F', cut: 'curls', specs: false },
  { g1: '#E0E7F1', g2: '#CCD8E8', hair: '#1E2A3C', skin: '#956545', cut: 'crop',  specs: true  },
  { g1: '#ECE9E1', g2: '#DEDACE', hair: '#8A7247', skin: '#EFCCA9', cut: 'long',  specs: false },
];

/* Hair is what tells two people apart at 26px, so it is the thing that
   varies most — a crop, a fade, a bob, curls — with a pair of glasses on
   two of them for good measure. */
const HAIR = {
  crop: 'M14.5 19.5a9.5 9.5 0 0 1 19 0c0-4-2.5-6.2-4.5-6.6-1.8-.4-2.6.6-5 .6s-3.2-1-5-.6'
      + 'c-2 .4-4.5 2.6-4.5 6.6z',
  fade: 'M14.8 18.6a9.2 9.2 0 0 1 18.4 0c.4-4.6-3.4-7.6-9.2-7.6s-9.6 3-9.2 7.6z',
  long: 'M13.2 21c-.6-6 3.2-11 10.8-11s11.4 5 10.8 11c-.5 4.6-1.6 7.4-2.8 9.4-.5.8-1.8.4-1.7-.5'
      + '.4-3.2.2-6.2-.5-8.6-3 1.2-7.4 1.6-11.6 0-.7 2.4-.9 5.4-.5 8.6.1.9-1.2 1.3-1.7.5'
      + '-1.2-2-2.3-4.8-2.8-9.4z',
  curls: 'M14 19.5a9.5 9.5 0 0 1 19 0c1-1.4.3-3.2-1-3.6.5-1.8-.9-3.2-2.3-3-.2-1.8-2-2.8-3.4-2.2'
       + '-.9-1.5-3.1-1.5-4 0-1.4-.6-3.2.4-3.4 2.2-1.4-.2-2.8 1.2-2.3 3-1.3.4-2 2.2-1 3.6z',
};

function faceSvg(name) {
  const f = FACE_SET[+tintOf(name)];
  const id = 'f' + name.replace(/[^a-z]/gi, '');
  /* one head, one pair of shoulders, one sweep of hair — the least a
     drawing can be and still be a particular person */
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${f.g1}"/><stop offset="1" stop-color="${f.g2}"/>
    </linearGradient></defs>
    <circle cx="24" cy="24" r="24" fill="url(#${id})"/>
    <path d="M8 48a16 16 0 0 1 32 0z" fill="${f.skin}"/>
    <circle cx="24" cy="20" r="9.5" fill="${f.skin}"/>
    <path d="${HAIR[f.cut]}" fill="${f.hair}"/>
    ${f.specs ? `<g fill="none" stroke="${f.hair}" stroke-width="1.1" opacity=".85">
      <circle cx="20.2" cy="20.6" r="2.9"/><circle cx="27.8" cy="20.6" r="2.9"/>
      <path d="M23.1 20.4h1.8"/></g>` : ''}
  </svg>`;
}

/* Three photographs, three people who need one. Matt and Grace are who
   this account invites; the third belongs to the account itself, because
   the one face you see on every screen was the one still drawn. */
const PHOTOS = {
  'Matt Rivera':   'assets/people/matt-rivera.jpg',
  'Grace Coleman': 'assets/people/grace-coleman.jpg',
  'Roger Bennett': 'assets/people/john-whitaker.jpg',
};

const faceEl = (name, cls = '', attrs = {}) => h('span', Object.assign({
  class: 'peer-av' + (cls ? ' ' + cls : ''),
  'data-tint': tintOf(name),
  html: PHOTOS[name]
    ? `<img src="${PHOTOS[name]}" alt="">`
    : faceSvg(name),
}, attrs));

/* Who is in here, and who is in here right now. Faces overlap because the
   count matters more than any one of them, and the ring is what separates a
   person who is present from a person who merely has access. */
/* ── in a shared chat, the assistant is a participant ──────────────
   The moment somebody else is in here, "does it reply to everything?"
   becomes a real question — two people talking to each other do not
   want a third voice in every gap. One switch, above the box, and only
   once there is somebody to share it with. */
let repHost = null;
const repOn = () => !thread || thread.assistant !== false;

/* two heads at the weight of the words beside them */
const PPL_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="9.2" cy="9.4" r="3"/><path d="M3.8 19a5.4 5.4 0 0 1 10.8 0"/>'
  + '<path d="M16.4 6.7a2.9 2.9 0 0 1 0 5.4M18 19a5.5 5.5 0 0 0-1.9-4.2"/></svg>';

function paintReplies() {
  if (!repHost) return;
  const many = (thread?.people || []).length > 1;
  repHost.dataset.on = String(many);
  if (!many) return repHost.replaceChildren();
  const sw = h('button', {
    class: 'arep-sw', type: 'button', role: 'switch',
    'aria-checked': String(repOn()), 'aria-label': 'Assistant replies',
    /* no toast: the switch has just moved under the pointer, which is
       the whole confirmation — a black card over the box you are about
       to type in says it again, louder, in the way */
    onclick: () => { thread.assistant = !repOn(); paintReplies(); },
  }, h('span', { class: 'arep-knob', 'aria-hidden': 'true' }));
  /* on the other side of the same line: who else this is open to. A
     name while it is one person, a count once it is a room. */
  const others = (thread.people || []).filter(p => p.name !== USER.name);
  const said = others.length === 1 ? `Shared with ${others[0].name}`
                                   : `Shared with ${others.length} people`;
  const who = h('button', {
    class: 'arep-w', type: 'button', title: 'Who this is shared with',
    onclick: (e) => { e.stopPropagation(); shareDialog?.(); },
  },
    h('span', { class: 'arep-mk', 'aria-hidden': 'true', html: PPL_IC }),
    h('span', {}, said));
  repHost.replaceChildren(who,
    h('span', { class: 'arep-r' },
      h('span', { class: 'arep-l' }, 'Assistant replies'), sw));
}

let presenceHost = null;
function paintPresence() {
  if (!presenceHost) return;
  /* Everyone here except you. Presence answers "who else is in this with
     me" — your own face in the row is the one that tells you nothing, and
     it is the one that has no photograph, so it was doing double damage. */
  const people = (thread?.people || []).filter(p => p.online && p.name !== USER.name);
  if (!people.length) return presenceHost.replaceChildren();

  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  /* replaceChildren renders a bare null as the text "null" */
  presenceHost.replaceChildren(h('button', {
    class: 'presence-btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
    title: 'Who is in this chat',
    onclick: (e) => { e.stopPropagation(); peopleMenu(e.currentTarget, people); },
  }, ...[
    h('div', { class: 'presence-stack' }, shown.map(p =>
      faceEl(p.name, 'presence-av', {
        title: p.name + (p.owner ? ' · owner' : ''),
      }))),
    rest > 0 ? h('span', { class: 'presence-more' }, `+${rest}`) : null,
  ].filter(Boolean)));
}

/* the stack answers "how many"; this answers "who, and can they change it" */
function peopleMenu(anchor, people) {
  const row = (p) => h('div', { class: 'ppl-row' },
    faceEl(p.name, 'ppl-face'),
    h('span', { class: 'ppl-main' },
      h('span', { class: 'ppl-name' },
        p.name, p.name === USER.name ? h('span', { class: 'sh-you' }, 'you') : null),
      h('span', { class: 'ppl-mail' }, mailOf(p.name))),
    h('span', { class: 'ppl-role' }, p.owner ? 'Owner' : 'Editor'));

  const el = h('div', { class: 'menu ppl-menu', role: 'menu', 'aria-label': 'People in this chat' },
    h('div', { class: 'ppl-sec' }, `In the chat · ${people.length}`),
    ...people.map(row));

  closeMenu();
  document.body.append(el);
  openMenu = el;
  anchor.setAttribute('aria-expanded', 'true');
  const r = anchor.getBoundingClientRect();
  el.style.top = Math.min(r.bottom + 8, innerHeight - el.offsetHeight - 12) + 'px';
  el.style.left = Math.max(12, Math.min(r.left + r.width / 2 - el.offsetWidth / 2,
                                       innerWidth - el.offsetWidth - 12)) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
}

/* A comment sent to the assistant arrives as a message that says where it
   came from, because "make this shorter" needs a referent. The location
   rides along as context rather than being pasted into the sentence — the
   person wrote the sentence, not the machine. */
function sendComment(a, where, text, key) {
  if (!thread) { const ses = SESSIONS.find(x => x.artifact === a.id); if (ses) openSession(ses); }
  if (!thread) return;
  /* the next turn needs to know what was clicked, not only what was typed —
     "update this to Q3 Forecast Against Quota" is meaningless without it */
  say('user', text, { context: { artifact: a.name, where, id: a.id, key: key || where } });
  paintThread();
  answer(text);
}

/* What the last thing said was attached to. It rides on the message
   rather than in a variable the next turn has to find still set — a
   one-shot global was surviving my tests and not the demo. */
const commentOn = () => {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const m = thread.messages[i];
    if (m.role === 'user') return m.context?.id ? m.context : null;
  }
  return null;
};

/* Renaming the thing you have your finger on. A comment is already
   pointing at a heading, so the sentence does not have to name it again —
   "Update to Q3 Forecast against quota" is the whole instruction, and
   requiring a "this" in the middle of it is why it did not fire. What is
   required is a verb and a word joining it to the new text, so that a
   comment which is a question or a complaint stays one. */
const RENAME_MATCH = new RegExp(
  '^(?:can you\\s+|could you\\s+|please\\s+|pls\\s+|just\\s+)*'
  + '(?:update|change|rename|retitle|edit|reword|make|set|call|title)'
  + '(?:\\s+(?:this|it|that|the)(?:\\s+(?:title|heading|header|label|name|text|card|one))?)?'
  + '\\s+(?:to|as|into|say|says|reads?)\\s+'
  + '[:\u201c\u2018"\']?\\s*(.+?)'
  + '(?:\\s+(?:instead|please|pls|thanks|thx))*[.!?\u201d\u2019"\']*\\s*$', 'i');

/* "Rename this Q3 Forecast" — the same instruction with the joining word
   left out, which only reads as a rename for verbs that mean renaming. */
const RENAME_BARE = new RegExp(
  '^(?:can you\\s+|could you\\s+|please\\s+|pls\\s+|just\\s+)*'
  + '(?:rename|retitle|title|call)\\s+(?:this|it|that)\\s+'
  + '[:\u201c\u2018"\']?\\s*(.+?)'
  + '(?:\\s+(?:instead|please|pls|thanks|thx))*[.!?\u201d\u2019"\']*\\s*$', 'i');

const renameTo = (t) => {
  const m = RENAME_MATCH.exec(t) || RENAME_BARE.exec(t);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
};

/* ── sharing the conversation ──────────────────────────────────
   The artifact belongs to the thread that made it, so "who can see this"
   is one question asked once — here, beside the people already in it, and
   not once per file over on the canvas. It runs the same dialog: adding
   someone as an editor is what puts them in the room. */
/* Where a chat stops being worth continuing. It is the same five dollars
   the dial turns red at, so the colour and the notice say one thing. */
const SESSION_CAP = 5;

let limitHost = null;
/* A long chat is expensive for a reason people can act on: every turn is
   charged for the whole thread behind it, so the tenth question costs
   more than the first did for the same work. The answer is a new chat,
   which is why that is the only thing this offers. */
function paintLimit() {
  if (!limitHost || !thread) return;
  const total = threadCost();
  if (thread.limitOff || total < SESSION_CAP) {
    limitHost.replaceChildren();
    limitHost.dataset.on = 'false';
    return;
  }
  limitHost.dataset.on = 'true';
  limitHost.replaceChildren(h('div', { class: 'lim' },
    /* the same dial the header carries, so the notice is plainly about
       the figure up there rather than a second thing gone wrong */
    costRing(total),
    h('div', { class: 'lim-main' },
      h('span', { class: 'lim-t' }, 'Session cost too high'),
      h('span', { class: 'lim-s' },
        `${usd(total)} is above the ${usd0(SESSION_CAP)} limit for one session.`)),
    h('button', { class: 'lim-go', type: 'button',
                  onclick: () => { thread = null; threadScroll = null; go('home'); } },
      'Start a new chat'),
    h('button', {
      class: 'lim-x', type: 'button', 'aria-label': 'Dismiss', title: 'Dismiss',
      onclick: () => { thread.limitOff = true; paintLimit(); },
    }, '\u00d7')));
}

let cappedHost = null;
function paintCapped() {
  if (!cappedHost) return;
  const me = meUsage();
  const asked = MORE_ASKED;
  cappedHost.dataset.state = asked ? 'waiting' : 'out';
  cappedHost.replaceChildren(
    h('span', { class: 'capped-ic', 'aria-hidden': 'true',
      html: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" '
          + 'stroke="currentColor" stroke-width="2.5"/></svg>' }),
    h('div', { class: 'capped-main' },
      h('span', { class: 'capped-t' },
        asked ? 'Request pending approval'
              : 'You have reached your monthly usage limit'),
      /* "$250 of $250 used" is the same fact twice — the title already
         says there is none left. What somebody needs is the date. */
      h('span', { class: 'capped-s' },
        asked ? `${usd0(asked)} of additional usage requested. Your limit resets on ${me.on}.`
              : `Your limit resets on ${me.on}.`)),
    asked
      ? h('span', { class: 'capped-tag' }, 'Requested')
      : h('button', { class: 'capped-go', type: 'button', onclick: moreDialog }, 'Request more'));
}

const cappedBar = () => {
  cappedHost = h('div', { class: 'capped' });
  paintCapped();
  return cappedHost;
};

let costHost = null;
/* The running total for the chat, beside Share because both answer
   questions about the chat as a whole rather than about a message. */
function paintCost() {
  if (!costHost || !thread) return;
  const total = threadCost();
  costHost.replaceChildren(h('button', {
    class: 'xp-btn cost-btn', type: 'button',
    title: `This chat has cost ${usd(total)}`,
    'data-band': costBand(total).key,
    'aria-haspopup': 'dialog',
    onclick: (e) => { e.stopPropagation(); costPop(e.currentTarget); },
  },
    /* A number in a box is a readout. The currency mark set small and
       faint against the figure in the display face is a price, which is
       what this is — and it is the whole of the treatment, because a
       header is not the place to explain the month. */
    costRing(total),
    h('span', { class: 'cost-cur', 'aria-hidden': 'true' }, '$'),
    h('span', { class: 'cost-btn-v' }, total.toFixed(2))));
}

let shareHost = null;
function paintShare() {
  if (!shareHost || !thread) return;
  thread.publish = thread.publish || {
    people: (thread.people || [{ name: USER.name, owner: true }])
      .map(p => ({ name: p.name, role: p.owner ? 'owner' : 'edit' })),
    general: 'me',
    generalRole: 'view',
    published: false,
  };
  const P = thread.publish;
  const scope = P.published ? P.general : 'me';

  const btn = h('button', {
    class: 'xp-btn xp-share', type: 'button', 'data-scope': scope,
    'data-state': P.published ? 'live' : 'off',
    title: P.published ? `Shared · ${scopeSummary(P)}` : 'Only the people here can view this chat',
    onclick: (e) => {
      e.stopPropagation();
      publishDialog({
        name: thread.title, kind: 'chat', publish: P,
        url: `${location.host}${location.pathname}#chat/${thread.id}`,
      }, () => {
        /* an editor is in the room; keep presence and the dialog agreeing */
        joinChat(P.people.filter(x => x.role === 'edit').map(x => x.name));
        paintShare();
      });
    },
  },
    h('span', { class: 'xp-lock', 'aria-hidden': 'true', html: pubIcon(scope) }),
    'Share');

  shareHost.replaceChildren(btn);
}

/* Everything this conversation produced, in the order it appeared. A
   chat that made three things should not make you scroll back through
   the transcript to reopen the second one. */
function threadArts() {
  const seen = [];
  for (const m of (thread?.messages || [])) {
    const id = m.artifact || m.inline || m.sent?.a?.id;
    if (id && !seen.includes(id)) seen.push(id);
  }
  return seen.map(id => ARTIFACTS[id]).filter(Boolean);
}

let artsHost = null;
function paintArts() {
  if (!artsHost) return;
  const made = threadArts();
  /* nothing made, nothing to open — a button that opens an empty list is
     furniture */
  if (!made.length) { artsHost.replaceChildren(); return; }
  const btn = h('button', {
    class: 'icon-btn icon-btn-canvas', type: 'button',
    'aria-label': made.length === 1 ? `Open ${made[0].name}` : 'What this chat made',
    title: made.length === 1 ? made[0].name
      : `${made.length} things this chat made`,
    'aria-haspopup': made.length === 1 ? null : 'menu',
    onclick: (e) => {
      e.stopPropagation();
      /* one thing made, one click — a menu of one is a question with a
         single answer */
      if (made.length === 1) return openArtifact(made[0]);
      menu(e.currentTarget, made.map(a => ({
        label: a.name, html: kindMark(a.kind), run: () => openArtifact(a),
      })));
    },
  });
  btn.append(icon('artifacts'));
  if (made.length > 1) btn.append(h('span', { class: 'icon-btn-n' }, String(made.length)));
  artsHost.replaceChildren(btn);
}

/* ── the queue ─────────────────────────────────────────────────
   One assistant, three people. This does not belong in the transcript:
   the transcript is what happened, a queue is what has not happened yet,
   and it changes under you while you read — which is exactly what a
   record must not do. So it stacks on the composer — a face and the words
   somebody asked for, and a way to take one back. Nothing else: the order
   is the order they are in, and "waiting" is what being in a queue means,
   so saying it on every row is saying it twice. */
/* Hidden until you ask for it with Q. What other people have queued is
   worth being able to check, not worth a permanent block of somebody
   else's words sitting on the box you type in. */
let queueHost = null, queueShown = false;
function paintQueue() {
  if (!queueHost) return;
  const q = (thread?.queue || []).filter(x => x.state !== 'done');
  const on = queueShown && q.length > 0;
  queueHost.dataset.on = String(on);
  if (!on) return queueHost.replaceChildren();

  queueHost.replaceChildren(
    h('div', { class: 'q-head' }, 'Queued'),
    ...q.map((x) => h('div', {
    class: 'q-row', 'data-state': x.state,
  },
    faceEl(x.from, 'q-face', { title: x.from }),
    h('span', { class: 'q-ask' }, x.ask),
    h('button', {
      class: 'q-x', type: 'button',
      'aria-label': `Remove ${x.from.split(' ')[0]}’s request`, title: 'Remove',
      onclick: () => {
        thread.queue = thread.queue.filter(y => y !== x);
        paintQueue();
        toast('Removed from the queue.');
      },
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
          + 'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    }))));
}

/* ── who is typing ─────────────────────────────────────────────
   Slack's rule, because it is the right one: the strip lives against the
   composer, not in the transcript, since a half-written message is not
   part of the record. It never pushes the thread around — it occupies its
   line whether or not anyone is typing — and past two people it stops
   naming them, because at that point the fact is that the room is busy.  */
let typingHost = null;
function paintTyping() {
  if (!typingHost) return;
  const who = thread?.typing || [];
  typingHost.dataset.on = String(who.length > 0);
  if (!who.length) return typingHost.replaceChildren();

  const said = who.length === 1 ? `${who[0].split(' ')[0]} is typing`
    : who.length === 2 ? `${who.map(n => n.split(' ')[0]).join(' and ')} are typing`
    : `${who.length} people are typing`;

  typingHost.replaceChildren(
    h('span', { class: 'typing-faces' },
      who.slice(0, 3).map(n => faceEl(n, 'typing-av', { title: n }))),
    h('span', { class: 'typing-said' }, said),
    h('span', { class: 'typing-dots', 'aria-hidden': 'true' },
      h('i', {}), h('i', {}), h('i', {})));
}

/* Held behind T. It ran on a loop before, which meant the room appeared to
   be typing at you the whole time you were reading. */
let typingTimer = null;
function runTypingDemo() {
  clearTimeout(typingTimer);
  if (!thread?.people) return;
  const others = thread.people.filter(p => p.online && p.name !== USER.name).map(p => p.name);
  if (others.length < 2) return;

  /* one, then two, then quiet — the shape a real room makes */
  const beats = [
    [2200, [others[0]]],
    [2600, [others[0], others[1]]],
    [1800, others.slice(0, 3)],
    [2400, [others[1]]],
    [5200, []],
  ];
  let i = 0;
  const step = () => {
    if (!thread?.people) return;
    if (i >= beats.length) { thread.typing = []; paintTyping(); typingTimer = null; return; }
    const [hold, who] = beats[i];
    thread.typing = who;
    paintTyping();
    i++;
    typingTimer = setTimeout(step, hold);
  };
  typingTimer = setTimeout(step, 200);
}

let threadScroll = null;
function paintThread() {
  if (!threadScroll) return;
  threadScroll.replaceChildren(
    h('div', { class: 'thread-inner' }, thread.messages.map(messageEl)));
  paintCost();
  paintArts();
  threadScroll.scrollTo({ top: threadScroll.scrollHeight, behavior: 'smooth' });
}

register('thread', () => {
  if (!thread) return h('div', { class: 'view-inner' }, h('p', { class: 'muted' }, 'No conversation yet.'));

  threadScroll = h('div', { class: 'thread-scroll' });
  presenceHost = h('div', { class: 'presence' });
  typingHost = h('div', { class: 'typing', 'aria-live': 'polite', 'data-on': 'false' });
  queueHost = h('div', { class: 'queue-dock', 'data-on': 'false' });
  queueShown = false;
  shareHost = h('div', { class: 'thread-share' });
  costHost = h('div', { class: 'thread-cost' });
  artsHost = h('div', { class: 'thread-arts' });
  limitHost = h('div', { class: 'lim-dock', 'data-on': 'false' });
  repHost = h('div', { class: 'arep', 'data-on': 'false' });
  paintShare();
  paintCost();
  paintArts();
  paintLimit();
  paintPresence();
  paintReplies();
  paintQueue();
  paintTyping();

  const el = h('div', { class: 'thread' },
    h('header', { class: 'thread-head' },
      h('button', {
        class: 'thread-title', type: 'button',
        'aria-haspopup': 'menu',
        onclick: (e) => {
          e.stopPropagation();
          menu(e.currentTarget, [
            { label: 'Pin',             icon: 'pin',     key: 'P', run: () => toast('Pinned.') },
            { label: 'Mark as unread',  icon: 'unread',  key: 'U', run: () => toast('Marked unread.') },
            { label: 'Rename',          icon: 'rename',  key: 'R', run: renameThread },
            { label: 'Add to project',  icon: 'project', more: true, run: () => toast('Projects come in the next pass.') },
            { rule: true },
            { label: 'Delete',          icon: 'trash',   key: 'D', danger: true, run: () => toast('Deleting comes in the next pass.') },
          ]);
        },
      },
        h('span', { class: 'thread-title-text' }, thread.title),
        h('span', { class: 'caret', 'aria-hidden': 'true' })),
      presenceHost,
      costHost,
      shareHost,
      h('div', { class: 'thread-actions' },
        artsHost,
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'More actions',
          'aria-haspopup': 'menu',
          html: MI(GLYPHS.dots),
          onclick: (e) => {
            e.stopPropagation();
            menu(e.currentTarget, [
              { label: 'View files in chat', icon: 'files',   run: () => toast('No files in this conversation yet.') },
              { label: 'Rename',             icon: 'rename',  run: () => toast('Renaming comes in the next pass.') },
              { label: 'Pin chat',           icon: 'pin',     run: () => toast('Pinned.') },
              { label: 'Archive',            icon: 'archive', run: () => toast('Archived.') },
              { label: 'Delete',             icon: 'trash',   danger: true, run: () => toast('Deleting comes in the next pass.') },
              { rule: true },
              { label: 'Move to project',    icon: 'project', run: () => toast('Projects come in the next pass.') },
            ]);
          },
        }),
      ),
    ),
    threadScroll,
    h('div', { class: 'thread-dock' },
      h('div', { class: 'askwrap' },
        /* the notice sits above the queue and the typing line, because it
           is about the chat rather than about this moment in it */
        meOut() ? null : limitHost,
        /* typing first: the queue is glued to the composer by a negative
           margin, so anything between the two gets pulled underneath it */
        typingHost,
        queueHost,
        /* the last thing above the box, so it reads as part of it */
        repHost,
        /* Out of usage is not a message you can send, so there is no
           box to type it in. What replaces the composer says when the
           month comes back and offers the only thing left to do. */
        meOut() ? cappedBar() : h('div', { class: 'ask ask-mini',
          html: '<textarea rows="1" aria-label="Write a message" placeholder="Write a message…"></textarea>' +
                '<div class="askbar"><button class="send" type="button" disabled aria-label="Send">' + ARROW + '</button></div>',
        }),
      ),
    ),
  );

  queueMicrotask(() => {
    paintThread();
    initComposer(el.querySelector('.ask'), {
      agents: agentPicks(), skills: SKILL_LIST, projects: PROJECT_LIST,
      /* @ reaches the people in this conversation, with their faces —
         resolved when the menu opens, since they join after this runs */
      inThread: true,
      people: () => (thread?.people || [])
        .filter(p => p.name !== USER.name)
        .map(p => ({ label: p.name, mark: faceEl(p.name, 'tokface').outerHTML })),
      onSend: (text) => {
        say('user', text); paintThread();
        /* switched off, it is a chat between people — unless somebody
           calls it in by name */
        if (repOn() || /@?assistant\b/i.test(text)) answer(text);
      },
    });
  });

  return el;
});

/* ── first run ───────────────────────────────────────────────
   A separate address serves the same app with one thing added: below the
   composer, the four systems this assistant reads from, and what each one
   buys you. Somebody opening this for the first time has nothing in it
   yet, and the fastest way to make it theirs is to connect the tools they
   already work in. Off everywhere else — a card telling you to connect
   Outlook on your fortieth visit is furniture. */
const CONNECTORS = [
  { id: 'outlook',    name: 'Outlook',
    say: 'Summarise threads and answer from your own inbox and calendar.' },
  { id: 'teams',      name: 'Teams',
    say: 'Read your messages and meetings \u2014 recaps, decisions, who owes what.' },
  { id: 'sharepoint', name: 'SharePoint',
    say: 'Search your team\u2019s sites and get the document with the answer.' },
  { id: 'onedrive',   name: 'OneDrive',
    say: 'Search your own files and the ones shared with you.' },
];

/* One shared answer to "is Outlook connected", read by the first-run card
   and by the + menu, so the two can never disagree. Signing in brings mail
   with it; the rest you choose. */
const CONNECTED = new Set(['outlook']);

/* Every surface showing connection state repaints from the set, so
   connecting in one place lands in the other. */
function paintConnections() {
  document.querySelectorAll('.cx-row').forEach(r => {
    const on = CONNECTED.has(r.dataset.app);
    const btn = r.querySelector('.cx-go');
    btn.replaceChildren(on ? 'Connected' : 'Connect');
    btn.classList.toggle('is-on', on);
    btn.disabled = on;
    r.classList.toggle('is-done', on);
  });
  document.querySelectorAll('[data-appmenu]').forEach(m => m.dispatchEvent(new Event('repaint')));
}

const connectCard = () => {
  const row = (c) => {
    const btn = h('button', { class: 'cx-go', type: 'button' }, 'Connect');
    const connect = () => { CONNECTED.add(c.id); paintConnections(); };
    btn.onclick = connect;
    /* the row takes a pointer cursor, so the row has to do something —
       a hand over dead space is a promise the page does not keep */
    const el = h('div', { class: 'cx-row', 'data-app': c.id, onclick: connect },
      h('span', { class: 'cx-mark', 'aria-hidden': 'true',
                  html: `<svg viewBox="0 0 24 24"><use href="#b-${c.id}"></use></svg>` }),
      h('span', { class: 'cx-main' },
        h('span', { class: 'cx-name' }, c.name),
        h('span', { class: 'cx-say' }, c.say)),
      btn);
    return el;
  };
  const card = h('div', { class: 'cx' },
    h('div', { class: 'cx-head' },
      h('span', {}, 'Connect your tools to get started'),
      h('button', {
        class: 'cx-x', type: 'button', 'aria-label': 'Dismiss', title: 'Dismiss',
        /* Dismissing has to say where the thing went, or it reads as
           having thrown the connectors away rather than put them down. */
        onclick: () => {
          card.remove();
          toast('You can connect these any time from Settings.');
        },
      }, '\u00d7')),
    h('div', { class: 'cx-list' }, CONNECTORS.map(row)));
  queueMicrotask(paintConnections);
  return card;
};

/* ── waiting on you ──────────────────────────────────────────
   Four of the Do List's own items, under the composer, on the days you
   are not being onboarded. Somebody opening a new chat usually has
   something already waiting on them, and the shortest way in is the
   thing itself rather than a blank box. A row opens the session that
   does the work; a row you are not going to do today can be put down.
   Same card as the connectors above it — one icon, one line, one
   control — because the two do the same job at different moments. */
const HOME_TASKS = [
  'Get Halden the expansion pricing you promised on Tuesday',
  'Prepare for the Sentinel evaluation session on Wednesday',
  'Send Vantage the data residency answer before their renewal review',
  'Follow up with Fieldstone \u2014 nobody has replied in twelve days',
];

/* Dismissals last the session, so a row you put down on the home screen
   does not come back the next time you open a new chat. */
const HOME_DROPPED = new Set();

const taskCard = () => {
  const items = HOME_TASKS
    .map(t => DO_ITEMS.find(x => x.task === t))
    .filter(it => it && !HOME_DROPPED.has(it.task));
  if (!items.length) return null;

  const list = h('div', { class: 'cx-list' });

  const row = (it) => {
    /* the session, then the artifact it produced — the same pair the Do
       List's own View session opens, so the two doors lead to one room */
    const open = () => {
      openSession(doSession(it));
      queueMicrotask(() => openArtifact(doDoc(it)));
    };
    const gone = () => {
      HOME_DROPPED.add(it.task);
      el.remove();
      if (!list.children.length) card.remove();
    };
    /* The Do List's own ring, because these are the Do List's own items —
       a task carries a box to tick, not the logo of the inbox it came
       out of. Where it came from is in the line underneath. */
    const box = h('button', {
      class: 'do-box', type: 'button', role: 'checkbox', 'aria-checked': 'false',
      'aria-label': `Mark done: ${it.task}`, title: 'Mark done',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" '
          + 'stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12.5l4.5 4.5L18.5 7"/></svg>',
      onclick: (e) => {
        e.stopPropagation();
        box.setAttribute('aria-checked', 'true');
        el.classList.add('is-done');
        setTimeout(gone, 320);
      },
    });
    const el = h('div', { class: 'cx-row', onclick: open },
      box,
      h('span', { class: 'cx-main' },
        h('span', { class: 'cx-name' }, it.task),
        h('span', { class: 'cx-say' }, it.ref)),
      /* Both controls wait for the pointer and both hold their width the
         whole time, so a row at rest is only the task and the reason. */
      h('span', { class: 'cx-acts' },
        h('button', { class: 'cx-drop', type: 'button',
                      onclick: (e) => { e.stopPropagation(); gone(); } }, 'Dismiss'),
        h('button', { class: 'cx-go', type: 'button' }, 'View')));
    return el;
  };

  list.append(...items.map(row));

  const card = h('div', { class: 'cx cx--do' },
    h('div', { class: 'cx-head' },
      h('span', {}, 'Waiting on you'),
      h('button', { class: 'cx-all', type: 'button',
                    onclick: () => go('dolist') }, 'See all')),
    list);
  return card;
};

/* The built first-run page carries the flag on <body>; ?first=1 turns it on
   anywhere, which is what makes it testable against the dev server. */
const firstRun = () => document.body.dataset.firstrun === 'true'
  || new URLSearchParams(location.search).has('first');

/* Two headings for Home, kept side by side while we choose: the quill
   above the question (the default), or the quill and "Ask Clavia" as one
   lockup. N swaps them; a reload always comes back to the first. */
let homeLayout = 'stack';
function homeHead() {
  return homeLayout === 'sign'
    /* the lockup, in the identity study's proportions */
    ? h('div', { class: 'home-head home-head--sign' },
        quillEl('greet', { cls: 'home-quill', then: 'idle' }),
        h('h1', { class: 'display' }, 'Ask Clavia'))
    : h('div', { class: 'home-head' },
        quillEl('greet', { cls: 'home-glyph', then: 'idle' }),
        h('h1', { class: 'display' }, 'How can I help you today?'));
}

register('home', () => {
  /* Clavia's home is the greeting and the ask box, nothing under them */
  const wrap = h('div', { class: 'home' },
    homeHead(),
    h('div', { class: 'askwrap' },
      h('div', { class: 'ask',
        html: '<textarea rows="2" aria-label="Ask anything" ' +
              'placeholder="Ask anything, or hand over a piece of work…"></textarea>' +
              '<div class="askbar"><button class="send" type="button" disabled ' +
              'aria-label="Send">' + ARROW + '</button></div>',
      }),
    ),
  );

  /* the composer wires itself once the node is in the document, because it
     measures its own menus to decide which way they open */
  queueMicrotask(() => {
    const composer = initComposer(wrap.querySelector('.ask'), {
      agents: agentPicks(),
      skills: SKILL_LIST,
      projects: PROJECT_LIST,
      onSend: startThread,
    });
    /* arriving from a vault or a file with "Ask Clavia": it is already attached */
    for (const p of mxTakePills()) composer.addPill(p);
  });

  return wrap;
});

/* Placeholder views — one per rail item, replaced as each is built. */

/* ────────────────────────────────────────────────────────────
   Do List

   Not a list of everything that could be done. A ranked list of what most
   needs this person, and every item says why it is here in its own
   sentence, so nobody opens the source email to find out.

   A row is three things in the order you would ask them: what the task
   is, why it is on the list and why now, and what has already been done
   about it. The project it belongs to sits above in grey with the systems
   it came from, and the archive is on the row, because the fastest answer
   to a task is often "not this one".
------------------------------------------------------------------ */

/* Obligation, in descending order of how much it has earned the right to
   interrupt. A commitment was made out loud; a suggestion is inference,
   and has to clear a much higher bar to appear at all. */
const KI = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

/* Two labels, because there are only two things worth saying about why a
   task is here: you said you would, or nobody asked and the assistant
   thinks it is worth a look. Everything else is just work, and labelling
   it "assigned" or "blocking" told you nothing the sentence had not. */
const DO_KIND = {
  commitment: { label: 'Commitment', tone: 'green',
    ic: KI('<path d="M9 11.5V5.4a1.6 1.6 0 0 1 3.2 0v5.1"/>'
         + '<path d="M12.2 10.5V4.6a1.6 1.6 0 0 1 3.2 0v6"/>'
         + '<path d="M15.4 11V6.6a1.6 1.6 0 0 1 3.2 0v8.2a5.6 5.6 0 0 1-5.6 5.6h-1.3a5 5 0 0 1-3.7-1.6L5 15.2a1.6 1.6 0 0 1 2.3-2.2L9 14.6"/>') },
  assigned:   { label: null, tone: 'plum' },
  suggested:  { label: 'Suggested', tone: 'sand',
    ic: KI('<path d="M9.2 17.4a6 6 0 1 1 5.6 0"/><path d="M9.4 17.4h5.2v1.8a2.6 2.6 0 0 1-5.2 0z"/>'
         + '<path d="M10.5 21.2h3"/>') },
};


const DO_ITEMS = [
  { cat: 'Halden — 120-seat expansion', src: ['salesforce', 'gmail'],
    kind: 'commitment', due: 'today', urgent: true,
    task: 'Get Halden the expansion pricing you promised on Tuesday',
    desc: 'Deal desk approved the structure on Friday and you told **Rachel** you would have '
        + 'numbers to her by today. Their board meets Thursday, and if the pricing is not in '
        + 'front of them this week the whole expansion moves a quarter.',
    ref: 'Their board meets Thursday',
    ready: [
      'Three structures priced against the approved discount floor',
      'What each does to their unit cost, which is the number Rachel will be asked',
      'The 36-month option flagged — better for them, and it is what deal desk prefers',
    ],
    from: [
      { src: 'salesforce', t: 'Halden Manufacturing — expansion', m: '$380k · Proposal' },
      { src: 'gmail',      t: 'Re: pricing for 120 more seats', m: 'Rachel · Tuesday' },
      { src: 'drive',      t: 'Deal desk — approved floor', m: 'Friday' },
    ],
    act: 'Review pricing', cta: 'Send to Rachel' },

  { cat: 'Vantage — renewal Feb', src: ['outlook', 'salesforce'],
    kind: 'commitment', due: null, age: 'Thursday', urgent: false,
    task: 'Send Vantage the data residency answer before their renewal review',
    desc: 'Their head of IT asked on the QBR which region the Context Graph is built in and '
        + 'what our model providers see. You said you would come back this week and it is '
        + 'Thursday. Their renewal review is in February and anything unanswered now becomes '
        + 'a condition then.',
    ref: 'Promised on the QBR · this week',
    ready: [
      'Where the graph is built, where it is stored, and what leaves the region',
      'The three model providers named, with what each actually receives',
      'Checked against the signed DPA so nothing here contradicts it',
    ],
    from: [
      { src: 'outlook',    t: 'Vantage QBR — recording and notes', m: 'Monday' },
      { src: 'salesforce', t: 'Vantage Labs — renewal FY27', m: '$540k · February' },
      { src: 'sharepoint', t: 'Data residency — architecture note', m: 'Platform' },
    ],
    act: 'Review draft', cta: 'Send to Vantage' },

  { cat: 'Brightpath — rollout paused', src: ['gmail', 'slack'],
    kind: 'commitment', due: 'today', urgent: true,
    task: 'Send Brightpath the answers on document sharing you promised yesterday',
    desc: 'Their IT lead has paused the rollout to the wider team until he understands who '
        + 'can see a proposal or an SOW once it is shared — he read "anyone with the link" '
        + 'in our docs and stopped there. You told him on the call you would have it in '
        + 'writing by this morning, and **Dev** has since confirmed the two things you were '
        + 'not sure about.',
    ref: 'Promised on the call · this morning',
    ready: [
      'A one-pager on the four publish scopes, written for an IT lead rather than for us',
      'His two questions from the 22nd answered by name',
      'SCIM left out — it is on the roadmap and he will ask for a date we cannot give',
    ],
    from: [
      { src: 'gmail', t: 'Re: Brightpath — who can see a shared SOW', m: '22 Aug · two open' },
      { src: 'slack', t: '#eng-platform — Dev confirmed the scopes', m: 'Yesterday 18:20' },
      { src: 'drive', t: 'Sharing and access — v3.gdoc', m: 'Product · 4 days ago' },
    ],
    act: 'Review draft', cta: 'Send to Brightpath' },

  { cat: 'Trellis — DPA', src: ['gmail', 'slack'],
    kind: 'commitment', due: null, age: 'No reply, 11 days', urgent: true,
    task: 'Chase legal on the Trellis DPA before the quarter closes',
    desc: 'It has been with legal since the 21st and nobody has picked it up — the original '
        + 'went to someone who has since left. The sub-processor list now names our three '
        + 'model providers, which is the part Trellis will read first. Nothing about this '
        + 'deal closes until it comes back.',
    ref: 'Sent 11 days ago · no reply',
    ready: [
      'A chaser written short, to Sana, who owns DPAs now',
      'The two clauses Trellis flagged last time, with what we agreed on Halden',
      'A note for Friday: if nothing comes back, this goes to legal ops rather than the thread',
    ],
    from: [
      { src: 'gmail', t: 'Trellis DPA — for review', m: 'You, 11 days ago' },
      { src: 'slack', t: '#legal-requests — no owner assigned', m: 'Still open' },
    ],
    act: 'Review chaser', cta: 'Send it' },

  { cat: 'Redwood — security review', src: ['sharepoint', 'salesforce'],
    kind: 'assigned', due: 'tomorrow', urgent: true,
    task: 'Get the six open questions on the Redwood review answered',
    desc: 'Forty questions came back and thirty-four are the same as the last three reviews. '
        + 'The six that are new are all about the Context Graph, and they need a product '
        + 'answer rather than one from you. It goes back tomorrow and this is the last thing '
        + 'holding a $420k proposal.',
    ref: 'Back to them · tomorrow',
    ready: [
      'Thirty-four answered from the last three reviews, word for word',
      'The six new ones drafted from what product has said elsewhere',
      'Two flagged as things we genuinely do not do — better said now than found later',
    ],
    from: [
      { src: 'sharepoint', t: 'Redwood — security review.xlsx', m: 'Due tomorrow' },
      { src: 'sharepoint', t: 'Answer library — last three reviews', m: 'Security' },
      { src: 'salesforce', t: 'Redwood — platform', m: '$420k · Proposal' },
    ],
    act: 'Review answers', cta: 'Send to Redwood' },

  { cat: 'Trellis — sync delays', src: ['slack', 'sharepoint'],
    kind: 'assigned', due: 'today', urgent: true,
    task: 'Decide what you are telling Trellis about the sync delays',
    desc: 'Forty tickets are open on Salesforce records arriving hours late and eleven of '
        + 'them are Trellis. Support has been holding replies since Friday. Their renewal '
        + 'is February and their admin has now raised it twice in-app as well as by email.',
    ref: '11 of their tickets held · since Friday',
    ready: [
      'What engineering actually said, in one line, and the real ship date',
      'A reply for Trellis specifically, not the standard one support sends',
      'Three things not to promise in it, including anything about a row limit',
    ],
    from: [
      { src: 'slack',      t: '#support-escalations — Meera', m: 'Friday, twice since' },
      { src: 'slack',      t: '#eng-connectors — the sync fix', m: 'Merged 29 Aug' },
      { src: 'sharepoint', t: 'Open tickets — Salesforce sync', m: '40 · 11 Trellis' },
    ],
    act: 'Review reply', cta: 'Send to Trellis' },

  { cat: 'Sentinel — evaluation', src: ['gmail', 'salesforce'],
    kind: 'assigned', due: null, age: 'Wednesday', urgent: false,
    task: 'Prepare for the Sentinel evaluation session on Wednesday',
    desc: 'Third session of their evaluation, and the first since the security review stalled in July. **Mark** has been quiet for '
        + 'twelve days while Shrabani’s comp work kept moving, so the room will open by '
        + 'asking what changed and who owns it now. Their renewal is in May.',
    ref: 'Evaluation session · Wednesday 11:00',
    ready: [
      'Where each of the four workstreams actually stands, not where the plan says',
      'The three questions they are most likely to lead with',
      'What we are asking them for, so the meeting is not only a report',
    ],
    from: [
      { src: 'gmail',      t: 'Sentinel — security review thread', m: 'Quiet 12 days' },
      { src: 'gmail',      t: 'Sentinel — pilot scope', m: 'Moving' },
      { src: 'salesforce', t: 'Sentinel — account plan', m: 'QBR Wednesday' },
    ],
    act: 'Review prep', cta: 'Share the prep' },

  { cat: 'Halden — QBR', src: ['salesforce', 'drive', 'gmail'],
    kind: 'commitment', due: null, age: 'Friday', urgent: false,
    task: 'Build the QBR deck for Halden on Friday',
    desc: 'Their CIO is in the room for the first time and **Elena** has asked twice for '
        + 'the deck so she can pre-read it with him on Thursday. It is a $420k account that '
        + 'renews in September, adoption has doubled since March, and the two open '
        + 'escalations are the thing that will get raised if we do not raise them first.',
    ref: 'Halden QBR · Friday 14:00',
    ready: [
      'Nine slides built from their usage, their tickets and the last two QBRs',
      'Adoption, support and the two escalations, with the numbers checked against the CRM',
      'Three asks for the room, so it is a conversation rather than a report',
    ],
    from: [
      { src: 'salesforce', t: 'Halden — account plan', m: '$420k · renews September' },
      { src: 'drive',      t: 'Usage — Halden, last 4 quarters.gsheet', m: 'Data team' },
      { src: 'gmail',      t: 'Re: QBR deck — can I pre-read?', m: 'Elena, twice' },
    ],
    act: 'Review deck', cta: 'Send to Elena' },

  { cat: 'Fieldstone — renewal FY27', src: ['gmail', 'salesforce'],
    kind: 'suggested', due: null, age: 'No reply, 12 days', urgent: false,
    task: 'Follow up with Fieldstone — nobody has replied in twelve days',
    desc: 'Their champion left in July, your last three emails have gone unanswered, and '
        + 'Atlas has been on site twice in three weeks. $640k renews on 30 November whether '
        + 'anyone answers or not. Twelve days of silence on a renewal this size is itself '
        + 'the news.',
    ref: 'Renews 30 November · no reply 12 days',
    ready: [
      'A short mail to the CFO rather than the thread that has gone dead',
      'Two names from their org who have opened the last three emails',
      'What the auto-renew actually means for them, since nobody there may know',
    ],
    from: [
      { src: 'gmail',      t: 'Re: FY27 renewal — Fieldstone', m: 'You, three times, no reply' },
      { src: 'salesforce', t: 'Fieldstone — Renewal FY27', m: '$640k · Negotiation' },
    ],
    act: 'Review follow-up', cta: 'Send it', no: 'Not needed' },

  { cat: 'Harborview — seat expansion', src: ['gmail'],
    kind: 'suggested', due: null, age: 'Quiet 3 weeks', urgent: false,
    task: 'Follow up with Harborview — the expansion has been quiet three weeks',
    desc: 'Pushed twice, and the champion who wanted it left in July. Nobody has picked up '
        + 'the thread since. It is either dead or it needs a new sponsor, and three weeks of '
        + 'nothing is the point at which you find out which.',
    ref: 'Pushed twice · quiet 3 weeks',
    ready: [
      'A short mail that asks the question directly rather than checking in',
      'The one person still opening our emails, from their side',
    ],
    from: [
      { src: 'gmail',      t: 'Harborview — 40 seats', m: 'Quiet since 12 Aug' },
      { src: 'salesforce', t: 'Harborview — seat expansion', m: '$210k · Proposal' },
    ],
    act: 'Review follow-up', cta: 'Send it', no: 'Not needed' },

  { cat: 'Trellis — agent beta', src: ['gmail', 'slack'],
    kind: 'suggested', due: null, age: 'Quiet 9 days', urgent: false,
    task: 'Follow up with Trellis on the beta feedback nobody answered',
    desc: 'They wrote up nine things after two weeks running agents on their own data and it '
        + 'has sat for nine days. Four are already fixed in 4.1. Going back with that before '
        + 'their February renewal is worth more than the reply itself.',
    ref: 'Their feedback · 9 days old',
    ready: [
      'Their nine, sorted into fixed, planned, and not doing',
      'A reply that says which is which without promising anything new',
    ],
    from: [
      { src: 'gmail', t: 'Agent beta — nine things', m: 'Trellis · 9 days ago' },
      { src: 'slack', t: '#beta — the same nine, discussed', m: 'Last week' },
    ],
    act: 'Review reply', cta: 'Send it', no: 'Not needed' },
];

/* The right-hand phrase: the single fact about timing, said in the terms
   that actually decide whether this gets done today. */
const doWhen = (x) =>
  x.due === 'today' ? { t: 'Due today', tone: 'hot' }
  : x.due === 'tomorrow' ? { t: 'Due tomorrow', tone: 'warm' }
  : { t: x.age || 'Waiting', tone: 'cool' };

/* "Relevant" was the assistant grading its own homework — everything here
   is relevant, that is what earned it a place. This week is a fact. */
const DO_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DO_FILTERS = [
  { id: 'all',    label: 'All',           fn: () => true },
  { id: 'today',  label: 'Due today',     fn: (x) => x.due === 'today' },
  { id: 'week',   label: 'Due this week', fn: (x) => x.due === 'today' || x.due === 'tomorrow'
      || DO_WEEK.some(d => (x.age || '').includes(d)) },
  { id: 'commit', label: 'Commitments',   fn: (x) => x.kind === 'commitment' },
  { id: 'urgent', label: 'Urgent',        fn: (x) => x.urgent },
  { id: 'sugg',   label: 'Suggestions',   fn: (x) => x.kind === 'suggested' },
];

const SNOOZE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M20.4 13.2a8.4 8.4 0 1 1-7.6-8.36"/><path d="M12 7.6V12l2.8 1.7"/>'
  + '<path d="M16.4 3.6h4.2l-4.2 4.6h4.2"/></svg>';

const PICK_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M5 12.5l4.5 4.5L19 7"/></svg>';

const DOTS_IC = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">'
  + '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/>'
  + '<circle cx="18.5" cy="12" r="1.6"/></svg>';

/* Priority is not a field somebody fills in — it falls out of what the
   thing is, who is waiting, and when. Typed by hand it drifts within a
   week; derived it cannot. */
const doPriority = (x) =>
  x.pri ? DO_PRI.find(p => p.t === x.pri)
  : x.due === 'today' || (x.urgent && x.kind === 'commitment') ? { t: 'High', tone: 'hot' }
  : x.due === 'tomorrow' || x.urgent ? { t: 'Medium', tone: 'warm' }
  : x.kind === 'suggested' ? { t: 'Low', tone: 'cool' }
  : { t: 'Medium', tone: 'warm' };

/* The due date said as a date rather than as a mood. */
const doDue = (x) =>
  x.when ? x.when
  : x.due === 'today' ? 'Today'
  : x.due === 'tomorrow' ? 'Tomorrow'
  : x.age && /^No reply|^Quiet/.test(x.age) ? x.age.replace(/^No reply, /, 'Overdue · ')
  : x.age || 'No date';

/* Both fields are editable, so both need a list of what they can be. */
const DO_PRI = [
  { t: 'High',   tone: 'hot'  },
  { t: 'Medium', tone: 'warm' },
  { t: 'Low',    tone: 'cool' },
];
const DO_WHEN = ['Today', 'Tomorrow', 'This week', 'Next week', 'No date'];

const DUE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
  + 'stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.4"/>'
  + '<path d="M3.5 9.6h17M8 3.5v3M16 3.5v3"/></svg>';

const doMark = (id) =>
  `<svg class="do-src" viewBox="0 0 24 24" aria-hidden="true"><use href="#b-${id}"></use></svg>`;

const FIND_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.6"/>'
  + '<path d="M16 16l4.6 4.6"/></svg>';

const ARCHIVE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="3" y="4" width="18" height="4.2" rx="1.4"/>'
  + '<path d="M5 8.2V19a1.4 1.4 0 0 0 1.4 1.4h11.2A1.4 1.4 0 0 0 19 19V8.2"/>'
  + '<path d="M10 12h4"/></svg>';


/* ── what the action actually opens ───────────────────────────
   "Review prep" that only ticks a row off is a button pretending. Each
   item has a thing that was written for it, and pressing the action opens
   it in the canvas — a document for a prep or a position, a deck where
   the output is a deck. It is an ordinary artifact, so it comments,
   versions and publishes like every other one. */
const DO_DOCS = {
  'Send Brightpath the answers on document sharing you promised yesterday': {
    kind: 'doc', name: 'Brightpath — who can see a shared document', ext: 'docx',
    sub: 'For their IT lead · promised this morning',
    blocks: [
      { t: 'h1', v: 'Who can see a shared document' },
      { t: 'meta', v: 'UnifyApps · for Brightpath Logistics · September 2026' },
      { t: 'p', v: 'Sharing a document — a proposal, an SOW, an architecture note — gives it its own address. Who can open that address is a choice made at the moment of sharing, and it can be changed afterwards without breaking the link. Nothing is public by default.' },
      { t: 'h2', v: 'The four choices' },
      { t: 'ul', v: [
        '<b>People in this chat</b> — only the people the conversation was shared with. This is the default and it is the narrowest.',
        '<b>Everyone at Brightpath</b> — anyone signed in to your workspace. They still have to sign in; there is no anonymous access.',
        '<b>Restricted</b> — a named list of people and groups you choose, plus whoever was already in the chat.',
        '<b>Public</b> — anyone with the link, no sign-in. It is the only option that leaves your workspace, and it has to be chosen deliberately.',
      ] },
      { t: 'p', v: 'The phrase your team read in our docs — "anyone with the link" — describes the last of these four, not all of them.' },
      { t: 'h2', v: 'The two things you asked' },
      { t: 'ul', v: [
        '<b>Can somebody re-share what I published?</b> Not beyond the scope you set. A Viewer cannot widen it; only the owner and workspace Admins can. Changing the scope takes effect immediately on the same link.',
        '<b>What happens when someone leaves?</b> Their access ends with their account. Anything they shared stays, and ownership moves to the workspace Owner unless you name someone at the point of removal.',
      ] },
      { t: 'h2', v: 'What an Admin can see' },
      { t: 'p', v: 'Workspace Admins can list every shared document, its scope, and who has opened it. That list is exportable, which is usually what an audit actually wants. Nobody at UnifyApps can see the contents of a shared document unless you share it with us.' },
      { t: 'h2', v: 'What we would suggest for the rollout' },
      { t: 'ul', v: [
        'Turn Public off at the workspace level for now. It can be enabled per team later.',
        'Leave the default at People in this chat, which is where it already is.',
        'Run the shared-document export once a month for the first quarter.',
      ] },
      { t: 'quote', v: 'Internal note, strip before sending: SCIM lands in 4.4 and he will ask for a date. Do not give one before January.' },
    ],
  },

  'Get Halden the expansion pricing you promised on Tuesday': {
    kind: 'sheet', name: 'Halden — 120-seat expansion pricing', ext: 'xlsx',
    sub: 'For Rachel · their board meets Thursday',
    sheets: [
      {
        name: 'Three ways',
        cols: ['Option', 'Term', 'Seats', 'Per seat', 'Year 1', 'Unit cost vs today'],
        widths: [176, 90, 76, 96, 108, 168],
        formulaCell: 'D2', formula: '£31.60',
        rows: [
          ['A — as today',      '12 months', '120', '£38.00', '£54,720', 'No change'],
          ['B — volume tier',   '12 months', '120', '£33.20', '£47,808', 'Down 13%'],
          ['C — 36 months',     '36 months', '120', '£31.60', '£45,504', 'Down 17%'],
          ['—', '—', '—', '—', '—', 'C is inside the approved floor and is what deal desk prefers'],
        ],
      },
      {
        name: 'What it costs them',
        cols: ['', 'Today', 'Option B', 'Option C', 'Note'],
        widths: [160, 100, 100, 100, 340],
        formulaCell: 'B2', formula: '340',
        rows: [
          ['Seats',            '340', '460', '460', ''],
          ['Annual',      '£155,040', '£202,848', '£200,544', 'Including the existing 340'],
          ['Per seat',      '£38.00', '£36.75', '£36.33', 'Blended across the whole account'],
          ['Uplift at renewal', '—', 'Capped 5%', 'Capped 3%', 'The 36-month term is where the cap comes from'],
        ],
      },
    ],
  },

  'Send Vantage the data residency answer before their renewal review': {
    kind: 'deck', name: 'Vantage — where your data lives', ext: 'pptx',
    sub: 'For their head of IT · promised on the QBR',
    slides: [
      { kicker: 'Your question', title: 'Where does the Context Graph keep our data?',
        bullets: ['Asked on the QBR, 1 September',
                  'Three parts: where it is built, where it is stored, what leaves',
                  'Answered against the DPA you have already signed'],
        notes: 'Their words, not ours. It shows this is an answer rather than a pitch.',
        sources: ['outlook'] },
      { kicker: 'Built', title: 'The graph is built in your region and stays there',
        bullets: ['EU workloads run in eu-west-1, start to finish',
                  'Indexing, embedding and retrieval all happen in-region',
                  'No copy of your content is held outside it'],
        notes: 'This is the answer to the question they actually asked.',
        sources: ['sharepoint'] },
      { kicker: 'Stored', title: 'What is stored, and for how long',
        bullets: ['Content is not stored — the graph holds references and embeddings',
                  'Embeddings are encrypted at rest, keys rotated every 90 days',
                  'Deleting a source removes its references within the hour'],
        notes: 'The "not stored" line matters to them. Say it plainly.',
        sources: ['sharepoint'] },
      { kicker: 'Leaves', title: 'What goes to a model provider, and what does not',
        bullets: ['The prompt and the retrieved passages. Nothing else.',
                  'Three providers, all under zero-retention terms',
                  'No training on your data, contractually, with all three'],
        notes: 'Name the three if asked. Do not name them on the slide.',
        sources: ['sharepoint'] },
      { kicker: 'Controls', title: 'What you can turn off',
        bullets: ['Per-connector: exclude a source from the graph entirely',
                  'Per-workspace: pin to a single model provider',
                  'Per-artifact: block sharing outside the workspace'],
        notes: 'Ends on what is in their hands rather than ours.',
        sources: ['drive'] },
      { kicker: 'In writing', title: 'What we will send after this',
        bullets: ['The architecture note, unredacted, under the NDA you have',
                  'The sub-processor list as it stands today',
                  'Confirmation in January before the February review'],
        notes: 'Commit to the January note. That is the one that gets forgotten.',
        sources: ['outlook'] },
    ],
  },

  'Chase legal on the Trellis DPA before the quarter closes': {
    kind: 'doc', name: 'Chaser — Trellis DPA', ext: 'docx',
    sub: 'To Sana · sent 11 days ago',
    blocks: [
      { t: 'h1', v: 'Trellis DPA — eleven days, no owner' },
      { t: 'meta', v: 'To Sana Kaur · the original went to Tom, who has left' },
      { t: 'quote', v: 'Hi Sana — the Trellis DPA has been with legal since the 21st and I do not think it has an owner; the original went to Tom. Nothing on this deal closes until it comes back, and it is in the quarter. Two clauses were flagged last time and both are in the attached version: the sub-processor notice period, and the audit right. Is there a date I can give them?' },
      { t: 'h2', v: 'What is attached' },
      { t: 'ul', v: [
        'The DPA as sent on the 21st, unchanged',
        'The two clauses marked, with what we agreed on the Halden deal in June',
        'The sub-processor list, which now names our three model providers',
      ] },
      { t: 'h2', v: 'The part they will read first' },
      { t: 'p', v: 'The sub-processor list changed in July. Trellis security team reviewed the old one, so this is effectively a new document to them and it is worth flagging rather than letting them find it. All three are under zero-retention terms and that is stated on the list itself.' },
      { t: 'h2', v: 'If nothing comes back by Friday' },
      { t: 'p', v: 'This has been raised at three standups. If Friday passes with no owner it goes to legal ops as a request rather than a fourth message on the same thread — chasing the thread again is what has not worked for eleven days.' },
    ],
  },

  'Decide what you are telling Trellis about the sync delays': {
    kind: 'doc', name: 'Trellis — what to say about the sync delays', ext: 'docx',
    sub: 'Eleven of their tickets held · renewal February',
    blocks: [
      { t: 'h1', v: 'Salesforce sync — what to tell Trellis' },
      { t: 'meta', v: 'For their admin · eleven open tickets · renewal February' },
      { t: 'p', v: 'Short version: <b>the fix is in 4.2 and 4.2 ships on 18 September.</b> The ticket still says the 11th — that was the original release date and the release slipped a week on the 2nd. Nothing about the fix changed, only the date around it.' },
      { t: 'h2', v: 'What is actually happening' },
      { t: 'p', v: 'Records in objects with more than about 200 fields are queued behind smaller ones and can arrive four to six hours late. It is not data loss, it is ordering, and it affects their Opportunity object specifically because of the custom fields they added in June.' },
      { t: 'h2', v: 'The reply' },
      { t: 'quote', v: 'Thanks for staying on this, and sorry it has taken a week to come back with something firm. Records on objects with a lot of custom fields have been queuing behind smaller ones and arriving late — your Opportunity object is the one affected. The fix is done and ships on 18 September. Until then we can run a manual sync for you each morning; say the word and I will set that up from tomorrow.' },
      { t: 'h2', v: 'Why this one is not the standard reply' },
      { t: 'p', v: 'Eleven of the forty open tickets are theirs, their admin has raised it twice in-app as well as by email, and their renewal is in February. Support sending the generic note here is worse than saying nothing — it reads as a queue rather than an account.' },
      { t: 'h2', v: 'What not to say' },
      { t: 'ul', v: [
        '<b>Not "the next release".</b> They have been told that twice already and have quoted it back once.',
        '<b>Not a field limit.</b> The fix removes the queueing; it does not cap fields.',
        '<b>Not "a known issue".</b> It is fixed and dated. Known issue reads as unfixed.',
      ] },
      { t: 'h2', v: 'Worth doing anyway' },
      { t: 'p', v: 'Offer the morning manual sync whether or not they ask. It costs support ten minutes a day for a fortnight and it is the thing that gets remembered in February.' },
    ],
  },

  'Get the six open questions on the Redwood review answered': {
    kind: 'sheet', name: 'Redwood — the six open questions', ext: 'xlsx',
    sub: 'Back to them tomorrow · $420k',
    sheets: [{
      name: 'New questions',
      cols: ['#', 'Question', 'Draft answer', 'Precedent', 'Status'],
      widths: [42, 262, 320, 168, 100],
      formulaCell: 'A2', formula: '35',
      rows: [
        ['35', 'What does the Context Graph store about our documents?',
         'References and embeddings, not the content itself. Deleting a source removes its references within the hour.',
         'Same answer, Halden, June', 'Confirmed'],
        ['36', 'Which region is the graph built and stored in?',
         'The region you choose. EU workloads run start to finish in eu-west-1.',
         'Same answer, Trellis, May', 'Confirmed'],
        ['37', 'Who at UnifyApps can see our content?',
         'Nobody, unless you share it with us on a support case. Access is logged and time-boxed.',
         'Same answer, three times', 'Confirmed'],
        ['38', 'Do your model providers train on our data?',
         'No. All three are under zero-retention, no-training terms.',
         'Same answer, Halden', 'Confirmed'],
        ['39', 'Can we hold our own encryption keys?',
         'Not today. Keys are ours and rotate every 90 days.',
         'We have said no before', 'Flag'],
        ['40', 'Can you commit to four-hour breach notification?',
         'We commit to 72 hours. Four is not something we can hold.',
         'Never been asked', 'Flag'],
      ],
    }],
  },

  'Prepare for the Sentinel evaluation session on Wednesday': {
    kind: 'doc', name: 'Sentinel — session 3 prep', ext: 'docx',
    sub: 'Wednesday 11:00 · prospect, in evaluation',
    blocks: [
      { t: 'h1', v: 'Sentinel — evaluation session 3' },
      { t: 'meta', v: '11:00–12:00 · Mark Feltner, Shrabani Burman, two from their ops team' },
      { t: 'p', v: 'Third session of their evaluation, and the first since the security review stalled in July. The room will open by asking what changed and who owns it now, so it is better to lead with that than to be asked.' },
      { t: 'h2', v: 'Where the four workstreams actually are' },
      { t: 'ul', v: [
        '<b>Sales comp</b> — live, 340 users, and the thing that is going well. Shrabani has run it since June with no escalations.',
        '<b>VMO</b> — stalled. Their sponsor moved teams in July and nobody replaced him. Twelve days quiet on the thread.',
        '<b>Field service</b> — in build, on track, nothing to say beyond that.',
        '<b>Partner portal</b> — scoped in March, never started. Worth asking whether it is still real.',
      ] },
      { t: 'h2', v: 'The three questions they will lead with' },
      { t: 'ul', v: [
        'What happened to the VMO work — answer with the sponsor, not with the roadmap.',
        'Why the comp rollout took eleven weeks — it took eleven weeks because they added two approval layers in week four, and it is worth saying so.',
        'What the renewal looks like — May, and they will ask early. A number now is worse than a range.',
      ] },
      { t: 'h2', v: 'What we want out of the room' },
      { t: 'ul', v: [
        'A named owner for VMO on their side, or a decision to stop it.',
        'Agreement to a partner portal scoping session, or to drop it from the plan.',
        'An introduction to whoever runs field ops, who we have never met.',
      ] },
      { t: 'quote', v: 'Do not open with the comp numbers. They are good, and opening on the thing that went well makes the VMO question feel like it is being avoided.' },
    ],
  },

  'Build the QBR deck for Halden on Friday': {
    kind: 'deck', name: 'Halden — Q3 business review', ext: 'pptx',
    sub: 'Friday 14:00 · their CIO in the room',
    slides: [
      { kicker: 'Q3 review', title: 'Halden and UnifyApps',
        bullets: ['Fourth quarter together · renewal September 2026',
                  '1,240 seats across four teams',
                  'For: Elena Ruiz, Marcus Bell (CIO), and the platform team'],
        notes: 'Marcus has not been in one of these before. Names on the slide, and say '
             + 'his out loud in the first minute.',
        sources: ['salesforce'] },

      { kicker: 'Where we are', title: 'Adoption doubled, and it held',
        bullets: ['Weekly actives 412 → 806 since March',
                  '68% of licensed seats used in the last 30 days, up from 34%',
                  'Field ops is the growth — 210 of the new 394 sit there'],
        notes: 'Lead with the number that is true rather than the one that flatters. 68% is '
             + 'good; it is not 100% and Marcus will do that arithmetic himself.',
        sources: ['drive'] },

      { kicker: 'What changed', title: 'What we shipped for you this quarter',
        bullets: ['Custom roles — asked for in the March review, live in 4.1',
                  'Salesforce sync at five-minute intervals, down from hourly',
                  'The export you raised in June, now scheduled rather than manual'],
        notes: 'All three came from them. Say that — it is the difference between a roadmap '
             + 'slide and a relationship slide.',
        sources: ['drive'] },

      { kicker: 'Where it is rough', title: 'The two escalations still open',
        bullets: ['<b>Salesforce sync delays</b> — 6 tickets, fix ships 18 September',
                  '<b>SSO session length</b> — raised twice, no date yet, and that is on us',
                  'Both are ours to close. Neither needs anything from you.'],
        notes: 'Put this before the good news about support. If they raise it first we look '
             + 'like we were hoping they would not.',
        sources: ['sharepoint'] },

      { kicker: 'Support', title: 'How the quarter actually ran',
        bullets: ['54 tickets, down from 71',
                  'Median first response 2.1 hours against a 4-hour commitment',
                  'Two missed the SLA, both in the sync escalation above'],
        notes: 'Name the two misses. Volunteering them is worth more than the median.',
        sources: ['sharepoint'] },

      { kicker: 'Value', title: 'What it has been worth',
        bullets: ['Field ops closing 22% more work orders per week since June',
                  'Average handling time down 3.4 minutes on their measure, not ours',
                  '£310k of avoided headcount, on the model their finance team built'],
        notes: 'Use their model, not ours. Elena built it in July and it is defensible in '
             + 'front of Marcus in a way ours is not.',
        sources: ['drive'] },

      { kicker: 'Next', title: 'What we would do next quarter',
        bullets: ['Agents for the field ops triage queue — the highest-volume manual step',
                  'Roll out to the 180 seats in service that have never signed in',
                  'A monthly usage review with the platform team, thirty minutes'],
        notes: 'Three, not seven. A long list reads as us not knowing which one matters.',
        sources: ['drive'] },

      { kicker: 'Asks', title: 'Three things we need from you',
        bullets: ['A named owner for the SSO change on your side',
                  'Two hours with field ops to scope the triage agent',
                  'An introduction to whoever runs service, for the 180 unused seats'],
        notes: 'This is the slide that makes it a business review rather than a report. Do '
             + 'not skip it because the room is senior.',
        sources: [] },

      { kicker: 'Renewal', title: 'September, and what we would like to talk about',
        bullets: ['Renews 30 September 2026, current shape',
                  'Worth discussing: the 180 unused seats, and a multi-year option',
                  'We will bring a proposal in June, not August'],
        notes: 'Say June out loud. Last time we came in August and it cost us three weeks '
             + 'of their procurement cycle.',
        sources: ['salesforce'] },
    ],
  },

  'Follow up with Fieldstone — nobody has replied in twelve days': {
    kind: 'mail', name: 'Fieldstone — mail to the CFO', ext: '',
    sub: '$640k · renews 30 November',
    to: [{ n: 'Tom Beckett', e: 'tom.beckett@fieldstone.com' }],
    cc: [{ n: 'Priya Raman', e: 'priya.raman@unifyapps.com' }],
    subject: 'FY27 renewal — 30 November',
    blocks: [
      { t: 'p', v: 'Hi Tom,' },
      { t: 'p', v: 'I have not managed to reach anyone on the renewal since James left, so I '
              + 'am writing to you directly rather than letting a date pass quietly.' },
      { t: 'p', v: 'Your agreement renews on <b>30 November</b> at the current rate unless '
              + 'notice is served before then. That may well be what you want — I only want to '
              + 'be sure it is a decision rather than a default.' },
      { t: 'p', v: 'Two things that might help:' },
      { t: 'ul', v: [
        'I can put fifteen minutes in with whoever has picked up James’s work.',
        'If it is easier, I can send a one-page summary of what you are on today and what '
          + 'the options are — no meeting needed.',
      ] },
      { t: 'p', v: 'Either way, a one-line reply is enough. I would rather hear no than hear '
              + 'nothing.' },
      { t: 'p', v: 'Best,<br>Rohan' },
    ],
  },

  'Chase legal on the Trellis DPA before the quarter closes': {
    kind: 'mail', name: 'Chaser — Trellis DPA', ext: '',
    sub: 'To Sana · sent 11 days ago',
    to: [{ n: 'Sana Kaur', e: 'sana.kaur@unifyapps.com' }],
    cc: [{ n: 'Priya Raman', e: 'priya.raman@unifyapps.com' }],
    subject: 'Trellis DPA — eleven days, no owner',
    blocks: [
      { t: 'p', v: 'Hi Sana,' },
      { t: 'p', v: 'The Trellis DPA has been with legal since the 21st and I do not think it '
              + 'has an owner — the original went to Tom, who has left. Nothing on this deal '
              + 'closes until it comes back, and it is in the quarter.' },
      { t: 'p', v: 'Two clauses were flagged last time and both are in the version attached:' },
      { t: 'ul', v: [
        'The sub-processor notice period — thirty days, as agreed on Halden in June.',
        'The audit right, unchanged from the executed Halden paper.',
      ] },
      { t: 'p', v: 'One thing worth flagging: <b>the sub-processor list changed in July</b> and '
              + 'now names our three model providers. Trellis security team reviewed the old '
              + 'one, so this is effectively a new document to them.' },
      { t: 'p', v: 'Is there a date I can give Priya?' },
      { t: 'p', v: 'Thanks,<br>Rohan' },
    ],
  },

  'Follow up with Harborview — the expansion has been quiet three weeks': {
    kind: 'mail', name: 'Harborview — the direct question', ext: '',
    sub: '$210k · pushed twice · quiet 3 weeks',
    to: [],
    cc: [],
    subject: 'The forty seats — still on?',
    blocks: [
      { t: 'p', v: 'Hi,' },
      { t: 'p', v: 'The forty-seat expansion has been quiet since August and I would rather '
              + 'ask than keep it on a forecast that is not real.' },
      { t: 'p', v: '<b>Is this still something you want this year?</b>' },
      { t: 'ul', v: [
        'If it is, I will get you a revised proposal this week.',
        'If it is not, that is genuinely fine and I will stop chasing it.',
      ] },
      { t: 'p', v: 'Either answer is useful to me. No answer is the only one that is not.' },
      { t: 'p', v: 'Best,<br>Rohan' },
    ],
  },

  'Follow up with Trellis on the beta feedback nobody answered': {
    kind: 'sheet', name: 'Trellis beta — their nine', ext: 'xlsx',
    sub: 'Nine points · 9 days old · renewal February',
    sheets: [{
      name: 'Their feedback',
      cols: ['#', 'What they said', 'Where it stands', 'What to tell them'],
      widths: [42, 300, 132, 320],
      formulaCell: 'C2', formula: 'Fixed',
      rows: [
        ['1', 'Agent loses context between sessions', 'Fixed', 'Fixed in 4.1, live now'],
        ['2', 'No way to see what the agent read', 'Fixed', 'The trace panel, 4.1'],
        ['3', 'Salesforce records arrive late', 'Fixed', '4.2, 18 September'],
        ['4', 'Search misses partial words', 'Fixed', '4.1'],
        ['5', 'Cannot hand a task to a colleague', 'Planned', '4.2'],
        ['6', 'Wants a dark theme', 'Planned', 'No date — say so'],
        ['7', 'API returns 500 on an empty filter', 'Planned', 'Bug, this sprint'],
        ['8', 'Wants per-field permissions', 'Not doing', 'On the list, no date'],
        ['9', 'Wants us to match a competitor screen', 'Not doing', 'Say no plainly'],
      ],
    }],
  },
};

/* Anything without a hand-written artifact still opens something real:
   the sentence that put it on the list, what was prepared, and what it
   was read out of — which is the document a person would have written. */
/* ── what the brief had written for it ──
   A prepared document is an artifact like any other: it opens in the
   canvas on the right, it versions, it can be commented on and sent. The
   brief only holds the name of it. */
const PREP_DOCS = {
  'Data residency': {
    kind: 'doc', ext: 'docx', sub: 'Written this morning',
    blocks: [
      /* the page is called what the row that opened it is called */
      { t: 'h1', v: 'Data residency' },
      { t: 'meta', v: 'Where Vantage data is held, and what leaves the region' },
      { t: 'p', v: 'This is the answer to the two questions asked on the QBR on '
        + '28 August. Nothing in it is new commitment \u2014 all of it is already '
        + 'in the signed DPA, and the clause is named at the foot.' },
      { t: 'h2', v: 'Where it is built' },
      { t: 'p', v: 'EU tenants build and store in <b>eu-west-1</b>. The Context '
        + 'Graph, the index and every derived artifact stay in region. Nothing '
        + 'leaves it except model traffic, which is the second question.' },
      { t: 'h2', v: 'What the model providers receive' },
      { t: 'ul', v: [
        '<b>Two providers</b> receive text spans with identifiers already removed '
          + 'by the redaction pass, which runs in region before anything is sent.',
        '<b>One provider</b> receives embeddings only and never sees text.',
        'None of the three retains anything under our terms.',
      ] },
      { t: 'h2', v: 'Retention' },
      { t: 'p', v: 'Thirty days, and it is thirty because what is held is '
        + 'embeddings and pointers rather than source documents. There is nothing '
        + 'in the store to leak \u2014 that distinction is the one worth making to '
        + 'your own customers.' },
      { t: 'h2', v: 'Where this is written down' },
      { t: 'p', v: 'DPA clause 7.3, signed 12 March. The sub-processor list is '
        + 'maintained monthly and can be sent on request.' },
    ],
  },

  'Residency walkthrough': {
    kind: 'deck', ext: 'pptx', sub: 'Six slides',
    slides: [
      { kicker: 'Vantage \u00b7 28 August',
        title: 'Residency walkthrough',
        bullets: [
          'Which region the Context Graph is built in for an EU tenant',
          'What the model providers actually receive',
          'Both answered here, and both already in the signed DPA',
        ],
        notes: 'Open by naming the two questions back. It is nine days late; say '
             + 'that once and move on.',
        sources: ['drive'] },
      { kicker: 'Region',
        title: 'EU tenants are built and stored in eu-west-1',
        bullets: [
          'Context Graph, index and derived artifacts all stay in region',
          'No cross-region replication for EU tenants',
          'The only traffic that leaves is model traffic',
        ],
        notes: 'The diagram from the architecture PDF goes here if she wants it.',
        sources: ['drive'] },
      { kicker: 'Providers',
        title: 'Three providers, and what each of them sees',
        bullets: [
          'Two receive text spans with identifiers stripped in region',
          'One receives embeddings only and never sees text',
          'None retains anything under our terms',
        ],
        notes: 'This is the slide her own customers will ask about. Keep the '
             + 'numbers exact.',
        sources: ['sharepoint'] },
      { kicker: 'Redaction',
        title: 'The stripping happens before anything is sent',
        bullets: [
          'The redaction pass runs in eu-west-1',
          'Names, addresses, account numbers and IDs are removed',
          'What leaves is a span with the identifiers already gone',
        ],
        notes: 'Meera was specific: "nothing identifiable", not "nothing stored".',
        sources: ['drive'] },
      { kicker: 'Retention',
        title: 'Thirty days, and why thirty is the right number',
        bullets: [
          'What is held is embeddings and pointers, not source documents',
          'There is nothing in the store to leak',
          'Thirty days is the window for reprocessing, not for keeping',
        ],
        notes: 'The distinction is the whole answer. Do not let it become a '
             + 'conversation about the number.',
        sources: ['drive'] },
      { kicker: 'On paper',
        title: 'All of this is already signed',
        bullets: [
          'DPA clause 7.3, signed 12 March',
          'Sub-processor list maintained monthly',
          'Dev Anand is the named contact for the security team',
        ],
        notes: 'Close on the fact that none of it is new commitment.',
        sources: ['sharepoint'] },
    ],
  },

  'Sub-processors': {
    kind: 'doc', ext: 'docx', sub: 'The detail behind the page',
    blocks: [
      { t: 'h1', v: 'Sub-processors' },
      { t: 'meta', v: 'What each provider receives \u00b7 September list \u00b7 EU tenants' },
      { t: 'p', v: 'Three providers see traffic from an EU tenant. This is what '
        + 'each of them receives, where they run it, and what they keep.' },
      { t: 'h2', v: 'Provider one \u2014 generation' },
      { t: 'ul', v: [
        'Receives text spans with identifiers removed in region',
        'Runs in the EU',
        'Zero retention under our terms',
      ] },
      { t: 'h2', v: 'Provider two \u2014 generation, fallback' },
      { t: 'ul', v: [
        'Same redacted spans, used only when the first is unavailable',
        'Runs in the EU',
        'Zero retention under our terms',
      ] },
      { t: 'h2', v: 'Provider three \u2014 embeddings' },
      { t: 'ul', v: [
        'Receives vectors only and never sees text',
        'Runs in the EU',
        'Nothing to retain',
      ] },
      { t: 'h2', v: 'What changed in September' },
      { t: 'p', v: 'Nothing that affects Vantage. The list is republished monthly '
        + 'whether or not it has changed, which is what makes it worth sending.' },
    ],
  },

};

function prepDoc(name) {
  const id = 'prep-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 44);
  if (ARTIFACTS[id]) return ARTIFACTS[id];
  const spec = PREP_DOCS[name];
  if (!spec) return null;
  const a = { id, name, kind: spec.kind, ext: spec.ext, sub: spec.sub, vi: 0 };
  const body = spec.slides ? { slides: spec.slides } : { blocks: spec.blocks };
  Object.assign(a, body);
  a.versions = [Object.assign({ when: 'This morning', by: 'Assistant' }, body)];
  /* the library takes a copy of every artifact's first version at load,
     and these are made after that has happened — so they take their own */
  a.seed = JSON.parse(JSON.stringify(a.versions));
  ARTIFACTS[id] = a;
  return a;
}

/* Written before you asked, and therefore real: both of them are made at
   load rather than when the brief happens to be opened, and both are
   filed in Artifacts like anything else the assistant has written. A
   draft that only exists while you are looking at the page that mentions
   it is a mock-up of a draft. */
for (const n of Object.keys(PREP_DOCS)) {
  const a = prepDoc(n);
  LIBRARY.unshift({
    id: a.id, owner: 'me', when: 'Today \u00b7 08:10', by: 'Assistant',
    tint: a.kind === 'deck' ? 'sand' : 'blush', shared: 0,
  });
}

function doDoc(it) {
  const id = 'do-' + it.task.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 44);
  if (ARTIFACTS[id]) return ARTIFACTS[id];
  const spec = DO_DOCS[it.task] || {
    kind: 'doc', name: it.task, ext: 'docx', sub: it.ref,
    blocks: [
      { t: 'h1', v: it.task },
      { t: 'meta', v: it.cat + ' · ' + it.ref },
      { t: 'p', v: it.desc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') },
      { t: 'h2', v: 'What is ready' },
      { t: 'ul', v: (it.ready || []).slice() },
      { t: 'h2', v: 'What this was built from' },
      { t: 'ul', v: (it.from || []).map(f => '<b>' + f.t + '</b> — ' + f.m) },
      { t: 'h2', v: 'What needs you' },
      { t: 'p', v: 'The reading and the drafting are done. What is left is the judgement, which is the part that could not be prepared for you.' },
    ],
  };
  const a = { id: id, name: spec.name, kind: spec.kind, ext: spec.ext, sub: spec.sub, vi: 0 };
  /* Whichever body the spec carries — a two-way branch dropped every
     spreadsheet on the floor and handed the renderer an undefined. */
  const body = spec.kind === 'mail'
      ? { blocks: spec.blocks, to: spec.to || [], cc: spec.cc || [],
          subject: spec.subject || '' }
    : spec.blocks ? { blocks: spec.blocks }
    : spec.slides ? { slides: spec.slides }
    : { sheets: spec.sheets };
  Object.assign(a, body);
  a.versions = [Object.assign({ when: 'Just now', by: 'Assistant' }, body)];
  ARTIFACTS[id] = a;
  return a;
}


/* ── the conversations behind the work ────────────────────────
   Every prepared thing came from somewhere. View session on a document
   opens the chat that produced it, with the document still open beside
   it — which is the whole claim of the Do List: nothing on it appeared
   from nowhere.
------------------------------------------------------------------ */

const DO_SESSIONS = {
  'Send Brightpath the answers on document sharing you promised yesterday': {
    label: 'Brightpath — who can see a shared SOW', meta: '14m',
    messages: [
      { role: 'user', text: 'Brightpath’s IT lead has paused their rollout over publishing. '
            + 'What has he actually asked, and what have we told him?' },
      { role: 'bot',
        answer: 'Two questions, and a third thing he has not asked but is reacting to.\n\n'
              + '- **He asked on the 22nd** whether somebody can re-share what you publish, '
              + 'and what happens to published pages when a person leaves. Neither was '
              + 'answered.[1]\n'
              + '- **He is reacting to a line in our docs** — "anyone with the link" — which '
              + 'describes one of the four scopes and reads as though it describes all of '
              + 'them.[2]\n\n'
              + 'Dev confirmed both answers on Slack last night, so nothing here needs to '
              + 'wait on engineering.[3]',
        cites: [
          { source: 'gmail', label: 'His questions', title: 'Re: Brightpath — who can see a shared SOW · 22 Aug' },
          { source: 'drive', label: 'The docs line', title: 'Sharing and access — v3.gdoc' },
          { source: 'slack', label: 'Dev', title: '#eng-platform — scopes confirmed · yesterday 18:20' },
        ],
        steps: [
          { source: 'internal', query: 'what Brightpath has asked about publishing', rows: [
            { source: 'gmail', title: 'Re: Brightpath — who can see a shared SOW', meta: '22 Aug · two open' },
            { source: 'slack', title: '#eng-platform — Dev confirmed the scopes', meta: 'Yesterday' },
            { source: 'drive', title: 'Sharing and access — v3.gdoc', meta: 'Product' },
          ] },
          { source: 'think', query: 'His two questions are the shape of the page.' },
        ],
        artifact: null },
      { role: 'user', text: 'Write it for him, not for us. One page, four scopes, and answer '
            + 'his two questions by name. Leave SCIM out.' },
      { role: 'bot',
        answer: 'One page. The four scopes with the narrowest first, then his two questions '
              + 'answered by name, then what an Admin can see — which is what an audit '
              + 'usually turns out to be asking for.\n\n'
              + 'I have added three suggestions for the rollout at the end: Public off at the '
              + 'workspace level for now, the default left where it is, and the published '
              + 'artifact export run monthly for a quarter. SCIM is out of the body, with a '
              + 'note to you at the bottom to strip before sending.',
        cites: null,
        steps: [
          { source: 'skill', query: 'Customer one-pager — their words, no roadmap', count: 'applied' },
          { source: 'doc', query: 'Brightpath — who can see a shared document', count: 'written' },
        ] },
    ] },

  'Build the QBR deck for Halden on Friday': {
    label: 'Halden — the Q3 review deck', meta: '1h',
    people: [
      { name: USER.name, online: true, owner: true },
      { name: 'Elena Ruiz', online: true },
    ],
    messages: [
      { role: 'user', text: 'Halden QBR is Friday and their CIO is in the room for the '
            + 'first time. What does the quarter actually look like from their side?' },
      { role: 'bot',
        answer: 'Good quarter, two rough edges, and one thing worth getting ahead of.\n\n'
              + '- **Adoption doubled and held** — 412 to 806 weekly actives since March, '
              + '68% of licensed seats. Field ops is where the growth is.[1]\n'
              + '- **Support ran better than the commitment** — 54 tickets against 71 last '
              + 'quarter, median first response 2.1 hours against a four-hour SLA.[2]\n'
              + '- **Two escalations are still open**, and one of them — SSO session length '
              + '— has been raised twice with no date. That is the one that gets raised in '
              + 'the room if we do not raise it first.\n\n'
              + 'The other thing: 180 seats in their service team have never signed in. On a '
              + '$420k account renewing in September, that is the number a new CIO notices.',
        cites: [
          { source: 'drive',      label: 'Usage', title: 'Usage — Halden, last 4 quarters.gsheet' },
          { source: 'sharepoint', label: 'Support', title: 'Halden — tickets and SLA, Q3' },
        ],
        steps: [
          { source: 'internal', query: 'Halden — the quarter from their side', rows: [
            { source: 'drive',      title: 'Usage — Halden, last 4 quarters.gsheet', meta: 'Data team' },
            { source: 'sharepoint', title: 'Halden — tickets and SLA, Q3', meta: '54 tickets' },
            { source: 'salesforce', title: 'Halden — account plan', meta: '$420k · September' },
            { source: 'drive',      title: 'Halden QBR — March deck', meta: 'Last review' },
          ] },
          { source: 'think', query: 'Led on the escalations rather than the adoption number.' },
        ],
        artifact: null },
      { role: 'peer', from: 'Elena Ruiz', at: '55m',
        text: 'Use our value model rather than yours for the savings slide — finance built '
            + 'it in July and Marcus has already signed off the method. If we bring a '
            + 'different number he will spend the meeting arguing with the model instead of '
            + 'the point.' },
      { role: 'user', text: '@Assistant build the deck. Nine slides, put the escalations '
            + 'before the support numbers, and end on what we are asking them for.' },
      { role: 'bot',
        answer: 'Nine slides. Where we are, what we shipped that they asked for, the two '
              + 'open escalations, then support, then value on their model.\n\n'
              + 'Three asks at the end — an owner for the SSO change, two hours with field '
              + 'ops, and an introduction to whoever runs service — and a last slide on the '
              + 'September renewal saying we will bring a proposal in June. Last time we came '
              + 'in August and lost three weeks of their procurement cycle.\n\n'
              + 'The notes carry the things not to do: do not open on the good number, name '
              + 'the two SLA misses out loud, and do not skip the asks because the room is '
              + 'senior.',
        cites: null,
        steps: [
          { source: 'skill', query: 'QBR — escalations before achievements, end on the ask', count: 'applied' },
          { source: 'deck',  query: 'Halden — Q3 business review', count: '9 slides' },
        ] },
    ] },

  'Follow up with Fieldstone — nobody has replied in twelve days': {
    label: 'Fieldstone — twelve days of nothing', meta: '40m',
    people: [
      { name: USER.name, online: true, owner: true },
      { name: 'Sana Kaur', online: true },
    ],
    messages: [
      { role: 'user', text: 'Fieldstone have not replied in twelve days and the renewal is on '
            + 'the 30th. Who is actually reading my emails over there?' },
      { role: 'bot',
        answer: 'Two people, and neither of them is on the thread you have been writing to.'
              + '\n\n- **Three mails, no reply.** All three went to the working thread James '
              + 'set up, and James left in July.[1]\n'
              + '- **Two people have opened all three** — both in procurement. Neither has '
              + 'replied, which usually means they are reading rather than owning.\n'
              + '- **Atlas has been on site twice in three weeks**, which the account team '
              + 'logged but nobody connected to the silence.[2]\n\n'
              + 'The renewal is a finance date. If nobody at Fieldstone is thinking about it, '
              + 'the auto-renew makes the decision for them on 30 November.',
        cites: [
          { source: 'gmail',      label: 'The thread', title: 'Re: FY27 renewal — three mails, no reply' },
          { source: 'salesforce', label: 'Competitive', title: 'Fieldstone — Atlas on site, twice in three weeks' },
        ],
        steps: [
          { source: 'internal', query: 'Fieldstone — the thread, the record, and who is reading', rows: [
            { source: 'gmail',      title: 'Re: FY27 renewal — Fieldstone', meta: 'You, three times' },
            { source: 'salesforce', title: 'Fieldstone — Renewal FY27', meta: '$640k · 30 Nov' },
            { source: 'sharepoint', title: 'Fieldstone MSA 2024 — executed.pdf', meta: 'Auto-renew clause' },
          ] },
          { source: 'think', query: 'The thread is dead. The date is not.' },
        ],
        artifact: null },
      { role: 'peer', from: 'Sana Kaur', at: '38m',
        text: 'Worth being precise on the notice language if you are writing to their CFO — '
            + 'it is thirty days before the anniversary, not thirty days from when they '
            + 'reply. If they want to serve it they are already inside the window.' },
      { role: 'user', text: '@Assistant write it to the CFO then. Short, and make the '
            + 'auto-renew the point rather than the ask.' },
      { role: 'bot',
        answer: 'Written, and it is four sentences. It says the date, says it may well be '
              + 'what they want, and offers fifteen minutes with whoever has picked up '
              + 'James’s work.\n\n'
              + 'It does not mention Atlas. Naming a competitor in a mail like this reads as '
              + 'anxiety, and they know we know.',
        cites: null,
        steps: [{ source: 'doc', query: 'Fieldstone — follow-up to the CFO', count: 'written' }] },
    ] },

  'Prepare for the Sentinel evaluation session on Wednesday': {
    label: 'Sentinel — what the room will ask', meta: '2h',
    messages: [
      { role: 'user', text: 'Sentinel QBR is Wednesday. Where is each workstream actually, '
            + 'rather than where the plan says?' },
      { role: 'bot',
        answer: 'Four workstreams, and they are in three different states.\n\n'
              + '- **Sales comp is live** — 340 users since June, no escalations. This is the '
              + 'one that has gone well.\n'
              + '- **VMO has stalled.** Their sponsor moved teams in July and nobody replaced '
              + 'him. Mark’s thread has been quiet twelve days.[1]\n'
              + '- **Field service is in build**, on track, nothing to report.\n'
              + '- **The partner portal was scoped in March and never started.** Nobody has '
              + 'mentioned it since.[2]\n\n'
              + 'The room will open on the VMO, and the honest answer is a sponsor question '
              + 'rather than a roadmap one.',
        cites: [
          { source: 'gmail',      label: 'VMO', title: 'Sentinel VMO — thread, quiet 12 days' },
          { source: 'salesforce', label: 'Account plan', title: 'Sentinel — four workstreams, March' },
        ],
        steps: [
          { source: 'internal', query: 'Sentinel — where each workstream stands', rows: [
            { source: 'gmail',      title: 'Sentinel VMO — thread', meta: 'Quiet 12 days' },
            { source: 'gmail',      title: 'Sales comp — Shrabani', meta: 'Live, 340 users' },
            { source: 'salesforce', title: 'Sentinel — account plan', meta: 'Renewal May' },
          ] },
          { source: 'think', query: 'Led on the stalled one, because they will.' },
        ],
        artifact: null },
      { role: 'user', text: 'Write the prep. Include what we want out of the room, not just '
            + 'what we are reporting.' },
      { role: 'bot',
        answer: 'Written. Where the four actually stand, the three questions they will lead '
              + 'with, and three things to ask for — a named VMO owner or a decision to stop, '
              + 'a scoping session for the portal or drop it, and an introduction to field '
              + 'ops, who we have never met.\n\n'
              + 'One note at the end: do not open on the comp numbers. They are good, and '
              + 'opening on the thing that went well makes the VMO question feel avoided.',
        cites: null,
        steps: [{ source: 'doc', query: 'Sentinel QBR — prep', count: 'written' }] },
    ] },
};

/* One session per prepared thing, made on demand and kept, so leaving and
   coming back lands in the same conversation rather than a new one. */
const DO_SES = {};
function doSession(it) {
  const id = 'do-ses-' + it.task.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 40);
  if (DO_SES[id]) return DO_SES[id];
  const spec = DO_SESSIONS[it.task];
  const art = doDoc(it);
  const ses = spec
    ? { id, artifact: art.id,
        people: spec.people || [{ name: USER.name, online: true, owner: true }],
        label: spec.label, meta: spec.meta, messages: spec.messages }
    : { id, artifact: art.id, label: it.task, meta: 'today',
        people: [{ name: USER.name, online: true, owner: true }],
        messages: [
          { role: 'user', text: it.desc.replace(/\*\*/g, '') + ' Can you pull together what '
                + 'we know?' },
          { role: 'bot',
            answer: it.ready.map(r => '- ' + r).join('\n'),
            cites: null,
            steps: [
              { source: 'internal', query: 'what this is built from',
                rows: it.from.map(f => ({ source: f.src, title: f.t, meta: f.m })) },
              { source: 'think', query: 'Pulled it into one place.' },
            ] },
        ] };
  DO_SES[id] = ses;
  return ses;
}

/* Names in a description are the places it came from, so they carry the
   source rather than only a bold weight. Hovering one says which thread,
   which is the annotation doing its job: the sentence stays a sentence
   and the provenance is on the word it belongs to. */

/* ── what a reference opens onto ──────────────────────────────
   A citation you cannot read is a claim. Hovering one shows the thing
   itself — the message, with who sent it and when — and offers the way
   through to where it lives. */
const DO_OPEN = {
  gmail:      'Open in Gmail',
  outlook:    'Open in Outlook',
  slack:      'Open in Slack',
  drive:      'Open in Drive',
  sharepoint: 'Open in SharePoint',
  salesforce: 'Open in Salesforce',
  teams:      'Open in Teams',
  onedrive:   'Open in OneDrive',
};

const DO_SNIP = {
  '#eng-platform — Dev confirmed the scopes': {
    who: 'Dev Anand', when: 'Yesterday 18:20',
    body: 'Confirmed both — a Viewer can’t widen the scope, only the owner or a workspace '
        + 'Admin can. And shared documents survive the person leaving; ownership moves to the '
        + 'workspace owner. Nothing else changed.' },
  'Re: Brightpath — who can see a shared SOW': {
    who: 'Callum Reid, Brightpath IT', when: '22 Aug',
    body: 'Two things before we widen this out. If I share an SOW with them, can somebody else '
        + 're-share it further than I intended? And what happens to pages a person published '
        + 'once they leave us?' },
  'Re: pricing for 120 more seats': {
    who: 'Rachel Okafor, Halden', when: 'Tuesday 09:14',
    body: 'Board is Thursday. If you can get me numbers by Thursday morning I can get it on '
        + 'the agenda — after that it waits for the next one, which is January.' },
  'Vantage QBR — recording and notes': {
    who: 'Meeting notes', when: 'Monday, 60 min',
    body: 'Their head of IT: "Which region is the Context Graph actually built in, and does '
        + 'anything leave it? I need to know what your model providers see before we widen '
        + 'this past the pilot team."' },
  'Trellis DPA — for review': {
    who: 'You → legal@', when: '11 days ago',
    body: 'Attaching the Trellis DPA for review. Two clauses were flagged on their side last '
        + 'time — sub-processor notice period and the audit right. Both are in this version. '
        + 'Can somebody pick it up this week?' },
  'Re: QBR deck — can I pre-read?': {
    who: 'Elena Ruiz, Halden', when: 'Asked twice, last on Tuesday',
    body: 'Marcus is joining this one and he reads everything beforehand. If I can get the '
        + 'deck by Thursday I will walk him through it — much better than him seeing it cold '
        + 'in the room.' },
  '#support-escalations — Meera': {
    who: 'Meera Nair', when: 'Friday, and twice since',
    body: 'Still holding forty replies on the sync delays. Eleven of them are Trellis and '
        + 'their admin has now raised it in-app as well. I need a yes or a no on 4.2 before '
        + 'I can answer any of them.' },
  'Redwood — security review.xlsx': {
    who: 'Their security team', when: 'Due tomorrow',
    body: '40 questions. Q35–Q40 are new since our last review and are all on the Context '
        + 'Graph — what it stores, where it lives, and who at your end can see it.' },
  'Sentinel — security review thread': {
    who: 'Mark Feltner', when: 'Quiet 12 days',
    body: 'Last message: "Leave the VMO piece with me, I will come back once I know who is '
        + 'picking it up." Nothing since.' },
  'Re: FY27 renewal — Fieldstone': {
    who: 'You → the working thread', when: 'Three mails, no reply',
    body: 'Third attempt on the FY27 renewal. The agreement renews 30 November at the '
        + 'current rate unless notice is served. I would rather that were a decision than '
        + 'something that just happened.' },
  'Harborview — 40 seats': {
    who: 'Thread', when: 'Quiet since 12 August',
    body: 'Last from them: "Parking this until we have a new owner for the programme." That '
        + 'was three weeks ago and nobody has come back.' },
  'Agent beta — nine things': {
    who: 'Trellis platform team', when: '9 days ago',
    body: 'Nine things from two weeks of running agents on our own data. Some are small. The '
        + 'context one and the Salesforce lag are the two that matter to us.' },
};

/* Anything without its own excerpt still says something true about
   itself rather than a shrug — the meta line already knows what it is. */
const DO_SNIP_KIND = {
  gmail:      'An email thread.',
  outlook:    'A meeting, with its recording and notes.',
  slack:      'A channel conversation.',
  drive:      'A document in Drive.',
  sharepoint: 'A file on the team site.',
  salesforce: 'A record in the CRM.',
};
/* the three records the sentences point at, in their own words */
DO_SNIP['Halden Manufacturing — expansion'] = {
  who: 'Salesforce · owner you', when: '$380k · Proposal',
  body: '120 seats on top of 340. Close date pushed once, to 30 September. Last note: '
      + '"Waiting on pricing — board approval needed before end of quarter."' };
DO_SNIP['Halden — account plan'] = {
  who: 'Salesforce · account plan', when: '$420k · renews 30 September',
  body: '1,240 seats across four teams. Adoption 68% of licensed seats, up from 34% in '
      + 'March. Two open escalations: sync delays, SSO session length.' };
DO_SNIP['Sentinel — security review thread'] = {
  who: 'Mark Feltner, Sentinel', when: 'Quiet 12 days',
  body: 'Last message: "Leave the security piece with me — I will come back once I know '
      + 'who is picking it up on our side." Nothing since.' };

const doSnip = (src) => DO_SNIP[src.t] || {
  who: src.m, when: '',
  body: (DO_SNIP_KIND[src.src] || 'A source.') + ' ' + src.t
      + (src.m ? ' \u2014 ' + src.m : '') + '.' };

function annotated(it) {
  const out = [];
  let last = 0, m, n = 0;
  const re = /\*\*([^*]+)\*\*/g;
  while ((m = re.exec(it.desc))) {
    if (m.index > last) out.push(it.desc.slice(last, m.index));
    const name = m[1];
    /* the source that actually mentions this name, and failing that the
       next one along — two names in a sentence should not both point at
       the same thread */
    const src = it.from.find(f => f.t.includes(name) || f.m.includes(name))
      || it.from[n % it.from.length];
    n++;
    /* What the pill says is where it came from, not who it is about —
       the sentence already says the name. A Slack channel is written the
       way Slack writes it; everything else is the thread or the file it
       came out of, trimmed to what fits in a line of prose. */
    const trim = (t) => {
      const cut = t.split(/\s+—\s+/)[0].replace(/^(Re|Fwd):\s*/i, '');
      return cut.length > 30 ? cut.slice(0, 29) + '\u2026' : cut;
    };
    const ch = src
      ? (src.src === 'slack' ? ((src.t.match(/#[a-z0-9-]+/i) || [])[0] || trim(src.t))
         : trim(src.t))
      : name;
    out.push(h('span', {
      class: 'do-anno', 'data-src': src ? src.src : null,
      onmouseenter: (e) => { if (!src) return; clearTimeout(annoTimer);
        const t = e.currentTarget;
        annoTimer = setTimeout(() => showAnnoCard(t, src), 200); },
      onmouseleave: () => { clearTimeout(annoTimer);
        annoTimer = setTimeout(closeAnnoCard, 160); },
    },
      src ? h('span', { class: 'do-anno-ic', 'aria-hidden': 'true', html: doMark(src.src) }) : null,
      h('span', { class: 'do-anno-h' }, ch),
      h('span', { class: 'do-anno-n' }, name)));
    last = m.index + m[0].length;
  }
  if (last < it.desc.length) out.push(it.desc.slice(last));
  /* Every row says where it came from. A sentence with no name in it had
     nothing marked, which read as a sentence with no source rather than
     one whose source is the thread itself. */
  if (!n && it.from[0]) {
    const src = it.from[0];
    const cut = src.t.split(/\s+—\s+/)[0].replace(/^(Re|Fwd):\s*/i, '');
    out.push(' ', h('span', {
      class: 'do-anno', 'data-src': src.src,
      onmouseenter: (e) => { clearTimeout(annoTimer);
        const t = e.currentTarget;
        annoTimer = setTimeout(() => showAnnoCard(t, src), 220); },
      onmouseleave: () => { clearTimeout(annoTimer);
        annoTimer = setTimeout(closeAnnoCard, 160); },
    },
      h('span', { class: 'do-anno-ic', 'aria-hidden': 'true', html: doMark(src.src) }),
      h('span', { class: 'do-anno-h' }, cut.length > 30 ? cut.slice(0, 29) + '\u2026' : cut)));
  }
  return out;
}

/* A card on hover rather than a tooltip, because a tooltip cannot hold a
   paragraph and cannot be clicked through to the thing it describes. */
let annoCard = null, annoTimer = null;
function closeAnnoCard() {
  clearTimeout(annoTimer);
  annoCard?.remove();
  annoCard = null;
}
function showAnnoCard(anchor, src) {
  closeAnnoCard();
  const s = doSnip(src);
  const el = h('div', { class: 'do-peek' },
    h('div', { class: 'do-peek-top' },
      h('span', { class: 'do-peek-ic', 'aria-hidden': 'true', html: doMark(src.src) }),
      h('span', { class: 'do-peek-t' }, src.t)),
    h('div', { class: 'do-peek-who' }, [s.who, s.when].filter(Boolean).join(' · ')),
    h('p', { class: 'do-peek-body' }, s.body),
    h('button', { class: 'do-peek-go', type: 'button',
                  onclick: (e) => { e.stopPropagation(); closeAnnoCard();
                                    toast(DO_OPEN[src.src] || 'Open'); } },
      DO_OPEN[src.src] || 'Open', h('span', { class: 'do-peek-arw', 'aria-hidden': 'true' }, '↗')));

  document.body.append(el);
  annoCard = el;
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = Math.max(12, Math.min(r.left - 10, innerWidth - w - 12)) + 'px';
  el.style.top = (r.bottom + hgt + 14 > innerHeight ? r.top - hgt - 8 : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('mouseenter', () => clearTimeout(annoTimer));
  el.addEventListener('mouseleave', () => { annoTimer = setTimeout(closeAnnoCard, 160); });
}

function doListView() {
  let filter = 'all';
  let q = '';
  /* Three ways to look at the same list. Roomy for reading why something
     is here, compact for scanning all of it at once, and annotated —
     obligation first, sources marked in the sentence, due and priority as
     fields — for working through them one at a time. N switches to it. */
  let mode = 'roomy';
  const gone = new Set();

  const bar   = h('div', { class: 'do-filters' });
  const list  = h('div', { class: 'do-list' });

  /* Obligation is the ranking, so it is also the order. A promise you made
     out loud outranks a thing the assistant thinks might be useful, and
     within a rank the sooner it is due the higher it sits. */
  const RANK = { commitment: 0, assigned: 1, suggested: 2 };
  const DUE = { today: 0, tomorrow: 1 };
  const live = () => DO_ITEMS.filter(x => !gone.has(x.task)).slice().sort((a, b) =>
    (RANK[a.kind] - RANK[b.kind])
    || ((DUE[a.due] ?? 2) - (DUE[b.due] ?? 2)));
  const shown = () => {
    const f = DO_FILTERS.find(x => x.id === filter) || DO_FILTERS[0];
    return live().filter(x => f.fn(x)
      && (!q || (x.task + ' ' + x.cat + ' ' + x.desc).toLowerCase().includes(q)));
  };

  const drop = (it, verb) => { gone.add(it.task); toast(`${verb} \u00b7 ${it.task}`); paint(); };

  /* A ring rather than a square: a square reads as a form control on a
     page that is not a form. It only fills when the thing is finished. */
  const boxEl = (it) => {
    const el = h('button', {
      class: 'do-box', type: 'button', role: 'checkbox', 'aria-checked': 'false',
      'aria-label': `Mark done: ${it.task}`, title: 'Mark done',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" '
          + 'stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12.5l4.5 4.5L18.5 7"/></svg>',
      onclick: (e) => {
        e.stopPropagation();
        el.setAttribute('aria-checked', 'true');
        el.closest('.do-row, .do-drow')?.classList.add('is-done');
        setTimeout(() => drop(it, 'Done'), 320);
      },
    });
    return el;
  };

  /* Pressing the action opens the thing that was written for it — a prep
     document, a position, a deck — in the canvas, where it comments,
     versions and publishes like any other artifact. A button that only
     ticks a row off is a button pretending. */
  /* The document is the middle of the job, not the end of it. Under it
     sits the bar you finish from: a line to ask a follow-up on the left,
     the way back to the conversation that made it, and the one action
     that closes the task. */
  const open = (it) => {
    openArtifact(doDoc(it));
    queueMicrotask(() => footer(it));
  };

  /* The seam between the list and the canvas is a handle. Reading a spec
     and reading a spreadsheet want different amounts of room, and the
     right amount is the reader's call rather than a number we picked. */
  const grip = () => {
    const host = document.getElementById('artifactPanel');
    const main = document.getElementById('main');
    if (!host || host.querySelector('.do-grip')) return;
    const el = h('div', { class: 'do-grip', role: 'separator',
                          'aria-orientation': 'vertical', 'aria-label': 'Resize',
                          tabindex: '0' });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      main.dataset.resizing = 'true';
      const move = (ev) => {
        const r = main.getBoundingClientRect();
        const w = Math.round(Math.min(Math.max(r.right - ev.clientX, 380), r.width - 340));
        main.style.setProperty('--do-panel-w', w + 'px');
      };
      const up = () => {
        delete main.dataset.resizing;
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
    /* arrow keys move it too, because a 6px target is not the only way in */
    el.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0;
      if (!step) return;
      e.preventDefault();
      const r = main.getBoundingClientRect();
      const now = parseInt(getComputedStyle(main).getPropertyValue('--do-panel-w'), 10)
        || Math.round(document.getElementById('artifactPanel').getBoundingClientRect().width);
      main.style.setProperty('--do-panel-w',
        Math.min(Math.max(now + step, 380), r.width - 340) + 'px');
    });
    host.append(el);
  };

  const footer = (it) => {
    const host = document.getElementById('artifactPanel');
    if (!host) return;
    grip();
    host.querySelector('.dof')?.remove();

    const ask = h('input', {
      class: 'dof-in', type: 'text', 'aria-label': 'Ask a follow-up',
      placeholder: 'Ask a follow-up about this\u2026', spellcheck: 'false',
    });
    const send = () => {
      const q = ask.value.trim();
      if (!q) return ask.focus();
      ask.value = '';
      toast('Asked \u00b7 ' + q);
    };
    ask.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } };

    host.append(h('div', { class: 'dof' },
      h('div', { class: 'dof-ask' },
        ask,
        h('button', { class: 'dof-go', type: 'button', 'aria-label': 'Ask',
                      html: ARROW, onclick: send })),
      h('button', { class: 'dof-sec', type: 'button',
                    /* the artifact reopens after the session, because
                       openSession closes whatever was on the canvas */
                    onclick: () => {
                      openSession(doSession(it));
                      queueMicrotask(() => openArtifact(doDoc(it)));
                    } },
        'View session'),
      h('button', { class: 'btn btn--primary dof-cta', type: 'button',
                    onclick: () => { closeArtifact?.(); drop(it, it.cta); } },
        it.cta)));
    host.dataset.footer = 'on';
  };

  const row = (it) => {
    const when = doWhen(it);
    return h('div', { class: 'do-row', onclick: () => open(it) },
      boxEl(it),
      h('div', { class: 'do-main' },
        /* The project sits above the task, the way a thread sits above a
           subject line — it is what this belongs to, and it is read first. */
        h('div', { class: 'do-line' },
          h('span', { class: 'do-cat' }, it.cat),
          h('span', { class: 'do-srcs', 'aria-hidden': 'true',
                      html: it.src.map(doMark).join('') })),
        h('h3', { class: 'do-task' }, it.task),
        h('p', { class: 'do-desc' }, ...bolded(it.desc)),
        /* Why it is here and when it is due, on the last line with the
           action — they are what you decide on, so they sit next to the
           button that acts on them. */
        h('div', { class: 'do-foot' },
          DO_KIND[it.kind].label
            ? h('span', { class: 'do-kind', 'data-tone': DO_KIND[it.kind].tone },
                h('span', { class: 'do-due-ic', 'aria-hidden': 'true',
                            html: DO_KIND[it.kind].ic }),
                DO_KIND[it.kind].label)
            : null,
          h('span', { class: 'do-due', 'data-tone': when.tone },
            h('span', { class: 'do-due-ic', 'aria-hidden': 'true', html: DUE_IC }),
            when.t),
          /* Two quiet handles that appear under the pointer: put it off,
             or everything else. They sit left of the action because the
             action is the thing you are meant to reach for. */
          h('span', { class: 'do-tools' },
            h('button', { class: 'do-tool', type: 'button', 'aria-label': 'Snooze',
                          title: 'Snooze', html: SNOOZE_IC,
                          onclick: (e) => { e.stopPropagation(); drop(it, 'Snoozed'); } }),
            h('button', { class: 'do-tool', type: 'button', 'aria-label': 'More',
                          title: 'More', html: DOTS_IC,
                          onclick: (e) => { e.stopPropagation(); moreMenu(e.currentTarget, it); } })),
          it.no ? h('button', { class: 'do-no', type: 'button',
                                onclick: (e) => { e.stopPropagation(); drop(it, 'Dismissed'); } },
                    it.no) : null,
          h('button', { class: 'do-go', type: 'button',
                        onclick: (e) => { e.stopPropagation(); open(it); } }, it.act))),
    );
  };

  /* One line: the task, and the button that gets on with it. Compact is
     for finding the one you want among nine, not for reading them — the
     description and the labels are what the roomy row is for. The date
     stays because it is what the order is built on. */
  const denseRow = (it) => {
    const when = doWhen(it);
    return h('div', { class: 'do-drow', onclick: () => open(it) },
      boxEl(it),
      h('span', { class: 'do-dtask' }, it.task),
      h('span', { class: 'do-ddue', 'data-tone': when.tone }, when.t),
      h('button', {
        class: 'do-go', type: 'button',
        onclick: (e) => { e.stopPropagation(); open(it); },
      }, it.act));
  };

  /* one menu shape for both fields — a list, the current one ticked */
  const pickMenu = (anchor, opts, now, set) => {
    const el = h('div', { class: 'menu do-pick', role: 'menu' },
      ...opts.map(o => h('button', {
        class: 'do-pickrow' + (o.t === now ? ' is-on' : ''), type: 'button',
        'data-tone': o.tone || null,
        onclick: () => { closeMenu(); set(o.t); },
      }, o.t, o.t === now ? h('span', { class: 'do-pick-tick', html: PICK_TICK }) : null)));
    closeMenu();
    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 12) + 'px';
    el.style.left = Math.max(12, Math.min(r.left - 8, innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  };

  const moreMenu = (anchor, it) => {
    const row = (label, run) => h('button', { class: 'do-catrow', type: 'button',
      onclick: () => { closeMenu(); run(); } }, label);
    const el = h('div', { class: 'menu do-more', role: 'menu' },
      row('Snooze until tomorrow', () => drop(it, 'Snoozed')),
      row('Snooze until Monday', () => drop(it, 'Snoozed')),
      h('div', { class: 'do-more-rule' }),
      row('Not needed', () => drop(it, 'Dismissed')),
      row('Archive', () => drop(it, 'Archived')),
      h('div', { class: 'do-more-rule' }),
      row('Delete', () => drop(it, 'Deleted')));
    closeMenu();
    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 12) + 'px';
    el.style.left = Math.max(12, Math.min(r.right - el.offsetWidth,
                                          innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  };

  /* Obligation first, because it is why the row is here at all. Then the
     task, then the sentence with its sources annotated in place, then two
     fields that every row has: when it is due, and how much it matters.
     The project line at the top went — the description already says it. */
  const annoRow = (it) => {
    const k = DO_KIND[it.kind];
    const pri = doPriority(it);
    return h('div', { class: 'do-arow', onclick: () => open(it) },
      boxEl(it),
      h('div', { class: 'do-main' },
        /* Nothing where there is nothing to say. "Task" above a task was
           the row labelling itself. */
        k.label
          ? h('div', { class: 'do-abadge', 'data-tone': k.tone },
              k.ic ? h('span', { class: 'do-due-ic', 'aria-hidden': 'true', html: k.ic }) : null,
              k.label)
          : null,
        h('h3', { class: 'do-task' }, it.task),
        h('p', { class: 'do-desc' }, ...annotated(it)),
        h('div', { class: 'do-fields' },
          /* A field you can read but not change is a label pretending to
             be a field. Both of these open on click. */
          h('span', { class: 'do-field' },
            h('span', { class: 'do-field-k' }, 'Due'),
            h('button', { class: 'do-field-v', type: 'button', 'data-tone': doWhen(it).tone,
                          'aria-haspopup': 'menu', title: 'Change the date',
                          onclick: (e) => { e.stopPropagation();
                            pickMenu(e.currentTarget, DO_WHEN.map(t => ({ t })),
                              doDue(it), (v) => { it.when = v; paint(); }); } },
              doDue(it), h('span', { class: 'caret', 'aria-hidden': 'true' }))),
          h('span', { class: 'do-field' },
            h('span', { class: 'do-field-k' }, 'Priority'),
            h('button', { class: 'do-field-v', type: 'button', 'data-tone': pri.tone,
                          'aria-haspopup': 'menu', title: 'Change the priority',
                          onclick: (e) => { e.stopPropagation();
                            pickMenu(e.currentTarget, DO_PRI, pri.t,
                              (v) => { it.pri = v; paint(); }); } },
              pri.t, h('span', { class: 'caret', 'aria-hidden': 'true' }))),
          h('span', { class: 'do-tools' },
            h('button', { class: 'do-tool', type: 'button', 'aria-label': 'Snooze',
                          title: 'Snooze', html: SNOOZE_IC,
                          onclick: (e) => { e.stopPropagation(); drop(it, 'Snoozed'); } }),
            h('button', { class: 'do-tool', type: 'button', 'aria-label': 'More',
                          title: 'More', html: DOTS_IC,
                          onclick: (e) => { e.stopPropagation(); moreMenu(e.currentTarget, it); } })),
          h('button', { class: 'do-go', type: 'button',
                        onclick: (e) => { e.stopPropagation(); open(it); } }, it.act))));
  };

  const paint = () => {
    const items = shown();
    bar.replaceChildren(...DO_FILTERS.map(f => h('button', {
      class: 'do-f' + (f.id === filter ? ' is-on' : ''), type: 'button',
      onclick: () => { filter = f.id; paint(); },
    }, f.label, h('span', { class: 'do-fn' }, String(live().filter(f.fn).length)))));

    const shape = mode === 'dense' ? denseRow : mode === 'anno' ? annoRow : row;
    list.replaceChildren(h('div', { class: 'do-inner' },
      ...(items.length ? items.map(shape)
        : [h('div', { class: 'do-empty' }, 'Nothing here.')])));
    root.classList.toggle('is-dense', mode === 'dense');
    root.classList.toggle('is-anno', mode === 'anno');
    density.querySelectorAll('button').forEach(b =>
      b.classList.toggle('is-on', b.dataset.d === mode));
  };

  const DENSE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const ANNO_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="4" width="17" height="16" rx="2.4"/>'
    + '<path d="M7 8.5h6M7 12h10M7 15.5h7"/></svg>';
  const ROOMY_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16"/>'
    + '<path d="M4 9h10M4 15h10" opacity=".45"/></svg>';

  const density = h('div', { class: 'do-density', role: 'group', 'aria-label': 'Density' },
    h('button', { class: 'do-dbtn', type: 'button', 'data-d': 'roomy',
                  'aria-label': 'Comfortable', title: 'Comfortable', html: ROOMY_IC,
                  onclick: () => { mode = 'roomy'; paint(); } }),
    h('button', { class: 'do-dbtn', type: 'button', 'data-d': 'dense',
                  'aria-label': 'Compact', title: 'Compact', html: DENSE_IC,
                  onclick: () => { mode = 'dense'; paint(); } }),
    h('button', { class: 'do-dbtn', type: 'button', 'data-d': 'anno',
                  'aria-label': 'Annotated', title: 'Annotated  ·  N', html: ANNO_IC,
                  onclick: () => { mode = 'anno'; paint(); } }));

  /* N, because it is a keystroke away from the list you are already on */
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, [contenteditable]')) return;
    if (e.key.toLowerCase() !== 'n') return;
    e.preventDefault();
    mode = mode === 'anno' ? 'roomy' : 'anno';
    paint();
  };
  document.addEventListener('keydown', onKey);

  const find = h('input', {
    class: 'do-find', type: 'search', placeholder: 'Search the list\u2026',
    'aria-label': 'Search the Do List', spellcheck: 'false',
    oninput: () => { q = find.value.trim().toLowerCase(); paint(); },
  });

  const root = h('div', { class: 'do' },
    h('header', { class: 'do-top' },
      h('h1', { class: 'do-title' }, 'Do List'),
      density,
      h('span', { class: 'do-find-wrap' },
        h('span', { class: 'do-find-ic', 'aria-hidden': 'true', html: FIND_IC }),
        find),
      h('button', {
        class: 'btn btn--primary do-new', type: 'button',
        onclick: () => toast('Adding your own comes in the next pass.'),
      }, h('span', { class: 'do-new-x', 'aria-hidden': 'true' }, '\u002b'), 'New task')),
    h('div', { class: 'do-sub' }, bar),
    list);

  paint();
  return root;
}

/* ────────────────────────────────────────────────────────────
   Meetings

   A day at a time. Today opens on today, and the day is the unit because
   that is how anybody talks about their calendar — "what have I got this
   afternoon", not "show me the week".

   Today's list is built against the clock rather than fixed, so the day
   always has a shape: things that already happened, the one you are in,
   and what is coming. The brief is only offered on meetings inside three
   hours — a brief prepared on Monday for a Thursday call is out of date
   by Thursday, and offering one on everything makes the ones that matter
   invisible.
------------------------------------------------------------------- */

/* Relative to now, so the day always reads correctly whenever it is
   opened. Rounded to five minutes, because calendars are. */
const MEET_TODAY = [
  /* the big room: eight people, so the list counts rather than lists */
  { at: -215, mins: 30, name: 'Pipeline stand-up',
    who: ['Matt Rivera', 'John Whitaker', 'Grace Coleman', 'Sana Iqbal', 'Dev Anand',
          'Priya Raman', 'Finance', 'Legal'],
    where: 'Teams',
    agenda: ['Anything that moved since Friday',
             'The three deals closing this month',
             'What is stuck, and who unsticks it'],
    att: { 'Grace Coleman': 'maybe', 'Priya Raman': 'none', 'Legal': 'none',
           'Finance': 'no' } },
  /* a call that was not on the calendar until somebody put it there, and
     was recorded by hand */
  { at: -160, mins: 12, name: 'Orion — pricing escalation',
    who: ['Priya Raman', 'Dev Anand'], where: 'Zoom', via: 'zoom', acct: 'Orion',
    agenda: ['Where the FY26 uplift lands',
             'What their board sees on Thursday',
             'What goes in writing tonight'] },
  /* an invitation that came with an agenda on it */
  /* their side calls it, so it is on their platform */
  { at: -95,  mins: 45, name: 'Brightpath — phase two rollout',
    who: ['Callum Reid', 'Dev Anand'], where: 'Meet', via: 'meet', acct: 'Brightpath',
    agenda: ['Where the security questionnaire stands',
             'Phase two scope — the three workflows they asked for',
             'A date we can both hold to'] },
  { at: -20,  mins: 60, name: 'Halden — expansion pricing review',
    who: ['Rachel Okafor', 'Owen Castillo'], where: 'Teams', acct: 'Halden',
    att: { 'Owen Castillo': 'none' },
    agenda: ['The three structures, and the one we are recommending',
             'The ramp, and what it costs at 36 months rather than 24',
             'What Rachel\u2019s board sees on Thursday',
             'Who sends the paper today, and by when'] },
  { at: 75,   mins: 30, name: 'Vantage — data residency follow-up',
    who: ['Meera Nair', 'Dev Anand'], where: 'Zoom', via: 'zoom', acct: 'Vantage',
    brief: 'brief-vantage', att: { 'Dev Anand': 'none' },
    agenda: ['The region an EU tenant is built in',
             'What each model provider actually receives',
             'The retention window, and why thirty days'] },
  { at: 150,  mins: 45, name: 'Redwood — who owns it now',
    who: ['Sana Iqbal'], where: 'Teams', acct: 'Redwood',
    brief: 'brief-iron', rsvp: 'none',
    agenda: ['Who owns the account now that Nadia has gone',
             'What was promised in the last renewal',
             'Whether the February date still holds'] },
  { at: 215,  mins: 45, name: 'Enablement — new pricing rollout',
    who: ['Enablement', 'Sana Iqbal'], where: 'Teams', rsvp: 'no',
    agenda: ['The new list, and what changes for existing accounts',
             'How the discount floors are being explained',
             'What the team needs before it goes out'] },
  /* in a room, with an address rather than a link */
  { at: 285,  mins: 30, name: 'Sentinel — security review prep',
    who: ['Priya Raman', 'Legal'], where: 'Room 4', acct: 'Sentinel',
    rsvp: 'none',
    agenda: ['The questionnaire they sent back on Monday',
             'Sub-processors, and the two they flagged',
             'What Legal needs from us before sign-off'],
    place: { name: 'Room 4 · UnifyApps',
             addr: '1912, 19th Floor, Magnum Global Park, Sector 58, Gurugram, '
                 + 'Haryana 122011' } },
  { at: 400,  mins: 25, name: '1:1 with Sana',
    who: ['Sana Iqbal'], where: 'The corner sofas',
    agenda: ['How the quarter is going',
             'The two accounts she has asked for help on',
             'Anything she wants from me'],
    place: { name: 'The corner sofas',
             addr: '19th Floor, Magnum Global Park, Sector 58, Gurugram' } },
];

/* Other days are fixed clock times — only today needs to move with the
   hour. Keyed by how many days out. */
const MEET_DAYS = {
  '-1': [
    { time: '09:00', mins: 30, name: 'Pipeline stand-up',
      who: ['Matt Rivera', 'John Whitaker', 'Grace Coleman'], where: 'Teams' },
    { time: '14:00', mins: 60, name: 'Vantage QBR',
      who: ['Meera Nair', 'Dev Anand', 'Sana Iqbal'], where: 'Teams', acct: 'Vantage' },
  ],
  '1': [
    { time: '09:00', mins: 30, name: 'Pipeline stand-up',
      who: ['Matt Rivera', 'John Whitaker', 'Grace Coleman'], where: 'Teams' },
    { time: '11:00', mins: 45, name: 'Fieldstone — seat count and pricing',
      who: ['Mark Feltner', 'Deal desk'], where: 'Zoom', via: 'zoom',
      acct: 'Fieldstone' },
    { time: '15:30', mins: 30, name: 'Trellis — quarterly check-in',
      who: ['Dana Whitlock'], where: 'Meet', via: 'meet', acct: 'Trellis', rsvp: 'no' },
  ],
  '2': [
    { time: '10:00', mins: 60, name: 'Halden board — expansion decision',
      who: ['Rachel Okafor', 'Their board'], where: 'Zoom', via: 'zoom', acct: 'Halden' },
    { time: '16:00', mins: 30, name: 'Harborview — qualification call',
      who: ['Unassigned'], where: 'Teams', acct: 'Harborview', rsvp: 'none' },
  ],
  '3': [
    { time: '09:00', mins: 30, name: 'Pipeline stand-up',
      who: ['Matt Rivera', 'John Whitaker', 'Grace Coleman'], where: 'Teams' },
    { time: '13:00', mins: 45, name: 'Renewal forecast — Q3 review',
      who: ['Sana Iqbal', 'Finance'], where: 'Room 4' },
  ],
  '4': [
    { time: '11:00', mins: 60, name: 'Sentinel — security review',
      who: ['Priya Raman', 'Their security team', 'Legal'], where: 'Teams',
      acct: 'Sentinel' },
  ],
  '7': [
    { time: '09:00', mins: 30, name: 'Pipeline stand-up',
      who: ['Matt Rivera', 'John Whitaker', 'Grace Coleman'], where: 'Teams' },
    { time: '15:00', mins: 45, name: 'Redwood — renewal review',
      who: ['Sana Iqbal', 'Their ops lead'], where: 'Teams', acct: 'Redwood' },
  ],
};

/* An answer given in the session has to outlive the repaint that follows
   it — meetingsOn builds fresh objects every time, so the reply is kept
   against the meeting rather than on the copy it was given to. */
/* what has been changed about a meeting from inside the app: the name,
   when it starts, how long it runs, where it is held, who has been taken
   off it, and the agenda. Kept per meeting and applied wherever the day
   is built, so an edit shows on the list, the brief and the popover at
   once. */
const MEET_EDIT = {};
const editOf = (key) => (MEET_EDIT[key] = MEET_EDIT[key] || {});

const MEET_RSVP = {};
/* and anybody invited from here, for the same reason */
const MEET_ADDED = {};
const meetKey = (m) => `${m.name}|${m.time || m.at}`;
/* what a meeting is called in a URL — the conferencing link is built
   from it */
const meetSlug = (m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 22);
const copyLink = (url) => navigator.clipboard?.writeText(url).then(
  () => toast('Link copied.'), () => toast('Could not reach the clipboard.'));

const DAY_MS = 86400000;
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayOffset = (d) => Math.round((midnight(d) - midnight(new Date())) / DAY_MS);
const hhmm = (d) => String(d.getHours()).padStart(2, '0') + ':'
                  + String(d.getMinutes()).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* "Today", "Tomorrow", then the day itself — nobody says "in two days" */
function dayLabel(d) {
  const n = dayOffset(d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return DAYS[d.getDay()];
}
const dateLabel = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

/* The day's meetings as real times, so everything after this point is
   arithmetic on dates rather than on strings. */
/* every meeting the app knows about, whichever day it was written for —
   so one that has been moved can be found and put on its new day */
const MEET_SRC = () => [
  ...MEET_TODAY.map(m => ({ m, at: m.at })),
  ...Object.entries(MEET_DAYS).flatMap(([n, list]) => list.map(m => ({ m, n }))),
];
const isoDay = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function meetingsOn(d) {
  const n = dayOffset(d);
  const base = midnight(d);
  const iso = isoDay(d);
  const mk = (m, start) => {
    const key = meetKey(m);
    const e = MEET_EDIT[key] || {};
    const mins = e.mins ?? m.mins;
    /* a start time set by hand is minutes from that morning; left alone,
       the meeting sits where the day put it */
    const st = e.at != null
      ? new Date(+midnight(start) + e.at * 60000) : start;
    return {
      ...m, name: e.name || m.name, via: e.via || m.via, mins,
      start: st, end: new Date(+st + mins * 60000),
      key, rsvp: MEET_RSVP[key] || m.rsvp || 'yes',
    };
  };
  const born = n === 0
    ? MEET_TODAY.map(m =>
        mk(m, new Date(Math.round((Date.now() + m.at * 60000) / 300000) * 300000)))
    : (MEET_DAYS[String(n)] || []).map(m => {
        const [hh, mm] = m.time.split(':').map(Number);
        return mk(m, new Date(+base + hh * 3600000 + mm * 60000));
      });

  /* one that has been moved to another day is no longer on this one, and
     one that has been deleted is on none */
  const here = born.filter(x => {
    const e = MEET_EDIT[x.key] || {};
    return !e.deleted && (!e.day || e.day === iso);
  });

  const moved = MEET_SRC()
    .filter(({ m }) => {
      const e = MEET_EDIT[meetKey(m)];
      return e && !e.deleted && e.day === iso && !here.some(x => x.key === meetKey(m));
    })
    .map(({ m }) => {
      const e = MEET_EDIT[meetKey(m)];
      const mins = e.at != null ? e.at : 9 * 60;
      return mk(m, new Date(+base + mins * 60000));
    });

  return [...here, ...moved].sort((a, b) => a.start - b.start);
}
const hasMeetings = (d) => meetingsOn(d).length > 0;

/* "Meera Nair, Dev Anand and you" — the room, said the way you would say
   it, with the tail counted rather than listed once it stops being a
   room and starts being an audience. */
function roomOf(who) {
  const n = who.length;
  /* a meeting you started yourself has nobody on it yet */
  if (!n) return 'Just you';
  if (n === 1) return `${who[0]} and you`;
  if (n === 2) return `${who[0]}, ${who[1]} and you`;
  /* past three it is an audience rather than a room, and the tail is
     worth more as a count than as a list — the +1 is you */
  return `${who[0]}, ${who[1]} and ${n - 2 + 1} others`;
}

/* Whether you said you would be there. Accepted is the ordinary case and
   says the least; the two that need something from you say more. */
const RSVP = {
  yes:  { label: 'Accepted' },
  none: { label: 'You have not replied' },
  no:   { label: 'Declined' },
};

/* A meeting somebody started rather than booked has no end time to
   show while it is still running, and no invitation behind it — so it
   says when it began and leaves the rest alone until there is something
   true to put there. */
const isOpen = (m) => m.adhoc && !m.mins;
const meetSpan = (m) => isOpen(m)
  ? `Started ${hhmm(m.start)}`
  : `${hhmm(m.start)} \u2013 ${hhmm(m.end)}`;

const DURATION = (m) => isOpen(m) ? '' : m.mins >= 60
  ? (m.mins % 60 ? `${Math.floor(m.mins / 60)}h ${m.mins % 60}m` : `${m.mins / 60}h`)
  : `${m.mins}m`;

/* Where a meeting is held, when it is held somewhere rather than
   somewhere. Each carries its own mark and its own way of naming the
   link, because "Join with Teams" and "Join with Zoom" are the words
   people actually look for. */
const PLATFORM = {
  teams: { label: 'Teams', join: 'Join with Teams',
           link: (k) => 'teams.microsoft.com/l/' + k },
  zoom:  { label: 'Zoom',  join: 'Join with Zoom',
           /* a Zoom id is eleven digits, and a short one reads as a
              placeholder */
           link: (k) => 'unifyapps.zoom.us/j/'
                      + (85000000000 + [...k].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) % 9000000000) },
  meet:  { label: 'Meet',  join: 'Join with Google Meet',
           link: (k) => 'meet.google.com/' + k.replace(/[^a-z]/g, '').slice(0, 3) + '-'
                      + k.replace(/[^a-z]/g, '').slice(3, 7) + '-'
                      + k.replace(/[^a-z]/g, '').slice(7, 10) },
};

/* Everybody who turns up in a calendar here, with the address the
   invitation actually went to. Groups keep an alias, because that is
   what an invitation to a group is. */
const MEET_BOOK = {
  'Matt Rivera':    'matt.rivera@unifyapps.com',
  'John Whitaker':  'john.whitaker@unifyapps.com',
  'Grace Coleman':  'grace.coleman@unifyapps.com',
  'Sana Iqbal':     'sana.iqbal@unifyapps.com',
  'Dev Anand':      'dev.anand@unifyapps.com',
  'Priya Raman':    'priya.raman@unifyapps.com',
  'Callum Reid':    'callum.reid@brightpath.com',
  'Rachel Okafor':  'rachel.okafor@halden.com',
  'Meera Nair':     'meera.nair@vantage.com',
  'Mark Feltner':   'mark.feltner@fieldstone.com',
  'Dana Whitlock':  'dana.whitlock@trellis.com',
  'Owen Castillo':  'owen.castillo@unifyapps.com',
  'Deal desk':      'dealdesk@unifyapps.com',
  'Legal':          'legal@unifyapps.com',
  'Enablement':     'enablement@unifyapps.com',
  'Finance':        'finance@unifyapps.com',
  'Their board':    'board@halden.com',
  'Their security team': 'security@sentinel.com',
  'Their ops lead': 'ops@redwood.com',
  'Unassigned':     'hello@harborview.com',
};
/* Yes unless the meeting says otherwise. The first name on the list is
   whoever called it. */
const ATT = (m) => [
  ...m.who.filter(n => !(MEET_EDIT[m.key]?.drop || []).includes(n)).map((n, i) => ({
    name: n, mail: mailOf(n), lead: i === 0,
    rsvp: (m.att && m.att[n]) || 'yes',
  })),
  /* somebody you have just invited has not answered yet, because nobody
     answers in the second you invite them */
  ...(MEET_ADDED[m.key] || []).map(n => ({
    name: n, mail: mailOf(n), lead: false, rsvp: 'none', fresh: true,
  })),
];

/* Everyone this workspace knows about, for the field that adds one.
   Two books because the mail composer keeps its own; a person is a
   person whichever of them they turn up in. */
const INVITE_BOOK = () => {
  const out = new Map();
  for (const n of Object.keys(MEET_BOOK)) out.set(n, MEET_BOOK[n]);
  if (typeof MAIL_BOOK !== 'undefined') for (const c of MAIL_BOOK) {
    if (!out.has(c.n)) out.set(c.n, c.e);
  }
  return [...out].map(([n, e]) => ({ n, e }));
};

const RSVP_WORD = { yes: 'Yes', no: 'No', maybe: 'Maybe', none: 'Awaiting' };

/* Monday, 7 September */
const longDate = (d) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/* ── the meeting, in full ──
   Everything an invitation holds and nothing it does not: what it is,
   when, the way in, who is coming and what each of them said, and the
   one question it is asking you.

   Anchored to the row it came from rather than centred behind a scrim —
   it is a detail of the thing you are looking at, and dimming the list
   to show you a line of it was the wrong size of gesture.
*/
/* ── the parts of an invitation that behave the same wherever it is shown ──
   The card and the editor show the same guest list, the same invite
   field and the same three answers, so they are built once and handed
   to both. */
function meetingBits(m, onAnswer) {
  const answers = h('div', { class: 'md-answers' });
  const paintAnswers = () => {
    answers.replaceChildren(...['yes', 'maybe', 'no'].map(k => h('button', {
      class: 'md-ans', type: 'button',
      /* nothing is selected until you have answered — an invitation you
         have not replied to must not look like one you accepted */
      'data-on': String(m.rsvp === k),
      onclick: (e) => {
        e.stopPropagation();
        m.rsvp = k; MEET_RSVP[m.key] = k;
        paintAnswers(); paintPeople(); onAnswer?.();
      },
    }, RSVP_WORD[k])));
  };

  /* A face with what they said stamped on it — a tick for yes, a cross
     for no, and nothing at all while an invitation is still out. */
  const person = (name, rsvp, note) => h('div', {
    class: 'md-p', 'data-person': name,
    /* a name in an invitation is a person, and a person has a page */
    onclick: (e) => {
      if (e.target.closest('.md-p-copy')) return;
      closeMenu();
      personPanel(name, { meeting: m });
    },
  },
    h('span', { class: 'md-p-av' },
      faceEl(name, 'md-av'),
      h('span', { class: 'md-p-badge', 'data-rsvp': rsvp, title: RSVP_WORD[rsvp],
                  html: MD_MARK[rsvp] || '' })),
    h('span', { class: 'md-p-main' },
      h('span', { class: 'md-p-n' }, name,
        note ? h('span', { class: 'md-p-lead' }, note) : null),
      h('span', { class: 'md-p-e' }, mailOf(name))),
    /* the address is right there, so taking it should not mean selecting
       it — the button waits for the pointer on the row it belongs to */
    h('button', {
      class: 'md-p-copy', type: 'button',
      title: 'Copy email', 'aria-label': `Copy ${mailOf(name)}`,
      html: MI(GLYPHS.copy),
      onclick: (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(mailOf(name)).then(
          () => toast('Address copied.'), () => toast('Could not reach the clipboard.'));
      },
    }));

  const list = h('div', { class: 'md-people' });
  const count = h('div', { class: 'md-sect' });
  const invite = h('div', { class: 'md-invite' });

  /* ── inviting one more ──
     A field where the count was, matching as you type. It stays open
     after each pick, because the reason you opened it is rarely one
     person, and it closes on Escape or on clicking away from it. */
  let inviting = false;
  const openInvite = () => { inviting = true; paintPeople();
    requestAnimationFrame(() => invite.querySelector('input')?.focus()); };
  const shutInvite = () => { inviting = false; paintPeople(); };

  const paintInvite = () => {
    if (!inviting) { invite.replaceChildren(); return; }
    const here = new Set([USER.name, ...ATT(m).map(p => p.name)]);
    const sug = h('div', { class: 'md-sug' });
    const field = h('input', {
      class: 'md-inv-in', type: 'text', placeholder: 'Name or email address',
      'aria-label': 'Invite somebody', spellcheck: 'false',
      oninput: () => match(), onkeydown: (e) => key(e),
    });
    let hits = [], at = 0;

    const add = (name) => {
      MEET_ADDED[m.key] = [...(MEET_ADDED[m.key] || []), name];
      field.value = '';
      paintPeople();
      requestAnimationFrame(() => invite.querySelector('input')?.focus());
      onAnswer?.();
      toast(`${name} invited.`);
    };

    const match = () => {
      const q = field.value.trim().toLowerCase();
      hits = !q ? [] : INVITE_BOOK()
        .filter(c => !here.has(c.n)
          && (c.n.toLowerCase().includes(q) || c.e.toLowerCase().includes(q)))
        .slice(0, 5);
      at = 0;
      paintSug();
    };
    const paintSug = () => {
      sug.replaceChildren(...hits.map((c, i) => h('button', {
        class: 'md-sug-row' + (i === at ? ' is-on' : ''), type: 'button',
        onclick: (e) => { e.stopPropagation(); add(c.n); },
      },
        faceEl(c.n, 'md-sug-av'),
        h('span', { class: 'md-sug-m' },
          h('span', { class: 'md-sug-n' }, c.n),
          h('span', { class: 'md-sug-e' }, c.e)))));
      sug.hidden = !hits.length;
    };
    const key = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') return shutInvite();
      if (!hits.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); at = (at + 1) % hits.length; paintSug(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); at = (at - 1 + hits.length) % hits.length; paintSug(); }
      else if (e.key === 'Enter') { e.preventDefault(); add(hits[at].n); }
    };

    sug.hidden = true;
    invite.replaceChildren(h('div', { class: 'md-inv' }, field,
      h('button', { class: 'md-inv-x', type: 'button', 'aria-label': 'Done',
                    onclick: (e) => { e.stopPropagation(); shutInvite(); } }, '\u00d7')), sug);
  };

  const paintPeople = () => {
    const me = m.rsvp || 'none';
    const all = ATT(m);
    const total = all.length + 1;
    /* replaceChildren does not filter what h() would — a null reaching it
       lands in the panel as the word "null" */
    count.replaceChildren(...[
      /* the count and nothing else — every face below carries what that
         person said, so tallying them up here said it twice */
      /* just the count: inviting somebody is a change to the meeting,
         and changes to the meeting are made where you edit it */
      h('span', {}, `${total} ${total === 1 ? 'person' : 'people'}`),
    ].filter(Boolean));
    paintInvite();
    list.replaceChildren(
      person(USER.name, me, 'You'),
      ...all.map(p => person(p.name, p.rsvp, p.lead ? 'Organiser' : null)));
  };
  paintAnswers(); paintPeople();
  return { answers, count, invite, list, paintPeople, paintAnswers };
}

function meetingCard(anchor, m, onAnswer) {
  closeMenu();
  const people = ATT(m);
  const mine = m.rsvp || 'yes';
  const said = people.filter(p => p.rsvp === 'yes').length + (mine === 'yes' ? 1 : 0);
  const wait = people.filter(p => p.rsvp === 'none').length + (mine === 'none' ? 1 : 0);
  const n = people.length + 1;

  /* a link when it is held on something, an address when it is held
     somewhere — an invitation answers "how do I get there" one way or
     the other, never both */
  const plat = !m.place && !m.adhoc && PLATFORM[m.via || 'teams'];
  const slug = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 22);
  const link = plat ? plat.link(slug) : null;

  const { answers, count, invite, list } = meetingBits(m, onAnswer);

  const el = h('div', { class: 'menu md-pop' },
    h('header', { class: 'md-head' },
      h('div', { class: 'md-head-r' },
        h('h2', { class: 'md-title' }, m.name),
        /* the invitation, opened up: everything on it, editable */
        /* the mark on its own: the title line is a title, and a second
           word beside it read as a second heading */
        h('button', {
          class: 'md-edit', type: 'button', title: 'Edit this meeting',
          'aria-label': 'Edit this meeting',
          onclick: (e) => { e.stopPropagation(); closeMenu(); meetingPanel(m); },
          html: MI(GLYPHS.rename),
        })),
      h('p', { class: 'md-when' },
        `${longDate(m.start)} · ${meetSpan(m)}`)),
    h('div', { class: 'md-body' },
      /* the way in, first — it is the only thing in here anybody opens
         in a hurry */
      link ? h('div', { class: 'md-join' },
        h('span', { class: 'md-join-ic', 'aria-hidden': 'true',
                    html: `<svg viewBox="0 0 24 24"><use href="#b-${m.via || 'teams'}"></use></svg>` }),
        h('span', { class: 'md-join-m' },
          h('button', { class: 'md-join-go', type: 'button',
                        onclick: () => { closeMenu(); toast(`Joining opens ${plat.label} in the next pass.`); } },
            plat.join),
          h('span', { class: 'md-join-u' }, link)),
        h('button', { class: 'md-copy', type: 'button', title: 'Copy the link',
                      'aria-label': 'Copy the link',
                      onclick: () => navigator.clipboard?.writeText('https://' + link).then(
                        () => toast('Link copied.'), () => toast('Could not reach the clipboard.')) },
          h('span', { class: 'md-copy-ic', 'aria-hidden': 'true', html: MI(GLYPHS.copy) }))
      ) : h('div', { class: 'md-place' },
        h('span', { class: 'md-place-ic', 'aria-hidden': 'true',
                    html: m.adhoc ? DEVICE_IC : PIN_IC }),
        h('span', { class: 'md-place-m' },
          h('span', { class: 'md-place-n' },
            m.adhoc ? 'Started on this device'
              : m.place ? m.place.name : m.where),
          /* said once, quietly: there was no invitation behind this one */
          h('span', { class: 'md-place-a' },
            m.adhoc ? 'Started on demand \u2014 not in your calendar'
              : m.place ? m.place.addr : ''))),
      /* the room first, then what it is for: who is coming is the thing
         people open an invitation to check */
      count, invite, list,
      m.agenda ? h('div', { class: 'md-sect' }, 'Agenda') : null,
      m.agenda ? h('ul', { class: 'md-agenda' },
        m.agenda.map(x => h('li', {}, x))) : null),
    /* there is nobody to answer: you started this one, and you are in
       it. The footer belongs to an invitation. */
    m.adhoc ? null : h('footer', { class: 'md-foot' },
      h('span', { class: 'md-going' }, 'Going?'),
      answers));

  document.body.append(el);
  openMenu = el;
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = Math.max(12, Math.min(r.left - 8, innerWidth - w - 12)) + 'px';
  el.style.top = (r.bottom + hgt + 14 > innerHeight
    ? Math.max(12, r.top - hgt - 8) : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
}

const APPLE_IC = '<svg viewBox="0 0 24 24" fill="currentColor">'
  + '<path d="M16.3 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8'
  + '-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.8 2.3'
  + ' 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.2-2.5'
  + '-.1 0-2.3-.9-2.3-3.7zM14.1 5.9c.6-.7 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.6-1.1 1.7-.9 2.7'
  + ' 1 .1 2-.5 2.6-1.2z"/></svg>';

const CHEV_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M6 14.5 12 8.5l6 6"/></svg>';
const CHEV_DN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M6 9.5 12 15.5l6-6"/></svg>';

const CLOCK_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4V12l3 1.8"/></svg>';

/* a laptop, drawn to sit in the middle of its own box: the screen and
   the deck together run 5.4 to 18.8 of 24, so the mark lands on the
   line of type beside it rather than under it */
const DEVICE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="4.2" y="5.4" width="15.6" height="10.6" rx="1.8"/>'
  + '<path d="M2.4 18.8h19.2"/></svg>';

const PIN_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/>'
  + '<circle cx="12" cy="10" r="2.6"/></svg>';

/* a tick and a cross, at the size a badge on a face can carry */
const MD_MARK = {
  yes: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" '
     + 'stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.3l2.1 2.1L9 4.3"/></svg>',
  no:  '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" '
     + 'stroke-linecap="round"><path d="M3.8 3.8l4.4 4.4M8.2 3.8l-4.4 4.4"/></svg>',
  maybe: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" '
     + 'stroke-linecap="round"><path d="M3.4 6h5.2"/></svg>',
  none: '',
};

/* ── what the assistant prepared ──
   A brief is not a summary of the account; it is the answer to "what do
   I need in my head for the next half hour". So: why this is happening,
   what is actually open, what changed since you last spoke, and the two
   or three things worth saying. Everything in it came from somewhere,
   and the somewhere is at the foot.
*/
const MEET_BRIEF = {
  'Halden — expansion pricing review': {
    why: 'Owen approved the structure on Friday and Rachel has been waiting '
       + 'since Tuesday. Their board meets Thursday, so this is the call where the '
       + 'numbers either land or the expansion moves a quarter.',
    blocks: [
      { h: 'Where it stands', li: [
        '$380k expansion, 120 seats on top of the 340 they already run. Their '
          + 'current contract renews in June, so this rides on top of it rather '
          + 'than replacing it.',
        'Owen signed off the discount floor on Friday — 22% at 36 months.',
        'Nothing has gone to Rachel yet. She asked on Tuesday and again on Friday.',
        'The account is healthy: 78 on health, usage flat since the March rollout, '
          + 'no open support tickets above P3.',
      ] },
      { h: 'The three structures', li: [
        '12 months at list. Cleanest for us, worst unit cost for them, and it puts '
          + 'this conversation back on the table in a year.',
        '24 months at 16%. What Rachel asked for in the original mail.',
        '36 months at 22%. Better for them and the one Owen prefers. Takes 14% '
          + 'off their unit cost, which is the number their board will actually '
          + 'look at, and it moves their renewal to a single date in 2029.',
      ] },
      { h: 'What they will push on', li: [
        'A ramp. Rachel asked for one on the last expansion and did not get it; '
          + 'expect it again. Owen will take a three-month ramp at 36 months '
          + 'and not at 24.',
        'Payment terms. They are on net-45 and Finance has flagged twice that they '
          + 'pay at 60. Do not trade terms for months — trade months for the '
          + 'discount.',
        'A pilot on the extra seats. There is nothing to pilot: same product, same '
          + 'workspace, and the 340 have been live since March.',
      ] },
      { h: 'What to say', li: [
        'Lead with 36 months. It is the only option that improves what Rachel is '
          + 'paying per seat today, and that is the sentence her board needs.',
        'Rachel’s board meets Thursday, so the ask is a decision this week rather '
          + 'than a follow-up call.',
        'Do not reopen the seat count. It is agreed, and reopening it sends the '
          + 'whole thing back through Owen.',
        'If Rachel wants to think about it, get her the paper today anyway — '
          + 'she cannot put a decision to a board she has nothing to show.',
      ] },
      { h: 'Have ready', li: [
        'Unit cost at each of the three terms, per seat per month.',
        'The March rollout numbers — 340 seats, 71% weekly active — because the '
          + 'case for 120 more is that the first 340 are being used.',
        'The 2029 renewal date, if they take 36 months.',
      ] },
    ],
  },

  'Brightpath — phase two rollout': {
    why: 'Phase two has been agreed in principle since July and blocked in '
       + 'practice since 22 August, when Callum sent a security questionnaire '
       + 'that is still sitting with legal.',
    blocks: [
      { h: 'Where it stands', li: [
        'Phase one has been live since March — 210 seats, 68% weekly active.',
        'The questionnaire went to Legal on 23 August and has not moved. Callum '
          + 'has chased twice, and Sana is the one to ask for a date.',
        'Nine of the fourteen questions are answered verbatim in the standard '
          + 'security pack. The other five are about the Context Graph\u2019s '
          + 'retention window.',
      ] },
      { h: 'What Callum will ask for', li: [
        'A date. Callum has been asked for one twice by his own side.',
        'The retention answer in writing, in language his security lead can '
          + 'forward.',
      ] },
      { h: 'What to say', li: [
        'Give Callum Wednesday for the five answers and hold to it regardless of '
          + 'where Legal gets to.',
        'The renewal is in February at $410k, and phase two is the reason it '
          + 'renews \u2014 do not let the date drift without saying so.',
      ] },
    ],
  },

  'Vantage — data residency follow-up': {
    why: 'Meera asked two questions on the QBR on the 28th and you said you would '
       + 'come back within the week. It is nine days. Their renewal review is in '
       + 'February and anything still open now becomes a condition then.',
    blocks: [
      { h: 'What Meera asked', li: [
        'Which region the Context Graph is built in for an EU tenant.',
        'What our model providers actually receive — she was specific that '
          + '\u201cnothing identifiable\u201d was the answer she needed, not '
          + '\u201cnothing is stored\u201d.',
      ] },
      { h: 'The answer', li: [
        'EU tenants build and store in eu-west-1. Nothing leaves the region except '
          + 'model traffic, and that is the part the second question is about.',
        'Three providers see traffic. Two receive text spans with identifiers '
          + 'already stripped by the redaction pass; the third receives embeddings '
          + 'only and never sees text at all.',
        'Retention is thirty days, and it is thirty because we hold embeddings and '
          + 'pointers rather than source documents. That distinction is what makes '
          + 'the window acceptable — there is nothing in the store to leak.',
        'All of it is already in the signed DPA. None of this is new commitment, '
          + 'which is worth saying out loud.',
      ] },
      { h: 'Why Meera is asking now', li: [
        'Their own customers started asking in July — two of their three largest '
          + 'accounts are German public sector.',
        'Meera is building an answer she can give them, not testing us. Give her '
          + 'something she can forward.',
        'Their security team has not been in any of these conversations, which is '
          + 'unusual and probably means this is still hers to decide.',
      ] },
      { h: 'Worth knowing', li: [
        'It is nine days past what you promised. Say so first and do not explain it.',
        'Dev has not confirmed for this call. If he is not there, the retention '
          + 'answer is the one you may have to defend alone.',
        'The renewal is $540k in February, and residency is the only open item on '
          + 'the account.',
      ] },
      { h: 'What to leave her with', li: [
        'The one-page residency note, sent on the call rather than after it.',
        'A named person on our side for her security team, so the February review '
          + 'does not start from zero.',
      ] },
    ],
    /* ── what was got ready ──
       Two kinds of thing: what already exists and had to be found, and
       what did not exist and was written. Both are here because the half
       hour before a call is spent looking for exactly these. */
    prep: {
      /* why each one exists, in the words of whoever asked for it —
         a summary of the contents is on the page itself, and what you
         cannot see from the page is which request it answers */
      made: [
        ['Data residency',
          'Meera asked for this on the QBR on 28 August \u2014 region, providers '
          + 'and retention on one page.'],
        ['Residency walkthrough',
          'Meera needs something to put in front of her own customers. '
          + 'Six slides, no notes to write.'],
        ['Sub-processors',
          'Vantage\u2019s security team asked for the provider list in '
          + 'Meera\u2019s email on 2 September.'],
      ],
    },
  },

  'Sentinel — security review prep': {
    why: 'Their security review is on the 18th and it is the last thing between us '
       + 'and a decision. This is the half hour where we decide who says what.',
    blocks: [
      { h: 'Where it stands', li: [
        '$480k of new business, at proposal. They said a decision by the end of the '
          + 'month on the call last Thursday.',
        'They asked for the standard pack, the 2026 pen test summary and a named '
          + 'contact for their security lead.',
        'The pack is the same one Brightpath is waiting on. One document unblocks both.',
      ] },
      { h: 'What to settle here', li: [
        'Who runs the review. John knows the architecture; Legal knows what we can '
          + 'commit to. Both in the room is right, one of them leading is better.',
        'What we do not answer live. Anything about sub-processors goes to writing, '
          + 'because that is where the DPA language lives.',
        'Whether we send the pack before the 18th or walk them through it. Sending '
          + 'it first is faster and gives them time to come back with the real '
          + 'questions.',
      ] },
      { h: 'Worth knowing', li: [
        'They are a security company. Vague answers cost more here than a slow one.',
        'This is a prospect, not a customer — there is no DPA to point at yet.',
      ] },
    ],
  },

  'Enablement — new pricing rollout': {
    why: 'The new pricing lands on 1 October and this is the session where the '
       + 'field is walked through it. You have declined; the recording is the '
       + 'fallback.',
    blocks: [
      { h: 'What it covers', li: [
        'The new list, the new discount floors and the approval path.',
        'What happens to deals already in flight — Halden\u2019s expansion is one '
          + 'of them.',
        'The migration story for accounts on legacy seat pricing, which Advance '
          + 'Auto is on.',
      ] },
      { h: 'What you need out of it', li: [
        'Whether the Halden structure survives the change, since Owen approved '
          + 'it under the old floor.',
        'The line to use with Fieldstone, who renew on 30 November and are on '
          + 'legacy pricing.',
      ] },
    ],
  },

  '1:1 with Sana': {
    why: 'Twenty-five minutes, weekly. Renewal season is the whole of the agenda '
       + 'unless you bring something else.',
    blocks: [
      { h: 'Worth raising', li: [
        'Redwood. Nobody owns it on their side and the renewal is in January '
          + 'at $620k — this needs a decision about how hard to push before it '
          + 'becomes a procurement conversation.',
        'The Brightpath questionnaire has been with Legal for eleven days. It is not '
          + 'your escalation to make — Sana can give you the date.',
        'Halden closes or slips this week, depending on whether the pricing lands '
          + 'before their board on Thursday.',
      ] },
      { h: 'What Sana will ask about', li: [
        'The four at-risk renewals and what each one is waiting on.',
        'Whether the pipeline stand-up actions from Friday are cleared.',
      ] },
    ],
  },

  'Redwood — who owns it now': {
    why: 'Usage is down 40% and nobody on our side noticed for seven weeks. They '
       + 'renew in January at $620k, and right now there is no one at their end '
       + 'who owns it.',
    blocks: [
      { h: 'What happened', li: [
        'Operations was 71% of weekly active use through June and is now near zero.',
        'The drop starts the week of 14 July, which is the week Priya Raman left.',
        'Forty-one seats have not been reassigned. They are being paid for.',
        'No support tickets, no complaints, no cancellation signal — it simply '
          + 'stopped, which is the worst kind of quiet.',
      ] },
      { h: 'Who is left', li: [
        'Fourteen people have ever logged in. Eleven are in Operations, the team '
          + 'that stopped.',
        'Of the three outside it, two are in finance and one is the security '
          + 'reviewer from the original rollout.',
        'There is no obvious second champion. Whoever picks this up starts from '
          + 'finance or from the reviewer, and neither has used the product.',
      ] },
      { h: 'What to ask', li: [
        'Who replaced Priya, and whether that person knows the seats exist.',
        'Whether Operations stopped because the work stopped, or because nobody '
          + 'showed them after she left.',
        'What their renewal process looks like when the sponsor has gone — is it '
          + 'procurement, or is somebody making a case?',
      ] },
      { h: 'What good looks like', li: [
        'A named owner before the end of the month. Everything else follows from '
          + 'that and nothing works without it.',
        'One session with whoever inherits Operations, on their workflows rather '
          + 'than on the product.',
        'The forty-one seats either used or renegotiated. Paying for unused seats '
          + 'is the argument procurement will make in January, and it is a good '
          + 'one.',
      ] },
      { h: 'Do not', li: [
        'Lead with the usage number. It reads as a bill, and Sana did not cause it.',
        'Offer to reduce the seat count on this call. That is January\u2019s '
          + 'conversation and it is the outcome we are trying to avoid.',
      ] },
    ],
  },
};

/* ── what a meeting left behind ──
   A transcript is the record and a summary is the reading of it. Both,
   because the summary is only trustworthy if the record is a click away.
*/
const MEET_RECAP = {
  'Brightpath — phase two rollout': {
    summary: {
      why: 'Phase two is agreed in principle and blocked in practice. Everything '
         + 'said in the room turned on one mail that has been sitting with legal '
         + 'since 23 August.',
      blocks: [
        { h: 'Decided', li: [
          'Phase two scope is the three workflows Callum named — onboarding, '
            + 'certification renewal and the manager approval chain. Nothing else '
            + 'in this phase.',
          'A start date of 22 September, conditional on the security questionnaire '
            + 'coming back.',
          'No pilot. The first phase has been live since March and they are not '
            + 'repeating it.',
        ] },
        { h: 'Committed', li: [
          'You: the five outstanding questionnaire answers to Callum by Wednesday.',
          'Callum: confirmation from their security lead that the standard pack '
            + 'covers the other nine.',
          'Dev: a scoped estimate for the approval chain, which is the only one of '
            + 'the three that needs build.',
        ] },
        { h: 'Left open', li: [
          'Whether the 22 September date survives if legal takes another week. '
            + 'Callum did not push, but he did say their board sees the rollout '
            + 'plan in October.',
          'Who owns the certification workflow on their side. Callum named two '
            + 'people and neither is in the room.',
        ] },
        { h: 'Worth noticing', li: [
          'Callum brought up the questionnaire three times unprompted. He is more '
            + 'worried about it than he is saying.',
          'The renewal is in February, and phase two is the reason it renews.',
        ] },
      ],
    },
    transcript: [
      { t: '00:12', who: 'Callum Reid', text:
        'Before we get into scope — is there any movement on the security '
        + 'questionnaire? I have my security lead asking me twice a week now.' },
      { t: '00:31', who: 'Roger Bennett', text:
        'It is with our legal team. It went across on the 23rd and it has not '
        + 'come back. I am chasing it today and I will have the five open answers '
        + 'to you regardless of where legal gets to.' },
      { t: '00:58', who: 'Callum Reid', text:
        'Regardless is the word I needed. Nine of the fourteen are standard, we '
        + 'both know that. It is the retention ones that are holding it.' },
      { t: '01:24', who: 'Dev Anand', text:
        'The retention answer is straightforward once it is written down. We hold '
        + 'embeddings and pointers, not the documents. The thirty-day window means '
        + 'something different when there is nothing in the store to begin with.' },
      { t: '01:52', who: 'Callum Reid', text:
        'That is exactly the sentence my security lead needs. Put that in writing '
        + 'and I think this goes away.' },
      { t: '02:15', who: 'Roger Bennett', text:
        'Wednesday. Let us talk about phase two on the assumption it clears.' },
      { t: '02:34', who: 'Callum Reid', text:
        'Three workflows. Onboarding, certification renewal, and the manager '
        + 'approval chain. I do not want to add anything to that list — we tried '
        + 'to do too much in phase one and it cost us six weeks.' },
      { t: '03:02', who: 'Dev Anand', text:
        'Two of those three are configuration. The approval chain is the one that '
        + 'needs build — there is a conditional branch in it that we do not do out '
        + 'of the box. I can scope it this week.' },
      { t: '03:29', who: 'Callum Reid', text:
        'Do that. And no pilot this time. We have been live since March, my people '
        + 'know the product, a pilot just moves the date.' },
      { t: '03:47', who: 'Roger Bennett', text:
        'Agreed. Twenty-second of September, if the questionnaire clears.' },
      { t: '04:05', who: 'Callum Reid', text:
        'That works. One thing — our board sees the rollout plan in October, so if '
        + 'this slips I need to know before then rather than after.' },
      { t: '04:22', who: 'Roger Bennett', text:
        'Understood. I will come back to you on Wednesday either way.' },
    ],
  },

  /* Recorded on somebody's phone, so it comes back diarised and
     anonymous: two of the three voices are on the invitation and one is
     not, which is the ordinary shape of a call that grew. */
  'Orion — pricing escalation': {
    manual: true,
    summary: {
      why: 'Orion called this at a day\u2019s notice to hold the FY26 uplift '
         + 'at 4%, ahead of a board meeting on Thursday. Twelve minutes, three '
         + 'people, and it ran to the number rather than to the relationship \u2014 '
         + 'nobody moved, and nobody was expected to.',
      blocks: [
        { h: 'What they came to say', li: [
          'The uplift is the one line their board will stop on, and they want it '
            + 'held at 4% across the whole estate rather than on the platform '
            + 'lines alone.',
          'Above 4% they say the business case is re-opened. That was said twice '
            + '\u2014 firmly the first time, and with "I am not saying no" attached '
            + 'to it the second.',
          'The ask is for something in writing before Thursday, not for a decision '
            + 'on the call.',
        ] },
        { h: 'Where we landed', li: [
          '4% is below what the contract indexes to, and that was said plainly '
            + 'rather than argued.',
          'No number was given back. The position goes in writing, which keeps the '
            + 'conversation with us until Thursday rather than with their board.',
          'A three-year view was offered as the alternative frame: the same total, '
            + 'shaped differently, so holding at 4% has something to be compared '
            + 'against.',
        ] },
        { h: 'What is still open', li: [
          'Whether 4% is a ceiling or an opening. The softening on the second pass '
            + 'suggests an opening, and it is worth testing in writing rather than '
            + 'on a call.',
          'Whether their board sees our position or a summary of it. Ask, because '
            + 'the two want different documents.',
          'Whether the whole estate is really in scope, or whether that framing '
            + 'came from the platform lines being the ones under pressure.',
        ] },
        { h: 'Worth knowing', li: [
          'They booked this at a day\u2019s notice, which is the strongest signal '
            + 'in the call \u2014 the board date is doing the work here.',
          'Nobody from their finance side was on it. The number is being carried by '
            + 'the sponsor, not defended by the people who own it.',
        ] },
      ],
      /* what somebody has to do about it, which is a different kind of
         line from everything above and gets a different treatment */
      acts: [
        { t: 'Send the written position on the FY26 uplift',
          m: 'Before Thursday\u2019s board \u00b7 you' },
        { t: 'Get the three-year figure from Deal desk',
          m: 'So they can compare it against holding at 4% \u00b7 Owen Castillo' },
        { t: 'Ask whether their board sees the position or a summary',
          m: 'One line back to Priya \u00b7 today' },
        { t: 'Confirm whether the whole estate is in scope',
          m: 'It changes the number \u00b7 you' },
      ],
    },
    transcript: [
      { t: '00:06', who: 'Speaker 1', text:
        'Thanks for making the time at short notice. We have got our board on '
        + 'Thursday and the uplift is the one line they will stop on.' },
      { t: '00:24', who: 'Speaker 2', text:
        'Understood. Before we get to the number — is this the whole estate or '
        + 'just the platform lines?' },
      { t: '00:41', who: 'Speaker 1', text:
        'The whole estate. Which is why four per cent is where we have landed. '
        + 'Anything above that and we are re-opening the business case.' },
      { t: '01:03', who: 'Speaker 3', text:
        'Four is below what the contract indexes to. I am not saying no, I am '
        + 'saying it needs a reason we can write down.' },
      { t: '01:28', who: 'Speaker 2', text:
        'Priya, is the indexation clause the 2023 one or the amended one?' },
      { t: '01:34', who: 'Speaker 3', text:
        'The amended one. It came in with the second phase.' },
      { t: '01:52', who: 'Speaker 1', text:
        'Then let us have the three-year figure alongside it. If holding at four '
        + 'costs us less over three years than a renegotiation, that is the paper '
        + 'our board needs.' },
      { t: '02:19', who: 'Speaker 2', text:
        'That I can write. Thursday morning, before your board sits.' },
      { t: '02:31', who: 'Speaker 1', text:
        'Good. And Dev, if the platform lines move separately, flag it early — '
        + 'we do not want to find that out on the call after this one.' },
      { t: '02:44', who: 'Speaker 3', text:
        'They do not move separately. I will confirm it in writing anyway.' },
    ],
  },
  'Pipeline stand-up': {
    summary: {
      why: 'Fifteen minutes on the quarter. Two things came out of it and the '
         + 'rest was status.',
      blocks: [
        { h: 'Decided', li: [
          'The six deals with no next step get one or a close-lost by Friday. '
            + 'Matt owns four of them.',
          'Coverage is reported by rep from next week rather than in aggregate.',
        ] },
        { h: 'Committed', li: [
          'Matt: next steps or close-lost on Vertex, Summit, Orion and Atlas '
            + 'by Friday.',
          'Grace: the Atlas competitive picture on the accounts where they are '
            + 'present.',
          'You: the renewal list ahead of Monday.',
        ] },
        { h: 'Left open', li: [
          'Whether Vertex is dead. Matt thinks so; nobody has marked it.',
        ] },
      ],
    },
    transcript: [
      { t: '00:08', who: 'Matt Rivera', text:
        'Commit is $8.4M. The gap is not pipeline, it is six deals that stopped '
        + 'moving and nobody marked them.' },
      { t: '00:26', who: 'John Whitaker', text:
        'Coverage by rep is the number I would act on. Marcus is at 1.9x with five '
        + 'slipping — that is a staffing problem, not a forecasting one.' },
      { t: '00:51', who: 'Grace Coleman', text:
        'Atlas is present on three of the six. That is a pattern rather than a '
        + 'coincidence and it should be on the board slide.' },
      { t: '01:14', who: 'Matt Rivera', text:
        'Two of the six I would write off today. Vertex has been chasing a new exec '
        + 'sponsor for three weeks and Atlas is already inside.' },
      { t: '01:38', who: 'Roger Bennett', text:
        'Then mark them. A close-lost this week is worth more than an optimistic '
        + 'commit next month. Friday for all six.' },
      { t: '01:55', who: 'Matt Rivera', text:
        'Friday works. I have four of them.' },
    ],
  },
};

/* ── the slash menu ──
   A blank page is the hardest thing to write on, so the page offers to
   start it. Three blocks for people who know what they want, and five
   templates for the meetings this job actually has.
*/
/* Drawn, not typed. Emoji carry somebody else's drawing style into a
   menu that has one of its own, and "H" as a heading icon is a letter
   pretending to be a mark. */
const NI = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const NOTE_IC = {
  heading:  NI('<path d="M6 4.5v15"/><path d="M18 4.5v15"/><path d="M6 12h12"/>'),
  bullets:  NI('<path d="M9.5 6.5h11"/><path d="M9.5 12h11"/><path d="M9.5 17.5h11"/>'
             + '<circle cx="4.8" cy="6.5" r="1.3" fill="currentColor" stroke="none"/>'
             + '<circle cx="4.8" cy="12" r="1.3" fill="currentColor" stroke="none"/>'
             + '<circle cx="4.8" cy="17.5" r="1.3" fill="currentColor" stroke="none"/>'),
  checks:   NI('<path d="M11 6.5h9.5"/><path d="M11 17.5h9.5"/>'
             + '<path d="M3 6.4l1.8 1.8L8 5"/><path d="M3 17.4l1.8 1.8L8 16"/>'),
  /* discovery is a question you have not asked yet */
  discover: NI('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.7-4.7"/>'
             + '<path d="M9.4 9.2a1.9 1.9 0 1 1 2.4 2.6c-.5.3-.8.8-.8 1.4"/>'
             + '<path d="M11 15.4h.01"/>'),
  fix:      NI('<path d="M14.7 6.3a4.5 4.5 0 0 0 5.9 5.9l-8.4 8.4a2.6 2.6 0 0 1-3.7-3.7z"/>'
             + '<path d="M17.6 3.4 20.6 6.4"/>'),
  week:     NI('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/>'
             + '<path d="M3.5 9.5h17"/><path d="M8 3.5v3"/><path d="M16 3.5v3"/>'
             + '<path d="M7.5 13.5h3"/><path d="M7.5 16.8h9"/>'),
  people:   NI('<path d="M15.5 20v-1.6a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.4V20"/>'
             + '<circle cx="9.25" cy="7.4" r="3.4"/>'
             + '<path d="M21 20v-1.6a3.6 3.6 0 0 0-2.7-3.5"/>'
             + '<path d="M15.6 4.2a3.6 3.6 0 0 1 0 6.9"/>'),
  demo:     NI('<rect x="2.5" y="4" width="19" height="13" rx="2.4"/>'
             + '<path d="M9 20.5h6"/><path d="M12 17v3.5"/>'
             + '<path d="M10.6 8.2l4 2.3-4 2.3z"/>'),
  phone:    NI('<path d="M6.6 3.6h3l1.5 3.7-1.9 1.2a11 11 0 0 0 4.9 4.9l1.2-1.9 3.7 1.5v3a1.8 '
             + '1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 4.8 5.6a1.8 1.8 0 0 1 1.8-2z"/>'),
  short:    NI('<path d="M4 6.5h16"/><path d="M4 12h11"/><path d="M4 17.5h6"/>'),
  pair:     NI('<circle cx="7.5" cy="7.8" r="3.1"/><circle cx="16.5" cy="7.8" r="3.1"/>'
             + '<path d="M2.5 19.5a5 5 0 0 1 10 0"/><path d="M11.5 19.5a5 5 0 0 1 10 0"/>'),
  hire:     NI('<circle cx="9.5" cy="7.6" r="3.6"/>'
             + '<path d="M3 19.6a6.5 6.5 0 0 1 11.4-4.3"/>'
             + '<path d="m15.2 17.6 1.9 1.9 3.9-4.2"/>'),
  flag:     NI('<path d="M5.5 20.5V4"/>'
             + '<path d="M5.5 4.8h11.9l-2.3 3.9 2.3 3.9H5.5"/>'),
  chart:    NI('<path d="M4 20h16"/><path d="M6.5 20V12"/><path d="M12 20V6.5"/>'
             + '<path d="M17.5 20v-5.5"/>'),
  loop:     NI('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>'),
  spark:    NI('<path d="M9 18.5h6"/><path d="M10 21.2h4"/>'
             + '<path d="M12 3a5.8 5.8 0 0 1 3.4 10.5c-.5.4-.8 1-.8 1.6v.4H9.4v-.4c0-.6-.3-1.2-.8-1.6A5.8 5.8 0 0 1 12 3z"/>'),
  all:      NI('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8"/>'
             + '<rect x="13" y="3.5" width="7.5" height="7.5" rx="1.8"/>'
             + '<rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8"/>'
             + '<rect x="13" y="13" width="7.5" height="7.5" rx="1.8"/>'),
};

/* A template is two things: what the meeting was, said once at the top so
   the assistant knows what it is reading, and the sections it should
   come back with. The context is the part people forget to write and the
   part that makes the difference. */
const NOTE_TPL = [
  { name: 'Customer: Discovery', ic: NOTE_IC.discover, by: 'UnifyApps',
    context: 'A first call with a prospect. I am trying to understand what they '
           + 'actually need, who decides, and what would have to be true for this '
           + 'to move. Pull out figures and quote them where they said something '
           + 'worth quoting. Focus on what they said, not on what I said.',
    sections: [
      { t: 'Their background', d: 'The business, the team and the role of whoever '
         + 'was in the room. Where they are coming from and what is driving this.' },
      { t: 'Pain points and needs', d: 'The problems they described in their own '
         + 'words, and what they have already tried.' },
      { t: 'Questions or concerns', d: 'Anything they asked or pushed back on, '
         + 'including the things they raised more than once.' },
      { t: 'Budget and timeline', d: 'Money, dates and who signs. Say so plainly '
         + 'if none of it came up.' },
      { t: 'Next steps', d: 'What was agreed, who owns it and by when.' },
    ] },

  { name: 'Customer: Existing', ic: NOTE_IC.people, by: 'UnifyApps',
    context: 'A call with a customer we already have. I want to know how they are '
           + 'really doing, what they raised, and anything that puts the renewal at '
           + 'risk. Weight what they raised over what we told them.',
    sections: [
      { t: 'How they are doing', d: 'Usage, adoption and how they talk about it — '
         + 'their words rather than our numbers.' },
      { t: 'What they raised', d: 'Requests, complaints and anything they brought '
         + 'up unprompted.' },
      { t: 'Risks', d: 'Anything that would make the renewal harder: people '
         + 'leaving, budget, a competitor, work that has stalled.' },
      { t: 'Next steps', d: 'What was agreed, who owns it and by when.' },
    ] },

  { name: 'Product Demo', ic: NOTE_IC.demo, by: 'UnifyApps',
    context: 'I showed the product to a prospect. I want to know what landed, what '
           + 'did not, and how interested they actually are — including the things '
           + 'they did not say out loud.',
    sections: [
      { t: 'What they wanted to see', d: 'What they asked for before and during, '
         + 'and what they kept coming back to.' },
      { t: 'Their reactions', d: 'Where they leaned in and where they went quiet. '
         + 'Quote them where it is worth quoting.' },
      { t: 'Objections', d: 'What they questioned or pushed back on, and whether '
         + 'it was answered.' },
      { t: 'Next steps', d: 'What was agreed, who owns it and by when.' },
    ] },

  { name: 'Troubleshooting', ic: NOTE_IC.fix, by: 'UnifyApps',
    context: 'Something is broken and we are working out what. I need the facts '
           + 'separated from the theories, and a single owner at the end of it.',
    sections: [
      { t: 'What is broken', d: 'The symptom as the customer describes it, and '
         + 'when it started.' },
      { t: 'What we have tried', d: 'Everything already attempted and what it '
         + 'ruled out.' },
      { t: 'What we know', d: 'What is established, kept apart from what is still '
         + 'a guess.' },
      { t: 'Owner and next step', d: 'One name, one action, one date.' },
    ] },

  { name: 'Weekly Team Meeting', ic: NOTE_IC.week, by: 'UnifyApps',
    context: 'The team’s weekly. I want the decisions and the commitments, not '
           + 'a transcript of the status round.',
    sections: [
      { t: 'Updates', d: 'What changed since last week, one line each.' },
      { t: 'Blockers', d: 'What is stuck and who it is stuck on.' },
      { t: 'Decisions', d: 'What was actually decided, and by whom.' },
      { t: 'Next steps', d: 'What was agreed, who owns it and by when.' },
    ] },
  { name: 'One-on-one', ic: NOTE_IC.pair, by: 'UnifyApps',
    context: 'A recurring one-on-one. Keep it in their words, not mine. What is on '
           + 'their mind matters more than what I asked, and anything I said I would '
           + 'do belongs in the last section whether or not they chased it.',
    sections: [
      { t: 'What they raised', d: 'The things they brought, in the order they brought them.' },
      { t: 'How the work is going', d: 'Progress, what is stuck, and what they need from me or anyone else.' },
      { t: 'Growth and direction', d: 'Anything about the role, the career, or where they want to be heading.' },
      { t: 'What I owe them', d: 'Every commitment I made, with a date where one was given.' },
    ] },
  { name: 'Interview', ic: NOTE_IC.hire, by: 'UnifyApps',
    context: 'A candidate interview. Record what they said and did, not whether I '
           + 'liked them. Quote them where the wording matters, and keep the evidence '
           + 'apart from the judgement.',
    sections: [
      { t: 'Background', d: 'The route they took to here, and what they were actually responsible for.' },
      { t: 'What they have built', d: 'Concrete work, their part in it, and the decisions they owned.' },
      { t: 'How they think', d: 'How they worked through the problem — questions asked, trade-offs weighed.' },
      { t: 'Their questions', d: 'What they wanted to know about the role, the team and the company.' },
      { t: 'Signal', d: 'Evidence for and against, kept separate from the recommendation.' },
    ] },
  { name: 'Project kickoff', ic: NOTE_IC.flag, by: 'UnifyApps',
    context: 'The first meeting on a new piece of work. What matters is what was '
           + 'agreed and what was left open — an open question recorded now is worth '
           + 'more than a summary of the discussion.',
    sections: [
      { t: 'What we are doing and why', d: 'The goal in a line or two, and what counts as done.' },
      { t: 'Scope', d: 'What is in, what is explicitly out, and what nobody decided.' },
      { t: 'Who owns what', d: 'Names against workstreams, and where the gaps are.' },
      { t: 'Dates', d: 'Milestones, which of them are fixed, and what they depend on.' },
      { t: 'Risks and open questions', d: 'What could sink this, and what still needs an answer.' },
    ] },
  { name: 'Quarterly business review', ic: NOTE_IC.chart, by: 'UnifyApps',
    context: 'A review with a customer. Keep the numbers exact and attribute every '
           + 'opinion to whoever held it. Where they pushed back, record the pushback '
           + 'rather than the reply.',
    sections: [
      { t: 'Where they are', d: 'Usage, adoption and the results they are seeing, with figures.' },
      { t: 'What is working', d: 'Wins they named, and who inside their business noticed.' },
      { t: 'What is not', d: 'Complaints, gaps, and anything they have escalated before.' },
      { t: 'What they want next', d: 'Requests and plans, including anything that would expand or shrink this.' },
      { t: 'Renewal and next steps', d: 'Commercial signals, dates, and who does what.' },
    ] },
  { name: 'Retrospective', ic: NOTE_IC.loop, by: 'UnifyApps',
    context: 'A team retro. Record what people said without smoothing it. Keep the '
           + 'complaints apart from the decisions — the point is the change we agreed, '
           + 'not the discussion that produced it.',
    sections: [
      { t: 'What went well', d: 'Kept short. The things we should keep doing.' },
      { t: 'What did not', d: 'The problems as people described them, not as I would summarise them.' },
      { t: 'Why', d: 'Causes that came up, including the ones nobody agreed on.' },
      { t: 'What we are changing', d: 'The changes agreed, each with an owner. Nothing vague.' },
    ] },
  { name: 'Working session', ic: NOTE_IC.spark, by: 'UnifyApps',
    context: 'A group working through a problem. Capture the options on the table and '
           + 'what each one costs, then whatever we actually landed on. Ideas that were '
           + 'rejected are worth keeping, with the reason.',
    sections: [
      { t: 'The problem', d: 'What we sat down to solve, as it was framed in the room.' },
      { t: 'Options', d: 'Each idea, with what it would take and what it would cost.' },
      { t: 'Where we landed', d: 'The decision, or the fact that there was not one.' },
      { t: 'Open threads', d: 'What we ran out of time on, and who is picking it up.' },
    ] },
];

/* templates made in this session sit under the built-in ones */
const MY_TPL = [];
/* yours first: a template you wrote is one you meant to use, and the
   shipped ones are always findable underneath it */
const allTpl = () => [...MY_TPL, ...NOTE_TPL];
/* the slash menu is a menu, not a library — six, then View all */
const quickTpl = () => allTpl().slice(0, 6);

/* ── the template library ──
   Two panes: everything you have on the left, the one you are looking at
   on the right. The ones that ship are read-only, because a shared
   template somebody edits under you is worse than no template — you edit
   a copy instead, and the copy is yours.
*/
const grow = (el) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
function templateDialog(onApply) {
  let q = '';
  let cur = NOTE_TPL[0];

  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { closeMenu(); dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && !openMenu) close(); };

  const list = h('div', { class: 'tl-list' });
  const pane = h('div', { class: 'tl-pane' });

  const mine = (t) => MY_TPL.includes(t);

  const pick = (t) => { cur = t; paintList(); paintPane(); };

  /* ── the list ── */
  const row = (t) => h('button', {
    class: 'tl-row', type: 'button', 'aria-selected': String(t === cur),
    onclick: () => pick(t),
  },
    h('span', { class: 'tl-row-ic', 'aria-hidden': 'true', html: t.ic }),
    h('span', { class: 'tl-row-n' }, t.name || 'Untitled template'));

  const group = (label, ts) => ts.length
    ? [h('div', { class: 'tl-head' }, label), ...ts.map(row)] : [];

  function paintList() {
    const hit = allTpl().filter(t =>
      !q || (t.name || 'untitled').toLowerCase().includes(q));
    list.replaceChildren(...[
      h('button', { class: 'tl-new', type: 'button', onclick: () => {
        const t = { name: '', ic: NOTE_IC.short, by: 'Me', own: true,
                    vis: 'private', context: '',
                    sections: [{ t: '', d: '' }] };
        MY_TPL.push(t); pick(t);
        requestAnimationFrame(() => pane.querySelector('.tl-name')?.focus());
      } },
        h('span', { class: 'tl-new-x', 'aria-hidden': 'true' }, '+'), 'New template'),
      h('div', { class: 'tl-find' },
        h('span', { class: 'tl-find-ic', 'aria-hidden': 'true', html: FIND_IC }),
        h('input', { class: 'tl-find-in', type: 'text', placeholder: 'Search templates',
                     'aria-label': 'Search templates', value: q,
                     oninput: (e) => { q = e.currentTarget.value.trim().toLowerCase();
                                       paintList(); } })),
      ...(hit.length ? [] : [h('p', { class: 'tl-empty' }, 'Nothing matches that.')]),
      ...group('My templates', hit.filter(mine)),
      ...group('Shared with you', hit.filter(t => !mine(t))),
    ]);
  }

  /* ── the one you are looking at ── */
  function paintPane() {
    const own = mine(cur);
    const secs = h('div', { class: 'tl-secs' });

    const paintSecs = () => secs.replaceChildren(...[
      ...cur.sections.map((sc, i) => h('div', { class: 'tl-sec' },
        own
          ? h('input', { class: 'tl-sec-t', type: 'text', value: sc.t,
                         placeholder: 'Section title', 'aria-label': 'Section title',
                         oninput: (e) => { sc.t = e.currentTarget.value; } })
          : h('div', { class: 'tl-sec-t' }, sc.t),
        own
          ? h('textarea', { class: 'tl-sec-d', rows: '2',
                            placeholder: 'What the assistant should put here…',
                            'aria-label': 'Section instruction',
                            oninput: (e) => { sc.d = e.currentTarget.value;
                                              grow(e.currentTarget); } }, sc.d)
          : h('div', { class: 'tl-sec-d' }, sc.d),
        own ? h('button', { class: 'tl-sec-x', type: 'button', 'aria-label': 'Remove section',
                            title: 'Remove section',
                            onclick: () => { cur.sections.splice(i, 1); paintSecs(); } },
          '×') : null)),
      own ? h('button', { class: 'tl-add', type: 'button',
        onclick: () => { cur.sections.push({ t: '', d: '' }); paintSecs();
                         requestAnimationFrame(() => {
                           const all = secs.querySelectorAll('.tl-sec-t');
                           all[all.length - 1]?.focus();
                         }); } },
        h('span', { 'aria-hidden': 'true' }, '+'), 'Add section') : null,
    ].filter(Boolean));
    paintSecs();
    /* an instruction that runs to four lines should show four lines —
       a two-row box with a scrollbar in it hides the thing you are editing */
    requestAnimationFrame(() => secs.querySelectorAll('textarea').forEach(grow));

    /* who it belongs to, and who can see it */
    const visBtn = h('button', {
      class: 'tl-vis', type: 'button', 'aria-haspopup': 'menu',
      onclick: (e) => {
        e.stopPropagation();
        menu(e.currentTarget, [
          { label: 'Private to me', icon: 'pin',
            run: () => { cur.vis = 'private'; paintPane(); } },
          { label: 'Shared with UnifyApps', icon: 'project',
            run: () => { cur.vis = 'team'; paintPane(); } },
        ]);
      },
    }, cur.vis === 'team' ? 'Shared with UnifyApps' : 'Private to me',
       h('span', { class: 'caret', 'aria-hidden': 'true' }));

    const copy = () => {
      const t = { ...cur, by: 'Me', own: true, vis: 'private',
                  name: cur.name + ' (copy)',
                  sections: cur.sections.map(x => ({ ...x })) };
      MY_TPL.push(t); pick(t);
    };

    pane.replaceChildren(
      h('header', { class: 'tl-top' },
        own
          ? h('input', { class: 'tl-name', type: 'text', value: cur.name,
                         placeholder: 'Untitled template', 'aria-label': 'Template name',
                         oninput: (e) => { cur.name = e.currentTarget.value; paintList(); } })
          : h('h2', { class: 'tl-name tl-name-ro' }, cur.name),
        own
          ? h('button', { class: 'tl-more', type: 'button', 'aria-label': 'More',
                          'aria-haspopup': 'menu', html: MI(GLYPHS.dots),
              onclick: (e) => {
                e.stopPropagation();
                menu(e.currentTarget, [
                  { label: 'Duplicate', icon: 'copy', run: copy },
                  { rule: true },
                  { label: 'Delete template', icon: 'trash', danger: true,
                    run: () => {
                      MY_TPL.splice(MY_TPL.indexOf(cur), 1);
                      cur = allTpl()[0] || NOTE_TPL[0]; paintList(); paintPane();
                    } },
                ]);
              } })
          : h('button', { class: 'tl-copy', type: 'button', onclick: copy }, 'Edit a copy')),

      /* your own name under your own template tells you nothing — who can
         see it is the only thing worth saying there */
      h('div', { class: 'tl-by' },
        own
          ? [visBtn]
          : [h('span', { class: 'tl-by-n' }, cur.by),
             h('span', { class: 'tl-ro' }, 'View only')]),

      h('div', { class: 'tl-body' },
        h('div', { class: 'tl-lab' }, 'Meeting context'),
        own
          ? h('textarea', { class: 'tl-ctx', rows: '4',
                            placeholder: 'What the meeting is, and what you want out of it',
                            'aria-label': 'Meeting context',
                            oninput: (e) => { cur.context = e.currentTarget.value; } },
                          cur.context)
          : h('div', { class: 'tl-ctx tl-ctx-ro' }, cur.context),
        h('div', { class: 'tl-lab' }, 'Sections'),
        secs));
  }

  paintList(); paintPane();

  dim.append(h('div', { class: 'sh-card tl-card', role: 'dialog', 'aria-modal': 'true' },
    h('header', { class: 'sh-head tl-bar' },
      h('h2', { class: 'sh-title' }, 'Meeting templates'),
      h('button', {
        class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
        onclick: close,
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
            + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
      })),
    h('div', { class: 'tl-panes' }, list, pane),
    h('footer', { class: 'sh-foot tl-foot' },
      h('div', { class: 'sh-foot-end' },
        h('button', { class: 'btn btn--primary', type: 'button',
          onclick: () => { close(); onApply(cur); } }, 'Apply template')))));

  document.body.append(dim);
  document.addEventListener('keydown', onKey);
}

const NOTE_BLOCK = [
  { name: 'Heading', ic: NOTE_IC.heading, html: '<h4 class="br-nh">Heading</h4><p><br></p>' },
  { name: 'Bullet list', ic: NOTE_IC.bullets, html: '<ul class="br-nul"><li>&nbsp;</li></ul>' },
  { name: 'Checklist', ic: NOTE_IC.checks,
    html: '<ul class="br-ntodo"><li data-on="false">&nbsp;</li></ul>' },
];

/* two lines under each heading, not one — a single empty line reads as a
   gap between sections rather than as room to write in */
const tplHtml = (t) => t.sections
  .map(x => `<h4 class="br-nh">${x.t}</h4><p><br></p><p><br></p>`).join('');

/* When each generated thing was made, and anything asked for the last
   time it was made. A brief with no timestamp is a brief you cannot
   tell is stale. */
const MEET_GEN = {};
const genOf = (m, tab) => {
  const k = `${m.key}|${tab}`;
  if (!MEET_GEN[k]) {
    /* prepared shortly before the meeting, which is when a brief is
       worth preparing */
    MEET_GEN[k] = { at: new Date(+m.start - 25 * 60000), note: null };
  }
  return MEET_GEN[k];
};

/* notes typed before a call, kept for the session */
const MEET_NOTES = {};
/* A summary is a first draft of the record, not the record — the people
   who were in the room are the ones who know what it left out. Edits are
   kept until it is generated again. */
const MEET_SUM = {};

/* Three hours: the window in which a brief is worth reading, because it
   is the window in which nothing else will change before the call. */
const BRIEF_WINDOW = 3 * 3600000;
/* Briefs asked for by hand, before the window would have made them. */
const MEET_MADE = {};

/* in it, or close enough to it that joining is the next thing you do */
const soonEnough = (m) => {
  const now = Date.now();
  return +m.end > now && (+m.start - now) <= BRIEF_WINDOW;
};

/* ── the day before there is a day ────────────────────────────
   Nothing to show and nothing hidden: the header stays exactly where it
   is, because the page you are being set up for is the page you will
   land on, and swapping it for a splash means the first thing you learn
   is thrown away. Under it, the two calendars anybody here actually has
   and a plain account of what happens once one of them is connected.
*/
/* ── setting up, on the page you are setting up ───────────────
   The home screen already does this: the things it can read, offered as
   a card under the composer, dismissible, and gone once you have made
   your choices. This is the same card for the day — no dialog over the
   page, because the page is the thing being set up and there is nothing
   here you have to answer before you can see it.

   Four rows, in the order they matter: what it reads, when the brief is
   ready, where it lands, and the app that records. Each is one line and
   one control, and the apps row opens in place rather than into
   somewhere else.
*/
const SETUP = {
  when: 180,
  where: 'both',
  cal: null,            /* the calendar you connected */
  step: 0,              /* which of the three you are on */
  got: null,            /* 'mac' | 'chrome' */
  on: {},               /* the apps you connected, by key */
};

const OB_SOURCES = [
  /* the record of the account comes first: who these people are and what
     is open on them is the half of a brief that is not in a chat thread */
  { v: 'salesforce', b: 'salesforce', t: 'Salesforce',
    s: 'Contacts, leads and open deals for who you are meeting' },
  /* a PNG rather than a symbol — it is the only mark in the set that did
     not come as artwork */
  { v: 'hubspot',    img: 'assets/brand/hubspot.png', t: 'HubSpot',
    s: 'Contact records and the deal each meeting belongs to' },
  { v: 'slack',      b: 'slack',      t: 'Slack',
    s: 'Channels and DMs about the meeting' },
  { v: 'teams',      b: 'teams',      t: 'Teams',
    s: 'Chats and channel posts with attendees' },
  { v: 'drive',      b: 'drive',      t: 'Google Drive',
    s: 'Docs and decks shared with attendees' },
  { v: 'sharepoint', b: 'sharepoint', t: 'SharePoint',
    s: 'Files and pages your team has filed' },
  { v: 'onedrive',   b: 'onedrive',   t: 'OneDrive',
    s: 'Files you have shared or been sent' },
];

/* one clock for every time and one mark for each place, at one width, so
   the names line up down the column */
const LN = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const IC_CLOCK = LN('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 1.8"/>');
const IC_APP   = LN('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/>'
  + '<path d="M3.5 9.2h17"/>');
const IC_MAIL  = LN('<rect x="3" y="5.5" width="18" height="13" rx="2"/>'
  + '<path d="M3.6 7 12 13.2 20.4 7"/>');

const WHEN_OPTS = [
  { v: 60,   t: '1 hour before',   ic: IC_CLOCK },
  { v: 180,  t: '3 hours before',  ic: IC_CLOCK },
  { v: 720,  t: '12 hours before', ic: IC_CLOCK },
  { v: 1440, t: 'The day before',  ic: IC_CLOCK },
];
const WHERE_OPTS = [
  { v: 'both', t: 'App and email', ic: IC_MAIL },
  { v: 'app',  t: 'App only',      ic: IC_APP },
];

const CAL_BRAND = {
  google:  { key: 'gcal',    sign: 'google',    label: 'Google Calendar' },
  outlook: { key: 'outlook', sign: 'microsoft', label: 'Outlook Calendar' },
};

const TICK_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const APPLE_MK  = '<svg viewBox="0 0 24 24"><use href="#b-apple"/></svg>';
const CHROME_MK = '<svg viewBox="0 0 24 24"><use href="#b-chrome"/></svg>';
const WIN_MK    = '<svg viewBox="0 0 24 24"><use href="#b-microsoft"/></svg>';

/* the card, rebuilt in place on every change so one row cannot fall out
   of step with another. Four sections, each one thing being asked: the
   apps a brief can read, when it is ready, where it lands, and the app
   that records. Every section is the same list of rows the home screen
   uses to connect tools — one mark, one name, one line, one control —
   so the whole of setting up is one component seen four times. */
function setupCard(done) {
  /* the same card the two calendar buttons were in a moment ago, with
     new contents. Nothing hangs outside it: the step label and the
     question are its head, the rows are its body, and Back and Continue
     sit under a rule at its foot. */
  const card = h('div', { class: 'ob-card st' });
  const redraw = () => card.replaceChildren(...build());

  /* one row: mark, name, the line under it, and the control on the right */
  const row = (o) => h('div', {
    class: 'cx-row' + (o.done ? ' is-done' : '') + (o.sel ? ' is-sel' : ''),
    onclick: o.onclick || null,
  },
    o.mark ? h('span', { class: 'cx-mark', 'aria-hidden': 'true', html: o.mark })
      : o.ic ? h('span', { class: 'cx-mark cx-mark--ic', 'aria-hidden': 'true',
                           html: o.ic })
      : null,
    h('span', { class: 'cx-main' },
      h('span', { class: 'cx-name' }, o.name),
      /* only the sources say what they are for: a time does not need a
         line under it explaining the time */
      o.say ? h('span', { class: 'cx-say' }, o.say) : null),
    o.control);

  const tick = (label) => h('span', { class: 'cx-tick', role: 'img',
    'aria-label': label, title: label, html: TICK_IC });

  /* the body of a step: rows, under labels when a step asks two things */
  const body = (groups) => h('div', { class: 'st-body' },
    ...groups.map(([label, rows]) => h('div', { class: 'cx-grp' },
      label ? h('p', { class: 'cx-grp-h' }, label) : null,
      ...rows.filter(Boolean))));

  /* a choice has no mark: six clocks in a column tell you nothing, and
     the tick on the right is the whole answer */
  const choice = (opts, value, run) => opts.map(o => row({
    name: o.t, ic: o.ic, sel: o.v === value,
    onclick: () => { run(o.v); },
    /* a filled circle, not a tick: these are one of a set, and the empty
       rings beside it say so */
    control: h('span', {
      class: 'cx-pick' + (o.v === value ? ' is-on' : ''),
      role: 'radio', 'aria-checked': String(o.v === value),
    }),
  }));

  /* one step on screen at a time, and Continue moves you on. The three
     of them in one column made a page you scrolled past rather than a
     thing you answered. */
  const STEPS = [
    {
      title: 'Connect apps for better meeting context',
      make: () => body([[null, OB_SOURCES.map(o => {
        const on = !!SETUP.on[o.v];
        return row({
          mark: o.img
            ? `<img src="${o.img}" alt="">`
            : `<svg viewBox="0 0 24 24"><use href="#b-${o.b}"></use></svg>`,
          name: o.t, say: o.s, done: on,
          onclick: on ? null : () => { SETUP.on[o.v] = true; redraw(); },
          control: on ? tick('Connected')
            : h('button', { class: 'cx-go', type: 'button' }, 'Connect'),
        });
      })]]),
    },
    {
      /* when it is ready and where it lands are one decision about the
         same thing arriving, so they are one step */
      title: 'When and where pre-briefs arrive',
      make: () => body([
        ['When the pre-brief is written', choice(WHEN_OPTS, SETUP.when, (v) => { SETUP.when = v; redraw(); })],
        ['Where it is delivered', choice(WHERE_OPTS, SETUP.where, (v) => { SETUP.where = v; redraw(); })],
      ]),
    },
    {
      title: 'Install the app',
      /* three cards, stacked: the mark sits on a disc of the workspace's
         own sand so a black apple, four coloured squares and a Chrome
         wheel read as three of the same thing, and each card lifts on
         white rather than filling with a colour */
      make: () => h('div', { class: 'st-body st-apps' },
        ...[
          ['mac', APPLE_MK, 'Mac app', 'Records any meeting on your Mac'],
          ['win', WIN_MK, 'Windows app', 'Records any meeting on your PC'],
          /* the three read as one set: your Mac, your PC, your browser */
          ['chrome', CHROME_MK, 'Chrome extension', 'Records any meeting in your browser'],
        ].map(([v, mark, name, sub]) => {
          const on = SETUP.got === v;
          const get = () => {
            SETUP.got = v; redraw();
            toast(v === 'chrome' ? 'The extension opens in the next pass.'
                                 : 'The download starts in the next pass.');
          };
          return h('div', { class: 'st-app' + (on ? ' is-on' : ''),
                            onclick: on ? null : get },
            h('span', { class: 'st-app-m', 'aria-hidden': 'true', html: mark }),
            h('span', { class: 'st-app-t' },
              h('span', { class: 'st-app-n' }, name),
              h('span', { class: 'st-app-s' }, sub)),
            on
              ? h('span', { class: 'st-app-on' },
                  h('span', { class: 'cx-tick', 'aria-hidden': 'true', html: TICK_IC }),
                  'Installing')
              : h('button', { class: 'st-app-b', type: 'button',
                  onclick: (e) => { e.stopPropagation(); get(); } }, 'Download'));
        })),
    },
  ];

  const at = () => Math.min(SETUP.step, STEPS.length - 1);
  const move = (d) => { SETUP.step = Math.max(0, Math.min(STEPS.length - 1, at() + d)); redraw(); };

  function build() {
    const i = at();
    const st = STEPS[i];
    const last = i === STEPS.length - 1;
    return [
      h('div', { class: 'st-head' },
        /* no way out in the corner: Skip on the first step and Back
           everywhere after it are the ways out, and they are where you
           are already looking */
        h('span', { class: 'st-step' }, `Step ${i + 1} of ${STEPS.length}`),
        h('h2', { class: 'st-title' }, st.title)),

      st.make(),

      /* Back on the left, the way forward on the right, and the optional
         step gets a way past it that is not the way forward */
      h('div', { class: 'st-foot' },
        i ? h('button', { class: 'cx-back', type: 'button', onclick: () => move(-1) },
              h('span', { class: 'cx-back-x', 'aria-hidden': 'true' }, '←'), 'Back') : null,
        h('div', { class: 'st-foot-r' },
          i === 0 ? h('button', { class: 'cx-skip', type: 'button', onclick: () => move(1) },
                      'Skip') : null,
          h('button', { class: 'btn btn--primary cx-done', type: 'button',
            onclick: () => { last ? done() : move(1); } },
            last ? 'Go to meetings' : 'Continue'))),
    ].filter(Boolean);
  }

  card.replaceChildren(...build());
  return card;
}

/* what it says on the way to the day */
function setupLine() { return 'Calendar connected.'; }

/* ── recording, by hand ───────────────────────────────────────
   A call nobody scheduled still has to be caught, so the brief page can
   record one itself. Three things make it honest: it never starts by
   itself, it says so loudly while it is running, and what it hears
   arrives on the page as it is heard rather than at the end. A voice it
   cannot place is Speaker 1 — which is the door to naming them.

   The clock is the truth: elapsed time is the milliseconds banked from
   earlier runs plus the time since the last resume, so pausing costs
   nothing and nothing drifts. */
const REC_LINES = {};                 /* meeting key → what was caught here */
const REC = { key: null, on: false, paused: false, ms: 0, since: 0,
              i: 0, cur: null, n: 0, timer: null, amp: [] };
const REC_TICKS = 34;                 /* how much of the strip you can see */

/* the room, for the demonstration: what the machine hears while you sit
   there, in the order it hears it */
const REC_SCRIPT = [
  ['Speaker 1', 'Thanks for grabbing five minutes — I know this was not in the calendar.'],
  ['Speaker 2', 'That is fine. Is this about the uplift, or the security answers?'],
  ['Speaker 1', 'The uplift. Procurement came back and they want the three-year number '
    + 'before Thursday.'],
  ['Speaker 2', 'We can get them a written position. Holding at four is not something '
    + 'I can sign on my own.'],
  ['Speaker 3', 'For what it is worth, the renewal date does not move. Whatever we send '
    + 'has to be with them by Wednesday evening.'],
  ['Speaker 1', 'Then let us put the two options side by side and let their board pick one.'],
  ['Speaker 2', 'Agreed. I will have the numbers to you tomorrow morning.'],
];

/* what a stopped recording leaves behind: a moment of writing up, then
   an offer to turn what was heard into a summary */
const REC_EVER = {};                  /* key → this one has been recorded */
const REC_WRAP = {};                  /* key → finishing up */
const REC_DONE = {};                  /* key → there is a recording to use */
const REC_GEN  = {};                  /* key → its summary has been asked for */

/* the demonstration recording has known contents, so it has a known
   summary — generated from the lines above and nothing else */
const REC_SUM = {
  why: 'An unscheduled call about the FY26 uplift. Procurement have asked for '
     + 'the three-year number before Thursday, and the renewal date does not move.',
  blocks: [
    { h: 'Decided', li: [
      'Two options go to their board side by side rather than one recommendation.',
    ] },
    { h: 'Committed', li: [
      'A written position on the uplift, with them by Wednesday evening.',
      'The three-year figure, tomorrow morning.',
    ] },
    { h: 'Left open', li: [
      'Holding at four per cent — not something the account can sign alone.',
    ] },
  ],
};

const recOn   = (m) => REC.on && REC.key === m.key;
const recMs   = () => REC.ms + (REC.on && !REC.paused ? Date.now() - REC.since : 0);
const recClock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* whatever is on screen tells the recorder how to redraw it; a page that
   has been replaced simply stops being called */
let recPaint = null;

/* The desktop shell floats a recorder over the whole screen while this
   is running, so it has to hear about it — including from a panel, where
   the window it came from may not even be open. */
function recTell(on) {
  if (parent === window) return;
  try {
    parent.postMessage({
      unify: 'rec', on, paused: !!REC.paused,
      name: REC.key ? String(REC.key).split('|')[0] : null,
      ms: on ? recMs() : 0,
    }, '*');
  } catch (_) { /* not framed */ }
}

function recStart(key) {
  if (REC.on && REC.key !== key) recStop();
  REC.key = key; REC.on = true; REC.paused = false;
  REC_EVER[key] = true;
  /* picking a stopped recording back up continues it: the clock carries
     on from where it stopped and the lines are still there */
  REC.ms = REC_DONE[key] || 0;
  delete REC_DONE[key];
  REC.since = Date.now();
  REC_LINES[key] = REC_LINES[key] || [];
  clearInterval(REC.timer);
  REC.timer = setInterval(recTick, 420);
  recTell(true); syncTell();
}
function recHold() {
  if (!REC.on || REC.paused) return;
  REC.ms = recMs(); REC.paused = true;
  recPaint?.(); recTell(true); syncTell();
}
function recResume() {
  if (!REC.on || !REC.paused) return;
  REC.since = Date.now(); REC.paused = false;
  recPaint?.(); recTell(true); syncTell();
}
function recStop() {
  const ran = recMs();
  clearInterval(REC.timer);
  recTell(false);
  /* a half-said line is not a line: it is dropped rather than filed */
  REC.ms = 0; REC.on = false; REC.paused = false;
  REC.cur = null; REC.n = 0; REC.timer = null; REC.amp = [];
  const key = REC.key; REC.key = null;
  /* an unscheduled meeting is as long as it turned out to be */
  const made = MEET_SRC().find(({ m }) => m.adhoc && meetKey(m) === key);
  if (made && !editOf(key).mins) editOf(key).mins = Math.max(1, Math.round(ran / 60000));
  if ((REC_LINES[key] || []).length) {
    /* writing up takes a moment, and saying so is better than a page
       that changes while you are still looking at the button */
    REC_WRAP[key] = true;
    setTimeout(() => {
      delete REC_WRAP[key]; REC_DONE[key] = ran; recPaint?.(); syncTell();
    }, 1800);
  }
  recPaint?.(); syncTell();
  return key;
}

/* every quarter second the machine hears a little more: words arrive in
   twos into the line being said, and a finished line is filed with the
   time it started */
function recTick() {
  if (!REC.on || REC.paused) return;
  if (!REC.cur) {
    const [who, text] = REC_SCRIPT[REC.i % REC_SCRIPT.length];
    REC.i++;
    REC.cur = { who, words: text.split(' '), t: recClock(recMs()) };
    REC.n = 0;
  }
  /* the strip is drawn from the words themselves: a long word is a loud
     tick, the gap between two lines is nearly flat */
  const w = REC.cur.words[Math.min(REC.n, REC.cur.words.length - 1)] || '';
  REC.amp.push(Math.max(.18, Math.min(1, (w.length + 3) / 11)));
  if (REC.amp.length > REC_TICKS * 2) REC.amp.splice(0, REC.amp.length - REC_TICKS * 2);
  REC.n += 1;
  if (REC.n >= REC.cur.words.length) {
    const c = REC.cur;
    (REC_LINES[REC.key] = REC_LINES[REC.key] || [])
      .push({ t: c.t, who: c.who, text: c.words.join(' ') });
    REC.cur = null;
  }
  recPaint?.(); syncTell();
}

/* the line being said, as far as it has got */
const recInterim = () => REC.cur
  ? { t: REC.cur.t, who: REC.cur.who, text: REC.cur.words.slice(0, REC.n).join(' ') }
  : null;

/* the strip: one tick per moment heard, newest at the right, and a row
   of dots for the silence in front of it. Nothing here is decoration —
   a flat strip means the room is quiet and a full one means it is not */
const recWave = () => {
  const amp = REC.amp.slice(-REC_TICKS);
  const pad = REC_TICKS - amp.length;
  return h('span', { class: 'rec-wave', 'aria-hidden': 'true' },
    ...Array.from({ length: REC_TICKS }, (_, i) => h('i', {
      style: `--a:${i < pad ? 0 : amp[i - pad].toFixed(2)}`,
    })));
};

/* the four-point star the rest of the workspace uses for a thing the
   machine wrote */
const SPARK_IC = '<svg viewBox="0 0 24 24" fill="currentColor">'
  + '<path d="M12 2.6l1.9 6 6 1.9-6 1.9-1.9 6-1.9-6-6-1.9 6-1.9z"/>'
  + '<path d="M18.6 15.4l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z"/></svg>';

/* the same star on its own, for places where the mark sits beside small
   type and the second one reads as a speck */
const SPARK_ONE = '<svg viewBox="0 0 24 24" fill="currentColor">'
  + '<path d="M12 2.6l1.9 6 6 1.9-6 1.9-1.9 6-1.9-6-6-1.9 6-1.9z"/></svg>';

const PLUS_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round">'
  + '<path d="M12 5.5v13"/><path d="M5.5 12h13"/></svg>';

const MIC_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="9" y="3" width="6" height="11" rx="3"/>'
  + '<path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>';

const REC_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor">'
  + '<rect x="7" y="5.5" width="3.4" height="13" rx="1.2"/>'
  + '<rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2"/></svg>';
const REC_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor">'
  + '<path d="M8 5.6a1 1 0 0 1 1.5-.87l9 6.4a1 1 0 0 1 0 1.74l-9 6.4A1 1 0 0 1 8 18.4z"/></svg>';

/* ── people ───────────────────────────────────────────────────
   Everything the workspace knows about somebody, on one page you can
   edit. Two shapes, because the two questions are different: about
   somebody outside you ask "who is this and where do we stand", and
   about somebody inside you ask "what are they on and where do we
   overlap". The address decides which — a colleague has your domain.

   It reads as a document rather than a profile card because that is
   what it is: research somebody (or something) wrote down, which you
   can correct. Anything with an address on the other end — a mail, a
   thread, a company, a LinkedIn page — is a link, so the page is a way
   into the systems rather than a copy of them. */
const isMine = (name) => (mailOf(name) || '').endsWith('@unifyapps.com');

const PPL = {
  /* Somebody you have never spoken to. The page is written for the hour
     before the first call: who they are, what they will care about,
     where we already touch them, and how to open — every line saying
     what it means for us rather than reciting their CV, and every claim
     carrying the place it came from. */
  'Rachel Okafor': {
    card: 'Owns the seat count across eleven plants, and signs anything that changes it. Buying for her own customers as much as for Halden.',
    title: 'VP Operations', org: 'Halden', site: 'halden.com',
    li: 'linkedin.com/in/rachel-okafor', phone: '+1 614 555 0142',
    loc: 'Delaware, Ohio · ET', met: 0,
    who: [
      'Runs operations for the packaging division — about 1,400 people across '
      + 'eleven plants. Owns the seat count and signs anything that changes it.',
      'Eleven years at <a href="https://halden.com" target="_blank" rel="noreferrer">Halden</a>, '
      + 'the last three in this role. Before that, plant operations — she came up '
      + 'through the floor rather than through IT.',
      'Was a customer of ours at <a href="https://calder.com" target="_blank" '
      + 'rel="noreferrer">Calder</a> until 2022, on the old per-plant contract. '
      + 'She has bought this category before and will not need the tour.',
    ],
    care: [
      'Cost per seat, not total cost. In her <a href="https://linkedin.com/in/rachel-okafor" '
      + 'target="_blank" rel="noreferrer">last two posts</a> she talks about '
      + '"the number the plant manager sees" — expect the unit figure to be the one she repeats.',
      'Adoption she can defend. Halden’s <a href="https://halden.com/investors" target="_blank" '
      + 'rel="noreferrer">Q2 call</a> had an analyst ask about software spend twice; '
      + 'her board now asks for usage against every renewal.',
      'Rollouts that do not need her. She ran the March one herself and said so '
      + 'in a <a href="https://packagingweekly.com" target="_blank" rel="noreferrer">trade '
      + 'interview</a> — the compliment to pay is that the next one runs without her.',
    ],
    why: [
      'She asked for this, not us. The request came through '
      + '<a href="mailto:dev.anand@unifyapps.com">Dev Anand</a> after their plant leads '
      + 'started asking for access.',
      'Their contract renews in June. Anything agreed now rides on that date rather '
      + 'than starting a new one.',
    ],
    touch: [
      'Dev Anand has met her twice at the Calder account — he is the only warm '
      + 'introduction we have.',
      'Nobody from our side has spoken to her since she moved to Halden. There is no '
      + 'history in the mail, and no open thread.',
      'Two of her direct reports are already on the platform, so the product is '
      + 'known inside her team even if she has not used it.',
    ],
    open: [
      'Open with the March rollout — it is hers, it went well, and it is the only '
      + 'shared ground you have.',
      'Ask what her board asked her after the Q2 call. It is the question behind '
      + 'every number she will give you.',
      'Do not lead with the roadmap. She bought this category before and will read '
      + 'a roadmap as a way of not answering the price.',
    ],
    news: [
      { t: 'Halden Q2 results — packaging margin up, capex held', when: 'Jul 2026',
        s: 'Software spend questioned twice on the call.',
        u: 'https://halden.com/investors' },
      { t: 'Eleven plants on one operations stack', when: 'May 2026',
        s: 'Trade piece she is quoted in, about the March rollout.',
        u: 'https://packagingweekly.com' },
      { t: 'Halden is hiring two operations analysts', when: 'Open now',
        s: 'Both roles report into her division.',
        u: 'https://halden.com/careers' },
    ],
  },

  /* you. The same page, because the fastest way to see what somebody
     else has on is to see it the way you see your own. */
  'Roger Bennett': {
    card: 'You. Enterprise accounts across EMEA and NA.',
    title: 'Enterprise Account Executive', team: 'Enterprise, EMEA & NA',
    manager: 'Priya Raman', slack: '@roger',
    phone: '+44 20 7946 0318', loc: 'London · GMT', hours: '08:30 – 18:00 GMT', met: 0,
    now: [
      '<b>Halden</b> — 120-seat expansion on the March rollout. $380k, and the '
      + 'paper is due before their board meets Thursday.',
      '<b>Brightpath</b> — phase two, blocked on five security answers sitting with legal '
      + 'since 23 August.',
      '<b>Vantage</b> — data residency, and a February renewal that turns anything '
      + 'still open into a condition.',
      '<b>Orion</b> — they want the FY26 uplift held at 4%. Nothing agreed.',
    ],
    rel: [
      'Four accounts carrying the quarter, three of them decided in the next '
      + 'two weeks.',
      'Dev Anand is technical lead on all four; Grace Coleman approves anything '
      + 'below the discount floor.',
    ],
    threads: [
      { t: 'Halden — the three structures', when: 'Fri, 5 Sep',
        s: 'Deal desk approved 22% at 36 months. Nothing has gone to Rachel yet.' },
      { t: 'Brightpath — security questionnaire', when: 'Wed, 27 Aug',
        s: 'Five answers with legal. Callum has chased twice.' },
      { t: 'Vantage — EU residency note', when: 'Tue, 2 Sep',
        s: 'Sent. Meera has not replied.',
        u: 'https://drive.google.com/drive/search?q=EU%20residency' },
    ],
    open: [
      'Halden — the written position on the uplift, promised for Thursday.',
      'Brightpath — the five questionnaire answers, chase legal today.',
      'Orion — the three-year figure, promised tomorrow morning.',
    ],
  },

  /* an alias, not a person: the desk that approves the number and the
     team that answers the questionnaire. The page answers the questions
     you actually have about a group — what they own, who is behind it,
     and how long they take. */
  'Deal desk': {
    card: 'Pricing and structure. Anything off the standard sheet goes through them before it goes to a customer.',
    group: true, size: '4 people', team: 'Revenue operations',
    channel: '#deal-desk', sla: 'Same day, before 16:00 GMT',
    what: [
      'Owns the discount floor, the term structures and anything non-standard '
      + 'on paper. Nothing below list goes out without them.',
      'Approves ramps, and holds the line on payment terms \u2014 those two get '
      + 'traded against each other more than anything else.',
    ],
    people: [
      'Grace Coleman signs anything at or above the floor.',
      'Two analysts rotate the queue; whoever picks it up owns it to the end.',
    ],
    how: [
      'Post in <b>#deal-desk</b> with the account, the shape and the date. '
      + 'A mail to the alias joins the same queue a day slower.',
      'They answer the same day if it is in before 16:00 GMT. After that it is '
      + 'the next morning, which is why Friday asks land on Monday.',
      'Bring the structure you want approved, not the options \u2014 they will '
      + 'pick the safest of three and it will not be yours.',
    ],
    threads: [
      { t: 'Halden \u2014 22% at 36 months', when: 'Fri, 5 Sep',
        s: 'Approved with a three-month ramp. Grace asked to see the paper.' },
      { t: 'Orion \u2014 holding at 4%', when: 'Thu, 4 Sep',
        s: 'Not approved. They want the three-year comparison first.' },
    ],
    open: ['Nothing in their queue from you.'],
  },

  'Legal': {
    card: 'Contracts, DPAs and anything that becomes a commitment in writing.',
    group: true, size: '3 people', team: 'Legal and compliance',
    channel: '#legal-requests', sla: 'Three working days',
    what: [
      'Security questionnaires, DPAs, and anything a customer\u2019s counsel '
      + 'has redlined.',
      'Owns the standard answer pack \u2014 most questionnaires are answered from '
      + 'it without them ever seeing the document.',
    ],
    people: [
      'One counsel covers EMEA and NA; the other two are commercial.',
      'Sana Iqbal triages the queue and is the person to ask for a date.',
    ],
    how: [
      'Three working days is real rather than a target. Anything urgent needs '
      + 'the reason in the first line or it queues behind the rest.',
      'Send the questionnaire itself, not a summary of it. Summaries come back.',
    ],
    threads: [
      { t: 'Brightpath \u2014 five open questionnaire answers', when: 'Sat, 23 Aug',
        s: 'With them since the 23rd. Two chases, no date yet.' },
    ],
    open: ['Brightpath \u2014 five answers, thirteen working days and counting.'],
  },

  'Callum Reid': {
    card: 'Owns the rollout at Brightpath. Practical, moves fast, and will tell you when something is not going to work.',
    title: 'Director, Learning Technology', org: 'Brightpath', site: 'brightpath.com',
    li: 'linkedin.com/in/callum-reid', phone: '+44 20 7946 0821',
    loc: 'London · GMT', met: 4,
    who: [
      'Owns the platform their L&D team runs on, and the budget under it.',
      'Came from <a href="https://kallidus.com" target="_blank" rel="noreferrer">Kallidus</a> '
      + 'two years ago. Has done this migration once before and says so often.',
    ],
    rel: [
      'Phase two is his, and he has asked about the security questionnaire '
      + 'in every one of the last three calls.',
      'He forwards everything to his security lead, so anything you send '
      + 'him is read by two people.',
    ],
    threads: [
      { t: 'Phase two — scope and the sequence', when: 'Thu, 4 Sep',
        s: 'He wants the questionnaire closed before scope is agreed.' },
      { t: 'Security questionnaire', when: 'Tue, 26 Aug',
        s: 'Sent 23 Aug. Five answers outstanding.' },
    ],
    open: ['The five questionnaire answers — his security lead is asking weekly.'],
  },

  'Dev Anand': {
    card: 'The engineer on every technical call you take. He has answered the residency question more times than you have.',
    title: 'Solutions Engineer', team: 'Presales', manager: 'Grace Coleman',
    slack: '@dev', phone: '+91 80 4718 2260', loc: 'Bengaluru · IST', hours: '09:30 – 18:30 IST', met: 22,
    now: [
      'Halden expansion — building the seat-usage view their board will see.',
      'Brightpath phase two — waiting on the security answers like everyone else.',
      'Vantage data residency — wrote the EU hosting note you sent last week.',
    ],
    rel: [
      'On four of your accounts and in twenty-two meetings with you this quarter.',
      'He owns the technical answer on every one of them; you own the commercial one.',
    ],
    how: [
      'Slack first \u2014 he answers in minutes there and in a day by mail.',
      'Writes long and exact. If you need one number, ask for the number.',
      'Never says no on a call; he says \u201clet me check\u201d, which usually means no.',
    ],
    threads: [
      { t: 'Halden — seat usage, 340 live', when: 'Fri, 5 Sep',
        s: 'He has the March numbers already pulled.',
        u: 'https://drive.google.com/drive/search?q=Halden%20seat%20usage' },
      { t: 'Vantage — EU residency note', when: 'Tue, 2 Sep',
        s: 'Drafted by him, sent by you.',
        u: 'https://drive.google.com/drive/search?q=EU%20residency' },
    ],
    open: ['Nothing waiting on him from you.'],
  },

  'Grace Coleman': {
    title: 'Director, Presales', team: 'Presales', manager: 'Priya Raman',
    slack: '@grace', phone: '+44 20 7946 0244', loc: 'London · GMT', hours: '09:00 – 17:30 GMT', met: 9,
    now: [
      'Covering the quarter’s six stuck deals with Matt Rivera.',
      'Owns the deal desk relationship — the discount floor came through her.',
    ],
    rel: [
      'Dev’s manager, so anything you need from him at short notice goes '
      + 'through her.',
      'She approved the 22% floor on Friday.',
    ],
    how: [
      'Mail, not Slack. She reads in the morning and answers in one block.',
      'Put the ask in the first line \u2014 she skims everything under it.',
      'She will approve on a call if you bring the floor and the risk together.',
    ],
    threads: [
      { t: 'Discount floor — 22% at 36 months', when: 'Fri, 5 Sep',
        s: 'Approved. She asked to see the board deck before it goes.' },
    ],
    open: ['She has asked to see the Halden paper before Thursday.'],
  },
  'Priya Raman': {
    title: 'VP Sales, EMEA & NA', team: 'Sales leadership', manager: null,
    slack: '@priya', phone: '+44 20 7946 0102', loc: 'London \u00b7 GMT', hours: '08:00 \u2013 19:00 GMT', met: 14,
    now: [
      'Carries the quarter\u2019s number, which is your four accounts and eleven others.',
      'Running the pricing review that produced the three structures you are '
      + 'taking to Halden.',
    ],
    rel: [
      'Your manager. She hears about your accounts on Monday and asks about the '
      + 'ones that moved on Thursday.',
      'She sat in the Orion escalation herself \u2014 the 4% is a line she set.',
    ],
    how: [
      'One line, one ask. She reads on a phone between meetings.',
      'Bring bad news early; she is fine with a slip and not with hearing it late.',
    ],
    threads: [
      { t: 'Orion \u2014 holding at 4%', when: 'Thu, 4 Sep',
        s: 'She wants the three-year comparison before anything goes in writing.' },
    ],
    open: ['The Halden paper, before Thursday \u2014 she has asked to see it first.'],
  },

  'Owen Castillo': {
    card: 'Runs the deal desk. Every non-standard structure this quarter has been through him, including the three you are taking to Rachel.',
    title: 'Deal Desk Manager', team: 'Revenue operations',
    manager: 'Matt Rivera', slack: '@owen', phone: '+353 1 903 4471', loc: 'Dublin \u00b7 GMT', met: 6,
    now: [
      'Runs the desk day to day \u2014 every non-standard structure this quarter '
      + 'has been through him, including the three you are taking to Rachel.',
      'Rewriting the approval path for the October pricing, which is why he wants '
      + 'anything unusual in before the change.',
    ],
    rel: [
      'He approved the Halden floor on Friday: 22% at 36 months, with a '
      + 'three-month ramp available at 36 and not at 24.',
      'He is on this call because the structure is his, and the questions Rachel '
      + 'asks about the number are ones he answers faster than you can.',
    ],
    how: [
      'Ask for one structure, not three. He will pick the safest of three and it '
      + 'will not be the one you wanted.',
      'Before 16:00 GMT gets an answer the same day; after that it is tomorrow.',
      'He says no in writing and yes on a call \u2014 if it matters, get him on a call.',
    ],
    threads: [
      { t: 'Halden \u2014 22% at 36 months', when: 'Fri, 5 Sep',
        s: 'Approved, with the ramp. He asked to see the paper before it goes.' },
      { t: 'Orion \u2014 holding at 4%', when: 'Thu, 4 Sep',
        s: 'Not approved without the three-year comparison.' },
    ],
    open: ['He is waiting on the Halden paper too \u2014 send it to him when Rachel gets it.'],
  },

  'Matt Rivera': {
    title: 'Director, Revenue Operations', team: 'Revenue operations',
    manager: 'Priya Raman', slack: '@matt', phone: '+1 512 555 0173', loc: 'Austin \u00b7 CT',
    hours: '08:00 \u2013 17:00 CT', met: 7,
    now: [
      'Owns the forecast, and the six deals that stopped moving and nobody marked.',
      'Rebuilding how commit is called before the next quarter opens.',
    ],
    rel: [
      'He is where your numbers go, and where they come back with questions.',
      'Both of you are on the Monday pipeline stand-up.',
    ],
    how: [
      'Give him the number and the date it changes. He does not read the story.',
      'Anything you tell him on a call, put in the deal record \u2014 that is where '
      + 'he looks on Friday.',
    ],
    threads: [
      { t: 'Commit is $8.4M \u2014 the gap is six deals', when: 'Mon, 8 Sep',
        s: 'Two of them are yours: Halden and Brightpath.' },
    ],
    open: ['Mark Halden and Brightpath with a date before Friday.'],
  },

  'Sana Iqbal': {
    card: 'Commercial counsel. Everything non-standard comes back through her, and she says no in writing.',
    title: 'Counsel, Commercial', team: 'Legal and compliance',
    manager: null, slack: '@sana', phone: '+44 20 7946 0390', loc: 'London \u00b7 GMT',
    hours: '09:00 \u2013 17:30 GMT', met: 5,
    now: [
      'Triages the legal queue, which is where the Brightpath questionnaire is sitting.',
      'Owns the standard answer pack that covers most of what customers ask.',
    ],
    rel: [
      'She is the person to ask for a date rather than an answer.',
      'You have a 1:1 with her today \u2014 the questionnaire is the reason.',
    ],
    how: [
      'Ask for a date, not for urgency. She will give you a real one and keep it.',
      'She answers in Slack; anything in mail waits for her afternoon block.',
    ],
    threads: [
      { t: 'Brightpath \u2014 five open answers', when: 'Sat, 23 Aug',
        s: 'She has the file. Two chases from Callum since.' },
    ],
    open: ['A date for the five answers \u2014 ask her today.'],
  },

  'John Whitaker': {
    title: 'Sales Engineer', team: 'Presales', manager: 'Grace Coleman',
    slack: '@john', phone: '+44 161 850 2214', loc: 'Manchester \u00b7 GMT', hours: '09:00 \u2013 17:30 GMT', met: 3,
    now: [
      'Covers the accounts Dev is not on, which this quarter is Redwood '
      + 'and Sentinel.',
      'Wrote the security answer pack that legal now sends out.',
    ],
    rel: [
      'You overlap on the Monday stand-up and on Sentinel\u2019s security review.',
    ],
    how: [
      'Slack, short. He will answer a technical question in one line and a '
      + 'commercial one with "ask Grace".',
    ],
    threads: [
      { t: 'Sentinel \u2014 security review prep', when: 'Mon, 8 Sep',
        s: 'He has the pack ready; the meeting is this evening.' },
    ],
    open: ['Nothing waiting on him from you.'],
  },

  'Meera Nair': {
    card: 'Runs the platform at Vantage and is building an answer for her own customers, not testing you.',
    title: 'Head of Platform', org: 'Vantage', site: 'vantage.com',
    li: 'linkedin.com/in/meera-nair', phone: '+1 416 555 0197',
    loc: 'Toronto \u00b7 ET', met: 3,
    who: [
      'Owns the platform decision and the security posture that goes with it.',
      'Came from consulting, so she asks the question the way an auditor would '
      + 'and expects the answer in the same shape.',
    ],
    rel: [
      'She asked two data residency questions on the QBR on the 28th and you said '
      + 'you would come back within the week. It is nine days.',
      'Their renewal review is in February \u2014 anything still open now becomes '
      + 'a condition then.',
    ],
    threads: [
      { t: 'EU residency \u2014 what the providers receive', when: 'Tue, 2 Sep',
        s: 'Note sent. She has not replied.',
        u: 'https://drive.google.com/drive/search?q=EU%20residency' },
      { t: 'QBR \u2014 two questions left open', when: 'Thu, 28 Aug',
        s: 'The two she is still waiting on.' },
    ],
    open: ['Her two questions, nine days late.'],
  },

  'Mark Feltner': {
    card: 'Runs IT service management at Fieldstone Parts. Careful, and buys on evidence rather than on pitch.',
    title: 'Director, IT Service Management', org: 'Fieldstone Parts',
    site: 'fieldstoneparts.com', li: 'linkedin.com/in/mark-feltner',
    phone: '+1 540 555 0113', loc: 'Raleigh \u00b7 ET', met: 2,
    who: [
      'Runs the service desk the platform would sit under. Owns the budget line '
      + 'but not the decision \u2014 that is two levels above him.',
    ],
    rel: [
      'Nobody has replied on your side in twelve days. He asked twice.',
      'Both meetings with him have been technical; the commercial conversation '
      + 'has not started.',
    ],
    threads: [
      { t: 'Follow-up \u2014 no reply in twelve days', when: 'Wed, 27 Aug',
        s: 'His second message. Still unanswered.' },
    ],
    open: ['A reply. Twelve days is the whole problem here.'],
  },

  'Dana Whitlock': {
    card: 'Leads store systems at Lowe\u2019s. New to you — one meeting so far, and it was an introduction.',
    title: 'Program Lead, Store Systems', org: 'Lowe\u2019s', site: 'trellis.com',
    li: 'linkedin.com/in/dana-whitlock', phone: '+1 704 555 0168',
    loc: 'Mooresville \u00b7 ET', met: 1,
    who: [
      'Runs the store systems programme \u2014 a long buying cycle and a large '
      + 'committee behind her.',
    ],
    rel: [
      'One meeting so far, an introduction through their integration partner.',
    ],
    threads: [],
    open: ['Nothing yet. The next step is hers.'],
  },

  'Enablement': {
    card: 'Owns what the field is told and when. Every rollout lands through them.',
    group: true, size: '3 people', team: 'Revenue enablement',
    channel: '#enablement', sla: 'Two working days',
    what: [
      'Owns the pitch, the objection handling and whatever the field is asked to '
      + 'say this quarter.',
      'Runs the pricing rollout sessions \u2014 the new structures go out through them.',
    ],
    people: ['Sana Iqbal covers the commercial content; two others cover product.'],
    how: [
      'They want the objection, not the deal. Send the sentence a customer said.',
    ],
    threads: [
      { t: 'New pricing rollout \u2014 session', when: 'Mon, 8 Sep',
        s: 'Today. The three structures are the agenda.' },
    ],
    open: ['Nothing from you.'],
  },

  'Finance': {
    card: 'Terms, billing and the number the quarter closes on.',
    group: true, size: '5 people', team: 'Finance',
    channel: '#finance-deals', sla: 'Two working days',
    what: [
      'Owns payment terms, credit and anything that changes when revenue lands.',
      'Flags customers who pay late \u2014 they have flagged Halden twice.',
    ],
    people: ['One analyst covers EMEA and NA deals end to end.'],
    how: [
      'Terms are traded, not asked for. Bring what you are getting back for them.',
    ],
    threads: [
      { t: 'Halden \u2014 net-45, paying at 60', when: 'Thu, 21 Aug',
        s: 'Second flag. Do not trade terms for months here.' },
    ],
    open: ['Nothing from you.'],
  },
};

/* somebody the book knows but nobody has written up yet */
const pplFallback = (name) => {
  const mine = isMine(name);
  const org = (mailOf(name) || '').split('@')[1] || '';
  return {
    title: mine ? 'UnifyApps' : org.replace(/\.[a-z.]+$/, ''),
    org: mine ? null : org.replace(/\.[a-z.]+$/, ''),
    site: mine ? null : org,
    loc: null, met: 1,
    who: [`No research on ${name} yet. Everything below is what the calendar and `
        + 'the mail already know.'],
    rel: [], threads: [], open: [],
  };
};

const pplOf = (name) => PPL[name] || pplFallback(name);

/* what has been edited, and when it was last written */
const PPL_DOC = {};
const PPL_AT = {};

/* the document, as HTML, so it can be edited in place like a summary.
   Three shapes: a colleague, somebody you already know, and somebody
   you are about to meet for the first time — which is the one that
   needs the most and gets it, because there is no history to lean on. */
function pplHtml(name) {
  const p = pplOf(name);
  const mine = isMine(name);
  const self = name === USER.name;
  const first = !mine && !p.met;
  const li = (x) => `<li>${x}</li>`;
  const sec = (h2, items) => items && items.length
    ? `<h3>${h2}</h3><ul>${items.map(li).join('')}</ul>` : '';
  /* a thread is a thing that exists somewhere — the mail it is in, or
     the file it produced. Where it came with an address, that is the
     link; otherwise the search that finds it in the mail. */
  const threads = (p.threads || []).map(t => {
    const u = t.u || ('https://outlook.office.com/mail/search?q='
      + encodeURIComponent(t.t.split(' — ')[0]));
    return `<li><a href="${u}" target="_blank" rel="noreferrer"><b>${t.t}</b></a>`
      + ` · <span class="ppl-when">${t.when}</span><br>${t.s}</li>`;
  }).join('');
  /* the outside world, each item a link out rather than a claim to take
     on trust */
  const news = (p.news || []).map(n =>
    `<li><a href="${n.u}" target="_blank" rel="noreferrer"><b>${n.t}</b></a>`
    + ` · <span class="ppl-when">${n.when}</span><br>${n.s}</li>`).join('');

  /* an alias answers different questions: what it owns, who is behind
     it, and how long it takes */
  if (p.group) {
    return [
      sec('What they own', p.what),
      sec('Who is behind it', p.people),
      sec('How to work with them', p.how),
      threads ? `<h3>Recent and open threads</h3><ul>${threads}</ul>` : '',
      sec('Waiting on', p.open),
    ].filter(Boolean).join('');
  }

  if (first) {
    return [
      sec('Who they are', p.who),
      sec('What they care about', p.care),
      sec('Why this meeting is happening', p.why),
      sec('Where we already touch them', p.touch),
      sec('How to open it', p.open),
      news ? `<h3>Their company, lately</h3><ul>${news}</ul>` : '',
    ].filter(Boolean).join('');
  }

  return [
    sec(self ? 'What you are on' : mine ? 'What they are on' : 'Who they are',
      mine ? p.now : p.who),
    sec(self ? 'How the quarter sits' : mine ? 'Where you overlap' : 'Your relationship',
      p.rel),
    /* how they actually communicate — the thing you learn in a year of
       working with somebody, written down */
    sec('How they work', p.how),
    threads ? `<h3>Recent and open threads</h3><ul>${threads}</ul>` : '',
    sec('Waiting on', p.open),
  ].filter(Boolean).join('');
}

/* ── a meeting, opened up ─────────────────────────────────────
   The person page, for the other thing on this screen: the same pane,
   the same height, the same quiet rows. Everything on it is the thing
   itself rather than a form about it — the name is the name and you
   type in it, the time is the time and you press it, the agenda is a
   document with a cursor in it. Nothing is saved, because nothing is
   ever unsaved. */
let meetRepaint = null;

const TIME_OPTS = () => {
  const out = [];
  for (let m = 7 * 60; m <= 21 * 60; m += 15) out.push(m);
  return out;
};
const MIN_OPTS = [15, 25, 30, 45, 60, 90];
const clock = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:`
  + String(mins % 60).padStart(2, '0');

/* ── telling the room ─────────────────────────────────────────
   Changing a meeting changes it for everybody on it, so saving asks the
   one question that matters: does anybody need to hear about this. Three
   ways out, in the order you would want them — back to what you were
   doing, save it quietly, or save it and say something. */
function updateDialog(n, { onSend, onQuiet, onBack, title, ask, go }) {
  let note = '';
  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) back(); } });
  const shut = () => { dim.remove(); document.removeEventListener('keydown', onKey); };
  const back = () => { shut(); onBack?.(); };
  const onKey = (e) => { if (e.key === 'Escape') back(); };

  const field = h('textarea', {
    class: 'more-why', rows: '4',
    placeholder: ask || 'Add a note for everyone (optional)',
    'aria-label': 'A note for everyone invited',
    oninput: (e) => { note = e.currentTarget.value; },
  });

  dim.append(h('div', { class: 'sh-card more-card upd-card', role: 'dialog',
                        'aria-modal': 'true' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' },
          title || 'Send an update to the people invited?'),
        h('p', { class: 'upd-sub' },
          `${n} ${n === 1 ? 'person is' : 'people are'} on this invitation.`))),
    h('div', { class: 'sh-body' },
      h('div', { class: 'more-field' }, field)),
    h('footer', { class: 'sh-foot regen-foot' },
      h('div', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: back }, 'Back to editing'),
        h('button', { class: 'btn', type: 'button',
                      onclick: () => { shut(); onQuiet(); } }, 'Don’t send'),
        h('button', { class: 'btn btn--primary', type: 'button',
                      onclick: () => { shut(); onSend(note.trim()); } },
          go || 'Send')))));

  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => field.focus());
}

/* a month, for picking a day — the same grid the meetings page uses,
   without the day it is bolted to */
function datePop(anchor, when, onPick) {
  closeMenu();
  let cur = new Date(when.getFullYear(), when.getMonth(), 1);
  const CH = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
    + `<path d="M${d < 0 ? '15 6l-6 6 6 6' : '9 6l6 6-6 6'}"/></svg>`;
  const grid = h('div', { class: 'cal-grid' });
  const head = h('div', { class: 'cal-head' });

  const paint = () => {
    const step = (n) => (e) => {
      e.stopPropagation();
      cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1);
      paint();
    };
    head.replaceChildren(
      h('button', { class: 'cal-arrow', type: 'button', 'aria-label': 'Previous month',
                    html: CH(-1), onclick: step(-1) }),
      h('span', { class: 'cal-month' },
        h('span', { class: 'cal-mn' }, MONTHS[cur.getMonth()]),
        h('span', { class: 'cal-yr' }, String(cur.getFullYear()))),
      h('button', { class: 'cal-arrow', type: 'button', 'aria-label': 'Next month',
                    html: CH(1), onclick: step(1) }));

    const cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      .map((x, i) => h('span', { class: 'cal-dow', 'data-off': String(i > 4) }, x));
    const lead = (cur.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cal-pad' }));
    const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const d = new Date(cur.getFullYear(), cur.getMonth(), i);
      cells.push(h('button', {
        class: 'cal-day', type: 'button',
        'data-on': String(isoDay(d) === isoDay(when)),
        'data-today': String(isoDay(d) === isoDay(new Date())),
        onclick: (e) => { e.stopPropagation(); closeMenu(); onPick(d); },
      }, String(i)));
    }
    grid.replaceChildren(...cells);
  };
  paint();

  const el = h('div', { class: 'menu cal-pop' }, head, grid);
  document.body.append(el);
  openMenu = el;
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
  el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
    ? Math.max(12, r.top - el.offsetHeight - 8) : r.bottom + 8) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
  document.querySelector('.pp-scroll')
    ?.addEventListener('scroll', () => closeMenu(), { once: true });
}

const REPEATS = [
  { v: 'none', t: 'Does not repeat' },
  { v: 'day', t: 'Every day' },
  { v: 'week', t: 'Every week' },
  { v: 'fortnight', t: 'Every two weeks' },
  { v: 'month', t: 'Every month' },
];
const ZONES = [
  { v: 'pt',  t: '(GMT\u221208:00) Pacific Time \u2014 Los Angeles' },
  { v: 'ct',  t: '(GMT\u221206:00) Central Time \u2014 Chicago' },
  { v: 'et',  t: '(GMT\u221205:00) Eastern Time \u2014 New York' },
  { v: 'gmt', t: '(GMT+00:00) Greenwich Mean Time \u2014 London' },
  { v: 'cet', t: '(GMT+01:00) Central European Time \u2014 Berlin' },
  { v: 'gst', t: '(GMT+04:00) Gulf Standard Time \u2014 Dubai' },
  { v: 'ist', t: '(GMT+05:30) India Standard Time \u2014 Bengaluru' },
  { v: 'sgt', t: '(GMT+08:00) Singapore Time \u2014 Singapore' },
];
const CONF = [
  { v: 'teams', t: 'Microsoft Teams' },
  { v: 'meet', t: 'Google Meet' },
  { v: 'zoom', t: 'Zoom' },
];

function meetingPanel(m) {
  delete document.getElementById('main')?.dataset.hub;
  closeMenu();
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');
  const key = m.key;
  const E = editOf(key);
  /* what it looked like when you opened it, so Cancel means something */
  const before = JSON.stringify({ e: E, added: MEET_ADDED[key] || [] });

  const close = closeArtifact = () => {
    main.dataset.artifact = 'closed';
    delete main.dataset.pane;
    setTimeout(() => { if (main.dataset.artifact === 'closed') host.replaceChildren(); }, 260);
  };

  const touch = () => { meetRepaint?.(); draw(); };

  const body = h('div', { class: 'pp-scroll' });

  const draw = () => {
    const live = meetingsOn(midnight(E.day ? new Date(E.day) : m.start))
      .find(x => x.key === key) || m;
    const startMins = live.start.getHours() * 60 + live.start.getMinutes();
    const endMins = startMins + live.mins;

    const name = h('h1', {
      class: 'pp-name mt-edit-n', contenteditable: 'true', spellcheck: 'false',
      'data-empty': 'Untitled meeting',
      oninput: () => { E.name = name.textContent.trim(); meetRepaint?.(); },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } },
    });
    name.textContent = live.name;

    const pick = (label, opts, cur, run, cls) => h('button', {
      class: 'mt-edit-v' + (cls ? ' ' + cls : ''), type: 'button', 'aria-haspopup': 'menu',
      onclick: (e) => {
        e.stopPropagation();
        menu(e.currentTarget, opts.map(o => ({
          label: o.t, tick: o.v === cur,
          run: () => { run(o.v); touch(); },
        })));
      },
      /* no caret: the value is the control, and the hover says so */
    }, label);

    const row = (k, ...kids) => h('div', { class: 'pp-line' },
      h('span', { class: 'pp-k' }, k),
      h('span', { class: 'pp-v mt-edit-r' }, ...kids.filter(Boolean)));

    /* end times are offered as times, with the length of the meeting
       said beside each one — which is the thing you are actually
       choosing */
    const endOpts = [...new Set([...MIN_OPTS, 120, live.mins])].sort((a, b) => a - b)
      .map(v => ({ v, t: `${clock((startMins + v) % 1440)}  \u00b7  ${v} min` }));

    const people = ATT(live);

    /* ── adding somebody ──
       A plus and a word, like everything else on this page. Pressing it
       opens the book with a field at the top: type, pick, and it lands
       in the list behind — the panel stays open, because inviting one
       person is rarely inviting one person. */
    const here = new Set([USER.name, ...people.map(p => p.name)]);
    const addGuest = (who) => {
      (MEET_ADDED[key] = MEET_ADDED[key] || []).push(who);
      here.add(who);
      touch();
    };

    const guestPop = (anchor) => {
      closeMenu();
      let query = '', mark = 0;
      const list = h('div', { class: 'guest-list' });
      const field = h('input', {
        class: 'guest-in', type: 'text', spellcheck: 'false',
        placeholder: 'Search people, or type an address',
        oninput: (e) => { query = e.currentTarget.value; mark = 0; paintList(); },
        onkeydown: (e) => {
          const hits = matches();
          if (e.key === 'ArrowDown') { e.preventDefault(); mark = Math.min(mark + 1, hits.length - 1); paintList(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); mark = Math.max(mark - 1, 0); paintList(); }
          else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
          else if (e.key === 'Enter') {
            e.preventDefault();
            const p = hits[mark];
            if (p) take(p.n);
            else if (query.includes('@')) take(query.trim());
          }
        },
      });
      const matches = () => {
        const q = query.trim().toLowerCase();
        return INVITE_BOOK()
          .filter(p => !here.has(p.n)
            && (!q || p.n.toLowerCase().includes(q) || p.e.toLowerCase().includes(q)))
          .slice(0, 40);
      };
      const take = (who) => {
        addGuest(who);
        field.value = ''; query = ''; mark = 0;
        paintList(); field.focus();
      };
      const paintList = () => {
        const hits = matches();
        list.replaceChildren(...(hits.length ? hits.map((p, i) => h('button', {
          /* the pointer's own highlight is CSS: rebuilding the list on
             hover replaced the button between pressing and letting go,
             so the click never landed */
          class: 'mt-edit-s' + (i === mark ? ' is-on' : ''), type: 'button',
          onclick: () => take(p.n),
        },
          faceEl(p.n, 'md-av'),
          h('span', { class: 'md-p-main' },
            h('span', { class: 'md-p-n' }, p.n),
            h('span', { class: 'md-p-e' }, p.e))))
          : [h('p', { class: 'guest-none' },
              query.includes('@') ? 'Press Enter to invite this address'
                                  : 'Nobody by that name')]));
      };
      paintList();

      const el = h('div', { class: 'menu guest-pop' }, field, list);
      document.body.append(el);
      openMenu = el;
      const r = anchor.getBoundingClientRect();
      el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
      el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
        ? Math.max(12, r.top - el.offsetHeight - 8) : r.bottom + 8) + 'px';
      el.classList.add('opening');
      el.addEventListener('click', (e) => e.stopPropagation());
      /* the page underneath can scroll, and a card left hanging over
         where it used to be is worse than a card that closed */
      document.querySelector('.pp-scroll')
        ?.addEventListener('scroll', () => closeMenu(), { once: true });
      requestAnimationFrame(() => field.focus());
    };

    const agenda = h('div', {
      class: 'pp-doc mt-edit-doc', contenteditable: 'true', spellcheck: 'false',
      'data-empty': 'What this meeting is for, and what has to come out of it.',
      oninput: () => { E.agenda = agenda.innerHTML; },
    });
    agenda.innerHTML = E.agenda
      || (live.agenda ? '<ul>' + live.agenda.map(a => `<li>${a}</li>`).join('') + '</ul>' : '');

    /* ── where it is held ──
       A link when there is one, and the two ways to make one when there
       is not. */
    /* a meeting held somewhere has no link; one held nowhere in
       particular is on the platform the invitation came from */
    const via = E.via !== undefined
      ? E.via : (live.via || (live.place ? null : 'teams'));
    const slug = live.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 22);
    const link = via && PLATFORM[via] ? PLATFORM[via].link(slug) : null;
    const place = E.place ?? (live.place ? live.place.name : null);

    const confRow = via
      ? h('div', { class: 'mt-edit-conf' },
          h('span', { class: 'mt-edit-conf-m', 'aria-hidden': 'true',
                      html: `<svg viewBox="0 0 24 24"><use href="#b-${via}"></use></svg>` }),
          /* one line: the link is the whole of it, and the mark in front
             already says which platform it opens */
          h('button', { class: 'mt-edit-join', type: 'button',
            title: PLATFORM[via].join,
            onclick: () => toast(`Joining opens ${PLATFORM[via].label} in the next pass.`) },
            link),
          h('button', { class: 'mt-edit-ic', type: 'button', title: 'Copy the link',
            'aria-label': 'Copy the link', html: MI(GLYPHS.copy),
            onclick: () => navigator.clipboard?.writeText('https://' + link).then(
              () => toast('Link copied.'), () => toast('Could not reach the clipboard.')) }),
          h('button', { class: 'mt-edit-ic', type: 'button', title: 'Change',
            'aria-label': 'Change the conferencing', html: MI(GLYPHS.gear),
            onclick: (e) => {
              e.stopPropagation();
              menu(e.currentTarget, [
                /* each one wearing its own mark, so the list reads as the
                   three products rather than three words */
                ...CONF.map(c => ({
                  label: c.t, tick: c.v === via,
                  html: `<svg viewBox="0 0 24 24"><use href="#b-${c.v}"></use></svg>`,
                  run: () => { E.via = c.v; touch(); },
                })),
                { rule: true },
                { label: 'Remove conferencing', icon: 'trash', danger: true,
                  run: () => { E.via = null; touch(); } },
              ]);
            } }))
      /* a document does not have buttons in it: a plus and an underlined
         word is enough to say this does something */
      : h('button', { class: 'mt-edit-add-b', type: 'button',
          onclick: (e) => {
            e.stopPropagation();
            menu(e.currentTarget, CONF.map(c => ({
              label: c.t,
              html: `<svg viewBox="0 0 24 24"><use href="#b-${c.v}"></use></svg>`,
              run: () => { E.via = c.v; touch(); },
            })));
          } },
          h('span', { class: 'mt-edit-plus', 'aria-hidden': 'true', html: PLUS_IC }),
          'Add video conferencing');

    /* somewhere with a door, which is a different question from a link */
    const askPlace = () => {
      const v = prompt('Where is it held?', place || '');
      if (v != null) { E.place = v.trim() || null; touch(); }
    };
    const placeRow = place
      ? h('div', { class: 'mt-edit-conf' },
          h('span', { class: 'mt-edit-conf-m mt-edit-pin', 'aria-hidden': 'true',
                      html: PIN_IC }),
          h('button', { class: 'mt-edit-join', type: 'button', onclick: askPlace }, place),
          h('button', { class: 'mt-edit-ic', type: 'button', title: 'Remove the room',
            'aria-label': 'Remove the room', html: MI(GLYPHS.trash),
            onclick: () => { E.place = null; touch(); } }))
      : h('button', { class: 'mt-edit-add-b', type: 'button', onclick: askPlace },
          h('span', { class: 'mt-edit-plus', 'aria-hidden': 'true', html: PLUS_IC }),
          'Add a room or place');

    body.replaceChildren(
      h('div', { class: 'pp-head' }, h('div', { class: 'pp-id' }, name)),

      h('div', { class: 'pp-lines' },
        /* the day and the hours are two decisions, so they are two rows */
        row('Date',
          h('button', {
            class: 'mt-edit-v mt-edit-v--wide', type: 'button', 'aria-haspopup': 'dialog',
            onclick: (e) => {
              e.stopPropagation();
              datePop(e.currentTarget, live.start, (d) => { E.day = isoDay(d); touch(); });
            },
          }, longDate(live.start)),
        ),
        row('Time',
          pick(hhmm(live.start), TIME_OPTS().map(v => ({ v, t: clock(v) })), startMins,
            (v) => { E.at = v; }),
          h('span', { class: 'mt-edit-to' }, '–'),
          pick(clock(endMins % 1440), endOpts, live.mins, (v) => { E.mins = v; })),
        /* one row, one thing — a line that says two is a line you read
           twice */
        /* a row holding one value gives the whole line to it, so the
           hover is the same shape whichever zone you are in */
        row('Time zone',
          pick(ZONES.find(z => z.v === (E.tz || 'gmt')).t, ZONES, E.tz || 'gmt',
            (v) => { E.tz = v; }, 'mt-edit-v--wide')),
        row('Conferencing', confRow),
        row('Location', placeRow)),

      h('div', { class: 'mt-edit-sec' },
        h('h3', {}, 'Invitees'),
        h('span', { class: 'mt-edit-n2' }, `${people.length + 1}`)),
      h('div', { class: 'mt-edit-ppl' },
        ...[{ name: USER.name, mail: mailOf(USER.name), you: true }, ...people]
          .map(pn => h('div', { class: 'md-p mt-edit-p' },
            /* what each of them answered, on the face, exactly as the
               invitation shows it */
            h('span', { class: 'md-p-av' },
              faceEl(pn.name, 'md-av'),
              h('span', { class: 'md-p-badge', 'data-rsvp': pn.you ? live.rsvp : pn.rsvp,
                          title: RSVP_WORD[pn.you ? live.rsvp : pn.rsvp],
                          html: MD_MARK[pn.you ? live.rsvp : pn.rsvp] || '' })),
            h('span', { class: 'md-p-main' },
              h('span', { class: 'md-p-n' }, pn.name,
                pn.you ? h('span', { class: 'md-p-lead' }, 'You')
                       : pn.lead ? h('span', { class: 'md-p-lead' }, 'Organiser') : null),
              h('span', { class: 'md-p-e' }, pn.mail)),
            pn.you ? null : h('button', {
              class: 'mt-edit-x', type: 'button', title: `Remove ${pn.name}`,
              'aria-label': `Remove ${pn.name}`,
              onclick: () => {
                if ((MEET_ADDED[key] || []).includes(pn.name)) {
                  MEET_ADDED[key] = MEET_ADDED[key].filter(n => n !== pn.name);
                } else {
                  E.drop = [...(E.drop || []), pn.name];
                }
                touch();
              },
            }, '×'))),
        h('button', {
          class: 'mt-edit-add-b mt-edit-invite', type: 'button',
          onclick: (e) => { e.stopPropagation(); guestPop(e.currentTarget); },
        },
          h('span', { class: 'mt-edit-plus', 'aria-hidden': 'true', html: PLUS_IC }),
          'Invite others')),

      h('div', { class: 'mt-edit-sec' }, h('h3', {}, 'Agenda')),
      agenda);
  };
  draw();

  host.replaceChildren(h('div', { class: 'cp pp mt-edit' },
    h('header', { class: 'cp-top' },
      h('h2', { class: 'cp-h' }, 'Edit Meeting'),
      h('div', { class: 'cp-top-r' },
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),
    body,
    /* the three things you can do with an invitation you have opened */
    h('footer', { class: 'cp-foot mt-edit-foot' },
      h('button', {
        class: 'mt-edit-del', type: 'button',
        onclick: () => {
          const room = ATT(m).length;
          const drop = () => { E.deleted = true; meetRepaint?.(); close(); };
          /* a meeting with nobody else on it is yours to drop; one with a
             room in it is a thing other people have in their week */
          if (!room) return drop();
          updateDialog(room + 1, {
            title: 'Cancel this meeting and tell the people invited?',
            ask: 'Add a note about the cancellation (optional)',
            onSend: drop, onQuiet: drop, onBack: () => {},
          });
        },
      }, 'Delete'),
      h('div', { class: 'mt-edit-foot-r' },
        h('button', {
          class: 'mt-edit-cancel', type: 'button',
          onclick: () => {
            const was = JSON.parse(before);
            Object.keys(E).forEach(k => delete E[k]);
            Object.assign(E, was.e);
            MEET_ADDED[key] = was.added;
            meetRepaint?.(); close();
          },
        }, 'Cancel'),
        h('button', {
          class: 'btn btn--primary mt-edit-save', type: 'button',
          onclick: () => {
            const now = JSON.stringify({ e: E, added: MEET_ADDED[key] || [] });
            const room = ATT(m).length;
            /* nothing changed, or nobody else is on it: saving is just
               closing */
            if (now === before || !room) return close();
            updateDialog(room + 1, {
              onSend: () => close(),
              onQuiet: () => close(),
              onBack: () => {},
            });
          },
        }, 'Save')))));

  main.dataset.artifact = 'open';
  main.dataset.pane = 'person';
}

/* ── names, in the prose ──────────────────────────────────────
   A brief is mostly about people, and every one of them has a page. So
   the names in it are the way in: no chips, no icons, no colour — the
   text as written, which underlines when the pointer is on it and opens
   the person when it is clicked. Nothing about the paragraph changes
   for somebody who never clicks. */
const NAME_MAP = () => {
  const map = {};
  const all = [...new Set([...Object.keys(PPL), ...Object.keys(MEET_BOOK)])]
    /* an alias standing in for the other side of the table is not a page
       worth opening */
    .filter(n => n !== 'Unassigned' && !n.startsWith('Their '));
  all.forEach(n => { map[n] = n; });
  /* briefs call people by their first name after the first mention, so
     the first name opens the same page — unless two people share it */
  const firsts = {};
  all.forEach(n => {
    const f = n.split(' ')[0];
    if (f === n) return;
    firsts[f] = firsts[f] ? '' : n;
  });
  Object.entries(firsts).forEach(([f, n]) => { if (n && !map[f]) map[f] = n; });
  return map;
};

function linkNames(root) {
  if (!root) return;
  const map = NAME_MAP();
  /* longest first, so "Rachel Okafor" wins over a bare "Rachel" */
  const names = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!names.length) return;
  const rx = new RegExp('\\b(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') + ')\\b', 'g');
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      /* leave alone anything already a link, and anything being typed in */
      if (n.parentElement?.closest('a, button, [contenteditable="true"], .pp-ref'))
        return NodeFilter.FILTER_REJECT;
      return rx.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const hits = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) hits.push(n);
  hits.forEach(node => {
    const frag = document.createDocumentFragment();
    let last = 0, m;
    rx.lastIndex = 0;
    while ((m = rx.exec(node.nodeValue))) {
      if (m.index > last) frag.append(node.nodeValue.slice(last, m.index));
      const said = m[0], who = map[said];
      frag.append(h('button', {
        class: 'pp-ref', type: 'button', 'data-person': who,
        onclick: (e) => {
          e.stopPropagation();
          /* the brief you are reading is a meeting, so the page opens
             with that room behind it */
          const m = CUE_ME;
          const here = m && [USER.name, ...ATT(m).map(a => a.name)].includes(who);
          personPanel(who, here ? { meeting: m } : null);
        },
      }, said));
      last = m.index + said.length;
    }
    if (last < node.nodeValue.length) frag.append(node.nodeValue.slice(last));
    node.replaceWith(frag);
  });
}

/* ── the invitation, opened into the pane ──
   Everything the popover holds, given a page instead: the same head,
   the same way in, the same room and the same agenda — but it stays
   open beside the brief rather than closing the moment you look away,
   which is what you want the second you are reading one and checking
   the other. */
/* ── the open pane, when the meeting under it changes ──
   Re-render whatever is showing for the meeting now on the page, on the
   tab it was already on; a pane about some other meeting is closed
   rather than left to lie. */
function followPane(m) {
  const main = document.getElementById('main');
  if (!main || main.dataset.artifact !== 'open') return;
  const host = document.getElementById('artifactPanel');
  if (main.dataset.hub === 'true') return hubPanel(m, HUB.tab);
  if (host?.querySelector('.md-pane')) return detailPanel(m);
  if (host?.querySelector('.cue-feed')) return cuePanel(m);
}

/* ── a meeting, filed ──────────────────────────────────────────
   A call is rarely on its own: it belongs to the deal or the programme
   it is part of. Filing it is one choice from the list you already keep,
   and the one it is in is ticked so the menu doubles as the answer to
   "where does this live". */
const MEET_PROJ = {};

function projectMenu(anchor, m) {
  const at = MEET_PROJ[m.key];
  menu(anchor, [
    ...PROJECT_LIST.map(n => ({
      label: n, icon: 'project', tick: at === n,
      run: () => {
        if (at === n) { delete MEET_PROJ[m.key]; return toast(`Removed from ${n}.`); }
        MEET_PROJ[m.key] = n;
        toast(`Added to ${n}.`);
      },
    })),
    { rule: true },
    { label: 'New project\u2026',
      run: () => toast('Naming a new project comes in the next pass.') },
  ]);
}

const projectItem = (m, anchorEl) => ({
  label: MEET_PROJ[m.key] ? `In ${MEET_PROJ[m.key]}` : 'Add to project',
  icon: 'project', more: true,
  run: () => projectMenu(anchorEl(), m),
});

function detailPanel(m) {
  closeMenu();
  delete document.getElementById('main')?.dataset.hub;
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');

  const plat = !m.place && !m.adhoc && PLATFORM[m.via || 'teams'];
  const slug = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 22);
  const link = plat ? plat.link(slug) : null;

  const close = closeArtifact = () => {
    main.dataset.artifact = 'closed';
    delete main.dataset.pane;
    setTimeout(() => { if (main.dataset.artifact === 'closed') host.replaceChildren(); }, 260);
  };

  const { answers, count, invite, list } = meetingBits(m, () => {});

  host.replaceChildren(h('div', { class: 'cp pp md-pane' },
    h('header', { class: 'cp-top' },
      h('h2', { class: 'cp-h' }, 'Meeting details'),
      h('div', { class: 'cp-top-r' },
        /* the one thing you do to an invitation you are looking at */
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button',
          title: 'Edit this meeting', 'aria-label': 'Edit this meeting',
          onclick: () => meetingPanel(m),
          html: MI(GLYPHS.rename),
        }),
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),

    h('div', { class: 'pp-scroll md-scroll' },
      h('h1', { class: 'pp-name' }, m.name),
      h('p', { class: 'pp-role' },
        `${longDate(m.start)} \u00b7 ${meetSpan(m)}`),

      /* the way in, first — it is the only thing in here anybody opens
         in a hurry */
      link ? h('div', { class: 'md-join' },
        h('span', { class: 'md-join-ic', 'aria-hidden': 'true',
                    html: `<svg viewBox="0 0 24 24"><use href="#b-${m.via || 'teams'}"></use></svg>` }),
        h('span', { class: 'md-join-m' },
          h('button', { class: 'md-join-go', type: 'button',
                        onclick: () => toast(`Joining opens ${plat.label} in the next pass.`) },
            plat.join),
          h('span', { class: 'md-join-u' }, link)),
        h('button', { class: 'md-copy', type: 'button', title: 'Copy the link',
                      'aria-label': 'Copy the link',
                      onclick: () => navigator.clipboard?.writeText('https://' + link).then(
                        () => toast('Link copied.'), () => toast('Could not reach the clipboard.')) },
          h('span', { class: 'md-copy-ic', 'aria-hidden': 'true', html: MI(GLYPHS.copy) }))
      ) : h('div', { class: 'md-place' },
        h('span', { class: 'md-place-ic', 'aria-hidden': 'true',
                    html: m.adhoc ? DEVICE_IC : PIN_IC }),
        h('span', { class: 'md-place-m' },
          h('span', { class: 'md-place-n' },
            m.adhoc ? 'Started on this device'
              : m.place ? m.place.name : m.where),
          h('span', { class: 'md-place-a' },
            m.adhoc ? 'Started on demand \u2014 not in your calendar'
              : m.place ? m.place.addr : ''))),

      count, invite, list,
      m.agenda ? h('div', { class: 'md-sect' }, 'Agenda') : null,
      m.agenda ? h('ul', { class: 'md-agenda' }, m.agenda.map(x => h('li', {}, x))) : null),

    m.adhoc ? null : h('footer', { class: 'md-foot' },
      h('span', { class: 'md-going' }, 'Going?'),
      answers)));

  main.dataset.artifact = 'open';
  main.dataset.pane = 'person';
}

/* the page itself, in the third pane — the same pane the conversation
   uses, because a person is another thing you open beside what you were
   reading rather than instead of it */
function personPanel(name, ctx) {
  closeMenu();
  delete document.getElementById('main')?.dataset.hub;
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');
  const p = pplOf(name);
  const mine = isMine(name);
  const mail = mailOf(name);
  PPL_AT[name] = PPL_AT[name] || new Date();

  const close = closeArtifact = () => {
    main.dataset.artifact = 'closed';
    delete main.dataset.pane;
    setTimeout(() => { if (main.dataset.artifact === 'closed') host.replaceChildren(); }, 260);
  };

  /* opened from a meeting, the page knows who else was in the room —
     which is nearly always who you want next */
  const M = ctx?.meeting;
  const room = M
    ? [{ name: USER.name, mail: mailOf(USER.name), rsvp: M.rsvp || 'yes', you: true },
       ...ATT(M).filter(a => a.name !== USER.name)]
    : [];
  const at = room.findIndex(r => r.name === name);

  /* the same row the invitation uses: a face with what they answered on
     it, the name, what they are to this meeting, and the address. A list
     of bare names told you less than the popover you came from. */
  const roomMenu = (anchor) => {
    closeMenu();
    const el = h('div', { class: 'menu pp-room', role: 'menu' },
      ...room.map(r => h('div', {
        class: 'md-p pp-pick' + (r.name === name ? ' is-on' : ''),
        role: 'menuitem', tabIndex: 0,
        onclick: () => { closeMenu(); personPanel(r.name, ctx); },
        onkeydown: (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault(); closeMenu(); personPanel(r.name, ctx);
        },
      },
        h('span', { class: 'md-p-av' },
          faceEl(r.name, 'md-av'),
          h('span', { class: 'md-p-badge', 'data-rsvp': r.rsvp,
                      title: RSVP_WORD[r.rsvp], html: MD_MARK[r.rsvp] || '' })),
        h('span', { class: 'md-p-main' },
          h('span', { class: 'md-p-n' }, r.name,
            r.you ? h('span', { class: 'md-p-lead' }, 'You')
                  : r.lead ? h('span', { class: 'md-p-lead' }, 'Organiser') : null),
          h('span', { class: 'md-p-e' }, r.mail)),
        r.name === name
          ? h('span', { class: 'pp-pick-on', 'aria-hidden': 'true', html: TICK_IC })
          : null)));
    document.body.append(el);
    openMenu = el;
    const b = anchor.getBoundingClientRect();
    el.style.left = Math.max(12, Math.min(b.left,
      innerWidth - el.offsetWidth - 12)) + 'px';
    el.style.top = (b.bottom + el.offsetHeight + 14 > innerHeight
      ? Math.max(12, b.top - el.offsetHeight - 6) : b.bottom + 6) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  };

  /* a row of the header: a label, and a value that goes somewhere */
  const line = (k, v, href) => v ? h('div', { class: 'pp-line' },
    h('span', { class: 'pp-k' }, k),
    href
      ? h('a', { class: 'pp-v pp-link', href, target: '_blank', rel: 'noreferrer' }, v)
      : h('span', { class: 'pp-v' }, v),
    /* every one of these is something you end up pasting somewhere else,
       so each row keeps its own way of taking it — on the row, not in a
       menu, and only under the pointer */
    h('button', {
      class: 'pp-copy', type: 'button',
      title: `Copy ${k.toLowerCase()}`, 'aria-label': `Copy ${k.toLowerCase()}`,
      html: MI(GLYPHS.copy),
      onclick: (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(v).then(
          () => toast(`${k} copied.`), () => toast('Could not reach the clipboard.'));
      },
    })) : null;

  /* read off the page rather than rebuilt from the record, so what lands
     on the clipboard is what the head is showing */
  const copyProfile = () => {
    const head = document.getElementById('artifactPanel');
    const role = head.querySelector('.pp-role')?.textContent.trim();
    const rows = [...head.querySelectorAll('.pp-lines .pp-line')].map(r =>
      `${r.querySelector('.pp-k').textContent}: ${r.querySelector('.pp-v').textContent}`);
    const text = [name, role, '', ...rows].filter(x => x !== undefined).join('\n').trim();
    navigator.clipboard?.writeText(text).then(
      () => toast('Profile copied.'), () => toast('Could not reach the clipboard.'));
  };

  const doc = h('div', {
    class: 'pp-doc', contenteditable: 'true', spellcheck: 'false',
    oninput: () => { PPL_DOC[name] = doc.innerHTML; },
  });
  doc.innerHTML = PPL_DOC[name] || pplHtml(name);

  /* the same box the day has and the brief has: a plus that adds
     context, the question, and the way to send it */
  const askGo = h('button', {
    class: 'mt-ask-go', type: 'button', hidden: true, 'aria-label': 'Ask', html: ARROW,
  });
  const fire = () => {
    const q = ask.value.trim();
    if (!q) return;
    ask.value = ''; askGo.hidden = true; askMic.hidden = false;
    chatPanel(q, null, { person: name });
  };
  const ask = h('input', {
    class: 'mt-ask-in', type: 'text', spellcheck: 'false',
    placeholder: name === USER.name
      ? 'Ask anything about your week'
      : `Ask anything about ${p.group ? name.toLowerCase() : name.split(' ')[0]}`,
    'aria-label': `Ask about ${name}`,
    oninput: () => {
      const on = !!ask.value.trim();
      askGo.hidden = !on; askMic.hidden = on;
    },
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } },
  });
  const askMic = h('button', {
    class: 'mt-ask-mic', type: 'button', 'aria-label': 'Ask out loud',
    title: 'Ask out loud', html: MIC_IC,
    onclick: () => toast('Talking to it comes in the next pass.'),
  });
  const askPlusBtn = h('button', {
    class: 'mt-ask-mk mt-ask-plus', type: 'button',
    'aria-label': 'Add context', title: 'Add context', html: PLUS_IC,
    onclick: (e) => { e.stopPropagation(); askPlus(e.currentTarget, ask); },
  });
  askGo.onclick = fire;

  host.replaceChildren(h('div', { class: 'cp pp' },
    h('header', { class: 'cp-top' },
      /* in a meeting, the head is the room: whose page this is, how many
         others were invited, and one press to any of them */
      /* the way back to the invitation this page was opened from, beside
         the way across to anybody else on it: the details page already
         lists the room, so it is where back belongs */
      room.length > 1 ? h('button', {
        class: 'icon-btn icon-btn-canvas pp-back', type: 'button',
        'data-tip': 'Back to meeting details', 'aria-label': 'Back to meeting details',
        onclick: () => detailPanel(ctx.meeting),
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
            + 'stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
      }) : null,
      room.length > 1
        ? h('button', {
            class: 'cp-h pp-switch', type: 'button', 'aria-haspopup': 'menu',
            onclick: (e) => { e.stopPropagation(); roomMenu(e.currentTarget); },
          },
            h('span', { class: 'pp-switch-n' }, name),
            /* how many were in the room, not which number this one is —
               nobody counts down an invitation list. The count and the
               caret are one chip, so the line reads as a name and a
               control rather than as three loose pieces. */
            h('span', { class: 'pp-switch-d', 'aria-hidden': 'true' }, '\u00b7'),
            h('span', { class: 'pp-switch-c' }, `${room.length} Invitees`),
            h('span', { class: 'pp-switch-v', 'aria-hidden': 'true' }))
        : h('h2', { class: 'cp-h' },
            p.group ? 'Team' : name === USER.name ? 'You' : mine ? 'Colleague' : 'Person'),
      h('div', { class: 'cp-top-r' },
        /* the whole head, in one press: the rows each carry their own
           copy for the one field you want, and this is for the times you
           are pasting the person into a mail or a ticket */
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button',
          'data-tip': 'Copy profile details', 'aria-label': 'Copy profile details',
          onclick: () => copyProfile(),
          html: MI(GLYPHS.copy),
        }),
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),

    h('div', { class: 'pp-scroll' },
      h('div', { class: 'pp-head' },
        /* a real photograph if one has come across from a system that
           has one, and nothing at all if not: a drawn silhouette is a
           picture of nobody, and initials in a circle are a picture of
           not having a picture */
        PHOTOS[name] ? faceEl(name, 'pp-face') : null,
        h('div', { class: 'pp-id' },
          /* the tag belongs beside the name, not under the role: which
             side of the company somebody is on is part of who they are */
          h('div', { class: 'pp-nameline' },
            h('h1', { class: 'pp-name' }, name),
            /* only somebody outside gets a tag: a colleague being a
               colleague is the assumption, not the news */
            mine ? null : h('span', { class: 'pp-tag' }, 'External')),
          h('p', { class: 'pp-role' },
            p.group
              ? [p.team, p.size].filter(Boolean).join(' · ')
              : [p.title, mine ? p.team : p.org].filter(Boolean).join(' · ')))),

      h('div', { class: 'pp-lines' },
        /* the four things you actually go looking for on somebody, in
           the order you go looking for them — a handle in a chat tool
           was a fifth row nobody has ever needed off this page */
        line('Email', mail, `mailto:${mail}`),
        !p.group && p.phone
          ? line('Phone', p.phone, `tel:${p.phone.replace(/\s/g, '')}`) : null,
        !p.group ? line('Manager', p.manager, p.manager ? `#meetings` : null) : null,
        !mine && p.li ? line('LinkedIn', p.li, `https://${p.li}`) : null,
        !mine && p.site ? line('Company', p.org, `https://${p.site}`) : null,
        /* where somebody is tells you when they are; the working hours
           under it said the same thing twice */
        p.group ? null : line('Location', p.loc)),

      doc),

    /* the same box the conversation has, asking about the person the
       page is about — two buttons under a document were two more things
       to read, and the address is already a link up in the head */
    h('footer', { class: 'cp-foot' },
      h('div', { class: 'mt-ask pp-ask' }, askPlusBtn, ask, askMic, askGo))));

  main.dataset.artifact = 'open';
  main.dataset.pane = 'person';
}

/* ── cues ─────────────────────────────────────────────────────
   The room asks you something you cannot answer from memory, and the
   answer exists in a system you are not looking at. Cues catch the
   question as it is asked, go and find the answer while you keep
   talking, and hand it to you when it is ready.

   Three rules hold the whole design. It never interrupts: one line
   above the box you already look at, no sound, no movement in the
   corner of your eye. It is always dismissible, and dismissing is free
   — a cue you put down is still in the record. And it is honest about
   the wait: looking something up properly takes half a minute or more,
   so the card says what it is reading and how long it has been at it
   rather than pretending to be instant.

   Press C to turn them on for a meeting. Off by default, because a
   feature that starts talking on its own is a feature people turn off
   for good. */
const CUES = { on: false, key: null, i: 0, items: [], timer: null };
/* the meeting whose brief is open, for the keystroke to aim at */
let CUE_ME = null;

const CUE_SCRIPT = [
  {
    who: 'Rachel Okafor', at: '04:12',
    q: 'Didn’t you have an outage in March?',
    tag: 'Reliability', tone: 'neg',
    reads: ['the status history', 'Slack'],
    wait: 12000,
    say: 'One P2 on 14 March — 41 minutes, no data loss, and your team had '
       + 'the postmortem the same week.',
    facts: [
      '14 March, 09:12–09:53 UTC. Search degraded; ingestion unaffected.',
      'Postmortem sent to Rachel and their platform lead on 17 March.',
    ],
    steps: [
      { source: 'internal', query: 'March incident, this account', rows: [
        { source: 'slack', title: '#incidents — P2 14 March, resolved 09:53', meta: 'Platform' },
        { source: 'drive', title: 'Postmortem — 14 March search degradation', meta: 'Shared 17 Mar' },
      ] },
      { source: 'think', query: 'One P2, 41 minutes, no data loss — say the number first.' },
    ],
  },
  {
    who: 'Rachel Okafor', at: '12:04',
    q: 'How does this compare with what Verve quoted us?',
    tag: 'Pricing',
    reads: ['Slack', 'Drive', 'the web'],
    wait: 9000,
    say: 'We land 14% under their 36-month quote at the same seat count, '
       + 'and ours has the ramp in it.',
    facts: [
      'Verve quoted $412k over 36 months for 460 seats — forwarded by Rachel on 2 Sep.',
      'Ours at 36 months is $354k, with the three-month ramp included.',
    ],
    steps: [
      { source: 'internal', query: 'Verve pricing, this account', rows: [
        { source: 'outlook', title: 'FW: Verve — commercial summary', meta: 'Rachel Okafor · 2 Sep' },
        { source: 'slack', title: '#deal-halden — they are running a Verve POC', meta: '4 days ago' },
        { source: 'drive', title: 'Halden — 36 month structures.gsheet', meta: 'Deal desk' },
      ] },
      { source: 'web', query: 'Verve list pricing per seat, enterprise', rows: [
        { title: 'Published seat pricing and minimums', meta: 'vendor site' },
      ] },
      { source: 'think', query: 'Same seats, same term — the gap is the ramp, not the rate.' },
    ],
  },
  {
    who: 'Deal desk', at: '18:41',
    q: 'Can you send us the SOC 2 report?',
    tag: 'Security', tone: 'pos',
    reads: ['Drive', 'SharePoint'],
    wait: 6000,
    say: 'Yes — SOC 2 Type II, current through August. It is ready to send.',
    facts: ['SOC 2 Type II · covers 1 Sep 2024 to 31 Aug 2025 · no exceptions.'],
    file: 'SOC 2 Type II — Aug 2025.pdf',
    steps: [
      { source: 'internal', query: 'current SOC 2 report', rows: [
        { source: 'drive', title: 'SOC 2 Type II — Aug 2025.pdf', meta: 'Trust · shared externally' },
        { source: 'sharepoint', title: 'Security review pack', meta: 'Legal' },
      ] },
    ],
  },
  {
    who: 'Deal desk', at: '21:30',
    q: 'What is the roadmap for on-prem?',
    tag: 'Roadmap',
    reads: ['Drive', 'Slack', 'the roadmap'],
    wait: 11000, empty: true,
    say: 'Nothing solid on this — no dated commitment anywhere I can read.',
    facts: ['The last on-prem note is a Slack thread from March with no owner and no date.'],
    steps: [
      { source: 'internal', query: 'on-prem roadmap, commitments', rows: [
        { source: 'slack', title: '#product — on-prem, parked in March', meta: 'no owner' },
      ] },
      { source: 'think', query: 'Nothing dated. Better to say you will come back than to guess.' },
    ],
  },
];

const cueOn = (m) => CUES.on && CUES.key === m.key;
/* the press that sends a cue out: from here it is reading, and it says
   what it is reading and how long it has been at it */
function cueFind(c) {
  const now = Date.now();
  c.state = 'work'; c.began = now; c.done = now + c.wait;
  /* the order of the answers is the order you asked for them */
  c.ran = now;
  cuePaint?.();
}
const cueLive = () => CUES.items.filter(c => !c.gone);
let cuePaint = null;

function cueStart(key) {
  CUES.on = true; CUES.key = key; CUES.i = 0; CUES.items = [];
  clearInterval(CUES.timer);
  /* every second: a cue arrives, or one that is out looking gets a
     second older, or one comes back with an answer */
  CUES.timer = setInterval(cueTick, 250);
  CUES.next = Date.now() + 4000;
  cuePaint?.();
}
function cueStop() {
  clearInterval(CUES.timer);
  CUES.on = false; CUES.key = null; CUES.timer = null;
  cuePaint?.();
  cuePaint = null;
}
function cueTick() {
  const now = Date.now();
  let moved = false;
  CUES.items.forEach(c => {
    if (c.state === 'work' && now >= c.done) {
      /* it looked, and sometimes there is nothing to find — which is an
         answer, and a more useful one than a guess */
      c.state = c.empty ? 'none' : 'ready'; moved = true;
    }
  });
  if (CUES.next && now >= CUES.next && CUES.i < CUE_SCRIPT.length) {
    const s = CUE_SCRIPT[CUES.i++];
    /* it arrives as a question and nothing more. Going and finding the
       answer is work, and work nobody asked for is the thing that makes
       an assistant exhausting — so the card waits to be sent. */
    CUES.items.push({ ...s, id: 'cue-' + CUES.i, state: 'asked', at0: now });
    /* the room asks on its own schedule. It used to be paced by how long
       the last lookup took, which made sense when a cue went looking the
       moment it landed and makes none now that it waits to be run. */
    CUES.next = CUES.i < CUE_SCRIPT.length ? now + 10000 : 0;
    moved = true;
  }
  cuePaint?.();
  hubTick?.();
  railTick?.();
  return moved;
}

/* what a cue turns into when you open it: the room's turn, then the
   answer, in the conversation that is already there. Several of them
   open as several turns of one conversation, in the order they were
   asked — which is the order you would have answered them. */
const cuePair = (c) => [
  /* your own turn, not a message from the room. Nobody else is in this
     conversation — the question came off the transcript, and running it
     is you asking it. A peer bubble made a one-person thread look like a
     shared one. */
  { role: 'user', text: c.q },
  c.state === 'work'
    ? { role: 'bot', text: 'Still looking \u2014 this one is taking a moment.',
        steps: c.steps.slice(0, 1), traceOpen: false }
    : { role: 'bot', text: [c.say, ...c.facts.map(f => '\u2022 ' + f)].join('\n\n'),
        steps: c.steps, traceOpen: false },
];

function cueOpen(list) {
  const items = [].concat(list);
  /* opening a cue is not the end of it: it stays in the feed, marked as
     answered, so the way back lands on something */
  items.forEach(c => { c.seen = true; });
  hubTick?.(); railTick?.();
  chatPanel(items[0].q, items.flatMap(cuePair),
    CUE_ME ? { key: CUE_ME.key, name: CUE_ME.name, cues: CUE_ME } : null);
  cuePaint?.();
}

/* ── a person, on the way past ─────────────────────────────────
   A name in a brief, in an invitation or on a caught question is a
   person, and the question you have about them is nearly always the same
   one: who is this, and what do I know about them. That is a hover away
   rather than a page away — and the page is still there behind a button
   for when the answer is longer than four lines. */
const PC_ = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const PC_MAIL = PC_('<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2"/>'
  + '<path d="m3.9 7 8.1 5.6L20.1 7"/>');
const PC_PERSON = PC_('<circle cx="12" cy="8.4" r="3.6"/>'
  + '<path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0"/>');
const PC_HOME = PC_('<path d="M4.4 20.2V8.6l7.6-4.4 7.6 4.4v11.6"/>'
  + '<path d="M9.6 20.2v-5.4h4.8v5.4"/>');
const PC_PIN = PC_('<path d="M12 20.6s6.4-5.1 6.4-10.1a6.4 6.4 0 1 0-12.8 0'
  + 'c0 5 6.4 10.1 6.4 10.1z"/><circle cx="12" cy="10.2" r="2.3"/>');
const PC_CLOCK = PC_('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3 1.8"/>');

let pcEl = null, pcFor = null, pcT = null, pcOver = false;

function pcHide(now) {
  clearTimeout(pcT); pcT = null;
  if (!pcEl) return;
  if (!now && (pcOver || pcEl.matches(':hover'))) return;
  pcEl.remove(); pcEl = null; pcFor = null;
}

function pcShow(el) {
  const name = el.getAttribute('data-person');
  if (!name || pcFor === el) return;
  pcHide(true);
  const p = pplOf(name);
  const mine = isMine(name);
  pcFor = el;

  /* the one line worth having before you decide to read the rest */
  /* an outside contact is written up under `who`, a colleague under
     `now` — either way the first line is the one that says who they are */
  const first = (...keys) => {
    for (const k of keys) {
      const v = p[k];
      if (Array.isArray(v) && v[0]) return v[0];
      if (typeof v === 'string' && v) return v;
    }
    return '';
  };
  /* written for the card rather than borrowed from the page: the first
     sentence of a write-up is the start of an argument, and what a card
     needs is the conclusion */
  const gist = p.card || (p.group
    ? first('what', 'now') || [p.team, p.size].filter(Boolean).join(' \u00b7 ')
    : first('who', 'now', 'rel', 'care'));

  /* how well you know them, said as a fact rather than as a score */
  const met = p.group ? null
    : p.met === 0 ? 'First time meeting them'
    : p.met === 1 ? 'Met once'
    : `Met ${p.met} times`;

  const mail = mailOf(name);
  /* the two or three facts you would otherwise open the page for, each
     with the same line mark the rest of the app uses */
  const fact = (mark, text) => text ? h('div', { class: 'pcard-f' },
    h('span', { class: 'pcard-f-ic', 'aria-hidden': 'true', html: mark }),
    h('span', { class: 'pcard-f-t' }, text)) : null;

  pcEl = h('div', { class: 'pcard' },
    h('div', { class: 'pcard-top' },
      faceEl(name, 'pcard-av'),
      h('div', { class: 'pcard-id' },
        h('div', { class: 'pcard-nameline' },
          h('span', { class: 'pcard-n' }, name),
          mine || p.group ? null : h('span', { class: 'pcard-tag' }, 'External')),
        h('p', { class: 'pcard-r' },
          p.group
            ? [p.team, p.size].filter(Boolean).join(' \u00b7 ')
            : [p.title, mine ? p.team : p.org].filter(Boolean).join(' \u00b7 ')))),

    gist ? h('p', { class: 'pcard-s', html: gist }) : null,

    h('div', { class: 'pcard-facts' },
      p.group ? null : fact(PC_MAIL, mail),
      /* a colleague has somebody they report to; somebody outside has a
         company, and that is the equivalent fact */
      mine && p.manager ? fact(PC_PERSON, p.manager)
        : !mine && p.org ? fact(PC_HOME, p.org) : null,
      fact(PC_PIN, p.loc || null),
      null),

    h('div', { class: 'pcard-acts' },
      p.group ? null : h('a', {
        class: 'pcard-b', href: `mailto:${mail}`,
        onclick: () => pcHide(true),
      },
        h('span', { class: 'pcard-b-ic', 'aria-hidden': 'true', html: PC_MAIL }),
        'Email'),
      h('button', {
        class: 'pcard-b pcard-b-main', type: 'button',
        onclick: () => { pcHide(true); personPanel(name, CUE_ME ? { meeting: CUE_ME } : null); },
      }, 'View details')));

  document.body.append(pcEl);
  const r = el.getBoundingClientRect();
  const w = pcEl.offsetWidth, hgt = pcEl.offsetHeight;
  pcEl.style.left = Math.round(Math.max(10,
    Math.min(r.left - 10, innerWidth - w - 10))) + 'px';
  /* under the name where there is room, over it where there is not */
  const under = r.bottom + hgt + 12 < innerHeight;
  pcEl.style.top = Math.round(under ? r.bottom + 7 : r.top - hgt - 7) + 'px';
  pcEl.addEventListener('pointerenter', () => { pcOver = true; });
  pcEl.addEventListener('pointerleave', () => { pcOver = false; pcHide(); });
  requestAnimationFrame(() => pcEl?.setAttribute('data-on', 'true'));
}

document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.('[data-person]');
  if (!el) return;
  if (el === pcFor) { clearTimeout(pcT); return; }
  clearTimeout(pcT);
  pcT = setTimeout(() => pcShow(el), 420);
});
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-person]');
  if (!el) return;
  clearTimeout(pcT);
  /* long enough to reach the card, short enough not to hang about */
  pcT = setTimeout(() => pcHide(), 220);
});
document.addEventListener('pointerdown', () => pcHide(true), true);
window.addEventListener('scroll', () => pcHide(true), true);

/* ── a meeting, shared ──────────────────────────────────────────
   Sharing a meeting is sharing a document: the same dialog, the same
   roles, the same link. What is different is what travels — the brief
   and the summary go, and the notes you wrote for yourself do not. The
   dialog says so rather than leaving people to find out. */
function meetShare(m) {
  const id = 'meet:' + m.key;
  if (!ARTIFACTS[id]) {
    ARTIFACTS[id] = {
      id, name: m.name, kind: 'chat',
      url: `app.unifyapps.com/meetings/${isoDay(m.start)}/${meetSlug(m)}`,
      shareNote: {
        yes: ['Brief', 'Transcript', 'AI Summary'],
        no: ['My Notes'],
      },
      /* the people on the invitation are who you would hand it to
         first, so they are what the field offers before anybody else */
      sharePeople: ATT(m).filter(a => !pplOf(a.name)?.group)
        .map(a => ({ name: a.name })),
      publish: {
        /* nobody, until you say so. Being on the invitation is not the
           same as being given the page — the notes, the brief and the
           write-up are yours until you hand them over. */
        people: [{ name: USER.name, role: 'owner' }],
        general: 'me', generalRole: 'view', published: false,
      },
    };
  }
  return ARTIFACTS[id];
}

/* ── who else is on this meeting ────────────────────────────────
   A meeting page is a room. Everyone who has it open is here, and what
   they are reading is worth knowing before you ask them about it. */
const MEET_DOING = ['is reading the brief', 'is on the transcript',
  'is writing notes', 'is on the summary'];
const meetLive = (m) => (meetShare(m).publish.people || [])
  .filter(p => p.name !== USER.name && !pplOf(p.name)?.group)
  .map((p, i) => ({ name: p.name, doing: MEET_DOING[i % MEET_DOING.length] }));

function livePanel(anchor, m) {
  const here = meetLive(m);
  if (!here.length) return toast('Nobody else has this open.');
  menu(anchor, here.map(p => ({
    label: p.name, more: p.doing,
    html: `<span class="live-av">${PHOTOS[p.name]
      ? `<img src="${PHOTOS[p.name]}" alt="">` : faceSvg(p.name)}</span>`,
    run: () => personPanel(p.name, { meeting: m }),
  })));
}

/* ── one pane, three things in it ─────────────────────────────
   Ask, the invitation, and the questions caught out of the room are
   three answers to "what else is on this meeting", and they were three
   separate ways in. Pressing X opens them as one pane with a deck of
   tabs across the head — centred, quiet, and the only thing added to a
   header that is otherwise the pane's own.

   Nothing is rebuilt to do it: each tab renders exactly the pane it
   already was, and the deck is dropped into whichever header came back.
   The old ways in still work and still open the single pane. */
/* ── the rail's three marks ──
   One family: the same 24 box, the same 1.7 stroke, the same round caps,
   nothing filled. A bubble for the conversation, a calendar for the
   invitation, and a bulb for the questions caught in the room — the star
   was a filled glyph among two drawn ones and read as a different set. */
const RAIL = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

const CHAT_IC = RAIL('<path d="M20.4 11.7c0 3.85-3.76 6.97-8.4 6.97-.94 0-1.85-.13-2.69-.36'
  + 'L4.4 19.9l1.48-3.36C4.5 15.28 3.6 13.6 3.6 11.7c0-3.85 3.76-6.97 8.4-6.97'
  + 's8.4 3.12 8.4 6.97z"/>');

const MEET_IC = RAIL('<rect x="3.8" y="5.2" width="16.4" height="14.6" rx="2.4"/>'
  + '<path d="M3.8 9.8h16.4M8.4 3.4v3.4M15.6 3.4v3.4"/>');

/* One star, drawn rather than filled, filling its box the way the bubble
   and the calendar fill theirs. The arcs-and-star version said more and
   showed less: at 16px the star under them vanished and what was left
   read as a wifi mark. This is the app's own AI glyph, and at this size
   the simplest thing that survives is the thing that communicates. */
const CUE_IC = RAIL('<path d="M12 4.2'
  + 'C13.67 9.94 14.06 10.33 19.8 12'
  + 'C14.06 13.67 13.67 14.06 12 19.8'
  + 'C10.33 14.06 9.94 13.67 4.2 12'
  + 'C9.94 10.33 10.33 9.94 12 4.2Z"/>');

/* what has already been put on the Do List from a summary */
const DO_ADDED = new Set();
/* and what has been ticked off */
const DO_DONE = new Set();

let briefLive = null;
let CUE_SORT = 'answers';
/* the count in the page's own corner, redrawn by the cue engine the way
   the one on the tab is */
let railTick = null;

const HUB = { tab: 'ask' };
/* the deck outlives whichever tab is showing, so the count on the Cues
   tab is redrawn by the cue engine rather than by the pane */
let hubTick = null;

/* Ask, with nothing asked yet: the conversation you had about this
   meeting if there is one, and an empty one if not — never a question
   put into your mouth. */
function hubAsk(m) {
  const past = (MEET_CHATS[m.key] || []).find(c => LIVE[c.id]);
  if (past) return chatPast(past.id, { key: m.key, name: m.name });
  const id = 'live-' + (++liveN);
  const t = { id, title: m.name, messages: [], live: true };
  LIVE[id] = t;
  (MEET_CHATS[m.key] = MEET_CHATS[m.key] || [])
    .unshift({ id, title: t.title, at: new Date() });
  chatPanel(null, 'past', { key: m.key, name: m.name }, t);
}

function hubPanel(m, tab) {
  HUB.tab = tab || HUB.tab || 'ask';
  const main = document.getElementById('main');
  if (HUB.tab !== 'cues') cuePaint = null;
  if (HUB.tab === 'meeting') detailPanel(m);
  /* opening the tab does not switch anything on: you press the button
     inside it. A feature that starts listening because you glanced at it
     is a feature people turn off for good. */
  else if (HUB.tab === 'cues') cuePanel(m);
  else hubAsk(m);
  if (main) main.dataset.hub = 'true';
  hubDeck(m);
}

/* the deck itself, dropped into whatever header the tab just rendered */
function hubDeck(m) {
  const top = document.querySelector('#artifactPanel .cp-top');
  if (!top) return;
  top.dataset.hub = 'true';
  /* the same tab the brief has: one weight across the row, the colour
     saying which one you are on, and one rule that travels under them */
  const ink = h('span', { class: 'br-ink hub-ink', 'aria-hidden': 'true' });
  const btns = [];
  const tab = (v, label) => {
    const b = h('button', {
      class: 'br-tab hub-t', type: 'button', role: 'tab',
      'aria-selected': String(HUB.tab === v),
      onclick: () => hubPanel(m, v),
    }, label);
    btns.push([v, b]);
    return b;
  };

  /* how many questions are standing, on the tab that holds them — the
     one thing you want to know while you are reading something else */
  const count = h('span', { class: 'hub-n', hidden: true });
  const cues = tab('cues', 'Cues');
  cues.append(count);
  hubTick = () => {
    const n = cueOn(m) ? cueLive().filter(c => !c.seen).length : 0;
    count.hidden = !n;
    count.textContent = n || '';
    moveInk();
  };

  const moveInk = () => {
    const b = (btns.find(x => x[0] === HUB.tab) || btns[0])[1];
    ink.style.setProperty('--x', b.offsetLeft + 'px');
    ink.style.setProperty('--w', b.offsetWidth + 'px');
  };
  /* first in the header rather than centred on it: the pane's own title
     is hidden here, so the deck is the head — and a deck that centres
     itself between a changing left and right never sits still */
  top.prepend(h('div', { class: 'hub', role: 'tablist' },
    tab('ask', 'Ask'), tab('meeting', 'Meeting'), cues, ink));
  hubTick();
  /* the rule cannot be placed until the row has been laid out, and the
     row is not always laid out by the next frame */
  requestAnimationFrame(moveInk);
  const deck = top.querySelector('.hub');
  if (deck && window.ResizeObserver) new ResizeObserver(moveInk).observe(deck);
  document.fonts?.ready.then(moveInk);
}

/* ── cues, as a pane of their own ─────────────────────────────
   The room asks something you cannot answer from memory. The cue is the
   question, caught and held: what kind of question it is, who asked it
   and when, and two ways out of it — put it down, or send it looking.

   It lives in the third pane rather than over the page, because the
   answer to a question asked in a room is a thing you read while the
   room carries on talking, and because a card that covers the page you
   are reading is a notification by another name. */
function cuePanel(m) {
  closeMenu();
  delete document.getElementById('main')?.dataset.hub;
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');

  const close = closeArtifact = () => {
    main.dataset.artifact = 'closed';
    delete main.dataset.pane;
    setTimeout(() => { if (main.dataset.artifact === 'closed') host.replaceChildren(); }, 260);
  };

  const feed = h('div', { class: 'cue-feed' });

  /* ── the anchor ──
     Three marks, and they say one thing: how the question lands. Up for
     a good sign, a dash for an ordinary one, an exclamation for a
     problem. A glyph per subject — a dollar for pricing, a shield for
     security — asked people to learn a vocabulary before they could read
     the feed, and half the subjects have no obvious picture anyway. */
  const MK = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  /* all three are bars: two crossed, one alone, one with a dot under it.
     An arrow was a different species of drawing sitting between them. */
  const CUE_MARK = {
    pos: MK('<path d="M12 7.4v9.2M7.4 12h9.2"/>'),
    neu: MK('<path d="M7.4 12h9.2"/>'),
    neg: MK('<path d="M12 6.4v7.2M12 17.4v.05"/>'),
  };

  const card = (c) => {
    const working = c.state === 'work';
    const empty = c.state === 'none';
    const ready = c.state === 'ready';

    const secs = h('span', { class: 'cue-secs' });

    const foot = h('div', { class: 'cue-foot' },
      /* putting a cue down does not throw it away — it is still in the
         record when the meeting is over */
      h('button', {
        class: 'cue-drop', type: 'button',
        onclick: () => { c.gone = true; paint(true); hubTick?.(); },
      }, 'Dismiss'),
      /* the button you pressed is the thing that is working: it stays
         where it is, its star turns into a spinner, and the word becomes
         the clock. Nothing else on the row moves. */
      working
        ? h('span', { class: 'cue-act is-work' },
            h('span', { class: 'cue-spin', 'aria-hidden': 'true' }), secs)
        : h('button', {
            class: 'cue-act', type: 'button',
            onclick: () => (c.state === 'asked' ? cueFind(c) : cueOpen(c)),
          },
            c.state === 'asked'
              ? [h('span', { class: 'cue-act-ic', 'aria-hidden': 'true', html: SPARK_ONE }),
                 'Run']
              /* one way on, whatever came back and whether or not you
                 have been there before: an empty answer is still an
                 answer, and the place to push on it is the chat */
              : 'Open in chat'));

    /* ── the card ──
       A mark, a message, and a line saying where it came from. The mark
       is the anchor: filled, coloured by whether the question is a
       problem, carrying the glyph for what it is about. Everything else
       is one column beside it. */
    const el = h('article', {
      'data-cue': c.id,
      class: 'cue-card'
        + (working ? ' is-work' : '') + (ready ? ' is-ready' : '') + (empty ? ' is-none' : '')
        + (c.seen ? ' is-done' : ''),
      'data-cat': c.tag.toLowerCase(),
      'data-tone': c.tone || 'flat',
    },
      h('span', { class: 'cue-mark', 'aria-hidden': 'true',
                  html: CUE_MARK[c.tone] || CUE_MARK.neu }),
      h('div', { class: 'cue-main' },
        /* who said it and when on the line above, the way every feed
           writes a post: one weight, one colour, the clock at the far
           end. Then the question itself. */
        h('div', { class: 'cue-meta' },
          h('span', { class: 'cue-who', 'data-person': c.who }, c.who),
          /* a tick and nothing else. The answer is sitting underneath in
             plain sight, so a green word in capitals beside the name was
             the row shouting about something you can already see. */
          ready ? h('span', { class: 'cue-done', title: 'Answered',
                              'aria-label': 'Answered', html: TICK_IC }) : null,
          h('span', { class: 'cue-when' }, c.at)),
        h('p', { class: 'cue-ask' }, `\u201c${c.q}\u201d`),
      /* while it is out looking the clock and the ring in the foot are
         the whole story — a row of logos above them was a second thing
         moving on a card that is meant to be waiting quietly */
      working ? null
        : ready || empty
          /* the answer, and only the answer: the sentence you would say
             out loud. The evidence under it and the systems it came from
             put three more sizes of type on a card whose whole job is to
             be read in a glance — both are a press away in the chat. */
          ? h('div', { class: 'cue-ans' },
              h('p', { class: 'cue-say' + (empty ? ' is-quiet' : '') }, c.say),
              /* the answer to "send us the report" is the report */
              c.file ? h('button', {
                class: 'cue-file', type: 'button',
                onclick: () => toast(`${c.file} is ready to send.`),
              },
                h('span', { class: 'cue-file-ic', 'aria-hidden': 'true',
                            html: MI(GLYPHS.files) }),
                c.file) : null)
          /* nothing before it runs: which systems hold the answer is
             something the lookup finds out, not something the card can
             promise in advance */
          : null,
        foot));

    /* the clock and the ring move every quarter second; the card does
       not — rebuilding it on every tick dropped the pointer mid-press */
    /* the only thing that moves is the clock; the sweep around the anchor
       is the stylesheet's, so nothing is redrawn to animate it */
    el.tick = () => {
      if (c.state !== 'work') return;
      const n = Math.max(0, Math.round((Date.now() - c.began) / 1000));
      secs.textContent = `0:${String(n).padStart(2, '0')}`;
    };
    el.tick();
    return el;
  };

  const SORTS = [
    ['answers', 'Answers first'],
    ['new', 'Newest first'],
    ['old', 'Oldest first'],
  ];
  const sortBtn = h('button', {
    class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-haspopup': 'menu',
    'data-tip': 'Sort', 'aria-label': 'Sort',
    html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
        + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round">'
        + '<path d="M4.5 7h15M6.8 12h10.4M9.6 17h4.8"/></svg>',
    onclick: (e) => {
      e.stopPropagation();
      menu(e.currentTarget, SORTS.map(([v, t]) => ({
        label: t, tick: CUE_SORT === v,
        run: () => { CUE_SORT = v; paint(true); },
      })));
    },
  });

  /* ── keeping the feed still ──
     Rebuilding the list on every tick meant every row re-entered every
     time one of them changed, which is why the whole pane looked like it
     was refreshing. The rows are kept and reused: only a row whose state
     actually changed is rebuilt, only a row that has never been here
     before animates in, and reordering moves the nodes rather than
     making new ones. */
  const nodes = new Map();
  const labels = {};
  let at = null, cards = [];

  const place = (kids) => {
    kids.forEach((el, k) => {
      if (feed.childNodes[k] !== el) feed.insertBefore(el, feed.childNodes[k] || null);
    });
    while (feed.childNodes.length > kids.length) feed.lastChild.remove();
  };

  /* ── moving without jumping ──
     A question arriving at the top pushes everything under it down, and
     an answered one changes group. Done by hand that is a jump: the DOM
     is in its new arrangement before the screen has drawn the old one.
     So the rows are measured before the change, put back where they were
     with a transform, and let go — the browser animates them from where
     they were to where they now are. */
  const flip = (before) => requestAnimationFrame(() => {
    feed.querySelectorAll('.cue-card').forEach(el => {
      const was = before.get(el.dataset.cue);
      if (was == null) return;
      const dy = was - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 360ms cubic-bezier(.22,.72,.2,1)';
        el.style.transform = '';
        el.addEventListener('transitionend', () => {
          el.style.transition = ''; el.style.transform = '';
        }, { once: true });
      });
    });
  });

  const paint = (force) => {
    const live = cueLive();
    /* Two groups, and the split is what you have done about them. An
       answer you asked for was sliding down the pane every time the room
       asked something new — so anything you have run holds the top, most
       recently run first, and what the room is still asking sits under
       it, newest first. */
    const mine = live.filter(c => c.state !== 'asked').sort((a, b) => b.ran - a.ran);
    const rest = live.filter(c => c.state === 'asked').reverse();
    const order = CUE_SORT === 'new' ? [...live].reverse()
      : CUE_SORT === 'old' ? [...live]
      : [...mine, ...rest];
    /* the empty pane says different things depending on whether anything
       is being transcribed, so what the recorder is doing is part of what
       the feed is showing */
    const sig = (order.map(c => c.id + ':' + c.state + (c.seen ? ':seen' : '')).join('|')
      || 'idle') + (recOn(m) ? ':rec' : '');
    if (sig === at && !force) return cards.forEach(el => el.tick?.());
    at = sig;

    if (!order.length) {
      cards = []; nodes.clear();
      /* Two empty pages, and the difference is whether it is on. Off, it
         says what the thing does and gives you the button. On, it says
         it is listening and there is nothing yet. */
      const on = cueOn(m);
      return feed.replaceChildren(h('div', { class: 'cue-wait' },
        h('span', { class: 'cue-wait-ic', 'aria-hidden': 'true', html: CUE_IC }),
        h('p', { class: 'cue-empty-t' },
          on ? 'Listening for questions' : 'Answers while you are in the meeting'),
        h('p', { class: 'cue-empty-s' },
          on
            ? 'Every question someone asks in the meeting shows up here.'
            : 'Every question someone asks in the meeting shows up here. Hit Run on '
              + 'one and it searches Slack, Drive, email and the web for the answer.'),
        on
          ? h('div', { class: 'cue-wait-l' },
              h('span', { class: 'cue-wait-dot', 'aria-hidden': 'true' }), 'Listening')
          : h('button', {
              class: 'cue-start', type: 'button',
              onclick: () => { cueStart(m.key); paint(true); hubTick?.(); railTick?.(); },
            },
              h('span', { class: 'cue-start-ic', 'aria-hidden': 'true', html: CUE_IC }),
              'Start')));
    }
    /* leaving the empty state behind */
    if (feed.querySelector('.cue-wait')) feed.replaceChildren();

    /* where every row is standing, before anything moves */
    const before = new Map();
    feed.querySelectorAll('.cue-card').forEach(el => {
      before.set(el.dataset.cue, el.getBoundingClientRect().top);
    });

    /* the row for each question: the one that is already here if nothing
       about it has changed, a fresh one if it has */
    cards = order.map(c => {
      const own = c.id + ':' + c.state + (c.seen ? ':seen' : '');
      const had = nodes.get(c.id);
      if (had && had.sig === own) return had.el;
      const el = card(c);
      if (!had) {
        /* only a question that has just been asked slides in */
        el.classList.add('is-new');
        el.addEventListener('animationend', () => el.classList.remove('is-new'),
          { once: true });
      }
      nodes.set(c.id, { sig: own, el });
      return el;
    });
    for (const id of [...nodes.keys()]) {
      if (!order.some(c => c.id === id)) nodes.delete(id);
    }

    /* the labels only appear once both halves exist — one heading over
       everything on the page names nothing */
    const label = (k, t) => (labels[k] = labels[k] || h('div', { class: 'cue-sect' }, t));
    const split = CUE_SORT === 'answers' && mine.length && rest.length;
    place([
      ...(split ? [label('a', 'Answers')] : []),
      ...cards.slice(0, mine.length),
      /* the ones nobody has run yet are just questions — "still asking"
         described the room rather than the list */
      ...(split ? [label('q', 'Questions')] : []),
      ...cards.slice(mine.length),
    ]);
    flip(before);
  };

  host.replaceChildren(h('div', { class: 'cp cue-pane' },
    h('header', { class: 'cp-top' },
      h('h2', { class: 'cp-h' }, 'Cues'),
      h('div', { class: 'cp-top-r' },
        sortBtn,
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button',
          'data-tip': 'Stop catching questions', 'aria-label': 'Stop catching questions',
          onclick: () => { cueStop(); close(); },
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        }))),
    feed));

  cuePaint = paint;
  paint(true);
  main.dataset.artifact = 'open';
  main.dataset.pane = 'person';
}

/* ── whose voice was that ─────────────────────────────────────
   A recording made by hand comes back diarised but anonymous: the
   machine can tell two voices apart and cannot tell you whose they are.
   Naming them is the one job, and everything here exists to make that
   job answerable from the transcript itself rather than from memory.

   Three things do the work. Each voice shows the lines it actually said,
   because you recognise a person by what they said and not by a number.
   The room is offered before the directory, because whoever was invited
   is who was probably talking. And the transcript is read for names —
   somebody saying "sounds good, David" is the strongest evidence in the
   file about who the other voice belongs to, so that is proposed with
   the line it came from, and you accept it or you do not.
*/
const MEET_SPK = {};
/* four voices, four colours — past that a recording is a broadcast */
const SPK_TINT = ['#B0803A', '#5B4CB0', '#2E7D5B', '#A85340'];

const spkName = (m, who) => (MEET_SPK[m.key] || {})[who] || who;
const isAnon  = (who) => /^Speaker \d+$/.test(who);

/* every anonymous voice in a record, in the order it first speaks */
const anonVoices = (rec) => {
  const out = [];
  for (const l of rec.transcript || []) {
    if (isAnon(l.who) && !out.includes(l.who)) out.push(l.who);
  }
  return out;
};
const stillAnon = (m, rec) =>
  anonVoices(rec).filter(v => !(MEET_SPK[m.key] || {})[v]);

/* three lines, in the order they were said — one is a sentence you might
   place on anybody, and three is a voice */
const refLines = (rec, who) => {
  const mine = (rec.transcript || []).filter(l => l.who === who);
  const keep = [...mine].sort((a, b) => b.text.length - a.text.length).slice(0, 3);
  return mine.filter(l => keep.includes(l));
};


/* ── the dialog ── */
function speakerDialog(m, rec, onDone) {
  const voices = anonVoices(rec);
  const picked = { ...(MEET_SPK[m.key] || {}) };

  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { closeMenu(); dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && !openMenu) close(); };

  const body = h('div', { class: 'spk-body' });
  const foot = h('div', { class: 'sh-foot-end' });

  /* the room first, then everybody else — whoever was invited is who was
     probably talking */
  const candidates = () => {
    const room = ATT(m).map(p => p.name);
    const rest = INVITE_BOOK().map(c => c.n).filter(n => !room.includes(n));
    return [
      ...room.map(n => ({ n, tag: 'On the invite' })),
      ...rest.map(n => ({ n, tag: '' })),
    ];
  };

  const openPicker = (v, field) => {
    closeMenu();
    const q = field.value.trim().toLowerCase();
    const taken = Object.entries(picked).filter(([k]) => k !== v).map(([, n]) => n);
    const hits = candidates()
      .filter(c => !taken.includes(c.n))
      .filter(c => !q || c.n.toLowerCase().includes(q))
      .slice(0, 7);

    const row = (c) => h('button', {
      class: 'menu-item spk-opt', type: 'button', role: 'menuitem',
      onclick: (ev) => { ev.stopPropagation(); closeMenu(); set(v, c.n); },
    },
      faceEl(c.n, 'spk-opt-av'),
      h('span', { class: 'spk-opt-m' },
        h('span', { class: 'spk-opt-n' }, c.n),
        h('span', { class: 'spk-opt-e' }, mailOf(c.n))),
      c.tag ? h('span', { class: 'spk-opt-t' }, c.tag) : null);

    /* a name that matches nobody is still a name — the list gets out of
       the way rather than telling you off */
    if (!hits.length) return;
    const el = h('div', { class: 'menu spk-menu', role: 'menu' }, ...hits.map(row));
    document.body.append(el);
    openMenu = el;
    /* the field's box, not the input inside it — hung off the input the
       list sat a padding's width in from the edge it belongs to */
    const r = (field.closest('.spk-field') || field).getBoundingClientRect();
    el.style.width = r.width + 'px';
    el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
    el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
      ? Math.max(12, r.top - el.offsetHeight - 6) : r.bottom + 6) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (ev) => ev.stopPropagation());
  };

  const set = (v, name) => { picked[v] = name; paint(); };
  const clear = (v) => { delete picked[v]; paint(); };

  function paint() {
    body.replaceChildren(
      ...voices.map((v) => {
        const name = picked[v];
        const field = h('input', {
          class: 'spk-in', type: 'text', value: name || '',
          placeholder: 'Name this voice',
          'aria-label': `Name for ${v}`,
          /* typing is the search — a button that opens the same list the
             field is already filtering was a second way to do one thing */
          oninput: (e) => {
            picked[v] = e.currentTarget.value; paintFoot();
            openPicker(v, e.currentTarget);
          },
          onfocus: (e) => openPicker(v, e.currentTarget),
          onkeydown: (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') closeMenu();
          },
        });
        return h('div', { class: 'spk-v', 'data-named': String(!!name) },
          h('div', { class: 'spk-v-h' },
            h('span', { class: 'spk-v-n' }, v),
            name ? h('button', { class: 'spk-clear', type: 'button',
                                 onclick: () => clear(v) }, 'Clear') : null),
          /* you recognise a person by what they said, not by a number */
          h('div', { class: 'spk-refs' },
            ...refLines(rec, v).map(l => h('p', { class: 'spk-ref' }, `“${l.text}”`))),
          h('div', { class: 'spk-field' }, field));
      }));
    paintFoot();
  }

  function paintFoot() {
    const n = voices.filter(v => (picked[v] || '').trim()).length;
    foot.replaceChildren(
      h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
      h('button', {
        class: 'btn btn--primary', type: 'button', disabled: !n || null,
        onclick: () => {
          const map = { ...(MEET_SPK[m.key] || {}) };
          for (const v of voices) {
            const nm = (picked[v] || '').trim();
            if (nm) map[v] = nm; else delete map[v];
          }
          MEET_SPK[m.key] = map;
          close();
          /* the names appearing in the transcript is the confirmation */
          onDone();
        },
      }, 'Relabel transcript'));
  }
  paint();

  dim.append(h('div', { class: 'sh-card spk-card', role: 'dialog', 'aria-modal': 'true' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' }, 'Whose voice was that?'),
        h('p', { class: 'sh-of' },
          'Name each one and the transcript relabels itself.')),
      h('button', {
        class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
        onclick: close,
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
            + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
      })),
    body,
    h('footer', { class: 'sh-foot spk-foot' }, foot)));

  document.body.append(dim);
  document.addEventListener('keydown', onKey);
}

/* ── the meeting page on its own ──
   The desktop shell runs this one page in a narrow window beside a call.
   It is the same view the app uses; what changes is that the workspace
   around it is not there — no rail, no room for one. */
let MEET_OPEN = null;
/* ── one address per feature ───────────────────────────────────
   Everything worth demonstrating is behind a keypress or a menu, which
   is fine to use and impossible to link to. This turns each of them
   into the tail of a meeting's address, so a link can land on the thing
   itself: #meeting/<name>::<tab>::<what>. */
let MEET_SHOW = null;

function meetShow(m, what) {
  const [act, arg] = what.split('=');
  if (act === 'cues') { cueStart(m.key); return hubPanel(m, 'cues'); }
  if (act === 'ask') return hubPanel(m, 'ask');
  if (act === 'details') return hubPanel(m, 'meeting');
  if (act === 'person') return personPanel(decodeURIComponent(arg || ATT(m)[0]?.name || ''),
                                           { meeting: m });
  if (act === 'invite') return publishDialog(meetShare(m), () => {});
  /* the dialog is built from the page's own transcript, so it is opened
     the way a person opens it: through the control that already does */
  if (act === 'speakers') {
    const el = document.querySelector('.br-name')
      || document.querySelector('.br-line-nm');
    return el?.click();
  }
  if (act === 'live') {
    const el = document.querySelector('.br-live') || document.querySelector('.br-share');
    return el && livePanel(el, m);
  }
  /* the dock's own control, so the link starts a recording the way the
     button does rather than reaching past it */
  if (act === 'record') return document.querySelector('.br-dock .rec-pill')?.click();
  if (act === 'project') {
    const el = document.querySelector('.br-dots');
    return el && projectMenu(el, m);
  }
}

function openMeetingPanel(key, tab) {
  MEET_OPEN = { key, name: key, tab: tab || null };
  document.body.dataset.bare = 'true';
  go('meetings');
}
/* #brief/<key> is the address of it, so the shell can point an iframe at
   a meeting rather than reach into the app to set one. */
/* The shell hands the whole app a question that was typed in the panel,
   so the answer lands where there is room for it. */
addEventListener('message', (e) => {
  const d = e.data;
  /* the floating recorder is a control, not a readout */
  if (d && d.unify === 'recDo') {
    if (d.act === 'stop') recStop();
    else if (d.act === 'hold') recHold();
    else if (d.act === 'resume') recResume();
    recPaint?.();
    return;
  }
  if (!d || d.unify !== 'askMeeting' || !d.ask) return;
  delete document.body.dataset.bare;
  MEET_OPEN = { key: d.meeting, name: d.meeting, tab: null, ask: d.ask };
  go('meetings');
});

function briefRoute(hash) {
  const m = /^(brief|meeting)\/(.+)$/.exec(hash);
  if (!m) return false;
  /* <name>::<tab>::<what to open on it> — a link can land on the brief,
     or on the brief with the cues running, or on the person, or on the
     invite dialog. One address per thing worth showing somebody. */
  const [key, tab, act] = decodeURIComponent(m[2]).split('::');
  MEET_SHOW = act || null;
  /* #brief/ is the panel — one page, no workspace. #meeting/ is the same
     page in the whole app, which is what the panel grows into: the
     shell puts this one behind the panel so the two are showing the same
     thing before either of them moves. */
  if (m[1] === 'brief') return openMeetingPanel(key, tab), true;
  delete document.body.dataset.bare;
  MEET_OPEN = { key, name: key, tab: tab || null };
  go('meetings');
  return true;
}

function meetingsView({ empty = false } = {}) {
  let day = midnight(new Date());
  /* connected here means connected for this session — the empty page is
     a place you can go back to, not a state you fall out of. Arriving
     here starts setting up from the top: the calendar you connected last
     time is not connected on a page whose whole point is that nothing
     is. */
  if (empty) { SETUP.cal = null; SETUP.got = null; SETUP.on = {}; SETUP.step = 0; }
  let bare = empty;
  const list = h('div', { class: 'mt-list' });
  const label = h('button', {
    class: 'mt-date', type: 'button', 'aria-haspopup': 'dialog',
    onclick: (e) => { e.stopPropagation(); openCal(e.currentTarget); },
  });

  const step = (n) => { day = new Date(+day + n * DAY_MS); paint(); };

  const CHEV = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + (d < 0 ? '<path d="M14.5 5.5L8 12l6.5 6.5"/>' : '<path d="M9.5 5.5L16 12l-6.5 6.5"/>')
    + '</svg>';
  const arrow = (d, name) => h('button', {
    class: 'mt-arrow', type: 'button', 'aria-label': name, title: name,
    html: CHEV(d), onclick: () => step(d),
  });

  const back = h('button', {
    class: 'mt-today', type: 'button',
    onclick: () => { day = midnight(new Date()); paint(); },
  }, 'Today');

  /* ── the month, one step away ── */
  function openCal(anchor) {
    closeMenu();
    let cur = new Date(day.getFullYear(), day.getMonth(), 1);
    const grid = h('div', { class: 'cal-grid' });
    const head = h('div', { class: 'cal-head' });

    const foot = h('div', { class: 'cal-foot' });

    const paintCal = () => {
      const step = (n) => (e) => {
        e.stopPropagation();
        cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1);
        paintCal();
      };
      head.replaceChildren(
        h('button', { class: 'cal-arrow', type: 'button', 'aria-label': 'Previous month',
                      html: CHEV(-1), onclick: step(-1) }),
        h('span', { class: 'cal-month' },
          h('span', { class: 'cal-mn' }, MONTHS[cur.getMonth()]),
          h('span', { class: 'cal-yr' }, String(cur.getFullYear()))),
        h('button', { class: 'cal-arrow', type: 'button', 'aria-label': 'Next month',
                      html: CHEV(1), onclick: step(1) }));

      /* Saturday and Sunday are set back — most of what this picker is
         for happens on the other five, and the shape of the week is
         easier to read when its ends are quieter */
      const cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        .map((x, i) => h('span', { class: 'cal-dow', 'data-off': String(i > 4) }, x));
      /* weeks start on Monday, which is what a working calendar does */
      const lead = (cur.getDay() + 6) % 7;
      for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cal-pad' }));
      const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      for (let n = 1; n <= last; n++) {
        const d = new Date(cur.getFullYear(), cur.getMonth(), n);
        cells.push(h('button', {
          class: 'cal-day', type: 'button',
          'data-on': String(+d === +day),
          'data-today': String(dayOffset(d) === 0),
          'data-off': String((d.getDay() + 6) % 7 > 4),
          /* a dot where there is something to come to, so picking a date
             is not a guess */
          'data-has': String(hasMeetings(d)),
          onclick: () => { closeMenu(); day = d; paint(); },
          /* the count follows the pointer, so you can read the month
             before committing to a day in it */
          onpointerenter: () => paintFoot(d),
          onpointerleave: () => paintFoot(day),
        }, String(n)));
      }
      grid.replaceChildren(...cells);
      paintFoot(day);
    };

    /* what is actually on the day under the pointer — a picker that only
       says which square is selected makes you pick to find out */
    const paintFoot = (d) => {
      const n = meetingsOn(d).length;
      foot.replaceChildren(
        h('button', { class: 'cal-today', type: 'button',
          onclick: () => { closeMenu(); day = midnight(new Date()); paint(); } }, 'Today'),
        h('span', { class: 'cal-count' },
          `${dayLabel(d)} \u00b7 ${n ? `${n} meeting${n === 1 ? '' : 's'}` : 'nothing on'}`));
    };

    const el = h('div', { class: 'menu cal' }, head, grid, foot);
    paintCal();
    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = (r.bottom + 8) + 'px';
    /* under the middle of the date, which is itself the middle of the
       page — hung off its left edge it sat noticeably off-centre */
    const mid = r.left + r.width / 2 - el.offsetWidth / 2;
    el.style.left = Math.max(12, Math.min(mid, innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  }

  /* ── a meeting ── */
  const row = (m, now, next) => {
    const past = +m.end <= now;
    const live = +m.start <= now && now < +m.end;
    const soon = !past && !live && (+m.start - now) <= BRIEF_WINDOW;
    const rsvp = m.rsvp || 'yes';
    const el = h('div', {
      class: 'mt-row',
      'data-state': past ? 'past' : live ? 'live' : 'ahead',
      'data-rsvp': rsvp,
      /* the one you are in, or the one you are about to be in. It is the
         only row on the page anybody is looking for. */
      'data-next': next ? 'true' : null,
      /* the row takes a pointer, so the row has to do something — a hand
         over dead space is a promise the page does not keep */
      onclick: () => openBrief(m),
    },
      /* Whether you said you would be there, as one dot at the head of
         the row. Accepted is filled, an unanswered invitation is the
         same circle left open, and a declined one is grey — three states
         of one shape rather than three different marks. */
      h('span', { class: 'mt-dot', 'aria-hidden': 'true', title: RSVP[rsvp].label }),
      h('span', { class: 'mt-when' },
        h('span', { class: 'mt-time' }, hhmm(m.start)),
        h('span', { class: 'mt-dur' }, DURATION(m))),
      h('span', { class: 'mt-main' },
        /* the live mark belongs to the meeting, so it sits with its name
           rather than at the far end of the row with the actions */
        h('span', { class: 'mt-nameline' },
          h('span', { class: 'mt-name' }, m.name),
          /* a meeting being recorded says so here too: the list is where
             you notice a recording you left running */
          /* the same green wave the transcript tab carries, so a
             recording looks like one recording wherever you see it */
          recOn(m) ? h('span', { class: 'mt-rec', 'data-paused': String(REC.paused) },
              h('span', { class: 'rec-eq', 'data-on': 'true',
                          'data-paused': String(REC.paused), 'aria-hidden': 'true' },
                ...[0, 1, 2].map(i => h('i', { style: `--i:${i}` }))),
              REC.paused ? 'Paused' : 'Recording')
            : live ? h('span', { class: 'mt-live' }, 'Now') : null),
        /* the room, and the way into everything the invitation holds */
        h('button', { class: 'mt-who', type: 'button',
          title: 'Who is coming',
          onclick: (e) => { e.stopPropagation(); meetingCard(e.currentTarget, m, paint); },
        }, roomOf(m.who))),
      /* ── what else you can do to a row ──
         Under the pointer, in the same pill the buttons beside it take:
         the things that are true of every meeting, where a second and
         third button on every row would be a toolbar down the day. */
      h('button', {
        class: 'mt-dots', type: 'button', 'aria-haspopup': 'menu',
        title: 'More', 'aria-label': `More for ${m.name}`,
        html: MI(GLYPHS.dots),
        onclick: (e) => {
          e.stopPropagation();
          const dots = e.currentTarget;
          const plat = !m.place && !m.adhoc && PLATFORM[m.via || 'teams'];
          const link = plat && plat.link(meetSlug(m));
          menu(e.currentTarget, [
            { label: 'Meeting details', icon: 'calendar',
              run: () => detailPanel(m) },
            { label: 'Edit meeting', icon: 'rename', run: () => meetingPanel(m) },
            projectItem(m, () => dots),
            link ? { label: `Copy ${plat.label} link`, icon: 'copy',
              run: () => copyLink('https://' + link) } : null,
            { rule: true },
            { label: 'Delete meeting', icon: 'trash', danger: true,
              run: () => {
                const room = ATT(m).length;
                const drop = () => { editOf(m.key).deleted = true; paint(); };
                if (!room) return drop();
                updateDialog(room + 1, {
                  title: 'Cancel this meeting and tell the people invited?',
                  ask: 'Add a note about the cancellation (optional)',
                  onSend: drop, onQuiet: drop, onBack: () => {},
                });
              } },
          ]);
        },
      }),
      /* On the one row where joining is the thing you are about to do.
         A join button on every meeting in the day is seven buttons for
         one act. */
      /* nothing to join on a meeting nobody sent an invitation for */
      (!past && !m.place && !m.adhoc) ? h('button', {
        class: 'mt-join' + (next ? '' : ' mt-join-hov'), type: 'button',
        /* the mark alone. Nobody reads "Join" off a calendar row — they
           look for the product they are about to be in, and the word
           cost a whole button's width to say what the mark says */
        'data-tip': PLATFORM[m.via || 'teams'].join,
        'aria-label': PLATFORM[m.via || 'teams'].join,
        onclick: (e) => {
          e.stopPropagation();
          toast(`Joining opens ${PLATFORM[m.via || 'teams'].label} in the next pass.`);
        },
      },
        h('span', { class: 'mt-join-ic', 'aria-hidden': 'true',
                    html: `<svg viewBox="0 0 24 24"><use href="#b-${m.via || 'teams'}"></use></svg>` })) : null,
      /* Everything opens; only the window offers a prepared brief. What
         is behind you has a record rather than a preparation, and what
         is further ahead has neither yet — both wait for the pointer,
         since a column of View buttons down the day is a column of
         nothing anybody is looking for. */
      (m.adhoc || (!live && !soon)) ? h('button', {
        class: 'mt-view', type: 'button',
        onclick: (e) => { e.stopPropagation(); openBrief(m, past ? 'summary' : 'brief'); },
      },
        /* the star only where something was written for you: a summary
           is the assistant's, and View is just the way back into a page */
        past ? h('span', { class: 'mt-brief-ic', 'aria-hidden': 'true', html: SPARK_ONE })
             : null,
        past ? 'Summary' : 'View') : null,
      /* Only inside the window. A brief prepared on Monday for a Thursday
         call is out of date by Thursday, and offering one on every row
         makes the rows that matter invisible. */
      (!m.adhoc && (live || soon)) ? h('button', {
        class: 'mt-brief', type: 'button',
        onclick: (e) => { e.stopPropagation(); openBrief(m); },
      },
        /* the same star the summary carries: what is in here was written
           for you rather than typed by anybody */
        h('span', { class: 'mt-brief-ic', 'aria-hidden': 'true', html: SPARK_ONE }),
        'Brief') : null);
    return el;
  };

  /* the brief is a page of its own, not a panel — it is the thing you
     came to read, and the list has nothing left to say while you read it */
  let showing = null, showTab = null;
  /* Opened from outside — the desktop shell puts this page in a panel of
     its own beside a call, so it has to be able to say which meeting and
     land on it rather than on the list. */
  if (MEET_OPEN) {
    const want = MEET_OPEN;
    MEET_OPEN = null;
    const all = [...meetingsOn(new Date()), ...meetingsOn(new Date(Date.now() + DAY_MS))];
    showing = all.find(x => x.key === want.key || x.name === want.name) || null;
    if (showing) showTab = want.tab || null;
    /* a question that was asked in the panel, answered here */
    if (showing && want.ask) setTimeout(() => chatPanel(want.ask), 60);
    /* whatever the link asked to see, once the page under it exists */
    if (showing && MEET_SHOW) {
      const m = showing, what = MEET_SHOW;
      MEET_SHOW = null;
      setTimeout(() => meetShow(m, what), 80);
    }
  }
  /* a meeting that is being recorded opens where the recording is
     landing: the transcript, and not the page you last had open */
  const openBrief = (m, t) => {
    showing = m; showTab = recOn(m) ? 'transcript' : (t || null); paint();
  };
  const toList = () => { showing = null; paint(); };

  /* ── the brief ──
     What it is, when, who is in it — the same line the list carries and
     the same popover behind the names. Then the two things there are to
     read before a call: what was prepared, and what you wrote. */
  function briefPage(m, start) {
    const b = MEET_BRIEF[m.name];
    const rec = MEET_RECAP[m.name];
    /* A meeting that has happened has two more things to show, and they
       are the two you actually open it for. */
    const done = +m.end <= Date.now();
    /* prepared, or asked for early */
    const ready = () => done || soonEnough(m) || !!MEET_MADE[m.key];
    let tab = start || (done ? 'summary' : 'brief');
    curTab = tab;
    const body = h('div', { class: 'br-body' });

    const notes = h('div', {
      class: 'br-notes', contenteditable: 'true', spellcheck: 'false',
      'data-empty': 'Write notes, or press / to start with a template',
      oninput: () => { MEET_NOTES[m.key] = notes.innerHTML; slashCheck(); syncTell(); },
      onkeydown: (e) => { if (e.key === 'Escape') closeMenu(); },
      /* a checklist you cannot tick is a bulleted list with square bullets */
      onclick: (e) => {
        const li = e.target.closest?.('.br-ntodo li');
        if (!li) return;
        if (e.offsetX > 20) return;          // the box, not the words
        li.dataset.on = li.dataset.on === 'true' ? 'false' : 'true';
        MEET_NOTES[m.key] = notes.innerHTML;
      },
    });
    notes.innerHTML = MEET_NOTES[m.key] || '';

    /* ── what / offers ──
       Only on an otherwise empty line, because a slash mid-sentence is a
       slash. */
    const insert = (html) => {
      const sel = getSelection();
      const r = sel.rangeCount ? sel.getRangeAt(0) : null;
      /* take the slash back out before putting anything in its place */
      if (r && r.startContainer.nodeType === 3) {
        const t = r.startContainer, i = r.startOffset;
        if (t.textContent.slice(i - 1, i) === '/') {
          t.deleteData(i - 1, 1);
          r.setStart(t, i - 1); r.collapse(true);
        }
      }
      document.execCommand('insertHTML', false, html);
      MEET_NOTES[m.key] = notes.innerHTML;
      notes.focus();
    };

    const slashMenu = () => {
      closeMenu();
      const row = (ic, label, run) => h('button', {
        class: 'menu-item note-item', type: 'button', role: 'menuitem',
        onclick: () => { closeMenu(); run(); },
      },
        h('span', { class: 'note-ic', 'aria-hidden': 'true', html: ic }),
        h('span', { class: 'menu-label' }, label));

      const el = h('div', { class: 'menu note-menu', role: 'menu' },
        ...NOTE_BLOCK.map(b => row(b.ic, b.name, () => insert(b.html))),
        h('div', { class: 'note-head' }, 'Templates'),
        ...quickTpl().map(t => row(t.ic, t.name, () => insert(tplHtml(t)))),
        h('div', { class: 'menu-rule' }),
        row(NOTE_IC.all, 'View all', () => templateDialog(t => insert(tplHtml(t)))));

      document.body.append(el);
      openMenu = el;
      const sel = getSelection();
      const r = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
      const x = r && r.width + r.height ? r.left : notes.getBoundingClientRect().left;
      const y = r && r.width + r.height ? r.bottom : notes.getBoundingClientRect().top;
      const hgt = el.offsetHeight;
      el.style.left = Math.max(12, Math.min(x, innerWidth - el.offsetWidth - 12)) + 'px';
      el.style.top = (y + hgt + 14 > innerHeight ? Math.max(12, y - hgt - 22) : y + 6) + 'px';
      el.classList.add('opening');
      el.addEventListener('click', (e) => e.stopPropagation());
    };

    const slashCheck = () => {
      const sel = getSelection();
      if (!sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      const t = r.startContainer;
      if (t.nodeType !== 3) return closeMenu();
      const before = t.textContent.slice(0, r.startOffset);
      if (before === '/') slashMenu(); else closeMenu();
    };

    /* the brief and the summary are the same shape — an opening line and
       named lists — because they answer the same question at two ends of
       a meeting */
    /* nothing to say is better said with nothing */
    /* ── what was got ready for you ──
       The half hour before a call is spent finding three files and
       writing one page. Both of those are done by the time you open
       this, so the brief says where they are: the files with the mark of
       the system they came from, and the drafts, which open in the
       canvas on the right the way anything else written for you does. */
    const prepRow = (o) => h('button', {
      class: 'prep-row', type: 'button', onclick: o.run,
    },
      h('span', { class: 'prep-ic', 'aria-hidden': 'true', html: o.mark }),
      h('span', { class: 'prep-m' },
        h('span', { class: 'prep-n' }, o.name,
          o.tag ? h('span', { class: 'prep-tag' }, o.tag) : null),
        h('span', { class: 'prep-w' }, o.why)),
      h('span', { class: 'prep-go', 'aria-hidden': 'true',
                  html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                      + 'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
                      + '<path d="M9 6l6 6-6 6"/></svg>' }));

    const prepSection = (p) => p ? h('section', { class: 'br-sect br-prep' },
      h('h3', { class: 'br-h' }, 'Prepared for you'),
      h('div', { class: 'prep-list' },
        ...(p.made || []).map(([n, why]) => {
          const a = prepDoc(n);
          if (!a) return null;
          return prepRow({
            name: n, why,
            mark: kindMark(a.kind),
            /* opened the way the Do List opens what it wrote: the canvas
               on the right, with the page it came from still beside it */
            run: () => openArtifact(a),
          });
        }).filter(Boolean))) : null;

    /* ── what somebody has to do about it ──
       The last section of a summary is the only part of it that is not
       a record: every line is work, and the thing you want to do with
       work is put it somewhere you will see it again. So each line keeps
       a way onto the Do List, on the right, under the pointer — and the
       section is set as the rest of the document is, because a list of
       controls at the foot of a page you are reading is a form. */
    const actSection = (acts) => acts && acts.length
      ? h('section', { class: 'br-sect br-acts' },
          h('h3', { class: 'br-h' }, 'Suggested Do Lists'),
          h('ul', { class: 'br-list' }, acts.map(a => {
            const li = h('li', {
              class: 'br-act',
              /* the page is rebuilt whenever the tab or the recording
                 changes, so what you put on the list has to be remembered
                 somewhere other than the row */
              'data-added': DO_ADDED.has(a.t) ? 'true' : null,
              'data-done': DO_DONE.has(a.t) ? 'true' : null,
            },
              /* a box to tick, because that is what these are. The line
                 under each one said when and whose, which is three more
                 words than a list of things to do can carry and still be
                 scanned. */
              h('button', {
                class: 'br-act-box', type: 'button',
                'aria-label': `Done: ${a.t}`,
                onclick: () => {
                  if (DO_DONE.has(a.t)) DO_DONE.delete(a.t); else DO_DONE.add(a.t);
                  li.dataset.done = DO_DONE.has(a.t) ? 'true' : null;
                },
                html: TICK_IC,
              }),
              h('span', { class: 'br-act-m' },
                h('span', { class: 'br-act-t' }, a.t)),
              h('button', {
                class: 'br-act-go', type: 'button',
                onclick: () => {
                  DO_ADDED.add(a.t);
                  li.dataset.added = 'true';
                  toast('Added to your Do List.');
                },
              },
                h('span', { class: 'br-act-ic', 'aria-hidden': 'true', html: PLUS_IC }),
                h('span', { class: 'br-act-w' }, 'Add to Do List')));
            return li;
          })))
      : null;

    const readable = (d) => d
      ? [h('p', { class: 'br-why' }, d.why),
         prepSection(d.prep),
         ...d.blocks.map(x => h('section', { class: 'br-sect' },
           h('h3', { class: 'br-h' }, x.h),
           h('ul', { class: 'br-list' }, x.li.map(t => h('li', {}, t)))),
         ),
        ].filter(Boolean)
      : [];

    /* When it was made, and the way to have it made again. Only above the
       two things that were generated — a transcript is a record and your
       notes are yours. */
    /* Both things this page generates are written in the shape of the
       meeting they are about, so both offer the same five templates the
       slash menu does — one taxonomy, used everywhere. */
    const askOpts = () => ({
      templates: allTpl(),
      label: 'What do you want to change?',
      ask: tab === 'summary'
        ? 'Shorter, more on what was committed, split by person\u2026'
        : 'What to lead with, a question you expect, something that changed\u2026',
    });

    /* As text, not as markup — it is going into a message, and a heading
       and a dash are what a heading and a bullet look like there. An
       edited summary copies what is on the screen rather than what was
       generated. */
    const asText = (d) => [
      d.why, '',
      ...d.blocks.flatMap(b => [b.h, ...b.li.map(x => '- ' + x), '']),
      ...(d.acts?.length
        ? ['Suggested Do Lists', ...d.acts.map(a => '- ' + a.t)]
        : []),
    ].join('\n').trim();

    const copyOut = (what) => {
      const head = `${m.name}\n${dayLabel(m.start)} \u00b7 ${hhmm(m.start)} `
                 + `\u2013 ${hhmm(m.end)}\n\n`;
      const edited = tab === 'summary' && body.querySelector('.br-edit');
      const d = tab === 'summary' ? (rec && rec.summary) : b;
      const text = edited ? edited.innerText.trim() : (d ? asText(d) : '');
      if (!text) return toast('Nothing to copy yet.');
      navigator.clipboard?.writeText(head + text).then(
        () => toast(`${what[0].toUpperCase()}${what.slice(1)} copied.`),
        () => toast('Could not reach the clipboard.'));
    };

    /* roughly two hundred words a minute, which is what everybody uses */
    const readMins = (d) => {
      if (!d) return 1;
      const words = [d.why, ...d.blocks.flatMap(b => [b.h, ...b.li])]
        .join(' ').split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.round(words / 200));
    };

    const genLine = (what, busy) => {
      const g = genOf(m, tab);
      const d = g.at;
      const when = `${dayLabel(d)} at ${hhmm(d)}`;
      /* A summary is read, not consulted — when it was written matters
         less than how long it will take, which is the question somebody
         opening it actually has. */
      const n = readMins(rec && rec.summary);
      /* The strip carries the wait. It is already the line that says what
         state this page is in, and a spinner in the middle of an empty
         column said the same thing louder. */
      /* the summary's strip takes the same star the button that asks for
         it takes; a clock belongs on the things that are timed */
      const strip = what === 'summary' || tab === 'summary' ? SPARK_ONE : CLOCK_IC;
      if (busy) return h('div', { class: 'br-gen', 'data-busy': 'true' },
        h('span', { class: 'br-gen-ic', 'aria-hidden': 'true', html: strip }),
        h('span', { class: 'br-gen-m' }, `Generating the ${what}\u2026`));
      return h('div', { class: 'br-gen' },
        h('span', { class: 'br-gen-ic', 'aria-hidden': 'true', html: strip }),
        h('span', { class: 'br-gen-m' },
          tab === 'summary'
            ? `${n} min read`
            : `Generated ${when.toLowerCase().startsWith('today')
                ? when.replace('Today', 'today') : 'on ' + when}`,
          ),
        /* copying is the other thing you do with a brief — you read it,
           or you send it to somebody who was not going to */
        h('button', {
          class: 'br-gen-cp', type: 'button',
          title: `Copy the ${what}`, 'aria-label': `Copy the ${what}`,
          html: MI(GLYPHS.copy),
          onclick: () => copyOut(what),
        }),
        h('button', { class: 'br-gen-go', type: 'button',
          onclick: () => regenDialog(what, (note) => regen(what, note), askOpts()),
        }, 'Regenerate'));
    };

    /* The wait is the point: it is being rebuilt, and a page that swapped
       silently would look like nothing had happened. */
    let waiting = false;
    regen = (what, note) => {
      waiting = true; paintBody();
      setTimeout(() => {
        const g = genOf(m, tab);
        g.at = new Date(); g.note = note || null;
        /* a new one replaces what was there, edits included */
        if (tab === 'summary') delete MEET_SUM[m.key];
        /* no notification: the strip above the page already said it was
           being written, and the thing itself arriving says it is done */
        waiting = false; paintBody();
      /* long enough to read as work being done — two seconds looked like
         a page swapping rather than a thing being written */
      }, 7600);
    };

    const paintBody = () => {
      if (tab === 'notes') return body.replaceChildren(notes);
      if (tab === 'summary') {
        /* a summary of a recording this page made itself, when the
           meeting did not arrive with one */
        const sum = (rec && rec.summary) || (REC_DONE[m.key] ? REC_SUM : null);
        /* ── nothing to summarise yet ──
           While the room is still talking there is no summary and no
           point offering to rewrite one: the strip said "1 min read" over
           an empty column, which is the page claiming something it has
           not got. It says what will happen instead, and when. */
        if (!sum && recOn(m)) return body.replaceChildren(
          h('div', { class: 'br-gen br-gen-wait' },
            h('span', { class: 'br-gen-ic', 'aria-hidden': 'true', html: SPARK_ONE }),
            h('span', { class: 'br-gen-m' },
              REC.paused ? 'The summary is written when you finish recording'
                : 'Still listening \u2014 the summary is written when you stop')));
        /* the ghost under the strip is the version being replaced. The
           first time there is no version being replaced, so there is
           nothing to ghost — showing the answer greyed out while it is
           still being written is a spoiler, not a preview. */
        const had = !!(rec && rec.summary) || !!MEET_SUM[m.key];
        if (waiting) return body.replaceChildren(...[
          genLine('summary', true),
          had ? h('div', { class: 'br-fade' }, ...readable(sum)) : null,
        ].filter(Boolean));
        const made = h('div', {});
        made.replaceChildren(...readable(sum, null));
        const edit = h('div', {
          class: 'br-edit', contenteditable: 'true', spellcheck: 'false',
          oninput: () => { MEET_SUM[m.key] = edit.innerHTML; },
        });
        edit.innerHTML = MEET_SUM[m.key] || made.innerHTML;
        /* the action items stay out of the editable body: it is written
           to innerHTML and read back, which is fine for prose and fatal
           for a button — the handler does not survive the round trip */
        return body.replaceChildren(genLine('summary'), edit, actSection(sum?.acts));
      }
      if (tab === 'transcript') {
        if (!hasScript())
          return body.replaceChildren(h('p', { class: 'br-none' }, 'No recording of this one.'));

        /* ── finding a line in a record you did not write ──
           A transcript is the one page nobody reads top to bottom, so the
           mark opens into a field where it stood rather than pushing a
           bar onto the page: same strip, same height, nothing moves. */
        const scriptEl = h('div', { class: 'br-script' });
        let hits = [], at = 0, q = '';

        const count = h('span', { class: 'sr-n' });
        const prev = h('button', { class: 'sr-b', type: 'button', 'aria-label': 'Previous match',
                                   html: CHEV_UP });
        const next = h('button', { class: 'sr-b', type: 'button', 'aria-label': 'Next match',
                                   html: CHEV_DN });
        const shut = h('button', { class: 'sr-b sr-x', type: 'button', 'aria-label': 'Close search',
                                   html: '×' });
        const field = h('input', {
          class: 'sr-in', type: 'text', placeholder: 'Search transcript…',
          'aria-label': 'Search transcript', spellcheck: 'false',
          oninput: (e) => { q = e.currentTarget.value; at = 0; paintScript(); },
          onkeydown: (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') return closeSearch();
            if (e.key !== 'Enter') return;
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          },
        });
        const bar = h('div', { class: 'sr', 'data-open': 'false', 'data-hits': '0' },
          h('button', { class: 'sr-go', type: 'button', 'aria-label': 'Search the transcript',
                        html: FIND_IC, onclick: () => openSearch() }),
          field, count, prev, next, shut);

        const openSearch = () => {
          bar.dataset.open = 'true';
          requestAnimationFrame(() => field.focus());
        };
        const closeSearch = () => {
          bar.dataset.open = 'false';
          field.value = ''; q = ''; at = 0; paintScript();
        };
        shut.onclick = closeSearch;

        const step = (d) => {
          if (!hits.length) return;
          at = (at + d + hits.length) % hits.length;
          paintMarks();
        };
        prev.onclick = () => step(-1);
        next.onclick = () => step(1);

        const paintMarks = () => {
          hits.forEach((el, i) => el.dataset.on = String(i === at));
          count.textContent = q ? `${hits.length ? at + 1 : 0}/${hits.length}` : '';
          count.dataset.none = String(!!q && !hits.length);
          bar.dataset.hits = String(hits.length);
          hits[at]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        /* the query, drawn into the line rather than searched over it */
        const lit = (text) => {
          if (!q.trim()) return [document.createTextNode(text)];
          const out = [];
          const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
          let last = 0, mm;
          while ((mm = rx.exec(text))) {
            if (mm.index > last) out.push(document.createTextNode(text.slice(last, mm.index)));
            out.push(h('mark', { class: 'sr-hit' }, mm[0]));
            last = mm.index + mm[0].length;
            if (!mm[0]) rx.lastIndex++;
          }
          if (last < text.length) out.push(document.createTextNode(text.slice(last)));
          return out;
        };

        const voices = anonVoices(asRec());

        let liveP = null, filedN = -1;

        function paintScript() {
          const live = recOn(m);
          const im = live ? recInterim() : null;
          const now = [...script(), ...(im ? [im] : [])];
          liveP = null;
          scriptEl.replaceChildren(...now.map((l, li) => {
            const last = !!im && li === now.length - 1;
            /* Nothing on this page is about a voice except its own name,
               so the name is where you change it: one the machine could
               only number takes a caret and opens the dialog, a named one
               is a label. Colour per speaker was a legend to learn on a
               page that is already sorted by who is talking. */
            const w = isAnon(l.who)
              ? h('button', { class: 'br-line-w br-line-nm', type: 'button',
                              title: 'Name the speakers',
                              onclick: () => speakerDialog(m, asRec(), paintBody) },
                  spkName(m, l.who),
                  h('span', { class: 'br-line-car', 'aria-hidden': 'true' }))
              : h('span', { class: 'br-line-w' }, spkName(m, l.who));
            const para = h('p', { class: 'br-line-p' }, ...lit(l.text),
              last ? h('span', { class: 'br-caret', 'aria-hidden': 'true' }) : null);
            if (last) liveP = para;
            return h('div', {
              class: 'br-line' + (last ? ' br-line--live' : '')
                + (live && !last && li === now.length - 2 ? ' is-new' : ''),
            },
              h('div', { class: 'br-line-h' }, w,
                h('span', { class: 'br-line-t' }, l.t)),
              para);
          }));
          filedN = script().length;
          hits = [...scriptEl.querySelectorAll('.sr-hit')];
          at = Math.min(at, Math.max(0, hits.length - 1));
          paintMarks();
        }

        paintScript();

        /* while it is running the strip says so, in red, with the clock
           it is keeping — and it is the same line that carries the
           search when it is not */
        const head = h('div', { class: 'br-gen br-gen-sc' });
        const paintHead = () => head.replaceChildren(...[
          recOn(m)
            ? h('span', { class: 'br-rec', 'data-paused': String(REC.paused) },
                h('span', { class: 'rec-dot', 'aria-hidden': 'true' }),
                h('span', { class: 'br-rec-t' },
                  REC.paused ? 'Paused' : 'Recording'),
                h('span', { class: 'br-rec-c' }, recClock(recMs())))
            : h('span', { class: 'br-gen-ic', 'aria-hidden': 'true', html: CLOCK_IC }),
          /* The length first, because that is what you want to know
             before you start reading, then how many voices are in it.
             When some of those voices are still numbers, the count is
             followed by the way to fix that — the one thing worth doing
             on a transcript nobody has named yet. */
          recOn(m) ? null : h('span', { class: 'br-gen-m' },
            (!rec && REC_DONE[m.key] ? recClock(REC_DONE[m.key]) : `${mins} min`)
            + ` \u00b7 ${voices.length || ATT(m).length + 1} speakers`),
          /* the one thing worth doing to a transcript whose voices are
             still numbers, in the corner the other actions live in —
             and only once the recording has stopped, because naming a
             voice that is still talking is a job you would do twice */
          !recOn(m) && stillAnon(m, asRec()).length
            ? h('button', {
                class: 'br-gen-go br-name', type: 'button',
                onclick: () => speakerDialog(m, asRec(), paintBody),
              }, 'Label Speakers')
            : null,
          bar,
          h('button', {
            class: 'br-gen-cp', type: 'button',
            title: 'Copy the transcript', 'aria-label': 'Copy the transcript',
            html: MI(GLYPHS.copy),
            onclick: () => copyOut('transcript'),
          }),
        ].filter(Boolean));

        const mins = Math.round((+m.end - +m.start) / 60000);
        paintHead();

        /* the recorder redraws the two things that move: the clock in the
           header and the line being said at the foot */
        recBody = () => {
          if (!scriptEl.isConnected) return;
          paintHead();
          const im = recOn(m) ? recInterim() : null;
          /* while one line is being said, only that line changes — the
             list is rebuilt when a line is filed, and not four times a
             second under it */
          if (im && liveP && script().length === filedN) {
            liveP.replaceChildren(...lit(im.text),
              h('span', { class: 'br-caret', 'aria-hidden': 'true' }));
          } else {
            paintScript();
          }
          const l = scriptEl.lastElementChild;
          if (recOn(m) && l) l.scrollIntoView({ block: 'nearest' });
        };

        return body.replaceChildren(head, scriptEl);
      }
      if (waiting) return body.replaceChildren(
        genLine('pre-brief', true),
        h('div', { class: 'br-fade' }, ...readable(b)));
      /* A brief is prepared three hours out, because one written on
         Monday for a Thursday call is wrong by Thursday. Before then
         there is nothing to read — but there is no reason you cannot
         ask for it early. */
      if (!ready()) return body.replaceChildren(h('div', { class: 'br-soon' },
        h('span', { class: 'br-soon-ic', 'aria-hidden': 'true', html: CLOCK_IC }),
        h('span', { class: 'br-soon-t' },
          `Prepared at ${hhmm(new Date(+m.start - BRIEF_WINDOW))}, three hours before`),
        h('button', { class: 'br-soon-go', type: 'button',
          /* the shape is worth asking for at the moment it is first
             written, not only when it is written again */
          onclick: () => regenDialog('pre-brief', (note) => {
            MEET_MADE[m.key] = true; regen('pre-brief', note);
          }, { ...askOpts(), title: 'Generate the pre-brief', go: 'Generate',
                label: 'Anything to weight it towards?' }),
        }, 'Generate now')));
      body.replaceChildren(
        genLine('pre-brief'), ...readable(b, null));
      linkNames(body);
    };

    /* Your own first — it is your page. Where you land is decided by the
       button that brought you here. */
    /* what this page can record itself, on top of whatever it came with */
    const heard = () => REC_LINES[m.key] || [];
    const script = () => [...((rec && rec.transcript) || []), ...heard()];
    const asRec = () => ({ ...(rec || {}), transcript: script() });
    const hasScript = () => script().length > 0 || recOn(m);

    const TABS = [['notes', 'My Notes'],
      /* nothing was prepared for a meeting nobody knew was happening —
         a brief is written off an invitation, and this one had none */
      ...(m.adhoc ? [] : [['brief', 'Brief']]),
      ...(done || hasScript() ? [['transcript', 'Transcript']] : []),
      ...(done || REC_DONE[m.key] ? [['summary', 'AI Summary']] : [])];
    /* a meeting with no brief opens on the first tab it does have */
    if (!TABS.some(t => t[0] === tab)) { tab = TABS[0][0]; curTab = tab; }

    /* The buttons are built once and only their state changes, and the
       underline is one element that moves — rebuilding the row made the
       labels jump as the bold one changed width, and the rule under them
       blinked from tab to tab instead of travelling. */
    const ink = h('span', { class: 'br-ink', 'aria-hidden': 'true' });
    /* a recording in progress is said on the tab it is landing in, so
       you can be reading the pre-brief and still see it running */
    const tabEq = h('span', { class: 'rec-eq', 'aria-hidden': 'true' },
      ...[0, 1, 2].map(i => h('i', { style: `--i:${i}` })));
    const btns = TABS.map(([k, label]) => h('button', {
      class: 'br-tab', type: 'button', 'data-label': label,
      'aria-selected': String(tab === k),
      onclick: () => setTab(k),
    }, ...(k === 'transcript' ? [tabEq, label] : [label])));
    recTab = () => {
      tabEq.dataset.on = String(recOn(m));
      tabEq.dataset.paused = String(recOn(m) && REC.paused);
      /* the wave appearing and going changes how wide the tab is, and
         the rule underneath it has to follow */
      moveInk();
    };
    /* Beside the name. On the tab row it sat in a line of tabs and read
       as a fifth one — a thing you switch to rather than a thing you
       do. */
    const share = h('button', {
      class: 'br-share', type: 'button', 'aria-haspopup': 'menu',
      onclick: (e) => {
        e.stopPropagation();
        const label = (TABS.find(t => t[0] === tab) || TABS[0])[1];
        menu(e.currentTarget, [
          /* the same dialog an artifact uses, because being given a
             meeting is the same act as being given a document */
          { label: 'Invite people\u2026', icon: 'person',
            run: () => publishDialog(meetShare(m), paintLive) },
          { rule: true },
          { label: 'Copy link', icon: 'copy',
            run: () => navigator.clipboard.writeText(location.href).then(
              () => toast('Link copied.'),
              () => toast('Could not reach the clipboard.')) },
          { label: 'Email to participants', icon: 'unread',
            run: () => toast(`${label} sent to ${ATT(m).length} people.`) },
          { rule: true },
          { label: 'Post to Slack', html: '<svg class="ic"><use href="#b-slack"/></svg>',
            run: () => toast(`${label} posted to Slack.`) },
        ]);
      },
    },
      h('span', { class: 'br-share-ic', 'aria-hidden': 'true', html: MI(GLYPHS.share) }),
      'Share');

    /* who else is here, beside the way to let somebody in: faces first,
       because a face is the fastest way to say "not alone" */
    const live = h('span', { class: 'br-live-w' });
    const paintLive = () => {
      const here = meetLive(m);
      if (!here.length) return live.replaceChildren();
      live.replaceChildren(h('button', {
        class: 'br-live', type: 'button', 'aria-haspopup': 'menu',
        'data-tip': `${here.length} here now`, 'aria-label': `${here.length} here now`,
        onclick: (e) => { e.stopPropagation(); livePanel(e.currentTarget, m); },
      },
        ...here.slice(0, 3).map(p => faceEl(p.name, 'br-live-av')),
        h('span', { class: 'br-live-n' }, String(here.length))));
    };
    paintLive();
    briefLive = live;

    const tabs = h('div', { class: 'br-tabs' }, ...btns, ink);

    const moveInk = () => {
      const b = btns[TABS.findIndex(t => t[0] === tab)];
      if (!b) return;
      ink.style.setProperty('--x', b.offsetLeft + 'px');
      ink.style.setProperty('--w', b.offsetWidth + 'px');
    };
    setTab = (k) => {
      /* a tab that has only just appeared is not in the row yet: the page
         is rebuilt around it and lands on it */
      if (!TABS.some(t => t[0] === k)) { showTab = k; return paint(); }
      tab = k; curTab = k; recPaint?.();
      btns.forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i][0] === k)));
      moveInk(); paintBody();
      if (k === 'notes') requestAnimationFrame(() => notes.focus());
    };
    paintBody();
    recTab();
    /* one rAF is not always enough: the row is measured before it has
       been laid out when the page is built off-screen, and a tab whose
       label arrives with the font lands wider than it was measured. The
       observer fires once on attach and again on every reflow, which
       covers both without a timer. */
    requestAnimationFrame(moveInk);
    if (window.ResizeObserver) new ResizeObserver(moveInk).observe(tabs);
    document.fonts?.ready.then(moveInk);

    return h('div', { class: 'br' },
      /* ── the three ways into the pane ──
         With the pane closed there is nothing on screen saying it
         exists, and X is not a thing anybody guesses. Three marks in the
         corner it comes out of — the conversation, the invitation and
         the questions caught in the room — each opening the pane on its
         own tab. They go once the pane is open, because the deck of tabs
         in its head says the same thing better. */
      (() => {
        const rail = (tab, tip, mark, extra) => h('button', {
          class: 'br-pane', type: 'button',
          'data-tip': tip, 'aria-label': tip,
          onclick: () => hubPanel(m, tab),
        }, h('span', { class: 'br-pane-ic', 'aria-hidden': 'true', html: mark }), extra);

        /* how many questions are standing, on the mark that holds them */
        const n = h('span', { class: 'br-pane-n', hidden: true });
        railTick = () => {
          const k = cueOn(m) ? cueLive().filter(c => !c.seen).length : 0;
          n.hidden = !k;
          n.textContent = k || '';
        };
        const el = h('div', { class: 'br-panes' },
          rail('ask', 'Ask about this meeting', CHAT_IC),
          rail('meeting', 'Meeting details', MEET_IC),
          rail('cues', 'Cues', CUE_IC, n));
        railTick();
        return el;
      })(),
      /* the way out and the way on, on one line: Back holds the left and
         Share the right, above the name rather than beside it */
      h('div', { class: 'br-top' },
      /* an arrow, not a chevron — a chevron points, an arrow goes */
      /* In the desktop panel there is no list behind this page — the
         window is the page. Back is the way out to the whole app, and
         the shell is the only thing that can open that. */
      h('button', { class: 'br-back', type: 'button',
                    onclick: () => {
                      /* a message rather than a call on the parent: the
                         shell's globals are not always reachable across
                         the frame, and a message always is */
                      if (document.body.dataset.bare === 'true' && parent !== window) {
                        return parent.postMessage({ unify: 'openApp' }, '*');
                      }
                      toList();
                    } },
        h('span', { class: 'br-back-a', 'aria-hidden': 'true',
                    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                        + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
                        + '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg>' }),
        'Back'),
        /* the two things you do to the page, boxed like New meeting so
           they sit on the line rather than float above it */
        h('div', { class: 'br-top-r' },
          live,
          h('button', {
            class: 'br-dots', type: 'button', 'aria-haspopup': 'menu',
            title: 'More', 'aria-label': 'More for this meeting',
            html: MI(GLYPHS.dots),
            onclick: (e) => {
              e.stopPropagation();
              const dots = e.currentTarget;
              const plat = !m.place && !m.adhoc && PLATFORM[m.via || 'teams'];
              const link = plat && plat.link(meetSlug(m));
              menu(e.currentTarget, [
                /* the invitation before anything you can do to it */
                { label: 'Meeting details', icon: 'calendar',
                  run: () => detailPanel(m) },
                { label: 'Edit meeting', icon: 'rename', run: () => meetingPanel(m) },
                projectItem(m, () => dots),
                link ? { label: `Copy ${plat.label} link`, icon: 'copy',
                  run: () => copyLink('https://' + link) } : null,
                { rule: true },
                { label: 'Delete meeting', icon: 'trash', danger: true,
                  run: () => {
                    const room = ATT(m).length;
                    const drop = () => { editOf(m.key).deleted = true; toList(); };
                    if (!room) return drop();
                    updateDialog(room + 1, {
                      title: 'Cancel this meeting and tell the people invited?',
                      ask: 'Add a note about the cancellation (optional)',
                      onSend: drop, onQuiet: drop, onBack: () => {},
                    });
                  } },
              ]);
            },
          }),
          share)),
      /* the page's own title, written where it is read. A meeting that
         started by being had has no name until somebody gives it one, so
         the placeholder stands in the faint grey until they do. */
      (() => {
        const t = h('h1', {
          class: 'br-title', contenteditable: 'true', spellcheck: 'false',
          'data-empty': 'Untitled meeting',
          oninput: () => {
            const v = t.textContent.trim();
            editOf(m.key).name = v || 'Untitled meeting';
            m.name = v || 'Untitled meeting';
          },
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } },
          onblur: () => { if (!t.textContent.trim()) t.textContent = ''; },
        });
        /* the seed name is the absence of one — it shows as the
           placeholder rather than as something you have to clear */
        t.textContent = m.name === 'Untitled meeting' ? '' : m.name;
        return t;
      })(),
      h('div', { class: 'br-meta' },
        h('span', { class: 'br-when' },
          `${dayLabel(m.start)} \u00b7 ${meetSpan(m)}`),
        h('span', { class: 'mt-sep' }, '\u00b7'),
        /* the same door the list has, behind the same names */
        h('button', { class: 'br-who', type: 'button',
          onclick: (e) => { e.stopPropagation(); meetingCard(e.currentTarget, m, paint); },
        }, roomOf(m.who))),
      tabs, body);
  }

  /* ── ask anything, from wherever you are on the page ──
     Docked at the foot rather than at the top, because the question you
     have about a brief arrives while you are reading it. */
  /* the page hands the dock the two things a recording changes: the tab
     it should open, and the parts of the page it should redraw */
  let setTab = () => {}, recBody = null, recTab = null, regen = () => {};
  /* which tab the brief is on, so the dock can say the consent line only
     where the transcribing is actually landing */
  let curTab = null;

  function briefAsk(m) {
    CUE_ME = m;
    const go = h('button', {
      class: 'mt-ask-go', type: 'button', hidden: true,
      'aria-label': 'Ask', html: ARROW,
    });
    const field = h('input', {
      class: 'mt-ask-in', type: 'text', spellcheck: 'false',
      placeholder: 'Ask anything', 'aria-label': `Ask about ${m.name}`,
      oninput: () => { go.hidden = !field.value.trim(); },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } },
    });
    const send = () => {
      const q = field.value.trim();
      if (!q) return;
      field.value = ''; go.hidden = true;
      /* In the desktop panel there is no room for a conversation beside
         the page, and squeezing one in there is not what asking a
         question should do — it hands the question to the whole app. */
      if (document.body.dataset.bare === 'true' && parent !== window) {
        return parent.postMessage({ unify: 'openApp', ask: q, meeting: m.name }, '*');
      }
      chatPanel(q);
      paintDock();
    };
    go.onclick = send;

    /* ── the recorder ──
       Left of the question, because it is the thing you press before you
       have any questions. Idle it is one word; running it is the clock,
       a pause and a stop, and it says so in red. */
    const rec = h('div', { class: 'rec' });
    const say = h('p', { class: 'rec-say' },
      'Always get consent when transcribing others. ',
      h('button', { class: 'rec-learn', type: 'button',
        onclick: () => toast('The consent notes open in the next pass.') }, 'Learn more'));

    /* what a finished recording offers, above the question — the one
       thing you want the moment the room empties */
    const offer = h('div', { class: 'rec-offer' });
    let offerOn = null;
    const paintOffer = () => {
      const show = !!(REC_DONE[m.key] && !REC_GEN[m.key] && !recOn(m));
      /* rebuilding it on every tick restarted its animation two and a
         half times a second, which read as a flicker */
      if (show === offerOn) return;
      offerOn = show;
      offer.replaceChildren(...(show ? [h('button', {
        class: 'rec-gen', type: 'button',
        onclick: () => {
          REC_GEN[m.key] = true; MEET_MADE[m.key] = true;
          paintOffer(); setTab('summary'); regen('summary');
        },
      },
        h('span', { class: 'rec-gen-ic', 'aria-hidden': 'true', html: SPARK_IC }),
        'Generate summary')] : []));
    };

    let pillAt = null;
    const paintRec = () => {
      const live = recOn(m);
      /* the consent line belongs where the words are being written down,
         and nowhere else */
      say.hidden = !(live && curTab === 'transcript');
      paintOffer();
      /* the pill is rebuilt when its state changes and not on every tick
         of the clock: replacing the node under the pointer dropped the
         hover and took it back twice a second, which read as a flicker */
      const began = !!REC_EVER[m.key];
      const at = REC_WRAP[m.key] ? 'wrap'
        : live ? (REC.paused ? 'paused' : 'live')
        : began ? 'resume' : 'start';
      if (at === pillAt) return;
      pillAt = at;
      if (REC_WRAP[m.key]) {
        return rec.replaceChildren(h('div', { class: 'rec-pill is-wrap' },
          h('span', { class: 'rec-mk' }, h('span', { class: 'rec-spin' })),
          h('span', { class: 'rec-act' }, 'Saving')));
      }

      /* One pill, one word. The mark on the left says which state it is
         in — a ring when it is waiting for you, bars when a voice is
         coming in — and the word is the thing pressing it does. Anything
         else it can do is behind the caret, not spread across the pill:
         a clock, a strip and three buttons in a row was a control panel
         where a button belonged. */
      /* the first time there is nothing to carry on from, so it starts;
         after that, every way back in is picking the same recording up */
      const word = live ? (REC.paused ? 'Resume' : 'Stop') : began ? 'Resume' : 'Start';
      const act = () => {
        if (!live) { recStart(m.key); setTab('transcript'); recPaint?.(); return; }
        if (REC.paused) return recResume();
        /* no notification: the pill saying Saving and then Resume, and
           the summary offer arriving over it, is the whole message */
        recStop();
      };

      /* Running, the mark is a red dot and nothing else moves: the wave
         on the tab is already saying it is live, and two animations
         saying the same thing at once is a page that fidgets. A red dot
         beside the word Stop is the whole sentence. */
      const mark = h('span', { class: 'rec-mk', 'aria-hidden': 'true' },
        live && !REC.paused
          ? h('span', { class: 'rec-stopdot' })
          : h('span', { class: 'rec-ring' }));

      /* the whole thing is the button: a mark and a word inside a box
         where only the word answered the pointer was two controls drawn
         as one */
      const pill = h('button', {
        class: 'rec-pill' + (live ? ' is-live' : ' is-idle'),
        type: 'button', 'data-paused': String(live && REC.paused), onclick: act,
      }, mark, h('span', { class: 'rec-act' }, word));
      rec.replaceChildren(pill);
    };

    /* one hook, held by whatever is on screen: the recorder redraws the
       clock, the tab and the line being said through it */
    recPaint = () => { paintRec(); recBody?.(); recTab?.(); };
    paintRec();

    /* ── with the chat open beside it ──
       The question has somewhere else to go, so the field on the page
       goes away entirely and the recorder is left standing in the
       middle of it. */
    /* the same composer the day above it uses, and the chat before that
       — one box for asking, wherever the asking happens */
    const askBox = h('div', { class: 'ask ask-mini br-composer',
      html: '<textarea rows="1" aria-label="Ask about this meeting" '
          /* inside a meeting the box does not need to say which meeting */
          + 'placeholder="Ask anything"></textarea>'
          + '<div class="askbar"><button class="send" type="button" disabled '
          + 'aria-label="Ask">' + ARROW + '</button></div>',
    });
    queueMicrotask(() => initComposer(askBox, {
      noModel: true, noCreate: true,
      agents: agentPicks(), skills: SKILL_LIST, projects: PROJECT_LIST,
      onSend: (q) => {
        /* In the desktop panel there is no room for a conversation beside
           the page, and squeezing one in there is not what asking a
           question should do — it hands the question to the whole app. */
        if (document.body.dataset.bare === 'true' && parent !== window) {
          return parent.postMessage({ unify: 'openApp', ask: q, meeting: m.name }, '*');
        }
        chatPanel(q, null, { key: m.key, name: m.name });
        paintDock();
      },
    }));
    const dockrow = h('div', { class: 'br-dockrow' });
    /* only the conversation takes the question off the page — a person
       open beside the brief is something you are reading, and you can
       still want to ask about the meeting while you read it */
    /* The page gives up its question box when the conversation it started
       has moved into the pane — two composers asking the same thing is
       one too many. But a conversation opened from the deck of tabs is
       not this page's conversation: the page keeps its own box, and you
       can ask from either. */
    const paneOpen = () => {
      const el = document.getElementById('main');
      return el?.dataset.artifact === 'open' && el.dataset.pane === 'chat'
        && el.dataset.hub !== 'true';
    };
    const paintDock = () => {
      const chat = paneOpen();
      dockrow.dataset.chat = String(chat);
      dockrow.replaceChildren(...(chat ? [rec] : [rec, askBox]));
      /* coming back from the conversation, the box is the one you typed
         the last question into: it kept the height it grew to and the
         scrollbar that came with it. Put it back the way it opens. */
      if (!chat) {
        const t = askBox.querySelector('textarea');
        if (t) {
          t.value = '';
          t.style.height = 'auto';
          t.scrollTop = 0;
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };
    paintDock();
    /* the pane is opened and closed from elsewhere, so the dock watches
       for it rather than being told */
    const mainEl = document.getElementById('main');
    if (mainEl) {
      const obs = new MutationObserver(() => {
        if (dockrow.isConnected) paintDock(); else obs.disconnect();
      });
      obs.observe(mainEl, {
        attributes: true, attributeFilter: ['data-artifact', 'data-pane', 'data-hub'],
      });
    }

    const dock = h('div', { class: 'br-dock' }, say, offer, dockrow);
    /* ── the floor the page has to clear ──
       The dock sits over the foot of the brief, and it is a different
       height depending on whether it is carrying the consent line and the
       offer of a summary. A fixed bottom padding left the last section
       under it with nowhere to scroll to, so the page is told how tall
       its own floor is and keeps that much room plus a breath. */
    requestAnimationFrame(() => {
      /* the dock is a sibling of the page rather than a child of it, so
         the measurement goes on the page it covers */
      if (typeof ResizeObserver === 'undefined') return;
      const set = () => {
        const page = document.querySelector('.br');
        if (page) page.style.setProperty('--dock-h', dock.offsetHeight + 'px');
      };
      new ResizeObserver(set).observe(dock);
      set();
    });
    return dock;
  }

  function paint() {
    meetRepaint = paint;
    if (showing) {
      /* the meeting moves under it, so the page is rebuilt from the day */
      const live = meetingsOn(day).find(x => x.key === showing.key);
      const m = live || showing;
      root.replaceChildren(briefPage(m, showTab), briefAsk(m));
      /* the pane is about the meeting, so it cannot outlive the one it
         was opened on. Coming from another meeting with the hub still
         open used to leave the last meeting's invitation sitting beside
         the new one's brief. */
      followPane(m);
      return;
    }
    if (bare) { root.replaceChildren(bareShell()); return; }
    root.replaceChildren(shell);
    const isToday = dayOffset(day) === 0;
    label.replaceChildren(
      h('span', { class: 'mt-date-day' }, dayLabel(day)),
      h('span', { class: 'mt-date-full' }, dateLabel(day)),
      h('span', { class: 'caret', 'aria-hidden': 'true' }));
    back.hidden = isToday;

    const now = Date.now();
    const items = meetingsOn(day);
    if (!items.length) {
      list.replaceChildren(h('p', { class: 'mt-none' },
        isToday ? 'Nothing in the calendar today.'
                : `Nothing in the calendar on ${DAYS[day.getDay()]}.`));
      return;
    }
    /* Two sections, in the order the day happens: what is behind you and
       what is not. A meeting in progress belongs to what is ahead — it
       still wants something from you. */
    const done = items.filter(m => +m.end <= now);
    const left = items.filter(m => +m.end > now);
    const sect = (t) => h('div', { class: 'mt-sect' }, t);
    list.replaceChildren(
      ...(done.length ? [sect('Past'), ...done.map(m => row(m, now))] : []),
      ...(left.length ? [sect('Upcoming'),
        ...left.map((m, i) => row(m, now, isToday && i === 0))] : []));
  }

  /* One line above the day. Not the home composer — there is no room for
     a picker and a menu over a list, and no send button either: there is
     one thing to do with a line of text and Enter does it.

     The placeholder names the whole range rather than one example of it:
     an example only ever says one thing, and this box takes anything on
     either side of today. */
  /* The chat composer, not a second box that looks like it. It brings
     the plus menu, the tokens and the send with it; the only thing this
     one does not need is the model picker, because a question about a
     day has one thing answering it. */
  const ask = h('div', { class: 'ask ask-mini mt-composer',
    html: '<textarea rows="1" aria-label="Ask about your meetings" '
        + 'placeholder="Ask about an upcoming or a previous meeting"></textarea>'
        + '<div class="askbar"><button class="send" type="button" disabled '
        + 'aria-label="Ask">' + ARROW + '</button></div>',
  });
  queueMicrotask(() => initComposer(ask, {
    noModel: true, noCreate: true,
    agents: agentPicks(), skills: SKILL_LIST, projects: PROJECT_LIST,
    /* asked from the day rather than from inside a meeting, so it is an
       ordinary conversation and takes the whole window */
    onSend: (q) => startThread(q),
  }));

  /* ── a meeting that starts by being had ──
     Not every call is in the calendar. New meeting puts an untitled one
     on the day at the time it is now, starts recording it, and opens it
     on the transcript — because the reason you pressed it is that
     somebody is already talking. The name is the last thing you know
     about a meeting like this, so it is left for you to write. */
  const newMeeting = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const seed = {
      /* the clock is what makes it unique, so two in one minute is the
         only collision and it is not one worth solving */
      time: hhmm(now), at: 0, mins: 0,
      /* nothing was booked, so there is no link to join and no room to
         be in — it is happening wherever you are */
      name: 'Untitled meeting', who: [], adhoc: true, via: null,
    };
    const n = dayOffset(day);
    if (n === 0) MEET_TODAY.push(seed);
    else (MEET_DAYS[String(n)] = MEET_DAYS[String(n)] || []).push(seed);
    /* pinned where it was made: today's meetings are placed relative to
       now, and this one has to stay put once now has moved on */
    const key = meetKey(seed);
    editOf(key).at = mins;
    paint();
    const made = meetingsOn(day).find(x => x.key === key);
    if (!made) return;
    recStart(key);
    openBrief(made, 'transcript');
  };

  const shell = h('div', { class: 'mt' },
    /* three columns, so the day sits in the middle of the page rather
       than wherever the two ends happen to leave it */
    h('header', { class: 'mt-top' },
      h('h1', { class: 'mt-title' }, 'Meetings'),
      h('div', { class: 'mt-nav' },
        arrow(-1, 'Previous day'),
        label,
        arrow(1, 'Next day')),
      h('div', { class: 'mt-top-r' },
        back,
        h('button', {
          class: 'btn btn--primary mt-new', type: 'button',
          onclick: newMeeting,
        }, h('span', { class: 'mt-new-x', 'aria-hidden': 'true' }, '\u002b'), 'New meeting'))),
    h('div', { class: 'mt-askwrap' }, ask),
    h('div', { class: 'mt-body' }, list));

  /* ── nothing connected yet ──
     Under the same header, because the page being set up is the page
     you land on. Two calendars and a plain account of what happens once
     one of them is in. */
  const connect = (kind) => h('button', {
    class: 'ob-cta', type: 'button',
    /* No dialog, and no leaving the page either: connecting fills the
       first row in and the rest of the setup appears under it, the way
       the home screen's connector card does. The day comes when you say
       you are done. */
    onclick: () => { SETUP.cal = kind; paint(); },
  },
    h('span', { class: 'ob-cta-ic', 'aria-hidden': 'true',
                html: `<svg viewBox="0 0 24 24"><use href="#b-${CAL_BRAND[kind].sign}"></use></svg>` }),
    'Connect ' + CAL_BRAND[kind].label);

  /* No header: there is no day to move between and nothing to put in the
     calendar, so a date picker and a New meeting button over an empty
     page are two controls that cannot do anything yet. */
  const bareShell = () => h('div', { class: 'mt' },
    SETUP.cal ? h('div', { class: 'ob ob--set' },
      setupCard(() => { bare = false; paint(); }))
    : h('div', { class: 'ob' },
      /* one card, two halves: the thing to do on the left, what doing it
         turns on beside it. A card and then a grid of cards under it made
         two components out of one. */
      h('div', { class: 'ob-card' },
        h('div', { class: 'ob-hero' },
          /* the two calendars being asked for, overlapping. The buttons
             below take the sign-in marks; up here it is the products. */
          h('div', { class: 'ob-mark', 'aria-hidden': 'true' },
            ...['gcal', 'outlook'].map(k => h('span', { class: 'ob-mark-d',
              html: `<svg viewBox="0 0 24 24"><use href="#b-${k}"></use></svg>` }))),
          h('h2', { class: 'ob-title' }, 'AI Meeting Notetaker'),
          h('p', { class: 'ob-sub' },
            'Connect Google Calendar or Outlook. Every meeting on it gets a '
            + 'pre-brief, notes and a summary.'),
          h('div', { class: 'ob-ctas' }, connect('google'), connect('outlook'))),
        h('div', { class: 'ob-feats' }, ...[
          /* all four run to two lines, so the block reads as a set rather
             than as four paragraphs of different weights */
          [CLOCK_IC, 'AI Meeting Pre-Briefs',
           'The account, recent emails and open items, three hours ahead.'],
          [NOTE_IC.short, 'AI Meeting Summaries',
           'Decisions and action items with owners, as soon as it ends.'],
          [FIND_IC, 'Ask Anything',
           'Ask what was decided, or what you agreed to do, across them all.'],
          [NOTE_IC.people, 'Know Your People',
           'Who is attending, their role, and your last conversation.'],
        ].map(([ic, t, sub]) => h('div', { class: 'ob-feat' },
          h('span', { class: 'ob-feat-ic', 'aria-hidden': 'true', html: ic }),
          h('div', { class: 'ob-feat-m' },
            h('h3', { class: 'ob-feat-t' }, t),
            h('p', { class: 'ob-feat-s' }, sub)))))),
      ));

  /* the list and the brief are two pages of one view, so the view is a
     host and paint decides which of them is in it */
  const root = h('div', { class: 'mt-page' });
  paint();
  return root;
}

register('artifacts', libraryView);
register('dolist', doListView);
/* ── the model router ─────────────────────────────────────────
   Three things in one panel, in the order they get used: Auto, which is
   the answer for almost everybody; two or three the router would pick
   for the work at hand, each with the reason it is on the list; and then
   everything there is, grouped by who makes it.

   The families are groups rather than a filter, because somebody who has
   decided they want an Anthropic model has decided that first and picks
   which one second.
*/
const MODELS = [
  /* Anthropic */
  { id: 'opus',    fam: 'Anthropic', name: 'Opus 4.6',        in: 15,  out: 75, speed: 1,
    for: 'Hard reasoning, long documents, code that has to be right.' },
  { id: 'sonnet',  fam: 'Anthropic', name: 'Sonnet 4.6',      in: 3,   out: 15, speed: 2,
    for: 'The default for most work. Fast, and accurate enough for it.' },
  { id: 'haiku',   fam: 'Anthropic', name: 'Haiku 4.5',       in: 0.8, out: 4,  speed: 3,
    for: 'Short answers, extraction, classification, routing.' },
  /* OpenAI */
  { id: 'gpt52',   fam: 'OpenAI',    name: 'GPT-5.2',         in: 10,  out: 40, speed: 2,
    for: 'Broad general work. Strong on structured output.' },
  { id: 'gpt52m',  fam: 'OpenAI',    name: 'GPT-5.2 mini',    in: 0.5, out: 2,  speed: 3,
    for: 'High volume, low stakes. Cheap per call.' },
  { id: 'o4',      fam: 'OpenAI',    name: 'o4',              in: 12,  out: 48, speed: 1,
    for: 'Step-by-step problems where the working matters.' },
  /* Google */
  { id: 'g3pro',   fam: 'Google',    name: 'Gemini 3 Pro',    in: 4,   out: 18, speed: 2,
    for: 'A million tokens of context, and it holds together across them.' },
  { id: 'g3flash', fam: 'Google',    name: 'Gemini 3 Flash',  in: 0.4, out: 1.5, speed: 3,
    for: 'Cheap and quick over very long inputs.' },
  /* Qwen */
  { id: 'qwenmax', fam: 'Qwen',      name: 'Qwen3 Max',       in: 1.6, out: 6.4, speed: 2,
    for: 'Long context at a fraction of the price. Good on Chinese.' },
  { id: 'qwen32',  fam: 'Qwen',      name: 'Qwen3 32B',       in: 0.3, out: 1.2, speed: 3,
    for: 'Open weights. Runs in your own tenancy if you need it to.' },
  /* Mistral */
  { id: 'mlarge',  fam: 'Mistral',   name: 'Mistral Large 3', in: 2,   out: 6,  speed: 2,
    for: 'European hosting, strong on French and German.' },
  { id: 'msmall',  fam: 'Mistral',   name: 'Mistral Small',   in: 0.2, out: 0.6, speed: 3,
    for: 'The cheapest thing here that still writes a sentence.' },
];
/* the makers' own marks */
const FAM_IC = {
  Anthropic: '<svg viewBox="0 0 24 24"><use href="#b-claude"/></svg>',
  OpenAI:    '<svg viewBox="0 0 24 24"><use href="#b-openai"/></svg>',
  Google:    '<svg viewBox="0 0 24 24"><use href="#b-gemini"/></svg>',
  Qwen:      '<svg viewBox="0 0 24 24"><use href="#b-qwen"/></svg>',
  Mistral:   '<svg viewBox="0 0 24 24"><use href="#b-mistral"/></svg>',
};
const FAMILIES = ['Anthropic', 'OpenAI', 'Google', 'Qwen', 'Mistral'];
const modelOf = (id) => MODELS.find(m => m.id === id);

/* What the work is. The router reads it; you can change it, and the
   suggestions change with it, which is the whole point of the group. */
const TASKS = [
  { id: 'general', label: 'General chat',   picks: ['sonnet', 'gpt52m', 'g3flash'] },
  { id: 'long',    label: 'Long documents', picks: ['opus', 'g3pro', 'qwenmax'] },
  { id: 'code',    label: 'Code',           picks: ['opus', 'o4', 'sonnet'] },
  { id: 'extract', label: 'Extraction',     picks: ['haiku', 'g3flash', 'msmall'] },
];
/* ── the routers ──
   A router is a rule for choosing, not a model: each one mixes whatever
   makes and prices it needs to keep its promise, which is why they are
   named for the promise rather than for the models behind them. */
const ROUTERS = [
  { id: 'cheap',   name: 'Cost saver',       sub: 'The smallest model that will do.',
    uses: { general: 'gpt52m', long: 'g3flash', code: 'sonnet', extract: 'msmall' } },
  { id: 'bal',     name: 'Balanced',         sub: 'Mid-tier everywhere. No surprises.',
    uses: { general: 'sonnet', long: 'g3pro', code: 'sonnet', extract: 'haiku' } },
  { id: 'best',    name: 'Best quality',     sub: 'The strongest model, whatever it costs.',
    uses: { general: 'opus', long: 'opus', code: 'opus', extract: 'gpt52' } },
  { id: 'fast',    name: 'Fastest',          sub: 'First token soonest.',
    uses: { general: 'haiku', long: 'g3flash', code: 'sonnet', extract: 'haiku' } },
  { id: 'long',    name: 'Long context',     sub: 'Whatever holds the most at once.',
    uses: { general: 'g3pro', long: 'g3pro', code: 'g3pro', extract: 'qwenmax' } },
  { id: 'open',    name: 'Open weights only', sub: 'Runs in your own tenancy.',
    uses: { general: 'qwen32', long: 'qwenmax', code: 'qwen32', extract: 'msmall' } },
  { id: 'eu',      name: 'EU hosted',        sub: 'Nothing leaves European data centres.',
    uses: { general: 'mlarge', long: 'mlarge', code: 'mlarge', extract: 'msmall' } },
];
const routerOf = (id) => ROUTERS.find(r => r.id === id);

const ROUTE = { pick: 'cheap', task: 'general' };
const isRouter = (id) => !!routerOf(id);
const taskOf = () => TASKS.find(t => t.id === ROUTE.task);
/* what the chosen router would land on for the work at hand */
const autoOn = () => routerOf(ROUTE.pick).uses[ROUTE.task];

const ROUTE_IC = {
  /* the router's own mark, which arrived as a raster — the build inlines
     it, so it is kept at 96px for a 16px slot. The 1254px original is in
     the folder beside it; inlining that put 930KB of base64 in the bundle
     to draw sixteen pixels. */
  auto: '<img src="assets/brand/router-ic.png" alt="">',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
      + 'stroke-linejoin="round"><path d="M12 3.6l2.5 5.3 5.6.8-4 4 1 5.7-5.1-2.8'
      + '-5.1 2.8 1-5.7-4-4 5.6-.8z"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
};
const routeLabel = () => isRouter(ROUTE.pick) ? routerOf(ROUTE.pick).name : modelOf(ROUTE.pick).name;

/* ── the dropdown ──
   Two panes. One flat list of routers, suggestions, five makes and their
   models was twenty-odd rows deep and you had to read all of it to find
   out what was in it. The kinds go on the left, so the panel says what it
   holds before you scroll any of it, and only one kind is ever on screen.
*/
function routeMenu(anchor, onPick) {
  closeMenu();
  let q = '';
  let side = ROUTE.pick && !isRouter(ROUTE.pick) ? modelOf(ROUTE.pick).fam : 'routers';
  let rows = [], at = 0;

  const rail = h('div', { class: 'rt-rail' });
  const body = h('div', { class: 'rt-scroll' });

  const mark = () => rows.forEach((r, i) => r.dataset.at = String(i === at));

  const row = (o) => {
    const el = h('button', {
      class: 'rt-row', type: 'button', role: 'menuitemradio',
      'aria-checked': String(o.on),
      onclick: (e) => { e.stopPropagation(); o.run(); },
      onpointerenter: () => { at = rows.indexOf(el); mark(); },
    },
      o.mark ? h('span', { class: 'rt-row-ic', 'aria-hidden': 'true', html: o.mark }) : null,
      h('span', { class: 'rt-row-m' },
        h('span', { class: 'rt-row-n' }, o.name),
        h('span', { class: 'rt-row-s' }, o.sub)),
      h('span', { class: 'rt-row-r' },
        o.meta || null,
        h('span', { class: 'rt-tick', 'aria-hidden': 'true', html: ROUTE_IC.tick })));
    rows.push(el);
    return el;
  };

  /* The line under a model's name is the money. A sentence about what it
     is good at is a sentence you read once and then scroll past forever;
     the price is the thing you are actually comparing, and it belongs
     where the eye already goes. */
  const modelRow = (m) => row({
    name: m.name, on: ROUTE.pick === m.id, mark: FAM_IC[m.fam],
    sub: `$${m.in} in · $${m.out} out per 1M tokens`,
    run: () => { ROUTE.pick = m.id; closeMenu(); onPick(); },
  });

  /* ── the kinds ── */
  /* One flat list. Two headings over seven items made a shape out of a
     distinction nobody is looking for at the moment of choosing. */
  const SIDES = [
    { id: 'sugg',    label: 'Suggested',     ic: ROUTE_IC.star },
    { id: 'routers', label: 'Model routers', ic: ROUTE_IC.auto },
    ...FAMILIES.map(f => ({ id: f, label: f, brand: FAM_IC[f] })),
  ];

  function paintRail() {
    rail.replaceChildren(...SIDES.map(sideBtn));
  }
  const sideBtn = (sd) => h('button', {
    class: 'rt-side', type: 'button', 'aria-selected': String(side === sd.id),
    onclick: (e) => { e.stopPropagation(); side = sd.id; q = ''; find.value = '';
                      paintRail(); paintBody(); },
  },
    h('span', { class: 'rt-side-ic', 'aria-hidden': 'true',
                html: sd.brand || sd.ic }),
    h('span', { class: 'rt-side-l' }, sd.label),
    h('span', { class: 'rt-side-n' },
      String(sd.id === 'routers' ? ROUTERS.length
        : sd.id === 'sugg' ? taskOf().picks.length
        : MODELS.filter(m => m.fam === sd.id).length)));

  function paintBody() {
    rows = [];
    if (q) {
      const hit = MODELS.filter(m => m.name.toLowerCase().includes(q)
                                  || m.fam.toLowerCase().includes(q));
      body.replaceChildren(...(hit.length
        ? hit.map(m => modelRow(m))
        : [h('p', { class: 'rt-none' }, 'Nothing matches that.')]));
    } else if (side === 'routers') {
      body.replaceChildren(...ROUTERS.map(rt => row({
        name: rt.name, sub: rt.sub, on: ROUTE.pick === rt.id,
        /* one mark for all of them: which makes a rule happens to draw on
           is not a property of the rule, and four logos on a row was four
           things to look at before reading the name */
        mark: ROUTE_IC.auto,
        run: () => { ROUTE.pick = rt.id; closeMenu(); onPick(); },
      })));
    } else if (side === 'sugg') {
      body.replaceChildren(...taskOf().picks.map(id => modelRow(modelOf(id))));
    } else {
      body.replaceChildren(...MODELS.filter(m => m.fam === side).map(m => modelRow(m)));
    }
    /* nothing is lit until the pointer or the arrows land on a row — a
       highlight the moment it opens reads as a choice already made */
    at = -1;
    mark();
    body.scrollTop = 0;
  }

  const find = h('input', {
    class: 'rt-find-in', type: 'text', placeholder: 'Search',
    'aria-label': 'Search', spellcheck: 'false',
    oninput: (e) => { q = e.currentTarget.value.trim().toLowerCase(); paintBody(); },
    onkeydown: (e) => e.stopPropagation(),
  });

  const el = h('div', { class: 'menu rt', role: 'menu' },
    h('div', { class: 'rt-find' },
      h('span', { class: 'rt-find-ic', 'aria-hidden': 'true', html: FIND_IC }), find),
    h('div', { class: 'rt-panes' }, rail, body));
  paintRail(); paintBody();

  document.body.append(el);
  openMenu = el;
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
  el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
    ? Math.max(12, r.top - el.offsetHeight - 6) : r.bottom + 6) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
  requestAnimationFrame(() => find.focus());

  /* arrows move, Enter takes, Escape leaves — the same three keys the
     rest of the workspace's menus answer to */
  const scrollTo = () => rows[at]?.scrollIntoView({ block: 'nearest' });
  const onKey = (e) => {
    if (!document.body.contains(el)) return document.removeEventListener('keydown', onKey);
    if (!rows.length) return;
    /* the first arrow starts from whatever is chosen, or the top */
    const start = () => Math.max(0, rows.findIndex(r => r.getAttribute('aria-checked') === 'true'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      at = at < 0 ? start() : (at + 1) % rows.length;
      mark(); scrollTo();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      at = at < 0 ? start() : (at - 1 + rows.length) % rows.length;
      mark(); scrollTo();
    } else if (e.key === 'Enter' && at >= 0) { e.preventDefault(); rows[at].click(); }
  };
  document.addEventListener('keydown', onKey);
}


/* ── the same choice, shaped differently ──
   Two tabs instead of a rail: Models and Model routers are the two kinds
   of answer, and everything under whichever tab you are on is one flat
   list — the makes are headings in it rather than a place you navigate
   to. Fewer clicks to see everything; more scrolling to find one thing.
*/
function routeMenuTabs(anchor, onPick) {
  closeMenu();
  let q = '';
  let tab = isRouter(ROUTE.pick) ? 'routers' : 'models';
  let rows = [], at = 0;

  const body = h('div', { class: 'rt-scroll' });
  const tabs = h('div', { class: 'rtb-tabs', role: 'tablist' });

  const mark = () => rows.forEach((r, i) => r.dataset.at = String(i === at));

  const row = (o) => {
    const el = h('button', {
      class: 'rt-row', type: 'button', role: 'menuitemradio',
      'aria-checked': String(o.on),
      onclick: (e) => { e.stopPropagation(); o.run(); },
      onpointerenter: () => { at = rows.indexOf(el); mark(); },
    },
      o.mark ? h('span', { class: 'rt-row-ic', 'aria-hidden': 'true', html: o.mark }) : null,
      h('span', { class: 'rt-row-m' },
        h('span', { class: 'rt-row-n' }, o.name),
        h('span', { class: 'rt-row-s' }, o.sub)),
      h('span', { class: 'rt-row-r' },
        o.meta || null,
        h('span', { class: 'rt-tick', 'aria-hidden': 'true', html: ROUTE_IC.tick })));
    rows.push(el);
    return el;
  };

  const modelRow = (m) => row({
    name: m.name, on: ROUTE.pick === m.id, mark: FAM_IC[m.fam],
    sub: `$${m.in} in · $${m.out} out per 1M tokens`,
    run: () => { ROUTE.pick = m.id; closeMenu(); onPick(); },
  });

  /* the mark is on every row under it, so the heading is a word */
  const famHead = (f) => h('div', { class: 'rt-head' }, f);

  function paintTabs() {
    tabs.replaceChildren(...[['models', 'Model'], ['routers', 'Model Router']]
      .map(([id, label]) => h('button', {
        class: 'rtb-tab', type: 'button', role: 'tab',
        'aria-selected': String(tab === id),
        onclick: (e) => { e.stopPropagation(); tab = id; q = ''; find.value = '';
                          paintTabs(); paint(); },
      }, label)));
  }

  function paint() {
    rows = [];
    if (tab === 'routers') {
      const rs = ROUTERS.filter(rt => !q || rt.name.toLowerCase().includes(q));
      body.replaceChildren(...(rs.length ? rs.map(rt => row({
        name: rt.name, sub: rt.sub, on: ROUTE.pick === rt.id,
        mark: ROUTE_IC.auto,
        run: () => { ROUTE.pick = rt.id; closeMenu(); onPick(); },
      })) : [h('p', { class: 'rt-none' }, 'Nothing matches that.')]));
    } else {
      const hit = (m) => !q || m.name.toLowerCase().includes(q)
                            || m.fam.toLowerCase().includes(q);
      const out = [
        /* the three worth trying first, over the ten there are — the same
           group the other shape puts at the top of its rail */
        ...(q ? [] : [famHead('Suggested'),
                      ...taskOf().picks.map(id => modelRow(modelOf(id)))]),
        ...FAMILIES.flatMap(f => {
          const ms = MODELS.filter(m => m.fam === f && hit(m));
          return ms.length ? [famHead(f), ...ms.map(modelRow)] : [];
        }),
      ];
      body.replaceChildren(...(out.length ? out
        : [h('p', { class: 'rt-none' }, 'Nothing matches that.')]));
    }
    /* nothing is lit until the pointer or the arrows land on a row — a
       highlight the moment it opens reads as a choice already made */
    at = -1;
    mark();
    body.scrollTop = 0;
  }

  const find = h('input', {
    class: 'rt-find-in', type: 'text', placeholder: 'Search',
    'aria-label': 'Search', spellcheck: 'false',
    oninput: (e) => { q = e.currentTarget.value.trim().toLowerCase(); paint(); },
    onkeydown: (e) => e.stopPropagation(),
  });

  /* the two halves first, because they say what the panel is; the field
     under them searches whichever half you are in */
  const el = h('div', { class: 'menu rt rtb', role: 'menu' },
    tabs,
    h('div', { class: 'rt-find' },
      h('span', { class: 'rt-find-ic', 'aria-hidden': 'true', html: FIND_IC }), find),
    body);
  paintTabs(); paint();

  document.body.append(el);
  openMenu = el;
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
  el.style.top = (r.bottom + el.offsetHeight + 14 > innerHeight
    ? Math.max(12, r.top - el.offsetHeight - 6) : r.bottom + 6) + 'px';
  el.classList.add('opening');
  el.addEventListener('click', (e) => e.stopPropagation());
  requestAnimationFrame(() => find.focus());

  const scrollTo = () => rows[at]?.scrollIntoView({ block: 'nearest' });
  const onKey = (e) => {
    if (!document.body.contains(el)) return document.removeEventListener('keydown', onKey);
    if (!rows.length) return;
    /* the first arrow starts from whatever is chosen, or the top */
    const start = () => Math.max(0, rows.findIndex(r => r.getAttribute('aria-checked') === 'true'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      at = at < 0 ? start() : (at + 1) % rows.length;
      mark(); scrollTo();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      at = at < 0 ? start() : (at - 1 + rows.length) % rows.length;
      mark(); scrollTo();
    } else if (e.key === 'Enter' && at >= 0) { e.preventDefault(); rows[at].click(); }
  };
  document.addEventListener('keydown', onKey);
}

function modelRouterView() {
  const btn = h('button', {
    class: 'rt-btn', type: 'button', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); routeMenu(e.currentTarget, paint); },
  });
  /* the same choice in a second shape, so the two can be held against
     each other rather than described to each other */
  const btnB = h('button', {
    class: 'rt-btn', type: 'button', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); routeMenuTabs(e.currentTarget, paint); },
  });

  const paint = () => {
    const rule = isRouter(ROUTE.pick);
    /* replaceChildren does not filter what h() would — a null reaching it
       lands on the button as the word "null" */
    const face = () => [
      h('span', { class: 'rt-btn-ic', 'aria-hidden': 'true',
                  html: rule ? ROUTE_IC.auto : FAM_IC[modelOf(ROUTE.pick).fam] }),
      h('span', { class: 'rt-btn-l' }, routeLabel()),
      rule ? h('span', { class: 'rt-btn-x' }, modelOf(autoOn()).name) : null,
      h('span', { class: 'caret', 'aria-hidden': 'true' }),
    ].filter(Boolean);
    btn.replaceChildren(...face());
    btnB.replaceChildren(...face());
  };
  paint();

  return h('div', { class: 'mr' },
    h('header', { class: 'mr-top' },
      h('h1', { class: 'mr-title' }, 'Model router')),
    h('div', { class: 'mr-body' },
      h('div', { class: 'rt-demo' },
        h('div', { class: 'rt-two' },
          h('div', { class: 'rt-one' },
            btn, h('span', { class: 'rt-shape' }, 'Kinds on the left')),
          h('div', { class: 'rt-one' },
            btnB, h('span', { class: 'rt-shape' }, 'Two tabs, one list'))))));
}

register('model-router', modelRouterView);

register('meetings', meetingsView);
/* the empty page has an address of its own, so it can be sent to somebody */
register('meetings-setup', () => meetingsView({ empty: true }));

register('playbooks', playbooksView);

/* Clavia's other modules (modules.js, modules-work.js) */
register('vault', vaultView);
register('templates', templatesView);
register('skills', () => { if (!SHOW_SKILLS) { setTimeout(() => go('home'), 0); return h('div', {}); } return skillsView(); });
register('requests', requestsView);
register('intake', intakeView);
register('agents', () => agentsView());
register('settings', settingsView);
register('horizon', horizonView);
register('projects', projectsView);
register('matters', mattersView);


/* ── asking the draft for a change ────────────────────────────
   Typed on the artifact, answered in the conversation, returned as a
   version. The three have to be one act, or the thread stops being a
   record of what actually happened.
------------------------------------------------------------------ */

/* What a shorter version of the competitor update really looks like —
   the same four moves, the interpretation cut to one line. */
const MAIL_TIGHT = [
  { t: 'p', v: 'Team,' },
  { t: 'p', v: 'A fortnightly round-up. Four things actually changed.' },
  { t: 'ul', v: [
    '<b>Long context</b> — a million tokens is table stakes. The number that matters now is how much of the window a model uses well.',
    '<b>Inference prices</b> — down roughly 40% on mid-tier since spring. Things we ruled out on cost are worth costing again.',
    '<b>Open weights</b> — close enough on classification, extraction and routing to run ourselves on the high-volume paths.',
    '<b>Small models as routers</b> — good enough that a routing layer is worth building properly.',
  ] },
  { t: 'strong', v: 'Capability is commoditising. What you feed the model, and how you know it worked, is not.' },
  { t: 'p', v: 'That argues for staying where we are — Context Graph, evals, routing, cost visibility. Cheaper inference is a product decision rather than a finance one: we can afford to do more per request, and should choose what to spend it on.' },
  { t: 'p', v: 'Rohan' },
];

const MAIL_ASKS = [
  { match: /short|tight|trim|cut|brief|concise|crisp/,
    name: 'Tighter',
    say: 'Tightened. Same four things, the interpretation cut from three paragraphs to one, '
       + 'and the sign-off dropped.\n\n'
       + 'One thing I did not cut: that capability is commoditising while context and '
       + 'evaluation are not. It is the only sentence in here anyone will argue with, and '
       + 'without it the mail is four facts and no point.',
    body: () => ({ blocks: MAIL_TIGHT }) },
];

/* A reply takes the shape of the thing it was asked from. Asked inline, it
   comes back inline; asked on the canvas, it comes back as a card that
   opens there. Anything else makes the answer arrive somewhere the
   question was not. */
function askArtifact(a, q, inline) {
  if (!thread) {
    const ses = SESSIONS.find(x => x.artifact === a.id);
    if (ses) openSession(ses);
  }
  if (!thread) { toast('Asked · ' + q); return; }

  say('user', q, { context: { artifact: a.name, where: 'the draft' } });
  paintThread();

  const spec = MAIL_ASKS.find(x => x.match.test(q.toLowerCase()));
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();

  /* an edit to something already written is one step, not a research run */
  const step = { source: a.kind === 'mail' ? 'outlook' : a.kind,
                 query: spec ? spec.name : 'Applied your change', count: 'new version' };
  setTimeout(() => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); }, 320);
  setTimeout(() => { Object.assign(m.steps[0], step, { running: false }); renderBot(m); }, 1220);
  setTimeout(() => {
    m.thinking = false;
    const n = bumpVersion(a, { by: 'Assistant', name: spec ? spec.name : 'Your change' },
                          spec ? spec.body() : null);
    m.text = spec ? spec.say
      : 'Done — that is version ' + n + '. The one before it is still in the history.';
    if (inline) { m.inline = a.id; m.artifact = null; }
    else m.artifact = a.id;
    m.cites = null;
    m.steps[0].count = 'Version ' + (n || 2);
    if (m.traceOpen == null) m.traceOpen = false;
    renderBot(m);
    if (document.getElementById('main')?.dataset.artifact === 'open') openArtifact(a);
  }, 1760);
}


/* ── what happens after Send ──────────────────────────────────
   A toast is the wrong shape for the one act on this page that cannot be
   undone. It goes into the thread as a receipt: what went out, to whom,
   when, and the way through to it in the mailbox.
------------------------------------------------------------------ */
function sentCard(a, to, cc, when) {
  const names = (l) => l.map(p => p.n || p.e).join(', ');
  return h('div', { class: 'sent' },
    /* the mailbox it went to, not a tick — the line above already says it
       was sent, and a green tick over the word SENT says it twice */
    h('span', { class: 'sent-ic', 'aria-hidden': 'true', html: brandMark('outlook') }),
    h('div', { class: 'sent-main' },
      h('div', { class: 'sent-subj' }, a.subject || a.name),
      /* who it went to. The time was the third fact on a line that only
         needed the first, and it is on the message in the mailbox anyway. */
      h('div', { class: 'sent-meta' },
        'To ' + names(to) + (cc.length ? '  ·  Cc ' + names(cc) : ''))),
    h('button', { class: 'sent-go', type: 'button',
                  onclick: () => toast('Opening Outlook') }, 'View in Outlook'));
}

function sentArtifact(a, to, cc, inline) {
  const snap = { a, to: to.map(x => ({ ...x })), cc: cc.map(x => ({ ...x })),
                 when: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  if (!thread) {
    const ses = SESSIONS.find(x => x.artifact === a.id);
    if (ses) openSession(ses);
  }
  if (!inline) closeArtifact?.();
  if (!thread) { toast('Sent · ' + snap.to.map(x => x.n || x.e).join(', ')); return; }

  thread.messages.push({
    role: 'bot', steps: [], thinking: false, sent: snap,
    text: 'Sent. It is in your Outlook sent items, and the draft stays in Artifacts if you '
        + 'want to reuse the shape of it.',
  });
  paintThread();
}

/* ---------------- boot ---------------- */

async function boot() {
  // dev serves src/ unbuilt, so pull the sprite in; the build inlines it
  if (!document.getElementById('i-plus')) {
    const res = await fetch('sprite.html');
    document.body.insertAdjacentHTML('afterbegin', await res.text());
  }
  /* An email is not a screen in the product, so it does not get the
     product's shell — its own address, and nothing else on the page. */
  const asView = document.body.dataset.view
    || new URLSearchParams(location.search).get('view');
  if (asView === 'email') {
    document.getElementById('app').replaceWith(emailPage('app-pipeline'));
    return;
  }
  /* landing straight on the wall, the way a shared link does — its own
     address, so it is a link you can hand to somebody */
  const wall = asView === 'access'
    || new URLSearchParams(location.search).get('access') === 'request';
  mountNav();
  mountFolds();
  const boot = location.hash.slice(1);
  if (typeof skSync === 'function') skSync();
  if (!openByHash(boot)) go(boot || state.view || 'home');
  /* the connect page, served at an address of its own */
  if (document.body.dataset.connect === 'snowflake') setTimeout(snowflakeDialog, 80);
  if (document.body.dataset.connect === 'bigquery') setTimeout(bigqueryDialog, 80);
  if (wall) accessWall('app-pipeline');
  if (asView === '404' || new URLSearchParams(location.search).has('missing')) notFound();
}

boot();


/* ══════════════════  TWO FRAMES, ONE MEETING  ══════════════════
   The desktop shell runs this app twice — once in the window, once in
   the panel beside the call — so a recording started in one has to
   exist in the other, or stopping it lands you on a page that never
   heard it. The shell is the relay: whichever frame owns the clock
   broadcasts, the other mirrors.

   Only the owner keeps REC.timer. A mirror that kept its own would file
   every line a second time, so applying a state always clears it. */
let SYNC_MUTE = false;
const SYNC_BAGS = { REC_LINES, REC_EVER, REC_WRAP, REC_DONE, REC_GEN,
                    MEET_NOTES, MEET_SUM, MEET_GEN, MEET_MADE };

function syncTell() {
  if (SYNC_MUTE || parent === window) return;
  try {
    parent.postMessage({
      unify: 'sync',
      rec: { key: REC.key, on: REC.on, paused: REC.paused, ms: REC.ms,
             since: REC.since, i: REC.i, n: REC.n, cur: REC.cur, amp: REC.amp },
      bags: SYNC_BAGS,
    }, '*');
  } catch (_) { /* something in there would not clone; not worth failing over */ }
}

function syncApply(d) {
  SYNC_MUTE = true;
  clearInterval(REC.timer);
  Object.assign(REC, d.rec, { timer: null });
  for (const [name, bag] of Object.entries(SYNC_BAGS)) {
    const inc = d.bags && d.bags[name];
    if (!inc) continue;
    for (const k of Object.keys(bag)) delete bag[k];
    Object.assign(bag, inc);
  }
  SYNC_MUTE = false;
  recPaint?.();
}

addEventListener('message', (e) => {
  if (e.data && e.data.unify === 'sync') syncApply(e.data);
});

/* a frame that arrives late asks for the state rather than waiting for
   the next thing to happen in it */
if (parent !== window) {
  try { parent.postMessage({ unify: 'syncAsk' }, '*'); } catch (_) {}
  addEventListener('message', (e) => {
    if (e.data && e.data.unify === 'syncAsk' && REC.on) syncTell();
  });
}
