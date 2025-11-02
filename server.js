require("dotenv").config();

const express = require('express');
const path = require('path');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sql = require("mssql");

const app = express();

// ==========================================
// 🔧 Konfiguracja bazy danych Azure SQL
// ==========================================
const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,   // np. twojserver.database.windows.net
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};


// ==========================================
// 🔌 Połączenie z bazą danych przy starcie
// ==========================================
async function connectDB() {
  try {
    await sql.connect(dbConfig);
    console.log("✅ Połączono z bazą danych Azure SQL");
  } catch (err) {
    console.error("❌ Błąd połączenia z bazą danych:", err);
  }
}
connectDB();
console.log("ENV TEST:", {
  SQL_SERVER: process.env.SQL_SERVER,
  SQL_DATABASE: process.env.SQL_DATABASE,
  SQL_USER: process.env.SQL_USER
});


const JWT_SECRET = process.env.JWT_SECRET || "super_tajny_klucz";

// Middleware
app.use(express.json());
app.use(express.static("public"));

// ==========================================
// 🔐 Rejestracja użytkownika
// ==========================================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Wymagane pola: login i hasło" });

  try {
    const pool = await sql.connect();
    const checkUser = await pool.request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM users WHERE username = @username");

    if (checkUser.recordset.length > 0)
      return res.status(400).json({ error: "Użytkownik już istnieje" });

    const hash = await bcrypt.hash(password, 10);
    await pool.request()
      .input("username", sql.NVarChar, username)
      .input("passwordHash", sql.NVarChar, hash)
      .query("INSERT INTO users (username, passwordHash) VALUES (@username, @passwordHash)");

    res.json({ success: true, message: "✅ Użytkownik został zarejestrowany" });
  } catch (err) {
    console.error("❌ Błąd rejestracji:", err);
    res.status(500).json({ error: "Błąd serwera podczas rejestracji" });
  }
});

// ==========================================
// 🔑 Logowanie użytkownika
// ==========================================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Podaj login i hasło" });

  try {
    const pool = await sql.connect();
    const result = await pool.request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM users WHERE username = @username");

    if (result.recordset.length === 0)
      return res.status(401).json({ message: "Niepoprawny login lub hasło" });

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Niepoprawny login lub hasło" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    console.error("❌ Błąd logowania:", err);
    res.status(500).json({ error: "Błąd serwera podczas logowania" });
  }
});

// ==========================================
// 🛡️ Middleware autoryzacji JWT
// ==========================================
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

// ==========================================
// 👤 Endpoint testowy /profile
// ==========================================
app.get("/profile", verifyToken, (req, res) => {
  res.json({ message: `Witaj ${req.user.username}!`, id: req.user.id });
});

// ==========================================
// 📦 CRUD dla produktów
// ==========================================
app.get("/api/products", async (req, res) => {
  try {
    const pool = await sql.connect();
    const result = await pool.request().query("SELECT * FROM products");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Błąd pobierania produktów:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  const { name, sku, qty, date, location } = req.body;
  try {
    const pool = await sql.connect();
    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .input("sku", sql.NVarChar, sku)
      .input("qty", sql.Int, qty)
      .input("date", sql.NVarChar, date)
      .input("location", sql.NVarChar, location)
      .query("INSERT INTO products (name, sku, qty, date, location) OUTPUT INSERTED.* VALUES (@name, @sku, @qty, @date, @location)");

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Błąd dodawania produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const { name, location } = req.body;
  try {
    const pool = await sql.connect();
    await pool.request()
      .input("id", sql.Int, req.params.id)
      .input("name", sql.NVarChar, name)
      .input("location", sql.NVarChar, location)
      .query("UPDATE products SET name = COALESCE(@name, name), location = COALESCE(@location, location) WHERE id = @id");

    res.json({ updated: true });
  } catch (err) {
    console.error("❌ Błąd aktualizacji produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/receive", async (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: "id i qty wymagane" });

  try {
    const pool = await sql.connect();
    await pool.request()
      .input("id", sql.Int, id)
      .input("qty", sql.Int, qty)
      .query("UPDATE products SET qty = qty + @qty WHERE id = @id");

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM products WHERE id = @id");

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Błąd przyjęcia produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/issue", async (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: "id i qty wymagane" });

  try {
    const pool = await sql.connect();
    const product = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT qty FROM products WHERE id = @id");

    if (product.recordset.length === 0)
      return res.status(404).json({ error: "Produkt nie znaleziony" });

    const currentQty = product.recordset[0].qty;
    if (currentQty < qty)
      return res.status(400).json({ error: "Za mało w magazynie" });

    await pool.request()
      .input("id", sql.Int, id)
      .input("qty", sql.Int, qty)
      .query("UPDATE products SET qty = qty - @qty WHERE id = @id");

    const updated = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM products WHERE id = @id");

    res.json(updated.recordset[0]);
  } catch (err) {
    console.error("❌ Błąd wydania produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const pool = await sql.connect();
    await pool.request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM products WHERE id = @id");

    res.json({ deleted: true });
  } catch (err) {
    console.error("❌ Błąd usuwania produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🧭 Fallback dla SPA
// ==========================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// 🚀 Start serwera
// ==========================================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server działa na http://localhost:${port}`));
