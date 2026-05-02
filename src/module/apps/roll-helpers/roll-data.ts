/**
 * RollData type definitions and small pure helpers shared by roll-setup,
 * roll-execute, roll-difficulty, and the roll dialog. No Foundry globals.
 *
 * Note: this is the structural type — many fields are still loosely typed
 * because the legacy code stores tokens, actors, and items as `any`. As the
 * roll flow migrates to ApplicationV2, fields here can tighten.
 */

import type {Modifier} from "./difficulty-math";

export interface RollModifiers {
    range: string;
    attackoption: string;
    calledshot: string;
    cover: string;
    coverlight: string;
    coversmoke: string;
    miscmod: number;
    scalemod: number;
}

export interface DiceValue {
    dice: number;
    pips: number;
}

export interface RollData {
    label: string;
    title: string;
    dice: number;
    pips: number;
    specSkill: string;
    originaldice: number;
    originalpips: number;
    score: number;
    wilddie: boolean;
    showWildDie: boolean;
    canusefp: boolean;
    fatepoint: boolean;
    fatepointeffect: boolean;
    characterpoints: number;
    canusecp: boolean;
    contact: boolean;
    cpcost: number;
    cpcostcolor: string;
    bonusdice: number;
    bonuspips: number;
    isvisible: boolean;
    isknown: boolean;
    isExplosive: boolean;
    type: string;
    subtype: string;
    attribute: string | null;
    actor: Actor;
    token: Token | undefined;
    actionpenalty: number;
    woundpenalty: number;
    stunnedpenalty: number;
    otherpenalty: number;
    multishot: boolean;
    shots: number;
    fulldefense: boolean;
    itemid: string;
    targets: Token[];
    target?: Token;
    timer: number;
    damagetype: string;
    damagescore: number;
    stundamagetype: string;
    stundamagescore: number;
    damagemodifiers: Modifier[];
    difficultylevel: string;
    isoppasable: boolean;
    difficulty: number;
    scaledice: number;
    seller: string;
    vehicle: string;
    vehiclespeed: string;
    vehiclecollisiontype: string;
    vehicleterraindifficulty: string;
    source: string;
    range: string;
    template: string;
    only_stun: boolean;
    can_stun: boolean;
    stun: boolean;
    attackerScale: number;
    modifiers: RollModifiers;
    rollmode?: string;
}

/**
 * Raw event/dataset payload passed into setupRollData and _onRollDialog.
 * Many fields are mutated during assembly in roll-setup.ts.
 */
export interface IncomingRollData {
    actor: Actor;
    name: string;
    score: number;
    type: string;
    subtype?: string;
    token?: string;
    itemId?: string;
    difficulty?: number;
    difficultyLevel?: string;
    flatpips?: number;
    attribute?: string;
    seller?: string;
    scale?: number | null;
    damage?: number;
    damage_type?: string;
    range?: { short: number; medium: number; long: number } | false;
}

/** Flags written into ChatMessage.flags.od6s by executeRollAction. */
export interface RollMessageFlags {
    actorId: string | null;
    targetName: string | undefined;
    targetId: string | undefined;
    targetType: string | undefined;
    baseDifficulty: number;
    difficulty: number;
    difficultyLevel: string;
    baseDamage: number;
    damageScore: number;
    damageDice: DiceValue;
    strModDice: DiceValue | undefined;
    damageScaleBonus: number;
    damageScaleDice: number;
    damageModifiers: Modifier[];
    damageType: string;
    damageTypeName: string;
    stun: boolean;
    fatepointineffect: boolean;
    isExplosive: boolean;
    range: string;
    type: string;
    subtype: string;
    multiShot: boolean;
    modifiers: Modifier[];
    isEditable: boolean;
    editing: boolean;
    isVisible: boolean;
    isKnown: boolean;
    isOpposable: boolean;
    wild: boolean;
    wildHandled: boolean;
    wildResult: string;
    canUseCp: boolean;
    specSkill: string;
    vehicle: string;
    vehiclespeed: string;
    vehicleterraindifficulty: string;
    source: string;
    location: string;
    seller: string;
    purchasedItem: string;
    itemId: string;
    attackerScale: number;
    success?: boolean;
    total?: number;
    showButton?: boolean;
    triggered?: boolean;
    targets?: unknown;
    originalroll?: unknown;
    /**
     * Persisted roll mode chosen at message creation. Read by chat-mode.ts so
     * the renderer can distinguish self vs gm in single-GM worlds, where
     * `whisper === [author.id]` is ambiguous.
     */
    rollMode?: string;
}

/** Minimal payload for metaphysics multi-skill roll dialogs — not a full RollData. */
export interface MetaphysicsRollData {
    title: string;
    skills: Record<string, { difficulty: string; skill: Item }>;
    wilddie: boolean;
    showWildDie: boolean | unknown;
    actor: Actor;
    actionpenalty: number;
    stunnedpenalty: number;
    template: string;
}

// ---- Pure helpers ----

/**
 * Compute the scale modifier (attacker scale minus defender scale).
 * Returns 0 when scales match. Mirrors lines 305-313 of roll-setup.ts.
 */
export function computeScaleMod(attackerScale: number, defenderScale: number): number {
    if (attackerScale === defenderScale) return 0;
    return attackerScale - defenderScale;
}

/**
 * Coerce a scale value: undefined/null becomes 0; everything else passes through.
 * Mirrors the `typeof === 'undefined' ? 0 : score` pattern used repeatedly.
 */
export function coerceScale(value: number | undefined | null): number {
    return typeof value === 'number' && !isNaN(value) ? value : 0;
}

/**
 * Whether a roll's score is below the minimum required for at least 1 die.
 * Mirrors the SCORE_TOO_LOW check in roll-setup.ts:410-413.
 *
 * `flatSkillsBypass` represents the OD6S.flatSkills && (type==='skill' || type==='specialization') exemption.
 */
export function isScoreTooLow(
    score: number,
    pipsPerDice: number,
    flatSkillsBypass: boolean,
): boolean {
    if (flatSkillsBypass) return false;
    return score < pipsPerDice;
}
