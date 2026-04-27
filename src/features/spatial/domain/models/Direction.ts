export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];
