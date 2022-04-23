import { Router } from 'express';
import { Cat } from './models';

const routes = Router();

routes.get<any, any, Cat>('/cat', (req, res) => {
  res.json({
    name: 'Garfield',
    color: 'Orange'
  });
});

routes.post<any, any, Cat, Cat>('/cat', (req, res) => {
  const cat = req.body;
  res.status(201).json(cat);
});


export default routes;
