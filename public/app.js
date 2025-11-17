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
        <td>${r.Product_name || r.name || ""}</td>
        <td>${r.CategoryID || ""}</td>
        <td>${r.Quantity || r.qty || 0}</td>
        <td>${r.Expiry_date ? new Date(r.Expiry_date).toLocaleDateString() : (r.date ? new Date(r.date).toLocaleDateString() : "")}</td>
        <td>${r.ProductID || r.id || ""}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Błąd podczas odświeżania produktów:", err);
  }
}

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
