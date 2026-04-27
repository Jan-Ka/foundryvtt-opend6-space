/**
 * OD6S-specific augmentations layered on top of `types/foundry.d.ts`.
 *
 * Strategy: declare ambient interfaces with the same name as the Foundry
 * classes so TypeScript merges the additional members into the existing
 * class declaration. This is global scope (no imports/exports), matching
 * `foundry.d.ts`.
 *
 * Coverage focus is the OD6S subclass surface that drives `as any` casts
 * elsewhere in the codebase.
 */

// ---- Actor system data shapes ----

interface OD6SAttributeField {
    label: string;
    short_label: string;
    base: number;
    mod: number;
    score: number;
    max?: number;
    min?: number;
}

interface OD6SModScoreField {
    label: string;
    short_label?: string;
    mod: number;
    score: number;
}

interface OD6SModField {
    label: string;
    short_label?: string;
    mod: number;
}

interface OD6SScoreField {
    label: string;
    score: number;
}

interface OD6SWoundsField {
    value: number;
    body_points: { max: number; current: number };
}

interface OD6SAttributes {
    agi: OD6SAttributeField;
    str: OD6SAttributeField;
    mec: OD6SAttributeField;
    kno: OD6SAttributeField;
    per: OD6SAttributeField;
    tec: OD6SAttributeField;
    met: OD6SAttributeField;
    ca1: OD6SAttributeField;
    ca2: OD6SAttributeField;
    ca3: OD6SAttributeField;
    ca4: OD6SAttributeField;
    [key: string]: OD6SAttributeField;
}

/** System data shared by character, npc, and creature actor types. */
interface OD6SCharacterSystem {
    attributes: OD6SAttributes;
    wounds: OD6SWoundsField;
    stuns: { value: number; current: number; rounds: number };
    strengthdamage: OD6SModScoreField;
    ranged: OD6SModField;
    melee: OD6SModField;
    brawl: OD6SModField;
    dodge: OD6SModScoreField;
    parry: OD6SModScoreField;
    block: OD6SModScoreField;
    pr: OD6SModScoreField;
    er: OD6SModScoreField;
    sheetmode: { value: string };
    scale: OD6SScoreField;
    initiative: { score: number; mod: number; formula: string };
    use_wild_die: boolean;
    roll_mod: number;
    /** Crewmember actors carry a reference back to their vehicle. */
    vehicle: { uuid: string; name?: string; scale?: OD6SScoreField; vehicle_weapons?: any[] };
}

/** System data for vehicle and starship actor types. */
interface OD6SVehicleSystem {
    attributes: OD6SAttributes;
    sheetmode: { value: string };
    scale: OD6SScoreField;
    toughness: OD6SScoreField;
    armor: OD6SScoreField;
    maneuverability: OD6SScoreField;
    ranged: OD6SScoreField;
    ranged_damage: OD6SScoreField;
    ram: OD6SScoreField;
    ram_damage: OD6SScoreField;
    embedded_pilot: { value: boolean };
    crewmembers: Array<{ uuid: string; name?: string }>;
    roll_mod: number;
    use_wild_die: boolean;
}

// ---- Discriminated type literals ----

/** All actor subtypes registered in `od6s.ts`. */
type OD6SActorType = "character" | "npc" | "creature" | "vehicle" | "starship" | "container";

/** All item subtypes registered in `od6s.ts`. */
type OD6SItemType =
    | "skill"
    | "specialization"
    | "advantage"
    | "disadvantage"
    | "specialability"
    | "armor"
    | "weapon"
    | "gear"
    | "cybernetic"
    | "manifestation"
    | "character-template"
    | "action"
    | "vehicle"
    | "vehicle-weapon"
    | "vehicle-gear"
    | "starship-weapon"
    | "starship-gear"
    | "species-template"
    | "item-group";

// ---- Actor: OD6SActor methods ----

interface Actor {
    /** Narrowed to OD6S actor subtypes for type-switch narrowing. */
    type: OD6SActorType;

    /**
     * Typed union of character/vehicle system shapes. Use `actor.type` to
     * narrow before accessing type-specific fields (e.g. `vehicle.crewmembers`).
     */
    system: (OD6SCharacterSystem | OD6SVehicleSystem) & Record<string, any>;

    /** Roll an action defined in OD6S.actions (or vehicle/starship actions). */
    rollAction(actionId: string, msg?: ChatMessage | any): Promise<unknown>;

    /** Roll an attribute by short key (e.g. "agi", "kno"). */
    rollAttribute(attribute: string): Promise<void>;

    /** Score text rendered for an action button on the sheet. */
    getActionScoreText(action: string): string | undefined;

    /** Numeric vehicle action score for maneuver/dodge/ram/ranged_attack. */
    getVehicleActionScore(action: string): number | undefined;

    /** Score text for vehicle actions. */
    getVehicleActionScoreText(action: string): string | undefined;

    /** Apply equipped-item / active-effect mods to actor scores. */
    applyMods(): void;

    /** Recalculate the strength damage bonus on this actor. */
    setStrengthDamageBonus(): void;

    /** Recalculate initiative score. */
    setInitiative(): void;

    /** Recalculate physical/energy resistance (`type` is "p" | "e"). */
    setResistance(type: string): void;

    /** Apply incoming damage; updates BP / wound levels. */
    applyDamage(damage: any): Promise<unknown>;

    /** Compute new damage level given a damage value. */
    calculateNewDamageLevel(damage: any): unknown;

    /** Apply incoming wounds; updates wound state. */
    applyWounds(wound: any): Promise<unknown>;

    /** Compute new wound level from incoming wound value. */
    calculateNewWoundLevel(wound: any): unknown;

    /** First wound level entry from a deadliness table. */
    findFirstWoundLevel(table: any, wound: any): unknown;

    /** Look up the wound-level descriptor matching current body points. */
    getWoundLevelFromBodyPoints(bp?: number): any;

    /** Sync the wound-level state from current body points. */
    setWoundLevelFromBodyPoints(bp: number): Promise<unknown>;

    /** Trigger a mortally wounded check on this actor. */
    triggerMortallyWoundedCheck(): Promise<unknown>;

    /** Apply the failure outcome of a mortally-wounded check. */
    applyMortallyWoundedFailure(): Promise<unknown>;

    /** Apply the failure outcome of an incapacitated check. */
    applyIncapacitatedFailure(): Promise<unknown>;

    /** Crew/vehicle relationships. */
    addEmbeddedPilot(pilotActor: Actor): Promise<unknown>;
    addToCrew(vehicleId: string): Promise<unknown>;
    removeFromCrew(vehicleID: string): Promise<unknown>;
    forceRemoveCrewmember(crewID: string): Promise<unknown>;
    isCrewMember(): boolean;
    _verifyAddToCrew(currentVehicleId: string, newVehicleId: string): Promise<unknown>;

    /** Send updated vehicle data to other clients via socket. */
    sendVehicleData(uuid?: string): Promise<unknown>;

    /** Vehicle/starship combat helpers. */
    modifyShields(update: any): Promise<unknown>;
    vehicleCollision(): Promise<unknown>;
    onCargoHoldItemCreate(event: Event | any): Promise<unknown>;

    /** Spend a character point to modify a chat-message roll. */
    useCharacterPointOnRoll(message: ChatMessage | any): Promise<unknown>;
}

// ---- Item: OD6SItem methods ----

interface Item {
    /** Narrowed to OD6S item subtypes for type-switch narrowing. */
    type: OD6SItemType;

    /** Numeric score (skill / spec / weapon score), depends on subtype. */
    getScore(): number | undefined;

    /** "<dice>D+<pips>" formatted score. */
    getScoreText(): string | undefined;

    /** Parry score text for weapons. */
    getParryText(): string | undefined;

    /** Apply this item's active effects in-place to its `system` data. */
    findActiveEffects(): void;

    /** Recompute derived score from base + mod. */
    applyMods(): void;
}

// ---- ChatMessage: OD6S custom properties ----

/**
 * Properties OD6S sets on chat messages at runtime (in opposed-roll
 * generation, etc.). Foundry's ChatMessage doesn't declare these — they
 * are de-facto custom flag-style fields. Marked optional for safety.
 */
interface ChatMessage {
    /** Type of the speaking actor (set during opposed-roll handling). */
    actorType?: string;

    /** Display name for the speaker, swapped to vehicle name in vehicle rolls. */
    flavorName?: string;

    /** Short alias for the speaker (set during message preparation). */
    alias?: string;
}

// ---- User: target tracking ----

interface User {
    /** Tokens currently targeted by this user. */
    targets: Set<Token>;
}
