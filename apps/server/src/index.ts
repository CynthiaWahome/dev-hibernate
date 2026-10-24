import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 4317;

app.use(cors({ origin: 'http://127.0.0.1:5173' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRouter);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`DevHibernate server running at http://127.0.0.1:${PORT}`);
});