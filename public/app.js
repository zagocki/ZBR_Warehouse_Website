// public/app.js

// --- Funkcja pomocnicza do komunikacji z API ---
async function api(path, method = "GET", body) {
  const token = sessionStorage.getItem("token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path.startsWith("/api") ? path : "/api" + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw err;
  }
  return res.json();
}

// --- Odświeżanie tabeli produktów ---
async function refresh(q = "") {
  try {
    const rows = await api("/products" + (q ? "?q=" + encodeURIComponent(q) : ""));
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = "";

rows.forEach((r) => {
  const tr = document.createElement("tr");

tr.innerHTML = `
  <td>${r.Product_name || ""}</td>
  <td>${r.CategoryID || ""}</td>
  <td>${r.Quantity || 0}</td>
  <td>${r.Expiry_date ? new Date(r.Expiry_date).toLocaleDateString() : ""}</td>
  <td>${r.ProductID || ""}</td>
  <td class="actions">
    <button class="dots-btn">⋮</button>
    <div class="delete-prompt hidden">
      <button class="delete-confirm">Usuń</button>
      <button class="delete-cancel">Anuluj</button>
    </div>
  </td>
`;


  tbody.appendChild(tr);
  // 🔹ikona 3 kropek do usuwania produktów
  const dotsBtn = tr.querySelector(".dots-btn");
  const deletePrompt = tr.querySelector(".delete-prompt");
  const deleteConfirm = tr.querySelector(".delete-confirm");
  const deleteCancel = tr.querySelector(".delete-cancel");

  // 🔹 Pokazuj tylko jeden prompt naraz
  dotsBtn.addEventListener("click", () => {
    document.querySelectorAll(".delete-prompt").forEach(p => p.classList.add("hidden")); // zamknij wszystkie
    deletePrompt.classList.toggle("hidden"); // otwórz/ukryj aktualny
  });

  deleteCancel.addEventListener("click", () => deletePrompt.classList.add("hidden"));

  deleteConfirm.addEventListener("click", async () => {
    try {
      await api("/products/" + r.ProductID, "DELETE");
      await refresh();
    } catch (err) {
      console.error("Błąd usuwania produktu:", err);
      alert("❌ Nie udało się usunąć produktu.");
    }
  });
});
  } catch (err) {
    console.error("Błąd odświeżania produktów:", err);
  }
}

/* =========================
   DOKUMENTY: definicje pól
   ========================= */
// szablony pól dla każdego typu dokumentu
const DOC_TEMPLATES = {
  PZ: {
    title: "PZ - Przyjęcie zewnętrzne",
    fields: [
      { id: "doc_number", label: "Numer dokumentu", type: "text" },
      { id: "doc_date", label: "Data", type: "date" },
      { id: "supplier", label: "Dostawca / Kontrahent", type: "text" },
      { id: "product_table", label: "Pozycje (produkt/ilość/j.m.)", type: "table" }
    ]
  },
  WZ: {
    title: "WZ - Wydanie zewnętrzne",
    fields: [
      { id: "doc_number", label: "Numer dokumentu", type: "text" },
      { id: "doc_date", label: "Data", type: "date" },
      { id: "recipient", label: "Odbiorca", type: "text" },
      { id: "product_table", label: "Pozycje (produkt/ilość/j.m.)", type: "table" }
    ]
  },
  MM: {
    title: "MM - Przesunięcie międzymagazynowe",
    fields: [
      { id: "doc_number", label: "Numer dokumentu", type: "text" },
      { id: "doc_date", label: "Data", type: "date" },
      { id: "from_store", label: "Z magazynu", type: "text" },
      { id: "to_store", label: "Do magazynu", type: "text" },
      { id: "product_table", label: "Pozycje (produkt/ilość/j.m.)", type: "table" }
    ]
  },
  FV: {
    title: "Faktura VAT",
    fields: [
      { id: "invoice_number", label: "Numer faktury", type: "text" },
      { id: "invoice_date", label: "Data", type: "date" },
      { id: "buyer", label: "Nabywca", type: "text" },
      { id: "seller", label: "Sprzedawca", type: "text" },
      { id: "product_table", label: "Pozycje (produkt/ilość,cena netto)","type":"table_invoice" }
    ]
  }
};

// pomocnicze selektory
const docModal = document.getElementById("docModal");
const docFields = document.getElementById("docFields");
const docPreview = document.getElementById("docPreview");
const docSheet = document.getElementById("docSheet");

let currentDocType = null;

// powiąż przyciski typów dokumentów
document.querySelectorAll(".doc-type").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.id.replace("doc", ""); // docPZ -> PZ
    openDocModal(id);
  });
});

// open modal + render form
function openDocModal(type) {
  currentDocType = type;
  const tpl = DOC_TEMPLATES[type];
  if (!tpl) return alert("Nieznany typ dokumentu");

  // wstaw pola
  docFields.innerHTML = `<h4 style="color:#fff;margin:6px 0 10px 0;">Tworzysz: ${tpl.title}</h4>`;
  tpl.fields.forEach(f => {
    if (f.type === "text" || f.type === "date") {
      docFields.innerHTML += `
        <label style="display:block;margin-bottom:8px;color:#ddd;">
          ${f.label}:
          <input id="${f.id}" name="${f.id}" ${f.type === 'date' ? 'type="date"' : 'type="text"'} style="width:100%;padding:6px;border-radius:6px;border:1px solid #444;margin-top:6px;background:#111;color:#fff;">
        </label>
      `;
    } else if (f.type === "table" || f.type === "table_invoice") {
      docFields.innerHTML += `
        <div style="margin:8px 0;color:#ddd;">
          <label>${f.label}:</label>
          <div id="${f.id}" class="doc-table-editor" style="margin-top:6px;">
            <table style="width:100%;">
              <thead><tr>
                <th style="text-align:left">Nazwa</th>
                <th style="width:90px">Ilość</th>
                <th style="width:90px">${f.type==='table_invoice'?'Cena':'J.m.'}</th>
                <th style="width:60px"></th>
              </tr></thead>
              <tbody></tbody>
            </table>
            <button data-table="${f.id}" class="add-row small-btn" type="button" style="margin-top:6px;">Dodaj pozycję</button>
          </div>
        </div>
      `;
    }
  });

  // pokaż modal
  docModal.classList.remove("hidden");
  renderPreviewBlank();
  // hookup add-row buttons
  setTimeout(()=>{ // after DOM insertion
    document.querySelectorAll(".add-row").forEach(b=>{
      b.addEventListener("click", () => addRowToTable(b.dataset.table));
    });
  },50);
}

// close modal
document.getElementById("closeDocModal").addEventListener("click", () => {
  docModal.classList.add("hidden");
  docFields.innerHTML = "";
});

// dodawanie wiersza do edytora tabeli
function addRowToTable(tableId) {
  const container = document.getElementById(tableId);
  if (!container) return;
  const tbody = container.querySelector("tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="row-name" style="width:100%;padding:4px;background:#111;color:#fff;border:1px solid #333;"></td>
    <td><input class="row-qty" style="width:100%;padding:4px;background:#111;color:#fff;border:1px solid #333;"></td>
    <td><input class="row-unit" style="width:100%;padding:4px;background:#111;color:#fff;border:1px solid #333;"></td>
    <td><button class="remove-row small-btn" type="button">✕</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".remove-row").addEventListener("click", ()=> tr.remove());
}

function renderPreviewBlank() {
  docSheet.innerHTML = `
    <div class="doc-header">
      <img src="images/ZBR_logo.png" alt="logo" style="height:28px;">
      <div class="doc-title">Podgląd dokumentu</div>
    </div>

    <div class="doc-main" style="color:#888;padding-top:20px;">
      Kliknij <b>Podgląd</b>, aby zobaczyć wypełniony dokument.
    </div>

    <div class="doc-footer">ZBR Warehouse</div>
  `;
}

// tworzenie HTML podglądu na podstawie formularza
function renderPreviewFromForm() {
  if (!currentDocType) return;

  const tpl = DOC_TEMPLATES[currentDocType];

  // --- ZBIERANIE DANYCH ---
  const data = {};
  tpl.fields.forEach(f => {
    if (f.type === "text" || f.type === "date") {
      data[f.id] = document.getElementById(f.id)?.value || "";
    } else if (f.type === "table" || f.type === "table_invoice") {
      const container = document.getElementById(f.id);
      const rows = Array.from(container.querySelectorAll("tbody tr")).map(r => ({
        name: r.querySelector(".row-name")?.value || "",
        qty: r.querySelector(".row-qty")?.value || "",
        unit: r.querySelector(".row-unit")?.value || ""
      }));
      data[f.id] = rows;
    }
  });

  // --- BUDOWANIE TABELI ---
  const tableField = tpl.fields.find(x => x.type === "table" || x.type === "table_invoice");
  let tableHtml = "";

  if (tableField) {
    tableHtml += `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr style="background:#f5f5f5;color:#000;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Nazwa</th>
            <th style="padding:6px;border:1px solid #ddd;width:80px">Ilość</th>
            <th style="padding:6px;border:1px solid #ddd;width:120px">${tableField.type === "table_invoice" ? "Cena netto" : "J.m."}</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data[tableField.id].length === 0) {
      tableHtml += `
        <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:center;color:#888">
          Brak pozycji
        </td></tr>`;
    } else {
      data[tableField.id].forEach(row => {
        tableHtml += `
          <tr>
            <td style="padding:6px;border:1px solid #ddd">${escapeHtml(row.name)}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">${escapeHtml(row.qty)}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right">${escapeHtml(row.unit)}</td>
          </tr>
        `;
      });
    }

    tableHtml += `</tbody></table>`;
  }

  // --- BUDOWANIE CAŁEGO ARKUSZA A4 ---
  docSheet.innerHTML = `
    <div class="doc-header">
      <img src="images/ZBR_logo.png" alt="logo" style="height:28px;">
      <div class="doc-title">${tpl.title}</div>
    </div>

    <div style="margin-bottom:10px;font-size:11px;">
      <strong>Wygenerowano:</strong> ${new Date().toLocaleString()}
    </div>

    <div class="doc-main">
      ${tpl.fields
        .filter(f => f.type === "text" || f.type === "date")
        .map(f =>
          `<div style="margin-bottom:6px;"><strong>${f.label}:</strong> ${escapeHtml(data[f.id])}</div>`
        ).join("")
      }

      ${tableHtml}
    </div>

    <div class="doc-footer">ZBR Warehouse – dokument wygenerowany automatycznie</div>
  `;
}

// escape helper
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// PODGLĄD i GENERUJ PDF
document.getElementById("previewBtn").addEventListener("click", () => {
  renderPreviewFromForm();
});

document.getElementById("generatePdfBtn").addEventListener("click", async () => {
  renderPreviewFromForm(); // generujemy aktualny dokument

  const element = document.getElementById("docSheet"); // <-- TERAZ TO DZIAŁA

  const opt = {
    margin: 0,
    filename: `${currentDocType}_${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  await html2pdf().set(opt).from(element).save();
});

// opcjonalnie: save draft (tu demo - localStorage)
document.getElementById("saveDraftBtn").addEventListener("click", () => {
  try {
    const tpl = DOC_TEMPLATES[currentDocType];
    const data = {};
    tpl.fields.forEach(f=>{
      if (f.type === 'text' || f.type === 'date') data[f.id] = document.getElementById(f.id)?.value || "";
      if (f.type.startsWith('table')) {
        const rows = Array.from(document.querySelectorAll(`#${f.id} tbody tr`)).map(r => ({
          name: r.querySelector(".row-name")?.value || "",
          qty: r.querySelector(".row-qty")?.value || "",
          unit: r.querySelector(".row-unit")?.value || ""
        }));
        data[f.id] = rows;
      }
    });
    localStorage.setItem(`draft_${currentDocType}`, JSON.stringify(data));
    alert("Zapisano draft lokalnie.");
  } catch (e) {
    console.error(e); alert("Błąd zapisu draftu.");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // === Elementy DOM ===
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.querySelector(".logout");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  /* ==============================
     🔐 LOGOWANIE I WYLOGOWANIE
     ============================== */

  // 🔹 Obsługa logowania
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      alert("❗ Podaj login i hasło");
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        sessionStorage.setItem("token", data.token);

        // Ukryj ekran logowania, pokaż panel
        document.querySelector(".login-container").style.display = "none";
        document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "block"));

        // Pobierz dane profilu (z rolą)
        const profileRes = await fetch("/profile", {
          headers: { Authorization: "Bearer " + data.token },
        });

        if (profileRes.ok) {
          const profile = await profileRes.json();
          const userSpan = document.querySelector(".user span");
          userSpan.textContent = `Witaj, ${profile.message.replace("Witaj ", "").replace("!", "")} (${profile.role || "brak roli"})`;
        }

        // Odśwież produkty
        await refresh();

        // Wyczyść pola logowania
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
      } else {
        alert("❌ " + (data.message || data.error || "Błędny login lub hasło"));
      }
    } catch (err) {
      console.error("Błąd podczas logowania:", err);
      alert("❌ Błąd połączenia z serwerem podczas logowania.");
    }
  });

  // 🔹 Obsługa wylogowania
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("token");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "none"));
    document.querySelector(".login-container").style.display = "flex";
  });

  // 🔹 Sprawdzenie tokena po odświeżeniu strony
  (async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/profile", {
        headers: { Authorization: "Bearer " + token },
      });

      if (res.ok) {
        const data = await res.json();
        document.querySelector(".login-container").style.display = "none";
        document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "block"));
        document.querySelector(".user span").textContent = `Witaj, ${data.message.replace("Witaj ", "").replace("!", "")} (${data.role || "brak roli"})`;
        await refresh();
      } else {
        sessionStorage.removeItem("token");
      }
    } catch (err) {
      console.error("Błąd w walidacji tokena:", err);
      sessionStorage.removeItem("token");
    }
  })();

  /* ==============================
     🔄 SEKCJE (toggle)
     ============================== */
  const sections = {
    inventory: document.getElementById("inventory"),
    reports: document.getElementById("reports"),
    documents: document.getElementById("documents"),
    wydanieTowaru: document.getElementById("wydanieTowaru"),
    users: document.getElementById("users"),
  };

  const btns = {
    btnStany: document.getElementById("btnStany"),
    btnRaporty: document.getElementById("btnRaporty"),
    btnDokumenty: document.getElementById("btnDokumenty"),
    btnWydanie: document.getElementById("btnWydanie"),
    btnUzytkownicy: document.getElementById("btnUzytkownicy"),
  };

  function hideAllSections() {
    Object.values(sections).forEach((s) => s.classList.add("hidden"));
  }

  btns.btnStany.addEventListener("click", () => {
    hideAllSections();
    sections.inventory.classList.remove("hidden");
  });

  btns.btnRaporty.addEventListener("click", () => {
    hideAllSections();
    sections.reports.classList.remove("hidden");
  });

  btns.btnDokumenty.addEventListener("click", () => {
    hideAllSections();
    sections.documents.classList.remove("hidden");
  });

  btns.btnWydanie.addEventListener("click", () => {
    hideAllSections();
    sections.wydanieTowaru.classList.remove("hidden");
  });

  /* ==============================
     👥 ZARZĄDZANIE UŻYTKOWNIKAMI
     ============================== */
  const btnRegisterUser = document.getElementById("btnRegisterUser");
  const btnDeleteUser = document.getElementById("btnDeleteUser");
  const registerUserPanel = document.getElementById("registerUserPanel");
  const deleteUserPanel = document.getElementById("deleteUserPanel");

  btns.btnUzytkownicy.addEventListener("click", () => {
    hideAllSections();
    sections.users.classList.remove("hidden");
    registerUserPanel.classList.add("hidden");
    deleteUserPanel.classList.add("hidden");
    btnRegisterUser.classList.remove("active");
    btnDeleteUser.classList.remove("active");
  });

  // Toggle panelu rejestracji
  btnRegisterUser.addEventListener("click", () => {
    const isHidden = registerUserPanel.classList.contains("hidden");
    deleteUserPanel.classList.add("hidden");
    btnDeleteUser.classList.remove("active");
    if (isHidden) {
      registerUserPanel.classList.remove("hidden");
      btnRegisterUser.classList.add("active");
    } else {
      registerUserPanel.classList.add("hidden");
      btnRegisterUser.classList.remove("active");
    }
  });

  // Toggle panelu usuwania
  btnDeleteUser.addEventListener("click", () => {
    const isHidden = deleteUserPanel.classList.contains("hidden");
    registerUserPanel.classList.add("hidden");
    btnRegisterUser.classList.remove("active");
    if (isHidden) {
      deleteUserPanel.classList.remove("hidden");
      btnDeleteUser.classList.add("active");
    } else {
      deleteUserPanel.classList.add("hidden");
      btnDeleteUser.classList.remove("active");
    }
  });

  // Rejestracja użytkownika z panelu admina (wysyła role)
  document.getElementById("registerUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;

    if (!username || !password) {
      alert("❗ Wprowadź login i hasło");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      const token = sessionStorage.getItem("token");
      if (token) headers.Authorization = "Bearer " + token;

      const res = await fetch("/register", {
        method: "POST",
        headers,
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message || "✅ Użytkownik dodany!");
        document.getElementById("newUsername").value = "";
        document.getElementById("newPassword").value = "";
      } else {
        alert("⚠️ " + (data.error || data.message || "Błąd rejestracji"));
      }
    } catch (err) {
      console.error("Błąd dodawania użytkownika:", err);
      alert("❌ Błąd przy dodawaniu użytkownika");
    }
  });

  // Usuwanie użytkownika
  document.getElementById("deleteUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("deleteUsername").value;
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika "${username}"?`)) return;

    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: "Bearer " + token } : {};
      const res = await fetch(`/deleteUser/${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message || "✅ Użytkownik został usunięty");
        document.getElementById("deleteUserForm").reset();
      } else {
        alert("⚠️ " + (data.error || data.message || "Błąd usuwania użytkownika"));
      }
    } catch (err) {
      console.error("Błąd przy usuwaniu użytkownika:", err);
      alert("❌ Błąd przy usuwaniu użytkownika");
    }
  });

  /* ==============================
     ➕ MODAL: dodawanie produktu
     ============================== */
  const modal = document.getElementById("addProductModal");
  document.getElementById("openModal").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("closeModal").addEventListener("click", () => modal.classList.add("hidden"));

  const addProductForm = document.getElementById("addProductForm");
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const Product_name = document.getElementById("productName").value.trim();
    const CategoryID = parseInt(document.getElementById("productCategory").value);
    const Quantity = parseInt(document.getElementById("productQty").value);
    const Expiry_date = document.getElementById("productDate").value;

  try {
    await api("/products", "POST", { Product_name, CategoryID, Quantity, Expiry_date });
    await refresh();
    addProductForm.reset();
    document.getElementById("addProductModal").classList.add("hidden");
  } catch (err) {
    console.error("Błąd dodawania produktu:", err);
    alert("❌ Nie udało się dodać produktu.");
  }
});


  /* ==============================
     🔍 WYSZUKIWANIE PRODUKTÓW
     ============================== */
  document.getElementById("searchProduct").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll("#productTableBody tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(term) ? "" : "none";
    });
  });

  /* ==============================
     📦 WYDANIE TOWARU
     ============================== */
  const wydanieForm = document.getElementById("wydanieForm");
  const confirmModal = document.getElementById("confirmModal");
  wydanieForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const produkt = document.getElementById("wydanieProdukt").value;
    const ilosc = parseInt(document.getElementById("wydanieIlosc").value);
    const odbiorca = document.getElementById("wydanieOdbiorca").value;

    confirmModal.classList.remove("hidden");
    document.getElementById("confirmYes").onclick = () => {
      confirmModal.classList.add("hidden");
      alert(`✅ Wydano ${ilosc} szt. produktu "${produkt}" dla ${odbiorca}.`);
      wydanieForm.reset();
    };
    document.getElementById("confirmNo").onclick = () => confirmModal.classList.add("hidden");
  });

  /* ==============================
     🔐 ZMIEŃ HASŁO (Modal + logika)
     ============================== */
  const changePasswordModal = document.getElementById("changePasswordModal");
  const cpForm = document.getElementById("changePasswordForm");
  const cpClose = document.getElementById("cpClose");

  // Otwieranie i zamykanie modala
  changePasswordBtn.addEventListener("click", () => changePasswordModal.classList.remove("hidden"));
  cpClose.addEventListener("click", () => changePasswordModal.classList.add("hidden"));

  // Obsługa formularza zmiany hasła
  cpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("cpUsername").value.trim();
    const oldPassword = document.getElementById("cpOldPassword").value;
    const newPassword = document.getElementById("cpNewPassword").value;
    const newPassword2 = document.getElementById("cpNewPassword2").value;

    if (newPassword !== newPassword2) {
      alert("❗ Nowe hasła nie są identyczne.");
      return;
    }

    try {
      const res = await fetch("/changePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldPassword, newPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert("✅ Hasło zostało zmienione.");
        changePasswordModal.classList.add("hidden");
        cpForm.reset();
      } else {
        alert("⚠️ " + (data.error || data.message || "Nie udało się zmienić hasła."));
      }
    } catch (err) {
      console.error("Błąd zmiany hasła:", err);
      alert("❌ Błąd serwera przy zmianie hasła.");
    }
  });
});
