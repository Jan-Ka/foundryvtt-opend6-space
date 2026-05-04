/**
 * Roll setup orchestrator (#98 phase 3d cutover).
 *
 * Replaces the legacy 650-line `setupRollData` with a thin coordinator over
 * the rules pipeline:
 *
 *   1. preflight                — Foundry-coupled cancellation gates
 *   2. classifyRoll             — type/subtype → RollTypeKey
 *   3. adaptContext + pre-resolve actionSkill / vehicleStats
 *   4. HANDLERS[key]            — pure typed bucket
 *   5. score gate (with explosive cleanup)
 *   6. orchestrator-side accumulation: bonusmod (14 sites), miscMod, scaleMod
 *   7. range bucketing for ranged subtypes (with explosive cleanup on out-of-range)
 *   8. roll_mod, damaged-weapon penalty, flatSkills attribute swap, fatepointeffect
 *   9. runFinalize              — typed bucket + COMMON inputs → RollData
 *
 * RFC fixes applied during cutover:
 *   - #100: +5 magic constant on action-meleeattack removed (no rules backing).
 *   - #103: vehicleramattack `ram.score` added once (legacy added it twice).
 *   - #104: attackerScale derives unconditionally from actor for attack rolls
 *           with no targets (legacy left attackerScale=0).
 *   - Audit A: fatepointeffect doubling routed through FinalizeInput.diceMultiplier
 *              so damaged / roll_mod re-derives can't overwrite it.
 *   - Phase 0 cleanup: legacy `'toughness'` in canOppose was already gone in
 *     finalize; legacy top-level `brawlattack` RollTypeKey removed (no
 *     caller produces type='brawlattack'; Actor.rollAction wraps brawl as
 *     `{type:'action', subtype:'brawlattack'}` which routes to action-brawlattack).
 */

import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {cancelAction, getEffectMod} from "./roll-effects";
import {isCharacterActor} from "../../system/type-guards";
import {bucketRangeFromDistance, flatSkillBonusPips, splitBonusForPenalty} from "./difficulty-math";
import type {IncomingRollData, RollData, ClassifiedRoll, RollTypeKey} from "./roll-data";
import {classifyRoll} from "./roll-data";
import {applyWeaponMods} from "./weapon-context-math";
import {computePenalties, isPenaltyBypassType, resolveSkillBackedAction} from "./action-math";
import type {ActionResolution} from "./action-math";
import {runPreflight} from "./roll-preflight";
import {adaptContext} from "./roll-context-adapter";
import type {RollSettingsRaw} from "./roll-context-adapter";
import {HANDLERS} from "./roll-handlers";
import type {HandlerContext, HandlerInput} from "./roll-handlers";
import {runFinalize} from "./roll-finalize";

/**
 * Roll-type keys whose rolls get the `dice_for_scale` negative-scaleMod dice
 * adjustment (Audit D enumeration).
 */
const ATTACK_KEYS: ReadonlySet<RollTypeKey> = new Set<RollTypeKey>([
    'weapon', 'starship-weapon', 'vehicle-weapon',
    'action-brawlattack',
    'action-vehicleramattack',
    'action-vehiclerangedweaponattack',
]);

const RANGED_BUCKETING_SUBTYPES = new Set([
    'rangedattack', 'vehiclerangedattack', 'vehiclerangedweaponattack',
]);

function readSettings(): RollSettingsRaw {
    return {
        defaultUnknownDifficulty: !!game.settings.get('od6s', 'default_unknown_difficulty'),
        diceForScale: !!game.settings.get('od6s', 'dice_for_scale'),
        fundsFate: !!OD6S.fundsFate,
        hideCombatCards: !!game.settings.get('od6s', 'hide-combat-cards'),
        hideSkillCards: !!game.settings.get('od6s', 'hide-skill-cards'),
        showSkillSpecialization: !!OD6S.showSkillSpecialization,
        pipsPerDice: OD6S.pipsPerDice,
        meleeDifficulty: !!OD6S.meleeDifficulty,
        explosiveZones: !!game.settings.get('od6s', 'explosive_zones'),
        weaponDamageTable: OD6S.weaponDamage,
        flatSkills: !!OD6S.flatSkills,
        brawlAttribute: game.settings.get('od6s', 'brawl_attribute') as string,
    };
}

/**
 * Resolve the source item for handler dispatch. Mirrors the legacy boundary
 * resolver: standard items.get on the actor; for character-piloted vehicle
 * weapon attacks, fall back to the embedded `vehicle.vehicle_weapons` array.
 */
function resolveItemForDispatch(data: IncomingRollData): Item | undefined {
    if (!data.itemId) return undefined;
    let item = data.actor.items.get(data.itemId);
    if (!item
        && data.type === 'action'
        && data.subtype === 'vehiclerangedweaponattack'
        && isCharacterActor(data.actor)) {
        item = data.actor.system.vehicle.vehicle_weapons
            ?.find((i: { id?: string }) => i.id === data.itemId);
    }
    return item;
}

function resolveVehicleStatsForCharacter(actor: Actor): HandlerContext['vehicleStats'] {
    if (!isCharacterActor(actor)) return undefined;
    const v = actor.system.vehicle as {
        scale?: { score: number };
        ram?: { score: number };
        ram_damage?: { score: number };
    } | undefined;
    if (!v) return undefined;
    return {
        scale: v.scale ? { score: +v.scale.score } : undefined,
        ram: v.ram ? { score: +v.ram.score } : undefined,
        ram_damage: v.ram_damage ? { score: +v.ram_damage.score } : undefined,
    };
}

/**
 * Build the `actionSkillResolved` bucket for action-meleeattack /
 * action-brawlattack at the boundary. Audit E: pre-resolving here means
 * `flatPips` is available for COMMON-side bonusdice without re-running
 * `resolveSkillBackedAction` inside the handler.
 */
function preResolveActionSkill(
    data: IncomingRollData,
    classified: ClassifiedRoll,
    settings: RollSettingsRaw,
): ActionResolution | undefined {
    if (classified.key !== 'action-meleeattack' && classified.key !== 'action-brawlattack') {
        return undefined;
    }
    if (!isCharacterActor(data.actor)) return { score: 0 };

    const skillName = classified.key === 'action-meleeattack'
        ? game.i18n.localize('OD6S.MELEE_COMBAT')
        : game.i18n.localize('OD6S.BRAWL');
    const fallback = classified.key === 'action-meleeattack'
        ? 'agi'
        : (game.settings.get('od6s', 'brawl_attribute') as string);

    const skillItem = data.actor.items.find(
        (i: Item) => i.type === 'skill' && i.name === skillName,
    );
    const sysAttrs: Record<string, { score: number }> = {};
    const rawAttrs = (data.actor.system as { attributes?: Record<string, { score: number }> }).attributes ?? {};
    for (const [k, v] of Object.entries(rawAttrs)) {
        sysAttrs[k] = { score: +v.score };
    }

    const skillSys = skillItem ? (skillItem.system as OD6SSkillItemSystem) : null;
    return resolveSkillBackedAction({
        skill: skillSys
            ? { score: skillSys.score, attributeKey: skillSys.attribute.toLowerCase() }
            : null,
        attributes: sysAttrs,
        flatSkills: settings.flatSkills,
        fallbackAttributeKey: fallback,
    });
}

function deriveVisibility(
    key: RollTypeKey,
    settings: RollSettingsRaw,
    isBypass: boolean,
): boolean {
    if (isBypass) return true;
    switch (key) {
        case 'skill': case 'skill-dodge': case 'specialization':
        case 'funds': case 'purchase': case 'action-attribute':
            return !settings.hideSkillCards;
        case 'weapon': case 'starship-weapon': case 'vehicle-weapon':
        case 'action-meleeattack': case 'action-brawlattack':
        case 'action-rangedattack': case 'action-vehiclerangedattack':
        case 'action-vehiclerangedweaponattack': case 'action-vehicleramattack':
        case 'action-other':
            return !settings.hideCombatCards;
        default:
            return false;
    }
}

function deriveCanUseFpCp(
    key: RollTypeKey,
    settings: RollSettingsRaw,
): { canUseFp: boolean; canUseCp: boolean } {
    if (key === 'resistance-vehicletoughness') return { canUseFp: false, canUseCp: false };
    if ((key === 'funds' || key === 'purchase') && !settings.fundsFate) {
        return { canUseFp: false, canUseCp: false };
    }
    return { canUseFp: true, canUseCp: true };
}

export async function setupRollData(data: IncomingRollData): Promise<RollData | false> {
    if (!(await runPreflight(data))) return false;

    const localize = game.i18n.localize.bind(game.i18n);
    const settings = readSettings();
    const classified = classifyRoll(data, localize);

    const item = resolveItemForDispatch(data);
    const isExplosive = !!item
        && (item.system as OD6SWeaponItemSystem | undefined)?.subtype?.toLowerCase() === 'explosive';

    // For weapon-typed rolls with a localized ranged subtype alias (RANGED /
    // THROWN / MISSILE / EXPLOSIVE), getWeaponRange resolves the per-roll
    // range table and may cancel via false (e.g., out-of-ammo dialog).
    let weaponRangeTable: { short: number; medium: number; long: number } | undefined;
    if (item && (data.type === 'weapon' || data.type === 'starship-weapon' || data.type === 'vehicle-weapon')) {
        const isRangedAlias = data.subtype === 'rangedattack'
            || data.subtype === game.i18n.localize('OD6S.RANGED')
            || data.subtype === game.i18n.localize('OD6S.THROWN')
            || data.subtype === game.i18n.localize('OD6S.MISSILE')
            || data.subtype === game.i18n.localize('OD6S.EXPLOSIVE');
        if (isRangedAlias) {
            const r = await od6sutilities.getWeaponRange(data.actor, item);
            if (r === false) return false;
            weaponRangeTable = r as typeof weaponRangeTable;
        } else {
            weaponRangeTable = (item.system as OD6SWeaponItemSystem).range as unknown as typeof weaponRangeTable;
        }
    } else if (item && classified.key === 'action-vehiclerangedweaponattack') {
        const sys = item.system as { range?: typeof weaponRangeTable };
        weaponRangeTable = sys.range;
    }

    const actorToken = data.actor.isToken ? data.actor.token.object : data.actor.getActiveTokens()[0];
    const targets: Token[] = [];
    game.user?.targets?.forEach((t: Token) => targets.push(t));

    // Boundary projection (sets `actor`, `item`, `targets`, `settings`, `localize`).
    const ctxBase = adaptContext(
        { type: data.actor.type, uuid: data.actor.uuid, system: data.actor.system },
        item ? { type: item.type, name: item.name, system: item.system } : undefined,
        { settings, localize, canvasTargets: targets },
    );
    const ctx: HandlerContext = {
        ...ctxBase,
        actionSkillResolved: preResolveActionSkill(data, classified, settings),
        vehicleStats: resolveVehicleStatsForCharacter(data.actor),
    };

    const { actor: _omitActor, ...dataNoActor } = data;
    void _omitActor;
    const handlerInput: HandlerInput = { ...dataNoActor, classified };

    const bucket = HANDLERS[classified.key](handlerInput, ctx);

    // ---- Score resolution ----
    const bucketAny = bucket as Partial<RollData>;
    const workingScore = bucketAny.score ?? data.score;

    const flatSkillsBypass = settings.flatSkills
        && (classified.type === 'skill' || classified.type === 'specialization');
    if (workingScore < settings.pipsPerDice && !flatSkillsBypass) {
        ui.notifications.warn(game.i18n.localize("OD6S.SCORE_TOO_LOW"));
        if (isExplosive) {
            await cancelAction({ ...data, isExplosive, itemid: data.itemId } as unknown as RollData);
        }
        return false;
    }

    // ---- bonusmod / miscMod accumulation (orchestrator-side) ----
    let bonusmod = 0;
    let miscMod = 0;

    // Weapon family: weapon mod difficulty / attack land on miscMod / bonusmod
    // (handler already folded `damage` into bucket.damagescore via the same
    // helper — applyWeaponMods is run twice but discarded outputs differ, so no
    // double-fold happens).
    if (item && (classified.type === 'weapon' || classified.type === 'starship-weapon' || classified.type === 'vehicle-weapon')) {
        const wsys = item.system as OD6SWeaponItemSystem;
        const folded = applyWeaponMods({ damageScore: 0, miscMod, bonusmod }, wsys.mods);
        miscMod = folded.miscMod;
        bonusmod = folded.bonusmod;

        const stats = wsys.stats;
        const ownsSpec = !!stats?.specialization
            && data.actor.items.some((i: Item) => i.type === 'specialization' && i.name === stats.specialization);
        const ownsSkill = !!stats?.skill
            && data.actor.items.some((i: Item) => i.type === 'skill' && i.name === stats.skill);
        if (ownsSpec) {
            bonusmod += +getEffectMod('specialization', stats.specialization!, data.actor);
        } else if (ownsSkill) {
            bonusmod += +getEffectMod('skill', stats.skill!, data.actor);
        }
    }

    if (item && classified.key === 'action-vehiclerangedweaponattack') {
        const wsys = item.system as OD6SVehicleWeaponItemSystem;
        const folded = applyWeaponMods({ damageScore: 0, miscMod, bonusmod }, wsys.mods);
        miscMod = folded.miscMod;
        bonusmod = folded.bonusmod;
    }

    if (classified.type === 'skill' && item) {
        bonusmod += +getEffectMod('skill', item.name ?? '', data.actor);
    }
    if (classified.type === 'specialization' && item) {
        bonusmod += +getEffectMod('specialization', item.name ?? '', data.actor);
    }

    if (isCharacterActor(data.actor)) {
        const c = data.actor.system;
        if (data.subtype === 'meleeattack') bonusmod += c.melee.mod;
        if (data.subtype === 'brawlattack') bonusmod += c.brawl.mod;
        if (data.subtype === 'dodge') bonusmod += c.dodge.mod;
        if (data.subtype === 'parry') bonusmod += c.parry.mod;
        if (data.subtype === 'block') bonusmod += c.block.mod;
    }

    // Ranged-attack bonus: vehicle's ranged.score for vehicle-piloted paths,
    // actor.system.ranged.mod for personal ranged.
    const isRangedSubtype = data.subtype === 'rangedattack'
        || data.subtype === 'vehiclerangedattack'
        || data.subtype === 'vehiclerangedweaponattack';
    if (isRangedSubtype) {
        if (data.subtype && data.subtype.startsWith('vehicle')) {
            const vehSys = data.actor.system as OD6SVehicleSystem;
            const charSys = data.actor.system as OD6SCharacterSystem & {
                vehicle: { ranged?: { score?: number } };
            };
            if (vehSys?.embedded_pilot?.value && typeof ((vehSys?.ranged as OD6SScoreField)?.score) !== 'undefined') {
                bonusmod += +(vehSys.ranged as OD6SScoreField).score;
            } else if (typeof (charSys?.vehicle?.ranged?.score) !== 'undefined') {
                bonusmod += +charSys.vehicle.ranged.score;
            }
        } else {
            bonusmod += +(data.actor.system.ranged as OD6SModField).mod;
        }
    }

    // RFC #103: vehicleramattack adds ram.score ONCE (legacy added at lines
    // 245 and 487 — same condition twice).
    if (classified.key === 'action-vehicleramattack') {
        const vehicleData = isCharacterActor(data.actor)
            ? (data.actor.system.vehicle as { ram?: { score?: number } })
            : (data.actor.system as { ram?: { score?: number } });
        if (typeof vehicleData?.ram?.score === 'number') {
            bonusmod += vehicleData.ram.score;
        }
    }

    // ---- attackerScale / scaleMod ----
    // RFC #104: derive attackerScale from the actor unconditionally for attack
    // rolls (legacy gated on `targets.length === 1 && isAttack`, leaving
    // attackerScale=0 for no-target attacks).
    const isAttackRoll = ATTACK_KEYS.has(classified.key)
        || (isRangedSubtype && (classified.type === 'weapon' || classified.type === 'starship-weapon' || classified.type === 'vehicle-weapon'))
        || classified.key === 'action-rangedattack'
        || classified.key === 'action-vehiclerangedattack'
        || classified.key === 'action-meleeattack';

    let attackerScale: number;
    if (typeof bucketAny.attackerScale === 'number' && bucketAny.attackerScale !== 0) {
        attackerScale = bucketAny.attackerScale;
    } else if (isAttackRoll) {
        const isVehicleSubtype = data.subtype !== undefined && data.subtype.includes('vehicle');
        if (isVehicleSubtype) {
            attackerScale = (data.actor.type === 'vehicle' || data.actor.type === 'starship')
                ? +((data.actor.system as { scale?: { score?: number } }).scale?.score ?? 0)
                : +(((data.actor.system as OD6SCharacterSystem).vehicle?.scale as { score?: number } | undefined)?.score ?? 0);
        } else {
            attackerScale = +(((data.actor.system as { scale?: { score?: number } }).scale?.score) ?? 0);
        }
    } else {
        attackerScale = bucketAny.attackerScale ?? 0;
    }

    let scaleMod = 0;
    if (targets.length === 1) {
        const defenderScale = +((targets[0].actor.system as { scale?: { score?: number } }).scale?.score ?? 0);
        if (attackerScale !== defenderScale) {
            scaleMod = attackerScale - defenderScale;
        }
    }

    // ---- Range bucketing (orchestrator-side) ----
    let rangeLabel: string = (typeof bucketAny.range === 'string' ? bucketAny.range : undefined)
        ?? 'OD6S.RANGE_POINT_BLANK_SHORT';
    let difficultyLevel: string = bucketAny.difficultylevel
        ?? data.difficultyLevel
        ?? (settings.defaultUnknownDifficulty ? 'OD6S.DIFFICULTY_UNKNOWN' : 'OD6S.DIFFICULTY_EASY');

    if (RANGED_BUCKETING_SUBTYPES.has(data.subtype ?? '')) {
        rangeLabel = 'OD6S.RANGE_SHORT_SHORT';
        const rangeDifficulty = !!game.settings.get('od6s', 'map_range_to_difficulty');
        const autoExplosive = !!game.settings.get('od6s', 'auto_explosive');
        const wantsBucket = (targets.length === 1 || (isExplosive && autoExplosive))
            && !!data.itemId
            && typeof data.token !== 'undefined' && data.token !== ''
            && !!weaponRangeTable;
        if (wantsBucket) {
            let distance: number | undefined;
            if (isExplosive) {
                distance = item?.getFlag('od6s', 'explosiveRange') as number | undefined;
            } else {
                distance = Math.floor(canvas.grid.measurePath([(actorToken as Token).center, targets[0].center]).distance);
            }
            if (typeof distance === 'number') {
                const bucketRange = bucketRangeFromDistance(distance, weaponRangeTable!, rangeDifficulty);
                if (bucketRange === null) {
                    if (isExplosive && item) {
                        const regionId = item.getFlag('od6s', 'explosiveTemplate') as string | undefined;
                        if (regionId) {
                            try { await canvas.scene.deleteEmbeddedDocuments('Region', [regionId]); } catch {/* region already gone */}
                            await item.unsetFlag('od6s', 'explosiveSet');
                            await item.unsetFlag('od6s', 'explosiveTemplate');
                            await item.unsetFlag('od6s', 'explosiveRange');
                        }
                    }
                    ui.notifications.warn(game.i18n.localize('OD6S.OUT_OF_RANGE'));
                    return false;
                }
                rangeLabel = bucketRange.range;
                if (bucketRange.difficultyLevel !== null) difficultyLevel = bucketRange.difficultyLevel;
            }
        }
    }

    // ---- Score adjustments after dispatch: scale / roll_mod / damaged ----
    let scaleDice = 0;
    let workingScoreForFinalize = workingScore;

    if (classified.type === 'resistance' && settings.diceForScale) {
        const sc = data.scale ?? 0;
        scaleMod = sc;
        scaleDice = od6sutilities.getDiceFromScore(sc).dice;
    } else if (isAttackRoll && settings.diceForScale && scaleMod < 0) {
        // Attacker-smaller: bump score, negative scaleDice flows into otherpenalty.
        workingScoreForFinalize = workingScore + (scaleMod * -1);
        scaleDice = od6sutilities.getDiceFromScore(scaleMod).dice * -1;
    }

    if (data.actor.system.roll_mod !== 0) {
        workingScoreForFinalize = workingScoreForFinalize + (+data.actor.system.roll_mod);
    }

    if (classified.type === 'damage' && item) {
        const wsys = item.system as OD6SWeaponItemSystem | undefined;
        if (wsys && wsys.damaged > 0) {
            workingScoreForFinalize -= OD6S.weaponDamage[wsys.damaged].penalty;
        }
    }

    // Flat-skills attribute swap-in for skill / specialization rolls: dice
    // come from the parent attribute, not the skill score.
    let flatPips = 0;
    if (typeof data.flatpips !== 'undefined' && data.flatpips > 0) flatPips = data.flatpips;
    if (ctx.actionSkillResolved?.flatPips !== undefined) flatPips = ctx.actionSkillResolved.flatPips;

    if ((classified.type === 'skill' || classified.type === 'specialization')
        && settings.flatSkills
        && bucketAny.attribute) {
        const attrKey = bucketAny.attribute as string;
        const attrScore = +((data.actor.system as { attributes?: Record<string, { score?: number }> })
            .attributes?.[attrKey]?.score ?? 0);
        const attrValues = od6sutilities.getDiceFromScore(attrScore);
        if (attrValues.dice === 0) {
            ui.notifications.warn(game.i18n.localize("OD6S.SCORE_TOO_LOW"));
            return false;
        }
        // Score for finalize becomes attribute score (+ roll_mod once).
        workingScoreForFinalize = attrScore
            + (data.actor.system.roll_mod !== 0 ? +data.actor.system.roll_mod : 0);
    }

    // ---- Penalties ----
    const penalties = computePenalties({
        rollType: classified.type,
        actionItemCount: data.actor.itemTypes.action.length,
        stunsCurrent: isCharacterActor(data.actor) ? (data.actor.system.stuns?.current ?? 0) : 0,
        woundPenalty: isPenaltyBypassType(classified.type)
            ? 0
            : od6sutilities.getWoundPenalty(data.actor),
    });

    // ---- bonusdice / bonuspips / otherPenalty ----
    const bonusBase = settings.flatSkills
        ? { dice: 0, pips: bonusmod }
        : od6sutilities.getDiceFromScore(bonusmod);
    const split = splitBonusForPenalty(bonusBase.dice, bonusBase.pips, settings.pipsPerDice);
    const bonusDice = split.bonusDice;
    let bonusPips = split.bonusPips;
    const otherPenalty = split.penaltyDice;

    if (settings.flatSkills) {
        bonusPips += flatSkillBonusPips(flatPips, workingScore, classified.type);
    }

    // ---- Visibility / FP-CP gating / wild die ----
    const isVisible = deriveVisibility(classified.key, settings, penalties.isBypass);
    const { canUseFp, canUseCp } = deriveCanUseFpCp(classified.key, settings);
    const fatepointEffect = !!data.actor.getFlag('od6s', 'fatepointeffect') && canUseFp;
    const diceMultiplier = fatepointEffect ? 2 : 1;

    // ---- Misc COMMON inputs ----
    let name = data.name;
    if (data.subtype === 'parry' && classified.type === 'weapon') {
        name = `${data.name} ${game.i18n.localize('OD6S.PARRY')}`;
    }
    const vehicleTerrainDifficulty = OD6S.vehicleDifficulty
        ? 'OD6S.TERRAIN_EASY'
        : 'OD6S.DIFFICULTY_EASY';

    const wildDie = !!game.settings.get('od6s', 'use_wild_die')
        && !!(data.actor.system as { use_wild_die?: boolean }).use_wild_die;
    const showWildDie = !!game.settings.get('od6s', 'use_wild_die');

    // ---- Final bucket overrides for orchestrator-derived fields ----
    const bucketWithOverrides: typeof bucket = { ...bucket };
    if ((bucketAny.attackerScale !== undefined) || isAttackRoll) {
        (bucketWithOverrides as Partial<RollData>).attackerScale = attackerScale;
    }
    if (RANGED_BUCKETING_SUBTYPES.has(data.subtype ?? '') || bucketAny.range !== undefined) {
        (bucketWithOverrides as Partial<RollData>).range = rangeLabel;
    }
    if (bucketAny.difficultylevel !== undefined) {
        (bucketWithOverrides as Partial<RollData>).difficultylevel = difficultyLevel;
    }
    if (bucketAny.scaledice !== undefined || classified.type === 'resistance' || isAttackRoll) {
        (bucketWithOverrides as Partial<RollData>).scaledice = scaleDice;
    }
    if (classified.key === 'purchase') {
        (bucketWithOverrides as Partial<RollData>).seller = data.seller ?? '';
    }

    return runFinalize({
        classified,
        score: workingScoreForFinalize,
        name,
        itemId: data.itemId ?? '',
        difficulty: data.difficulty ?? 0,
        difficultyLevel,
        isExplosive,
        isVisible,
        fatepointEffect,
        canUseFp,
        canUseCp,
        wildDie,
        showWildDie,
        penalties,
        otherPenalty,
        bonusDice,
        bonusPips,
        miscMod,
        scaleMod,
        range: rangeLabel,
        vehicleTerrainDifficulty,
        pipsPerDice: settings.pipsPerDice,
        diceMultiplier,
        actorRef: data.actor,
        tokenRef: actorToken,
        targetsRef: targets,
        targetRef: targets[0],
        bucket: bucketWithOverrides,
    });
}
