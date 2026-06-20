const http = require('http');

const HOST = 'localhost';
const PORT = process.env.PORT || 3000;

function get(path){
  return new Promise((resolve, reject)=>{
    const req = http.request({ hostname: HOST, port: PORT, path, method: 'GET' }, res=>{
      let data=''; res.on('data', c=>data+=c); res.on('end', ()=>{
        try{ const json = JSON.parse(data); resolve({ status: res.statusCode, body: json }); }
        catch(e){ resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject); req.end();
  });
}

async function run(){
  try{
    console.log('Checking /api/transactions ...');
    const t = await get('/api/transactions'); console.log('transactions:', t.status, (Array.isArray(t.body) ? t.body.length+' items' : typeof t.body));

    console.log('Checking /api/budgets ...');
    const b = await get('/api/budgets'); console.log('budgets:', b.status, (Array.isArray(b.body) ? b.body.length+' items' : typeof b.body));

    console.log('Checking /api/goals ...');
    const g = await get('/api/goals'); console.log('goals:', g.status, (Array.isArray(g.body) ? g.body.length+' items' : typeof g.body));

    console.log('Checking /api/reports ...');
    const r = await get('/api/reports'); console.log('reports:', r.status, 'has net:', r.body && r.body.net !== undefined);

    console.log('Smoke tests completed.');
    process.exit(0);
  }catch(err){ console.error('Smoke test failed', err); process.exit(2); }
}

run();
