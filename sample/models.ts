export type Animal = {
  name: string;
}

export type ColorRGB = string;
export type Color = {
  rgb?: ColorRGB;
  type?: ColorType;
  animalType?: AnimalType;
  values?: ColorValues;
  number?: NumberedEnum;
}
export type ColorValues = 'red' | 'green' | 'blue' | number;
export enum ColorType {
  RGB = 'rgb',
  HEX = 'hex',
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

export type Cat = Animal & {
  color: string | number | ColorRGB | Color;
  dog?: Dog;
  siblings?: Animal[];
  nesterd?: {
    nestedProp: string;
    nestedProp2?: string;
  };
  joined?: { joinedProp: string } & Animal;
  // TODO: handle props below
  // generic?: PaginatedList<Animal>;
  // pick?: Pick<Color, 'number' | 'animalType'>;
}

export type PaginatedList<T> = {
  items: T[];
  count: number;
}

export type Dog = Animal & {
  height: number;
  color: Color;
}
