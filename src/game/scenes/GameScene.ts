import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { TILE_WIDTH, TILE_HEIGHT, COLORS, CHARACTERS, OBJECTS, ROOM_MIN_X, ROOM_MAX_X, ROOM_MIN_Y, ROOM_MAX_Y } from '../constants';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { Pathfinding } from '../systems/Pathfinding';
import { CombatSystem } from '../systems/CombatSystem';
import { ContextMenu } from '../../components/ContextMenu';
import { gameEvents, EVENTS } from '../GameEventBus';
import { Spell } from '../data/Courants';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private otherPlayers: OtherPlayer[] = [];
    private obstacleSprites: Phaser.GameObjects.Sprite[] = [];
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private tileTextGroup!: Phaser.GameObjects.Group;
    private contextMenu!: ContextMenu;
    private selectedPlayer: OtherPlayer | null = null;
    private selectionIndicator!: Phaser.GameObjects.Graphics;
    private selectedSpell: Spell | null = null;

    // Room bounds tracking
    private gridMinX: number = ROOM_MIN_X;
    private gridMaxX: number = ROOM_MAX_X;
    private gridMinY: number = ROOM_MIN_Y;
    private gridMaxY: number = ROOM_MAX_Y;

    // Room objects
    private obstacles: Map<string, boolean> = new Map();
    private obstacleSpritesMap: Map<string, Phaser.GameObjects.Sprite> = new Map();

    // Optimization: track visible range to avoid re-rendering
    private lastVisibleRange: { minX: number, maxX: number, minY: number, maxY: number } | null = null;

    private activePath: { x: number, y: number }[] = [];
    private combatSystem!: CombatSystem;

    constructor() {
        super('GameScene');
    }

    create() {
        this.tileTextGroup = this.add.group();

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
        this.contextMenu = new ContextMenu(this);
        this.selectionIndicator = this.add.graphics();
        this.selectionIndicator.setDepth(0); // Draw on floor

        // Emit initial stats
        this.events.once('update', () => {
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                ap: this.player.maxAp, // Initial AP
                maxAp: this.player.maxAp,
                mp: this.player.maxMp, // Initial MP
                maxMp: this.player.maxMp,
                spells: this.player.spells
            });
        });

        // Listen for spell selection
        gameEvents.on(EVENTS.COMBAT.SPELL_SELECTED, (spellId: string | null) => {
            if (!spellId) {
                this.selectedSpell = null;
                console.log("Spell deselected");
            } else {
                this.selectedSpell = this.player.spells.find(s => s.id === spellId) || null;
                console.log("Spell selected:", this.selectedSpell?.name);
            }
        });

        // Camera - follow player with smooth lerp
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
        // Remove bounds for infinite scrolling
        this.cameras.main.removeBounds();

        // Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Hide context menu if clicking elsewhere
            this.contextMenu.hide();

            console.log('=== CLICK DETECTED ===');
            console.log('Combat active:', this.combatSystem.isActive);
            console.log('Player moving:', this.player.isMoving);

            if (this.combatSystem.isActive && this.selectedSpell) {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

                const targetEntity = this.otherPlayers.find(p => p.gridX === gridPos.x && p.gridY === gridPos.y);
                const targetParticipant = targetEntity ? (this.combatSystem.opponent?.entity === targetEntity ? this.combatSystem.opponent :
                    this.combatSystem.player?.entity === targetEntity ? this.combatSystem.player : null) : null;

                const isSelf = this.player.gridX === gridPos.x && this.player.gridY === gridPos.y;
                const finalTarget = isSelf ? this.combatSystem.player : targetParticipant;

                if (finalTarget && this.combatSystem.player) {
                    this.combatSystem.castSpell(this.selectedSpell, this.combatSystem.player, finalTarget);
                } else {
                    console.log("No valid target on tile");
                }
                return;
            }

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
                console.log('Clicked on other player! Opening menu...');

                // Select player
                this.selectedPlayer = clickedPlayer;
                this.drawSelectionIndicator();

                this.contextMenu.show(pointer.x, pointer.y, [
                    {
                        text: "Battle",
                        onClick: () => {
                            this.startCombatPrep(clickedPlayer);
                            this.clearSelection();
                        }
                    },
                    {
                        text: "Inspect",
                        onClick: () => console.log("Inspect", clickedPlayer)
                    }
                ]);
                return;
            }

            // Clear selection if clicked elsewhere
            this.clearSelection();

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
                        // Check for map transition after arrival
                        this.checkMapTransition();
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

        const count = 5;
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
    private findPath(start: { x: number, y: number }, end: { x: number, y: number }) {
        console.log(`[GameScene] Finding path from ${start.x},${start.y} to ${end.x},${end.y}`);

        // Adapting to GridNode structure required by Pathfinding
        const startNode = { x: start.x, y: start.y, walkable: true };
        const endNode = { x: end.x, y: end.y, walkable: true };

        const path = Pathfinding.findPath(
            startNode,
            endNode,
            {
                hasObstacle: (x, y) => this.hasObstacle(x, y),
                isValid: (x, y) => this.isValidTile(x, y)
            }
        );
        console.log(`[GameScene] Path found: ${path.length} nodes`);
        return path;
    }

    update() {
        // Redraw grid and obstacles based on current viewport ONLY if changed
        const visibleRange = this.getVisibleTileRange();

        if (!this.lastVisibleRange ||
            visibleRange.minX !== this.lastVisibleRange.minX ||
            visibleRange.maxX !== this.lastVisibleRange.maxX ||
            visibleRange.minY !== this.lastVisibleRange.minY ||
            visibleRange.maxY !== this.lastVisibleRange.maxY) {

            this.createGrid();
            this.createObstacles();
            this.lastVisibleRange = visibleRange;
        }

        this.drawPath();
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

        // Clear previous texts
        this.tileTextGroup.clear(true, true);

        // Get visible tile range based on camera viewport
        const visibleRange = this.getVisibleTileRange();

        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
            for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
                // Skip if outside grid bounds
                if (!this.isValidTile(x, y)) continue;

                const isoPos = IsoUtils.cartesianToIso(x, y);

                // Use full tile size to remove gaps
                const scaledWidth = TILE_WIDTH;
                const scaledHeight = TILE_HEIGHT;

                // Draw filled tile (diamond) with scaling - no gaps
                this.gridGraphics.beginPath();
                this.gridGraphics.moveTo(isoPos.x, isoPos.y - scaledHeight / 2);
                this.gridGraphics.lineTo(isoPos.x + scaledWidth / 2, isoPos.y);
                this.gridGraphics.lineTo(isoPos.x, isoPos.y + scaledHeight / 2);
                this.gridGraphics.lineTo(isoPos.x - scaledWidth / 2, isoPos.y);
                this.gridGraphics.closePath();

                // Removed fillStyle to only show text
                // this.gridGraphics.fillPath();
                this.gridGraphics.strokePath();

                // Add text
                const text = this.add.text(isoPos.x, isoPos.y, `${x},${y}`, {
                    fontSize: '10px',
                    color: '#ffffff'
                }).setOrigin(0.5);
                this.tileTextGroup.add(text);
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

    private checkMapTransition() {
        // Check if player has gone outside the current room bounds
        const playerX = this.player.gridX;
        const playerY = this.player.gridY;

        // Exit East
        if (playerX > ROOM_MAX_X) {
            console.log("Exiting EAST");
            this.switchMap('EAST');
        }
        // Exit West
        else if (playerX < ROOM_MIN_X) {
            console.log("Exiting WEST");
            this.switchMap('WEST');
        }
        // Exit South
        else if (playerY > ROOM_MAX_Y) {
            console.log("Exiting SOUTH");
            this.switchMap('SOUTH');
        }
        // Exit North
        else if (playerY < ROOM_MIN_Y) {
            console.log("Exiting NORTH");
            this.switchMap('NORTH');
        }
    }

    private switchMap(direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST') {
        console.log(`Switching map to ${direction}...`);

        // 1. Clear current entities
        // Destroy all obstacle sprites
        this.obstacleSprites.forEach(sprite => sprite.destroy());
        this.obstacleSprites = [];
        this.obstacleSpritesMap.clear();
        this.obstacles.clear();

        // Destroy all other players
        this.otherPlayers.forEach(p => p.sprite.destroy());
        this.otherPlayers = [];

        // 2. Teleport player to opposite side
        // 2. Teleport player to opposite side (on the edge, safely inside)
        switch (direction) {
            case 'EAST':
                this.player.setGridPosition(ROOM_MIN_X, this.player.gridY);
                break;
            case 'WEST':
                this.player.setGridPosition(ROOM_MAX_X, this.player.gridY);
                break;
            case 'SOUTH':
                this.player.setGridPosition(this.player.gridX, ROOM_MIN_Y);
                break;
            case 'NORTH':
                this.player.setGridPosition(this.player.gridX, ROOM_MAX_Y);
                break;
        }

        // 3. Generate new map data
        this.generateObstacles();

        // 4. Create visuals
        this.createGrid();
        this.createObstacles();

        // 5. Spawn new NPCs
        this.spawnOtherPlayers();

        // Clear paths
        this.pathGraphics.clear();
        this.activePath = [];
    }

    private resize(gameSize: Phaser.Structs.Size) {
        this.cameras.main.setSize(gameSize.width, gameSize.height);
    }



    private isValidTile(x: number, y: number): boolean {
        // Allow 1 tile buffer for map transition triggers
        return x >= this.gridMinX - 1 && x <= this.gridMaxX + 1 &&
            y >= this.gridMinY - 1 && y <= this.gridMaxY + 1;
    }

    private startCombatPrep(opponent: OtherPlayer) {
        console.log("Starting Combat Prep...");

        // 1. Calculate center point (midpoint between player and NPC)
        const midX = Math.floor((this.player.gridX + opponent.gridX) / 2);
        const midY = Math.floor((this.player.gridY + opponent.gridY) / 2);

        // 2. Define slots (10 slots each)
        // Player Team (Blue) - Left/Bottom side relative to center
        // Enemy Team (Red) - Right/Top side relative to center

        const playerSlots: { x: number, y: number }[] = [];
        const enemySlots: { x: number, y: number }[] = [];

        // Simple allocation strategy around midpoint
        // Players at (midX - 2 to midX - 4), Enemies at (midX + 2 to midX + 4)

        for (let y = midY - 2; y <= midY + 2; y++) {
            playerSlots.push({ x: midX - 2, y });
            playerSlots.push({ x: midX - 3, y });

            enemySlots.push({ x: midX + 2, y });
            enemySlots.push({ x: midX + 3, y });
        }

        // 3. Teleport main combatants to first slots if available
        if (playerSlots.length > 0) {
            const pSlot = playerSlots[0];
            // Identify valid slot (check obstacles) - simple check for now
            this.player.setGridPosition(pSlot.x, pSlot.y);
        }

        if (enemySlots.length > 0) {
            const eSlot = enemySlots[0];
            opponent.setGridPosition(eSlot.x, eSlot.y);
        }

        // 4. Start Combat
        this.combatSystem.startCombat(this.player, opponent);
    }


    private clearSelection() {
        this.selectedPlayer = null;
        this.selectionIndicator.clear();
    }

    private drawSelectionIndicator() {
        if (!this.selectedPlayer) {
            this.selectionIndicator.clear();
            return;
        }

        this.selectionIndicator.clear();

        const isoPos = IsoUtils.cartesianToIso(this.selectedPlayer.gridX, this.selectedPlayer.gridY);

        // Draw yellow ellipse under player
        this.selectionIndicator.lineStyle(2, 0xFFFF00, 1);
        this.selectionIndicator.strokeEllipse(isoPos.x, isoPos.y, TILE_WIDTH, TILE_HEIGHT / 2);

        // Optional: Add glow effect or pulse (tween) in future
    }
}
