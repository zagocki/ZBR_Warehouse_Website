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

// Funkcja odświeżająca tabelę produktów i selecty
async function refresh(q='') {
    const rows = await api('/products' + (q ? ('?q=' + encodeURIComponent(q)) : ''));
    const tbody = document.querySelector('#productsTable tbody');
    if (tbody) tbody.innerHTML = '';

    const receiveSel = document.getElementById('receiveProduct');
    const issueSel = document.getElementById('issueProduct');
    if (receiveSel && issueSel) {
        receiveSel.innerHTML = issueSel.innerHTML = '';
    }

    rows.forEach(r => {
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.name}</td><td>${r.sku||''}</td><td>${r.qty}</td><td>${r.date||''}</td><td>${r.location||''}</td>`;
            tbody.appendChild(tr);
        }

        if (receiveSel && issueSel) {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.text = `${r.name} (id:${r.id})`;
            receiveSel.appendChild(opt.cloneNode(true));
            issueSel.appendChild(opt);
        }
    });
}

// Obsługa dynamicznej tabeli i modala
document.addEventListener('DOMContentLoaded', () => {
    const btnStany = document.getElementById("btnStany");
    const container = document.getElementById("inventory");
    const modal = document.getElementById('addProductModal');
    const closeModalBtn = document.getElementById('closeModal');
    const addForm = document.getElementById('addProductForm');

    btnStany.addEventListener('click', () => {
        if (!container.innerHTML) {
            container.innerHTML = `
                <div class="add-product">
                    <button class="add-btn"><span class="plus">+</span></button>
                    <span class="add-text">Dodaj nowy produkt</span>
                </div>
                <div class="inventory table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Produkt</th>
                                <th>SKU</th>
                                <th>Ilość</th>
                                <th>Data</th>
                                <th>Dział</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            `;
        }

        container.classList.toggle("hidden");

        // Podpinamy event do przycisku dodawania produktu dopiero po wstawieniu przycisku do DOM
        const addBtn = container.querySelector('.add-product .add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
            });
        }
    });

    // Zamknięcie modala
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        addForm.reset();
    });

    // Zatwierdzenie formularza dodania produktu
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(addForm);
        const produkt = formData.get('produkt');
        const sku = formData.get('sku');
        const ilosc = formData.get('ilosc');
        const data = formData.get('data');
        const dzial = formData.get('dzial');

        // Dodanie wiersza do tabeli
        const tbody = container.querySelector('table tbody');
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${produkt}</td><td>${sku}</td><td>${ilosc}</td><td>${data}</td><td>${dzial}</td>`;
            tbody.appendChild(tr);
        }

        modal.classList.add('hidden');
        addForm.reset();
    });
});

// Początkowe załadowanie danych przy starcie strony
refresh();
