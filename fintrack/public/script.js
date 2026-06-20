const API = { tx: '/api/transactions', budgets: '/api/budgets', goals: '/api/goals', reports: '/api/reports', exportJson: '/api/export/json', reset: '/api/reset' };
const $ = (s, el=document)=> el.querySelector(s);
const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));
function toast(txt, t=3000){ const r=$('#toastRoot'); if(!r) return; const n=document.createElement('div'); n.className='toast'; n.textContent=txt; r.appendChild(n); setTimeout(()=>n.remove(), t); }
async function fetchJson(url, opts){ const res = await fetch(url, opts); if(!res.ok) throw new Error(await res.text()); return res.json(); }
const state = { transactions:[], budgets:[], goals:[], reports:{}, theme: localStorage.getItem('theme')||'dark' };
function applyTheme(){ document.documentElement.setAttribute('data-theme', state.theme==='dark'?'dark':'light'); const sw = $('#themeSwitch'); if(sw) sw.checked = state.theme==='dark'; localStorage.setItem('theme', state.theme); }
const _themeSwitch = $('#themeSwitch'); if(_themeSwitch){ _themeSwitch.addEventListener('change', e=>{ state.theme = e.target.checked ? 'dark' : 'light'; applyTheme(); }); }

function routeTo(route){ $$('.page').forEach(p=>p.classList.add('hidden')); const page = $(`#${route}`); if(page) page.classList.remove('hidden'); $$('.sidebar nav button').forEach(b=>b.classList.remove('active')); const btn = document.querySelector(`.sidebar nav button[data-route="${route}"]`); if(btn) btn.classList.add('active'); }
$$('.sidebar nav button').forEach(b=> b.addEventListener('click', ()=> routeTo(b.dataset.route)));

async function loadAll(){ try{ state.transactions = await fetchJson(API.tx); state.budgets = await fetchJson(API.budgets); state.goals = await fetchJson(API.goals); state.reports = await fetchJson(API.reports); renderAll(); }catch(e){ console.error(e); toast('Failed to load data'); }}

function currency(n){ return (Number(n)||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}); }

function renderDashboard(){ const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0); const expenses = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount||0),0); if($('#totalBalance')) $('#totalBalance').textContent = currency(income - expenses); if($('#monthlyIncome')) $('#monthlyIncome').textContent = currency(income); if($('#monthlyExpenses')) $('#monthlyExpenses').textContent = currency(expenses); if($('#savingsRate')) $('#savingsRate').textContent = `${Math.round(((income-expenses)/(income||1))*100)}%`;
 const catMap = {}; state.transactions.filter(t=>t.type==='expense').forEach(e=>{ catMap[e.category] = (catMap[e.category]||0)+Math.abs(Number(e.amount||0)); }); const cats = Object.entries(catMap).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
 if($('#topCategories')){ const top=$('#topCategories'); top.innerHTML=''; cats.slice(0,5).forEach(c=>{ const li=document.createElement('li'); li.textContent = `${c.k} — ${currency(c.v)}`; top.appendChild(li); }); }
 if($('#recentTable tbody')){ const tb = $('#recentTable tbody'); tb.innerHTML=''; state.transactions.slice(0,6).forEach(t=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${t.title}</td><td>${t.category}</td><td>${t.date}</td><td>${currency(t.amount)}</td><td></td>`; tb.appendChild(tr); }); }
 // charts
 const months = Object.keys(state.reports.trends || {}).sort(); const incomes = months.map(m=>state.reports.trends[m].income||0); const expensesArr = months.map(m=>state.reports.trends[m].expense||0);
 if($('#lineChart')) renderLineChart(months,incomes,expensesArr);
 if($('#doughnutChart')) renderDoughnutChart(cats.map(c=>c.k), cats.map(c=>c.v));
 if($('#categoryBar')) renderCategoryBar(cats.map(c=>c.k), cats.map(c=>c.v)); }

let lineChart,doughnutChart,categoryBarChart;
function renderLineChart(labels,incomes,expenses){
	const el = $('#lineChart'); if(!el) return; const ctx = el.getContext('2d'); if(lineChart) try{ lineChart.destroy(); }catch(e){}
	const gradIncome = ctx.createLinearGradient(0,0,0,200); gradIncome.addColorStop(0,'rgba(52,211,153,0.18)'); gradIncome.addColorStop(1,'rgba(52,211,153,0.02)');
	const gradExpense = ctx.createLinearGradient(0,0,0,200); gradExpense.addColorStop(0,'rgba(251,113,133,0.16)'); gradExpense.addColorStop(1,'rgba(251,113,133,0.02)');
	lineChart = new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'Income',data:incomes,borderColor:'#34D399',backgroundColor:gradIncome,tension:0.28,pointRadius:3,pointHoverRadius:6,fill:true},{label:'Expense',data:expenses,borderColor:'#FB7185',backgroundColor:gradExpense,tension:0.28,pointRadius:3,pointHoverRadius:6,fill:true}] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{boxWidth:12,color:'var(--muted)'}},tooltip:{mode:'index',intersect:false}}, scales:{ x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.6)'}}, y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'rgba(255,255,255,0.6)'}} } } });
}

function renderDoughnutChart(labels,data){
	const el = $('#doughnutChart'); if(!el) return; const ctx = el.getContext('2d'); if(doughnutChart) try{ doughnutChart.destroy(); }catch(e){}
	doughnutChart = new Chart(ctx,{ type:'doughnut', data:{ labels, datasets:[{data, backgroundColor:['#60A5FA','#8B5CF6','#06B6D4','#F59E0B','#F97316','#10B981','#F43F5E']}] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right',labels:{boxWidth:12,padding:12,color:'var(--muted)'}}} } });
}

function renderCategoryBar(labels,data){
	const el = $('#categoryBar'); if(!el) return; const ctx = el.getContext('2d'); if(categoryBarChart) try{ categoryBarChart.destroy(); }catch(e){}
	categoryBarChart = new Chart(ctx,{ type:'bar', data:{ labels, datasets:[{ label:'Expenses', data, backgroundColor: labels.map((l,i)=> ['#60A5FA','#8B5CF6','#06B6D4','#F59E0B','#F97316','#10B981','#F43F5E'][i%7]), borderRadius:8, barThickness:16 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){ return ctx.dataset.label + ': ' + new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(ctx.parsed.x); }}}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'rgba(255,255,255,0.6)'} }, y:{grid:{display:false}, ticks:{color:'var(--muted)'} } } } });
}

function renderTransactions(){ if(!$('#txTable tbody')) return; const tb = $('#txTable tbody'); tb.innerHTML=''; state.transactions.forEach(t=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${t.title}</td><td>${t.category}</td><td>${t.type}</td><td>${t.date}</td><td>${currency(t.amount)}</td><td><button data-id="${t.id}" class="btn small edit">Edit</button> <button data-id="${t.id}" class="btn small danger del">Delete</button></td>`; tb.appendChild(tr); }); }

function renderBudgets(){ if(!$('#budgetsList')) return; const root = $('#budgetsList'); root.innerHTML=''; state.budgets.forEach(b=>{ const usedPct = Math.min(100, Math.round((b.used/ b.amount)*100||0)); const card=document.createElement('div'); card.className='card'; card.innerHTML = `<h5 style="margin:0">${b.name}</h5><div class="sub">${currency(b.used)} used of ${currency(b.amount)}</div><div class="progress"><i style="width:${usedPct}%"></i></div>`; root.appendChild(card); }); }
function renderGoals(){ if(!$('#goalsList')) return; const root = $('#goalsList'); root.innerHTML=''; state.goals.forEach(g=>{ const pct = Math.max(0,Math.min(100,Math.round((g.current/g.target)*100||0))); const card=document.createElement('div'); card.className='card'; card.innerHTML = `<h5 style="margin:0">${g.name}</h5><div class="sub">${currency(g.current)} of ${currency(g.target)}</div><div class="sub">${pct}%</div>`; root.appendChild(card); }); }
function renderReports(){ if(!$('#reportsCards')) return; const r = state.reports; $('#reportsCards').innerHTML = `<div class="grid"><div class="card">Total Income<br><strong>${currency(r.totalIncome)}</strong></div><div class="card">Total Expenses<br><strong>${currency(r.totalExpenses)}</strong></div><div class="card">Net<br><strong>${currency(r.net)}</strong></div></div>`; }

function renderAll(){ renderDashboard(); renderTransactions(); renderBudgets(); renderGoals(); renderReports(); }

// modal helpers
function createModal(html, onClose){ const mr = $('#modalRoot'); const m = document.createElement('div'); m.className='modal'; m.innerHTML = `<div class="modal-backdrop"></div><div class="modal-body card">${html}<div style="margin-top:12px;text-align:right"><button id="modalClose" class="btn">Close</button></div></div>`; mr.appendChild(m); $('#modalClose', m).addEventListener('click', ()=>{ m.remove(); if(onClose) onClose(); }); }

// forms
if($('#addTxBtn')) $('#addTxBtn').addEventListener('click', ()=> openTxForm()); if($('#newTx')) $('#newTx').addEventListener('click', ()=> openTxForm());
function openTxForm(data={}){ const html = `<h3>${data.id? 'Edit' : 'Add'} Transaction</h3><div><input id="txTitle" placeholder="Title" value="${data.title||''}"></div><div style="display:flex;gap:8px;margin-top:8px"><input id="txAmount" placeholder="Amount" value="${data.amount||''}"> <select id="txType"><option value="expense">Expense</option><option value="income">Income</option></select></div><div style="margin-top:8px"><input id="txCategory" placeholder="Category" value="${data.category||''}"></div><div style="margin-top:8px"><input id="txDate" type="date" value="${data.date||new Date().toISOString().slice(0,10)}"></div><div style="margin-top:8px"><textarea id="txNotes" placeholder="Notes">${data.notes||''}</textarea></div><div style="margin-top:12px;text-align:right"><button id="saveTx" class="btn accent">Save</button></div>`; createModal(html, ()=>{}); const modal = $('#modalRoot .modal'); $('#txType', modal).value = data.type||'expense'; $('#saveTx', modal).addEventListener('click', async ()=>{ const payload = { title: $('#txTitle', modal).value, amount: Number($('#txAmount', modal).value||0), type: $('#txType', modal).value, category: $('#txCategory', modal).value, date: $('#txDate', modal).value, notes: $('#txNotes', modal).value }; try{ if(data.id){ await fetchJson(`${API.tx}/${data.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); toast('Updated'); } else { await fetchJson(API.tx, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); toast('Created'); } $('#modalRoot').innerHTML=''; await loadAll(); }catch(e){ console.error(e); toast('Save failed'); } }); }

// delete/edit via delegation
document.addEventListener('click', async (e)=>{ if(e.target.classList.contains('del')){ const id = e.target.dataset.id; if(!confirm('Delete?')) return; await fetchJson(`${API.tx}/${id}`, {method:'DELETE'}); toast('Deleted'); await loadAll(); } if(e.target.classList.contains('edit')){ const id = e.target.dataset.id; const t = state.transactions.find(x=>x.id===id); openTxForm(t); } });

// export/reset
if($('#exportJson')) $('#exportJson').addEventListener('click', async ()=>{ const d = await fetchJson(API.exportJson); const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='fintrack-data.json'; a.click(); URL.revokeObjectURL(a.href); });
if($('#resetData')) $('#resetData').addEventListener('click', async ()=>{ if(!confirm('Reset all data?')) return; await fetchJson(API.reset,{method:'POST'}); toast('Reset'); await loadAll(); });

// init
applyTheme(); loadAll();
// Collapsible sidebar toggle (persisted)
function initSidebarToggle(){
	const sidebar = document.getElementById('sidebar'); if(!sidebar) return;
	if(document.getElementById('sidebarToggle')) return;
	const btn = document.createElement('button'); btn.id = 'sidebarToggle'; btn.className = 'btn'; btn.innerHTML = '☰'; btn.title = 'Toggle sidebar'; sidebar.insertBefore(btn, sidebar.firstChild);
	const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
	if(collapsed) sidebar.classList.add('collapsed');
	// apply main shift
	const main = document.querySelector('.main'); if(main){ if(collapsed) main.classList.add('shifted'); else main.classList.remove('shifted'); }
	btn.addEventListener('click', ()=>{
		sidebar.classList.toggle('collapsed'); const now = sidebar.classList.contains('collapsed'); localStorage.setItem('sidebarCollapsed', now);
		if(main) { if(now) main.classList.add('shifted'); else main.classList.remove('shifted'); }
	});
}
initSidebarToggle();

