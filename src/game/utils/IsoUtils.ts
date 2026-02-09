import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants';

export class IsoUtils {
    /**
     * Converts Cartesian coordinates (grid x, y) to Isometric screen coordinates.
     * @param x Grid X
     * @param y Grid Y
     * @returns Phaser.Math.Vector2 Screen coordinates (center of the tile)
     */
    static cartesianToIso(x: number, y: number): Phaser.Math.Vector2 {
        const isoX = (x - y) * (TILE_WIDTH / 2);
        const isoY = (x + y) * (TILE_HEIGHT / 2);
        return new Phaser.Math.Vector2(isoX, isoY);
    }

    /**
     * Converts Screen coordinates to Grid coordinates.
     * Note: This is a rough approximation and might need refinement for precise picking.
     * @param x Screen X
     * @param y Screen Y
     * @returns Phaser.Math.Vector2 Grid coordinates
     */
    static isoToCartesian(x: number, y: number): Phaser.Math.Vector2 {
        const halfWidth = TILE_WIDTH / 2;
        const halfHeight = TILE_HEIGHT / 2;

        const gridY = (y / halfHeight - x / halfWidth) / 2;
        const gridX = (y / halfHeight + x / halfWidth) / 2;

        return new Phaser.Math.Vector2(Math.round(gridX), Math.round(gridY));
    }
}
