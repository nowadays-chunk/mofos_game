import React from 'react';
import { useUIStore } from '../../store/UIStore';
import { Window } from './Window';
import { BattlePanel } from './BattlePanel';
import { Hotbar } from './Hotbar';
import { PlayerUnitFrame } from './hud/PlayerUnitFrame';
import { SpellBook } from './SpellBook';
import { useGameState } from '../../store/GameStore';

export const UIOverlay: React.FC = () => {
    const { windows, toggleWindow } = useUIStore();
    const { combat } = useGameState();

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            overflow: 'hidden'
        }}>
            <div id="widget-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                <PlayerUnitFrame />
                <Hotbar />
                {combat.isActive ? <BattlePanel /> : null}

                <div style={{ position: 'absolute', top: 10, right: combat.isActive ? 320 : 10, pointerEvents: 'auto', display: 'flex', gap: '8px' }}>
                    <MenuButton label="💬 Chat" onClick={() => toggleWindow('chat')} />
                    <MenuButton label="🎒 Inventory" onClick={() => toggleWindow('inventory')} />
                    <MenuButton label="👤 Character" onClick={() => toggleWindow('character')} />
                    <MenuButton label="✨ Spells" onClick={() => toggleWindow('spells')} />
                </div>
            </div>

            <div id="window-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20 }}>
                {Object.values(windows).map((windowState) => (
                    windowState.isOpen ? <WindowContainer key={windowState.id} id={windowState.id} /> : null
                ))}
            </div>

            <div id="modal-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 30, pointerEvents: 'none' }} />
        </div>
    );
};

const MenuButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: '8px 12px',
            background: 'linear-gradient(to bottom, #4a4a5e, #3a3a4e)',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: 'all 0.1s'
        }}
        onMouseEnter={(event) => { event.currentTarget.style.filter = 'brightness(1.2)'; }}
        onMouseLeave={(event) => { event.currentTarget.style.filter = 'none'; }}
        onMouseDown={(event) => { event.currentTarget.style.transform = 'translateY(1px)'; }}
        onMouseUp={(event) => { event.currentTarget.style.transform = 'translateY(0)'; }}
    >
        {label}
    </button>
);

const WindowContainer: React.FC<{ id: string }> = ({ id }) => {
    const { windows } = useUIStore();
    const win = windows[id];

    if (!win) {
        return null;
    }

    let content = null;
    switch (id) {
        case 'inventory':
            content = (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '5px' }}>
                    {Array.from({ length: 16 }).map((_, index) => (
                        <div key={index} style={{
                            width: 60,
                            height: 60,
                            border: '1px solid #444',
                            backgroundColor: '#222',
                            borderRadius: '4px',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                        }} />
                    ))}
                </div>
            );
            break;
        case 'character':
            content = (
                <div style={{ padding: '0 5px' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 50, height: 50, background: '#333', borderRadius: '50%' }} />
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#fff' }}>Bloody Alchemist</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>Level 5 Mage</div>
                        </div>
                    </div>
                    <StatRow label="HP" value="100/100" color="#e55" />
                    <StatRow label="AP" value="6/6" color="#5ae" />
                    <StatRow label="MP" value="3/3" color="#5ea" />
                    <hr style={{ borderColor: '#444', margin: '10px 0' }} />
                    <StatRow label="Strength" value="12" />
                    <StatRow label="Intelligence" value="24" />
                    <StatRow label="Agility" value="8" />
                </div>
            );
            break;
        case 'spells':
            content = <SpellBook />;
            break;
        case 'chat':
            content = (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: '5px', overflowY: 'auto', borderRadius: '4px', marginBottom: '5px' }}>
                        <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '2px' }}>[System] Welcome to Mofos Game!</div>
                        <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '2px' }}>[System] Click an enemy to start a tactical fight.</div>
                        <div style={{ color: '#e55', fontSize: '13px', marginBottom: '2px' }}>[Combat] Use AP for spells and MP for movement.</div>
                    </div>
                    <form onSubmit={(event) => { event.preventDefault(); }} style={{ display: 'flex' }}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                padding: '6px',
                                background: '#222',
                                border: '1px solid #444',
                                color: 'white',
                                borderRadius: '3px',
                                outline: 'none'
                            }}
                        />
                    </form>
                </div>
            );
            break;
        default:
            content = <div>Unknown Window</div>;
    }

    return (
        <Window id={id} title={win.title || id}>
            {content}
        </Window>
    );
};

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#ccc' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ color, fontWeight: 'bold' }}>{value}</span>
    </div>
);
