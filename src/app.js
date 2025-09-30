import express from 'express';
import cors from 'cors';
import filmsRouter from './routes/films.js';
import actorsRouter from './routes/actors.js';
import customersRouter from './routes/customers.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/films', filmsRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/customers', customersRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));
