'use strict';
/* Leonida Trophy Guide — offline tracker. All state lives in localStorage. */
var LS_KEY = 'leonida-trophy-guide-v1';
var KINDS = ['all', 'story', 'missable', 'collectibles', 'activities', 'side', 'free-roam', 'economy', 'platinum'];
var STAGE_META = [
  { n: 1, title: 'Chapter 1 — including the missable window', note: 'Bank the balcony meditation for Positive Mental Attitude before Chapter 1 ends — PowerPyx flags it as the one missable risk, so this is the window that matters.' },
  { n: 2, title: 'Story progression — Chapters 2 to the finale', note: 'Ride the main path chapter by chapter, per KeenGamer: nothing in this stage can be missed, so just keep moving.' },
  { n: 3, title: 'Stranger strands and side stories', note: 'Clear every giver chain in one sweep, per PSNProfiles — strand finales only appear once the whole chain is done.' },
  { n: 4, title: 'Activities — ranges, races and pastimes', note: 'The skill stage: 42 Shooting Range golds live here, and Push Square calls the range a practice trophy, not a luck trophy.' },
  { n: 5, title: 'Collectibles and exploration', note: 'One full lap of Leonida pays three times — cards, vehicles and all 52 areas — per GTA-Zone.' },
  { n: 6, title: 'Free-roam feats and robberies', note: 'Partner jobs, vaults and clean getaways; plan each job before you start it, per PowerPyx.' },
  { n: 7, title: 'Cumulative grinds, economy and cleanup', note: 'The long stage, per PowerPyx: 250 stunts, 500 choices, $250,000 laundered and the 100% checklist all finish here.' },
  { n: 8, title: 'The platinum', note: 'No task of its own — it pops when the other 54 are earned, per PSNProfiles.' }
];
var SOURCE_SITES = [
  ['PowerPyx', 'https://www.powerpyx.com/'],
  ['KeenGamer', 'https://www.keengamer.com/'],
  ['Push Square', 'https://www.pushsquare.com/'],
  ['GTA-Zone', 'https://www.gta-zone.com/'],
  ['PSNProfiles', 'https://psnprofiles.com/'],
  ['Exophase', 'https://www.exophase.com/']
];

var state = loadState();
var trophies = [];
var activeKind = 'all';
var selectedName = null;

function loadState() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (raw) { var p = JSON.parse(raw); return { earned: p.earned || {}, counters: p.counters || {}, notes: p.notes || {}, spoiler: p.spoiler !== false }; }
  } catch (e) { /* fresh start */ }
  return { earned: {}, counters: {}, notes: {}, spoiler: true };
}
function saveState() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function isEarned(t) { return !!state.earned[t.name]; }
function isSpoilerHidden(t) { return state.spoiler && t.kind === 'story' && !isEarned(t); }
function byStageThenId(a, b) { return (a.stage - b.stage) || (a.id - b.id); }

function renderHeader() {
  var total = trophies.length;
  var done = trophies.filter(isEarned).length;
  document.getElementById('progress').textContent = done + ' of ' + total + ' earned';
  document.getElementById('pct').textContent = (total ? Math.round(done / total * 100) : 0) + '%';
  document.getElementById('barFill').style.width = (total ? done / total * 100 : 0) + '%';
  var parts = [];
  ['platinum', 'gold', 'silver', 'bronze'].forEach(function (g) {
    var all = trophies.filter(function (t) { return t.grade === g; });
    var got = all.filter(isEarned).length;
    parts.push(got + '/' + all.length + ' ' + g);
  });
  document.getElementById('gradeCounts').textContent = parts.join(' · ');
}

function renderChips() {
  var box = document.getElementById('kindChips');
  box.replaceChildren();
  KINDS.forEach(function (k) {
    var b = el('button', 'chip' + (k === activeKind ? ' on' : ''), k === 'all' ? 'All kinds' : k);
    b.type = 'button';
    b.addEventListener('click', function () { activeKind = k; renderChips(); renderList(); });
    box.appendChild(b);
  });
}

function matches(t, q) {
  if (activeKind === 'missable') { if (!t.missable) return false; }
  else if (activeKind !== 'all' && t.kind !== activeKind) return false;
  if (!q) return true;
  var hay = (t.name + ' ' + t.description + ' ' + t.kind + ' ' + t.grade).toLowerCase();
  return hay.indexOf(q.toLowerCase()) >= 0;
}

function tagRow(t) {
  var wrap = el('div', 'tags');
  wrap.appendChild(el('span', 'tag grade-' + t.grade, t.grade));
  wrap.appendChild(el('span', 'tag', t.kind));
  wrap.appendChild(el('span', 'tag', 'Stage ' + t.stage));
  if (t.hidden) wrap.appendChild(el('span', 'tag hid', 'hidden'));
  if (t.missable) wrap.appendChild(el('span', 'tag miss', 'POTENTIAL MISSABLE'));
  if (t.psn) wrap.appendChild(el('span', 'tag', 'counter: ' + (state.counters[t.name] || 0) + ' / ' + t.psn));
  return wrap;
}

function renderList() {
  var q = document.getElementById('q').value;
  var list = document.getElementById('list');
  list.replaceChildren();
  var shown = trophies.filter(function (t) { return matches(t, q); });
  document.getElementById('filterNote').textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
    (activeKind === 'missable' ? ' — only Positive Mental Attitude is flagged a potential missable; Actions Speak Louder was screened and cleared (its 500-choice counter is cumulative).' : '');
  shown.forEach(function (t) {
    var li = el('li', 'row' + (isEarned(t) ? ' done' : '') + (t.name === selectedName ? ' sel' : ''));
    var box = el('input'); box.type = 'checkbox'; box.checked = isEarned(t);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('click', function (ev) { ev.stopPropagation(); });
    box.addEventListener('change', function () {
      if (box.checked) state.earned[t.name] = true; else delete state.earned[t.name];
      saveState(); renderAll();
    });
    var body = el('div', 'body');
    var hide = isSpoilerHidden(t);
    body.appendChild(el('div', 'name' + (hide ? ' blur' : ''), hide ? 'Hidden story trophy' : t.name));
    body.appendChild(el('div', 'desc' + (hide ? ' blur' : ''), hide ? 'Earn it to reveal its description.' : t.description));
    body.appendChild(tagRow(t));
    li.appendChild(box); li.appendChild(body);
    li.addEventListener('click', function () { selectedName = t.name; renderList(); renderDetail(); });
    list.appendChild(li);
  });
}
function sourceLinks(t) {
  var p = el('p', 'srcs', 'Sources: ');
  (t.sources || []).forEach(function (name, i) {
    if (i) p.appendChild(document.createTextNode(' · '));
    var site = SOURCE_SITES.filter(function (s) { return s[0] === name; })[0];
    if (site) { var a = el('a', null, name); a.href = site[1]; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); }
    else p.appendChild(document.createTextNode(name));
  });
  return p;
}

function renderDetail() {
  var panel = document.getElementById('detail');
  panel.replaceChildren();
  var t = trophies.filter(function (x) { return x.name === selectedName; })[0];
  if (!t) {
    panel.appendChild(el('h3', null, 'Pick a trophy'));
    panel.appendChild(el('p', 'dim', 'Select any trophy in the checklist to read its guide, steps, unlock timing, pitfalls and sources — and to log your counter and notes.'));
    return;
  }
  var hide = isSpoilerHidden(t);
  panel.appendChild(el('h3', null, hide ? 'Hidden story trophy' : t.name));
  panel.appendChild(el('p', 'desc', hide ? 'Spoiler shield is on: earn this story trophy to reveal it.' : t.description));
  panel.appendChild(tagRow(t));
  if (t.missable) panel.appendChild(el('p', null, '⚠ Potential missable: the Chapter 1 balcony meditation window closes when Chapter 1 ends. Do it during Chapter 1.'));
  panel.appendChild(el('h4', null, 'Guide'));
  panel.appendChild(el('p', null, t.guide));
  panel.appendChild(el('h4', null, 'Steps'));
  var ol = el('ol');
  (t.steps || []).forEach(function (s) { ol.appendChild(el('li', null, s)); });
  panel.appendChild(ol);
  panel.appendChild(el('h4', null, 'When it unlocks'));
  panel.appendChild(el('p', null, t.unlock || ''));
  panel.appendChild(el('h4', null, 'Pitfalls'));
  panel.appendChild(el('p', null, t.pitfalls || ''));
  if (t.psn) {
    panel.appendChild(el('h4', null, 'Progress counter (PSN target ' + t.psn + ')'));
    var row = el('div', 'counter');
    var input = el('input'); input.type = 'number'; input.min = '0'; input.max = String(t.psn);
    input.value = state.counters[t.name] || 0;
    var apply = el('button', null, 'Save counter'); apply.type = 'button';
    apply.addEventListener('click', function () {
      var v = Math.max(0, Math.min(t.psn, parseInt(input.value, 10) || 0));
      state.counters[t.name] = v; input.value = v; saveState(); renderList();
    });
    row.appendChild(input); row.appendChild(apply);
    row.appendChild(el('span', 'dim', 'of ' + t.psn));
    panel.appendChild(row);
  }
  panel.appendChild(el('h4', null, 'Your notes'));
  var ta = el('textarea'); ta.placeholder = 'Your own notes for this trophy…'; ta.value = state.notes[t.name] || '';
  ta.addEventListener('change', function () { state.notes[t.name] = ta.value; saveState(); });
  panel.appendChild(ta);
  panel.appendChild(el('h4', null, 'Sources'));
  panel.appendChild(sourceLinks(t));
}

function renderRoadmap() {
  var box = document.getElementById('stages');
  box.replaceChildren();
  STAGE_META.forEach(function (meta) {
    var items = trophies.filter(function (t) { return t.stage === meta.n; }).sort(byStageThenId);
    var done = items.filter(isEarned).length;
    var card = el('div', 'stage');
    card.appendChild(el('h3', null, 'Stage ' + meta.n + ' — ' + meta.title));
    card.appendChild(el('p', 'dim', meta.note));
    var bar = el('div', 'sbar'); var fill = el('i'); fill.style.width = (items.length ? done / items.length * 100 : 0) + '%'; bar.appendChild(fill);
    card.appendChild(bar);
    card.appendChild(el('p', 'small', done + ' / ' + items.length + ' earned in this stage'));
    var ul = el('ul');
    items.forEach(function (t) {
      var li = el('li', isEarned(t) ? 'done' : '', t.name + ' (' + t.grade + ')' + (t.missable ? ' — POTENTIAL MISSABLE: Chapter 1 window' : ''));
      ul.appendChild(li);
    });
    card.appendChild(ul);
    box.appendChild(card);
  });
}

function renderPlanner() {
  var box = document.getElementById('planner');
  box.replaceChildren();
  var ordered = trophies.slice().sort(byStageThenId);
  var remaining = ordered.filter(function (t) { return !isEarned(t); });
  if (!remaining.length) { box.appendChild(el('p', null, 'Everything is earned — the platinum is yours. Congratulations, Leonida Legend.')); return; }
  var currentStage = remaining[0].stage;
  box.appendChild(el('p', null, 'Current stage: Stage ' + currentStage + ' — ' + STAGE_META[currentStage - 1].title));
  var inStage = remaining.filter(function (t) { return t.stage === currentStage; });
  box.appendChild(el('p', 'dim', inStage.length + ' trophies remain in this stage; ' + remaining.length + ' remain overall.'));
  remaining.slice(0, 8).forEach(function (t, i) {
    var row = el('div', 'nextitem');
    row.appendChild(el('span', 'n', String(i + 1)));
    var body = el('div', 'body');
    body.appendChild(el('div', 'name', t.name + (t.missable ? ' — POTENTIAL MISSABLE' : '')));
    body.appendChild(el('div', 'desc dim small', 'Stage ' + t.stage + ' · ' + t.grade + ' · ' + t.kind + (t.psn ? ' · counter ' + (state.counters[t.name] || 0) + '/' + t.psn : '')));
    row.appendChild(body);
    row.addEventListener('click', function () { selectedName = t.name; switchView('checklist'); renderList(); renderDetail(); });
    box.appendChild(row);
  });
}

function renderPlan() {
  var plan = document.getElementById('planPanel');
  plan.replaceChildren();
  var grid = el('div', 'plan-grid');
  var cards = [
    ['Phases, in order', '1) Story first, riding the chapters to the finale. 2) Inside that run, clear the Chapter 1 missable window (Positive Mental Attitude) before Chapter 1 ends. 3) Strands, activities, collectibles and free-roam feats. 4) Cumulative grinds and economy. 5) Cleanup, the 100% checklist, then the platinum.'],
    ['The list, by the numbers', '55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze. 28 are hidden on PlayStation until earned. Every trophy is single-player — the official list holds no online trophies and no difficulty trophies, so one playthrough plus cleanup is the whole job.'],
    ['Long pole: 500 choices', 'Actions Speak Louder tracks 500 choices cumulatively across the whole game (PSNProfiles / Exophase counts). Screened and cleared as NOT missable — there is no wrong choice for this counter, only choices not yet made.'],
    ['Long pole: 42 range golds', 'The Shootist wants gold in all 42 Shooting Range challenges. Practice trophy, not luck: short focused retries, range by range (Push Square / PowerPyx).'],
    ['Long pole: 100% completion', 'A Long Road (gold) hides a full completion checklist behind one percentage. When the last percent hides, re-read the in-game checklist category by category instead of repeating finished content.']
  ];
  cards.forEach(function (c) { var d = el('div', 'card'); d.appendChild(el('h3', null, c[0])); d.appendChild(el('p', null, c[1])); grid.appendChild(d); });
  plan.appendChild(grid);

  var src = document.getElementById('sourcesPanel');
  src.replaceChildren();
  src.appendChild(el('p', null, 'The official list — names, descriptions, grades, hidden flags and PSN progress targets — is PlayStation\u2019s published list for Grand Theft Auto VI, as listed by Exophase and PSNProfiles, the two agreeing on every name, description and grade. Guide text here is written for this entry and cross-checked against the published guides below; each trophy names its own sources beside its guide. Five trophies (The Truth Is Out There, Ten Pin, Personal Best, Bad Luck, I Guess, Challenging Tank) have unconfirmed triggers in those sources, and their guides here say so rather than inventing a method.'));
  var ul = el('ul');
  SOURCE_SITES.forEach(function (s) {
    var li = el('li'); var a = el('a', null, s[0]); a.href = s[1]; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(a); ul.appendChild(li);
  });
  src.appendChild(ul);
  src.appendChild(el('p', 'dim', 'Links open only when you follow them — the app itself makes no network requests and works fully offline.'));
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === name); });
  ['checklist', 'roadmap', 'planner', 'plan'].forEach(function (v) {
    document.getElementById('view-' + v).hidden = v !== name;
  });
  if (name === 'roadmap') renderRoadmap();
  if (name === 'planner') renderPlanner();
  if (name === 'plan') renderPlan();
}

function renderAll() { renderHeader(); renderList(); renderDetail(); }

function exportProgress() {
  var blob = new Blob([JSON.stringify({ earned: state.earned, counters: state.counters, notes: state.notes }, null, 2)], { type: 'application/json' });
  var a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'leonida-trophy-progress.json'; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
}
function importProgress(file) {
  file.text().then(function (text) {
    var p = JSON.parse(text);
    if (Array.isArray(p)) { state.earned = {}; p.forEach(function (n) { state.earned[n] = true; }); }
    else { state.earned = p.earned || {}; state.counters = p.counters || {}; state.notes = p.notes || {}; }
    saveState(); renderAll(); renderRoadmap(); renderPlanner();
  }).catch(function () { alert('That file could not be read as trophy progress.'); });
}

function init(data) {
  trophies = data.trophies.slice().sort(byStageThenId);
  document.getElementById('spoiler').checked = state.spoiler;
  document.getElementById('spoiler').addEventListener('change', function (ev) { state.spoiler = ev.target.checked; saveState(); renderList(); renderDetail(); });
  document.getElementById('q').addEventListener('input', renderList);
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', function (ev) { if (ev.target.files[0]) importProgress(ev.target.files[0]); });
  document.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function () { switchView(b.getAttribute('data-view')); }); });
  selectedName = 'The Shootist';
  renderChips(); renderAll(); renderPlan();
}

fetch('data/trophies.json').then(function (r) { return r.json(); }).then(init).catch(function () {
  document.getElementById('list').appendChild(el('li', 'row', 'Could not load data/trophies.json — serve the app folder with a static server.'));
});
