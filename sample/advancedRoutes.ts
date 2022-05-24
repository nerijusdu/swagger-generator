import { Router } from 'express';
import { Dog } from './models';

const routes = Router();
export const anotherRouter = Router();

routes.get<any, null, Dog>('/yeet', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});

anotherRouter.get<any, null, Dog>('/yeeted', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});

// export { anotherRouter };
export default routes;
