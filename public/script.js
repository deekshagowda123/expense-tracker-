// App: Finance Dashboard (Vanilla JS)
const API = {
  tx: '/api/transactions',
  budgets: '/api/budgets',
  goals: '/api/goals',
  reports: '/api/reports',
  exportJson: '/api/export/json',
  exportCsv: (type) => `/api/export/csv/${type}`,
  reset: '/api/reset'
};

// Utils
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
function toast(txt, time=3000){
  const r = document.getElementById('toastRoot');
  const node = document.createElement('div'); node.className='toast'; node.textContent=txt; r.appendChild(node);
  setTimeout(()=>{node.remove()}, time);
}

async function fetchJson(url, opts){
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// App State
const state = { transactions: [], budgets: [], goals: [], reports: {}, theme: localStorage.getItem('theme')||'dark' };

// Theme
function applyTheme(){
  document.documentElement.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
  const sw = qs('#themeSwitch'); if (sw) sw.checked = state.theme === 'dark';
  localStorage.setItem('theme', state.theme);
}

// Guarded theme switch handler (some pages may not include the switch)
const _themeSwitch = qs('#themeSwitch');
if (_themeSwitch) {
  _themeSwitch.addEventListener('change', (e)=>{ state.theme = e.target.checked ? 'dark' : 'light'; applyTheme(); });
}

// Routing
function routeTo(route){
  qsa('.page').forEach(p=>p.classList.add('hidden'));
  const page = qs(`#${route}`);
  if (page) page.classList.remove('hidden');
  // clear active on any sidebar items (buttons or anchors)
  qsa('.sidebar nav button, .sidebar nav a').forEach(b=>{ if (b.classList) b.classList.remove('active'); });
  // try to mark matching button[data-route] active
  const btn = document.querySelector(`.sidebar nav button[data-route="${route}"]`);
  if (btn && btn.classList) btn.classList.add('active');
  else {
    // try anchor href match (e.g., transactions -> transactions.html)
    const anchor = document.querySelector(`.sidebar nav a[href="${route}.html"]`);
    if (anchor && anchor.classList) anchor.classList.add('active');
  }
  // debug overlay removed
}

// Attach click handlers to sidebar buttons; also add delegation fallback
try{
  qsa('.sidebar nav button').forEach(b=>b.addEventListener('click', ()=>{ console.log('sidebar click', b.dataset.route); routeTo(b.dataset.route); }));
}catch(e){ console.warn('sidebar individual listeners failed', e); }
const sidebarNav = qs('.sidebar nav');
if (sidebarNav) sidebarNav.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-route]');
  if (btn) { console.log('sidebar delegated click', btn.dataset.route); routeTo(btn.dataset.route); }
});

// Fetch initial data
async function loadAll(){
  try{
    state.transactions = await fetchJson(API.tx);
    state.budgets = await fetchJson(API.budgets);
    state.goals = await fetchJson(API.goals);
    state.reports = await fetchJson(API.reports);
    renderAll();
  }catch(err){
    console.error(err); toast('Failed to load data');
  }
}

function currency(n){return (Number(n)||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2})}

// Renderers
function renderDashboard(){
  const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);
  const expenses = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount||0),0);
  if (qs('#totalBalance')) qs('#totalBalance').textContent = currency(income - expenses);
  if (qs('#monthlyIncome')) qs('#monthlyIncome').textContent = currency(income);
  if (qs('#monthlyExpenses')) qs('#monthlyExpenses').textContent = currency(expenses);
  if (qs('#savingsRate')) qs('#savingsRate').textContent = `${Math.round(((income - expenses)/ (income||1))*100)}%`;

  const catMap = {};
  state.transactions.filter(t=>t.type==='expense').forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+Number(e.amount||0)});
  const cats = Object.entries(catMap).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);

  // Top categories
  const top = qs('#topCategories'); if (top){ top.innerHTML=''; cats.slice(0,5).forEach(c=>{const li=document.createElement('li');li.textContent=`${c.k} — ${currency(c.v)}`;top.appendChild(li)}); }

  // Recent transactions
  const recentTbody = qs('#recentTable tbody'); if (recentTbody){ recentTbody.innerHTML=''; state.transactions.slice(0,6).forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${t.title}</td><td>${t.category}</td><td>${t.date}</td><td>${currency(t.amount)}</td><td><button data-id="${t.id}" class="btn small edit">Edit</button> <button data-id="${t.id}" class="btn small danger del">Delete</button></td>`;
    recentTbody.appendChild(tr);
  }); }

  // Charts
  const months = Object.keys(state.reports.trends || {}).sort();
  const incomes = months.map(m=>state.reports.trends[m].income||0);
  const expensesArr = months.map(m=>state.reports.trends[m].expense||0);

  if (qs('#lineChart')) renderLineChart(months, incomes, expensesArr);
  if (qs('#doughnutChart')) renderDoughnutChart(cats.map(c=>c.k), cats.map(c=>c.v));
}

let lineChart,doughnutChart;
function renderLineChart(labels, incomes, expenses){
  const el = qs('#lineChart'); if (!el) return;
  const ctx = el.getContext('2d');
  if (lineChart) try{ lineChart.destroy(); }catch(e){}
  const gradIncome = ctx.createLinearGradient(0,0,0,200); gradIncome.addColorStop(0, 'rgba(96,165,250,0.18)'); gradIncome.addColorStop(1, 'rgba(96,165,250,0.02)');
  const gradExpense = ctx.createLinearGradient(0,0,0,200); gradExpense.addColorStop(0, 'rgba(248,113,113,0.14)'); gradExpense.addColorStop(1, 'rgba(248,113,113,0.02)');
  lineChart = new Chart(ctx, {type:'line',data:{labels, datasets:[{label:'Income',data:incomes,borderColor:'#60A5FA',backgroundColor:gradIncome,tension:0.36,pointRadius:3,pointHoverRadius:6},{label:'Expense',data:expenses,borderColor:'#FB7185',backgroundColor:gradExpense,tension:0.36,pointRadius:3,pointHoverRadius:6}]}, options:{responsive:true,plugins:{legend:{display:true}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(0,0,0,0.04)'}}}});
}

function renderDoughnutChart(labels, data){
  const el = qs('#doughnutChart'); if (!el) return;
  const ctx = el.getContext('2d');
  if (doughnutChart) try{ doughnutChart.destroy(); }catch(e){}
  doughnutChart = new Chart(ctx, {type:'doughnut',data:{labels, datasets:[{data, backgroundColor:['#60A5FA','#8B5CF6','#06B6D4','#F59E0B','#F97316']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:12,padding:12}}}}});
}

function renderTransactions(){
  const tbody = qs('#txTable tbody'); tbody.innerHTML=''; state.transactions.forEach(t=>{
    const tr=document.createElement('tr'); tr.innerHTML = `<td>${t.title}</td><td>${t.category}</td><td>${t.type}</td><td>${t.date}</td><td>${currency(t.amount)}</td><td><button data-id="${t.id}" class="btn small edit">Edit</button> <button data-id="${t.id}" class="btn small danger del">Delete</button></td>`; tbody.appendChild(tr);
  });
}

function renderBudgets(){
  const root = qs('#budgetsList'); root.innerHTML=''; state.budgets.forEach(b=>{
    const usedPct = Math.min(100,Math.round((b.used/b.amount)*100||0));
    const card=document.createElement('div'); card.className='card fade-in';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><h5 style="margin:0">${b.name}</h5><div class="sub">${currency(b.used)} used of ${currency(b.amount)}</div></div><div><button class="btn edit-budget" data-id="${b.id}">Edit</button> <button class="btn del-budget" data-id="${b.id}">Delete</button></div></div><div style="margin-top:8px" class="progress"><i style="width:${usedPct}%"></i></div>`; root.appendChild(card);
  });
}

function renderGoals(){
  const root = qs('#goalsList'); root.innerHTML=''; state.goals.forEach(g=>{
    const pct = Math.max(0, Math.min(100, Math.round((g.current/g.target)*100||0)));
    const rem = Math.max(0, Number(g.target) - Number(g.current));
    const card=document.createElement('div'); card.className='card fade-in';
    const circle = `<div class="goal-circle"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="16"></circle><circle class="fg" cx="18" cy="18" r="16" stroke-dasharray="100" stroke-dashoffset="${100 - pct}"></circle></svg></div>`;
    card.innerHTML=`<div style="display:flex;align-items:center;gap:12px">${circle}<div><h5 style="margin:0">${g.name}</h5><div class="sub">${currency(g.current)} of ${currency(g.target)}</div><div class="sub">${pct}% • Remaining ${currency(rem)}</div></div></div>`;
    root.appendChild(card);
    // animate stroke after insertion
    requestAnimationFrame(()=>{
      const fg = card.querySelector('.fg'); if(fg){ fg.style.strokeDashoffset = String(100 - pct); }
    });
  });
}

function renderReports(){
  const root=qs('#reportsCards'); root.innerHTML=''; const r=state.reports;
  root.innerHTML = `<div class="grid"><div class="card">Total Income<br><strong>${currency(r.totalIncome)}</strong></div><div class="card">Total Expenses<br><strong>${currency(r.totalExpenses)}</strong></div><div class="card">Net Savings<br><strong>${currency(r.net)}</strong></div></div>`;
}

function renderAll(){ renderDashboard(); renderTransactions(); renderBudgets(); renderGoals(); renderReports(); populateCategoryFilter(); }

function populateCategoryFilter(){
  const sel = qs('#filterCategory'); sel.innerHTML='<option value="all">All categories</option>';
  const cats = Array.from(new Set(state.transactions.map(t=>t.category))); cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o)});
}

// Actions: Add/Edit/Delete (simplified modals)
function createModal(html, onClose){
  const mr = qs('#modalRoot'); const m = document.createElement('div'); m.className='modal'; m.innerHTML=`<div class="modal-backdrop"></div><div class="modal-body card">${html}<div style="margin-top:12px;text-align:right"><button id="modalClose" class="btn">Close</button></div></div>`; mr.appendChild(m);
  qs('#modalClose', m).addEventListener('click', ()=>{m.remove(); if(onClose) onClose()});
}

// New transaction quick form
const _addTxBtn = qs('#addTxBtn'); if (_addTxBtn) _addTxBtn.addEventListener('click', ()=>openTxForm());
const _newTxBtn = qs('#newTx'); if (_newTxBtn) _newTxBtn.addEventListener('click', ()=>openTxForm());
// Budgets & Goals creation buttons
if (qs('#newBudget')) qs('#newBudget').addEventListener('click', ()=>openBudgetForm());
if (qs('#newGoal')) qs('#newGoal').addEventListener('click', ()=>openGoalForm());

function openTxForm(data={}){
  const html = `<h3>${data.id? 'Edit' : 'Add'} Transaction</h3>
    <div><input id="txTitle" placeholder="Title" value="${data.title||''}"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input id="txAmount" placeholder="Amount" value="${data.amount||''}"> <select id="txType"><option value="expense">Expense</option><option value="income">Income</option></select></div>
    <div style="margin-top:8px"><select id="txCategory"><option>Food</option><option>Shopping</option><option>Travel</option><option>Entertainment</option><option>Health</option><option>Bills</option><option>Education</option><option>Salary</option><option>Freelance</option><option>Other</option></select></div>
    <div style="margin-top:8px"><input id="txDate" type="date" value="${data.date||new Date().toISOString().slice(0,10)}"></div>
    <div style="margin-top:8px"><textarea id="txNotes" placeholder="Notes">${data.notes||''}</textarea></div>
    <div style="margin-top:12px;text-align:right"><button id="saveTx" class="btn accent">Save</button></div>`;
  createModal(html, ()=>{});
  const modal = qs('#modalRoot .modal');
  qs('#txType', modal).value = data.type||'expense';
  qs('#txCategory', modal).value = data.category||'Other';
  qs('#saveTx', modal).addEventListener('click', async ()=>{
    const payload = { title: qs('#txTitle', modal).value, amount: Number(qs('#txAmount', modal).value||0), type: qs('#txType', modal).value, category: qs('#txCategory', modal).value, date: qs('#txDate', modal).value, notes: qs('#txNotes', modal).value };
    try{
      if (data.id){ await fetchJson(`${API.tx}/${data.id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Updated'); }
      else { await fetchJson(API.tx, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Created'); }
      document.getElementById('modalRoot').innerHTML=''; await loadAll();
    }catch(err){console.error(err); toast('Save failed')}
  });
}

// Budget form
function openBudgetForm(data={}){
  const html = `<h3>${data.id? 'Edit' : 'New'} Budget</h3>
    <div><input id="bName" placeholder="Name" value="${data.name||''}"></div>
    <div style="margin-top:8px"><input id="bAmount" placeholder="Amount" value="${data.amount||''}"></div>
    <div style="margin-top:8px"><input id="bMonth" placeholder="Month (YYYY-MM)" value="${data.month||new Date().toISOString().slice(0,7)}"></div>
    <div style="margin-top:12px;text-align:right"><button id="saveBudget" class="btn accent">Save</button></div>`;
  createModal(html, ()=>{});
  const modal = qs('#modalRoot .modal');
  qs('#saveBudget', modal).addEventListener('click', async ()=>{
    const payload = { name: qs('#bName', modal).value, amount: Number(qs('#bAmount', modal).value||0), month: qs('#bMonth', modal).value };
    try{
      if (data.id){ await fetchJson(`${API.budgets}/${data.id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Budget updated'); }
      else { await fetchJson(API.budgets, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Budget created'); }
      document.getElementById('modalRoot').innerHTML=''; await loadAll();
    }catch(err){console.error(err); toast('Save failed')}
  });
}

// Goal form
function openGoalForm(data={}){
  const html = `<h3>${data.id? 'Edit' : 'New'} Goal</h3>
    <div><input id="gName" placeholder="Goal name" value="${data.name||''}"></div>
    <div style="margin-top:8px"><input id="gTarget" placeholder="Target amount" value="${data.target||''}"></div>
    <div style="margin-top:8px"><input id="gCurrent" placeholder="Current saved" value="${data.current||0}"></div>
    <div style="margin-top:12px;text-align:right"><button id="saveGoal" class="btn accent">Save</button></div>`;
  createModal(html, ()=>{});
  const modal = qs('#modalRoot .modal');
  qs('#saveGoal', modal).addEventListener('click', async ()=>{
    const payload = { name: qs('#gName', modal).value, target: Number(qs('#gTarget', modal).value||0), current: Number(qs('#gCurrent', modal).value||0) };
    try{
      if (data.id){ await fetchJson(`${API.goals}/${data.id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Goal updated'); }
      else { await fetchJson(API.goals, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); toast('Goal created'); }
      document.getElementById('modalRoot').innerHTML=''; await loadAll();
    }catch(err){console.error(err); toast('Save failed')}
  });
}

// Delete handler
document.addEventListener('click', async (e)=>{
  if (e.target.classList.contains('del')){
    const id = e.target.dataset.id; if (!confirm('Delete this transaction?')) return; await fetchJson(`${API.tx}/${id}`, {method:'DELETE'}); toast('Deleted'); await loadAll();
  }
  if (e.target.classList.contains('edit')){
    const id = e.target.dataset.id; const t = state.transactions.find(x=>x.id===id); openTxForm(t);
  }
  // Budget handlers
  if (e.target.classList.contains('del-budget')){
    const id = e.target.dataset.id; if (!confirm('Delete this budget?')) return; await fetchJson(`${API.budgets}/${id}`, {method:'DELETE'}); toast('Budget deleted'); await loadAll();
  }
  if (e.target.classList.contains('edit-budget')){
    const id = e.target.dataset.id; const b = state.budgets.find(x=>x.id===id); openBudgetForm(b);
  }
  // Goal handlers
  if (e.target.classList.contains('del-goal')){
    const id = e.target.dataset.id; if (!confirm('Delete this goal?')) return; await fetchJson(`${API.goals}/${id}`, {method:'DELETE'}); toast('Goal deleted'); await loadAll();
  }
  if (e.target.classList.contains('edit-goal')){
    const id = e.target.dataset.id; const g = state.goals.find(x=>x.id===id); openGoalForm(g);
  }
});

// Export & settings
if (qs('#exportJson')) qs('#exportJson').addEventListener('click', async ()=>{
  const data = await fetchJson(API.exportJson); const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance-data.json'; a.click(); URL.revokeObjectURL(url);
});

if (qs('#exportCsvAll')) qs('#exportCsvAll').addEventListener('click', ()=>{ ['transactions','budgets','goals'].forEach(t=>window.open(API.exportCsv(t),'_blank')) });

if (qs('#resetData')) qs('#resetData').addEventListener('click', async ()=>{ if (!confirm('Reset all data?')) return; await fetchJson(API.reset, {method:'POST'}); toast('Data reset'); await loadAll(); });

// Search
if (qs('#globalSearch')) qs('#globalSearch').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase(); if (!q){ renderAll(); return; }
  const filtered = state.transactions.filter(t=> (t.title||'').toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q));
  state.transactionsFiltered = filtered; const tbody = qs('#txTable tbody'); tbody.innerHTML=''; filtered.forEach(t=>{const tr=document.createElement('tr'); tr.innerHTML = `<td>${t.title}</td><td>${t.category}</td><td>${t.type}</td><td>${t.date}</td><td>${currency(t.amount)}</td><td></td>`; tbody.appendChild(tr)});
});

// Keyboard shortcuts
document.addEventListener('keydown', (e)=>{
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); openTxForm(); }
  if (e.key === 'f' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); qs('#globalSearch').focus(); }
});

// Init
applyTheme(); loadAll();
// Check backend connectivity and update UI status
async function checkApiStatus(){
  const statusEl = document.getElementById('apiStatus');
  if (!statusEl) return;
  try{
    const res = await fetch(API.tx, { method: 'GET' });
    if (res.ok) { statusEl.textContent = 'Server: OK'; statusEl.style.color = 'var(--muted)'; }
    else { statusEl.textContent = 'Server: Error'; statusEl.style.color = '#ef4444'; }
  }catch(err){ statusEl.textContent = 'Server: Offline'; statusEl.style.color = '#ef4444'; }
}
checkApiStatus();
// Support static pages that set an initial route via body dataset
const initialRoute = document.body && document.body.dataset && document.body.dataset.initialRoute ? document.body.dataset.initialRoute : 'dashboard';
routeTo(initialRoute);

// Layout: collapsible sidebar toggle (injects a control and persists state)
function initSidebarToggle(){
  const sidebar = qs('#sidebar'); if (!sidebar) return;
  if (qs('#sidebarToggle')) return; // already added
  const btn = document.createElement('button'); btn.id = 'sidebarToggle'; btn.className = 'btn'; btn.setAttribute('aria-label','Toggle sidebar'); btn.innerHTML = '☰';
  // insert at top of sidebar
  sidebar.insertBefore(btn, sidebar.firstChild);
  // apply persisted state
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (collapsed) sidebar.classList.add('collapsed');
  btn.addEventListener('click', ()=>{
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  });
}

initSidebarToggle();

// Debug overlay: shows active route and last click for troubleshooting
// debug overlay removed

// Frontend error reporting: sends errors to backend for diagnosis
window.addEventListener('error', (ev) => {
  try{
    fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: ev.message, filename: ev.filename, lineno: ev.lineno, colno: ev.colno, error: (ev.error && ev.error.stack) || null }) });
  }catch(e){/* ignore */}
});
window.addEventListener('unhandledrejection', (ev) => {
  try{
    fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'UnhandledRejection', reason: ev.reason && (ev.reason.stack || ev.reason) }) });
  }catch(e){/* ignore */}
});
