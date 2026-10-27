/* ==================================================================
   Matters — the sample matters, seeded once and then kept with
   everything else (state.mo). Dates are counted from the day the demo
   is first opened, so nothing reads as months overdue.

   A matter is a piece of legal work from opened to closed: its facts,
   tasks, dates, files and emails, decisions, money, people, updates and
   everything that happened on it. Orbis (made from an Intake request)
   is the one told in full.
================================================================== */

const MO_SEED_V = 2;

/* a day counted from today, kept as a date */
const moDay = (n) => {
  const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() + n);
  /* work does not fall due at the weekend: Saturday moves back to Friday, Sunday on to Monday */
  if (n) d.setDate(d.getDate() + (d.getDay() === 6 ? -1 : d.getDay() === 0 ? 1 : 0));
  return d.toISOString();
};
/* the same day, said the way people say it: "Wed 28 Oct" */
const moSay = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const moSayN = (n) => moSay(moDay(n));

/* matter stages, the same five for every kind of work */
const MO_STAGES = ['Started', 'Gathering facts', 'Talking to them', 'Hearing', 'Closed'];

/* the companies legal works for, for numbering matters by client */
const MO_CLIENTS = [['Lumen Analytics Ltd', 'LUM-UK'], ['Lumen Analytics India Pvt Ltd', 'LUM-IN'], ['Lumen Data GmbH', 'LUM-DE']];

/* first tasks Clavia suggests for a new matter, by kind of work */
const MO_FIRST = {
  Dispute:    ['Collect the facts and documents', 'Check what the contract says', 'Work out the most we could lose'],
  Contract:   ['Get the other side’s draft', 'Compare it with our playbook', 'Agree who signs'],
  Advice:     ['Collect the documents', 'Write the advice', 'Send it to the person who asked'],
  Employment: ['Collect HR records', 'Check the process followed', 'Agree next steps with HR'],
};
const MO_TYPES = Object.keys(MO_FIRST);

/* who gets which kind of matter, unless someone picks another owner (Settings › Matters) */
const MO_RULES_SEED = [
  { kind: 'Dispute', who: 'Grace Coleman', on: true },
  { kind: 'Contract', who: 'Matt Rivera', on: true },
  { kind: 'Advice', who: 'Aisha Rahman', on: true },
  { kind: 'Employment', who: 'James Whitfield', on: true },
];
/* what Clavia needs to know for each kind of matter; if the request doesn't say, it asks */
const MO_NEEDS = {
  Dispute: ['Other side', 'What they claim', 'Most we could lose', 'Court or hearing dates'],
  Contract: ['Other side', 'Deal value', 'Who signs for us', 'Target date'],
  Advice: ['The question', 'Who asked', 'When it’s needed'],
  Employment: ['The person', 'What they claim', 'Tribunal', 'Hearing date'],
};
/* people on the legal team who used to work somewhere, for the conflict check when a matter opens */
const MO_HISTORY = { 'Matt Rivera': ['Orbis Supplies Ltd', 'until 2025'], 'Elena Petrova': ['Harlow & Co', 'until 2022'] };

let moTaskN = 0;
const moT = (t, who, due, st = 'open', proof = null) => ({ id: 'tk' + (++moTaskN), t, who, due: due == null ? null : moDay(due), st, proof, proofFile: null });

function moSeed() {
  moTaskN = 0;
  const R = 'Roger Bennett';
  return [
    {
      id: 'MT-201', source: 'salesforce', title: 'Vantage renewal: their changes', type: 'Contract', owner: R, status: 'waiting', waitOn: 'Vantage', stage: 2,
      opened: moDay(-15), client: 0, asked: ['Sofia Marin', 'Sales'], from: 'RQ-1029',
      where: `Vantage sent back 14 changes to our renewal contract. 11 are fine. 3 need a decision: the cap on what they owe us, the payment terms and who owns new features. Roger replies by ${moSayN(0)}.`,
      facts: [['Other side', 'Vantage GmbH'], ['Deal value', '£420,000 over 3 years'], ['Our paper or theirs', 'Ours (enterprise template v4)'], ['Signs for us', 'Grace Coleman']],
      tasks: [moT('Reply to Vantage’s changes', R, 0), moT('Send Sofia a short summary of their changes', R, -3), moT('Check the cap on what they owe us with finance', 'Tom Becker', 1), moT('Review their 14 changes', R, -4, 'done')],
      dates: [{ d: moDay(0), what: 'Reply to Vantage’s changes', kind: 'Deadline' }, { d: moDay(11), what: 'Sofia’s target to sign', kind: 'Target' }],
      files: [{ kind: 'email', from: 'Vantage legal', name: 'Their changes (marked-up contract)', note: '', when: moDay(-5) },
        { kind: 'file', from: R, name: 'Our enterprise contract.docx', note: '', v: 4, when: moDay(-15) },
        { kind: 'file', from: 'Clavia', name: 'Their changes against our playbook.pdf', note: 'Made by Clavia', v: 2, when: moDay(-4) }],
      decisions: [{ what: 'Accept 30-day payment terms (not 60)', who: 'Grace Coleman', when: moDay(-3), why: 'In line with our payment policy; finance agreed.', on: 'Payment policy · Tom’s email', vis: 'shared', st: 'in' }],
      people: [[R, 'Owner'], ['Sofia Marin', 'Asked for it'], ['Grace Coleman', 'Signs for us']],
      money: null,
      links: [['Vantage GmbH', 'Customer 88120 · Salesforce'], ['Vantage — DACH renewal', 'Opportunity · Salesforce · read only'], ['Intake request RQ-1029', 'Intake']],
      chats: [{ t: 'What did we agree on liability caps with other enterprise customers?', who: R, when: moDay(-3) }],
      updates: [{ who: R, vis: 'shared', text: 'Their changes are mostly fine. 3 points need Grace. Aiming to reply on Monday.', when: moDay(-3) }],
      tl: [{ when: moDay(-15), kind: 'Matter', text: 'Roger opened the matter from intake request RQ-1029', who: R },
        { when: moDay(-5), kind: 'Email', text: 'Vantage sent 14 changes', who: 'Sofia Marin' },
        { when: moDay(-4), kind: 'Clavia', text: 'Clavia checked their changes against our playbook', who: 'Clavia' },
        { when: moDay(-3), kind: 'Decision', text: 'Grace said yes to 30-day payment terms', who: 'Grace Coleman' }],
      ask: [['Which of Vantage’s changes need a decision?', '3 of their 14 changes need a decision: (1) they cap what they owe us at 6 months of fees, we normally ask for 12; (2) 60-day payment terms, already settled at 30; (3) they want to own features built for them.', ['Their changes', 'Playbook', 'Decision: 30-day terms']],
        ['How did we handle caps with other customers?', 'In the last 5 enterprise deals we agreed 12 months of fees 4 times, and 9 months once (Harbor Retail, 2025). Nobody got below 9 months.', ['Repository: 5 enterprise contracts']],
        ['Draft a reply to Vantage', 'Thanks for your comments. We can accept 11 of the 14 changes. On the cap, we propose 12 months of fees, in line with our other enterprise customers. We are happy with 30-day payment terms. Features built for you stay ours, and you get a free licence to use them.', ['Their changes', 'Playbook']]],
      draft: 'Hi Sofia, Vantage sent 14 changes. 11 are fine; 3 need Grace (their cap, payment terms and who owns new features). I’ll reply by Monday.',
      keptOut: [], shares: [],
    },
    {
      id: 'MT-195', source: 'manual', title: 'Former employee claim: J. Rowe', type: 'Employment', owner: 'James Whitfield', status: 'hearing', stage: 3, private: true,
      opened: moDay(-55), client: 0, asked: ['James Whitfield', 'Employment'], from: null,
      where: `J. Rowe says he was unfairly dismissed. The tribunal hearing is on ${moSayN(17)}. Our witness statements are drafted; James is checking them with HR this week.`,
      facts: [['Other side', 'J. Rowe (former employee)'], ['What they claim', 'Unfair dismissal'], ['Most we could lose', '£38,000, plus costs'], ['Tribunal', 'London Central Employment Tribunal']],
      tasks: [moT('Finalise witness statements with HR', 'James Whitfield', 10), moT('Send our documents to the tribunal', 'James Whitfield', 14), moT('Collect the dismissal letter and notes', 'James Whitfield', -42, 'done')],
      dates: [{ d: moDay(17), what: 'Tribunal hearing, 10:00', kind: 'Hearing' }, { d: moDay(14), what: 'Last day to send our documents', kind: 'Deadline' }],
      files: [{ kind: 'file', from: 'HR', name: 'Dismissal letter and meeting notes.pdf', note: '', when: moDay(-47) },
        { kind: 'email', from: 'Tribunal', name: 'Notice of hearing', note: '', when: moDay(-26) },
        { kind: 'file', from: 'James Whitfield', name: 'Draft witness statements.docx', note: '', v: 3, when: moDay(-7) }],
      decisions: [{ what: 'Don’t offer to settle before the hearing', who: R, when: moDay(-25), why: 'The notes show a fair process was followed.', on: 'Meeting notes · HR timeline', vis: 'legal', st: 'in' }],
      people: [['James Whitfield', 'Owner'], [R, 'Can see it (head of legal)']],
      money: { budget: 12000, billed: 4200, okd: 0, expected: 5000, firm: 'Pryor & Lane' },
      links: [['J. Rowe', 'Former employee · Workday · restricted'], ['Notice of hearing', 'Repository']],
      chats: [{ t: 'What are the weak points in our dismissal process?', who: 'James Whitfield', when: moDay(-13) }],
      updates: [{ who: 'James Whitfield', vis: 'legal', text: 'Hearing confirmed. Statements are being checked with HR.', when: moDay(-7) }],
      tl: [{ when: moDay(-55), kind: 'Matter', text: 'James opened the matter (private)', who: 'James Whitfield' },
        { when: moDay(-26), kind: 'Email', text: 'The tribunal sent the notice of hearing', who: 'James Whitfield' },
        { when: moDay(-25), kind: 'Decision', text: 'Roger decided not to offer to settle yet', who: R },
        { when: moDay(-7), kind: 'File', text: 'Draft witness statements added', who: 'James Whitfield' }],
      ask: [['What are the weak points in our case?', `Two: the second meeting notes are unsigned, and the appeal was heard by the same manager. James has a task to finalise witness statements with HR by ${moSayN(10)}.`, ['Meeting notes', 'HR timeline']],
        ['What must we send the tribunal, and when?', `Our documents by ${moSayN(14)}: the dismissal letter, the meeting notes and the witness statements.`, ['Notice of hearing']]],
      draft: `The hearing is confirmed for ${moSayN(17)}. Witness statements are with HR for checking.`,
      keptOut: [], shares: [],
    },
    {
      id: 'MT-188', source: 'teams', title: '“Lumen” trade mark in India', type: 'Dispute', owner: 'Elena Petrova', status: 'open', stage: 3,
      opened: moDay(-104), client: 1, asked: ['Priya Shah', 'Partnerships'], from: 'RQ-0990',
      where: `A local company is using a name close to “Lumen” in India. We asked the Delhi High Court to stop them. The next hearing is on ${moSayN(9)}.`,
      facts: [['Other side', 'Lumin Tech Pvt Ltd'], ['What we want', 'An order to stop them using the name'], ['Court', 'Delhi High Court'], ['Our local lawyers', 'Sen & Rao, New Delhi']],
      tasks: [moT('Send Sen & Rao the sales figures for India', 'Elena Petrova', 4), moT('Prepare for the hearing', 'Elena Petrova', 8), moT('File the case', 'Elena Petrova', -98, 'done')],
      dates: [{ d: moDay(9), what: 'Delhi High Court hearing, 10:30', kind: 'Hearing' }],
      files: [{ kind: 'email', from: 'Sen & Rao', name: 'Court listing for the hearing', note: '', when: moDay(-2) },
        { kind: 'file', from: 'Elena Petrova', name: 'Our trade mark certificate (India).pdf', note: '', when: moDay(-104) }],
      decisions: [{ what: 'Go to court rather than send another letter', who: R, when: moDay(-102), why: 'They ignored two letters.', on: 'Our letters of June', vis: 'shared', st: 'in' }],
      people: [['Elena Petrova', 'Owner'], [R, 'Can see it (head of legal)'], ['Priya Shah', 'Asked for it']],
      money: { budget: 9000, billed: 3100, okd: 900, expected: 2500, firm: 'Sen & Rao' },
      links: [['“Lumen” trade mark, India', 'Repository'], ['Sen & Rao invoices', 'SAP · read only']],
      chats: [],
      updates: [{ who: 'Elena Petrova', vis: 'shared', text: `The court has listed the case for ${moSayN(9)}.`, when: moDay(-2) }],
      tl: [{ when: moDay(-104), kind: 'Matter', text: 'Elena opened the matter from RQ-0990', who: 'Elena Petrova' },
        { when: moDay(-102), kind: 'Decision', text: 'Roger decided to go to court', who: R },
        { when: moDay(-98), kind: 'File', text: 'Case filed at the Delhi High Court', who: 'Elena Petrova' },
        { when: moDay(-2), kind: 'Key date', text: `Hearing listed for ${moSayN(9)}`, who: 'Elena Petrova' }],
      ask: [['What happens at the hearing?', `The court decides whether to order Lumin Tech to stop using the name until the full case is heard. Sen & Rao need our India sales figures by ${moSayN(4)}.`, ['Court listing', 'Task: sales figures']],
        ['How much have we spent so far?', '£3,100 paid and £900 OK’d, of a £9,000 budget. Sen & Rao expect another £2,500 up to the hearing.', ['Money', 'Invoices (SAP)']]],
      draft: `The Delhi High Court hearing is on ${moSayN(9)}. Sen & Rao need the India sales figures by ${moSayN(4)}.`,
      keptOut: [], shares: [],
    },
    {
      id: 'MT-190', source: 'outlook', title: 'Ironclad warehousing agreement', type: 'Contract', owner: 'Matt Rivera', status: 'signing', stage: 3,
      opened: moDay(-10), client: 0, asked: ['Tom Becker', 'Procurement'], from: 'RQ-1038',
      where: `Everything is agreed. Grace signed for us, and Ironclad says they will sign by ${moSayN(2)}.`,
      facts: [['Other side', 'Ironclad Logistics'], ['What it is', 'Warehousing agreement, UK and Ireland'], ['How long', '2 years'], ['Signs for us', 'Grace Coleman (signed)']],
      tasks: [moT('Ironclad to sign', 'Tom Becker', 2), moT('Send for signature', 'Matt Rivera', -4, 'done')],
      dates: [{ d: moDay(2), what: 'Ironclad to sign', kind: 'Deadline' }],
      files: [{ kind: 'file', from: 'Matt Rivera', name: 'Final warehousing agreement.docx', note: '', v: 5, when: moDay(-4) },
        { kind: 'file', from: 'Signing', name: 'Signed by Lumen.pdf', note: '', when: moDay(-4) }],
      decisions: [],
      people: [['Matt Rivera', 'Owner'], ['Tom Becker', 'Asked for it'], ['Grace Coleman', 'Signs for us']],
      money: null,
      links: [['Ironclad Logistics', 'Supplier 4410 · SAP'], ['Intake request RQ-1038', 'Intake']],
      chats: [],
      updates: [{ who: 'Matt Rivera', vis: 'shared', text: 'Sent for signature. Ironclad says they’ll sign this week.', when: moDay(-4) }],
      tl: [{ when: moDay(-10), kind: 'Matter', text: 'Matt opened the matter from RQ-1038', who: 'Matt Rivera' },
        { when: moDay(-4), kind: 'Signing', text: 'Sent for signature; Grace signed', who: 'Grace Coleman' }],
      ask: [['Has Ironclad signed yet?', `Not yet. Grace signed ${moSayN(-4)}; Ironclad said they would sign by ${moSayN(2)}. Clavia will remind Tom the day before.`, ['Signing', 'Latest update']]],
      draft: `Everything is agreed and Grace has signed. Ironclad says they will sign by ${moSayN(2)}.`,
      keptOut: [], shares: [],
    },
    {
      id: 'MT-176', source: 'slack', title: 'Data protection review: Brindle Health', type: 'Advice', owner: 'Aisha Rahman', status: 'open', stage: 1,
      opened: moDay(-7), client: 2, asked: ['Daniel Okafor', 'Sales'], from: 'RQ-1033',
      where: `Brindle Health wants to share patient data with us for a pilot. Aisha is reviewing their data agreement. Our comments are due ${moSayN(3)}.`,
      facts: [['Other side', 'Brindle Health'], ['What it is', 'Data sharing agreement for a pilot'], ['Data', 'Patient data (extra care needed)'], ['Needs', 'A data protection check before signing']],
      tasks: [moT('Send our comments', 'Aisha Rahman', 3), moT('Check Brindle’s security certificate', 'Aisha Rahman', -5), moT('Ask Brindle where the data is stored', 'Daniel Okafor', 1)],
      dates: [{ d: moDay(3), what: 'Send our comments', kind: 'Deadline' }],
      files: [{ kind: 'email', from: 'Brindle Health', name: 'Their data sharing agreement', note: '', when: moDay(-7) }],
      decisions: [],
      people: [['Aisha Rahman', 'Owner'], ['Daniel Okafor', 'Asked for it']],
      money: null,
      links: [['Brindle Health', 'Partner 5120 · Salesforce'], ['Intake request RQ-1033', 'Intake']],
      chats: [{ t: 'What must a data sharing agreement for patient data include?', who: 'Aisha Rahman', when: moDay(-6) }],
      updates: [],
      tl: [{ when: moDay(-7), kind: 'Matter', text: 'Aisha opened the matter from RQ-1033', who: 'Aisha Rahman' },
        { when: moDay(-6), kind: 'Chat', text: 'Aisha asked Clavia about data sharing agreements', who: 'Aisha Rahman' }],
      ask: [['What must a patient data agreement include?', 'Why the data is shared, what data, how long it is kept, where it is stored, how it is kept safe, and who to tell if something goes wrong. Brindle’s draft doesn’t say where the data is stored or how long it is kept.', ['Their data sharing agreement', 'Data protection checklist']]],
      draft: `We are reviewing Brindle’s data agreement. Our comments go back by ${moSayN(3)}; we need to know where the data is stored.`,
      keptOut: [], shares: [],
    },
  ];
}

/* the Orbis matter, made from Tom's Intake request */
function moOrbis(rqId, keep, priv) {
  const R = USER.name, me = R.split(' ')[0];
  const all = [moT('Collect the supplier contract and all invoices', R, null, 'done'),
    moT('Get delivery records for May and June from Tom', 'Tom Becker', 2, 'open', 'the delivery records file'),
    moT('Check what the contract says about late delivery', R, 3)];
  return {
    id: 'MT-208', source: 'outlook', title: 'Orbis supplier dispute', type: 'Dispute', owner: R, status: 'open', stage: 1, private: !!priv,
    opened: mxNow(), client: 0, asked: ['Tom Becker', 'Finance'], from: rqId, orbis: true,
    where: 'Orbis says we owe £64,000 for unpaid invoices. We held back payment because two deliveries were late.',
    facts: [['Other side', 'Orbis Supplies Ltd'], ['What they claim', '£64,000 in unpaid invoices'], ['Most we could lose', '£64,000, plus their costs'],
      ['Contract', 'Orbis supplier contract, signed March 2025'], ['Late deliveries', '2 deliveries, in May and June']],
    tasks: all.filter((_, i) => keep[i] !== false),
    dates: [],
    files: [{ kind: 'file', from: 'Clavia', name: 'Orbis supplier contract (signed 2025).pdf', note: 'Found in Repository', when: mxNow() },
      { kind: 'email', from: 'Tom Becker', name: 'Orbis invoices and supplier contract', note: '3 files', when: mxNow() }],
    decisions: [{ what: 'Hold back £22,800 for the two late deliveries', who: R, when: moDay(-5), why: 'Section 6.3 lets us hold back payment for deliveries more than 14 days late. Both were 3 and 5 weeks late.', on: 'Contract section 6.3 · Delivery records (May, June) · Tom’s emails', vis: 'shared', st: 'in' },
      { what: 'We can settle for up to £58,000', who: R, when: moDay(-4), why: 'Cheaper than a hearing. Keeps the supplier relationship.', on: 'Most we could lose: £64,000 plus costs', vis: 'legal', st: 'in' }],
    people: [[R, 'Owner'], ['Tom Becker', 'Asked for it'], ['Grace Coleman', 'Works on it']],
    money: { budget: 15000, billed: 0, okd: 0, expected: 6500, firm: '' },
    links: [['Orbis Supplies Ltd', 'Supplier 40213 · SAP'], ['8 unpaid invoices, £64,000', 'SAP · read only'], ['Orbis supplier contract (2025)', 'Repository'], [`Intake request ${rqId}`, 'Intake']],
    chats: [],
    updates: [{ who: R, vis: 'legal', text: 'Asked Tom for the delivery records for May and June.', when: mxNow() }],
    tl: [{ when: moDay(-15), kind: 'Email', text: 'Tom Becker asked legal: Orbis says we owe them £64,000', who: 'Tom Becker' },
      { when: moDay(-5), kind: 'Decision', text: `${me} decided to hold back £22,800 for the two late deliveries`, who: R },
      { when: moDay(-4), kind: 'Decision', text: `${me} set the most we can settle for: £58,000`, who: R },
      { when: mxNow(), kind: 'Matter', text: `${me} opened the matter from request ${rqId}`, who: R }],
    ask: [['Where are we, in two lines?', 'Orbis claims £64,000 for 8 unpaid invoices. We held back payment because two deliveries were late; we are now getting the delivery records from Tom to back that up.', ['Key facts', 'Tom’s email', 'Task: delivery records']],
      ['Can we hold back payment for the late deliveries?', 'Yes, but only for deliveries more than 14 days late. Section 6.3 lets us hold back payment for a late delivery. The May delivery was 3 weeks late, so it counts. The June delivery needs the delivery records to confirm how late it was.', ['Contract section 6.3', 'Decision: hold back £22,800', 'Invoices (SAP)']],
      ['What is still open before we can settle?', `2 tasks are open: Tom’s delivery records for May and June (due ${moSayN(2)}, needs proof), and checking the late-delivery wording (${me}, ${moSayN(3)}). The most we can settle for is £58,000.`, ['Tasks', 'Decision: settlement limit']],
      ['Draft an update for Tom', `Hi Tom, quick update on Orbis: we’re checking how late the May and June deliveries were, as that decides how much we can hold back. Could you send the delivery records by ${moSayN(2)}? Thanks, ${me}`, ['Latest activity', 'Task: delivery records']]],
    draft: `Hi Tom, quick update on Orbis: we’re checking how late the May and June deliveries were, as that decides how much we can hold back. Could you send the delivery records by ${moSayN(2)}? Thanks, ${me}`,
    keptOut: [], shares: [],
  };
}

/* Tom's request about Orbis, put into Intake once so a matter can be opened from it */
const MO_ORBIS_ASK = 'Orbis Supplies emailed asking for £64,000 for invoices we never paid. We held back payment because two deliveries were late (May and June). Invoices and the supplier contract attached. Can legal take this?';
function moIntakeSeed(d) {
  if (d.orbisRq) return;
  const id = 'RQ-' + (Math.max(1037, ...d.intake.map(q => +q.id.split('-')[1] || 0)) + 1);
  const due = new Date(); due.setDate(due.getDate() + 1); due.setHours(17, 0, 0, 0);
  const made = new Date(Date.now() - 2 * 36e5).toISOString();
  d.intake.unshift({ id, title: 'Orbis says we owe them £64,000', deal: null, counterparty: 'Orbis Supplies Ltd', type: 'Advice', team: 'Finance',
    attorney: null, status: 'new', due: due.toISOString(), urgent: true, updated: made, created: made, submitter: 'Tom Becker', source: 'outlook', where: 'legal@lumen.io',
    detail: MO_ORBIS_ASK, files: ['Orbis invoices.pdf', 'Orbis supplier contract.pdf'],
    activity: [{ who: 'Tom Becker', ev: 'submit', what: 'emailed legal@lumen.io', via: 'outlook', msg: { subject: 'Orbis says we owe them £64,000', body: MO_ORBIS_ASK }, when: made },
      { who: 'Clavia', ev: 'clavia', what: 'opened this request from the email', when: made }] });
  d.orbisRq = id;
}
/* step 4: the demo matters live in Intake as requests that are matters, each with its own request number */
const MO_REQ_OF = { 'MT-201': ['RQ-1029', 'Contract review', 'Sales'], 'MT-195': ['RQ-1027', 'Advice', 'Legal'], 'MT-188': ['RQ-0990', 'Advice', 'Partnerships'],
  'MT-190': ['RQ-1031', 'Contract review', 'Procurement'], 'MT-176': ['RQ-1033', 'Privacy', 'Sales'] };
function moMattersSeed(d) {
  if (d.mattersInIntakeV === 1) return;
  for (const m of moSeed()) {
    const [id, type, team] = MO_REQ_OF[m.id];
    if (d.intake.some(r => r.id === id)) continue;
    const next = [...m.tasks.filter(t => t.st === 'open' && t.due).map(t => t.due), ...m.dates.map(x => x.d)].sort()[0] || null;
    const r = { id, title: m.title, deal: null, counterparty: (m.facts.find(f => f[0] === 'Other side') || [])[1] || null, type, team,
      attorney: m.owner, status: m.status === 'waiting' ? 'waiting' : 'progress', due: next, urgent: false, updated: m.tl[m.tl.length - 1].when, created: m.opened,
      submitter: m.asked[0], source: m.source === 'manual' ? null : m.source, detail: m.where, files: [], triaged: true, stage: m.stage, mt: {} };
    for (const k of MO_PARTS) if (m[k] !== undefined && k !== 'stage') r.mt[k] = structuredClone(m[k]);
    r.mt.opened = m.opened;
    /* what happened on the matter, in the request's own Activity */
    r.activity = [{ who: m.asked[0], ev: 'submit', what: 'asked legal for this', when: m.opened },
      ...m.tl.map(e => { const first = e.who.split(' ')[0];
        return e.text.startsWith(first + ' ') ? { who: e.who, what: e.text.slice(first.length + 1), when: e.when } : { who: 'Clavia', ev: 'clavia', what: 'noted: ' + e.text, when: e.when }; })];
    d.intake.push(r);
  }
  d.mattersInIntakeV = 1;
}
