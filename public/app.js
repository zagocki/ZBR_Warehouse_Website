async function api(path, method='GET', body) {
const opts = {method, headers: { 'Content-Type':'application/json' }};
if (body) opts.body = JSON.stringify(body);
const res = await fetch('/api' + path, opts);
if (!res.ok) {
const err = await res.json().catch(()=>({error:res.statusText}));
throw err;
}
return res.json();
}


async function refresh(q=''){
const rows = await api('/products' + (q?('?q='+encodeURIComponent(q)):''));
const tbody = document.querySelector('#productsTable tbody');
tbody.innerHTML = '';
const receiveSel = document.getElementById('receiveProduct');
const issueSel = document.getElementById('issueProduct');
receiveSel.innerHTML = issueSel.innerHTML = '';
rows.forEach(r => {
const tr = document.createElement('tr');
tr.innerHTML = `<td>${r.id}</td><td>${r.sku||''}</td><td>${r.name}</td><td>${r.qty}</td><td>${r.location||''}</td>`;
tbody.appendChild(tr);
const opt = document.createElement('option'); opt.value = r.id; opt.text = `${r.name} (id:${r.id})`;
receiveSel.appendChild(opt.cloneNode(true));
issueSel.appendChild(opt);
});
}


document.getElementById('addForm').addEventListener('submit', async (e)=>{
e.preventDefault();
const f = e.target;
const data = { sku: f.sku.value, name: f.name.value, qty: Number(f.qty.value)||0, location: f.location.value };
try { await api('/products','POST',data); f.reset(); refresh(); }
catch(err){ alert(err.error||JSON.stringify(err)); }
});


document.getElementById('receiveForm').addEventListener('submit', async (e)=>{
e.preventDefault();
try{ const id = Number(document.getElementById('receiveProduct').value); const qty = Number(document.getElementById('receiveQty').value)||0; await api('/receive','POST',{id,qty}); refresh(); }catch(err){alert(err.error||JSON.stringify(err));}
});


document.getElementById('issueForm').addEventListener('submit', async (e)=>{
e.preventDefault();
try{ const id = Number(document.getElementById('issueProduct').value); const qty = Number(document.getElementById('issueQty').value)||0; await api('/issue','POST',{id,qty}); refresh(); }catch(err){alert(err.error||JSON.stringify(err));}
});


document.getElementById('search').addEventListener('input', (e)=>{
refresh(e.target.value);
});

// initial load
refresh();