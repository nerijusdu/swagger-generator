export type Animal = {
  name: string;
}

export type ColorRGB = string;
export type Color = {
  rgb?: ColorRGB;
  type?: ColorType;
  animalType?: AnimalType;
  values?: 'red' | 'green' | 'blue';
  number?: NumberedEnum;
}
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
}

export type Dog = Animal & {
  height: number;
  color: Color;
}
