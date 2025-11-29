require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

connectDB().catch(() => {});

app.get('/', (req, res) => res.send({ status: 'ok', message: 'Server is running' }));

app.use('/api/auth', require('./authRoutes'));
app.use('/api/user', require('./userRoutes'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
