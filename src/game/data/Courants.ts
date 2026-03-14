export enum CourantType {
    PSYCHE = 'Psyché',
    ESPRIT = 'Esprit',
    EXISTENCE = 'Existence',
    DESTIN = 'Destin',
    PERCEPTION = 'Perception',
    TRANSMUTATION = 'Transmutation',
    ORDRE_ET_LOI = 'Ordre & de la Loi'
}

export enum SpellEffectType {
    DAMAGE = 'DAMAGE',
    HEAL = 'HEAL',
    BUFF_AP = 'BUFF_AP',
    BUFF_MP = 'BUFF_MP',
    BUFF_RANGE = 'BUFF_RANGE',
    BUFF_POWER = 'BUFF_POWER',
    DEBUFF_AP = 'DEBUFF_AP',
    DEBUFF_MP = 'DEBUFF_MP',
    PUSH = 'PUSH',
    PULL = 'PULL',
    TELEPORT = 'TELEPORT',
    SUMMON = 'SUMMON',
    TRAP = 'TRAP',
    GLYPH = 'GLYPH',
    STATE = 'STATE'
}

export interface SpellEffect {
    type: SpellEffectType;
    min: number;
    max: number;
    duration?: number;
    chance?: number;
    targetType?: 'self' | 'enemy' | 'ally' | 'all';
    value?: number;
    state?: string;
}

export interface AoEConfig {
    shape: 'single' | 'circle' | 'line' | 'cone' | 'square' | 'cross';
    size: number;
}

export interface CastingConstraints {
    lineOfSight: boolean;
    freeCell: boolean;
    rangeModifiable: boolean;
    maxCastsPerTurn: number;
    maxCastsPerTarget: number;
    cooldown: number;
    initialCooldown?: number;
}

export interface Spell {
    id: string;
    name: string;
    description: string;
    icon: string;
    courant: CourantType;
    level: number;
    apCost: number;
    range: {
        min: number;
        max: number;
    };
    aoe: AoEConfig;
    constraints: CastingConstraints;
    effects: SpellEffect[];
    criticalChance?: number;
    criticalDamage?: number;
}

export interface Courant {
    type: CourantType;
    name: string;
    theme: string;
    focus: string;
    spells: string[];
}

const COURANT_SPELLS: Record<CourantType, string[]> = {
    [CourantType.PSYCHE]: ['Echo of Doubt', 'Trauma Pulse', 'Mirror of Self', 'Cognitive Snare'],
    [CourantType.ESPRIT]: ['Soul Spark', 'Aether Surge', 'Inner Chorus', 'Phantom Bind'],
    [CourantType.EXISTENCE]: ['Entropy Cut', 'Gravity Well', 'Existential Ward', 'Null Thread'],
    [CourantType.DESTIN]: ['Fated Blow', 'Threadstorm', 'Providence Guard', 'Misfortune Lock'],
    [CourantType.PERCEPTION]: ['Prism Dart', 'Lens Burst', 'Clarity Mantle', 'Blind Angle'],
    [CourantType.TRANSMUTATION]: ['Flux Strike', 'Catalyst Bloom', 'Mutable Shell', 'Leaden Pulse'],
    [CourantType.ORDRE_ET_LOI]: ['Verdict Ray', 'Sanction Field', 'Codex Aegis', 'Chain of Statutes']
};

export const SPELL_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
    Object.values(COURANT_SPELLS)
        .flat()
        .map((name) => [name, `${name} channels its courant into a tactical battle technique.`])
);

export const COURANTS_DATA: Courant[] = [
    {
        type: CourantType.PSYCHE,
        name: 'Courant de la Psyché',
        theme: 'Mind, identity, emotion',
        focus: 'Pressure, distortion, recovery',
        spells: COURANT_SPELLS[CourantType.PSYCHE]
    },
    {
        type: CourantType.ESPRIT,
        name: 'Courant de l\'Esprit',
        theme: 'Soul, will, resonance',
        focus: 'Precision, cadence, sustain',
        spells: COURANT_SPELLS[CourantType.ESPRIT]
    },
    {
        type: CourantType.EXISTENCE,
        name: 'Courant de l\'Existence',
        theme: 'Reality, matter, collapse',
        focus: 'Control, durability, inevitability',
        spells: COURANT_SPELLS[CourantType.EXISTENCE]
    },
    {
        type: CourantType.DESTIN,
        name: 'Courant du Destin',
        theme: 'Chance, threads, inevitability',
        focus: 'Timing, pressure, punishment',
        spells: COURANT_SPELLS[CourantType.DESTIN]
    },
    {
        type: CourantType.PERCEPTION,
        name: 'Courant de la Perception',
        theme: 'Vision, awareness, insight',
        focus: 'Range, scouting, control',
        spells: COURANT_SPELLS[CourantType.PERCEPTION]
    },
    {
        type: CourantType.TRANSMUTATION,
        name: 'Courant de la Transmutation',
        theme: 'Change, alchemy, conversion',
        focus: 'Adaptation, shielding, disruption',
        spells: COURANT_SPELLS[CourantType.TRANSMUTATION]
    },
    {
        type: CourantType.ORDRE_ET_LOI,
        name: 'Courant de l\'Ordre et de la Loi',
        theme: 'Rules, structure, sanction',
        focus: 'Punishment, zones, enforcement',
        spells: COURANT_SPELLS[CourantType.ORDRE_ET_LOI]
    }
];

const createSpellVariant = (courant: CourantType, baseName: string, slotIndex: number, tier: number): Spell => {
    const suffix = tier > 1 ? ` ${toRoman(tier)}` : '';
    const id = `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${tier}`;
    const level = tier * 2;

    if (slotIndex === 0) {
        return {
            id,
            name: `${baseName}${suffix}`,
            description: `${baseName} is a reliable single-target attack that scales with your power.`,
            icon: 'spell_default',
            courant,
            level,
            apCost: 3 + (tier > 1 ? 1 : 0),
            range: { min: 1, max: 4 + (tier > 1 ? 1 : 0) },
            aoe: { shape: 'single', size: 0 },
            constraints: {
                lineOfSight: true,
                freeCell: false,
                rangeModifiable: true,
                maxCastsPerTurn: 2,
                maxCastsPerTarget: 2,
                cooldown: 0
            },
            effects: [
                { type: SpellEffectType.DAMAGE, min: 14 + tier * 4, max: 20 + tier * 4, targetType: 'enemy' }
            ],
            criticalChance: 10,
            criticalDamage: 1.2
        };
    }

    if (slotIndex === 1) {
        return {
            id,
            name: `${baseName}${suffix}`,
            description: `${baseName} detonates in a small area and pressures clustered enemies.`,
            icon: 'spell_default',
            courant,
            level,
            apCost: 4,
            range: { min: 2, max: 5 },
            aoe: { shape: 'circle', size: tier },
            constraints: {
                lineOfSight: true,
                freeCell: false,
                rangeModifiable: true,
                maxCastsPerTurn: 1,
                maxCastsPerTarget: 1,
                cooldown: 1
            },
            effects: [
                { type: SpellEffectType.DAMAGE, min: 10 + tier * 3, max: 15 + tier * 3, targetType: 'enemy' }
            ],
            criticalChance: 8,
            criticalDamage: 1.15
        };
    }

    if (slotIndex === 2) {
        const shieldValue = 10 + tier * 6;
        const powerValue = 3 + tier * 2;
        return {
            id,
            name: `${baseName}${suffix}`,
            description: `${baseName} fortifies the caster with a shield and a temporary power boost.`,
            icon: 'spell_default',
            courant,
            level,
            apCost: 2,
            range: { min: 0, max: 0 },
            aoe: { shape: 'single', size: 0 },
            constraints: {
                lineOfSight: false,
                freeCell: false,
                rangeModifiable: false,
                maxCastsPerTurn: 1,
                maxCastsPerTarget: 1,
                cooldown: 2
            },
            effects: [
                {
                    type: SpellEffectType.BUFF_POWER,
                    min: powerValue,
                    max: powerValue,
                    value: powerValue,
                    duration: 2,
                    targetType: 'self'
                },
                {
                    type: SpellEffectType.STATE,
                    min: shieldValue,
                    max: shieldValue,
                    value: shieldValue,
                    duration: 2,
                    targetType: 'self',
                    state: 'SHIELD'
                }
            ]
        };
    }

    const poisonValue = 4 + tier * 2;
    return {
        id,
        name: `${baseName}${suffix}`,
        description: `${baseName} strikes in a line, slows enemies, and leaves a poison effect behind.`,
        icon: 'spell_default',
        courant,
        level,
        apCost: 4,
        range: { min: 1, max: 6 },
        aoe: { shape: 'line', size: 2 + tier },
        constraints: {
            lineOfSight: true,
            freeCell: false,
            rangeModifiable: true,
            maxCastsPerTurn: 1,
            maxCastsPerTarget: 1,
            cooldown: 2
        },
        effects: [
            { type: SpellEffectType.DAMAGE, min: 9 + tier * 3, max: 13 + tier * 3, targetType: 'enemy' },
            {
                type: SpellEffectType.DEBUFF_MP,
                min: 1,
                max: 1,
                value: 1,
                duration: 1,
                targetType: 'enemy'
            },
            {
                type: SpellEffectType.STATE,
                min: poisonValue,
                max: poisonValue,
                value: poisonValue,
                duration: 2,
                targetType: 'enemy',
                state: 'POISON'
            }
        ]
    };
};

export function getSpellsForCourant(type: CourantType): Spell[] {
    const names = COURANT_SPELLS[type] ?? COURANT_SPELLS[CourantType.PSYCHE];
    return names.flatMap((name, index) => [
        createSpellVariant(type, name, index, 1),
        createSpellVariant(type, name, index, 2)
    ]);
}

const toRoman = (num: number) => {
    if (num === 2) return 'II';
    if (num === 3) return 'III';
    if (num === 4) return 'IV';
    if (num === 5) return 'V';
    return 'I';
};
