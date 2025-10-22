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

// Wydanie towaru - toggle widoku
const btnWydanie = document.getElementById("btnWydanie"); // przycisk w secondbarze
const wydanieTowaru = document.getElementById("wydanieTowaru");

btnWydanie.addEventListener('click', () => {
  wydanieTowaru.classList.toggle('hidden');
  inventory.classList.add('hidden');
  dokumenty.classList.add('hidden');
});

// Obsługa formularza
const wydanieForm = document.getElementById("wydanieForm");
wydanieForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const produkt = document.getElementById("wydanieProdukt").value;
  const ilosc = parseInt(document.getElementById("wydanieIlosc").value);
  const odbiorca = document.getElementById("wydanieOdbiorca").value;

  alert(`✅ Wydano ${ilosc} szt. produktu "${produkt}" dla ${odbiorca}.`);
  wydanieForm.reset();
});


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
        document.getElementById('documents').classList.add('hidden');
    });

    // Toggle sekcji inventory / reports / documents
// === FUNKCJA: ukrywanie wszystkich sekcji ===
function hideAllSections() {
  document.querySelectorAll(".main-section").forEach(sec => sec.classList.add("hidden"));
}

// === PRZYCISKI ===
const btnStany = document.getElementById("btnStany");
const btnRaporty = document.getElementById("btnRaporty");
const btnDokumenty = document.getElementById("btnDokumenty");
const btnWydanie = document.getElementById("btnWydanie");

const inventory = document.getElementById("inventory");
const reports = document.getElementById("reports");
const documents = document.getElementById("documents");
const wydanieTowaru = document.getElementById("wydanieTowaru");

// === LOGIKA WYŚWIETLANIA ===
btnStany.addEventListener('click', () => {
  hideAllSections();
  inventory.classList.remove('hidden');
});

btnRaporty.addEventListener('click', () => {
  hideAllSections();
  reports.classList.remove('hidden');
});

btnDokumenty.addEventListener('click', () => {
  hideAllSections();
  documents.classList.remove('hidden');
});

btnWydanie.addEventListener('click', () => {
  hideAllSections();
  wydanieTowaru.classList.remove('hidden');
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
