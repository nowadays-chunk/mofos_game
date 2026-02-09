import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { GameProvider } from './store/GameStore';
import { UIOverlay } from './components/ui/UIOverlay';
import './App.css';

function App() {
    const gameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (gameRef.current) {
            // Basic Phaser Game Config
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: window.innerWidth,
                height: window.innerHeight,
                parent: gameRef.current,
                scene: [BootScene, GameScene],
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 0 },
                        debug: false
                    }
                },
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                }
            };

            const game = new Phaser.Game(config);

            return () => {
                game.destroy(true);
            };
        }
    }, []);

    return (
        <GameProvider>
            <div className="App" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
                <UIOverlay />
                <div ref={gameRef} id="phaser-game" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
            </div>
        </GameProvider>
    );
}

export default App;
