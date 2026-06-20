const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4100;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(PUBLIC_DIR));

async function readJSON(name){
  try{ const raw = await fs.readFile(path.join(DATA_DIR, name),'utf8'); return JSON.parse(raw || '[]'); }catch(e){ if(e.code==='ENOENT') return []; throw e; }
}
async function writeJSON(name, data){ await fs.mkdir(DATA_DIR,{recursive:true}); await fs.writeFile(path.join(DATA_DIR,name), JSON.stringify(data,null,2),'utf8'); }

function applyCrud(entity, file){
  app.get(`/api/${entity}`, async (req,res)=>{ const items = await readJSON(file); res.json(items); });
  app.post(`/api/${entity}`, async (req,res)=>{ const items = await readJSON(file); const item = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body }; items.unshift(item); await writeJSON(file, items); res.status(201).json(item); });
  app.put(`/api/${entity}/:id`, async (req,res)=>{ const items = await readJSON(file); const i = items.findIndex(x=>x.id===req.params.id); if(i===-1) return res.status(404).json({error:'Not found'}); items[i] = {...items[i], ...req.body, updatedAt: new Date().toISOString()}; await writeJSON(file, items); res.json(items[i]); });
  app.delete(`/api/${entity}/:id`, async (req,res)=>{ let items = await readJSON(file); const i = items.findIndex(x=>x.id===req.params.id); if(i===-1) return res.status(404).json({error:'Not found'}); const removed = items.splice(i,1)[0]; await writeJSON(file, items); res.json(removed); });
}

applyCrud('transactions','transactions.json');
applyCrud('budgets','budgets.json');
applyCrud('goals','goals.json');

app.get('/api/reports', async (req,res)=>{
  const tx = await readJSON('transactions.json');
  const budgets = await readJSON('budgets.json');
  const goals = await readJSON('goals.json');
  const income = tx.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);
  const expenses = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount||0),0);
  const cat = {};
  tx.filter(t=>t.type==='expense').forEach(e=>{ cat[e.category] = (cat[e.category]||0)+Number(e.amount||0); });
  const trends = {};
  tx.forEach(t=>{ const m = new Date(t.date).toISOString().slice(0,7); trends[m] = trends[m]||{income:0,expense:0}; if(t.type==='income') trends[m].income += Number(t.amount||0); else trends[m].expense += Number(t.amount||0); });
  res.json({ totalIncome: income, totalExpenses: expenses, net: income - expenses, topCategories: Object.entries(cat).map(([k,v])=>({category:k,amount:v})), trends, budgets, goals });
});

app.post('/api/reset', async (req,res)=>{ await writeJSON('transactions.json',[]); await writeJSON('budgets.json',[]); await writeJSON('goals.json',[]); res.json({ok:true}); });

app.get('/api/export/json', async (req,res)=>{ const transactions = await readJSON('transactions.json'); const budgets = await readJSON('budgets.json'); const goals = await readJSON('goals.json'); res.json({transactions,budgets,goals}); });

app.get('*', (req,res)=>{ res.sendFile(path.join(PUBLIC_DIR,'index.html')); });

app.listen(PORT, ()=>console.log(`FinTrack running on http://localhost:${PORT}`));
