import Phaser from 'phaser';

export class ContextMenu extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Graphics;
    private options: Phaser.GameObjects.Container[] = [];
    private menuWidth = 0;
    private menuHeight = 0;
    private optionHeight = 40;
    private optionActions: Array<() => void> = [];

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        this.scene.add.existing(this);
        this.setDepth(200010); // Very High depth
        this.setScrollFactor(0);
        this.visible = false;

        this.bg = scene.add.graphics();
        this.add(this.bg);
    }

    show(x: number, y: number, options: { text: string, onClick: () => void }[]) {
        this.setPosition(x, y);
        this.removeAllOptions();

        const width = 150;
        const optionHeight = this.optionHeight;
        const height = options.length * optionHeight;
        this.menuWidth = width;
        this.menuHeight = height;
        this.optionActions = options.map((option) => option.onClick);
        this.setSize(width, height);

        // Draw background
        this.bg.clear();
        this.bg.fillStyle(0x333333, 0.9);
        this.bg.fillRoundedRect(0, 0, width, height, 5);
        this.bg.lineStyle(1, 0xffffff, 0.5);
        this.bg.strokeRoundedRect(0, 0, width, height, 5);

        // Create options
        options.forEach((opt, index) => {
            const optY = index * optionHeight;
            const container = this.scene.add.container(0, optY);

            // Hover effect bg
            const hoverBg = this.scene.add.graphics();
            hoverBg.fillStyle(0x555555, 1);
            hoverBg.fillRect(2, 2, width - 4, optionHeight - 4);
            hoverBg.alpha = 0;
            container.add(hoverBg);

            const text = this.scene.add.text(10, optionHeight / 2, opt.text, {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            container.add(text);

            this.add(container);
            this.options.push(container);
        });

        this.visible = true;

        // Close on global click outside (handled by scene usually, or auto-close on option select)
    }

    hide() {
        this.visible = false;
        this.menuWidth = 0;
        this.menuHeight = 0;
        this.removeAllOptions();
    }

    containsScreenPoint(x: number, y: number) {
        if (!this.visible) {
            return false;
        }

        return x >= this.x && x <= this.x + this.menuWidth && y >= this.y && y <= this.y + this.menuHeight;
    }

    activateScreenPoint(x: number, y: number) {
        if (!this.containsScreenPoint(x, y)) {
            return false;
        }

        const localY = y - this.y;
        const optionIndex = Math.floor(localY / this.optionHeight);
        const action = this.optionActions[optionIndex];
        if (!action) {
            this.hide();
            return false;
        }

        this.hide();
        action();
        return true;
    }

    private removeAllOptions() {
        this.options.forEach(o => o.destroy());
        this.options = [];
        this.optionActions = [];
    }
}
