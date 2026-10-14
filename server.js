import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { 
  initDb, 
  findUserByEmail, 
  findUserById, 
  createUser, 
  getUserFinances, 
  addUserTransaction, 
  deleteUserTransaction, 
  bulkInsertUserData,
  updateUserSettings
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'financeflow_jwt_secret_dev_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Initialize DB
initDb().catch((err) => console.error('Database init error:', err));

app.use(cors());
app.use(express.json());

// --- Authentication Helper & Middleware ---
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso non autorizzato. Effettua il login.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessione scaduta o non valida. Effettua nuovamente il login.' });
  }
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve contenere almeno 6 caratteri.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Un account con questa email esiste già.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      provider: 'local',
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Errore durante la registrazione.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Inserisci email e password.' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Errore durante il login.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Token Google mancante.' });
    }

    let ticket;
    try {
      ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID || undefined,
      });
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Verifica Google non riuscita. Token non valido o scaduto.' });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Impossibile recuperare il profilo Google.' });
    }

    let user = await findUserByEmail(payload.email);
    if (!user) {
      user = await createUser({
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || '',
        provider: 'google',
      });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error('❌ Google auth error:', err);
    res.status(500).json({ error: 'Errore durante l\'accesso con Google.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno.' });
  }
});

// --- Google Sheets Auth ---
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in .env');
  }

  // Strip leading/trailing quotes if they exist (common with dotenv)
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }

  const formattedKey = key.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetData(sheets, spreadsheetId, range) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values || [];
  } catch (err) {
    console.error(`❌ Error reading range ${range}:`, err.message);
    return [];
  }
}

// Helper to get column value from alphabetical column letter (e.g. 'C', 'P')
function getValueByCol(row, colLetter) {
  let index = 0;
  for (let i = 0; i < colLetter.length; i++) {
    index = index * 26 + (colLetter.charCodeAt(i) - 64);
  }
  index = index - 1; // 0-indexed
  return row[index] !== undefined ? String(row[index]).trim() : '';
}

// Localized number parser (e.g. '€ 1.500,00' -> 1500)
function parseFormattedNumber(val) {
  if (!val) return 0;
  let clean = val
    .replace(/[€\s]/g, '')      // Remove € and spaces
    .replace(/\./g, '')         // Remove dots (thousand separators)
    .replace(/,/g, '.');        // Replace comma with dot (decimal separator)
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Localized date parser (e.g. '01/01/2026' or Excel serial date -> ISO string)
function parseSheetDate(val) {
  if (!val) return new Date().toISOString();
  
  // Try DD/MM/YYYY format first
  const parts = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
  
  // Try Excel serial number fallback
  const num = parseFloat(val);
  if (!isNaN(num)) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString();
  }
  
  // Standard JS parser
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  
  return new Date().toISOString();
}

// --- Helper to extract data from Google Sheets ---
async function extractGoogleSheetData() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SPREADSHEET_ID in .env');
    }

    // Read worksheets in parallel
    const [txRows, annoRows, sinkingRows, assetRows, debtRows, netWorthRows] = await Promise.all([
      getSheetData(sheets, spreadsheetId, 'Lista Movimenti!A2:E2000'),
      getSheetData(sheets, spreadsheetId, 'ANNO!A3:Q45'),
      getSheetData(sheets, spreadsheetId, 'Sinking Funds!A2:K50'),
      getSheetData(sheets, spreadsheetId, 'Investimenti!A2:I50'),
      getSheetData(sheets, spreadsheetId, 'Debiti!A2:H50'),
      getSheetData(sheets, spreadsheetId, 'Net Worth!A1:F20')
    ]);

    // --- Parse Transactions ---
    const transactions = [];
    for (let i = 0; i < txRows.length; i++) {
      const row = txRows[i];
      const category = getValueByCol(row, 'B');
      const importo = parseFormattedNumber(getValueByCol(row, 'C'));
      
      // Skip empty rows or rows with 0 amount
      if (!category || category === 'Categoria' || importo === 0) {
        continue;
      }

      const nome = getValueByCol(row, 'A') || category;
      const data = parseSheetDate(getValueByCol(row, 'D'));
      let tipo = getValueByCol(row, 'E');

      if (tipo === 'Spesa') {
        tipo = 'Spesa';
      } else if (tipo === 'Risparmio') {
        tipo = 'Risparmio';
      } else if (tipo === 'Entrata') {
        tipo = 'Entrata';
      } else {
        // Infer from category if empty
        if (category.includes('Stipendio') || category.includes('entrate') || category.includes('Entrate')) {
          tipo = 'Entrata';
        } else {
          tipo = 'Spesa';
        }
      }

      transactions.push({
        id: String(i + 1),
        nome,
        categoria: category,
        importo,
        data,
        tipo
      });
    }

    // --- Parse Budget & Initial Liquidita ---
    let budgetMensile = 1024;
    for (const row of annoRows) {
      if (row[0] === 'Totale Uscite') {
        budgetMensile = parseFormattedNumber(getValueByCol(row, 'P')) || 1024;
      }
    }

    let liquiditaIniziale = 1400.0;
    for (const row of netWorthRows) {
      if (row[0] === 'OGGI' && row.length >= 2) {
        // Net Worth is calculated using today's liquidity
        liquiditaIniziale = parseFormattedNumber(row[1]) || 1400.0;
      }
    }

    const budget = {
      speso: 0, // frontend calcola lo speso mensile
      budget: budgetMensile,
    };

    // --- Parse Categories (from ANNO layout) ---
    const categoriesSet = new Set();
    const categorie = [];

    function addCategory(fullName, tipo) {
      if (!fullName || categoriesSet.has(fullName)) return;
      categoriesSet.add(fullName);
      
      const emojiMatch = fullName.match(/^([^\w\s\d,.-]+)\s*(.*)$/u);
      const emoji = emojiMatch ? emojiMatch[1].trim() : '📌';
      
      categorie.push({
        nome: fullName,
        tipo,
        emoji
      });
    }

    // Entrate: rows 4-5 in ANNO (offset 1 to 3 in read scope A3:Q45)
    for (let r = 1; r <= 3; r++) { 
      const row = annoRows[r];
      if (row && row[0] && row[0].trim() !== "" && !row[0].includes("Totale")) {
        addCategory(row[0].trim(), 'Entrata');
      }
    }

    // Necessità: rows 13-19 (offset 10 to 16 in annoRows)
    for (let r = 10; r <= 16; r++) {
      const row = annoRows[r];
      if (row) {
        const catName = getValueByCol(row, 'B');
        if (catName && catName.trim() !== "" && !catName.includes("Totale") && !catName.includes("--")) {
          addCategory(catName.trim(), 'Spesa');
        }
      }
    }

    // Extra: rows 23-30 (offset 20 to 27 in annoRows)
    for (let r = 20; r <= 27; r++) {
      const row = annoRows[r];
      if (row) {
        const catName = getValueByCol(row, 'B');
        if (catName && catName.trim() !== "" && !catName.includes("Totale") && !catName.includes("--")) {
          addCategory(catName.trim(), 'Spesa');
        }
      }
    }

    const settings = {
      liquiditaIniziale,
      budgetMensile,
      categorie,
    };

    // --- Parse Sinking Funds ---
    const sinkingFunds = [];
    for (let i = 0; i < sinkingRows.length; i++) {
      const row = sinkingRows[i];
      const attivita = getValueByCol(row, 'A');
      if (!attivita || attivita === 'Attività') continue;

      const stato = (getValueByCol(row, 'B') === 'Completata' || getValueByCol(row, 'B') === 'Completato') ? 'Completata' : 'In corso';
      const obiettivo = parseFormattedNumber(getValueByCol(row, 'C'));
      const spese = parseFormattedNumber(getValueByCol(row, 'F'));
      const saldoAttuale = parseFormattedNumber(getValueByCol(row, 'G'));
      // risparmioMensile maps to total saved = saldoAttuale + spese
      const risparmioMensile = saldoAttuale + spese;
      const dataScadenza = parseSheetDate(getValueByCol(row, 'K'));

      sinkingFunds.push({
        id: String(i + 1),
        attivita,
        stato,
        obiettivo,
        risparmioMensile,
        spese,
        dataScadenza
      });
    }

    // --- Parse Assets ---
    const assets = [];
    for (let i = 0; i < assetRows.length; i++) {
      const row = assetRows[i];
      const asset = getValueByCol(row, 'A');
      if (!asset || asset === 'Asset/Strumento') continue;

      const quantita = parseFormattedNumber(getValueByCol(row, 'C')) || 1;
      const pmc = parseFormattedNumber(getValueByCol(row, 'D'));
      let prezzoAttuale = parseFormattedNumber(getValueByCol(row, 'F'));
      const valoreAttuale = parseFormattedNumber(getValueByCol(row, 'H'));

      if (prezzoAttuale === 0 && valoreAttuale > 0) {
        prezzoAttuale = valoreAttuale / quantita;
      }

      assets.push({
        id: String(i + 1),
        asset,
        quantita,
        pmc,
        prezzoAttuale
      });
    }

    // --- Parse Debts ---
    const debts = [];
    for (let i = 0; i < debtRows.length; i++) {
      const row = debtRows[i];
      const nome = getValueByCol(row, 'A');
      if (!nome || nome === 'Attività' || nome === 'TOTALI') continue;

      const valoreDebitoIniziale = parseFormattedNumber(getValueByCol(row, 'C'));
      const rataMensile = parseFormattedNumber(getValueByCol(row, 'D'));
      const totalePagato = parseFormattedNumber(getValueByCol(row, 'E'));

      debts.push({
        id: String(i + 1),
        nome,
        valoreDebitoIniziale,
        rataMensile,
        totalePagato
      });
    }

    return {
      kpis: {},
      budget,
      transactions,
      sinkingFunds,
      assets,
      debts,
      settings,
    };
  } catch (err) {
    console.error('❌ Error fetching Google Sheets data:', err.message);
    throw err;
  }
}

// --- Per-User Finance API Endpoints (Protected by JWT) ---

// 1. Get financial data for the authenticated user
app.get('/api/finances', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getUserFinances(userId);
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching user finances:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Add New Transaction Endpoint (Per-User DB) ---
app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, categoria, importo, data, tipo } = req.body;

    if (!categoria || importo === undefined) {
      return res.status(400).json({ error: 'Categoria e importo sono obbligatori.' });
    }

    const newTx = await addUserTransaction(userId, {
      nome: nome || categoria,
      categoria,
      importo: parseFloat(importo),
      data,
      tipo: tipo || 'Spesa'
    });

    res.status(201).json({ success: true, transaction: newTx });
  } catch (err) {
    console.error('❌ Error adding user transaction:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Delete Transaction Endpoint (Per-User DB) ---
app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteUserTransaction(userId, id);
    res.json({ success: true, message: 'Transazione eliminata' });
  } catch (err) {
    console.error('❌ Error deleting user transaction:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Import from Google Sheet for current user ---
app.post('/api/finances/import-sheet', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sheetData = await extractGoogleSheetData();
    await bulkInsertUserData(userId, sheetData);
    const updated = await getUserFinances(userId);
    res.json({ success: true, message: 'Dati importati con successo dal foglio Google!', data: updated });
  } catch (err) {
    console.error('❌ Error importing sheet:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Update Settings Endpoint (Per-User DB) ---
const handleUpdateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { budgetMensile, liquiditaIniziale, categorie } = req.body;

    if (budgetMensile === undefined && liquiditaIniziale === undefined && !categorie) {
      return res.status(400).json({ error: 'Nessun dato fornito per l\'aggiornamento.' });
    }

    const updatedSettings = await updateUserSettings(userId, {
      budgetMensile,
      liquiditaIniziale,
      categorie,
    });

    res.json({ success: true, settings: updatedSettings });
  } catch (err) {
    console.error('❌ Error updating user settings:', err.message);
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/settings', requireAuth, handleUpdateSettings);
app.post('/api/settings', requireAuth, handleUpdateSettings);

// --- Health Check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Finance API server running on http://localhost:${PORT}`);
});
