const http = require('http');

const HOST = 'localhost';
const PORT = process.env.PORT || 3000;

function req(path, method='GET', data){
  return new Promise((resolve,reject)=>{
    const payload = data ? JSON.stringify(data) : null;
    const headers = payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {};
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, res=>{
      let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{
        try{ resolve({ status: res.statusCode, body: JSON.parse(d) }); }catch(e){ resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function run(){
  try{
    console.log('Creating budget...');
    const create = await req('/api/budgets','POST',{ name:'Smoke Budget', amount:123, used:0, month:'2026-06' });
    console.log('create', create.status);
    if (create.status !== 201) throw new Error('Create failed');
    const id = create.body.id;

    console.log('Updating budget...');
    const up = await req(`/api/budgets/${id}`,'PUT',{ name:'Smoke Budget Updated', amount:200 });
    console.log('update', up.status);
    if (up.status !== 200) throw new Error('Update failed');

    console.log('Deleting budget...');
    const del = await req(`/api/budgets/${id}`,'DELETE');
    console.log('delete', del.status);
    if (del.status !== 200) throw new Error('Delete failed');

    // Goals
    console.log('Creating goal...');
    const gc = await req('/api/goals','POST',{ name:'Smoke Goal', target:500, current:10 });
    if (gc.status !== 201) throw new Error('Goal create failed'); const gid = gc.body.id;
    console.log('Deleting goal...');
    const gd = await req(`/api/goals/${gid}`,'DELETE'); if (gd.status !== 200) throw new Error('Goal delete failed');

    // Export JSON
    console.log('Export JSON...'); const ex = await req('/api/export/json'); console.log('export', ex.status);

    // Reset
    console.log('Reset data...'); const rst = await req('/api/reset','POST'); console.log('reset', rst.status);

    console.log('Budgets/Goals/Settings smoke tests passed'); process.exit(0);
  }catch(err){ console.error('Test failed', err); process.exit(2); }
}

run();
