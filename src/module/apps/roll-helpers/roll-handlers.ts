/**
 * Per-roll-type handler contract for #98.
 *
 * Each {@link RollTypeKey} maps to a pure {@link Handler} that produces only
 * the fields its bucket in {@link ROLL_TYPE_FIELDS} owns. Handlers are
 * Foundry-free: they consume narrowed views ({@link ActorView},
 * {@link ItemView}, {@link TargetView}, {@link RollSettingsView}) and a
 * pre-computed {@link ClassifiedRoll}. The boundary projection from Foundry
 * documents to these views lives in `roll-context-adapter.ts` (Phase 1 step 2).
 *
 * The output type is mechanically derived from `ROLL_TYPE_FIELDS[key]`, so a
 * handler that tries to write outside its bucket fails to compile. Combined
 * with the partition invariants in `roll-type-fields.ts`, this gives
 * compile-time enforcement of the mutation map.
 *
 * The stub registry below throws on every key so unimplemented handlers fail
 * loudly (and so any miswiring during Phase 2 is caught at first call rather
 * than silently producing partial output).
 */

import type { ClassifiedRoll, IncomingRollData, Localize, RollData, RollTypeKey } from './roll-data';
import type { ROLL_TYPE_FIELDS } from './roll-type-fields';
import { getDiceFromScore } from '../../system/utilities/dice';

export type HandlerOutput<K extends RollTypeKey> =
    Pick<RollData, (typeof ROLL_TYPE_FIELDS)[K][number]>;

/**
 * Request data the orchestrator hands to a handler. A projection of
 * {@link IncomingRollData} minus the Foundry `actor` (which lives in
 * {@link HandlerContext.actor} as a narrowed view) plus the classifier
 * output. Handlers consume input + ctx; nothing else.
 */
export type HandlerInput = Omit<IncomingRollData, 'actor'> & {
    classified: ClassifiedRoll;
};

/**
 * Read-only narrowed view of an actor for handler consumption. Discriminated
 * by `type` so handlers branching on actor kind get exhaustive narrowing.
 * Fields grow per family as Phase 2 handlers need them — kept tight rather
 * than mirroring the Foundry shape.
 */
export type ActorView =
    | CharacterActorView
    | NpcActorView
    | VehicleActorView
    | StarshipActorView;

export interface CharacterActorView {
    type: 'character';
    uuid: string;
    /** Embedded vehicle reference when the character is piloting one. */
    vehicle?: { uuid: string };
}

export interface NpcActorView {
    type: 'npc';
    uuid: string;
    /** Embedded vehicle reference when the NPC is piloting one. */
    vehicle?: { uuid: string };
}

export interface VehicleActorView {
    type: 'vehicle';
    uuid: string;
}

export interface StarshipActorView {
    type: 'starship';
    uuid: string;
}

export interface ItemView {
    type: string;
    /** Skill / specialization item: parent attribute key (case-insensitive). */
    attribute?: string;
    /** Specialization item: parent skill name. */
    skill?: string;
}

export interface TargetView {
    scale: number;
}

export interface RollSettingsView {
    /** When true, "Unknown" is the default difficulty label instead of "Easy". */
    defaultUnknownDifficulty: boolean;
    /** When true, scale modifiers are paid in dice rather than score adjustments. */
    diceForScale: boolean;
    /** When true, fate-point spends apply to funds/purchase rolls. */
    fundsFate: boolean;
    /** When true, hide combat cards from non-GM observers. */
    hideCombatCards: boolean;
    /** When true, hide skill cards from non-GM observers. */
    hideSkillCards: boolean;
    /** When true, the dialog exposes the parent-skill link for specializations. */
    showSkillSpecialization: boolean;
    /** System-constant pips per die (3 in standard OpenD6). */
    pipsPerDice: number;
}

export interface HandlerContext {
    actor: ActorView;
    item?: ItemView;
    targets: ReadonlyArray<TargetView>;
    settings: RollSettingsView;
    localize: Localize;
}

export type Handler<K extends RollTypeKey> = (
    input: HandlerInput,
    ctx: HandlerContext,
) => HandlerOutput<K>;

const notImplemented = <K extends RollTypeKey>(key: K): Handler<K> =>
    () => {
        throw new Error(`Roll handler not implemented: ${key}`);
    };

const skillItemAttribute = (item: ItemView | undefined): string | null =>
    item?.attribute ? item.attribute.toLowerCase() : null;

const skillHandler: Handler<'skill'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
});

const skillDodgeHandler: Handler<'skill-dodge'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
});

const specializationHandler: Handler<'specialization'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
    specSkill: ctx.settings.showSkillSpecialization && ctx.item?.skill ? ctx.item.skill : '',
});

const scaleToDice = (input: HandlerInput, ctx: HandlerContext): number =>
    ctx.settings.diceForScale
        ? getDiceFromScore(input.scale ?? 0, ctx.settings.pipsPerDice).dice
        : 0;

const damageHandler: Handler<'damage'> = () => ({});
const mortallyWoundedHandler: Handler<'mortally_wounded'> = () => ({});
const incapacitatedHandler: Handler<'incapacitated'> = () => ({});

const resistanceHandler: Handler<'resistance'> = (input, ctx) => ({
    scaledice: scaleToDice(input, ctx),
});

const resistanceVehicleToughnessHandler: Handler<'resistance-vehicletoughness'> = (input, ctx) => {
    const vehicleUuid =
        ctx.actor.type === 'vehicle' || ctx.actor.type === 'starship'
            ? ctx.actor.uuid
            : ctx.actor.vehicle?.uuid ?? '';
    return {
        scaledice: scaleToDice(input, ctx),
        vehicle: vehicleUuid,
    };
};

export const HANDLERS = {
    'weapon': notImplemented('weapon'),
    'starship-weapon': notImplemented('starship-weapon'),
    'vehicle-weapon': notImplemented('vehicle-weapon'),

    'action-meleeattack': notImplemented('action-meleeattack'),
    'action-brawlattack': notImplemented('action-brawlattack'),
    'action-rangedattack': notImplemented('action-rangedattack'),
    'action-vehiclerangedattack': notImplemented('action-vehiclerangedattack'),
    'action-vehiclerangedweaponattack': notImplemented('action-vehiclerangedweaponattack'),
    'action-vehicleramattack': notImplemented('action-vehicleramattack'),
    'action-attribute': notImplemented('action-attribute'),
    'action-other': notImplemented('action-other'),

    'skill': skillHandler,
    'skill-dodge': skillDodgeHandler,
    'specialization': specializationHandler,

    'damage': damageHandler,
    'resistance': resistanceHandler,
    'resistance-vehicletoughness': resistanceVehicleToughnessHandler,

    'mortally_wounded': mortallyWoundedHandler,
    'incapacitated': incapacitatedHandler,

    'funds': notImplemented('funds'),
    'purchase': notImplemented('purchase'),

    'brawlattack': notImplemented('brawlattack'),
    'attribute': notImplemented('attribute'),
} as const satisfies { [K in RollTypeKey]: Handler<K> };
