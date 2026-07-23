# Beauty Shop — Node.js + Express + MySQL

A small beauty shop with a **shopping bag**. Products are stored in a MySQL
database; clicking **Add to bag** on a product saves it in the bag, and the bag
page shows the items with the total.

## Files
- `setup.sql` — creates (if needed) the shared `glow_cosmetics_db` database and
  the `Products` and `Cart` tables, then inserts the 6 products.
- `app.js` — Express server: shows the products from the database, handles
  add / remove / clear in the bag, and builds the bag page with the total.
- `index.html` — home page (static).
- `styles/` — the CSS files. `styles/style1.css` styles the shop pages.
- `images/` — the product photos.
- `package.json` — Node dependencies (`express`, `mysql2`).

## How to run

### 1. Create the database (run once)
```bash
mysql -u root -proot < setup.sql
```

### 2. Install dependencies (already done)
```bash
npm install
```

### 3. Start the web app
```bash
npm start
```
Then open **http://localhost:3000** in your browser.

## Pages / routes
- `/` — home page
- `/products` — all products (from the database) with an **Add to bag** button
- `/bag` — the shopping bag: items, quantities, and the total

## Database connection (same on every teammate's PC)
- MySQL user: `root`
- Password: `root`
- Database: `glow_cosmetics_db`

(Used in `app.js`. Everyone on the team uses these same 3 values so the
connection block never needs editing when sharing the code.)
