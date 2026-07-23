const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.')); 


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      
    password: 'Miss.Nelma200407@',  
    database: 'glow_cosmetics_db'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err.message);
    } else {
        console.log('Successfully connected to the MySQL database glow_cosmetics_db!');
    }
});


app.post('/api/register', async (req, res) => {
    const { first_name, last_name, username, email, password, confirm_password } = req.body;

    if (!first_name || !last_name || !username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {

        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?', [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'This username is already taken.' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query(
            'INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, username, email, hashedPassword]
        );

        res.status(201).json({ message: 'Registration successful!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during registration.' });
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Please fill in all fields.' });
    }

    try {
       
        const [users] = await db.promise().query(
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


app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.promise().query('SELECT * FROM products');
        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching products.' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running and ready at http://localhost:${PORT}`);
});