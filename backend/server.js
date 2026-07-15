require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
    res.send('DevNauts backend is running.');
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));