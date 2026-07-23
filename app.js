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

// Format the review count like Sephora: 17600 -> "17.6K", 326 -> "326".
function reviewCount(n) {
  n = Number(n);
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// How many items are currently in the bag (used in the top bar).
async function bagCount() {
  const [rows] = await pool.query('SELECT COALESCE(SUM(Quantity), 0) AS n FROM Cart');
  return rows[0].n;
}

function pageStart(title, count, active) {
  const on = (p) => (active === p ? ' class="active"' : '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="styles/style.css">
  <link rel="stylesheet" href="styles/style1.css">
</head>
<body>
  <header class="navbar">
    <div class="brand-info">
      <a href="/" class="logo-link">
        <img src="images/logowebsite.png" alt="Glow Cosmetics Logo" class="nav-logo">
        <span class="brand-name">Glow Cosmetics</span>
      </a>
    </div>
    <nav class="nav-links">
      <a href="/"${on('home')}>Home</a>
      <a href="/products"${on('products')}>Products</a>
      <a href="about.html">About Us</a>
      <a href="/bag"${on('bag')}>Bag (${count})</a>
    </nav>
    <div class="auth-links">
      <a href="login.html" class="login-btn">Log In</a>
      <a href="register.html" class="register-btn">Register</a>
    </div>
  </header>`;
}

const pageEnd = `
  <footer class="main-footer">
    <div class="footer-content">
      <div class="footer-brand">
        <h3>Glow Cosmetics</h3>
        <p>Enhancing your natural beauty, everyday.</p>
      </div>
      <div class="footer-links">
        <h4>Quick Links</h4>
        <a href="/">Home</a>
        <a href="/products">Products</a>
        <a href="about.html">About Us</a>
      </div>
      <div class="footer-contact">
        <h4>Contact Us</h4>
        <p>Email: support@glowcosmetics.com</p>
        <p>Follow us: @glowcosmetics</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Glow Cosmetics - Final Web Development Project.</p>
    </div>
  </footer>
  <script src="js/main.js"></script>
</body></html>`;

// Small client script: the heart button marks a product as favorite and
// remembers it in the browser (localStorage), so it stays filled on reload.
const favScript = `
  <script>
  (function () {
    var KEY = 'favs';
    function get() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    function save(l) { localStorage.setItem(KEY, JSON.stringify(l)); }
    function money(n) { return '$' + Number(n).toFixed(2); }

    // Redessine la barre "Mes favoris" (compteur + photo + prix)
    function renderFavorites() {
      var favs = get();
      var countEl = document.getElementById('fav-count');
      var listEl = document.getElementById('fav-list');
      if (countEl) { countEl.textContent = favs.length; }
      if (!listEl) { return; }
      if (favs.length === 0) {
        listEl.innerHTML = '<p class="fav-empty">No favorites yet — tap the ♡ on a product.</p>';
        return;
      }
      var html = '';
      favs.forEach(function (id) {
        var p = (window.PRODUCTS || []).find(function (x) { return String(x.id) === String(id); });
        if (!p) { return; }
        html += '<div class="fav-item">'
          + '<img src="images/' + p.image + '" alt="">'
          + '<div class="fav-item-info">'
          + '<span class="fav-item-name">' + p.brand + '</span>'
          + '<span class="fav-item-price">' + money(p.price) + '</span>'
          + '</div></div>';
      });
      listEl.innerHTML = html;
    }

    document.querySelectorAll('.fav-btn').forEach(function (btn) {
      var id = btn.getAttribute('data-id');
      if (get().indexOf(id) !== -1) { btn.classList.add('is-fav'); btn.textContent = '♥'; }
      btn.addEventListener('click', function () {
        var list = get(), i = list.indexOf(id);
        if (i !== -1) { list.splice(i, 1); btn.classList.remove('is-fav'); btn.textContent = '♡'; }
        else { list.push(id); btn.classList.add('is-fav'); btn.textContent = '♥'; }
        save(list);
        renderFavorites();
      });
    });

    renderFavorites();
  })();
  </script>`;

// One product card, with its "Add to bag" button.
function renderCard(p) {
  const badge = p.Badge
    ? `<div class="badges"><span class="badge">${esc(p.Badge)}</span></div>`
    : '';
  const rating = p.Rating
    ? `
        <div class="rating" title="${p.Rating} out of 5">
          <span class="stars"><span class="stars-fill" style="width:${(Number(p.Rating) / 5) * 100}%"></span></span>
          <span class="reviews">${reviewCount(p.Reviews)}</span>
        </div>`
    : '';
  return `
    <div class="carte">
      <div class="image-produit">
        ${badge}
        <button class="fav-btn" data-id="${p.Id}" aria-label="Add to favorites" title="Add to favorites">♡</button>
        <img src="images/${esc(p.Image)}" alt="${esc(p.Name)}">
      </div>
      <div class="infos">
        <p class="marque">${esc(p.Brand)}</p>
        <p class="nom">${esc(p.Name)}</p>${rating}
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

    let page = pageStart('Products', count, 'products');
    page += `<section class="shop-header">
      <p class="breadcrumb">Makeup › All Products</p>
      <h1>Our Products</h1>
      <p class="section-subtitle">Discover our full collection of clean, cruelty-free beauty.</p>
      <p class="results-count">${products.length} products</p>
    </section>`;
    page += `<section class="favorites-bar" id="favorites-bar">
      <h2>My Favorites (<span id="fav-count">0</span>)</h2>
      <div id="fav-list" class="fav-list"></div>
    </section>`;
    page += '<div class="liste-produits">';
    products.forEach(p => { page += renderCard(p); });
    page += '</div>';
    const productData = products.map(p => ({
      id: p.Id, brand: p.Brand, name: p.Name, price: Number(p.Price), image: p.Image
    }));
    page += `<script>window.PRODUCTS = ${JSON.stringify(productData).replace(/</g, '\\u003c')};</script>`;
    page += favScript;
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
      `SELECT p.Id, p.Brand, p.Name, p.Price, p.Image, c.Quantity,
              (p.Price * c.Quantity) AS Subtotal
       FROM Cart c
       JOIN Products p ON p.Id = c.ProductId
       ORDER BY p.Id`
    );
    const count = await bagCount();

    let page = pageStart('Shopping bag', count, 'bag');
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
          <td class="bag-name">
            <img class="bag-thumb" src="images/${esc(it.Image)}" alt="${esc(it.Name)}">
            <span>${esc(it.Brand)} — ${esc(it.Name)}</span>
          </td>
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
