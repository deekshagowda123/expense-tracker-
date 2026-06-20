const fs = require('fs');
const path = require('path');

function rand(min, max, decimals = 0) {
  const r = Math.random() * (max - min) + min;
  return Number(r.toFixed(decimals));
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateMonthTransactions(year, month, seqStart = 1) {
  // month: 0-based
  const tx = [];
  let seq = seqStart;
  // Salary on 25th
  tx.push({
    id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_salary`,
    title: 'Salary',
    type: 'income',
    category: 'Salary',
    amount: 8500,
    date: formatDate(new Date(year, month, 25)),
    notes: 'Monthly payroll'
  });

  // Rent on 1st
  tx.push({
    id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_rent`,
    title: 'Rent',
    type: 'expense',
    category: 'Rent',
    amount: -1600,
    date: formatDate(new Date(year, month, 1)),
    notes: 'Monthly rent'
  });

  // Utilities/bills
  tx.push({
    id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_utilities`,
    title: 'Electricity Bill',
    type: 'expense',
    category: 'Bills',
    amount: -rand(60, 140, 2),
    date: formatDate(new Date(year, month, rand(5,20))),
    notes: 'Utilities'
  });

  // Groceries (1-3 per month)
  const groceriesCount = Math.random() < 0.6 ? 2 : 1;
  for (let g = 0; g < groceriesCount; g++) {
    tx.push({
      id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_grocery${g+1}`,
      title: 'Grocery Shopping',
      type: 'expense',
      category: 'Food',
      amount: -rand(50, 220, 2),
      date: formatDate(new Date(year, month, rand(3,28))),
      notes: g === 0 ? 'Supermarket' : 'Market/Fair'
    });
  }

  // Transport (fuel/public)
  tx.push({
    id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_transport`,
    title: 'Transport',
    type: 'expense',
    category: 'Transport',
    amount: -rand(30, 120, 2),
    date: formatDate(new Date(year, month, rand(2,26))),
    notes: 'Fuel / transit'
  });

  // Entertainment / subscription
  tx.push({
    id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_entertainment`,
    title: 'Subscription',
    type: 'expense',
    category: 'Entertainment',
    amount: -rand(8, 25, 2),
    date: formatDate(new Date(year, month, rand(1,28))),
    notes: 'Streaming / membership'
  });

  // Occasional freelance income (30% of months)
  if (Math.random() < 0.35) {
    tx.push({
      id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_freelance`,
      title: 'Freelance Project',
      type: 'income',
      category: 'Freelance',
      amount: rand(200, 2200, 2),
      date: formatDate(new Date(year, month, rand(2,27))),
      notes: 'Side income'
    });
  }

  // Random shopping/one-off (50% chance)
  if (Math.random() < 0.5) {
    tx.push({
      id: `t_${year}_${String(month+1).padStart(2,'0')}_${seq++}_shopping`,
      title: 'Shopping',
      type: 'expense',
      category: 'Shopping',
      amount: -rand(20, 450, 2),
      date: formatDate(new Date(year, month, rand(3,26))),
      notes: 'Online / retail'
    });
  }

  return tx;
}

function generateHistory(months = 12) {
  const now = new Date();
  const all = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthTx = generateMonthTransactions(year, month, 1);
    // sort by date
    monthTx.sort((a,b) => new Date(a.date) - new Date(b.date));
    all.push(...monthTx);
  }
  return all;
}

const outPath = path.join(__dirname, '..', 'data', 'transactions.json');
const seeded = generateHistory(12);
fs.writeFileSync(outPath, JSON.stringify(seeded, null, 2), 'utf8');
console.log(`Wrote ${seeded.length} transactions to ${outPath}`);
