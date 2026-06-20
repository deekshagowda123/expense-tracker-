const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

async function readJSON(filename) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeJSON(filename, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

// Serve frontend
app.use(express.static(PUBLIC_DIR));

// Helper to find and mutate items
function applyCrudRoutes(entityName, fileName) {
  app.get(`/api/${entityName}`, async (req, res) => {
    const items = await readJSON(fileName);
    res.json(items);
  });

  app.post(`/api/${entityName}`, async (req, res) => {
    const items = await readJSON(fileName);
    const item = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
    items.unshift(item);
    await writeJSON(fileName, items);
    res.status(201).json(item);
  });

  app.put(`/api/${entityName}/:id`, async (req, res) => {
    const items = await readJSON(fileName);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items[idx] = { ...items[idx], ...req.body, updatedAt: new Date().toISOString() };
    await writeJSON(fileName, items);
    res.json(items[idx]);
  });

  app.delete(`/api/${entityName}/:id`, async (req, res) => {
    let items = await readJSON(fileName);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const deleted = items.splice(idx, 1)[0];
    await writeJSON(fileName, items);
    res.json(deleted);
  });
}

applyCrudRoutes('transactions', 'transactions.json');
applyCrudRoutes('budgets', 'budgets.json');
applyCrudRoutes('goals', 'goals.json');

// Reports
app.get('/api/reports', async (req, res) => {
  const transactions = await readJSON('transactions.json');
  const budgets = await readJSON('budgets.json');
  const goals = await readJSON('goals.json');

  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  const totalIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = totalIncome - totalExpenses;

  // Category aggregation
  const catMap = {};
  expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount || 0);
  });
  const categories = Object.keys(catMap).map(k => ({ category: k, amount: catMap[k] }));
  categories.sort((a,b)=>b.amount-a.amount);

  // Monthly trends (simple)
  const byMonth = {};
  transactions.forEach(t => {
    const m = new Date(t.date).toISOString().slice(0,7);
    byMonth[m] = byMonth[m] || { income:0, expense:0 };
    if (t.type === 'income') byMonth[m].income += Number(t.amount||0);
    else byMonth[m].expense += Number(t.amount||0);
  });

  res.json({ totalIncome, totalExpenses, net, topCategories: categories.slice(0,5), trends: byMonth, budgets, goals });
});

// Client-side error reporting (from browser)
app.post('/api/client-error', async (req, res) => {
  try {
    const entry = { id: uuidv4(), time: new Date().toISOString(), payload: req.body };
    const file = path.join(DATA_DIR, 'client-errors.json');
    let arr = [];
    try { arr = JSON.parse(await fs.readFile(file, 'utf8') || '[]'); } catch (e) { arr = []; }
    arr.push(entry);
    await writeJSON('client-errors.json', arr);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to record client error', err);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/client-errors', async (req, res) => {
  try {
    const file = path.join(DATA_DIR, 'client-errors.json');
    const raw = await fs.readFile(file, 'utf8');
    const arr = JSON.parse(raw || '[]');
    res.json(arr);
  } catch (err) {
    if (err.code === 'ENOENT') return res.json([]);
    res.status(500).json({ error: 'failed' });
  }
});

// Export endpoints
app.get('/api/export/json', async (req, res) => {
  const transactions = await readJSON('transactions.json');
  const budgets = await readJSON('budgets.json');
  const goals = await readJSON('goals.json');
  res.json({ transactions, budgets, goals });
});

app.get('/api/export/csv/:type', async (req, res) => {
  const type = req.params.type;
  const fileMap = { transactions: 'transactions.json', budgets: 'budgets.json', goals: 'goals.json' };
  if (!fileMap[type]) return res.status(400).json({ error: 'Invalid type' });
  const rows = await readJSON(fileMap[type]);
  if (!Array.isArray(rows)) return res.status(500).json({ error: 'Invalid data' });

  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
  res.setHeader('Content-disposition', `attachment; filename=${type}.csv`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// Reset data (for settings)
app.post('/api/reset', async (req, res) => {
  await writeJSON('transactions.json', []);
  await writeJSON('budgets.json', []);
  await writeJSON('goals.json', []);
  res.json({ ok: true });
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
