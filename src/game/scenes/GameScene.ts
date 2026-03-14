import Phaser from 'phaser';
import { ContextMenu } from '../../components/ContextMenu';
import { Spell } from '../data/Courants';
import { Player } from '../entities/Player';
import { OtherPlayer } from '../entities/OtherPlayer';
import { gameEvents, EVENTS } from '../GameEventBus';
import { COLORS, CHARACTERS, OBJECTS, ROOM_MAX_X, ROOM_MAX_Y, ROOM_MIN_X, ROOM_MIN_Y, TILE_HEIGHT, TILE_WIDTH } from '../constants';
import { CombatSystem } from '../systems/CombatSystem';
import { Pathfinding } from '../systems/Pathfinding';
import { GridPoint } from '../types';
import { IsoUtils } from '../utils/IsoUtils';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private otherPlayers: OtherPlayer[] = [];
    private obstacleSprites: Phaser.GameObjects.Sprite[] = [];
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private battleOverlayGraphics!: Phaser.GameObjects.Graphics;
    private tileTextGroup!: Phaser.GameObjects.Group;
    private contextMenu!: ContextMenu;
    private selectedPlayer: OtherPlayer | null = null;
    private selectionIndicator!: Phaser.GameObjects.Graphics;
    private selectedSpell: Spell | null = null;
    private gridMinX = ROOM_MIN_X;
    private gridMaxX = ROOM_MAX_X;
    private gridMinY = ROOM_MIN_Y;
    private gridMaxY = ROOM_MAX_Y;
    private obstacles: Map<string, boolean> = new Map();
    private obstacleSpritesMap: Map<string, Phaser.GameObjects.Sprite> = new Map();
    private lastVisibleRange: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
    private combatSystem!: CombatSystem;

    constructor() {
        super('GameScene');
    }

    create() {
        this.tileTextGroup = this.add.group();
        this.generateObstacles();
        this.createGrid();
        this.createObstacles();

        this.setObstacle(0, 0, false);
        this.player = new Player(this, 0, 0, 'Bloody_Alchemist_1');
        this.spawnOtherPlayers();

        this.combatSystem = new CombatSystem(this, {
            isCellBlocked: (x, y, ignoreFighterIds = []) => this.hasObstacle(x, y) || this.isCombatCellOccupied(x, y, ignoreFighterIds),
            isCellInBounds: (x, y) => this.isValidTile(x, y)
        });

        this.contextMenu = new ContextMenu(this);
        this.selectionIndicator = this.add.graphics();
        this.selectionIndicator.setDepth(0);
        this.pathGraphics = this.add.graphics();
        this.battleOverlayGraphics = this.add.graphics();

        this.events.once('update', () => {
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                ap: this.player.maxAp,
                maxAp: this.player.maxAp,
                mp: this.player.maxMp,
                maxMp: this.player.maxMp,
                spells: this.player.spells,
                initiative: this.player.initiative,
                statuses: []
            });
        });

        gameEvents.on(EVENTS.COMBAT.SPELL_SELECTED, (spellId: string | null) => {
            this.selectedSpell = spellId ? this.player.spells.find((spell) => spell.id === spellId) ?? null : null;
        });

        gameEvents.on(EVENTS.COMBAT.END_TURN_REQUESTED, () => {
            if (this.combatSystem.isPlayersTurn()) {
                this.selectedSpell = null;
                gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, null);
                this.combatSystem.endTurn();
            }
        });

        gameEvents.on(EVENTS.COMBAT.ENDED, () => {
            this.handleCombatEnded();
        });

        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
        this.cameras.main.removeBounds();

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.contextMenu.visible && this.contextMenu.containsScreenPoint(pointer.x, pointer.y)) {
                this.contextMenu.activateScreenPoint(pointer.x, pointer.y);
                return;
            }

            this.contextMenu.hide();

            if (this.combatSystem.isActive) {
                void this.handleCombatPointerDown(pointer);
                return;
            }

            this.handleExplorationPointerDown(pointer);
        });

        this.scale.on('resize', this.resize, this);
    }

    update() {
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

    private async handleCombatPointerDown(pointer: Phaser.Input.Pointer) {
        if (!this.combatSystem.isPlayersTurn() || this.player.isMoving) {
            return;
        }

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);
        const targetCell = { x: gridPos.x, y: gridPos.y };

        if (!this.isValidTile(targetCell.x, targetCell.y) || this.hasObstacle(targetCell.x, targetCell.y)) {
            return;
        }

        if (this.selectedSpell) {
            const result = this.combatSystem.castSpell(this.selectedSpell, targetCell);
            if (!result.valid && result.reason) {
                console.log(result.reason);
            }
            return;
        }

        const occupant = this.combatSystem.getFighterAtCell(targetCell.x, targetCell.y);
        if (occupant && occupant.id !== this.player.id) {
            return;
        }

        const path = this.findPath(
            { x: this.player.gridX, y: this.player.gridY },
            targetCell,
            { allowDiagonals: false, includeCombatants: true, ignoreFighterIds: [this.player.id], maxDistance: this.player.mp }
        );

        if (path.length <= 1) {
            return;
        }

        const result = await this.combatSystem.moveActiveFighter(path.slice(1));
        if (!result.valid && result.reason) {
            console.log(result.reason);
        }
    }

    private handleExplorationPointerDown(pointer: Phaser.Input.Pointer) {
        if (this.player.isMoving) {
            return;
        }

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        const clickedPlayer = this.otherPlayers.find((otherPlayer) => otherPlayer.gridX === gridPos.x && otherPlayer.gridY === gridPos.y);
        if (clickedPlayer) {
            this.selectedPlayer = clickedPlayer;
            this.drawSelectionIndicator();
            this.contextMenu.show(pointer.x, pointer.y, [
                {
                    text: 'Battle',
                    onClick: () => {
                        this.startCombatPrep(clickedPlayer);
                        this.clearSelection();
                    }
                },
                {
                    text: 'Inspect',
                    onClick: () => console.log('Inspect', clickedPlayer.name)
                }
            ]);
            return;
        }

        this.clearSelection();

        if (!this.isValidTile(gridPos.x, gridPos.y) || this.hasObstacle(gridPos.x, gridPos.y)) {
            return;
        }

        const path = this.findPath(
            { x: this.player.gridX, y: this.player.gridY },
            { x: gridPos.x, y: gridPos.y },
            { allowDiagonals: true }
        );

        if (path.length <= 1) {
            return;
        }

        this.player.moveAlongPath(path.slice(1), undefined, () => {
            this.checkMapTransition();
        });
    }

    private startCombatPrep(primaryTarget: OtherPlayer) {
        const enemies = this.getBattleOpponents(primaryTarget);
        const midpoint = {
            x: Math.floor((this.player.gridX + primaryTarget.gridX) / 2),
            y: Math.floor((this.player.gridY + primaryTarget.gridY) / 2)
        };
        const occupied = new Set<string>();
        const playerSlots = this.findBattleSlots(midpoint, 'player', 1, occupied);
        const enemySlots = this.findBattleSlots(midpoint, 'enemy', enemies.length, occupied);

        this.selectedSpell = null;
        gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, null);

        this.combatSystem.startCombat([
            {
                id: this.player.id,
                name: this.player.name,
                team: 'player',
                entity: this.player,
                spells: this.player.spells,
                initiative: this.player.initiative,
                startPosition: playerSlots[0] ?? { x: this.player.gridX, y: this.player.gridY },
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                maxAp: this.player.maxAp,
                maxMp: this.player.maxMp
            },
            ...enemies.map((enemy, index) => ({
                id: enemy.id,
                name: enemy.name,
                team: 'enemy' as const,
                entity: enemy,
                spells: enemy.spells,
                initiative: enemy.initiative,
                startPosition: enemySlots[index] ?? { x: enemy.gridX, y: enemy.gridY },
                hp: enemy.hp,
                maxHp: enemy.maxHp,
                maxAp: enemy.maxAp,
                maxMp: enemy.maxMp
            }))
        ]);
    }

    private getBattleOpponents(primaryTarget: OtherPlayer): OtherPlayer[] {
        const nearbyOpponents = this.otherPlayers
            .filter((enemy) => enemy.id !== primaryTarget.id)
            .sort((left, right) => {
                const leftDistance = Math.abs(left.gridX - primaryTarget.gridX) + Math.abs(left.gridY - primaryTarget.gridY);
                const rightDistance = Math.abs(right.gridX - primaryTarget.gridX) + Math.abs(right.gridY - primaryTarget.gridY);
                return leftDistance - rightDistance;
            })
            .filter((enemy) => Math.abs(enemy.gridX - primaryTarget.gridX) + Math.abs(enemy.gridY - primaryTarget.gridY) <= 6)
            .slice(0, 2);

        return [primaryTarget, ...nearbyOpponents];
    }

    private findBattleSlots(center: GridPoint, team: 'player' | 'enemy', count: number, occupied: Set<string>): GridPoint[] {
        const slots: GridPoint[] = [];
        for (let radius = 0; radius <= 6 && slots.length < count; radius++) {
            for (let x = center.x - radius - 4; x <= center.x + radius + 4 && slots.length < count; x++) {
                for (let y = center.y - radius - 4; y <= center.y + radius + 4 && slots.length < count; y++) {
                    const isPreferredSide = team === 'player' ? x <= center.x - 1 : x >= center.x + 1;
                    const key = `${x},${y}`;
                    if (!isPreferredSide || occupied.has(key) || !this.isValidTile(x, y) || this.hasObstacle(x, y) || this.isWorldCellOccupied(x, y)) {
                        continue;
                    }

                    if (Math.abs(x - center.x) + Math.abs(y - center.y) > radius + 4) {
                        continue;
                    }

                    occupied.add(key);
                    slots.push({ x, y });
                }
            }
        }

        return slots;
    }

    private handleCombatEnded() {
        this.selectedSpell = null;
        gameEvents.emit(EVENTS.COMBAT.SPELL_SELECTED, null);

        const defeatedEnemyIds = new Set(
            this.combatSystem.getLivingFighters('enemy').length === 0
                ? this.otherPlayers.filter((enemy) => enemy.hp <= 0).map((enemy) => enemy.id)
                : []
        );

        if (this.player.hp <= 0) {
            this.player.hp = this.player.maxHp;
            this.player.ap = this.player.maxAp;
            this.player.mp = this.player.maxMp;
            this.player.setGridPosition(0, 0);
            gameEvents.emit(EVENTS.PLAYER.STATS_CHANGED, {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                ap: this.player.ap,
                maxAp: this.player.maxAp,
                mp: this.player.mp,
                maxMp: this.player.maxMp,
                initiative: this.player.initiative,
                spells: this.player.spells,
                statuses: []
            });
        }

        if (defeatedEnemyIds.size > 0) {
            this.otherPlayers = this.otherPlayers.filter((enemy) => {
                if (!defeatedEnemyIds.has(enemy.id)) {
                    enemy.ap = enemy.maxAp;
                    enemy.mp = enemy.maxMp;
                    enemy.sprite.setAlpha(1);
                    return true;
                }

                enemy.sprite.destroy();
                return false;
            });
        } else {
            this.otherPlayers.forEach((enemy) => {
                enemy.ap = enemy.maxAp;
                enemy.mp = enemy.maxMp;
                enemy.sprite.setAlpha(1);
            });
        }
    }

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
        this.otherPlayers.forEach((otherPlayer) => otherPlayer.sprite.destroy());
        this.otherPlayers = [];

        const count = 5;
        for (let i = 0; i < count; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const spawnRadius = 50;
                const tx = Phaser.Math.Between(
                    Math.max(this.gridMinX, this.player.gridX - spawnRadius),
                    Math.min(this.gridMaxX, this.player.gridX + spawnRadius)
                );
                const ty = Phaser.Math.Between(
                    Math.max(this.gridMinY, this.player.gridY - spawnRadius),
                    Math.min(this.gridMaxY, this.player.gridY + spawnRadius)
                );

                if (!this.isValidTile(tx, ty) || this.hasObstacle(tx, ty) || this.isWorldCellOccupied(tx, ty)) {
                    attempts += 1;
                    continue;
                }

                const characterType = CHARACTERS[Phaser.Math.Between(0, CHARACTERS.length - 1)];
                this.otherPlayers.push(new OtherPlayer(this, tx, ty, characterType));
                placed = true;
            }
        }
    }

    private findPath(
        start: GridPoint,
        end: GridPoint,
        options: { allowDiagonals: boolean; includeCombatants?: boolean; ignoreFighterIds?: string[]; maxDistance?: number }
    ) {
        return Pathfinding.findPath(
            { x: start.x, y: start.y, walkable: true },
            { x: end.x, y: end.y, walkable: true },
            {
                hasObstacle: (x, y) => {
                    if (this.hasObstacle(x, y)) {
                        return true;
                    }

                    if (options.includeCombatants) {
                        return this.isCombatCellOccupied(x, y, options.ignoreFighterIds ?? []);
                    }

                    return false;
                },
                isValid: (x, y) => this.isValidTile(x, y)
            },
            {
                allowDiagonals: options.allowDiagonals,
                maxDistance: options.maxDistance
            }
        );
    }

    private drawPath() {
        this.pathGraphics.clear();
        this.battleOverlayGraphics.clear();

        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const hoveredCell = IsoUtils.isoToCartesian(worldPoint.x, worldPoint.y);

        if (this.combatSystem.isActive) {
            this.drawBattleOverlay({ x: hoveredCell.x, y: hoveredCell.y });
            return;
        }

        if (!this.isValidTile(hoveredCell.x, hoveredCell.y) || this.hasObstacle(hoveredCell.x, hoveredCell.y)) {
            return;
        }

        const path = this.findPath(
            { x: this.player.gridX, y: this.player.gridY },
            { x: hoveredCell.x, y: hoveredCell.y },
            { allowDiagonals: true }
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

    private drawBattleOverlay(hoveredCell: GridPoint) {
        if (!this.combatSystem.isPlayersTurn()) {
            return;
        }

        const activeFighter = this.combatSystem.getCurrentTurnParticipant();
        if (!activeFighter) {
            return;
        }

        this.combatSystem.getReachableCells(activeFighter.id).forEach((cell) => {
            this.drawTileHighlight(this.battleOverlayGraphics, cell, 0x3182ce, 0.18);
        });

        if (this.selectedSpell) {
            this.combatSystem.getCastableCells(activeFighter.id, this.selectedSpell).forEach((cell) => {
                this.drawTileOutline(this.battleOverlayGraphics, cell, 0xf6ad55, 0.65);
            });

            this.combatSystem.getAffectedCells(activeFighter.id, this.selectedSpell, hoveredCell).forEach((cell) => {
                this.drawTileHighlight(this.battleOverlayGraphics, cell, 0xe53e3e, 0.28);
            });
            return;
        }

        if (!this.isValidTile(hoveredCell.x, hoveredCell.y) || this.hasObstacle(hoveredCell.x, hoveredCell.y) || this.isCombatCellOccupied(hoveredCell.x, hoveredCell.y, [this.player.id])) {
            return;
        }

        const path = this.findPath(
            { x: this.player.gridX, y: this.player.gridY },
            hoveredCell,
            { allowDiagonals: false, includeCombatants: true, ignoreFighterIds: [this.player.id], maxDistance: this.player.mp }
        );
        if (path.length > 1) {
            this.pathGraphics.lineStyle(3, 0x68d391, 0.95);
            const startIso = IsoUtils.cartesianToIso(this.player.gridX, this.player.gridY);
            this.pathGraphics.moveTo(startIso.x, startIso.y);
            for (const node of path) {
                const isoPos = IsoUtils.cartesianToIso(node.x, node.y);
                this.pathGraphics.lineTo(isoPos.x, isoPos.y);
            }
            this.pathGraphics.strokePath();
        }
    }

    private drawTileHighlight(graphics: Phaser.GameObjects.Graphics, cell: GridPoint, color: number, alpha: number) {
        const isoPos = IsoUtils.cartesianToIso(cell.x, cell.y);
        graphics.fillStyle(color, alpha);
        graphics.beginPath();
        graphics.moveTo(isoPos.x, isoPos.y - TILE_HEIGHT / 2);
        graphics.lineTo(isoPos.x + TILE_WIDTH / 2, isoPos.y);
        graphics.lineTo(isoPos.x, isoPos.y + TILE_HEIGHT / 2);
        graphics.lineTo(isoPos.x - TILE_WIDTH / 2, isoPos.y);
        graphics.closePath();
        graphics.fillPath();
    }

    private drawTileOutline(graphics: Phaser.GameObjects.Graphics, cell: GridPoint, color: number, alpha: number) {
        const isoPos = IsoUtils.cartesianToIso(cell.x, cell.y);
        graphics.lineStyle(2, color, alpha);
        graphics.beginPath();
        graphics.moveTo(isoPos.x, isoPos.y - TILE_HEIGHT / 2);
        graphics.lineTo(isoPos.x + TILE_WIDTH / 2, isoPos.y);
        graphics.lineTo(isoPos.x, isoPos.y + TILE_HEIGHT / 2);
        graphics.lineTo(isoPos.x - TILE_WIDTH / 2, isoPos.y);
        graphics.closePath();
        graphics.strokePath();
    }

    private generateObstacles() {
        for (let x = this.gridMinX; x <= this.gridMaxX; x++) {
            for (let y = this.gridMinY; y <= this.gridMaxY; y++) {
                if (this.obstacles.has(this.getObstacleKey(x, y))) {
                    continue;
                }
                this.setObstacle(x, y, Math.random() < 0.2);
            }
        }
        this.setObstacle(0, 0, false);
    }

    private createGrid() {
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
        }
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(0.5, COLORS.GRID_STROKE, 0.3);
        this.tileTextGroup.clear(true, true);

        const visibleRange = this.getVisibleTileRange();
        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
            for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
                if (!this.isValidTile(x, y)) {
                    continue;
                }

                const isoPos = IsoUtils.cartesianToIso(x, y);
                this.gridGraphics.beginPath();
                this.gridGraphics.moveTo(isoPos.x, isoPos.y - TILE_HEIGHT / 2);
                this.gridGraphics.lineTo(isoPos.x + TILE_WIDTH / 2, isoPos.y);
                this.gridGraphics.lineTo(isoPos.x, isoPos.y + TILE_HEIGHT / 2);
                this.gridGraphics.lineTo(isoPos.x - TILE_WIDTH / 2, isoPos.y);
                this.gridGraphics.closePath();
                this.gridGraphics.strokePath();

                const text = this.add.text(isoPos.x, isoPos.y, `${x},${y}`, {
                    fontSize: '10px',
                    color: '#ffffff'
                }).setOrigin(0.5);
                this.tileTextGroup.add(text);
            }
        }
    }

    private getVisibleTileRange() {
        const worldView = this.cameras.main.worldView;
        const buffer = 30;
        const topLeft = IsoUtils.isoToCartesian(worldView.left, worldView.top);
        const topRight = IsoUtils.isoToCartesian(worldView.right, worldView.top);
        const bottomLeft = IsoUtils.isoToCartesian(worldView.left, worldView.bottom);
        const bottomRight = IsoUtils.isoToCartesian(worldView.right, worldView.bottom);

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
        const visibleRange = this.getVisibleTileRange();
        for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
            for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
                const key = this.getObstacleKey(x, y);
                if (!this.hasObstacle(x, y) || this.obstacleSpritesMap.has(key)) {
                    continue;
                }

                const isoPos = IsoUtils.cartesianToIso(x, y);
                const categories = ['ROCKS', 'CRYSTALS', 'BUSHES'] as const;
                const category = categories[Phaser.Math.Between(0, categories.length - 1)];
                const files = OBJECTS[category].files;
                const file = files[Phaser.Math.Between(0, files.length - 1)];
                const spriteKey = category === 'ROCKS'
                    ? `rock_${file.split('.')[0]}`
                    : category === 'CRYSTALS'
                        ? `crystal_${file.split('.')[0]}`
                        : `bush_${file.split('.')[0]}`;

                const sprite = this.add.sprite(isoPos.x, isoPos.y, spriteKey);
                sprite.setOrigin(0.5, 1);
                sprite.setDepth(isoPos.y);
                if (sprite.width > TILE_WIDTH * 1.5) {
                    sprite.setScale((TILE_WIDTH * 1.5) / sprite.width);
                }

                this.obstacleSprites.push(sprite);
                this.obstacleSpritesMap.set(key, sprite);
            }
        }
    }

    private checkMapTransition() {
        const playerX = this.player.gridX;
        const playerY = this.player.gridY;

        if (playerX > ROOM_MAX_X) {
            this.switchMap('EAST');
        } else if (playerX < ROOM_MIN_X) {
            this.switchMap('WEST');
        } else if (playerY > ROOM_MAX_Y) {
            this.switchMap('SOUTH');
        } else if (playerY < ROOM_MIN_Y) {
            this.switchMap('NORTH');
        }
    }

    private switchMap(direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST') {
        this.obstacleSprites.forEach((sprite) => sprite.destroy());
        this.obstacleSprites = [];
        this.obstacleSpritesMap.clear();
        this.obstacles.clear();

        this.otherPlayers.forEach((otherPlayer) => otherPlayer.sprite.destroy());
        this.otherPlayers = [];

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

        this.generateObstacles();
        this.createGrid();
        this.createObstacles();
        this.spawnOtherPlayers();
        this.pathGraphics.clear();
        this.battleOverlayGraphics.clear();
    }

    private resize(gameSize: Phaser.Structs.Size) {
        this.cameras.main.setSize(gameSize.width, gameSize.height);
    }

    private isValidTile(x: number, y: number): boolean {
        return x >= this.gridMinX - 1 && x <= this.gridMaxX + 1 && y >= this.gridMinY - 1 && y <= this.gridMaxY + 1;
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
        this.selectionIndicator.lineStyle(2, 0xffff00, 1);
        this.selectionIndicator.strokeEllipse(isoPos.x, isoPos.y, TILE_WIDTH, TILE_HEIGHT / 2);
    }

    private isWorldCellOccupied(x: number, y: number): boolean {
        if (this.player.gridX === x && this.player.gridY === y) {
            return true;
        }

        return this.otherPlayers.some((otherPlayer) => otherPlayer.gridX === x && otherPlayer.gridY === y);
    }

    private isCombatCellOccupied(x: number, y: number, ignoreFighterIds: string[] = []): boolean {
        const fighter = this.combatSystem?.getFighterAtCell(x, y);
        return fighter ? !ignoreFighterIds.includes(fighter.id) : false;
    }
}
