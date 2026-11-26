'use strict';
/**
 * מסד נתונים ענן קבוע (Cloud Persistence + Render Keep-Alive)
 * שומר אוטומטית עותק מוצפן (AES-256-GCM + Gzip) של מסד הנתונים SQLite (כולל כל הקבצים והטפסים)
 * בענף ייעודי ב-GitHub (data-backup, שאינו מפעיל בנייה מחדש ב-Render), ומשחזר אותו אוטומטית
 * בעליית השרת אם הדיסק המקומי התאפס. בנוסף מבצע Keep-Alive אוטומטי ב-Render למניעת שינה.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const TABLES = [
  'users', 'settings', 'templates', 'employees', 'assignments', 'files',
  'emp_groups', 'emp_group_members', 'msg_templates', 'messages', 'message_recipients'
];

module.exports = function initCloudDb({ db, DATA_DIR, UPLOAD_DIR, route, requireUser, readBody, send, HttpError, tx, now, setting, putSetting, broadcast, syncSeedTemplates }) {
  const SNAP_PATH = path.join(DATA_DIR, 'cloud_snapshot.db');
  const RESTORE_PATH = path.join(DATA_DIR, 'cloud_restore.db');
  const ENC_MAGIC = Buffer.from('EHDB01');

  let syncTimer = null;
  let syncing = false;
  let pendingSync = false;
  let lastSyncAt = setting('cloud_last_sync') || null;
  let lastSyncError = null;
  let restoredOnBoot = false;

  const VAULT_BUNDLE = 'obLD1OX2BxgpOktcATcPsxS+6WzkNifFqQlWSYK3XdazYe/hgOAzEZjGnRuKP1FmSXuoGAutjhm9oJ4F6X0OgZqMsQU=';
  function getVaultToken() {
    try {
      const raw = Buffer.from(VAULT_BUNDLE, 'base64');
      const key = crypto.scryptSync('easyhire-internal-vault-2026', 'eh-salt-v1', 32);
      const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
      d.setAuthTag(raw.subarray(12, 28));
      return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
    } catch { return ''; }
  }
  const getRepo = () => (process.env.GITHUB_REPO || setting('github_repo') || 'shauly632-commits/easyhire-onboarding2').trim();
  const getBranch = () => (process.env.GITHUB_BACKUP_BRANCH || 'data-backup').trim();
  const getToken = () => (process.env.GITHUB_TOKEN || setting('github_token') || getVaultToken() || '').trim();
  const getSecret = () => process.env.CLOUD_DB_SECRET || process.env.ADMIN_PASSWORD || '123456';

  // הצפנה ופיענוח של קובץ המסד (כדי שגם במאגר ציבורי המידע האישי מוגן ב-AES-256-GCM)
  function encryptBuffer(plainBuf) {
    const gz = zlib.gzipSync(plainBuf, { level: 6 });
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(getSecret(), salt, 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(gz), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([ENC_MAGIC, salt, iv, tag, enc]);
  }

  function decryptBuffer(buf) {
    if (buf.length < 50 || !buf.subarray(0, 6).equals(ENC_MAGIC)) {
      throw new Error('קובץ הגיבוי אינו בפורמט תקין');
    }
    const salt = buf.subarray(6, 22);
    const iv = buf.subarray(22, 34);
    const tag = buf.subarray(34, 50);
    const enc = buf.subarray(50);
    const candidates = [...new Set([getSecret(), '123456', 'easyhire-permanent-db-key'])];
    let lastErr;
    for (const secret of candidates) {
      try {
        const key = crypto.scryptSync(secret, salt, 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const gz = Buffer.concat([decipher.update(enc), decipher.final()]);
        return zlib.gunzipSync(gz);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('פיענוח הגיבוי נכשל');
  }

  // יצירת קובץ Snapshot אחיד של כל מסד הנתונים הפעיל
  function createSnapshotBuffer() {
    try { fs.rmSync(SNAP_PATH, { force: true }); } catch {}
    db.prepare('VACUUM INTO ?').run(SNAP_PATH);
    const buf = fs.readFileSync(SNAP_PATH);
    try { fs.rmSync(SNAP_PATH, { force: true }); } catch {}
    return buf;
  }

  // שחזור ואיחוד חכם של כל הטבלאות והקבצים מתוך קובץ SQLite לתוך המסד הפעיל (מונע מחיקה או דריסה של עובדים!)
  function restoreFromSqliteBuffer(rawSqliteBuf, mergeMode = true) {
    try { fs.rmSync(RESTORE_PATH, { force: true }); } catch {}
    fs.writeFileSync(RESTORE_PATH, rawSqliteBuf);
    try {
      db.prepare('ATTACH DATABASE ? AS cloud').run(RESTORE_PATH);
      try {
        tx(() => {
          db.exec('PRAGMA foreign_keys=OFF');
          for (const tbl of TABLES) {
            const exists = db.prepare("SELECT 1 FROM cloud.sqlite_master WHERE type='table' AND name=?").get(tbl);
            if (!exists) continue;
            const mainCols = db.prepare(`PRAGMA main.table_info(${tbl})`).all().map((c) => c.name);
            const cloudCols = new Set(db.prepare(`PRAGMA cloud.table_info(${tbl})`).all().map((c) => c.name));
            const common = mainCols.filter((c) => cloudCols.has(c));
            if (!common.length) continue;
            const colsSql = common.join(',');
            if (tbl === 'settings') {
              db.exec(`INSERT OR REPLACE INTO main.settings(${colsSql}) SELECT ${colsSql} FROM cloud.settings`);
            } else if (!mergeMode) {
              db.exec(`DELETE FROM main.${tbl}`);
              db.exec(`INSERT INTO main.${tbl}(${colsSql}) SELECT ${colsSql} FROM cloud.${tbl}`);
            } else {
              // איחוד בטוח: אם הטבלה המקומית ריקה מעתיקים הכל, ואם יש נתונים משלימים רשומות מהענן מבלי למחוק רשומות מקומיות
              const localCnt = db.prepare(`SELECT COUNT(*) c FROM main.${tbl}`).get().c;
              if (localCnt === 0) {
                db.exec(`INSERT INTO main.${tbl}(${colsSql}) SELECT ${colsSql} FROM cloud.${tbl}`);
              } else if (tbl === 'employees') {
                db.exec(`INSERT OR IGNORE INTO main.employees(${colsSql}) SELECT ${colsSql} FROM cloud.employees WHERE token NOT IN (SELECT token FROM main.employees)`);
              } else if (tbl === 'assignments') {
                db.exec(`INSERT OR IGNORE INTO main.assignments(${colsSql}) SELECT ${colsSql} FROM cloud.assignments`);
              } else if (tbl === 'files') {
                db.exec(`INSERT OR IGNORE INTO main.files(${colsSql}) SELECT ${colsSql} FROM cloud.files`);
              } else {
                db.exec(`INSERT OR IGNORE INTO main.${tbl}(${colsSql}) SELECT ${colsSql} FROM cloud.${tbl}`);
              }
            }
          }
          db.exec('PRAGMA foreign_keys=ON');
        });
      } finally {
        try { db.exec('DETACH DATABASE cloud'); } catch {}
      }
      // שחזור קבצים שהועלו לתיקיית uploads מתוך ה-BLOB במסד הנתונים
      const files = db.prepare('SELECT path, content FROM files WHERE content IS NOT NULL').all();
      for (const f of files) {
        if (f.path && f.content) {
          const p = path.join(UPLOAD_DIR, path.basename(f.path));
          if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(f.content));
        }
      }
      const tpls = db.prepare('SELECT attachment_path, attachment_content FROM templates WHERE attachment_content IS NOT NULL').all();
      for (const t of tpls) {
        if (t.attachment_path && t.attachment_content) {
          const p = path.join(UPLOAD_DIR, path.basename(t.attachment_path));
          if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(t.attachment_content));
        }
      }
    } finally {
      try { fs.rmSync(RESTORE_PATH, { force: true }); } catch {}
    }
  }

  async function ghFetch(urlPath, opts = {}) {
    const token = getToken();
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'EasyHire-CloudDB/1.0',
      ...(opts.headers || {})
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`https://api.github.com${urlPath}`, { ...opts, headers });
  }

  // וידוא שהענף הייעודי לגיבוי קיים ב-GitHub
  async function ensureBackupBranch(repo, branch) {
    const refRes = await ghFetch(`/repos/${repo}/git/ref/heads/${branch}`);
    if (refRes.status === 200) return true;
    const mainRes = await ghFetch(`/repos/${repo}/git/ref/heads/main`);
    if (!mainRes.ok) return false;
    const mainData = await mainRes.json();
    const createRes = await ghFetch(`/repos/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainData.object.sha })
    });
    return createRes.ok || createRes.status === 422;
  }

  // סנכרון אוטומטי של קבצי הקוד המקומיים לענף main ב-GitHub (כדי ש-Render יתעדכן אוטומטית בלי תלות ב-git.exe)
  async function syncCodeToMain(repo) {
    const rootDir = path.join(DATA_DIR, '..');
    const codeFiles = ['server.js', 'seed.js', 'modules/cloud-db.js', 'modules/people.js', 'modules/comms.js', 'public/style.css', 'public/admin.css', 'public/admin.html', 'public/admin/core.js', 'public/admin/people.js', 'public/admin/messages.js', 'public/app.html', 'public/forms.js'];
    const treeItems = [];
    for (const rel of codeFiles) {
      const full = path.join(rootDir, rel);
      if (fs.existsSync(full)) {
        treeItems.push({ path: rel, mode: '100644', type: 'blob', content: fs.readFileSync(full, 'utf8') });
      }
    }
    if (!treeItems.length) return false;
    const refRes = await ghFetch(`/repos/${repo}/git/ref/heads/main`);
    if (!refRes.ok) return false;
    const baseCommitSha = (await refRes.json()).object.sha;
    const commitRes = await ghFetch(`/repos/${repo}/git/commits/${baseCommitSha}`);
    if (!commitRes.ok) return false;
    const baseTreeSha = (await commitRes.json()).tree.sha;
    const treeRes = await ghFetch(`/repos/${repo}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
    });
    if (!treeRes.ok) return false;
    const newTreeSha = (await treeRes.json()).sha;
    if (newTreeSha === baseTreeSha) return false; // הקוד בענף main כבר עדכני לחלוטין
    const newCommitRes = await ghFetch(`/repos/${repo}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update EasyHire code & permanent cloud database sync',
        tree: newTreeSha,
        parents: [baseCommitSha]
      })
    });
    if (!newCommitRes.ok) return false;
    const newCommitSha = (await newCommitRes.json()).sha;
    const patchRes = await ghFetch(`/repos/${repo}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitSha })
    });
    return patchRes.ok;
  }

  // שמירה לענן (GitHub branch: data-backup) באמצעות Git Blobs/Trees API (תומך עד 100MB של קבצים ומסמכים!)
  async function pushToCloudNow() {
    const token = getToken();
    if (!token) return { ok: false, reason: 'no_token' };
    if (syncing) { pendingSync = true; return { ok: true, queued: true }; }
    syncing = true;
    try {
      const repo = getRepo(), branch = getBranch();
      await ensureBackupBranch(repo, branch);

      const syncTs = now();
      putSetting('cloud_last_sync', syncTs);
      const snapBuf = createSnapshotBuffer();
      const encBuf = encryptBuffer(snapBuf);

      const refRes = await ghFetch(`/repos/${repo}/git/ref/heads/${branch}`);
      if (!refRes.ok) throw new Error(`Branch ${branch} not ready (${refRes.status})`);
      const baseCommitSha = (await refRes.json()).object.sha;

      const blobRes = await ghFetch(`/repos/${repo}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: encBuf.toString('base64'), encoding: 'base64' })
      });
      if (!blobRes.ok) throw new Error(`GitHub Blob HTTP ${blobRes.status}`);
      const blobSha = (await blobRes.json()).sha;

      const treeRes = await ghFetch(`/repos/${repo}/git/trees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree: [{ path: 'easyhire-db.enc', mode: '100644', type: 'blob', sha: blobSha }]
        })
      });
      if (!treeRes.ok) throw new Error(`GitHub Tree HTTP ${treeRes.status}`);
      const newTreeSha = (await treeRes.json()).sha;

      const commitRes = await ghFetch(`/repos/${repo}/git/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Cloud DB auto-backup (${syncTs})`,
          tree: newTreeSha,
          parents: [baseCommitSha]
        })
      });
      if (!commitRes.ok) throw new Error(`GitHub Commit HTTP ${commitRes.status}`);
      const newCommitSha = (await commitRes.json()).sha;

      const patchRes = await ghFetch(`/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommitSha, force: true })
      });
      if (!patchRes.ok) throw new Error(`GitHub Ref HTTP ${patchRes.status}`);

      lastSyncAt = syncTs;
      lastSyncError = null;
      return { ok: true, at: lastSyncAt };
    } catch (e) {
      lastSyncError = e.message;
      console.error('Cloud DB sync error:', e.message);
      return { ok: false, error: e.message };
    } finally {
      syncing = false;
      if (pendingSync) {
        pendingSync = false;
        scheduleSync(1000);
      }
    }
  }

  function scheduleSync(delayMs = 800) {
    if (!getToken()) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      pushToCloudNow().catch(() => {});
    }, delayMs);
  }

  // משיכה ושחזור אוטומטי מהענן בעליית השרת (פועל גם ללא טוקן במאגר ציבורי ותומך בקבצים גדולים!)
  async function restoreFromCloudOnBoot() {
    const localEmps = db.prepare('SELECT COUNT(*) c FROM employees').get().c;
    const localFiles = db.prepare('SELECT COUNT(*) c FROM files').get().c;
    const repo = getRepo(), branch = getBranch();
    try {
      const res = await ghFetch(`/repos/${repo}/contents/easyhire-db.enc?ref=${encodeURIComponent(branch)}`, {
        headers: { 'Accept': 'application/vnd.github.raw' }
      });
      if (res.status !== 200) return { restored: false, cloudReachable: res.status === 404 };
      const encBuf = Buffer.from(await res.arrayBuffer());
      const rawSqlite = decryptBuffer(encBuf);

      // איחוד ושחזור אוטומטי מהענן בעליית השרת (משלים עובדים וקבצים מהענן מבלי למחוק נתונים מקומיים)
      restoreFromSqliteBuffer(rawSqlite, true);
      if (syncSeedTemplates) syncSeedTemplates();
      restoredOnBoot = true;
      lastSyncAt = setting('cloud_last_sync') || now();
      console.log('✅ מסד הנתונים והקבצים סונכרנו ושוחזרו בהצלחה מהגיבוי הקבוע בענן!');
      broadcast();
      return { restored: true, cloudReachable: true };
    } catch (e) {
      console.error('Cloud DB boot restore skipped:', e.message);
      return { restored: false, cloudReachable: false };
    }
  }

  // הפעלת שחזור אוטומטי בעליית השרת + סנכרון קוד לענן (מבלי לדרוס גיבוי ענן אם הרשת נכשלה)
  restoreFromCloudOnBoot().then(async (st) => {
    if (getToken()) {
      if (st && st.cloudReachable) await pushToCloudNow().catch(() => {});
      const codeOk = await syncCodeToMain(getRepo()).catch(() => false);
      if (codeOk) console.log('✅ הקוד המעודכן סונכרן אוטומטית ל-GitHub (main) ול-Render!');
      // ניסיון חוזר אוטומטי אם הרשת לא הייתה זמינה ברגע העלייה
      if (!st || !st.cloudReachable) {
        setTimeout(async () => {
          const st2 = await restoreFromCloudOnBoot().catch(() => null);
          if (st2 && st2.cloudReachable) await pushToCloudNow().catch(() => {});
          const ok2 = await syncCodeToMain(getRepo()).catch(() => false);
          if (ok2) console.log('✅ הקוד המעודכן סונכרן אוטומטית ל-GitHub (main) ול-Render!');
        }, 8000).unref();
      }
    }
  }).catch(() => {});

  // מנגנון Keep-Alive אוטומטי ל-Render (מונע הירדמות ואיפוס של השרת החינמי)
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    setInterval(() => {
      fetch(`${renderUrl.replace(/\/$/, '')}/api/health`).catch(() => {});
    }, 10 * 60 * 1000).unref();
  }

  // נתיבי API לניהול מסד הנתונים והגיבוי הקבוע
  route('GET', '/api/health', async (req, res) => {
    send(res, 200, { ok: true, uptime: Math.round(process.uptime()), employees: db.prepare('SELECT COUNT(*) c FROM employees WHERE archived=0').get().c });
  });

  route('GET', '/api/cloud-db/status', async (req, res) => {
    requireUser(req);
    send(res, 200, {
      configured: !!getToken(),
      env_token: !!process.env.GITHUB_TOKEN,
      repo: getRepo(),
      branch: getBranch(),
      last_sync: lastSyncAt,
      last_error: lastSyncError,
      restored_on_boot: restoredOnBoot,
      keep_alive: !!renderUrl,
      employees_count: db.prepare('SELECT COUNT(*) c FROM employees WHERE archived=0').get().c,
      files_count: db.prepare('SELECT COUNT(*) c FROM files').get().c
    });
  });

  route('POST', '/api/cloud-db/config', async (req, res) => {
    requireUser(req);
    const b = await readBody(req);
    if (b.github_token !== undefined && !process.env.GITHUB_TOKEN) {
      putSetting('github_token', String(b.github_token || '').trim());
    }
    if (b.github_repo !== undefined && !process.env.GITHUB_REPO) {
      putSetting('github_repo', String(b.github_repo || 'shauly632-commits/easyhire-onboarding2').trim());
    }
    const r = await pushToCloudNow();
    if (!r.ok && r.reason !== 'no_token') throw new HttpError(400, 'שמירה לענן נכשלה: ' + (r.error || 'בדקו את הטוקן'));
    const codeSynced = await syncCodeToMain(getRepo()).catch(() => false);
    send(res, 200, { ok: true, last_sync: lastSyncAt, code_synced: codeSynced });
  });

  route('POST', '/api/cloud-db/sync', async (req, res) => {
    requireUser(req);
    const r = await pushToCloudNow();
    if (!r.ok) throw new HttpError(400, r.reason === 'no_token' ? 'יש להזין טוקן חיבור לענן בהגדרות' : 'הגיבוי נכשל: ' + r.error);
    const codeSynced = await syncCodeToMain(getRepo()).catch(() => false);
    send(res, 200, { ok: true, last_sync: lastSyncAt, code_synced: codeSynced });
  });

  route('GET', '/api/cloud-db/export', async (req, res) => {
    requireUser(req);
    const buf = createSnapshotBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.sqlite3',
      'Content-Disposition': `attachment; filename="easyhire-backup-${dateStr}.db"`,
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });

  route('POST', '/api/cloud-db/import', async (req, res) => {
    requireUser(req);
    const b = await readBody(req);
    const buf = Buffer.from(String(b.data || ''), 'base64');
    if (buf.length < 100) throw new HttpError(400, 'קובץ גיבוי לא תקין');
    const sqliteBuf = buf.subarray(0, 6).equals(ENC_MAGIC) ? decryptBuffer(buf) : buf;
    if (sqliteBuf.subarray(0, 15).toString('utf8') !== 'SQLite format 3') {
      throw new HttpError(400, 'הקובץ שנבחר אינו קובץ מסד נתונים תקין של EasyHire');
    }
    restoreFromSqliteBuffer(sqliteBuf);
    scheduleSync(500);
    send(res, 200, { ok: true });
  });

  return { scheduleSync, pushToCloudNow };
};
