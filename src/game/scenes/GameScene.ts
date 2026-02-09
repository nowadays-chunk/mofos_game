import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT, COLORS } from '../constants';
import { Player } from '../entities/Player';
import { Pathfinding } from '../systems/Pathfinding';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private debugText!: Phaser.GameObjects.Text;
    private obstacles: boolean[][];
    private activePath: { x: number, y: number }[] = [];

    constructor() {
        super('GameScene');
        this.obstacles = [];
    }

    create() {
        this.add.image(400, 300, 'sky').setScrollFactor(0).setDisplaySize(window.innerWidth, window.innerHeight);

        this.generateObstacles();
        this.createGrid();

        // Spawn Player at 0,0 (ensure no obstacle there)
        this.obstacles[0][0] = false;
        this.player = new Player(this, 0, 0);

        // Camera
        // Center of the diamond shape.
        // Map top: 0, 0
        // Map right: +x, +y
        // The iso tiles spread out.
        // Let's center on the middle tile.
        const centerIso = IsoUtils.cartesianToIso(MAP_WIDTH / 2, MAP_HEIGHT / 2);
        this.cameras.main.centerOn(centerIso.x, centerIso.y);
        // this.cameras.main.startFollow(this.player.sprite);
        this.cameras.main.setZoom(1);

        // Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

            console.log(`Input: Screen(${pointer.x}, ${pointer.y}), World(${worldPoint.x}, ${worldPoint.y}), Grid(${gridPos.x}, ${gridPos.y})`);

            if (this.isValidTile(gridPos.x, gridPos.y)) {
                if (this.obstacles[gridPos.x][gridPos.y]) {
                    console.log("Clicked on obstacle.");
                    return;
                }

                console.log(`Finding path from (${this.player.gridX}, ${this.player.gridY}) to (${gridPos.x}, ${gridPos.y})`);

                const path = Pathfinding.findPath(
                    { x: this.player.gridX, y: this.player.gridY, walkable: true },
                    { x: gridPos.x, y: gridPos.y, walkable: true },
                    this.obstacles
                );

                console.log(`Path found: length ${path.length}`);

                if (path.length > 0) {
                    // Remove first node (current position)
                    path.shift();
                    this.activePath = path; // Save for drawing

                    console.log("Moving along path...");
                    this.player.moveAlongPath(path, () => {
                        // On step complete, remove first node from activePath
                        if (this.activePath.length > 0) this.activePath.shift();
                    }, () => {
                        console.log("Path complete.");
                        // Check transition after arrival
                        this.checkMapTransition(path.length > 0 ? path[path.length - 1] : { x: this.player.gridX, y: this.player.gridY });
                    });
                } else {
                    console.log("No path found.");
                }
            } else {
                console.log("Invalid tile clicked.");
            }
        });

        this.scale.on('resize', this.resize, this);

        // Path graphics
        this.pathGraphics = this.add.graphics();

        // Add some text
        this.add.text(16, 16, 'Mofos Game v0.2', {
            fontSize: '18px',
            color: '#ffffff'
        }).setScrollFactor(0);

        this.debugText = this.add.text(16, 48, '', {
            fontSize: '16px',
            color: '#ffff00',
            backgroundColor: '#000000'
        }).setScrollFactor(0);
    }

    update() {
        this.drawPath();

        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        this.debugText.setText([
            `Mouse Screen: ${Math.round(pointer.x)}, ${Math.round(pointer.y)}`,
            `Mouse World: ${Math.round(worldPoint.x)}, ${Math.round(worldPoint.y)}`,
            `Mouse Grid: ${gridPos.x}, ${gridPos.y}`,
            `Player Grid: ${this.player.gridX}, ${this.player.gridY}`
        ]);
    }

    private generateObstacles() {
        this.obstacles = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            this.obstacles[x] = [];
            for (let y = 0; y < MAP_HEIGHT; y++) {
                // 20% chance of obstacle
                this.obstacles[x][y] = Math.random() < 0.2;
            }
        }
        // Ensure start is clear
        this.obstacles[0][0] = false;
    }

    private createGrid() {
        if (this.gridGraphics) this.gridGraphics.destroy();
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, COLORS.GRID_STROKE, 0.5);

        for (let x = 0; x < MAP_WIDTH; x++) {
            for (let y = 0; y < MAP_HEIGHT; y++) {
                const isoPos = IsoUtils.cartesianToIso(x, y);

                // Color based on obstacle
                if (this.obstacles[x][y]) {
                    this.gridGraphics.fillStyle(COLORS.TILE_OBSTACLE, 1);
                } else {
                    this.gridGraphics.fillStyle(COLORS.TILE_DEFAULT, 0.1);
                }

                // Draw tile outline (diamond)
                this.gridGraphics.beginPath();
                this.gridGraphics.moveTo(isoPos.x, isoPos.y - TILE_HEIGHT / 2);
                this.gridGraphics.lineTo(isoPos.x + TILE_WIDTH / 2, isoPos.y);
                this.gridGraphics.lineTo(isoPos.x, isoPos.y + TILE_HEIGHT / 2);
                this.gridGraphics.lineTo(isoPos.x - TILE_WIDTH / 2, isoPos.y);
                this.gridGraphics.closePath();

                this.gridGraphics.fillPath();
                this.gridGraphics.strokePath();
            }
        }
    }

    private drawPath() {
        this.pathGraphics.clear();
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        if (this.isValidTile(gridPos.x, gridPos.y) && !this.obstacles[gridPos.x][gridPos.y]) {
            const path = Pathfinding.findPath(
                { x: this.player.gridX, y: this.player.gridY, walkable: true },
                { x: gridPos.x, y: gridPos.y, walkable: true },
                this.obstacles
            );

            if (path.length > 0) {
                this.pathGraphics.lineStyle(2, COLORS.PATH_HIGHLIGHT, 1);

                const startIso = IsoUtils.cartesianToIso(this.player.gridX, this.player.gridY);
                this.pathGraphics.moveTo(startIso.x, startIso.y);

                for (const node of path) {
                    const isoPos = IsoUtils.cartesianToIso(node.x, node.y);
                    this.pathGraphics.lineTo(isoPos.x, isoPos.y);
                }
                this.pathGraphics.strokePath();
            }
        }
    }

    private checkMapTransition(lastNode: { x: number, y: number }) {
        // Only trigger if destination is on edge
        let newPlayerPos = { x: -1, y: -1 };

        if (lastNode.x === 0) { // North edge -> Go to South of new map
            newPlayerPos = { x: MAP_WIDTH - 1, y: lastNode.y };
            this.switchMap(newPlayerPos);
        } else if (lastNode.x === MAP_WIDTH - 1) { // South edge -> Go North
            newPlayerPos = { x: 0, y: lastNode.y };
            this.switchMap(newPlayerPos);
        } else if (lastNode.y === 0) { // East edge -> Go West
            newPlayerPos = { x: lastNode.x, y: MAP_HEIGHT - 1 };
            this.switchMap(newPlayerPos);
        } else if (lastNode.y === MAP_HEIGHT - 1) { // West edge -> Go East
            newPlayerPos = { x: lastNode.x, y: 0 };
            this.switchMap(newPlayerPos);
        }
    }

    private switchMap(startPos: { x: number, y: number }) {
        console.log("Switching map...");
        // Regenerate obstacles
        this.generateObstacles();
        // Clear start pos
        this.obstacles[startPos.x][startPos.y] = false;

        // Redraw grid
        this.createGrid();

        // Move player instantly
        this.player.gridX = startPos.x;
        this.player.gridY = startPos.y;
        const isoPos = IsoUtils.cartesianToIso(startPos.x, startPos.y);
        this.player.sprite.setPosition(isoPos.x, isoPos.y - TILE_HEIGHT / 2);
    }

    private resize(gameSize: Phaser.Structs.Size) {
        this.cameras.main.setSize(gameSize.width, gameSize.height);
    }

    private isValidTile(x: number, y: number): boolean {
        return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
    }
}
