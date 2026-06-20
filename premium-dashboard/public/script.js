const sample = {
  balance: 6589.25,
  income: 8450,
  expenses: 1860.75,
  savings: 28.4,
  recent: [
    {title:'Grocery Shopping', category:'Food', amount:-68.5, date:'Jun 18, 2026'},
    {title:'Salary', category:'Income', amount:5000, date:'Jun 18, 2026'},
    {title:'Netflix', category:'Entertainment', amount:-15.99, date:'Jun 17, 2026'}
  ],
  categories: {Food:420.5, Shopping:380.2, Bills:320.6, Travel:250, Entertainment:210}
};

function q(s){return document.querySelector(s)}
function applyTheme(dark){
  document.documentElement.style.setProperty('--bg', dark? '#061227' : '#F6F9FC');
  document.documentElement.style.background = dark? 'linear-gradient(180deg,#061227 0%,#071428 100%)' : '';
}

function render(){
  q('#totalBalance').textContent = `$${sample.balance.toLocaleString()}`;
  q('#monthlyIncome').textContent = `$${sample.income.toLocaleString()}`;
  q('#monthlyExpenses').textContent = `$${sample.expenses.toLocaleString()}`;
  q('#savingsRate').textContent = `${sample.savings}%`;
  const rl = q('#recentList'); rl.innerHTML=''; sample.recent.forEach(r=>{ const li=document.createElement('li'); li.innerHTML = `<span>${r.title} <small style="color:var(--muted)">${r.category}</small></span><span style="color:${r.amount<0?'#FB7185':'#34D399'}">${r.amount<0?'-':''}$${Math.abs(r.amount).toFixed(2)}</span>`; rl.appendChild(li)});

  // charts
  const months = ['2026-02','2026-03','2026-04','2026-05','2026-06'];
  const incomes = [1200,1500,2000,3000,8450];
  const expenses = [800,900,1100,1200,1860];
  const ctx = q('#lineChart').getContext('2d');
  new Chart(ctx,{type:'line',data:{labels:months,datasets:[{label:'Income',data:incomes,borderColor:'#34D399',backgroundColor:'rgba(52,211,153,0.08)',tension:0.4},{label:'Expense',data:expenses,borderColor:'#FB7185',backgroundColor:'rgba(251,113,133,0.06)',tension:0.4}]},options:{responsive:true,plugins:{legend:{position:'top',labels:{boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.5)'}},y:{grid:{color:'rgba(255,255,255,0.02)'},ticks:{color:'rgba(255,255,255,0.5)'}}}}});

  const dctx = q('#doughnutChart').getContext('2d');
  new Chart(dctx,{type:'doughnut',data:{labels:Object.keys(sample.categories),datasets:[{data:Object.values(sample.categories),backgroundColor:['#60A5FA','#8B5CF6','#06B6D4','#F59E0B','#F97316']}]},options:{responsive:true,plugins:{legend:{position:'right'}}}});
}

// theme switch
const sw = q('#themeSwitch'); if (sw) { sw.checked = true; sw.addEventListener('change', (e)=>{ applyTheme(e.target.checked); }) }
applyTheme(true);
window.addEventListener('load', ()=>{ render(); });
