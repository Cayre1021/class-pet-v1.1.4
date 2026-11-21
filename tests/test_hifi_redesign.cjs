const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const masterpiecePath = path.join(root, 'design', 'hifi_classroom_masterpiece.html');
const looseleafPath = path.join(root, 'design', 'hifi_looseleaf_edition.html');

console.log('--- Checking High-Fidelity Prototype Files ---');
assert(fs.existsSync(masterpiecePath), 'hifi_classroom_masterpiece.html must exist');
assert(fs.existsSync(looseleafPath), 'hifi_looseleaf_edition.html must exist');

const masterHtml = fs.readFileSync(masterpiecePath, 'utf8');
const looseleafHtml = fs.readFileSync(looseleafPath, 'utf8');

// 1. Check Masterpiece Core Requirements
console.log('1. Verifying Masterpiece Core Business & UI Elements...');
const requiredMasterKeywords = [
  'repeat(4, minmax(0, 1fr))', // 4-column grid rule
  'class="pet-grid"',
  'class="pet-card',
  'class="student-drawer"',
  'class="floating-ball-wrap"',
  'id="fireworksCanvas"',
  'class="ceremony-overlay"',
  'class="btn-stamp',
  'triggerCelebrationDemo',
  'applyDrawerStamp',
  'viewSeatmap',
  'viewPk',
  'viewTeacher',
  'is-egg',
  'is-absent'
];
for (const kw of requiredMasterKeywords) {
  assert(masterHtml.includes(kw), `Masterpiece must include keyword: ${kw}`);
}

// 2. Check Breathing Room & Anti-clipping
console.log('2. Verifying Breathing Room & Anti-clipping padding...');
assert(masterHtml.includes('padding: 8px 4px 24px 4px') || masterHtml.includes('padding: 16px 24px 60px 24px'), 'Grid container must have top padding for anti-clipping');
assert(masterHtml.includes('z-index: 10') && masterHtml.includes('z-index: 12'), 'Hover and selection z-indexes must be higher than base cards');
assert(masterHtml.includes('Escape'), 'Must support Esc key to close overlay/drawer');

// 3. Check Looseleaf Core Elements
console.log('3. Verifying Looseleaf Edition Design Tokens & Elements...');
const requiredLooseleafKeywords = [
  '--ll-desk',
  '--ll-paper',
  '--ll-card',
  '--ll-ink',
  '--ll-marker',
  'washi-tape',
  'manila-drawer',
  'rubber-stamp-btn',
  'celebrationCanvas',
  'repeat(4, minmax(0, 1fr))'
];
for (const kw of requiredLooseleafKeywords) {
  assert(looseleafHtml.includes(kw), `Looseleaf edition must include keyword: ${kw}`);
}

// 4. Verify Relative Asset Paths
console.log('4. Verifying Pet Asset Paths exist on disk...');
const sampleCat = path.join(root, 'electron-app', 'src', 'assets', 'pets', 'cat', 'cat-stage2.png');
const sampleEgg = path.join(root, 'electron-app', 'src', 'assets', 'pets', 'shared', 'egg.png');
assert(fs.existsSync(sampleCat), 'Sample cat image must exist on disk');
assert(fs.existsSync(sampleEgg), 'Sample egg image must exist on disk');

console.log('✅ ALL High-Fidelity Prototype checks PASSED cleanly!');
