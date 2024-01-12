export type Animal = {
  name: string;
}

export type ColorRGB = string;
export type Color = {
  rgb?: ColorRGB;
  type?: ColorType;
  variant?: ColorVariant;
  animalType?: AnimalType;
  values?: ColorValues;
  number?: NumberedEnum;
}
export type ColorValues = 'red' | 'green' | 'blue' | number;
export enum ColorType {
  RGB = 'rgb',
  HEX = 'hex',
}
export enum ColorVariant {
  variant1 = 'variant1',
}
export enum AnimalType {
  CAT,
  DOG,
  FISH,
}
export enum NumberedEnum {
  ONE = 1,
  TWO = 2,
}
export type NumberedEnumUnion = NumberedEnum.ONE | NumberedEnum.TWO;

export type Cat = Animal & {
  color: string | number | ColorRGB | Color;
  dog?: Dog;
  siblings?: Animal[];
  nesterd?: {
    nestedProp: string;
    nestedProp2?: string;
  };
  joined?: { joinedProp: string } & Animal;
  generic?: PaginatedList<Animal>;
  pick?: Pick<Color, 'number' | 'animalType'>;
  omit?: Omit<Color, 'number' | 'animalType' | 'values'>;
  bool?: boolean;
}

export type PaginatedList<T> = {
  items: T[];
  count: number;
}

export type Dog = Animal & {
  height: number;
  color: Color;
  enumUnion: NumberedEnumUnion;
}
