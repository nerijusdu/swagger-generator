import ts from 'typescript';
import { Swagger } from '../swagger';

export type ArrayType = ts.Type & { resolvedTypeArguments: ts.Type[]; }

export type PropertyType = ts.Type & { types: ts.Type[] };

export type VariableDeclaration = ts.Declaration & { symbol: ts.Symbol & { id: number }; };

export type RouteOperation = {
  route: string;
  method: string;
  operation: Swagger.Operation;
  routerId: number;
}