import React from 'react';
import { SpellEffectType } from '../../game/data/Courants';
import { BattleLogEntry } from '../../game/types';
import { useGameState } from '../../store/GameStore';

export const BattlePanel: React.FC = () => {
    const { combat, player, selectedSpellId, combatError } = useGameState();

    if (!combat.isActive) {
        return null;
    }

    const activeFighter = combat.fighters.find((fighter) => fighter.id === combat.activeFighterId) ?? null;
    const playerBattleState = combat.fighters.find((fighter) => fighter.id === 'player-main') ?? null;
    const selectedSpell = selectedSpellId ? player.spells.find((spell) => spell.id === selectedSpellId) ?? null : null;
    const latestLogs = combat.logs.slice(-6).reverse();

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '320px',
            maxHeight: '72vh',
            backgroundColor: 'rgba(15, 20, 30, 0.92)',
            border: '1px solid #4a5568',
            borderRadius: '10px',
            padding: '12px',
            color: '#edf2f7',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'auto',
            overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700 }}>Battle Mode</div>
                <div style={{ fontSize: '12px', color: '#90cdf4' }}>
                    Turn {combat.turnNumber} • {combat.remainingTurnSeconds}s
                </div>
            </div>

            {combatError ? (
                <div style={{
                    marginBottom: '10px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 62, 62, 0.16)',
                    border: '1px solid rgba(252, 129, 129, 0.55)',
                    color: '#feb2b2',
                    fontSize: '12px'
                }}>
                    {combatError}
                </div>
            ) : null}

            {activeFighter ? (
                <section style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>Active Fighter</div>
                    <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${activeFighter.team === 'player' ? 'rgba(104, 211, 145, 0.45)' : 'rgba(252, 129, 129, 0.45)'}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                            <strong>{activeFighter.name}</strong>
                            <span style={{ fontSize: '11px', color: activeFighter.team === 'player' ? '#68d391' : '#fc8181' }}>
                                {activeFighter.team === 'player' ? 'Player Team' : 'Enemy Team'}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px', color: '#cbd5e0' }}>
                            <StatChip label="HP" value={`${activeFighter.hp}/${activeFighter.maxHp}`} />
                            <StatChip label="AP" value={`${activeFighter.ap}/${activeFighter.maxAp}`} />
                            <StatChip label="MP" value={`${activeFighter.mp}/${activeFighter.maxMp}`} />
                        </div>

                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#a0aec0' }}>
                            Tile {activeFighter.position.x}, {activeFighter.position.y}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {activeFighter.statusEffects.length > 0 ? activeFighter.statusEffects.map((status) => (
                                <span
                                    key={status.id}
                                    style={{
                                        padding: '2px 6px',
                                        borderRadius: '999px',
                                        backgroundColor: 'rgba(66, 153, 225, 0.18)',
                                        border: '1px solid rgba(144, 205, 244, 0.4)',
                                        fontSize: '10px',
                                        color: '#bee3f8'
                                    }}
                                >
                                    {status.name} ({status.duration})
                                </span>
                            )) : (
                                <span style={{ fontSize: '11px', color: '#718096' }}>No active effects</span>
                            )}
                        </div>
                    </div>
                </section>
            ) : null}

            {selectedSpell && playerBattleState ? (
                <section style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>Selected Spell</div>
                    <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(237, 137, 54, 0.12)',
                        border: '1px solid rgba(246, 173, 85, 0.45)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                            <strong>{selectedSpell.name}</strong>
                            <span style={{ fontSize: '11px', color: '#fbd38d' }}>
                                CD {playerBattleState.cooldowns[selectedSpell.id] ?? 0}
                            </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.45, marginBottom: '6px' }}>
                            {selectedSpell.description}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px', color: '#f7fafc' }}>
                            <StatChip label="AP" value={`${selectedSpell.apCost}`} />
                            <StatChip label="Range" value={`${selectedSpell.range.min}-${selectedSpell.range.max}`} />
                            <StatChip label="AoE" value={`${selectedSpell.aoe.shape} ${selectedSpell.aoe.size}`} />
                        </div>

                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#fbd38d' }}>
                            {selectedSpell.effects.map((effect, index) => (
                                <span key={`${selectedSpell.id}-${index}`}>
                                    {describeEffect(effect)}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

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
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: isActive ? 'rgba(66, 153, 225, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${isActive ? '#63b3ed' : 'transparent'}`,
                                    opacity: fighter.alive ? 1 : 0.5
                                }}
                            >
                                <div>
                                    <div>{fighter.name}</div>
                                    <div style={{ fontSize: '10px', color: '#a0aec0' }}>
                                        Tile {fighter.position.x}, {fighter.position.y}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                                    <div style={{ color: fighter.team === 'player' ? '#68d391' : '#fc8181' }}>
                                        {fighter.hp}/{fighter.maxHp} HP
                                    </div>
                                    <div style={{ color: '#90cdf4' }}>{fighter.ap} AP • {fighter.mp} MP</div>
                                </div>
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
                                backgroundColor: getLogBackground(log.type),
                                fontSize: '12px',
                                lineHeight: 1.4
                            }}
                        >
                            {log.message}
                        </div>
                    ))}

                    {latestLogs.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#718096' }}>No battle events yet.</div>
                    ) : null}
                </div>
            </div>

            <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '11px',
                color: '#a0aec0',
                lineHeight: 1.5
            }}>
                {selectedSpell ? 'Click a highlighted tile to cast your selected spell.' : 'Move by clicking a blue tile, or pick a spell from the hotbar.'}
            </div>
        </div>
    );
};

const StatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{
        padding: '4px 6px',
        borderRadius: '6px',
        backgroundColor: 'rgba(255,255,255,0.05)'
    }}>
        <div style={{ fontSize: '10px', color: '#a0aec0' }}>{label}</div>
        <div>{value}</div>
    </div>
);

const getLogBackground = (type: BattleLogEntry['type']) => {
    switch (type) {
        case 'damage':
            return 'rgba(229, 62, 62, 0.12)';
        case 'heal':
            return 'rgba(56, 161, 105, 0.12)';
        case 'victory':
            return 'rgba(236, 201, 75, 0.12)';
        case 'status':
            return 'rgba(66, 153, 225, 0.12)';
        case 'turn':
            return 'rgba(144, 205, 244, 0.1)';
        default:
            return 'rgba(255,255,255,0.04)';
    }
};

const describeEffect = (effect: { type: SpellEffectType; min: number; max: number; duration?: number; value?: number; state?: string }) => {
    const amount = effect.value ?? (effect.min === effect.max ? effect.min : `${effect.min}-${effect.max}`);
    switch (effect.type) {
        case SpellEffectType.DAMAGE:
            return `${amount} damage`;
        case SpellEffectType.HEAL:
            return `${amount} healing`;
        case SpellEffectType.BUFF_AP:
            return `+${amount} AP for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.BUFF_MP:
            return `+${amount} MP for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.BUFF_RANGE:
            return `+${amount} range for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.BUFF_POWER:
            return `+${amount} power for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.DEBUFF_AP:
            return `-${amount} AP for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.DEBUFF_MP:
            return `-${amount} MP for ${effect.duration ?? 1} turn(s)`;
        case SpellEffectType.PUSH:
            return `Push ${amount} tile(s)`;
        case SpellEffectType.PULL:
            return `Pull ${amount} tile(s)`;
        case SpellEffectType.STATE:
            return effect.state ? `${effect.state} ${amount} for ${effect.duration ?? 1} turn(s)` : `State effect ${amount}`;
        default:
            return effect.type;
    }
};
