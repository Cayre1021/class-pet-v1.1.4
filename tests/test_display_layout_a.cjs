const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'electron-app', 'src', 'display_bigscreen_touch_pro.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'electron-app', 'src', 'display_layout_a.css'), 'utf8');
const launcher = fs.readFileSync(path.join(root, 'electron-app', 'scripts', 'start-layout-test.cjs'), 'utf8');

const requiredFeatures = [
    'id="layoutGroupFilter"',
    "handleCardSort('no')",
    "handleCardSort('level')",
    'id="layoutGroupTotals"',
    'id="seatmapView"',
    'id="pkRaceView"',
    'id="btnHeaderFullscreen"',
    'id="btnHeaderAudio"',
    'id="modalStudentDetails"',
    'openHatchModal',
    'openTeacherWorkstation',
    'toggleRadialMenu',
    'selectLayoutStudent'
];
for (const feature of requiredFeatures) assert(html.includes(feature), `missing preserved feature: ${feature}`);

assert(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(css), 'desktop grid must cap at four columns');
assert(!/repeat\([5-9]/.test(css), 'layout must not define more than four pet columns');
assert(!html.includes('layoutPagination') && !html.includes('pageSize'), 'approved full-scroll layout must not paginate');
assert(html.includes('const cardsHtml = activeStudents.map'), 'render all filtered students');
assert(css.includes('width: 100%; height: auto; border: 0'), 'pet stage must override legacy narrow dimensions');
assert(css.includes('height: auto; min-height: 44px'), 'group totals must override legacy card height');
assert(html.includes("allActiveStudents.filter(s => String(s.group)"), 'group filter must filter real store students');
assert(html.includes("(b.level || 0) - (a.level || 0) || (b.exp || 0) - (a.exp || 0)"), 'level and experience descending sort must remain');
assert(html.includes("parseInt(a.no, 10)"), 'student number ascending sort must remain');
assert(launcher.includes("ClassPet-Test', 'layout-a"), 'test profile must be isolated');
assert(launcher.includes('fs.copyFileSync(projectSeed, dbPath)'), 'test database must be copied before use');

console.log('Display layout static preservation and full-scroll checks passed.');
