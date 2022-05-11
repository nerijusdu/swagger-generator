import { Router } from 'express';
import { Dog } from './models';

const routes = Router();
export const anotherRouter = Router();

type DogRouteParams = {
  dogId: string;
}

routes.get<any, DogRouteParams, Dog>('/yeet', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});

anotherRouter.get<any, DogRouteParams, Dog>('/yeeted', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});

// export { anotherRouter };
export default routes;
