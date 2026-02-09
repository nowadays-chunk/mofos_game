import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { CourantType, Spell, getSpellsForCourant } from '../data/Courants';

export class Player {
    scene: Phaser.Scene;
    sprite: Phaser.GameObjects.Sprite; // Changing to Sprite to support animations if needed, or Image for now
    gridX: number;
    gridY: number;
    isMoving: boolean = false;
    courant: CourantType;
    spells: Spell[];
    characterType: string;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType?: string) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        // Use provided character type or default to Bloody_Alchemist_1
        this.characterType = characterType || 'Bloody_Alchemist_1';

        // Assign random Courant
        const keys = Object.values(CourantType);
        this.courant = keys[Math.floor(Math.random() * keys.length)];
        this.spells = getSpellsForCourant(this.courant).map(s => ({
            ...s,
            // Map descriptions from our big list
            description: s.description
        }));

        console.log(`Player assigned to ${this.courant} with ${this.spells.length} spells. Character: ${this.characterType}`);

        const isoPos = IsoUtils.cartesianToIso(x, y);

        // Use the first frame of the idle animation
        this.sprite = scene.add.sprite(isoPos.x, isoPos.y, `${this.characterType}_idle_0`);
        this.sprite.setOrigin(0.5, 1); // Anchor at bottom center
        this.sprite.setDepth(isoPos.y); // Depth sorting

        // Scale to fit tile (1.25x tile width)
        const visualTargetWidth = 64 * 1.25;
        const scaleFactor = visualTargetWidth / this.sprite.width;
        this.sprite.setScale(scaleFactor);

        // Play idle animation
        try {
            this.sprite.play(`${this.characterType}_idle`);
        } catch (error) {
            console.error(`Failed to play animation for ${this.characterType}:`, error);
        }
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
                y: isoPos.y,
                duration: 200,
                onStart: () => {
                    // Store previous position BEFORE updating
                    const prevGridX = this.gridX;
                    const prevGridY = this.gridY;

                    // Update grid position
                    this.gridX = node.x;
                    this.gridY = node.y;
                    this.sprite.setDepth(this.sprite.y);

                    // Flip sprite based on direction using PREVIOUS position
                    const prevIso = IsoUtils.cartesianToIso(prevGridX, prevGridY);
                    const newIso = IsoUtils.cartesianToIso(node.x, node.y);

                    if (newIso.x > prevIso.x) {
                        this.sprite.setFlipX(false); // Face Right
                    } else if (newIso.x < prevIso.x) {
                        this.sprite.setFlipX(true); // Face Left
                    }

                    // Play run animation
                    if (this.sprite.anims.currentAnim?.key !== `${this.characterType}_run`) {
                        this.sprite.play(`${this.characterType}_run`, true);
                    }

                    if (onStepComplete) onStepComplete();
                },
                onUpdate: () => {
                    this.sprite.setDepth(this.sprite.y);
                }
            });
        });

        this.isMoving = true;
        console.log('[Player] Starting movement, isMoving = true');

        this.scene.tweens.chain({
            tweens: tweens,
            onComplete: () => {
                this.isMoving = false;
                console.log('[Player] Movement complete, isMoving = false');
                this.sprite.play(`${this.characterType}_idle`);
                if (onPathComplete) onPathComplete();
            }
        });
    }
}
