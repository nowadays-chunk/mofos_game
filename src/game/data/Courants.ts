
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
    STATE = 'STATE' // Apply a state like 'Rooted', 'Silence'
}

export interface SpellEffect {
    type: SpellEffectType;
    min: number;
    max: number;
    duration?: number; // In turns, 0 = instant
    chance?: number; // 0-100%
    targetType?: 'self' | 'enemy' | 'ally' | 'all';
    value?: number; // For flat values like AP cost reduction
    state?: string; // For STATE effect
}

export interface AoEConfig {
    shape: 'single' | 'circle' | 'line' | 'cone' | 'square' | 'cross';
    size: number; // radius or length
}

export interface CastingConstraints {
    lineOfSight: boolean;
    freeCell: boolean; // Target cell must be empty (for summons/movement)
    rangeModifiable: boolean; // Can range be boosted by gear?
    maxCastsPerTurn: number;
    maxCastsPerTarget: number;
    cooldown: number; // In turns
    initialCooldown?: number; // Cooldown at start of combat
}

export interface Spell {
    id: string;
    name: string;
    description: string;
    icon: string; // Asset key
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
    // UI details
    criticalChance?: number; // 0-100%
    criticalDamage?: number; // Multiplier or flat bonus
}

export interface Courant {
    type: CourantType;
    name: string;
    theme: string;
    focus: string;
    spells: string[]; // List of spell names
}

export const SPELL_DESCRIPTIONS: Record<string, string> = {
    // ... (Your existing descriptions, can be kept or moved to a json)
    // For brevity in this file, we might load these from a separate locale file later,
    // but for now we keep the structure.
    'Echo of Doubt': 'Forces the target to question their last action, reducing their confidence and accuracy.',
    // ... add others as needed
};

// Helper to create a default spell for testing/initialization
export const createDefaultSpell = (id: string, name: string, courant: CourantType): Spell => ({
    id,
    name,
    description: SPELL_DESCRIPTIONS[name] || 'A mysterious spell.',
    icon: 'spell_default', // Placeholder
    courant,
    level: 1,
    apCost: 3,
    range: { min: 1, max: 4 },
    aoe: { shape: 'single', size: 0 },
    constraints: {
        lineOfSight: true,
        freeCell: false,
        rangeModifiable: true,
        maxCastsPerTurn: 2,
        maxCastsPerTarget: 1,
        cooldown: 0
    },
    effects: [
        { type: SpellEffectType.DAMAGE, min: 10, max: 15, targetType: 'enemy' }
    ]
});

export const COURANTS_DATA: Courant[] = [
    {
        type: CourantType.PSYCHE,
        name: 'Courant de la Psyché',
        theme: 'Mind, identity, trauma, perception, emotion',
        focus: 'internal conflict, mental states, cognitive distortions',
        spells: [
            'Echo of Doubt', 'Mirror of Self', 'Cognitive Rift', 'Trauma Pulse'
            // ... full list
        ]
    },
    // ... other courants (simplified for this update, you can copy full list back if needed)
];

// This function now returns full Spell objects
export function getSpellsForCourant(type: CourantType): Spell[] {
    const courant = COURANTS_DATA.find(c => c.type === type);
    if (!courant) return [];

    // In a real app, this would query a database of full spell definitions.
    // Here we generate them based on the list.
    return courant.spells.map(name => {
        const id = name.toLowerCase().replace(/ /g, '_');
        // Custom logic to vary spells based on name/index could go here
        return createDefaultSpell(id, name, type);
    });
}
