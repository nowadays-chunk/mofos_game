import React from 'react';
import { gameEvents, EVENTS } from '../../../game/GameEventBus';
import { useGameState } from '../../../store/GameStore';

export const PlayerUnitFrame: React.FC = () => {
    const { player, combat } = useGameState();
    const playerBattleState = combat.fighters.find((fighter) => fighter.id === 'player-main');
    const isPlayersTurn = combat.isActive && combat.activeFighterId === 'player-main';

    const getBarColor = (type: 'hp' | 'ap' | 'mp') => {
        if (type === 'hp') return '#e74c3c';
        if (type === 'ap') return '#3498db';
        return '#2ecc71';
    };

    const BarComponent = ({ label, current, max, type }: { label: string; current: number; max: number; type: 'hp' | 'ap' | 'mp' }) => (
        <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ccc', marginBottom: '2px' }}>
                <span>{label}</span>
                <span>{current} / {max}</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                    width: `${max > 0 ? (current / max) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: getBarColor(type),
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );

    const statuses = playerBattleState?.statusEffects ?? [];

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '260px',
            backgroundColor: 'rgba(20, 20, 30, 0.92)',
            border: '1px solid #555',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            userSelect: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#555',
                    marginRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #777'
                }}>
                    <span style={{ fontSize: '20px' }}>👤</span>
                </div>
                <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{player.name}</div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Level {player.level} • Initiative {player.initiative}</div>
                </div>
            </div>

            <BarComponent label="Health" current={player.hp} max={player.maxHp} type="hp" />
            <BarComponent label="Action Points" current={player.ap} max={player.maxAp} type="ap" />
            <BarComponent label="Movement Points" current={player.mp} max={player.maxMp} type="mp" />

            {combat.isActive ? (
                <>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #3f4a5a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e0', marginBottom: '6px' }}>
                            <span>{isPlayersTurn ? 'Your turn' : 'Enemy turn'}</span>
                            <span>{combat.remainingTurnSeconds}s</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => gameEvents.emit(EVENTS.COMBAT.END_TURN_REQUESTED)}
                            disabled={!isPlayersTurn}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #4299e1',
                                backgroundColor: isPlayersTurn ? '#2b6cb0' : '#2d3748',
                                color: '#fff',
                                cursor: isPlayersTurn ? 'pointer' : 'default',
                                marginBottom: '8px'
                            }}
                        >
                            End Turn
                        </button>

                        {statuses.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {statuses.map((status) => (
                                    <span
                                        key={status.id}
                                        style={{
                                            padding: '3px 6px',
                                            borderRadius: '999px',
                                            backgroundColor: 'rgba(99, 179, 237, 0.15)',
                                            border: '1px solid rgba(99, 179, 237, 0.4)',
                                            fontSize: '11px',
                                            color: '#bee3f8'
                                        }}
                                    >
                                        {status.name} ({status.duration})
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '11px', color: '#718096' }}>No active status effects.</div>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
};
