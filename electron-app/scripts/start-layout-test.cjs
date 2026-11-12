const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const profileDir = path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'ClassPet-Test', 'layout-a');
const dbPath = path.join(profileDir, 'classpet-layout-a.sqlite');
const projectSeed = path.resolve(__dirname, '..', '..', 'database', 'classpet.sqlite');

fs.mkdirSync(profileDir, { recursive: true });
app.setName('Class Pet Layout A Test');
app.setPath('userData', profileDir);

if (!fs.existsSync(dbPath)) {
    if (!fs.existsSync(projectSeed)) throw new Error(`Test seed database not found: ${projectSeed}`);
    fs.copyFileSync(projectSeed, dbPath);
}
const backupDir = path.join(profileDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(backupDir, `classpet-before-start-${stamp}.sqlite`));

app.whenReady().then(async () => {
    const sqliteService = require('../sqlite_service.js');
    await sqliteService.init(app, dbPath);
    require('../main.js');
}).catch((error) => {
    console.error('[Layout Test] startup failed:', error);
    app.quit();
});
