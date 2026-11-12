const fs = require('fs');
const vm = require('vm');
const path = require('path');

const files = [
  'electron-app/src/classpet_core.js',
  'electron-app/src/js/classpet_core.js',
  'electron-app/src/display_bigscreen_touch_pro.html',
  'electron-app/src/teacher_panel_touch_pro.html',
  'electron-app/src/display_bigscreen.html',
  'electron-app/src/display_bigscreen_zoom150.html'
];

let hasError = false;
for (const f of files) {
  const fullPath = path.resolve(__dirname, '..', f);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (f.endsWith('.js')) {
    try {
      new vm.Script(content, { filename: f });
      console.log('✅ JS Syntax OK:', f);
    } catch (e) {
      console.error('❌ JS Syntax Error:', f, e.message);
      hasError = true;
    }
  } else if (f.endsWith('.html')) {
    const scripts = content.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
    let idx = 0;
    for (const s of scripts) {
      idx++;
      const code = s.replace(/<script[\s\S]*?>/i, '').replace(/<\/script>/i, '');
      try {
        new vm.Script(code, { filename: `${f}#script_${idx}` });
      } catch (e) {
        console.error(`❌ HTML Script Syntax Error in ${f} (block ${idx}):`, e.message);
        hasError = true;
      }
    }
    console.log(`✅ HTML Syntax OK (${scripts.length} script blocks checked):`, f);
  }
}

if (hasError) {
  console.error('\n❌ Syntax verification failed!');
  process.exit(1);
} else {
  console.log('\n🎉 All JS and HTML scripts passed syntax check with 0 errors!');
}
