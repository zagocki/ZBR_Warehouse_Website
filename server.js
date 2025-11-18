require("dotenv").config();

const express = require('express');
const path = require('path');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sql = require("mssql");

const app = express();
const morgan = require('morgan');
app.use(morgan('dev'));

// ==========================================
// 🔧 Konfiguracja bazy danych Azure SQL
// ==========================================
const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
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
// 🔐 Rejestracja użytkownika (z przypisaniem roli z tabeli Roles)
// ==========================================
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Wymagane pola: login i hasło" });

  try {
    const pool = await sql.connect(dbConfig);

    // 🔹 Sprawdź czy użytkownik już istnieje
    const checkUser = await pool.request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM users WHERE username = @username");

    if (checkUser.recordset.length > 0)
      return res.status(400).json({ error: "Użytkownik już istnieje" });

    // 🔹 Sprawdź czy rola istnieje, jeśli nie — domyślnie Magazynier
    const roleName = role || "Magazynier";
    const roleResult = await pool.request()
      .input("Role_name", sql.NVarChar, roleName)
      .query("SELECT RoleID FROM Roles WHERE Role_name = @Role_name");

    if (roleResult.recordset.length === 0)
      return res.status(400).json({ error: `Rola '${roleName}' nie istnieje w tabeli Roles` });

    const roleID = roleResult.recordset[0].RoleID;

    // 🔹 Hashowanie hasła
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Dodanie nowego użytkownika z RoleID
    await pool.request()
      .input("username", sql.NVarChar, username)
      .input("passwordHash", sql.NVarChar, hash)
      .input("RoleID", sql.Int, roleID)
      .query(`
        INSERT INTO users (username, passwordHash, RoleID)
        VALUES (@username, @passwordHash, @RoleID)
      `);

    res.json({ success: true, message: `✅ Użytkownik '${username}' z rolą '${roleName}' został zarejestrowany.` });
  } catch (err) {
    console.error("❌ Błąd rejestracji:", err);
    res.status(500).json({ error: "Błąd serwera podczas rejestracji" });
  }
});

// ==========================================
// 🔑 Logowanie użytkownika (z pobraniem roli)
// ==========================================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Podaj login i hasło" });

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("username", sql.NVarChar, username)
      .query(`
        SELECT u.id, u.username, u.passwordHash, r.Role_name
        FROM users u
        LEFT JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.username = @username
      `);

    if (result.recordset.length === 0)
      return res.status(401).json({ error: "Niepoprawny login lub hasło" });

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Niepoprawny login lub hasło" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.Role_name },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

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
// 👤 Endpoint profilu (z rolą)
// ==========================================
app.get("/profile", verifyToken, async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query(`
        SELECT u.username, r.Role_name
        FROM users u
        LEFT JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.id = @id
      `);

    const user = result.recordset[0];
    res.json({
      message: `Witaj ${user.username}!`,
      id: req.user.id,
      role: user.Role_name
    });
  } catch (err) {
    res.status(500).json({ error: "Błąd pobierania profilu" });
  }
});

// ==========================================
// 📦 CRUD dla produktów
// ==========================================
app.get("/api/products", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query("SELECT ProductID, Product_name, CategoryID, Quantity, Expiry_date FROM products");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Błąd pobierania produktów:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  const { Product_name, CategoryID, Quantity, Expiry_date } = req.body;

  if (!Product_name || !CategoryID || !Quantity || !Expiry_date) {
    return res.status(400).json({ error: "Wymagane wszystkie pola produktu" });
  }

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input("Product_name", sql.NVarChar, Product_name)
      .input("CategoryID", sql.Int, CategoryID)
      .input("Quantity", sql.Int, Quantity)
      .input("Expiry_date", sql.Date, Expiry_date)
      .query(`
        INSERT INTO products (Product_name, CategoryID, Quantity, Expiry_date)
        OUTPUT INSERTED.ProductID, INSERTED.Product_name, INSERTED.CategoryID, INSERTED.Quantity, INSERTED.Expiry_date
        VALUES (@Product_name, @CategoryID, @Quantity, @Expiry_date)
      `);

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

// DELETE product by ProductID
app.delete("/api/products/:id", async (req, res) => {
  const productId = req.params.id; // to jest ProductID w tabeli
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("ProductID", sql.Int, productId)
      .query("DELETE FROM products WHERE ProductID = @ProductID");

    res.json({ deleted: true, message: `Produkt o ID ${productId} został usunięty.` });
  } catch (err) {
    console.error("❌ Błąd usuwania produktu:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🧩 Usuwanie użytkownika
// ==========================================
app.delete("/deleteUser/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const pool = await sql.connect();
    await pool.request()
      .input("username", sql.NVarChar, username)
      .query("DELETE FROM users WHERE username = @username");
    res.json({ success: true, message: `Użytkownik ${username} został usunięty` });
  } catch (err) {
    console.error("❌ Błąd przy usuwaniu użytkownika:", err);
    res.status(500).json({ error: "Błąd serwera przy usuwaniu użytkownika" });
  }
});

// ==========================================
// 🔒 Zmiana hasła użytkownika
// ==========================================
app.post("/changePassword", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword)
    return res.status(400).json({ error: "Wymagane pola: login, stare i nowe hasło" });

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM users WHERE username = @username");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });

    const user = result.recordset[0];
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: "Niepoprawne stare hasło" });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input("username", sql.NVarChar, username)
      .input("passwordHash", sql.NVarChar, newHash)
      .query("UPDATE users SET passwordHash = @passwordHash WHERE username = @username");

    res.json({ success: true, message: "Hasło zostało zmienione" });
  } catch (err) {
    console.error("❌ Błąd przy zmianie hasła:", err);
    res.status(500).json({ error: "Błąd serwera przy zmianie hasła" });
  }
});

// ==========================================
// 🧭 Fallback dla SPA
// ==========================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// 🔴 Niestandardowe logowanie błędów
// ==========================================
app.use((err, req, res, next) => {
  console.error("❌ Błąd serwera:", err.message);
  console.error(err.stack);
  res.status(500).json({ error: "Wewnętrzny błąd serwera" });
});

// ==========================================
// 🚀 Start serwera
// ==========================================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server działa na http://localhost:${port}`));

// ==========================================
// 💥 Globalne przechwytywanie błędów
// ==========================================
process.on("unhandledRejection", (err) => {
  console.error("❌ Nieobsłużony Promise Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("💥 Nieobsłużony wyjątek:", err);
});
