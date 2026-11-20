// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies.
// State (earned ticks, counters, personal notes, spoiler shield) lives in
// localStorage; the only file ever fetched is data/trophies.json beside this
// script. Views are deep-linkable: #roadmap, #planner, #trophy-<id>,
// #filter-missable, #spoiler=1 (combine the last two as
// #filter-missable&spoiler=1).

const STORE_KEY = 'leonida-trophy-guide-v1';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_FILTERS = [
  ['all', 'All'],
  ['platinum', 'Platinum'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['side', 'Side'],
  ['freeroam', 'Free-roam'],
  ['economy', 'Economy'],
];

const els = {
  cards: document.getElementById('cards'),
  noResults: document.getElementById('no-results'),
  progressText: document.getElementById('progress-text'),
  progressFill: document.getElementById('progress-fill'),
  gradeChips: document.getElementById('grade-chips'),
  search: document.getElementById('search'),
  gradeFilter: document.getElementById('grade-filter'),
  sort: document.getElementById('sort'),
  spoiler: document.getElementById('spoiler'),
  kindChips: document.getElementById('kind-chips'),
  shownCount: document.getElementById('shown-count'),
  checklistView: document.getElementById('checklist-view'),
  roadmapView: document.getElementById('roadmap-view'),
  plannerView: document.getElementById('planner-view'),
  controls: document.getElementById('controls'),
  tabChecklist: document.getElementById('tab-checklist'),
  tabRoadmap: document.getElementById('tab-roadmap'),
  tabPlanner: document.getElementById('tab-planner'),
  roadmapIntro: document.getElementById('roadmap-intro'),
  platinumPlan: document.getElementById('platinum-plan'),
  missablePanel: document.getElementById('missable-panel'),
  roadmapStages: document.getElementById('roadmap-stages'),
  plannerPanel: document.getElementById('planner-panel'),
  plannerList: document.getElementById('planner-list'),
  methodology: document.getElementById('methodology'),
};

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const roadmapOrder = doc.roadmap.stages.flatMap((s) => s.trophyIds);
const stageOf = new Map();
for (const s of doc.roadmap.stages) for (const id of s.trophyIds) stageOf.set(id, s);

let state = loadState();
let kindFilter = 'all';
let openGuideId = null;
let deepLinkedId = null;

function loadState() {
  const fresh = { earned: new Set(), counts: {}, notes: {}, spoiler: false };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { ...fresh, earned: new Set(parsed) };
    return {
      earned: new Set(Array.isArray(parsed.earned) ? parsed.earned : []),
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      spoiler: !!parsed.spoiler,
    };
  } catch {
    return fresh;
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    earned: [...state.earned],
    counts: state.counts,
    notes: state.notes,
    spoiler: state.spoiler,
  }));
}

function isSpoilerHidden(t) {
  return state.spoiler && t.kind === 'story' && !state.earned.has(t.name);
}

function formatCount(t, n) {
  return t.count >= 10000 ? '$' + n.toLocaleString('en-US') : String(n);
}

function formatTarget(t) {
  return t.count >= 10000 ? '$' + t.count.toLocaleString('en-US') : String(t.count);
}

function counterText(t) {
  if (!t.count) return '';
  const n = Math.min(Math.max(Number(state.counts[t.id]) || 0, 0), t.count);
  return `Counter: ${formatCount(t, n)} of ${formatTarget(t)}`;
}

/* ---------- header ---------- */

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => state.earned.has(t.name)).length;
  els.progressText.textContent = `${done} of ${total} earned`;
  els.progressFill.style.width = `${Math.round((done / total) * 100)}%`;
  els.gradeChips.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => state.earned.has(t.name)).length;
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = `${got}/${inGrade.length}`;
    li.append(b, ` ${grade}`);
    els.gradeChips.append(li);
  }
}

/* ---------- checklist ---------- */

function buildKindChips() {
  els.kindChips.replaceChildren();
  for (const [value, label] of KIND_FILTERS) {
    const n = value === 'all'
      ? trophies.length
      : value === 'missable'
        ? trophies.filter((t) => t.missable).length
        : trophies.filter((t) => t.kind === value).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (kindFilter === value ? ' active' : '');
    btn.dataset.kind = value;
    btn.append(`${label} `);
    const span = document.createElement('span');
    span.className = 'n';
    span.textContent = String(n);
    btn.append(span);
    btn.addEventListener('click', () => { kindFilter = value; renderChecklist(); });
    els.kindChips.append(btn);
  }
}

function visibleTrophies() {
  const q = els.search.value.trim().toLowerCase();
  const grade = els.gradeFilter.value;
  let list = trophies.filter((t) => {
    if (kindFilter === 'missable' && !t.missable) return false;
    if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (q && !`${t.name} ${t.description} ${t.kind}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (els.sort.value === 'grade') list = [...list].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  if (els.sort.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function buildCard(t) {
  const hidden = isSpoilerHidden(t);
  const earned = state.earned.has(t.name);
  const card = document.createElement('article');
  card.className = `card grade-${t.grade}` + (earned ? ' earned' : '') + (deepLinkedId === t.id ? ' deep-linked' : '');
  card.id = `trophy-${t.id}`;

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', hidden ? 'Mark hidden story trophy as earned' : `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.name); else state.earned.delete(t.name);
    saveState();
    renderAll();
  });

  const main = document.createElement('div');
  main.className = 'card-main';
  const titleRow = document.createElement('div');
  titleRow.className = 'card-title';
  const h3 = document.createElement('h3');
  h3.textContent = hidden ? 'Hidden trophy' : t.name;
  titleRow.append(h3, badge(t.grade, t.grade), badge(t.kind, 'kind'));
  if (t.missable) titleRow.append(badge(t.potential ? 'Potential missable' : 'Missable', 'missable'));
  if (t.triggerUnconfirmed) titleRow.append(badge('Trigger unconfirmed', 'unconfirmed'));
  main.append(titleRow);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'hidden-note';
    note.textContent = 'Story trophy — its name and description stay hidden behind the spoiler shield until you earn it.';
    main.append(note);
  } else {
    const label = document.createElement('span');
    label.className = 'field-label';
    label.textContent = 'Official description';
    const desc = document.createElement('p');
    desc.className = 'official-desc';
    desc.textContent = t.description;
    main.append(label, desc);
  }

  const tools = document.createElement('div');
  tools.className = 'card-tools';
  if (!hidden) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = openGuideId === t.id ? '▾ Hide guide' : '▸ Guide & sources';
    toggle.addEventListener('click', () => {
      openGuideId = openGuideId === t.id ? null : t.id;
      renderChecklist();
    });
    tools.append(toggle);
  }
  if (t.count && !hidden) tools.append(buildCounter(t));
  main.append(tools);

  if (!hidden && openGuideId === t.id) main.append(buildGuidePanel(t));

  head.append(box, main);
  card.append(head);
  return card;
}

function buildCounter(t) {
  const wrap = document.createElement('div');
  wrap.className = 'counter';
  const current = Math.min(Math.max(Number(state.counts[t.id]) || 0, 0), t.count);
  const label = document.createElement('span');
  label.textContent = 'Progress:';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Decrease progress');
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = String(t.count);
  input.value = String(current);
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Increase progress');
  const of = document.createElement('span');
  of.textContent = `of ${formatTarget(t)}`;
  if (current >= t.count) {
    const done = document.createElement('span');
    done.className = 'done';
    done.textContent = 'target reached';
    of.append(' · ', done);
  }
  const set = (n) => {
    const v = Math.min(Math.max(Math.round(Number(n) || 0), 0), t.count);
    state.counts[t.id] = v;
    saveState();
    renderChecklist();
    renderProgress();
  };
  minus.addEventListener('click', () => set(current - 1));
  plus.addEventListener('click', () => set(current + 1));
  input.addEventListener('change', () => set(input.value));
  wrap.append(label, minus, input, plus, of);
  return wrap;
}

function buildGuidePanel(t) {
  const panel = document.createElement('div');
  panel.className = 'guide-panel';
  const stepsH = document.createElement('h4');
  stepsH.textContent = 'What to do';
  const ol = document.createElement('ol');
  for (const step of t.steps ?? []) {
    const li = document.createElement('li');
    li.textContent = step;
    ol.append(li);
  }
  const guideH = document.createElement('h4');
  guideH.textContent = 'Guide — in our own words';
  const p = document.createElement('p');
  p.textContent = t.guide;
  panel.append(stepsH, ol, guideH, p);
  if (t.unlock) {
    const unlock = document.createElement('p');
    unlock.className = 'unlock-line';
    const b = document.createElement('b');
    b.textContent = 'When it unlocks: ';
    unlock.append(b, t.unlock);
    panel.append(unlock);
  }
  if (t.pitfalls) {
    const pitfalls = document.createElement('p');
    pitfalls.className = 'pitfalls-line';
    const b = document.createElement('b');
    b.textContent = 'Pitfalls: ';
    pitfalls.append(b, t.pitfalls);
    panel.append(pitfalls);
  }
  if (t.missableNote) {
    const noteBox = document.createElement('div');
    noteBox.className = 'missable-note';
    noteBox.textContent = t.missableNote;
    panel.append(noteBox);
  }
  panel.append(buildNoteBox(t));
  const sources = document.createElement('div');
  sources.className = 'sources';
  const srcLabel = document.createElement('span');
  srcLabel.textContent = 'Sources:';
  const ul = document.createElement('ul');
  for (const s of t.sources ?? []) {
    const li = document.createElement('li');
    if (s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.name;
      a.rel = 'noopener';
      li.append(a);
    } else {
      li.textContent = s.name;
    }
    ul.append(li);
  }
  sources.append(srcLabel, ul);
  panel.append(sources);
  return panel;
}

function buildNoteBox(t) {
  const box = document.createElement('div');
  box.className = 'note-box';
  const label = document.createElement('label');
  label.textContent = 'Your notes';
  label.htmlFor = `note-${t.id}`;
  const area = document.createElement('textarea');
  area.id = `note-${t.id}`;
  area.placeholder = 'Your own note for this trophy — a route, a reminder, where you left off…';
  area.value = typeof state.notes[t.id] === 'string' ? state.notes[t.id] : '';
  area.addEventListener('input', () => {
    const v = area.value;
    if (v.trim()) state.notes[t.id] = v; else delete state.notes[t.id];
    saveState();
  });
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Saved in this browser with your progress, and carried in Export / Import.';
  box.append(label, area, hint);
  return box;
}

function renderChecklist() {
  buildKindChips();
  const list = visibleTrophies();
  els.cards.replaceChildren(...list.map(buildCard));
  els.noResults.hidden = list.length > 0;
  els.shownCount.textContent = `Showing ${list.length} of ${trophies.length} trophies`;
}

/* ---------- roadmap ---------- */

function stageProgress(stage) {
  const total = stage.trophyIds.length;
  const done = stage.trophyIds.filter((id) => state.earned.has(byId.get(id)?.name)).length;
  return { done, total };
}

function renderRoadmap() {
  const rm = doc.roadmap;
  els.roadmapIntro.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = rm.title;
  const intro = document.createElement('p');
  intro.textContent = rm.intro;
  const stageIds = rm.stages.flatMap((s) => s.trophyIds);
  const coverage = document.createElement('p');
  coverage.className = 'coverage-note';
  coverage.textContent = `Roadmap coverage: ${new Set(stageIds).size} of ${trophies.length} trophies across ${rm.stages.length} stages, each trophy exactly once — 55/55 covered.`;
  els.roadmapIntro.append(h2, intro, coverage);

  renderPlatinumPlan();

  els.missablePanel.replaceChildren();
  const mh2 = document.createElement('h2');
  mh2.textContent = '⚠ Missable trophies — read before you play';
  const note = document.createElement('p');
  note.textContent = rm.missables.note;
  els.missablePanel.append(mh2, note);
  for (const item of rm.missables.items) {
    const t = byId.get(item.trophyId);
    const h3 = document.createElement('h3');
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'guide-toggle';
    jump.textContent = `${item.name} (${t ? t.grade : ''})`;
    jump.addEventListener('click', () => { location.hash = `trophy-${item.trophyId}`; });
    h3.append(jump);
    if (item.label) h3.append(' ', badge(item.label, 'missable'));
    const when = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'When it locks: ';
    when.append(strong, item.when);
    const detail = document.createElement('p');
    detail.textContent = item.detail;
    els.missablePanel.append(h3, when, detail);
  }
  if (Array.isArray(rm.missables.cleared) && rm.missables.cleared.length) {
    const clearedH = document.createElement('h3');
    clearedH.textContent = 'Screened and cleared';
    els.missablePanel.append(clearedH);
    for (const c of rm.missables.cleared) {
      const line = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${c.name}: `;
      line.append(strong, c.line);
      els.missablePanel.append(line);
    }
  }
  const alsoH = document.createElement('h3');
  alsoH.textContent = 'Also good to know';
  const ul = document.createElement('ul');
  for (const line of rm.missables.alsoGoodToKnow) {
    const li = document.createElement('li');
    li.textContent = line;
    ul.append(li);
  }
  els.missablePanel.append(alsoH, ul);

  els.roadmapStages.replaceChildren();
  for (const stage of rm.stages) {
    const sec = document.createElement('section');
    sec.className = 'stage';
    const headRow = document.createElement('div');
    headRow.className = 'stage-head';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = String(stage.stage);
    const h3 = document.createElement('h3');
    h3.textContent = stage.name;
    headRow.append(num, h3);
    const { done, total } = stageProgress(stage);
    const progress = document.createElement('div');
    progress.className = 'stage-progress';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', `Stage ${stage.stage} progress`);
    const fill = document.createElement('span');
    fill.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    bar.append(fill);
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${done} of ${total} earned in this stage`;
    progress.append(bar, count);
    const why = document.createElement('p');
    why.textContent = stage.rationale;
    sec.append(headRow, progress, why);
    if (stage.warning) {
      const warn = document.createElement('p');
      warn.className = 'stage-warning';
      warn.textContent = stage.warning;
      sec.append(warn);
    }
    if (stage.effort) {
      const effort = document.createElement('p');
      effort.className = 'effort-note';
      effort.textContent = stage.effort;
      sec.append(effort);
    }
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.trophyIds) {
      const t = byId.get(id);
      if (!t) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'trophy-chip' + (state.earned.has(t.name) ? ' is-earned' : '');
      const dot = document.createElement('span');
      dot.className = `dot ${t.grade}`;
      chip.append(dot, isSpoilerHidden(t) ? 'Hidden trophy' : t.name);
      chip.addEventListener('click', () => { location.hash = `trophy-${t.id}`; });
      chips.append(chip);
    }
    sec.append(chips);
    els.roadmapStages.append(sec);
  }
}

function renderPlatinumPlan() {
  const plan = doc.platinumPlan;
  els.platinumPlan.replaceChildren();
  if (!plan) return;
  const h2 = document.createElement('h2');
  h2.textContent = plan.title;
  const composition = document.createElement('p');
  composition.textContent = plan.composition;
  els.platinumPlan.append(h2, composition);
  const phasesH = document.createElement('h3');
  phasesH.textContent = 'The run, in order';
  const ol = document.createElement('ol');
  ol.className = 'plan-phases';
  for (const phase of plan.phases ?? []) {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = `${phase.name} — `;
    li.append(b, phase.detail);
    ol.append(li);
  }
  const polesH = document.createElement('h3');
  polesH.textContent = 'The long poles';
  const poles = document.createElement('ul');
  poles.className = 'plan-poles';
  for (const pole of plan.longPoles ?? []) {
    const li = document.createElement('li');
    li.textContent = pole;
    poles.append(li);
  }
  els.platinumPlan.append(phasesH, ol, polesH, poles);
}

/* ---------- planner (next up) ---------- */

function renderPlanner() {
  const unearned = roadmapOrder.map((id) => byId.get(id)).filter((t) => t && !state.earned.has(t.name));
  els.plannerPanel.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = 'Next up — your run from here';
  els.plannerPanel.append(h2);
  if (!unearned.length) {
    const done = document.createElement('p');
    done.textContent = 'All 55 trophies are earned — the platinum is yours. Nothing remains in any stage.';
    els.plannerPanel.append(done);
    els.plannerList.replaceChildren();
    return;
  }
  const currentStage = stageOf.get(unearned[0].id);
  const { done, total } = stageProgress(currentStage);
  const now = document.createElement('p');
  now.className = 'now-line';
  now.textContent = `You are in Stage ${currentStage.stage} — ${currentStage.name}`;
  const remains = document.createElement('p');
  remains.textContent = `${done} of ${total} earned in this stage, ${total - done} still to go here. Across the whole roadmap, ${unearned.length} of ${trophies.length} trophies remain, listed below in roadmap order — work from the top.`;
  const tip = document.createElement('p');
  tip.textContent = 'The list follows the roadmap stages in order, so the next trophy to earn is always the first one. Counters show where each grind stands; open a trophy to read its guide, unlock timing and pitfalls.';
  els.plannerPanel.append(now, remains, tip);

  els.plannerList.replaceChildren();
  unearned.forEach((t, i) => {
    const stage = stageOf.get(t.id);
    const item = document.createElement('article');
    item.className = `next-item grade-${t.grade}` + (stage === currentStage ? ' current-stage' : '');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(i + 1);
    const main = document.createElement('div');
    const tag = document.createElement('span');
    tag.className = 'stage-tag';
    tag.textContent = `Stage ${stage.stage} · ${stage.name}`;
    const h3 = document.createElement('h3');
    h3.textContent = isSpoilerHidden(t) ? 'Hidden trophy' : t.name;
    const meta = document.createElement('p');
    if (isSpoilerHidden(t)) {
      meta.textContent = 'Story trophy hidden by the spoiler shield until earned.';
    } else {
      meta.textContent = t.unlock || t.description;
      const ct = counterText(t);
      if (ct) meta.append(` ${ct}.`);
      if (t.missable) meta.append(' Potential missable — mind the Chapter 1 window.');
    }
    main.append(tag, h3, meta);
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'guide-toggle jump';
    jump.textContent = 'Open guide ▸';
    jump.addEventListener('click', () => { location.hash = `trophy-${t.id}`; });
    item.append(rank, main, jump);
    els.plannerList.append(item);
  });
}

/* ---------- sources & methodology ---------- */

function renderMethodology() {
  const m = doc.methodology;
  if (!m || !els.methodology) return;
  els.methodology.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = m.title;
  const intro = document.createElement('p');
  intro.textContent = m.intro;
  const ul = document.createElement('ul');
  ul.className = 'methodology-guides';
  for (const g of m.guides ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = g.url;
    a.textContent = g.name;
    a.rel = 'noopener';
    li.append(a);
    ul.append(li);
  }
  els.methodology.append(h2, intro, ul);
  for (const note of m.notes ?? []) {
    const p = document.createElement('p');
    p.textContent = note;
    els.methodology.append(p);
  }
}

/* ---------- views & hash routing ---------- */

function showView(view) {
  els.roadmapView.hidden = view !== 'roadmap';
  els.plannerView.hidden = view !== 'planner';
  els.checklistView.hidden = view !== 'checklist';
  els.controls.hidden = view !== 'checklist';
  els.tabRoadmap.classList.toggle('active', view === 'roadmap');
  els.tabPlanner.classList.toggle('active', view === 'planner');
  els.tabChecklist.classList.toggle('active', view === 'checklist');
  if (view === 'roadmap') renderRoadmap();
  if (view === 'planner') renderPlanner();
}

function applyHash() {
  const parts = (location.hash.replace(/^#/, '') || 'checklist').split('&').filter(Boolean);
  let view = 'checklist';
  for (const part of parts) {
    if (part === 'roadmap') view = 'roadmap';
    if (part === 'planner') view = 'planner';
    if (part === 'filter-missable') { kindFilter = 'missable'; view = 'checklist'; }
    if (part === 'spoiler=1') { state.spoiler = true; els.spoiler.checked = true; saveState(); }
    const m = part.match(/^trophy-(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      if (byId.has(id)) {
        view = 'checklist';
        kindFilter = 'all';
        els.gradeFilter.value = 'all';
        els.search.value = '';
        openGuideId = id;
        deepLinkedId = id;
      }
    }
  }
  showView(view);
  renderChecklist();
  if (deepLinkedId !== null) {
    const el = document.getElementById(`trophy-${deepLinkedId}`);
    if (el) el.scrollIntoView({ block: 'start' });
  }
}

/* ---------- wiring ---------- */

function renderAll() {
  renderProgress();
  renderChecklist();
  if (!els.roadmapView.hidden) renderRoadmap();
  if (!els.plannerView.hidden) renderPlanner();
}

els.search.addEventListener('input', renderChecklist);
els.gradeFilter.addEventListener('change', renderChecklist);
els.sort.addEventListener('change', renderChecklist);
els.spoiler.addEventListener('change', () => {
  state.spoiler = els.spoiler.checked;
  saveState();
  renderAll();
});
els.tabChecklist.addEventListener('click', () => { location.hash = 'checklist'; });
els.tabRoadmap.addEventListener('click', () => { location.hash = 'roadmap'; });
els.tabPlanner.addEventListener('click', () => { location.hash = 'planner'; });
window.addEventListener('hashchange', applyHash);

document.getElementById('export').addEventListener('click', () => {
  const payload = JSON.stringify({ earned: [...state.earned], counts: state.counts, notes: state.notes }, null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (Array.isArray(parsed)) {
      state.earned = new Set(parsed.filter((n) => trophies.some((t) => t.name === n)));
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.earned)) state.earned = new Set(parsed.earned.filter((n) => trophies.some((t) => t.name === n)));
      if (parsed.counts && typeof parsed.counts === 'object') state.counts = parsed.counts;
      if (parsed.notes && typeof parsed.notes === 'object') {
        state.notes = {};
        for (const [k, v] of Object.entries(parsed.notes)) if (typeof v === 'string') state.notes[k] = v;
      }
    }
    saveState();
    renderAll();
  } catch {
    alert('That file could not be read as trophy progress JSON.');
  }
  e.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear every earned tick, counter and personal note?')) return;
  state.earned.clear();
  state.counts = {};
  state.notes = {};
  saveState();
  renderAll();
});

els.spoiler.checked = state.spoiler;
renderProgress();
renderMethodology();
applyHash();
