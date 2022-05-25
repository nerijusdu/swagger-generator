import { Router } from 'express';

const routes = Router();

type routeparams = {
  param: string;
  another: string;
}

routes.get<any, routeparams>('/:another', (req, res) => {
  res.json({
    name: 'Garfield',
    color: { rgb: '#ff0000' },
    height: 10
  });
});

export default routes;