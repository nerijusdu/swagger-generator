import express from 'express';
import routes from './routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json())

app.get('/', (req, res) => res.send('Hello World!'));

app.use(routes);

app.listen(Number(port), () => {
  console.log(`Server is running on port ${port}`);
});
