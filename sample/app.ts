import express, { Express } from 'express';
import routes from './routes';
import dogRoutes from './dogRoutes';

// Type is needed here for some reason
// must be imported explicitly, can't use express.Express
const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => res.send('Hello World!'));

app.use('/cats-api', routes);
app.use('/dogs-api', dogRoutes);

app.listen(Number(port), () => {
  console.log(`Server is running on port ${port}`);
});
