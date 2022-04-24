import { Router } from 'express';
import { Cat } from './models';

const routes = Router();

type CatRouteParams = {
  catId: string;
}

routes.get<any, CatRouteParams, Cat>('/cat/:catId', (req, res) => {
  if (req.params.catId === '1') {
    res.sendStatus(404);
  }
  if (req.params.catId === '2') {
    res.status(403).send();
  }

  res.json({
    name: 'Garfield',
    color: 'Orange'
  });
});

routes.get('/cats', (req, res) => {
  res.json([
    {
      name: 'Garfield',
      color: 'Orange'
    },
    {
      name: 'Tom',
      color: 'Black'
    }
  ]);
})

routes.post<any, any, Cat, Cat>('/cat', (req, res) => {
  const cat = req.body;
  res.status(201).json(cat);
});


export default routes;
