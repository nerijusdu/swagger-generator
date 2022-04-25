export type Animal = {
  name: string;
}

export type ColorRGB = string;
export type Color = {
  rgb?: ColorRGB;
  type?: ColorType;
  animalType?: AnimalType;
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
