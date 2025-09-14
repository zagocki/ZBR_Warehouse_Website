const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('./warehouse.db'); // <-- ścieżka do Twojej bazy

app.use(express.json());
app.use(express.static('public')); // katalog na index.html, app.js, styles.css

// Tymczasowe dane logowania
const fakeUser = {
  username: 'admin',
  password: '1234'
};

// Endpoint logowania
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === fakeUser.username && password === fakeUser.password) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});


// Update product
app.put('/api/products/:id', (req, res) => {
  const { name, location } = req.body;
  db.run(
    'UPDATE products SET name = COALESCE(?, name), location = COALESCE(?, location) WHERE id = ?',
    [name, location, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Receive (increase qty)
app.post('/api/receive', (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: 'id and qty required' });

  db.run('UPDATE products SET qty = qty + ? WHERE id = ?', [qty, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// Issue (decrease qty)
app.post('/api/issue', (req, res) => {
  const { id, qty } = req.body;
  if (!id || !qty) return res.status(400).json({ error: 'id and qty required' });

  db.get('SELECT qty FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.qty < qty) return res.status(400).json({ error: 'Insufficient stock' });

    db.run('UPDATE products SET qty = qty - ? WHERE id = ?', [qty, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    });
  });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
