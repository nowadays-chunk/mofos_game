import React from 'react';
import { useGameState } from '../../store/GameStore';

export const BattlePanel: React.FC = () => {
    const { combat } = useGameState();

    if (!combat.isActive) {
        return null;
    }

    const latestLogs = combat.logs.slice(-6).reverse();

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '280px',
            maxHeight: '60vh',
            backgroundColor: 'rgba(15, 20, 30, 0.92)',
            border: '1px solid #4a5568',
            borderRadius: '10px',
            padding: '12px',
            color: '#edf2f7',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700 }}>Battle Mode</div>
                <div style={{ fontSize: '12px', color: '#90cdf4' }}>
                    Turn {combat.turnNumber} • {combat.remainingTurnSeconds}s
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>Initiative Order</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {combat.roundOrder.map((fighterId) => {
                        const fighter = combat.fighters.find((entry) => entry.id === fighterId);
                        if (!fighter) {
                            return null;
                        }

                        const isActive = fighter.id === combat.activeFighterId;
                        return (
                            <div
                                key={fighter.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: isActive ? 'rgba(66, 153, 225, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${isActive ? '#63b3ed' : 'transparent'}`,
                                    opacity: fighter.alive ? 1 : 0.5
                                }}
                            >
                                <span>{fighter.name}</span>
                                <span style={{ fontSize: '12px', color: fighter.team === 'player' ? '#68d391' : '#fc8181' }}>
                                    {fighter.hp}/{fighter.maxHp}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>Combat Log</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                    {latestLogs.map((log) => (
                        <div
                            key={log.id}
                            style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                fontSize: '12px',
                                lineHeight: 1.4
                            }}
                        >
                            {log.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
