import md5 from 'md5';
import ts from 'typescript';

export const isSimpleType = (type: string) => ['string', 'number', 'boolean', 'integer', 'Date'].includes(type);

export const sanitizeRouteArgument = (route: ts.Expression | undefined, file: ts.SourceFile) => route
  ?.getText(file)
  ?.replace(/['"]/g, '')
  ?.replace(/:([a-zA-Z]+)/g, '{$1}');

export const sanitizeTypeName = (name: string) => name
  .replaceAll(' ', '')
  .replace(/(Pick|Omit)<(.+),(.+)>/, (_, type, base, args) => `${type}_${base}_${md5(args)}`)
  .replaceAll('<', '_')
  .replaceAll('>', '_');