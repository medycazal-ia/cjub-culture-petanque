// MontagePourTous — stockage des données : fichier JSON (par défaut) ou base MySQL / MariaDB (si MPT_DB_NAME est défini).
// Le serveur travaille sur un objet en mémoire (db) ; sauver() l'enregistre : fichier JSON, ou lignes SQL modifiées (transaction).
const fs = require('fs');
const path = require('path');

const vide = () => ({ users: [], sessions: [], seq: 0, personnes: [], seqP: 0, reglages: {} });

/* ---------- fichier JSON ---------- */
async function ouvrirJson(dossier) {
  fs.mkdirSync(dossier, { recursive: true });
  const f = path.join(dossier, 'db.json');
  let db = vide();
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { /* première exécution */ }
  return {
    type: 'json', db,
    sauver: (d) => { const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d)); fs.renameSync(tmp, f); return Promise.resolve(); },
    fermer: () => Promise.resolve(),
  };
}

/* ---------- MySQL / MariaDB ---------- */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS mpt_users (
    id INT NOT NULL PRIMARY KEY, email VARCHAR(254) NOT NULL, prenom VARCHAR(80) NOT NULL, nom VARCHAR(80) NOT NULL, tel VARCHAR(30) NOT NULL DEFAULT '',
    sel CHAR(32) NOT NULL, hash CHAR(128) NOT NULL, cree_le VARCHAR(30) NOT NULL, consentement_le VARCHAR(30) NOT NULL, nouvelles TINYINT(1) NOT NULL DEFAULT 0,
    derniere_connexion VARCHAR(30) NULL, nb_connexions INT NOT NULL DEFAULT 0, personne_id INT NULL, UNIQUE KEY uq_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS mpt_sessions (h CHAR(64) NOT NULL PRIMARY KEY, uid INT NOT NULL, exp BIGINT NOT NULL, KEY idx_uid (uid)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS mpt_personnes (id INT NOT NULL PRIMARY KEY, data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS mpt_reglages (id TINYINT NOT NULL PRIMARY KEY, data TEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS mpt_meta (cle VARCHAR(30) NOT NULL PRIMARY KEY, valeur BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
const COLS = {
  mpt_users: ['id', 'email', 'prenom', 'nom', 'tel', 'sel', 'hash', 'cree_le', 'consentement_le', 'nouvelles', 'derniere_connexion', 'nb_connexions', 'personne_id'],
  mpt_sessions: ['h', 'uid', 'exp'], mpt_personnes: ['id', 'data'], mpt_reglages: ['id', 'data'], mpt_meta: ['cle', 'valeur'],
};
const CLE = { mpt_users: 'id', mpt_sessions: 'h', mpt_personnes: 'id', mpt_reglages: 'id', mpt_meta: 'cle' };

const userVersLigne = (u) => [u.id, u.email, u.prenom, u.nom, u.tel || '', u.sel, u.hash, u.creeLe, u.consentementLe || u.creeLe, u.nouvelles ? 1 : 0, u.derniereConnexion || null, u.nbConnexions || 0, u.personneId == null ? null : u.personneId];
const ligneVersUser = (r) => { const u = { id: r.id, email: r.email, prenom: r.prenom, nom: r.nom, tel: r.tel, sel: r.sel, hash: r.hash, creeLe: r.cree_le, consentementLe: r.consentement_le, nouvelles: !!r.nouvelles, derniereConnexion: r.derniere_connexion, nbConnexions: r.nb_connexions }; if (r.personne_id != null) u.personneId = r.personne_id; return u; };

function lignes(db) { // état en mémoire → { "table:cle": valeurs de colonnes }
  const m = new Map();
  db.users.forEach((u) => m.set('mpt_users:' + u.id, userVersLigne(u)));
  db.sessions.forEach((s) => m.set('mpt_sessions:' + s.h, [s.h, s.uid, s.exp]));
  (db.personnes || []).forEach((p) => m.set('mpt_personnes:' + p.id, [p.id, JSON.stringify(p)]));
  m.set('mpt_reglages:1', [1, JSON.stringify(db.reglages || {})]);
  m.set('mpt_meta:seq', ['seq', db.seq || 0]); m.set('mpt_meta:seqP', ['seqP', db.seqP || 0]);
  return m;
}

async function charger(pool) {
  const db = vide(), q = async (t) => (await pool.query('SELECT * FROM ' + t))[0];
  db.users = (await q('mpt_users')).map(ligneVersUser);
  db.sessions = (await q('mpt_sessions')).map((r) => ({ h: r.h, uid: r.uid, exp: Number(r.exp) }));
  db.personnes = (await q('mpt_personnes')).map((r) => JSON.parse(r.data));
  const rg = (await q('mpt_reglages'))[0]; if (rg) db.reglages = JSON.parse(rg.data);
  (await q('mpt_meta')).forEach((r) => { db[r.cle] = Number(r.valeur); });
  return db;
}

async function ouvrirMysql(env, dossier) {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({ host: env.MPT_DB_HOST || 'localhost', port: +env.MPT_DB_PORT || 3306, user: env.MPT_DB_USER, password: env.MPT_DB_PASSWORD, database: env.MPT_DB_NAME, charset: 'utf8mb4', waitForConnections: true, connectionLimit: 4 });
  for (const t of TABLES) await pool.query(t);
  let db = await charger(pool), importe = false;
  if (!db.users.length && !db.personnes.length) { // première mise en service : reprise d'un éventuel ancien db.json
    try { db = Object.assign(vide(), JSON.parse(fs.readFileSync(path.join(dossier, 'db.json'), 'utf8'))); importe = true; console.log('Import des données de data/db.json vers la base MySQL.'); } catch (e) { /* rien à importer */ }
  }
  let snap = importe ? new Map() : lignes(db), occupe = false, encore = false, attente = [];
  async function ecrire() {
    const nouv = lignes(db), conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [k, v] of snap) if (!nouv.has(k)) { const i = k.indexOf(':'), t = k.slice(0, i); await conn.query(`DELETE FROM ${t} WHERE ${CLE[t]} = ?`, [k.slice(i + 1)]); }
      for (const [k, v] of nouv) {
        if (snap.has(k) && JSON.stringify(snap.get(k)) === JSON.stringify(v)) continue;
        const t = k.slice(0, k.indexOf(':')), c = COLS[t];
        await conn.query(`INSERT INTO ${t} (${c.join(',')}) VALUES (${c.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${c.filter((x) => x !== CLE[t]).map((x) => x + '=VALUES(' + x + ')').join(',')}`, v);
      }
      await conn.commit(); snap = nouv;
    } catch (e) { try { await conn.rollback(); } catch (x) { /* ignoré */ } throw e; } finally { conn.release(); }
  }
  async function vider() {
    if (occupe) { encore = true; return; } occupe = true;
    try { do { encore = false; await ecrire(); } while (encore); } catch (e) { console.error('⚠ Écriture dans la base impossible :', e.message); throw e; } finally { occupe = false; const a = attente; attente = []; a.forEach((f) => f()); }
  }
  const sauver = () => new Promise((ok) => { attente.push(ok); setImmediate(() => vider().catch(() => {})); });
  await vider();
  return { type: 'mysql', db, sauver: (d) => { db = d; return sauver(); }, fermer: async () => { await vider().catch(() => {}); await pool.end(); } };
}

async function ouvrir({ dossier, env }) { return env.MPT_DB_NAME ? ouvrirMysql(env, dossier) : ouvrirJson(dossier); }
module.exports = { ouvrir, vide };
