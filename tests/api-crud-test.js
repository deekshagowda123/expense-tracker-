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
    console.log('Creating transaction...');
    const create = await req('/api/transactions','POST',{ title:'Smoke Test Tx', amount:12.34, type:'expense', category:'Other', date:new Date().toISOString().slice(0,10), notes:'smoke' });
    console.log('create', create.status);
    if (create.status !== 201) throw new Error('Create failed');
    const id = create.body.id;

    console.log('Updating transaction...');
    const up = await req(`/api/transactions/${id}`,'PUT',{ title:'Smoke Updated', amount:15 });
    console.log('update', up.status);
    if (up.status !== 200) throw new Error('Update failed');

    console.log('Deleting transaction...');
    const del = await req(`/api/transactions/${id}`,'DELETE');
    console.log('delete', del.status);
    if (del.status !== 200) throw new Error('Delete failed');

    console.log('CRUD smoke test passed'); process.exit(0);
  }catch(err){ console.error('CRUD test failed', err); process.exit(2); }
}

run();
