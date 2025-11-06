// --- Funkcja pomocnicza do komunikacji z API ---
async function api(path, method = "GET", body) {
  const token = localStorage.getItem("token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch("/api" + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw err;
  }
  return res.json();
}

// --- Odświeżanie tabeli produktów ---
async function refresh(q = "") {
  const rows = await api("/products" + (q ? "?q=" + encodeURIComponent(q) : ""));
  const tbody = document.getElementById("productTableBody");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.name}</td><td>${r.sku || ""}</td><td>${r.qty}</td><td>${r.date || ""}</td><td>${r.location || ""}</td>`;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  /* ==============================
     🔐 LOGOWANIE I WYLOGOWANIE
     ============================== */
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.querySelector(".logout");

  // 🔹 Obsługa logowania
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.token) {
      // ✅ Zapisz token JWT
      localStorage.setItem("token", data.token);

      // ✅ Ukryj ekran logowania, pokaż panel
      document.querySelector(".login-container").style.display = "none";
      document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "block"));

      // 🔹 Pobierz dane profilu
      const profileRes = await fetch("/profile", {
        headers: { Authorization: "Bearer " + data.token },
      });
      const profile = await profileRes.json();

      // 🔹 Aktualizuj nazwę użytkownika w headerze
      const userSpan = document.querySelector(".user span");
      userSpan.textContent = `Witaj, ${profile.message.replace("Witaj ", "").replace("!", "")}`;

      // 🔹 Odśwież produkty po zalogowaniu
      await refresh();
    } else {
      alert("❌ Błędny login lub hasło");
    }
  });

  // 🔹 Obsługa wylogowania
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "none"));
    document.querySelector(".login-container").style.display = "flex";
  });

  // 🔹 Sprawdzenie czy użytkownik ma token po odświeżeniu strony
  (async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("/profile", {
      headers: { Authorization: "Bearer " + token },
    });

    if (res.ok) {
      const data = await res.json();
      document.querySelector(".login-container").style.display = "none";
      document.querySelectorAll(".main-content").forEach((el) => (el.style.display = "block"));
      document.querySelector(".user span").textContent = `Witaj, ${data.message.replace("Witaj ", "").replace("!", "")}`;
      await refresh();
    } else {
      localStorage.removeItem("token");
    }
  })();

  // 🔹 Obsługa rejestracji
const registerBtn = document.getElementById("registerBtn");

registerBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("❌ Wprowadź login i hasło przed rejestracją!");
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Użytkownik został zarejestrowany! Możesz się teraz zalogować.");
      // czyść pola
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    } else {
      alert("⚠️ " + (data.error || data.message));
    }
  } catch (err) {
    alert("❌ Błąd podczas rejestracji. Sprawdź połączenie z serwerem.");
    console.error("Błąd rejestracji:", err);
  }
});

  /* ==============================
     🔄 SEKCJE (toggle)
     ============================== */
  const sections = {
    inventory: document.getElementById("inventory"),
    reports: document.getElementById("reports"),
    documents: document.getElementById("documents"),
    wydanieTowaru: document.getElementById("wydanieTowaru"),
  };

  const btns = {
    btnStany: document.getElementById("btnStany"),
    btnRaporty: document.getElementById("btnRaporty"),
    btnDokumenty: document.getElementById("btnDokumenty"),
    btnWydanie: document.getElementById("btnWydanie"),
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
     ➕ MODAL: dodawanie produktu
     ============================== */
  const modal = document.getElementById("addProductModal");
  document.getElementById("openModal").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("closeModal").addEventListener("click", () => modal.classList.add("hidden"));

  const addProductForm = document.getElementById("addProductForm");
  const tableBody = document.getElementById("productTableBody");
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { produkt, sku, ilosc, data, dzial } = addProductForm;
    await api("/products", "POST", {
      name: produkt.value,
      sku: sku.value,
      qty: parseInt(ilosc.value),
      date: data.value,
      location: dzial.value,
    });
    await refresh();
    addProductForm.reset();
    modal.classList.add("hidden");
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
});
