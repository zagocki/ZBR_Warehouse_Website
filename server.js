const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const db = new sqlite3.Database('./warehouse.db');

// Middleware
app.use(express.json());
app.use(express.static("public"));

const JWT_SECRET = process.env.JWT_SECRET || "super_tajny_klucz";

// Tworzymy tabele, jeśli nie istnieją
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      passwordHash TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      sku TEXT,
      qty INTEGER DEFAULT 0,
      date TEXT,
      location TEXT
    )
  `);
});

/* ===============================
   🔐 Rejestracja użytkownika
   =============================== */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Wymagane pola: login i hasło" });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (username, passwordHash) VALUES (?, ?)",
      [username, hash],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE"))
            return res.status(400).json({ error: "Użytkownik już istnieje" });
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

/* ===============================
   🔑 Logowanie użytkownika
   =============================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Podaj login i hasło" });

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: "Niepoprawny login lub hasło" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Niepoprawny login lub hasło" });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  });
});

/* ===============================
   🛡️ Middleware autoryzacji JWT
   =============================== */
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* ===============================
   👤 Profil użytkownika (test JWT)
   =============================== */
app.get("/profile", verifyToken, (req, res) => {
  res.json({ message: `Witaj ${req.user.username}!`, id: req.user.id });
});

/* ===============================
   📦 CRUD dla produktów
   =============================== */
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products", (req, res) => {
  const { name, sku, qty, date, location } = req.body;
  db.run(
    "INSERT INTO products (name, sku, qty, date, location) VALUES (?, ?, ?, ?, ?)",
    [name, sku, qty, date, location],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, sku, qty, date, location });
    }
  );
});

app.put("/api/products/:id", (req, res) => {
  const { name, location } = req.body;
  db.run(
    "UPDATE products SET name = COALESCE(?, name), location = COALESCE(?, location) WHERE id = ?",
    [name, location, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.post("/api/receive", (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: "id i qty wymagane" });

  db.run("UPDATE products SET qty = qty + ? WHERE id = ?", [qty, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

app.post("/api/issue", (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: "id i qty wymagane" });

  db.get("SELECT qty FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Produkt nie znaleziony" });
    if (row.qty < qty) return res.status(400).json({ error: "Za mało w magazynie" });

    db.run("UPDATE products SET qty = qty - ? WHERE id = ?", [qty, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    });
  });
});

app.delete("/api/products/:id", (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

/* ===============================
   🧭 Fallback dla SPA
   =============================== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   🚀 Start serwera
   =============================== */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server działa na http://localhost:${port}`));
