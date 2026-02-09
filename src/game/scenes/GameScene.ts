import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT, COLORS, CHARACTERS, OBJECTS, TILE_SCALE_CENTER, TILE_SCALE_EDGE, setMapDimensions } from '../constants';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { Pathfinding } from '../systems/Pathfinding';
import { CombatSystem } from '../systems/CombatSystem';
import { CombatUI } from '../../components/CombatUI';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private otherPlayers: OtherPlayer[] = [];
    private obstacleSprites: Phaser.GameObjects.Sprite[] = [];
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private debugText!: Phaser.GameObjects.Text;

    // Infinite map system - sparse data structure
    private obstacles: Map<string, boolean> = new Map();
    private obstacleSpritesMap: Map<string, Phaser.GameObjects.Sprite> = new Map();

    // Grid bounds tracking
    private gridMinX: number = -500;
    private gridMaxX: number = 500;
    private gridMinY: number = -500;
    private gridMaxY: number = 500;

    private activePath: { x: number, y: number }[] = [];
    private combatSystem!: CombatSystem;
    private combatUI!: CombatUI;

    constructor() {
        super('GameScene');
    }

    create() {
        this.add.image(400, 300, 'sky').setScrollFactor(0).setDisplaySize(window.innerWidth, window.innerHeight);

        // Generate initial 1000x1000 grid centered at origin
        this.generateObstacles();
        this.createGrid();
        this.createObstacles();

        // Spawn Player at 0,0 (ensure no obstacle there)
        this.setObstacle(0, 0, false);
        this.player = new Player(this, 0, 0, 'Bloody_Alchemist_1');

        this.spawnOtherPlayers();

        // Initialize combat system
        this.combatSystem = new CombatSystem(this);
        this.combatUI = new CombatUI(this);

        // Combat event listeners
        this.events.on('combat-start', (data: any) => {
            this.combatUI.show(data.player, data.opponent);
        });

        this.events.on('spell-selected', (spell: any) => {
            if (this.combatSystem.currentTurn === 'player' && this.combatSystem.player && this.combatSystem.opponent) {
                this.combatSystem.castSpell(spell, this.combatSystem.player, this.combatSystem.opponent);
                if (this.combatSystem.player && this.combatSystem.opponent) {
                    this.combatUI.update(this.combatSystem.player, this.combatSystem.opponent, this.combatSystem.currentTurn);
                }
            }
        });

        this.events.on('end-turn', () => {
            this.combatSystem.endTurn();
        });

        this.events.on('turn-change', () => {
            if (this.combatSystem.player && this.combatSystem.opponent) {
                this.combatUI.update(this.combatSystem.player, this.combatSystem.opponent, this.combatSystem.currentTurn);
            }
        });

        this.events.on('combat-end', (winner: string) => {
            this.combatUI.hide();
            console.log(`Combat ended! Winner: ${winner}`);
        });

        // Camera - follow player with smooth lerp
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
        // Remove bounds for infinite scrolling
        this.cameras.main.removeBounds();

        // Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            console.log('=== CLICK DETECTED ===');
            console.log('Combat active:', this.combatSystem.isActive);
            console.log('Player moving:', this.player.isMoving);

            // Don't process clicks if combat is active
            if (this.combatSystem.isActive) {
                console.log('Combat is active, ignoring movement click');
                return;
            }

            // Don't process clicks if player is already moving
            if (this.player.isMoving) {
                console.log('Player is already moving, ignoring click');
                return;
            }

            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

            // Check if clicked on other player
            const clickedPlayer = this.otherPlayers.find(p => p.gridX === gridPos.x && p.gridY === gridPos.y);
            if (clickedPlayer) {
                console.log('Clicked on other player! Starting combat...');
                this.combatSystem.startCombat(this.player, clickedPlayer);
                return;
            }

            console.log(`Input: Screen(${pointer.x}, ${pointer.y}), World(${worldPoint.x}, ${worldPoint.y}), Grid(${gridPos.x}, ${gridPos.y})`);

            if (this.isValidTile(gridPos.x, gridPos.y)) {
                if (this.hasObstacle(gridPos.x, gridPos.y)) {
                    console.log("Clicked on obstacle.");
                    return;
                }

                console.log(`Finding path from (${this.player.gridX}, ${this.player.gridY}) to (${gridPos.x}, ${gridPos.y})`);

                const path = this.findPath(
                    { x: this.player.gridX, y: this.player.gridY },
                    { x: gridPos.x, y: gridPos.y }
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
                        // Check for map expansion after arrival
                        this.checkMapExpansion();
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
        this.add.text(16, 16, 'Mofos Game v0.3 - Infinite Map', {
            fontSize: '18px',
            color: '#ffffff'
        }).setScrollFactor(0);

        this.debugText = this.add.text(16, 48, '', {
            fontSize: '16px',
            color: '#ffff00',
            backgroundColor: '#000000'
        }).setScrollFactor(0);
    }

    // Helper methods for sparse obstacle storage
    private getObstacleKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    private hasObstacle(x: number, y: number): boolean {
        return this.obstacles.get(this.getObstacleKey(x, y)) || false;
    }

    private setObstacle(x: number, y: number, value: boolean) {
        this.obstacles.set(this.getObstacleKey(x, y), value);
    }

    private spawnOtherPlayers() {
        // Clear existing
        this.otherPlayers.forEach(p => p.sprite.destroy());
        this.otherPlayers = [];

        const count = Phaser.Math.Between(1, 5);
        for (let i = 0; i < count; i++) {
            let placed = false;
            let themeAttempts = 0;
            while (!placed && themeAttempts < 50) {
                // Spawn within visible grid bounds (smaller area around player)
                const spawnRadius = 50;
                const tx = Phaser.Math.Between(
                    Math.max(this.gridMinX, this.player.gridX - spawnRadius),
                    Math.min(this.gridMaxX, this.player.gridX + spawnRadius)
                );
                const ty = Phaser.Math.Between(
                    Math.max(this.gridMinY, this.player.gridY - spawnRadius),
                    Math.min(this.gridMaxY, this.player.gridY + spawnRadius)
                );

                // Check invalid or obstacle
                if (!this.isValidTile(tx, ty) || this.hasObstacle(tx, ty)) {
                    themeAttempts++;
                    continue;
                }

                // Check player collision
                if (tx === this.player.gridX && ty === this.player.gridY) {
                    themeAttempts++;
                    continue;
                }

                // Check other players collision
                if (this.otherPlayers.some(p => p.gridX === tx && p.gridY === ty)) {
                    themeAttempts++;
                    continue;
                }

                // Pick random character
                const charType = CHARACTERS[Phaser.Math.Between(0, CHARACTERS.length - 1)];

                this.otherPlayers.push(new OtherPlayer(this, tx, ty, charType));
                placed = true;
            }
        }
    }
    update() {
        // Redraw grid and obstacles based on current viewport
        this.createGrid();
        this.createObstacles();

        this.drawPath();

        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        this.debugText.setText([
            `Mouse Screen: ${Math.round(pointer.x)}, ${Math.round(pointer.y)}`,
            `Mouse World: ${Math.round(worldPoint.x)}, ${Math.round(worldPoint.y)}`,
            `Mouse Grid: ${gridPos.x}, ${gridPos.y}`,
            `Player Grid: ${this.player.gridX}, ${this.player.gridY}`,
            `Grid Bounds: X[${this.gridMinX}, ${this.gridMaxX}], Y[${this.gridMinY}, ${this.gridMaxY}]`
        ]);
    }

    private generateObstacles() {
        // Generate obstacles for current grid bounds
        for (let x = this.gridMinX; x <= this.gridMaxX; x++) {
            for (let y = this.gridMinY; y <= this.gridMaxY; y++) {
                // Skip if already generated
                if (this.obstacles.has(this.getObstacleKey(x, y))) continue;

                // 20% chance of obstacle
                this.setObstacle(x, y, Math.random() < 0.2);
            }
        }
        // Ensure start is clear
        this.setObstacle(0, 0, false);
    }

    private createGrid() {
        if (this.gridGraphics) this.gridGraphics.destroy();
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(0.5, COLORS.GRID_STROKE, 0.3);

        // Get visible tile range based on camera viewport
        const visibleRange = this.getVisibleTileRange();

        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
            for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
                // Skip if outside grid bounds
                if (!this.isValidTile(x, y)) continue;

                const isoPos = IsoUtils.cartesianToIso(x, y);

                // Get scale for this tile based on distance from center
                const scale = this.getTileScale(x, y);

                // Scaled tile dimensions
                const scaledWidth = TILE_WIDTH * scale;
                const scaledHeight = TILE_HEIGHT * scale;

                // Default tile color - fade opacity based on scale
                this.gridGraphics.fillStyle(COLORS.TILE_DEFAULT, 0.15 * scale);

                // Draw filled tile (diamond) with scaling - no gaps
                this.gridGraphics.beginPath();
                this.gridGraphics.moveTo(isoPos.x, isoPos.y - scaledHeight / 2);
                this.gridGraphics.lineTo(isoPos.x + scaledWidth / 2, isoPos.y);
                this.gridGraphics.lineTo(isoPos.x, isoPos.y + scaledHeight / 2);
                this.gridGraphics.lineTo(isoPos.x - scaledWidth / 2, isoPos.y);
                this.gridGraphics.closePath();

                this.gridGraphics.fillPath();
                this.gridGraphics.strokePath();
            }
        }
    }

    private getVisibleTileRange() {
        const camera = this.cameras.main;
        const worldView = camera.worldView;

        // Convert viewport corners to grid coordinates with larger buffer to fill screen
        const buffer = 30; // Increased buffer to show more cells

        // Get all four corners of the viewport
        const topLeft = IsoUtils.isoToCartesian(worldView.left, worldView.top);
        const topRight = IsoUtils.isoToCartesian(worldView.right, worldView.top);
        const bottomLeft = IsoUtils.isoToCartesian(worldView.left, worldView.bottom);
        const bottomRight = IsoUtils.isoToCartesian(worldView.right, worldView.bottom);

        // Find the min/max across all corners
        const minX = Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) - buffer;
        const maxX = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) + buffer;
        const minY = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) - buffer;
        const maxY = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) + buffer;

        return {
            minX: Math.max(this.gridMinX, minX),
            maxX: Math.min(this.gridMaxX, maxX),
            minY: Math.max(this.gridMinY, minY),
            maxY: Math.min(this.gridMaxY, maxY)
        };
    }

    private createObstacles() {
        // Only create/update obstacles in visible range
        const visibleRange = this.getVisibleTileRange();

        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
            for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
                const key = this.getObstacleKey(x, y);

                // Skip if no obstacle or already has sprite
                if (!this.hasObstacle(x, y)) continue;
                if (this.obstacleSpritesMap.has(key)) continue;

                const isoPos = IsoUtils.cartesianToIso(x, y);

                // Pick random object category
                const categories = ['ROCKS', 'CRYSTALS', 'BUSHES'];
                const category = categories[Phaser.Math.Between(0, categories.length - 1)];

                // Pick random file from category
                // @ts-ignore
                const files = OBJECTS[category].files;
                const file = files[Phaser.Math.Between(0, files.length - 1)];
                const spriteKey = category === 'ROCKS' ? `rock_${file.split('.')[0]}` :
                    category === 'CRYSTALS' ? `crystal_${file.split('.')[0]}` :
                        `bush_${file.split('.')[0]}`;

                const sprite = this.add.sprite(isoPos.x, isoPos.y, spriteKey);
                sprite.setOrigin(0.5, 1);
                sprite.setDepth(isoPos.y);

                // Scale down if too big
                if (sprite.width > TILE_WIDTH * 1.5) {
                    sprite.setScale((TILE_WIDTH * 1.5) / sprite.width);
                }

                this.obstacleSprites.push(sprite);
                this.obstacleSpritesMap.set(key, sprite);
            }
        }
    }

    private drawPath() {
        this.pathGraphics.clear();
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        if (this.isValidTile(gridPos.x, gridPos.y) && !this.hasObstacle(gridPos.x, gridPos.y)) {
            const path = this.findPath(
                { x: this.player.gridX, y: this.player.gridY },
                { x: gridPos.x, y: gridPos.y }
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

    private checkMapExpansion() {
        const playerX = this.player.gridX;
        const playerY = this.player.gridY;

        // Check distance from origin (0, 0) in each direction
        const distanceFromOriginX = Math.abs(playerX);
        const distanceFromOriginY = Math.abs(playerY);

        // Use EXPANSION_TRIGGER_DISTANCE from constants (800 cells)
        const { EXPANSION_TRIGGER_DISTANCE } = require('../constants');

        // Check if we need to expand in any direction
        if (distanceFromOriginX >= EXPANSION_TRIGGER_DISTANCE) {
            const direction = playerX > 0 ? 'EAST' : 'WEST';
            console.log(`Player reached expansion threshold! Expanding map to ${direction}`);
            this.expandMap(direction);
        } else if (distanceFromOriginY >= EXPANSION_TRIGGER_DISTANCE) {
            const direction = playerY > 0 ? 'SOUTH' : 'NORTH';
            console.log(`Player reached expansion threshold! Expanding map to ${direction}`);
            this.expandMap(direction);
        }
    }

    private expandMap(direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST') {
        const { GRID_SIZE } = require('../constants');

        console.log(`Expanding map to ${direction}...`);

        // Extend grid bounds in the specified direction
        switch (direction) {
            case 'NORTH':
                this.gridMinY -= GRID_SIZE;
                break;
            case 'SOUTH':
                this.gridMaxY += GRID_SIZE;
                break;
            case 'EAST':
                this.gridMaxX += GRID_SIZE;
                break;
            case 'WEST':
                this.gridMinX -= GRID_SIZE;
                break;
        }

        console.log(`New grid bounds: X[${this.gridMinX}, ${this.gridMaxX}], Y[${this.gridMinY}, ${this.gridMaxY}]`);

        // Generate obstacles for the new section
        this.generateObstacles();

        // Redraw grid and obstacles (will use viewport culling)
        this.createGrid();
        this.createObstacles();

        // Spawn new NPCs in the expanded area
        this.spawnOtherPlayers();
    }

    private resize(gameSize: Phaser.Structs.Size) {
        this.cameras.main.setSize(gameSize.width, gameSize.height);
    }

    private getTileScale(x: number, y: number): number {
        // Calculate distance from center of the map
        const centerX = MAP_WIDTH / 2;
        const centerY = MAP_HEIGHT / 2;

        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Maximum distance is from center to corner
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

        // Normalize distance (0 at center, 1 at corners)
        const normalizedDistance = Math.min(distance / maxDistance, 1);

        // Interpolate between center scale and edge scale
        return TILE_SCALE_CENTER - (TILE_SCALE_CENTER - TILE_SCALE_EDGE) * normalizedDistance;
    }

    private isValidTile(x: number, y: number): boolean {
        return x >= this.gridMinX && x <= this.gridMaxX && y >= this.gridMinY && y <= this.gridMaxY;
    }

    // Custom pathfinding wrapper for sparse obstacle storage
    private findPath(start: { x: number, y: number }, end: { x: number, y: number }): { x: number, y: number }[] {
        return Pathfinding.findPath(
            { x: start.x, y: start.y, walkable: true },
            { x: end.x, y: end.y, walkable: true },
            {
                hasObstacle: (x: number, y: number) => this.hasObstacle(x, y),
                isValid: (x: number, y: number) => this.isValidTile(x, y)
            } as any
        );
    }
}
