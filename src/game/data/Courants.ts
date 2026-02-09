
export enum CourantType {
    PSYCHE = 'Psyché',
    ESPRIT = 'Esprit',
    EXISTENCE = 'Existence',
    DESTIN = 'Destin',
    PERCEPTION = 'Perception',
    TRANSMUTATION = 'Transmutation',
    ORDRE_ET_LOI = 'Ordre & de la Loi'
}

export interface Spell {
    id: string;
    name: string;
    description: string;
    courant: CourantType;
    // Placeholder for future stats
    apCost?: number;
    range?: number;
    cooldown?: number;
}

export interface Courant {
    type: CourantType;
    name: string;
    theme: string;
    focus: string;
    spells: string[]; // List of spell names
}

export const SPELL_DESCRIPTIONS: Record<string, string> = {
    // 1-30 (Generic placeholders based on user list if missing, or use new list)
    // 31-100 (Detailed descriptions provided)
    'Crisis of Self': 'Target temporarily loses class identity bonuses.',
    'Projection Curse': 'Target applies their own weaknesses onto allies.',
    'Emotional Overflow': 'Excess emotion causes unstable damage bursts.',
    'Defense Mechanism': 'Automatically negates the first emotional-type debuff.',
    'Suppressed Memory': 'Locks one ability due to buried trauma.',
    'Cognitive Dissonance': 'Buffs and debuffs conflict, reducing efficiency.',
    'False Consensus': 'Target believes everyone agrees, lowering vigilance.',
    'Overthinking Loop': 'Chance to skip action due to paralysis by analysis.',
    'Imposter Syndrome': 'Reduces critical chance and confidence.',
    'Hyperfocus Tunnel': 'Massive power boost, but zero peripheral awareness.',
    'Emotional Contagion': 'Spreads mood effects to nearby units.',
    'Gaslight Field': 'Alters perceived turn order.',
    'Narrative Bias': 'Target misreads battle patterns.',
    'Attachment Wound': 'Increased damage when allies fall.',
    'Shadow Persona': 'Summons repressed traits as a hostile double.',
    'Catastrophizing': 'Small damage feels massive, increasing panic effects.',
    'Rumination Fog': 'Area of repetitive thought slowing all actions.',
    'Ego Inflation': 'Power up that makes target vulnerable to humility effects.',
    'Defensive Humor': 'Converts fear into erratic movement.',
    'Unmet Need': 'Drains motivation until supported or healed.',
    'Boundary Collapse': 'Removes personal space, enabling forced positioning.',
    'Selective Attention': 'Target ignores minor threats (reduced awareness).',
    'Somatic Echo': 'Mental damage becomes physical over time.',
    'Crisis Fatigue': 'Repeated effects become harder to resist.',
    'Repression Seal': 'Locks emotional reactions but builds internal pressure.',
    'Lotus of Emptiness': 'Creates a zone where desire-based buffs fail.',
    'Pilgrimage Step': 'Each tile moved grants small spiritual shield.',
    'Mantra of Grounding': 'Reduces fear, charm, and confusion effects.',
    'Third-Eye Pulse': 'Reveals hidden units and illusions.',
    'Wheel of Samsara': 'On defeat, returns with altered stats.',
    'Prayer of the Nameless': 'Buff from forgotten spirits.',
    'Fasting Light': 'Converts missing HP into wisdom and clarity.',
    'Ancestral Murmur': 'Random ancestral trait activates.',
    'Halo of Renunciation': 'Lose loot chance for combat purity buff.',
    'Temple of Breath': 'Zone that restores AP through stillness.',
    'Kundalini Rise': 'Power increases as HP decreases.',
    'Ashes of Attachment': 'Burning away bonds to cleanse debuffs.',
    'Sacrament of Silence': 'Prevents casting but boosts resistance.',
    'Spirit Contract': 'Borrow power at future cost.',
    'Veil of the Watchers': 'Protects from unseen threats.',
    'Incense of Forgetting': 'Clears aggro and hostility memory.',
    'Path of the Hermit': 'Stronger when isolated from allies.',
    'Echoes of the Monastery': 'Chant-based stacking buffs.',
    'Breath Between Worlds': 'Temporary phase-shift.',
    'Candle of Impermanence': 'Gradual decay of all effects.',
    'Thesis & Antithesis': 'Two opposing buffs that eventually collapse.',
    'Socratic Challenge': 'Forces enemy to question and skip reaction.',
    'Burden of Knowledge': 'Increased crit, reduced joy (healing received).',
    'Will to Power': 'Damage scales with dominance on the field.',
    'Eternal Return': 'Repeats last turn’s conditions.',
    'Absence of Essence': 'Removes class traits temporarily.',
    'Moral Injury': 'Damage increases when violating own alignment.',
    'Camus’ Smile': 'Negates despair effects through absurd acceptance.',
    'Heidegger’s Weight': 'Presence slows nearby units.',
    'The Unexamined Turn': 'Extra action but future penalty.',
    'Collapse of Certainty': 'Removes all shields and illusions.',
    'Freedom vs Security': 'Choose between mobility or defense.',
    'The Last Question': 'Massive mental damage over time.',
    'Being-Toward-End': 'Power increases as battle nears conclusion.',
    'Infinite Regress': 'Triggers chained self-referential effects.',
    'Veil of Ignorance': 'Randomizes roles fairly.',
    'Existential Armor': 'Resistance scales with awareness of death.',
    'The Leap of Faith': 'High risk, high reward random buff.',
    'Absurd Victory': 'Win condition triggers unexpected drawback.',
    'Null Hypothesis': 'Cancels assumptions-based buffs.',
    'Parable of the Cave': 'Reveals truth but blinds briefly.',
    'The Silent Axiom': 'Passive rule changes reality logic.',
    'Weight of Nothingness': 'Heavy debuff with no visible source.',
    'The Final Witness': 'Summons an observer that alters outcomes.',
    'Unity of Opposites': 'Merges buffs and debuffs into a balanced state.',
    // 1-30 Placeholders for now, mapped from "Key Spells" lists if not in 31-100
    'Echo of Doubt': 'Forces the target to question their last action, reducing their confidence and accuracy.',
    'Mirror of Self': 'The enemy sees their own fears reflected, causing hesitation.',
    'Cognitive Rift': 'Splits the target’s attention, making them act slower.',
    'Trauma Pulse': 'Triggers old mental wounds, weakening emotional resistance.',
    'Identity Blur': 'Temporarily confuses allies and enemies in the target’s mind.',
    'Inner Critic': 'A whispering curse that drains motivation over time.',
    'Memory Distortion': 'Alters perception of time, making turns feel longer.',
    'Anxiety Surge': 'Increases speed but causes uncontrolled movement.',
    'Veil of the Soul': 'Hides spiritual presence, making the caster harder to detect.',
    'Breath of Stillness': 'Creates a zone of calm that slows all aggression.',
    'Astral Thread': 'Links two souls, sharing damage and healing.',
    'Light of Remembrance': 'Restores strength by recalling forgotten purpose.',
    'Karmic Rebound': 'Returns negative effects to their spiritual source.',
    'Pilgrim’s Resolve': 'Increases power based on how much suffering was endured.',
    'Sacred Detachment': 'Removes emotional attachment, reducing both pain and pleasure.',
    'Chant of Impermanence': 'Weakens buffs by reminding that all things fade.',
    'Soul Anchor': 'Prevents knockback and fear by grounding the spirit.',
    'Veil Between Lives': 'Temporarily reveals past-life instincts for bonus insight.',
    'Paradox Field': 'Inverts cause and effect for one turn.',
    'Question of Meaning': 'Lowers enemy willpower by forcing existential doubt.',
    'Weight of Choice': 'Makes every action cost more energy.',
    'Freedom’s Burden': 'Increases movement but drains stamina faster.',
    'Truth Without Comfort': 'Removes illusions but causes mental damage.',
    'Absurdist Laugh': 'Randomizes outcomes to reflect chaos.',
    'Determinist Chain': 'Restricts movement, symbolizing fate.',
    'Observer’s Collapse': 'Changes reality based on who is watching.',
    'Silence of the Void': 'Removes all buffs and debuffs — pure emptiness.',
    'Acceptance of the End': 'Reduces fear effects and increases resistance near defeat.',
};

export const COURANTS_DATA: Courant[] = [
    {
        type: CourantType.PSYCHE,
        name: 'Courant de la Psyché',
        theme: 'Mind, identity, trauma, perception, emotion',
        focus: 'internal conflict, mental states, cognitive distortions',
        spells: [
            'Echo of Doubt', 'Mirror of Self', 'Cognitive Rift', 'Trauma Pulse', 'Identity Blur',
            'Inner Critic', 'Memory Distortion', 'Anxiety Surge', 'Crisis of Self', 'Projection Curse',
            'Emotional Overflow', 'Suppressed Memory', 'Cognitive Dissonance', 'Overthinking Loop',
            'Imposter Syndrome', 'Emotional Contagion', 'Gaslight Field', 'Narrative Bias',
            'Shadow Persona', 'Catastrophizing', 'Rumination Fog', 'Ego Inflation', 'Unmet Need',
            'Boundary Collapse', 'Selective Attention', 'Somatic Echo', 'Crisis Fatigue', 'Repression Seal'
        ]
    },
    {
        type: CourantType.ESPRIT,
        name: 'Courant de l’Esprit',
        theme: 'Soul, karma, stillness, asceticism, inner light',
        focus: 'transcendence, purification, connection to unseen',
        spells: [
            'Veil of the Soul', 'Breath of Stillness', 'Astral Thread', 'Light of Remembrance',
            'Karmic Rebound', 'Pilgrim’s Resolve', 'Sacred Detachment', 'Chant of Impermanence',
            'Soul Anchor', 'Veil Between Lives', 'Lotus of Emptiness', 'Pilgrimage Step',
            'Mantra of Grounding', 'Third-Eye Pulse', 'Wheel of Samsara', 'Prayer of the Nameless',
            'Fasting Light', 'Ancestral Murmur', 'Halo of Renunciation', 'Temple of Breath',
            'Kundalini Rise', 'Ashes of Attachment', 'Sacrament of Silence', 'Spirit Contract',
            'Veil of the Watchers', 'Incense of Forgetting', 'Path of the Hermit',
            'Echoes of the Monastery', 'Breath Between Worlds', 'Candle of Impermanence'
        ]
    },
    {
        type: CourantType.EXISTENCE,
        name: 'Courant de l’Existence',
        theme: 'Meaning, absurdity, death, freedom, nothingness',
        focus: 'being, choice, finitude, despair, awareness',
        spells: [
            'Question of Meaning', 'Weight of Choice', 'Freedom’s Burden', 'Truth Without Comfort',
            'Absurdist Laugh', 'Acceptance of the End', 'Burden of Knowledge', 'Camus’ Smile',
            'Being-Toward-End', 'Absence of Essence', 'Moral Injury', 'Heidegger’s Weight',
            'The Unexamined Turn', 'Collapse of Certainty', 'Freedom vs Security', 'The Last Question',
            'Existential Armor', 'Absurd Victory', 'Weight of Nothingness', 'The Leap of Faith'
        ]
    },
    {
        type: CourantType.DESTIN,
        name: 'Courant du Destin',
        theme: 'Fate, repetition, inevitability, cycles',
        focus: 'time loops, destiny, repetition, karmic cycles',
        spells: [
            'Determinist Chain', 'Wheel of Samsara', 'Eternal Return', 'Infinite Regress',
            'The Final Witness', 'Candle of Impermanence', 'The Silent Axiom', 'Veil of Ignorance',
            'Unity of Opposites'
        ]
    },
    {
        type: CourantType.PERCEPTION,
        name: 'Courant de la Perception',
        theme: 'Observer, illusion, truth, perspective, reality shifts',
        focus: 'what is seen vs what is real',
        spells: [
            'Paradox Field', 'Observer’s Collapse', 'Third-Eye Pulse', 'Gaslight Field',
            'Parable of the Cave', 'Collapse of Certainty', 'Veil of Ignorance', 'Null Hypothesis',
            'The Final Witness', 'The Silent Axiom'
        ]
    },
    {
        type: CourantType.TRANSMUTATION,
        name: 'Courant de la Transmutation',
        theme: 'Balance, merging, sacrifice, conversion of states',
        focus: 'turning suffering into power, merging opposites',
        spells: [
            'Phantom Certainty', 'Pilgrim’s Resolve', 'Fasting Light', 'Kundalini Rise',
            'Ashes of Attachment', 'Burden of Knowledge', 'Will to Power', 'Unity of Opposites',
            'Thesis & Antithesis', 'Sacred Detachment'
        ]
    },
    {
        type: CourantType.ORDRE_ET_LOI,
        name: 'Courant de l’Ordre & de la Loi',
        theme: 'Rules, axioms, structure of reality itself',
        focus: 'changing game logic, laws, meta effects',
        spells: [
            'The Silent Axiom', 'Null Hypothesis', 'Paradox Field', 'Veil of Ignorance',
            'The Final Witness', 'Absence of Essence', 'The Unexamined Turn'
        ]
    }
];

export function getSpellsForCourant(type: CourantType): Spell[] {
    const courant = COURANTS_DATA.find(c => c.type === type);
    if (!courant) return [];
    return courant.spells.map(name => ({
        id: name.toLowerCase().replace(/ /g, '_'),
        name,
        description: SPELL_DESCRIPTIONS[name] || 'A mysterious spell.',
        courant: type,
        apCost: 3, // Placeholder
        range: 3, // Placeholder
        cooldown: 0 // Placeholder
    }));
}
