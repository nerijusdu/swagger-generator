/* eslint-disable @typescript-eslint/ban-ts-comment */
import ts from 'typescript';
import * as fs from 'fs';
import { Swagger } from './swagger';
import { ArrayType, TypeWithTypes, RouteOperation, VariableDeclaration, TypeWithValue, ExpressionWithText } from './models/helperTypes';
import { isSimpleType, sanitizeRouteArgument } from './util';

const ROUTE_PARAMS_INDEX = 1;
const RESPONSE_INDEX = 2;
const REQUEST_INDEX = 3;
const QUERY_PARAMS_INDEX = 4;
const PARAMS_TO_SAVE = [RESPONSE_INDEX, REQUEST_INDEX];

const routesOperations: RouteOperation[] = [];
const routePrefixes = new Map<number, string[]>();
const spec: Swagger.Spec = {
  info: { title: 'api', version: '1.0.0' },
  openapi: '3.0.0',
  paths: {},
  components: { schemas: {} },
};

function main(entrypoint: string) {
  const program = ts.createProgram([entrypoint], {});
  const tc = program.getTypeChecker();
  program.getSourceFiles().forEach(file => {
    if (file.fileName.includes('node_modules')) {
      return;
    }

    file.statements.forEach(statement => {
      if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
        iterateCallExpressions(statement, file, tc);
      }
    });
  });

  addPathsToSpec();

  // console.log(JSON.stringify(spec, null, 2));
  fs.writeFileSync('./sample/openapi.json', JSON.stringify(spec, null, 2));
  console.log('Done');
}

const iterateCallExpressions = (
  node: ts.Node,
  file: ts.SourceFile,
  tc: ts.TypeChecker,
  parents: ts.Node[] = []) => {
  if (node.kind === ts.SyntaxKind.CallExpression) {
    generateSpecForRoute(node as ts.CallExpression, file, tc, parents[0]);
  }

  if (node.getChildCount(file) === 0) {
    return;
  }

  node.getChildren(file).forEach(child => {
    iterateCallExpressions(child, file, tc, [...parents, node]);
  });
};

const generateSpecForRoute = (
  node: ts.CallExpression,
  file: ts.SourceFile,
  tc: ts.TypeChecker,
  routeRootNode: ts.Node,
) => {
  const functionCallNode = node.getChildAt(0, file);
  const symbol = tc.getSymbolAtLocation(functionCallNode);
  if (!symbol) {
    console.log('no symbol', functionCallNode.getText(file));
    return;
  }

  const type = tc.getTypeOfSymbolAtLocation(symbol, functionCallNode);
  const typeName = tc.typeToString(type);
  if (!typeName.includes('IRouterMatcher')) {
    if (node.getText(file).startsWith('app.use(\'/')) {
      setRoutePrefix(typeName, node, tc, file);
    }
    return;
  }

  const route = sanitizeRouteArgument(node.arguments?.find(x => x.kind === ts.SyntaxKind.StringLiteral), file);

  if (!route) {
    throw new Error(`Failed to get route for node: ${node.getText(file)}`);
  }

  const routerNode = (functionCallNode as ts.PropertyAccessExpression).expression as ts.PropertyAccessExpression;
  const routerId = (tc.getSymbolAtLocation(routerNode)?.declarations?.[0] as VariableDeclaration).symbol.id as number;

  const schemas = node.typeArguments?.map((typeArg, index) => {
    if (typeArg.kind !== ts.SyntaxKind.TypeReference) {
      return { index, kind: typeArg.kind };
    }

    const typeRef = typeArg as ts.TypeReferenceNode;
    const typeType = tc.getTypeAtLocation(typeRef.typeName);

    return {
      index,
      kind: typeArg.kind,
      schema: createSchemaFromType(typeType, typeRef.typeName, tc, PARAMS_TO_SAVE.includes(index))
    };
  }) || [];

  const statuses = findStatusesForRoute(routeRootNode, tc, file);
  const method = symbol.name as 'get' | 'post' | 'put' | 'delete' | 'patch';
  const operation: Swagger.Operation = { responses: {} };

  const responseSchema = schemas.find(x => x.index === RESPONSE_INDEX)?.schema || { type: 'object' };
  const successStatus = statuses.find(x => x >= 200 && x < 300) || 200;
  operation.responses![successStatus] = {
    description: 'success',
    content: {
      'application/json': { schema: responseSchema },
    },
  };

  const errorStatuses = statuses.filter(x => x >= 400);
  if (errorStatuses.length) {
    errorStatuses.forEach(status => {
      operation.responses![status] = {
        description: 'error',
        content: {
          'application/json': { schema: { type: 'object' } },
        },
      };
    });
  }

  const requestSchema = schemas.find(x => x.index === REQUEST_INDEX)?.schema;
  if (requestSchema) {
    operation.requestBody = {
      content: {
        'application/json': { schema: requestSchema }
      }
    };
  }

  const routeParams = schemas.find(x => x.index === ROUTE_PARAMS_INDEX)?.schema;
  if (routeParams) {
    operation.parameters = [
      ...(operation.parameters || []),
      ...createParametersFromSchema(routeParams, 'path'),
    ];
  }
  const queryParams = schemas.find(x => x.index === QUERY_PARAMS_INDEX)?.schema;
  if (queryParams) {
    operation.parameters = [
      ...(operation.parameters || []),
      ...createParametersFromSchema(queryParams, 'query'),
    ];
  }

  routesOperations.push({ route, method, operation, routerId });
};

const setRoutePrefix = (typeName: string, node: ts.CallExpression, tc: ts.TypeChecker, file: ts.SourceFile) => {
  const isRequestHandler = typeName.startsWith('ApplicationRequestHandler');
  if (!isRequestHandler) return;

  const routePrefix = sanitizeRouteArgument(node.arguments?.find(x => x.kind === ts.SyntaxKind.StringLiteral), file);
  if (!routePrefix) return;

  const routerId = getRouterIdFromRequestHandler(node, tc);
  if (!routerId) return;

  const existingPrefixes = routePrefixes.get(routerId) || [];
  routePrefixes.set(routerId, [...existingPrefixes, routePrefix]);
};

const getRouterIdFromRequestHandler = (node: ts.CallExpression, tc: ts.TypeChecker): number | undefined => {
  const handlerIdentifier = node.arguments?.find(x => x.kind === ts.SyntaxKind.Identifier) as ts.Identifier;
  const handlerIdentifierSymbol = tc.getSymbolAtLocation(handlerIdentifier)!;
  // @ts-ignore
  const moduleSpecifierSymbol = tc.getSymbolAtLocation(handlerIdentifierSymbol.declarations![0]?.parent?.moduleSpecifier)!;
  // @ts-ignore
  const routerNode = tc.getExportsOfModule(moduleSpecifierSymbol).find(x => x.name === 'default')?.declarations?.[0].expression;
  // @ts-ignore
  const routerId = tc.getSymbolAtLocation(routerNode)?.id as number;
  return routerId;
};

const addPathsToSpec = () => {
  for (const operation of routesOperations) {
    const prefixes = routePrefixes.get(operation.routerId) || [];
    for (const prefix of prefixes) {
      const path = `${prefix}${operation.route}`;
      spec.paths![path] = {
        ...(spec.paths![path] || {}),
        [operation.method]: {
          tags: [prefix],
          ...operation.operation,
        },
      };
    }
  }
};

const createSchemaFromType = (type: ts.Type, node: ts.Node, tc: ts.TypeChecker, save?: boolean): Swagger.Schema => {
  const typeName = tc.typeToString(type);
  const isDynamicType = typeName.startsWith('{') && typeName.endsWith('}');
  const isEnum = type.flags & ts.TypeFlags.EnumLiteral || type.flags & ts.TypeFlags.Enum;

  if (isSimpleType(typeName)) {
    return { type: typeName };
  }

  if (type.symbol?.name === 'Array') {
    const arrayType = type as ArrayType;
    return {
      type: 'array',
      items: createSchemaFromType(arrayType.resolvedTypeArguments[0], node, tc, save),
    };
  }

  if (spec.components!.schemas![typeName]) {
    return { $ref: `#/components/schemas/${typeName}` };
  }

  const definition: Swagger.Schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  if (isEnum) {
    let index = 0;
    definition.enum = [];
    type.symbol.exports!.forEach((value) => {
      const declaration = value?.valueDeclaration as ts.PropertyAssignment;
      const initializer = declaration?.initializer as ExpressionWithText;
      definition.enum?.push(initializer?.text || (index++).toString());
    });
  }
  else {
    for (const property of tc.getPropertiesOfType(type)) {
      const propertyType = tc.getTypeOfSymbolAtLocation(property, node) as TypeWithTypes;
      const typeString = tc.typeToString(propertyType);
      if (!(property.getFlags() & ts.SymbolFlags.Optional) && !typeString.includes('undefined')) {
        definition.required!.push(property.name);
      }

      if (typeString.includes('|')) {
        const types = propertyType.types;
        definition.properties![property.name] = {
          oneOf: types.map(x => {
            const propertyTypeName = tc.typeToString(x);
            if (isSimpleType(propertyTypeName)) {
              return { type: propertyTypeName };
            }

            return createSchemaFromType(x, node, tc, save);
          }),
        };
        continue;
      }

      definition.properties![property.name] = createSchemaFromType(propertyType, node, tc, save);
    }
  }

  definition.required = definition.required?.length ? definition.required : undefined;

  if (save && !isDynamicType) {
    spec.components!.schemas![typeName] = definition;
  }

  return isDynamicType || !save
    ? definition
    : { $ref: `#/components/schemas/${typeName}` };
};

const createParametersFromSchema = (schema: Swagger.Schema, location: 'path' | 'query') : Swagger.Parameter[] => {
  const properties = schema?.properties || {};
  const params: Swagger.Parameter[] = [];

  for (const propertyName in properties) {
    const param: Swagger.Parameter = {
      name: propertyName,
      in: location,
      schema: properties[propertyName],
    };

    if (schema?.required?.includes(propertyName)) {
      param.required = true;
    }

    params.push(param);
  }

  return params;
};

const findStatusesForRoute = (node: ts.Node, tc: ts.TypeChecker, file: ts.SourceFile, statuses: number[] = []): number[] => {
  const symbol = tc.getSymbolAtLocation(node);
  if (symbol) {
    const type = tc.getTypeOfSymbolAtLocation(symbol, node);
    if (['status', 'sendStatus'].includes(type.symbol?.name)) {
      // @ts-ignore
      const status = node.parent?.arguments?.[0]?.getText(file);
      return status ? [...statuses, Number(status)] : statuses;
    }
  }

  if (node.getChildCount(file) === 0) {
    return statuses;
  }

  return node
    .getChildren(file)
    .reduce((acc, child) => [...acc, ...findStatusesForRoute(child, tc, file)], [] as number[]);
};

main('./sample/app.ts');
