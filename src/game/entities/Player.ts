import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { TILE_HEIGHT } from '../constants';

export class Player {
    scene: Phaser.Scene;
    sprite: Phaser.GameObjects.Sprite; // Changing to Sprite to support animations if needed, or Image for now
    gridX: number;
    gridY: number;
    isMoving: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        const isoPos = IsoUtils.cartesianToIso(x, y);

        // Placeholder graphic: a red circle/ball
        // We'll use the 'red' particle texture we loaded in BootScene for now, or just a circle
        this.sprite = scene.add.sprite(isoPos.x, isoPos.y - TILE_HEIGHT / 2, 'red');
        this.sprite.setOrigin(0.5, 1); // Anchor at bottom center
        this.sprite.setDepth(isoPos.y); // Depth sorting
    }

    moveAlongPath(path: { x: number, y: number }[], onStepComplete?: () => void, onPathComplete?: () => void) {
        if (path.length === 0) return;

        // Stop any existing tweens
        this.scene.tweens.killTweensOf(this.sprite);

        const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

        path.forEach(node => {
            const isoPos = IsoUtils.cartesianToIso(node.x, node.y);

            tweens.push({
                targets: this.sprite,
                x: isoPos.x,
                y: isoPos.y - TILE_HEIGHT / 2,
                duration: 200,
                onStart: () => {
                    this.gridX = node.x;
                    this.gridY = node.y;
                    this.sprite.setDepth(this.sprite.y + TILE_HEIGHT / 2);
                    if (onStepComplete) onStepComplete();
                },
                onUpdate: () => {
                    this.sprite.setDepth(this.sprite.y + TILE_HEIGHT / 2);
                }
            });
        });

        this.isMoving = true;

        this.scene.tweens.chain({
            tweens: tweens,
            onComplete: () => {
                this.isMoving = false;
                if (onPathComplete) onPathComplete();
            }
        });
    }
}
