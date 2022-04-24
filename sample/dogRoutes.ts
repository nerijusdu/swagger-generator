import { Router } from 'express';
import { Dog } from './models';

const routes = Router();

type DogRouteParams = {
  dogId: string;
}

routes.get<any, DogRouteParams, Dog>('/dogs/:dogId', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});


export default routes;
