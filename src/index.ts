import * as ts from 'typescript';
import { Swagger } from './swagger';

// TODO:
// [X] handle request body type
// [X] handle response type
// [X] move types to definitions
// [ ] handle query params
// [ ] handle path params
// [X] handle response status
// [X] handle multiple types (oneOf)
// [X] handle arrays
// [X] Type in a type without a name e.g. type T = { a: { b: string } }
// [ ] handle nested routes e.g. app.use('/api', router);

// Bugs:
// [ ] app.get can't find symbol

const TS_COMPILER_OPTIONS = {
  allowNonTsExtensions: true,
};
const ROUTE_PARAMS_INDEX = 1;
const RESPONSE_INDEX = 2;
const REQUEST_INDEX = 3;
const QUERY_PARAMS_INDEX = 4;
const PARAMS_TO_SAVE = [RESPONSE_INDEX, REQUEST_INDEX];

function parse(fileName: string): ts.Program {
  return ts.createProgram([fileName], TS_COMPILER_OPTIONS);
}


function main(entrypoint: string) {
  const program = parse(entrypoint);
  const tc = program.getTypeChecker()
  program.getSourceFiles().forEach(file => {
    if (file.fileName.includes('node_modules')) {
      return;
    }
    console.log(file.fileName, file.statements.length);

    file.statements.forEach(statement => {
      if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
        generateSpecForNode(statement, file, tc);
      }
    });
  });
  console.log(JSON.stringify(spec, null, 2));
}

const spec: Swagger.Spec = {
  info: {
    title: 'api',
    version: '1.0.0',
  },
  openapi: '3.0.0',
  paths: {},
  components: {
    schemas: {},
  }
}

const isSimpleType = (type: string) => {
  return ['string', 'number', 'boolean', 'integer'].includes(type);
}

type ArrayType = ts.Type & { resolvedTypeArguments: ts.Type[]; }
type PropertyType = ts.Type & { types: ts.Type[] };

const createSchemaFromType = (type: ts.Type, node: ts.Node, tc: ts.TypeChecker, save?: boolean): Swagger.Schema => {
  const typeName = tc.typeToString(type);
  const isDynamicType = typeName.startsWith("{") && typeName.endsWith("}");

  if (isSimpleType(typeName)) {
    return { type: typeName };
  }

  if (type.symbol?.name === 'Array') {
    const arrayType = type as ArrayType;
    return {
      type: 'array',
      items: createSchemaFromType(arrayType.resolvedTypeArguments[0], node, tc, save),
    };
  };

  if (spec.components!.schemas![typeName]) {
    return { $ref: `#/components/schemas/${typeName}` };
  }

  let definition: Swagger.Schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const property of tc.getPropertiesOfType(type)) {
    const propertyType = tc.getTypeOfSymbolAtLocation(property, node) as PropertyType;
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

  definition.required = definition.required?.length ? definition.required : undefined;

  if (save && !isDynamicType) {
    spec.components!.schemas![typeName] = definition;
  }

  return isDynamicType
    ? definition
    : { $ref: `#/components/schemas/${typeName}` };
}

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

const generateSpecForNode = (node: ts.Node, file: ts.SourceFile, tc: ts.TypeChecker, parents: ts.Node[] = []) => {
  if (node.kind === ts.SyntaxKind.CallExpression) {
    const prop = node as ts.CallExpression;
    const functionCallNode = prop.getChildAt(0, file);
    const symbol = tc.getSymbolAtLocation(functionCallNode);
    if (!symbol) {
      console.log('no symbol', functionCallNode.getText(file));
      return;
    }

    const type = tc.getTypeOfSymbolAtLocation(symbol, functionCallNode);

    if (type.symbol?.name === 'IRouterMatcher') {
      const route = prop.arguments.find(x => x.kind === ts.SyntaxKind.StringLiteral)?.getText(file)?.replace(/['"]/g, '');

      if (!route) {
        throw new Error('Failed to get route');
      }

      const schemas = prop.typeArguments?.map((typeArg, index) => {
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

      const statuses = findStatusesForRoute(parents[0], tc, file);
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

      spec.paths[route] = {
        ...(spec.paths[route] || {}),
        [method]: operation,
      };
    }
  }

  if (node.getChildCount(file) === 0) {
    return;
  }

  node.getChildren(file).forEach(child => {
    generateSpecForNode(child, file, tc, [...parents, node]);
  });
};

main('./sample/app.ts');
