import * as ts from 'typescript';
import { Swagger } from './swagger';

// TODO:
// [X] handle request body type
// [X] handle response type
// [X] move types to definitions
// [ ] handle query params
// [ ] handle path params
// [ ] handle response status
// [X] handle multiple types (oneOf)
// [X] handle arrays
// [ ] Type in a type without a name e.g. type T = { a: { b: string } }

// Bugs:
// [ ] app.get can't find symbol

const TS_COMPILER_OPTIONS = {
  allowNonTsExtensions: true,
};
const ROUTE_PARAMS_INDEX = 1;
const RESPONSE_INDEX = 2;
const REQUEST_INDEX = 3;
const QUERY_PARAMS_INDEX = 4;

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

const isArray = (type: string) => {
  return type.startsWith('Array<') || type.endsWith('[]');
}

type ArrayType = ts.Type & {
  resolvedTypeArguments: ts.Type[];
}

const createDefinitionFromType = (type: ts.Type, node: ts.Node, tc: ts.TypeChecker, save?: boolean): Swagger.Schema => {
  const typeName = tc.typeToString(type);

  if (isSimpleType(typeName)) {
    return {
      type: typeName,
    };
  }

  if (type.symbol?.name === 'Array') {
    const arrayType = type as ArrayType;
    console.log(typeName, tc.typeToString(arrayType.resolvedTypeArguments[0]));
    return {
      type: 'array',
      items: createDefinitionFromType(arrayType.resolvedTypeArguments[0], node, tc, save),
    };
  };

  if (spec.components!.schemas![typeName]) {
    // return spec.components!.schemas![typeName];
    return { $ref: `#/components/schemas/${typeName}` };
  }

  let definition: Swagger.Schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const property of tc.getPropertiesOfType(type)) {
    const propertyType = tc.getTypeOfSymbolAtLocation(property, node);
    const typeString = tc.typeToString(propertyType);
    if (!(property.getFlags() & ts.SymbolFlags.Optional) && !typeString.includes('undefined')) {
      definition.required!.push(property.name);
    }

    if (typeString.includes('|')) {
      // @ts-ignore
      const types = propertyType.types as ts.Type[];
      definition.properties![property.name] = {
        oneOf: types.map(x => {
          const propertyTypeName = tc.typeToString(x);
          if (isSimpleType(propertyTypeName)) {
            return { type: propertyTypeName };
          }

          return createDefinitionFromType(x, node, tc, save);
        }),
      };
      continue;
    }

    definition.properties![property.name] = createDefinitionFromType(propertyType, node, tc, save);
  }

  definition.required = definition.required?.length ? definition.required : undefined;

  if (save) {
    spec.components!.schemas![typeName] = definition;
  }

  return { $ref: `#/components/schemas/${typeName}` };
}

const generateSpecForNode = (node: ts.Node, file: ts.SourceFile, tc: ts.TypeChecker) => {
  // console.log(node.getText(file), node.kind);
  if (node.kind === ts.SyntaxKind.CallExpression) {
    const prop = node as ts.CallExpression;
    const functionCallNode = prop.getChildAt(0, file);
    const symbol = tc.getSymbolAtLocation(functionCallNode)!;
    if (!symbol) {
      console.log('no symbol', functionCallNode.getText(file));
      return;
    }

    const type = tc.getTypeOfSymbolAtLocation(symbol, functionCallNode);

    if (type.symbol && type.symbol.name === 'IRouterMatcher') {
      const route = prop.arguments.find(x => x.kind === ts.SyntaxKind.StringLiteral)?.getText(file)?.replace(/['"]/g, '');

      const schemas = prop.typeArguments?.map((typeArg, index) => {
        if (typeArg.kind !== ts.SyntaxKind.TypeReference) {
          return { index, kind: typeArg.kind };
        }

        const typeRef = typeArg as ts.TypeReferenceNode;
        const typeType = tc.getTypeAtLocation(typeRef.typeName);


        return {
          index,
          kind: typeArg.kind,
          schema: createDefinitionFromType(typeType, typeRef.typeName, tc, true)
        };
      }) || [];

      const method = symbol.name as 'get' | 'post' | 'put' | 'delete' | 'patch';
      const operation: Swagger.Operation = {
        responses: {
          200: {
            description: 'success',
            content: {
              'application/json': {
                schema: schemas.find(x => x.index === RESPONSE_INDEX)?.schema,
              }
            }
          }
        }
      };
      const requestSchema = schemas.find(x => x.index === REQUEST_INDEX)?.schema;
      if (requestSchema) {
        operation.requestBody = {
          content: {
            'application/json': {
              schema: requestSchema,
            }
          }
        };
      }

      if (!route) {
        throw new Error('Failed to get route');
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
    generateSpecForNode(child, file, tc);
  });
};

main('./sample/app.ts');
