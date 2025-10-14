// Funkcja pomocnicza do komunikacji z API
async function api(path, method='GET', body) {
    const opts = {method, headers: { 'Content-Type':'application/json' }};
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + path, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({error: res.statusText}));
        throw err;
    }
    return res.json();
}

// Funkcja odświeżająca tabelę produktów
async function refresh(q='') {
    const rows = await api('/products' + (q ? ('?q=' + encodeURIComponent(q)) : ''));
    const tbody = document.getElementById('productTableBody');
    if (tbody) tbody.innerHTML = '';

    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.name}</td><td>${r.sku||''}</td><td>${r.qty}</td><td>${r.date||''}</td><td>${r.location||''}</td>`;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Logowanie
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.success) {
            document.querySelector('.login-container').style.display = 'none';
            document.querySelectorAll('.main-content').forEach(el => el.style.display = 'block');
            refresh();
        } else {
            alert('Błędny login lub hasło');
        }
    });

    // Wylogowanie
    document.querySelector('.logout').addEventListener('click', () => {
        document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
        document.querySelector('.login-container').style.display = 'flex';
        document.getElementById('inventory').classList.add('hidden');
        document.getElementById('reports').classList.add('hidden');
    });

    // Toggle sekcji inventory / reports
    const btnStany = document.getElementById("btnStany");
    const btnRaporty = document.getElementById("btnRaporty");
    const inventory = document.getElementById("inventory");
    const reports = document.getElementById("reports");

    btnStany.addEventListener('click', () => {
        const isHidden = inventory.classList.contains('hidden');
        inventory.classList.toggle('hidden', !isHidden);
        reports.classList.add('hidden');
    });

    btnRaporty.addEventListener('click', () => {
        const isHidden = reports.classList.contains('hidden');
        reports.classList.toggle('hidden', !isHidden);
        inventory.classList.add('hidden');
    });

    // Modal
    const modal = document.getElementById("addProductModal");
    const openModalBtn = document.getElementById("openModal");
    const closeModalBtn = document.getElementById("closeModal");
    const addProductForm = document.getElementById("addProductForm");
    const tableBody = document.getElementById("productTableBody");

    openModalBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));

    addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const produkt = addProductForm.produkt.value;
        const sku = addProductForm.sku.value;
        const ilosc = addProductForm.ilosc.value;
        const data = addProductForm.data.value;
        const dzial = addProductForm.dzial.value;

        const newRow = document.createElement("tr");
        newRow.innerHTML = `<td>${produkt}</td><td>${sku}</td><td>${ilosc}</td><td>${data}</td><td>${dzial}</td>`;
        tableBody.appendChild(newRow);

        addProductForm.reset();
        modal.classList.add("hidden");
    });
});
