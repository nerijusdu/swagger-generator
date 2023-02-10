import { Router } from 'express';
import dogRoutes from './dogRoutes';
import { Cat, ColorRGB, Dog, PaginatedList } from './models';

const routes = Router();

type CatRouteParams = {
  catId: string;
}

type CatQueryParams = {
  limit?: number;
  color?: ColorRGB;
}

routes.get<any, CatRouteParams, Cat, any, CatQueryParams>('/cat/:catId', (req, res) => {
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
});

routes.post<any, any, Cat, Cat>('/cat', (req, res) => {
  const cat = req.body;
  res.status(201).json(cat);
});

routes.get<any, any, { id: number}, any>('/cated', (req, res) => {
  res.json({id: 1});
});

routes.get<any, any, PaginatedList<Dog>>('/paginated/cat', (req, res) => {
  res.json({ items: [], count: 0});
});

routes.use('/doggos', dogRoutes);


export default routes;
