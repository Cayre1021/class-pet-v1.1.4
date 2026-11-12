const fs = require('fs');
const path = require('path');

const testsDir = 'd:/Desk/ALL Vibe/class-pet-v1.1.4-handover/tests';
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));

files.forEach(f => {
    const full = path.join(testsDir, f);
    let code = fs.readFileSync(full, 'utf8');

    code = code.replace(/const projectRoot = fs\.existsSync\(path\.join\(projectRoot, 'electron-app'\)\) \? __dirname : path\.join\(__dirname, '\.\.'\);/g, "const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');");
    code = code.replace(/const projectRoot = fs\.existsSync\(path\.join\(__dirname, 'electron-app'\)\) \? __dirname : path\.join\(__dirname, '\.\.'\);/g, "const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');");
    
    fs.writeFileSync(full, code, 'utf8');
    console.log('Cleaned projectRoot in:', f);
});
