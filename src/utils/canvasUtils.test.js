import { getPointsBetweenTwoCoordinates } from './canvasUtils';

describe('CanvasUtils', () => {
  test('getPointsBetweenTwoCoordinates 1', () => {
    const points = getPointsBetweenTwoCoordinates(39, 59, 42, 56);
    // should return pixel perfect coordinates
    expect(points).toEqual([
      [39, 59],
      [40, 58],
      [41, 57],
      [42, 56],
    ]);
  });

  test('getPointsBetweenTwoCoordinates 2', () => {
    const points = getPointsBetweenTwoCoordinates(57, 55, 54, 46);
    // should return pixel perfect coordinates
    expect(points).toEqual([
      [57, 55],
      [56, 54],
      [55, 53],
      [54, 52],
      [54, 51],
      [54, 50],
      [54, 49],
      [54, 48],
      [54, 47],
      [54, 46],
    ]);
  });
});