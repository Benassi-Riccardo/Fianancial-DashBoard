import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

let pool = null;

// File fallback path (used when DATABASE_URL is not set)
const DATA_DIR = path.resolve(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DATA_FILE = path.join(DATA_DIR, 'userdata.json');

function ensureFallbackStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8');
  }
}

export function parseConnectionString(url) {
  if (!url) return url;
  // If user pasted with brackets e.g. [password], strip them
  return url.replace(/:\[([^\]]+)\]@/, ':$1@');
}

export async function initDb() {
  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl) {
    const dbUrl = parseConnectionString(rawUrl);
    try {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });

      // Create all tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255),
          picture VARCHAR(500),
          provider VARCHAR(50) DEFAULT 'local',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          user_id VARCHAR(255) PRIMARY KEY,
          budget_mensile NUMERIC DEFAULT 1500,
          liquidita_iniziale NUMERIC DEFAULT 5000,
          categorie JSONB DEFAULT '[]'::jsonb
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          categoria VARCHAR(255) NOT NULL,
          importo NUMERIC NOT NULL,
          data TIMESTAMP WITH TIME ZONE NOT NULL,
          tipo VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sinking_funds (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          attivita VARCHAR(255) NOT NULL,
          stato VARCHAR(50) DEFAULT 'In corso',
          obiettivo NUMERIC NOT NULL,
          risparmio_mensile NUMERIC DEFAULT 0,
          spese NUMERIC DEFAULT 0,
          data_scadenza TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assets (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          asset VARCHAR(255) NOT NULL,
          quantita NUMERIC NOT NULL,
          pmc NUMERIC NOT NULL,
          prezzo_attuale NUMERIC NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS debts (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          valore_debito_iniziale NUMERIC NOT NULL,
          rata_mensile NUMERIC NOT NULL,
          totale_pagato NUMERIC NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sinking_funds_user ON sinking_funds(user_id);
        CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
        CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);

        ALTER TABLE sinking_funds ADD COLUMN IF NOT EXISTS monthly_allocation NUMERIC DEFAULT 0;
      `);

      console.log('✅ Supabase PostgreSQL connected and all relational tables verified.');
      return;
    } catch (err) {
      console.error('⚠️ Failed to connect to Supabase DATABASE_URL. Falling back to local storage:', err.message);
      pool = null;
    }
  }

  console.log('📁 Using file storage fallback for users & finance data (.data/)');
  ensureFallbackStorage();
}

// Default settings with common categories
export const DEFAULT_CATEGORIES = [
  { nome: 'Stipendio', tipo: 'Entrata', emoji: '💰' },
  { nome: 'Casa', tipo: 'Spesa', emoji: '🏠' },
  { nome: 'Cibo/Spesa', tipo: 'Spesa', emoji: '🛒' },
  { nome: 'Abbonamenti', tipo: 'Spesa', emoji: '📺' },
  { nome: 'Trasporti', tipo: 'Spesa', emoji: '🚗' },
  { nome: 'Svago', tipo: 'Spesa', emoji: '🎉' },
  { nome: 'Salute', tipo: 'Spesa', emoji: '💊' },
  { nome: 'Shopping', tipo: 'Spesa', emoji: '🛍️' },
  { nome: 'Risparmio', tipo: 'Risparmio', emoji: '🏦' },
  { nome: 'Accantonamenti', tipo: 'Spesa', emoji: '🎯' }
];

// --- User Auth Helpers ---
export async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  if (pool) {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    return res.rows[0] || null;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const users = JSON.parse(raw || '[]');
  return users.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
}

export async function findUserById(id) {
  if (pool) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const users = JSON.parse(raw || '[]');
  return users.find((u) => String(u.id) === String(id)) || null;
}

export async function createUser({ email, passwordHash = null, name = '', picture = '', provider = 'local' }) {
  const normalizedEmail = email.toLowerCase().trim();

  let user;
  if (pool) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, name, picture, provider)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [normalizedEmail, passwordHash, name, picture, provider]
    );
    user = res.rows[0];
  } else {
    ensureFallbackStorage();
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(raw || '[]');
    user = {
      id: Date.now().toString(),
      email: normalizedEmail,
      password_hash: passwordHash,
      name,
      picture,
      provider,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  }

  // Create initial settings for the new user
  await initUserSettings(user.id);
  return user;
}

// --- Per-User Finance Data Functions ---

export async function initUserSettings(userId) {
  const uId = String(userId);
  if (pool) {
    await pool.query(
      `INSERT INTO user_settings (user_id, budget_mensile, liquidita_iniziale, categorie)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO NOTHING`,
      [uId, 1500, 5000, JSON.stringify(DEFAULT_CATEGORIES)]
    );
  }
}

export async function updateUserSettings(userId, { budgetMensile, liquiditaIniziale, categorie }) {
  const uId = String(userId);
  const budget = budgetMensile !== undefined ? parseFloat(budgetMensile) : 1500;
  const liquidita = liquiditaIniziale !== undefined ? parseFloat(liquiditaIniziale) : 5000;
  const cats = Array.isArray(categorie) ? categorie : DEFAULT_CATEGORIES;

  if (pool) {
    const res = await pool.query(
      `INSERT INTO user_settings (user_id, budget_mensile, liquidita_iniziale, categorie)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         budget_mensile = EXCLUDED.budget_mensile,
         liquidita_iniziale = EXCLUDED.liquidita_iniziale,
         categorie = EXCLUDED.categorie
       RETURNING *`,
      [uId, budget, liquidita, JSON.stringify(cats)]
    );

    const row = res.rows[0];
    const savedCats = (typeof row?.categorie === 'string'
      ? JSON.parse(row.categorie)
      : row?.categorie) || cats;

    return {
      budgetMensile: parseFloat(row?.budget_mensile || budget),
      liquiditaIniziale: parseFloat(row?.liquidita_iniziale || liquidita),
      categorie: savedCats,
    };
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (!allData[uId]) {
    allData[uId] = {
      transactions: [],
      sinkingFunds: [],
      assets: [],
      debts: [],
      settings: { liquiditaIniziale: liquidita, budgetMensile: budget, categorie: cats },
      budget: { speso: 0, budget },
    };
  } else {
    allData[uId].settings = {
      liquiditaIniziale: liquidita,
      budgetMensile: budget,
      categorie: cats,
    };
    if (allData[uId].budget) {
      allData[uId].budget.budget = budget;
    }
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');

  return {
    budgetMensile: budget,
    liquiditaIniziale: liquidita,
    categorie: cats,
  };
}

export async function getUserFinances(userId) {
  const uId = String(userId);

  if (pool) {
    const [settingsRes, txRes, sinkingRes, assetRes, debtRes] = await Promise.all([
      pool.query('SELECT * FROM user_settings WHERE user_id = $1', [uId]),
      pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY data DESC', [uId]),
      pool.query('SELECT * FROM sinking_funds WHERE user_id = $1', [uId]),
      pool.query('SELECT * FROM assets WHERE user_id = $1', [uId]),
      pool.query('SELECT * FROM debts WHERE user_id = $1', [uId]),
    ]);

    let userSetting = settingsRes.rows[0];
    if (!userSetting) {
      await initUserSettings(uId);
      const res = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [uId]);
      userSetting = res.rows[0];
    }

    const categories = (typeof userSetting?.categorie === 'string'
      ? JSON.parse(userSetting.categorie)
      : userSetting?.categorie) || DEFAULT_CATEGORIES;

    const budgetMensile = parseFloat(userSetting?.budget_mensile || 1500);
    const liquiditaIniziale = parseFloat(userSetting?.liquidita_iniziale || 5000);

    const transactions = txRes.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      categoria: row.categoria,
      importo: parseFloat(row.importo),
      data: new Date(row.data).toISOString(),
      tipo: row.tipo,
    }));

    const sinkingFunds = sinkingRes.rows.map((row) => ({
      id: row.id,
      attivita: row.attivita,
      stato: row.stato,
      obiettivo: parseFloat(row.obiettivo),
      risparmioMensile: parseFloat(row.risparmio_mensile || 0),
      spese: parseFloat(row.spese || 0),
      dataScadenza: row.data_scadenza ? new Date(row.data_scadenza).toISOString() : '',
      monthlyAllocation: parseFloat(row.monthly_allocation || 0),
    }));

    const assets = assetRes.rows.map((row) => ({
      id: row.id,
      asset: row.asset,
      quantita: parseFloat(row.quantita),
      pmc: parseFloat(row.pmc),
      prezzoAttuale: parseFloat(row.prezzo_attuale),
    }));

    const debts = debtRes.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      valoreDebitoIniziale: parseFloat(row.valore_debito_iniziale),
      rataMensile: parseFloat(row.rata_mensile),
      totalePagato: parseFloat(row.totale_pagato),
    }));

    return {
      kpis: {},
      budget: {
        speso: 0,
        budget: budgetMensile,
      },
      transactions,
      sinkingFunds,
      assets,
      debts,
      settings: {
        liquiditaIniziale,
        budgetMensile,
        categorie: categories,
      },
    };
  }

  // Fallback storage
  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  const userFinance = allData[uId] || {
    transactions: [],
    sinkingFunds: [],
    assets: [],
    debts: [],
    settings: {
      liquiditaIniziale: 5000,
      budgetMensile: 1500,
      categorie: DEFAULT_CATEGORIES,
    },
    budget: { speso: 0, budget: 1500 },
  };

  return {
    kpis: {},
    budget: userFinance.budget || { speso: 0, budget: 1500 },
    transactions: userFinance.transactions || [],
    sinkingFunds: userFinance.sinkingFunds || [],
    assets: userFinance.assets || [],
    debts: userFinance.debts || [],
    settings: userFinance.settings || {
      liquiditaIniziale: 5000,
      budgetMensile: 1500,
      categorie: DEFAULT_CATEGORIES,
    },
  };
}

export async function addUserTransaction(userId, tx) {
  const uId = String(userId);
  const txId = tx.id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const dataIso = tx.data ? new Date(tx.data).toISOString() : new Date().toISOString();

  if (pool) {
    await pool.query(
      `INSERT INTO transactions (id, user_id, nome, categoria, importo, data, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txId, uId, tx.nome || tx.categoria, tx.categoria, tx.importo, dataIso, tx.tipo || 'Spesa']
    );
    return { id: txId, ...tx, data: dataIso };
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (!allData[uId]) {
    allData[uId] = {
      transactions: [],
      sinkingFunds: [],
      assets: [],
      debts: [],
      settings: { liquiditaIniziale: 5000, budgetMensile: 1500, categorie: DEFAULT_CATEGORIES },
      budget: { speso: 0, budget: 1500 },
    };
  }
  const newTx = { id: txId, ...tx, data: dataIso };
  allData[uId].transactions.unshift(newTx);
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
  return newTx;
}

export async function deleteUserTransaction(userId, transactionId) {
  const uId = String(userId);
  if (pool) {
    await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [transactionId, uId]);
    return true;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (allData[uId]?.transactions) {
    allData[uId].transactions = allData[uId].transactions.filter((t) => t.id !== transactionId);
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
  }
  return true;
}

export async function addSinkingFund(userId, { attivita, obiettivo, dataScadenza, monthlyAllocation = 0, initialDeposit = 0 }) {
  const uId = String(userId);
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const target = parseFloat(obiettivo);
  const deposit = parseFloat(initialDeposit || 0);
  const alloc = parseFloat(monthlyAllocation || 0);
  const dateIso = dataScadenza ? new Date(dataScadenza).toISOString() : null;
  const stato = deposit >= target ? 'Completata' : 'In corso';

  if (pool) {
    const res = await pool.query(
      `INSERT INTO sinking_funds (id, user_id, attivita, stato, obiettivo, risparmio_mensile, spese, data_scadenza, monthly_allocation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, uId, attivita, stato, target, deposit, 0, dateIso, alloc]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      attivita: r.attivita,
      stato: r.stato,
      obiettivo: parseFloat(r.obiettivo),
      risparmioMensile: parseFloat(r.risparmio_mensile || 0),
      spese: parseFloat(r.spese || 0),
      dataScadenza: r.data_scadenza ? new Date(r.data_scadenza).toISOString() : '',
      monthlyAllocation: parseFloat(r.monthly_allocation || 0),
    };
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (!allData[uId]) allData[uId] = {};
  if (!allData[uId].sinkingFunds) allData[uId].sinkingFunds = [];

  const newFund = {
    id,
    attivita,
    stato,
    obiettivo: target,
    risparmioMensile: deposit,
    spese: 0,
    dataScadenza: dateIso || '',
    monthlyAllocation: alloc,
  };
  allData[uId].sinkingFunds.push(newFund);
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
  return newFund;
}

export async function deleteSinkingFund(userId, fundId) {
  const uId = String(userId);
  if (pool) {
    await pool.query('DELETE FROM sinking_funds WHERE id = $1 AND user_id = $2', [fundId, uId]);
    return true;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (allData[uId]?.sinkingFunds) {
    allData[uId].sinkingFunds = allData[uId].sinkingFunds.filter((f) => String(f.id) !== String(fundId));
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
  }
  return true;
}

export async function transactSinkingFund(userId, fundId, { type, amount, note = '', date = null }) {
  const uId = String(userId);
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    throw new Error('Importo non valido.');
  }

  const cleanNote = note ? String(note).trim() : '';
  const txDateIso = date ? new Date(date).toISOString() : new Date().toISOString();
  const txTipo = type === 'deposit' ? 'Spesa' : 'Entrata';
  const txCategoria = 'Accantonamenti';

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query('SELECT * FROM sinking_funds WHERE id = $1 AND user_id = $2', [fundId, uId]);
      if (res.rows.length === 0) {
        throw new Error('Fondo di accantonamento non trovato.');
      }

      const fund = res.rows[0];
      let risparmio = parseFloat(fund.risparmio_mensile || 0);
      let spese = parseFloat(fund.spese || 0);
      const obiettivo = parseFloat(fund.obiettivo);

      if (type === 'deposit') {
        risparmio += amt;
      } else if (type === 'withdraw') {
        const currentBalance = risparmio - spese;
        if (amt > currentBalance) {
          throw new Error(`Fondi insufficienti. Saldo disponibile: €${currentBalance.toFixed(2)}`);
        }
        spese += amt;
      } else {
        throw new Error('Tipo operazione non valido.');
      }

      const currentBalance = risparmio - spese;
      const nuovoStato = currentBalance >= obiettivo ? 'Completata' : 'In corso';

      const updateRes = await client.query(
        `UPDATE sinking_funds 
         SET risparmio_mensile = $1, spese = $2, stato = $3 
         WHERE id = $4 AND user_id = $5 
         RETURNING *`,
        [risparmio, spese, nuovoStato, fundId, uId]
      );

      // Create global transaction
      const txId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      const actionLabel = type === 'deposit' ? 'Accantonamento' : 'Prelievo';
      const txNome = cleanNote 
        ? `${actionLabel}: ${fund.attivita} - ${cleanNote}` 
        : `${actionLabel}: ${fund.attivita}`;

      const txRes = await client.query(
        `INSERT INTO transactions (id, user_id, nome, categoria, importo, data, tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [txId, uId, txNome, txCategoria, amt, txDateIso, txTipo]
      );

      await client.query('COMMIT');

      const r = updateRes.rows[0];
      const t = txRes.rows[0];

      return {
        fund: {
          id: r.id,
          attivita: r.attivita,
          stato: r.stato,
          obiettivo: parseFloat(r.obiettivo),
          risparmioMensile: parseFloat(r.risparmio_mensile || 0),
          spese: parseFloat(r.spese || 0),
          dataScadenza: r.data_scadenza ? new Date(r.data_scadenza).toISOString() : '',
          monthlyAllocation: parseFloat(r.monthly_allocation || 0),
        },
        transaction: {
          id: t.id,
          nome: t.nome,
          categoria: t.categoria,
          importo: parseFloat(t.importo),
          data: t.data,
          tipo: t.tipo
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  if (!allData[uId]?.sinkingFunds) {
    throw new Error('Fondo di accantonamento non trovato.');
  }

  const fundIndex = allData[uId].sinkingFunds.findIndex((f) => String(f.id) === String(fundId));
  if (fundIndex === -1) {
    throw new Error('Fondo di accantonamento non trovato.');
  }

  const fund = allData[uId].sinkingFunds[fundIndex];
  let risparmio = parseFloat(fund.risparmioMensile || 0);
  let spese = parseFloat(fund.spese || 0);
  const obiettivo = parseFloat(fund.obiettivo);

  if (type === 'deposit') {
    risparmio += amt;
  } else if (type === 'withdraw') {
    const currentBalance = risparmio - spese;
    if (amt > currentBalance) {
      throw new Error(`Fondi insufficienti. Saldo disponibile: €${currentBalance.toFixed(2)}`);
    }
    spese += amt;
  } else {
    throw new Error('Tipo operazione non valido.');
  }

  fund.risparmioMensile = risparmio;
  fund.spese = spese;
  fund.stato = (risparmio - spese) >= obiettivo ? 'Completata' : 'In corso';

  // Create global transaction in fallback storage
  const txId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const actionLabel = type === 'deposit' ? 'Accantonamento' : 'Prelievo';
  const txNome = cleanNote 
    ? `${actionLabel}: ${fund.attivita} - ${cleanNote}` 
    : `${actionLabel}: ${fund.attivita}`;

  const newTx = {
    id: txId,
    nome: txNome,
    categoria: txCategoria,
    importo: amt,
    data: txDateIso,
    tipo: txTipo
  };

  if (!allData[uId].transactions) {
    allData[uId].transactions = [];
  }
  allData[uId].transactions.unshift(newTx);

  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');

  return {
    fund,
    transaction: newTx
  };
}

export async function bulkInsertUserData(userId, { transactions = [], sinkingFunds = [], assets = [], debts = [], settings = null }) {
  const uId = String(userId);

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (settings) {
        await client.query(
          `INSERT INTO user_settings (user_id, budget_mensile, liquidita_iniziale, categorie)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET
             budget_mensile = EXCLUDED.budget_mensile,
             liquidita_iniziale = EXCLUDED.liquidita_iniziale,
             categorie = EXCLUDED.categorie`,
          [
            uId,
            settings.budgetMensile || 1500,
            settings.liquiditaIniziale || 5000,
            JSON.stringify(settings.categorie || DEFAULT_CATEGORIES),
          ]
        );
      }

      for (const tx of transactions) {
        const id = tx.id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await client.query(
          `INSERT INTO transactions (id, user_id, nome, categoria, importo, data, tipo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [id, uId, tx.nome || tx.categoria, tx.categoria, tx.importo, new Date(tx.data).toISOString(), tx.tipo || 'Spesa']
        );
      }

      for (const sf of sinkingFunds) {
        const id = sf.id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await client.query(
          `INSERT INTO sinking_funds (id, user_id, attivita, stato, obiettivo, risparmio_mensile, spese, data_scadenza)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [id, uId, sf.attivita, sf.stato || 'In corso', sf.obiettivo, sf.risparmioMensile || 0, sf.spese || 0, sf.dataScadenza ? new Date(sf.dataScadenza).toISOString() : null]
        );
      }

      for (const a of assets) {
        const id = a.id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await client.query(
          `INSERT INTO assets (id, user_id, asset, quantita, pmc, prezzo_attuale)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [id, uId, a.asset, a.quantita, a.pmc, a.prezzoAttuale]
        );
      }

      for (const d of debts) {
        const id = d.id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await client.query(
          `INSERT INTO debts (id, user_id, nome, valore_debito_iniziale, rata_mensile, totale_pagato)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [id, uId, d.nome, d.valoreDebitoIniziale, d.rataMensile, d.totalePagato]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const allData = JSON.parse(raw || '{}');
  allData[uId] = {
    transactions,
    sinkingFunds,
    assets,
    debts,
    settings: settings || { liquiditaIniziale: 5000, budgetMensile: 1500, categorie: DEFAULT_CATEGORIES },
    budget: { speso: 0, budget: settings?.budgetMensile || 1500 },
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
}
