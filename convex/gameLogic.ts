export type Mark = "X" | "O";

const SIZE = 4;

export function coordinates(cell: number) {
  return { x: cell % SIZE, y: Math.floor(cell / SIZE) % SIZE, z: Math.floor(cell / (SIZE * SIZE)) };
}

export function cellIndex(x: number, y: number, z: number) {
  return z * SIZE * SIZE + y * SIZE + x;
}

export const WINNING_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const firstNonZero = [dx, dy, dz].find((value) => value !== 0);
        if (firstNonZero !== 1) continue;
        for (let x = 0; x < SIZE; x += 1) {
          for (let y = 0; y < SIZE; y += 1) {
            for (let z = 0; z < SIZE; z += 1) {
              const previous = [x - dx, y - dy, z - dz];
              if (previous.every((value) => value >= 0 && value < SIZE)) continue;
              const line = Array.from({ length: SIZE }, (_, step) => [
                x + dx * step,
                y + dy * step,
                z + dz * step,
              ]);
              if (line.every((point) => point.every((value) => value >= 0 && value < SIZE))) {
                lines.push(line.map(([px, py, pz]) => cellIndex(px, py, pz)));
              }
            }
          }
        }
      }
    }
  }
  return lines;
})();

export function findWinningLine(board: Map<number, Mark>, mark: Mark) {
  return WINNING_LINES.find((line) => line.every((cell) => board.get(cell) === mark)) ?? null;
}
