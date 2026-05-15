const express = require('express');
const app = express();

const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

app.use(express.json({ limit: '12mb' }));
app.use(morgan('dev'));
app.use(cors());
app.use(helmet());

// ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/issues', require('./routes/update'));
app.use('/api/worker', require('./routes/worker'));

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

// ERROR HANDLER
app.use(require('./middleware/errorHandler'));

module.exports = app;