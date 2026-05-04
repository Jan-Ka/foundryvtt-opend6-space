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
import type { Modifier } from './difficulty-math';
import {
    applyWeaponMods,
    buildDamagedWeaponModifier,
    buildStrengthDamageModifier,
    computeStunFlags,
} from './weapon-context-math';

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
    /** Strength damage score (added to melee damage when weapon.damage.str is set). */
    strengthDamage?: number;
    /** Embedded vehicle reference when the character is piloting one. */
    vehicle?: { uuid: string };
}

export interface NpcActorView {
    type: 'npc';
    uuid: string;
    /** Strength damage score (added to melee damage when weapon.damage.str is set). */
    strengthDamage?: number;
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
    /** Display name of the item. */
    name?: string;
    /** Skill / specialization item: parent attribute key (case-insensitive). */
    attribute?: string;
    /** Specialization item: parent skill name. */
    skill?: string;
    // ---- Weapon item fields ----
    /** Primary damage. `str` = add strength damage in melee; `muscle` = explicit
     *  strength-damage rider on damage modifiers. */
    damage?: { type: string; score: number; str?: boolean; muscle?: boolean };
    /** Stun damage block. `stun_only` forces stun-only mode. */
    stun?: { type?: string; score?: number; stun_only?: boolean };
    /** Per-band range table or `false` when out-of-range was already resolved. */
    range?: { short: number; medium: number; long: number } | false;
    /** Weapon-defined scale (overrides actor scale when set). */
    scale?: { score: number };
    /** Damage state index (0 = pristine, higher = degraded; resolves to a penalty). */
    damaged?: number;
    /** Weapon mod totals — keep open-shaped; resolved by applyWeaponMods. */
    mods?: { dmg?: { score?: number }; misc?: { score?: number }; bonus?: { score?: number } };
    /** Weapon's authored skill/specialization context. */
    stats?: { skill?: string; specialization?: string };
    /** Blast radius for explosives — only zone "1"'s stun damage is read here. */
    blast_radius?: { '1'?: { stun_damage?: number } };
    /** Authored difficulty label override (when meleeDifficulty setting is on). */
    difficulty?: string;
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
    /** When true, weapon-authored difficulty overrides the default for melee. */
    meleeDifficulty: boolean;
    /** When true, explosive zones (multi-radius blasts) are active. */
    explosiveZones: boolean;
    /** Damage state → penalty/label table (system constant from OD6S.weaponDamage). */
    weaponDamageTable: Record<number, { penalty: number; label: string }>;
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

const fundsHandler: Handler<'funds'> = () => ({});
const attributeHandler: Handler<'attribute'> = () => ({});

const purchaseHandler: Handler<'purchase'> = (input) => ({
    seller: input.seller ?? '',
});

/**
 * Top-level `brawlattack` is unreachable in the current code: Actor.rollAction
 * wraps brawl rolls as `{type: 'action', subtype: 'brawlattack'}`, which the
 * classifier routes to action-brawlattack. The classifier still accepts a
 * top-level `brawlattack`, but no caller produces one. Phase 3 removes the
 * key from RollTypeKey entirely; until then this throws to surface any
 * caller that resurrects the path.
 */
const brawlattackDeadPathHandler: Handler<'brawlattack'> = () => {
    throw new Error(
        'brawlattack: unreachable dead path — route brawl rolls through action-brawlattack',
    );
};

const vehicleUuidForActor = (actor: ActorView): string =>
    actor.type === 'vehicle' || actor.type === 'starship'
        ? actor.uuid
        : actor.vehicle?.uuid ?? '';

const characterStrengthDamage = (actor: ActorView): number =>
    (actor.type === 'character' || actor.type === 'npc') ? actor.strengthDamage ?? 0 : 0;

type WeaponBucketCommon = Pick<RollData,
    'damagetype' | 'damagescore' | 'stundamagetype' | 'stundamagescore' |
    'damagemodifiers' | 'source' | 'range' | 'difficultylevel' |
    'only_stun' | 'can_stun' | 'stun' | 'attackerScale' | 'specSkill'
>;

function buildWeaponBucket(input: HandlerInput, ctx: HandlerContext): WeaponBucketCommon {
    const item = ctx.item ?? {} as ItemView;
    const weaponDamageScore = item.damage?.score ?? 0;
    const weaponDamageType = item.damage?.type ?? '';
    const isMelee = input.subtype === 'meleeattack';

    let damagescore = weaponDamageScore;
    let stundamagescore = item.stun?.score ?? 0;
    if (isMelee && item.damage?.str) {
        damagescore = weaponDamageScore + characterStrengthDamage(ctx.actor);
        if (stundamagescore > 0) {
            stundamagescore = stundamagescore + characterStrengthDamage(ctx.actor);
        }
    }

    // applyWeaponMods folds weapon mod totals into damagescore. miscMod and
    // bonusmod also flow through it in the original code but those land on
    // COMMON-side accumulators, so they're discarded here — bucket discipline.
    const modded = applyWeaponMods(
        { damageScore: damagescore, miscMod: 0, bonusmod: 0 },
        {
            damage: item.mods?.dmg?.score ?? 0,
            difficulty: item.mods?.misc?.score ?? 0,
            attack: item.mods?.bonus?.score ?? 0,
        },
    );
    damagescore = modded.damageScore;

    const { onlyStun, canStun } = computeStunFlags({
        stunOnly: item.stun?.stun_only,
        weaponStunScore: item.stun?.score ?? 0,
        isExplosive: false, // explosive preflight is upstream of dispatch
        explosiveZonesEnabled: ctx.settings.explosiveZones,
        blastZone1StunDamage: item.blast_radius?.['1']?.stun_damage ?? 0,
    });

    const damagemodifiers: Modifier[] = [];
    const damagedMod = buildDamagedWeaponModifier(item.damaged ?? 0, ctx.settings.weaponDamageTable);
    if (damagedMod) damagemodifiers.push(damagedMod);
    if (item.damage?.muscle) {
        damagemodifiers.push(buildStrengthDamageModifier(characterStrengthDamage(ctx.actor)));
    }

    const difficultylevel = ctx.settings.meleeDifficulty
        ? (item.difficulty ?? 'OD6S.DIFFICULTY_EASY')
        : 'OD6S.DIFFICULTY_EASY';

    const specSkill =
        ctx.settings.showSkillSpecialization && item.stats?.specialization === input.name
            ? item.stats?.skill ?? ''
            : '';

    return {
        damagetype: weaponDamageType,
        damagescore,
        stundamagetype: item.stun?.type ?? '',
        stundamagescore,
        damagemodifiers,
        source: item.name ?? '',
        // Range LABEL, not the per-band table (which is on input.range). The
        // distance-to-target resolution (via bucketRangeFromDistance) happens
        // downstream — handler emits the rules-default initial label.
        range: input.subtype === 'meleeattack'
            ? 'OD6S.RANGE_POINT_BLANK_SHORT'
            : 'OD6S.RANGE_SHORT_SHORT',
        difficultylevel,
        only_stun: onlyStun,
        can_stun: canStun,
        // `stun` is a legacy duplicate of `only_stun` in RollData. Phase 3 cleanup.
        stun: onlyStun,
        attackerScale: item.scale?.score ?? 0,
        specSkill,
    };
}

const weaponHandler: Handler<'weapon'> = (input, ctx) => buildWeaponBucket(input, ctx);

const starshipWeaponHandler: Handler<'starship-weapon'> = (input, ctx) =>
    buildWeaponBucket(input, ctx);

const vehicleWeaponHandler: Handler<'vehicle-weapon'> = (input, ctx) => ({
    ...buildWeaponBucket(input, ctx),
    vehicle: vehicleUuidForActor(ctx.actor),
});

const resistanceVehicleToughnessHandler: Handler<'resistance-vehicletoughness'> = (input, ctx) => ({
    scaledice: scaleToDice(input, ctx),
    vehicle: vehicleUuidForActor(ctx.actor),
});

export const HANDLERS = {
    'weapon': weaponHandler,
    'starship-weapon': starshipWeaponHandler,
    'vehicle-weapon': vehicleWeaponHandler,

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

    'funds': fundsHandler,
    'purchase': purchaseHandler,

    'brawlattack': brawlattackDeadPathHandler,
    'attribute': attributeHandler,
} as const satisfies { [K in RollTypeKey]: Handler<K> };
