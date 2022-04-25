import ts from 'typescript';
import { Swagger } from '../swagger';

export type ArrayType = ts.Type & { resolvedTypeArguments: ts.Type[]; }

export type TypeWithTypes = ts.Type & { types: ts.Type[] };

export type TypeWithValue<T> = ts.Type & { value: T };

export type ExpressionWithText = ts.Expression & { text: string };

export type VariableDeclaration = ts.Declaration & { symbol: ts.Symbol & { id: number }; };

export type RouteOperation = {
  route: string;
  method: string;
  operation: Swagger.Operation;
  routerId: number;
}

export type RoutePrefix = {
  value: string;
  parentRouterId?: number;
}