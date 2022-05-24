import ts from 'typescript';

export const isSimpleType = (type: string) => ['string', 'number', 'boolean', 'integer', 'Date'].includes(type);

export const sanitizeRouteArgument = (route: ts.Expression | undefined, file: ts.SourceFile) => route
  ?.getText(file)
  ?.replace(/['"]/g, '')
  ?.replace(/:([a-zA-Z]+)/g, '{$1}');

export const sanitizeTypeName = (name: string) => name
  .replaceAll(' ', '')
  .replaceAll('|', '_')
  .replaceAll('"', '')
  .replaceAll('\\\'', '')
  .replaceAll(',', '_')
  .replaceAll('<', '_')
  .replaceAll('>', '_');