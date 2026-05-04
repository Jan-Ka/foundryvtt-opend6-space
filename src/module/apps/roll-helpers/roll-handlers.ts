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

import type { ClassifiedRoll, Localize, RollData, RollTypeKey } from './roll-data';
import type { ROLL_TYPE_FIELDS } from './roll-type-fields';

export type HandlerOutput<K extends RollTypeKey> =
    Pick<RollData, (typeof ROLL_TYPE_FIELDS)[K][number]>;

/**
 * Read-only narrowed view of an actor for handler consumption. Empty by
 * design — fields are added as Phase 2 handlers need them, so the surface
 * stays a tight reflection of actual rules dependencies rather than a
 * Foundry-shaped god object.
 */
export interface ActorView {
    type: 'character' | 'npc' | 'vehicle' | 'starship';
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
}

export interface HandlerContext {
    actor: ActorView;
    item?: ItemView;
    targets: ReadonlyArray<TargetView>;
    settings: RollSettingsView;
    localize: Localize;
}

export type Handler<K extends RollTypeKey> = (
    input: ClassifiedRoll,
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

    'damage': notImplemented('damage'),
    'resistance': notImplemented('resistance'),
    'resistance-vehicletoughness': notImplemented('resistance-vehicletoughness'),

    'mortally_wounded': notImplemented('mortally_wounded'),
    'incapacitated': notImplemented('incapacitated'),

    'funds': notImplemented('funds'),
    'purchase': notImplemented('purchase'),

    'brawlattack': notImplemented('brawlattack'),
    'attribute': notImplemented('attribute'),
} as const satisfies { [K in RollTypeKey]: Handler<K> };
