import React from 'react';
import { useGameState } from '../../../store/GameStore';

export const PlayerUnitFrame: React.FC = () => {
    const { player } = useGameState();

    const getBarColor = (current: number, max: number, type: 'hp' | 'ap' | 'mp') => {
        if (type === 'hp') return '#e74c3c'; // Red
        if (type === 'ap') return '#3498db'; // Blue
        if (type === 'mp') return '#2ecc71'; // Green
        return '#fff';
    };

    const BarComponent = ({ label, current, max, type }: { label: string, current: number, max: number, type: 'hp' | 'ap' | 'mp' }) => (
        <div style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ccc', marginBottom: '2px' }}>
                <span>{label}</span>
                <span>{current} / {max}</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                    width: `${(current / max) * 100}%`,
                    height: '100%',
                    backgroundColor: getBarColor(current, max, type),
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '220px',
            backgroundColor: 'rgba(20, 20, 30, 0.9)',
            border: '1px solid #555',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            pointerEvents: 'auto', // Allow interaction
            userSelect: 'none'
        }}>
            {/* Avatar & Name */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#555',
                    marginRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #777'
                }}>
                    {/* Placeholder Avatar */}
                    <span style={{ fontSize: '20px' }}>👤</span>
                </div>
                <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{player.name}</div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Level {player.level} Alchemist</div>
                </div>
            </div>

            {/* Vitals */}
            <BarComponent label="Health" current={player.hp} max={player.maxHp} type="hp" />
            <BarComponent label="Action Points" current={player.ap} max={player.maxAp} type="ap" />
            <BarComponent label="Movement Points" current={player.mp} max={player.maxMp} type="mp" />
        </div>
    );
};
