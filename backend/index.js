// import 'bootstrap/dist/css/bootstrap.min.css';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const templatesRoutes = require('./routes/templatesRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite
const db = require('./db');
db.serialize(() => {
  console.log('Connected to SQLite');
});

// Routes
app.use('/api', templatesRoutes);

app.get('/', (req, res) => {
  res.send('Review App Backend');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});