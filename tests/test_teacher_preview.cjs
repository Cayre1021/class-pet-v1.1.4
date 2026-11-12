const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'design/teacher-preview.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'design/teacher-preview.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'design/teacher-preview.js'), 'utf8');
const { document, window } = parseHTML(html);
const timers = [];
const context = vm.createContext({document, window, console, setTimeout: fn => { timers.push(fn); return timers.length; }});
vm.runInContext(js, context);

let checks = 0;
function check(value, message) { assert(value, message); checks++; }
function run(code) { return vm.runInContext(code, context); }

check(document.querySelectorAll('.scheme-tabs [data-scheme]').length === 3, 'three scheme tabs');
check(document.querySelector('.app').dataset.scheme === 'a', 'scheme A is default');
check(document.querySelectorAll('.student-card').length === 16, 'all active students render without pagination');
check(!/上一页|下一页/.test(html + js), 'no pagination controls');
check(document.querySelectorAll('[data-score]').length === 13, 'all positive and negative score rules render');
check(document.querySelectorAll('[data-group]').length === 6, 'all, four groups, and archive filters exist');
for (const action of ['portal','bigscreen','undo','ledger','import','add','threshold','backup','theme']) {
  check(!!document.querySelector(`[data-action="${action}"]`), `missing action ${action}`);
}

run("state.scheme='b';render()");
check(document.querySelector('.app').dataset.scheme === 'b', 'scheme B renders');
check(document.querySelectorAll('.student-card').length === 16, 'scheme B keeps full roster');
check(document.querySelectorAll('[data-student-action="log"]').length === 16, 'scheme B keeps per-student actions');
run("state.scheme='c';render()");
check(document.querySelectorAll('.group-lane').length === 4, 'scheme C renders four group lanes');
check(document.querySelectorAll('.student-card').length === 16, 'scheme C keeps full roster');
check(document.querySelectorAll('[data-student-action="log"]').length === 16, 'scheme C keeps per-student actions');
run("state.group='2';render()");
check(document.querySelectorAll('.group-lane').length === 1, 'scheme C group filter narrows lanes');
check(document.querySelectorAll('.student-card').length === 4, 'group filter returns four fixtures');
run("state.group='all';state.query='陈雨';render()");
check(document.querySelectorAll('.student-card').length === 1, 'search filters by name');

run("state.query='';state.scheme='a';state.group='all';students.forEach(s=>s.selected=false);students[0].selected=true;render()");
const before = run('students[0].score');
run("applyScore(5,'作业优秀')");
check(run('students[0].score') === before + 5, 'simulated score applies to selected student');
run('undoLast()');
check(run('students[0].score') === before, 'simulated undo restores score');
run("state.group='archive';render()");
check(document.querySelectorAll('.student-card').length === 1, 'archive filter remains reachable');
check(!!document.querySelector('[data-student-action="restore"]'), 'archive restore remains reachable');
check(!!document.querySelector('[data-student-action="delete"]'), 'permanent delete remains reachable');

for (const species of ['cat','dog','bunny','fox','hamster','bird','deer','fish']) {
  check(fs.existsSync(path.join(root, `electron-app/src/assets/pets/${species}/${species}-stage2.png`)), `missing ${species} pet asset`);
}
check(css.includes('.app[data-scheme=a] .workspace{display:grid;grid-template-columns:350px'), 'A uses side roster');
check(css.includes('.app[data-scheme=b] .student-scroll{flex:1;padding:12px;display:grid'), 'B uses student canvas');
check(css.includes('.app[data-scheme=c] .group-board{display:grid;grid-template-columns:repeat(4'), 'C uses four group lanes');
check(!/localStorage|classPetRuntime|electronAPI|fetch\(/.test(js), 'preview is isolated from live data');
console.log(`${checks} teacher preview checks passed. Native visual and responsive checks remain manual.`);
