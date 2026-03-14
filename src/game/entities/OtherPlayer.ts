import Phaser from 'phaser';
import { IsoUtils } from '../utils/IsoUtils';
import { CourantType, Spell, getSpellsForCourant } from '../data/Courants';

export class OtherPlayer {
    id: string;
    scene: Phaser.Scene;
    sprite: Phaser.GameObjects.Sprite;
    name: string;
    gridX: number;
    gridY: number;
    isMoving: boolean = false;
    courant: CourantType;
    spells: Spell[];
    characterType: string;
    initiative: number;

    // Stats
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    mp: number;
    maxMp: number;
    level: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: string) {
        this.id = Phaser.Utils.String.UUID();
        this.scene = scene;
        this.name = `Enemy ${this.id.slice(0, 4)}`;
        this.gridX = x;
        this.gridY = y;
        this.characterType = characterType;

        // Assign random Courant
        const keys = Object.values(CourantType);
        this.courant = keys[Math.floor(Math.random() * keys.length)];
        this.spells = getSpellsForCourant(this.courant);

        // Initialize Stats (Randomized for variety)
        this.level = Phaser.Math.Between(1, 5);
        this.maxHp = 80 + (this.level * 10);
        this.hp = this.maxHp;
        this.maxAp = 6;
        this.ap = this.maxAp;
        this.maxMp = 3;
        this.mp = this.maxMp;
        this.initiative = 8 + this.level + Phaser.Math.Between(0, 8);

        console.log(`OtherPlayer assigned to ${this.courant}`);

        const isoPos = IsoUtils.cartesianToIso(x, y);

        // Use the first frame of the idle animation as the initial texture
        this.sprite = scene.add.sprite(isoPos.x, isoPos.y, `${characterType}_idle_0`);
        this.sprite.setOrigin(0.5, 1); // Anchor at bottom center
        this.sprite.setDepth(isoPos.y); // Depth sorting

        // Scale to fit tile with some variation
        const targetWidth = 64 * 1.25;
        const baseScale = targetWidth / this.sprite.width;
        const variation = Phaser.Math.FloatBetween(0.9, 1.1); // Reduced variation
        this.sprite.setScale(baseScale * variation);

        // Random tint for variety
        this.sprite.setTint(Math.random() * 0xffffff);

        // Play the idle animation
        this.sprite.play(`${characterType}_idle`);
    }

    moveAlongPath(path: { x: number, y: number }[], onStepComplete?: () => void, onPathComplete?: () => void) {
        if (path.length === 0) {
            if (onPathComplete) {
                onPathComplete();
            }
            return;
        }

        this.scene.tweens.killTweensOf(this.sprite);

        const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = path.map((node) => {
            const isoPos = IsoUtils.cartesianToIso(node.x, node.y);
            return {
                targets: this.sprite,
                x: isoPos.x,
                y: isoPos.y,
                duration: 180,
                onStart: () => {
                    const previousGridX = this.gridX;
                    const previousGridY = this.gridY;

                    this.gridX = node.x;
                    this.gridY = node.y;
                    this.sprite.setDepth(this.sprite.y);

                    const previousIso = IsoUtils.cartesianToIso(previousGridX, previousGridY);
                    if (isoPos.x > previousIso.x) {
                        this.sprite.setFlipX(false);
                    } else if (isoPos.x < previousIso.x) {
                        this.sprite.setFlipX(true);
                    }

                    if (this.sprite.anims.currentAnim?.key !== `${this.characterType}_run`) {
                        this.sprite.play(`${this.characterType}_run`, true);
                    }

                    if (onStepComplete) {
                        onStepComplete();
                    }
                },
                onUpdate: () => {
                    this.sprite.setDepth(this.sprite.y);
                }
            };
        });

        this.isMoving = true;
        this.scene.tweens.chain({
            tweens,
            onComplete: () => {
                this.isMoving = false;
                this.sprite.play(`${this.characterType}_idle`);
                if (onPathComplete) {
                    onPathComplete();
                }
            }
        });
    }

    setGridPosition(x: number, y: number) {
        this.gridX = x;
        this.gridY = y;
        const isoPos = IsoUtils.cartesianToIso(x, y);
        this.sprite.setPosition(isoPos.x, isoPos.y);
        this.sprite.setDepth(isoPos.y);
    }
}
