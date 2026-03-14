import { GridNode, PathfindingOptions } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

// Support both array-based and sparse obstacle storage
type ObstacleStorage = boolean[][] | {
    hasObstacle: (x: number, y: number) => boolean;
    isValid: (x: number, y: number) => boolean;
};

export class Pathfinding {
    static findPath(start: GridNode, end: GridNode, obstacles: ObstacleStorage, options: PathfindingOptions = {}): GridNode[] {
        const openSet: GridNode[] = [start];
        const closedSet = new Set<string>();

        const cameFrom = new Map<string, GridNode>();

        const gScore = new Map<string, number>();
        gScore.set(`${start.x},${start.y}`, 0);

        const fScore = new Map<string, number>();
        fScore.set(`${start.x},${start.y}`, this.heuristic(start, end));

        while (openSet.length > 0) {
            // Get node with lowest fScore
            let current = openSet[0];
            let lowestF = fScore.get(`${current.x},${current.y}`) || Infinity;

            for (let i = 1; i < openSet.length; i++) {
                const score = fScore.get(`${openSet[i].x},${openSet[i].y}`) || Infinity;
                if (score < lowestF) {
                    lowestF = score;
                    current = openSet[i];
                }
            }

            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            // Remove current from openSet
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(`${current.x},${current.y}`);

            const neighbors = this.getNeighbors(current, obstacles, options);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeGScore = (gScore.get(`${current.x},${current.y}`) || 0) + 1;
                if (options.maxDistance !== undefined && tentativeGScore > options.maxDistance) {
                    continue;
                }

                if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
            }
        }

        return []; // No path found
    }

    private static heuristic(a: GridNode, b: GridNode): number {
        // Manhattan distance for grid
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private static getNeighbors(node: GridNode, obstacles: ObstacleStorage, options: PathfindingOptions): GridNode[] {
        const neighbors: GridNode[] = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 } // Left
        ];
        const diagonalDirections = [
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: -1, y: -1 }
        ];

        if (options.allowDiagonals) {
            directions.push(...diagonalDirections);
        }

        for (const dir of directions) {
            const x = node.x + dir.x;
            const y = node.y + dir.y;

            // Check if using sparse storage or array
            if (Array.isArray(obstacles)) {
                // Legacy array-based check
                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    if (!obstacles[x] || !obstacles[x][y]) {
                        neighbors.push({ x, y, walkable: true });
                    }
                }
            } else {
                // Sparse storage check
                if (obstacles.isValid(x, y) && !obstacles.hasObstacle(x, y)) {
                    neighbors.push({ x, y, walkable: true });
                }
            }
        }

        return neighbors;
    }

    private static reconstructPath(cameFrom: Map<string, GridNode>, current: GridNode): GridNode[] {
        const totalPath = [current];
        while (cameFrom.has(`${current.x},${current.y}`)) {
            current = cameFrom.get(`${current.x},${current.y}`)!;
            totalPath.unshift(current);
        }
        return totalPath;
    }
}
