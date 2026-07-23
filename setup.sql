-- ===========================================================================
--  Shared database for the whole project: Glow Cosmetics
--  Run once:  mysql -u root -proot < setup.sql
-- ===========================================================================
CREATE DATABASE IF NOT EXISTS glow_cosmetics_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE glow_cosmetics_db;

-- Users (login / register). Kept as-is if it already exists, so registered
-- accounts are never lost when the script is run again.
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(50)  NOT NULL,
  last_name   VARCHAR(50)  NOT NULL,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(100) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop tables. Recreated fresh each run (drop Cart first because of the FK).
DROP TABLE IF EXISTS Cart;
DROP TABLE IF EXISTS Products;

CREATE TABLE Products (
  Id     INT AUTO_INCREMENT PRIMARY KEY,
  Brand  VARCHAR(80)   NOT NULL,
  Name   VARCHAR(150)  NOT NULL,
  Price  DECIMAL(6,2)  NOT NULL,
  Image  VARCHAR(120)  NOT NULL,
  Badge  VARCHAR(40)   DEFAULT NULL,
  CONSTRAINT chk_price CHECK (Price >= 0)
);

CREATE TABLE Cart (
  Id        INT AUTO_INCREMENT PRIMARY KEY,
  ProductId INT NOT NULL UNIQUE,
  Quantity  INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_cart_product FOREIGN KEY (ProductId) REFERENCES Products(Id),
  CONSTRAINT chk_qty CHECK (Quantity > 0)
);

INSERT INTO Products (Brand, Name, Price, Image, Badge) VALUES
  ('rhode',                       'Pocket Bronze Long-Wearing Cream Bronzer',           25.00, 'bronzer.jpg',     'CLEAN'),
  ('Summer Fridays',              'Lip Butter Balm Treatment for Hydration + Nourishment', 24.00, 'lipbutter.jpg', 'LIMITED EDITION'),
  ('PATRICK TA',                  'Major Headlines Double-Take Creme & Powder Blush',   25.00, 'blush.jpg',       NULL),
  ('Touchland',                   'Power Mist Hydrating Hand Sanitizer',                12.00, 'sanitizer.jpg',   'LIMITED EDITION'),
  ('Rare Beauty by Selena Gomez', 'Mini Soft Pinch Liquid Blush',                       16.00, 'liquidblush.jpg', NULL),
  ('HUDA BEAUTY',                 'Lip Contour 12-Hour Wear',                           25.00, 'lipcontour.jpg',  NULL);

-- Quick confirmation output
SELECT '--- glow_cosmetics_db ready (users + Products + Cart) ---' AS Info;
SHOW TABLES;
SELECT * FROM Products;
