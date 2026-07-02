import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export function scale(size: number): number {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size * 100) / 100;
}

export function verticalScale(size: number): number {
  return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size * 100) / 100;
}

export function moderateScale(size: number, factor = 0.5): number {
  return Math.round((size + (scale(size) - size) * factor) * 100) / 100;
}
