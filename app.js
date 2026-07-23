const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// ===========================================================================
//  DATABASE CONNECTION
//  ⚠️  Each teammate sets `password` to HER OWN local MySQL root password.
//      (This is the only line that changes from one PC to another.)
// ===========================================================================
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'glow_cosmetics_db'
};

const pool = mysql.createPool(dbConfig);

// Middlewares ---------------------------------------------------------------
app.use(cors());
app.use(express.json());                          // reads JSON bodies (login/register)
app.use(express.urlencoded({ extended: false })); // reads <form> bodies (Add to bag)
app.use(express.static(__dirname));               // serves index.html, styles/, images/, js/, ...

// Small helpers -------------------------------------------------------------

// Escape text so product names with & or < don't break the HTML.
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value) {
  return '$' + Number(value).toFixed(2);
}

// How many items are currently in the bag (used in the top bar).
async function bagCount() {
  const [rows] = await pool.query('SELECT COALESCE(SUM(Quantity), 0) AS n FROM Cart');
  return rows[0].n;
}

function pageStart(title, count) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="styles/style1.css">
</head>
<body>
  <div class="topbar">
    <a href="/">Home</a>
    <a href="/bag">Shopping bag (${count})</a>
  </div>`;
}

const pageEnd = '</body></html>';

// One product card, with its "Add to bag" button.
function renderCard(p) {
  const badge = p.Badge
    ? `<div class="badges"><span class="badge">${esc(p.Badge)}</span></div>`
    : '';
  return `
    <div class="carte">
      <div class="image-produit">
        ${badge}
        <img src="images/${esc(p.Image)}" alt="${esc(p.Name)}">
      </div>
      <div class="infos">
        <p class="marque">${esc(p.Brand)}</p>
        <p class="nom">${esc(p.Name)}</p>
        <p class="prix">${money(p.Price)}</p>
        <form method="POST" action="/cart/add">
          <input type="hidden" name="id" value="${p.Id}">
          <button type="submit" class="btn-add">Add to bag</button>
        </form>
      </div>
    </div>`;
}

// ===========================================================================
//  AUTH ROUTES  (users table)
// ===========================================================================

// Register a new user.
app.post('/api/register', async (req, res) => {
  const { first_name, last_name, username, email, password, confirm_password } = req.body;

  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ?', [username]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'This username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, username, email, hashedPassword]
    );

    res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// Log a user in.
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', [username, username]
    );
    if (users.length === 0) {
      return res.status(400).json({ error: 'Incorrect username or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect username or password.' });
    }

    res.status(200).json({
      message: 'Login successful!',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Products as JSON (kept for compatibility with the front-end API).
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM Products ORDER BY Id');
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching products.' });
  }
});

// ===========================================================================
//  SHOP ROUTES  (Products + Cart tables)
// ===========================================================================

// The products page, built from the database (with the "Add to bag" button).
app.get('/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM Products ORDER BY Id');
    const count = await bagCount();

    let page = pageStart('Products', count);
    page += '<h1>Our products</h1>';
    page += '<div class="liste-produits">';
    products.forEach(p => { page += renderCard(p); });
    page += '</div>';
    page += pageEnd;

    res.send(page);
  } catch (err) {
    res.status(500).send('<pre>Database error: ' + esc(err.message) + '</pre>');
  }
});

// Add a product to the bag (or +1 if it is already there).
app.post('/cart/add', async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10);
    if (id) {
      await pool.query(
        `INSERT INTO Cart (ProductId, Quantity) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE Quantity = Quantity + 1`,
        [id]
      );
    }
    res.redirect('/products');
  } catch (err) {
    res.status(500).send('<pre>Database error: ' + esc(err.message) + '</pre>');
  }
});

// Remove a product from the bag completely.
app.post('/cart/remove', async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10);
    if (id) {
      await pool.query('DELETE FROM Cart WHERE ProductId = ?', [id]);
    }
    res.redirect('/bag');
  } catch (err) {
    res.status(500).send('<pre>Database error: ' + esc(err.message) + '</pre>');
  }
});

// Empty the whole bag.
app.post('/cart/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM Cart');
    res.redirect('/bag');
  } catch (err) {
    res.status(500).send('<pre>Database error: ' + esc(err.message) + '</pre>');
  }
});

// The shopping bag page, with the total.
app.get('/bag', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT p.Id, p.Brand, p.Name, p.Price, c.Quantity,
              (p.Price * c.Quantity) AS Subtotal
       FROM Cart c
       JOIN Products p ON p.Id = c.ProductId
       ORDER BY p.Id`
    );
    const count = await bagCount();

    let page = pageStart('Shopping bag', count);
    page += '<h1>Shopping bag</h1>';

    if (items.length === 0) {
      page += '<p>Your bag is empty.</p>';
      page += '<div class="retour"><a href="/products">See our products</a></div>';
    } else {
      let total = 0;
      page += '<table class="bag-table">';
      page += '<tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>';
      items.forEach(it => {
        total += Number(it.Subtotal);
        page += `<tr>
          <td class="bag-name">${esc(it.Brand)} — ${esc(it.Name)}</td>
          <td>${money(it.Price)}</td>
          <td>${it.Quantity}</td>
          <td>${money(it.Subtotal)}</td>
          <td>
            <form method="POST" action="/cart/remove">
              <input type="hidden" name="id" value="${it.Id}">
              <button type="submit" class="btn-remove">Remove</button>
            </form>
          </td>
        </tr>`;
      });
      page += `<tr class="total-row">
        <td colspan="3">Total</td>
        <td>${money(total)}</td>
        <td></td>
      </tr>`;
      page += '</table>';

      page += `<div class="bag-actions">
        <a href="/products">Continue shopping</a>
        <form method="POST" action="/cart/clear">
          <button type="submit" class="btn-remove">Clear bag</button>
        </form>
      </div>`;
    }

    page += pageEnd;
    res.send(page);
  } catch (err) {
    res.status(500).send('<pre>Database error: ' + esc(err.message) + '</pre>');
  }
});

app.listen(PORT, () => {
  console.log(`Glow Cosmetics running at http://localhost:${PORT}`);
});
