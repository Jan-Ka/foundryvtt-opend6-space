/**
 * Roll setup: assembles the rollData object from event/actor/item data and opens the dialog.
 */
import {od6sutilities} from "../../system/utilities";
import ExplosiveDialog from "../explosive-dialog";
import OD6S from "../../config/config-od6s";
import {cancelAction, getEffectMod} from "./roll-effects";
import {isCharacterActor, isVehicleActor, isSkillItem} from "../../system/type-guards";
import {bucketRangeFromDistance} from "./difficulty-math";
import type {Modifier} from "./difficulty-math";
import type {IncomingRollData, RollData, DiceValue} from "./roll-data";
import {
    applyWeaponMods,
    buildDamagedWeaponModifier,
    buildStrengthDamageModifier,
    computeStunFlags,
    ramAttackContribution,
} from "./weapon-context-math";
import {computePenalties, isPenaltyBypassType, resolveSkillBackedAction} from "./action-math";

/**
 * Returns the "vehicle data" carried by an actor regardless of host type:
 * for vehicle/starship actors it's `system` itself; for character actors
 * it's the embedded `system.vehicle` field. The shape is loosely typed
 * because the two sources only partially overlap at runtime.
 */
function selectVehicleData(actor: Actor): {
    uuid?: string;
    scale?: { score: number };
    ram?: { score: number };
    ram_damage?: { score: number };
    ranged?: { score?: number };
    vehicle_weapons?: Item[];
} {
    if (actor.type === 'vehicle' || actor.type === 'starship') {
        return actor.system as never;
    }
    return (actor.system as OD6SCharacterSystem).vehicle as never;
}

export async function setupRollData(data: IncomingRollData): Promise<RollData | false> {
    let attribute;
    let range = "OD6S.RANGE_POINT_BLANK_SHORT";
    let woundPenalty;
    let damageType = '';
    let damageScore = 0;
    let stunDamageType = '';
    let stunDamageScore = 0;
    const damageModifiers: Modifier[] = [];
    const targets: Token[] = [];
    let difficulty = 0;
    let isAttack = false;
    let isVisible = false;
    let isOpposable = false;
    let difficultyLevel = game.settings.get('od6s','default_unknown_difficulty') ? 'OD6S.DIFFICULTY_UNKNOWN' : 'OD6S.DIFFICULTY_EASY';
    let bonusmod = 0;
    let bonusdice: DiceValue = { dice: 0, pips: 0 };
    let penaltydice = 0;
    let miscMod = 0;
    let scaleMod = 0;
    let scaleDice = 0;
    let canUseCp = true;
    let canUseFp = true;
    let vehicle = '';
    let vehicleTerrainDifficulty = 'OD6S.DIFFICULTY_EASY';
    let damageSource = '';
    let attackerScale = 0;
    let defenderScale;
    let flatPips = 0;
    let specSkill = '';
    let isExplosive = false;
    let canStun = false;
    let onlyStun = false;
    const actorToken = data.actor.isToken ? data.actor.token.object : data.actor.getActiveTokens()[0];

    if (typeof(data.itemId) !== 'undefined' && data.itemId !== '') {
        let item = data.actor.items.get(data.itemId);
        if(typeof(item) === 'undefined') {
            if (data.type === 'action' && data.subtype === 'vehiclerangedweaponattack') {
                item = (data.actor.system as OD6SCharacterSystem).vehicle.vehicle_weapons!.find((i: any) =>i.id === data.itemId);
            }
        }
        if ((item?.system as OD6SWeaponItemSystem | undefined)?.subtype?.toLowerCase() === 'explosive') {
            isExplosive = true;
            if (!item!.getFlag('od6s','explosiveSet')) {
                const exdata = {
                    options: OD6S.explosives,
                    item: item!,
                    actor: data.actor,
                    type: 'OD6S.EXPLOSIVE_THROWN',
                    auto: game.settings.get('od6s', 'auto_explosive'),
                };

                await new ExplosiveDialog(exdata).render({force: true});
                return false;
            }
        }
    }

    if (typeof (data.flatpips) !== 'undefined' && data.flatpips > 0) {
        flatPips = data.flatpips;
    }

    if ((data.type === 'funds' || data.type === 'purchase') && !OD6S.fundsFate) {
        canUseCp = false;
        canUseFp = false;
    }

    if (OD6S.vehicleDifficulty) {
        vehicleTerrainDifficulty = 'OD6S.TERRAIN_EASY';
    }

    if ((typeof (data.subtype) !== 'undefined' && data.subtype.includes('vehicle'))
        || data.type.includes('vehicle')) {
        if (data.actor.type === 'vehicle' || data.actor.type === 'starship') {
            vehicle = data.actor.uuid;
        } else {
            vehicle = (data.actor.system as OD6SCharacterSystem).vehicle.uuid;
        }
    }

    if (typeof (data.difficulty) !== 'undefined') {
        difficulty = data.difficulty;
    }

    if (typeof (data.difficultyLevel) !== 'undefined') {
        difficultyLevel = data.difficultyLevel;
    }

    if (data.actor.system.sheetmode.value !== "normal") {
        ui.notifications.warn(game.i18n.localize("OD6S.WARN_SHEET_MODE_NOT_NORMAL"));
        return false;
    }

    if (data.subtype === game.i18n.localize('OD6S.RANGED') ||
        data.subtype === game.i18n.localize('OD6S.THROWN') ||
        data.subtype === game.i18n.localize('OD6S.MISSILE') ||
        data.subtype === game.i18n.localize('OD6S.EXPLOSIVE')) {
        data.subtype = "rangedattack";
        isAttack = true;
    }

    if (data.subtype === game.i18n.localize('OD6S.MELEE')) {
        data.subtype = "meleeattack"
        isAttack = true;
    }

    game.user?.targets?.forEach((t: Token) => targets.push(t));

    if (data.subtype === 'meleeattack' || data.subtype === 'brawlattack') {
        if (targets.length > 0 && OD6S.meleeRange) {
            const actorToken = data.actor.getActiveTokens()[0];
            const fudge = Math.floor((((actorToken.width + targets[0].width)/canvas.grid.size) * 0.5) - 1);
            const distance = Math.floor(canvas.grid.measurePath([actorToken.center, targets[0].center]).distance) - fudge;
            if(distance !== 0 && distance/canvas.grid.distance > 1.5) {
                ui.notifications.warn(game.i18n.localize('OD6S.OUT_OF_MELEE_BRAWL_RANGE'));
                return false;
            }
        }
    }

    // See if this is a weapon attack
    if (data.type === 'weapon' || data.type === 'starship-weapon' || data.type === 'vehicle-weapon') {
        const weapon = data.actor.getEmbeddedDocument('Item', data.itemId ?? '');
        damageSource = weapon.name;
        damageType = weapon.system.damage.type;
        damageScore = weapon.system.damage.score;
        stunDamageType = weapon.system?.stun?.type;
        stunDamageScore = weapon.system?.stun?.score;
        isAttack = true;
        if (data.subtype === 'meleeattack') {
            damageScore = od6sutilities.getMeleeDamage(data.actor, weapon);
            if (stunDamageScore > 0) {
                stunDamageScore = weapon.system.damage.str ? stunDamageScore + (data.actor.system as OD6SCharacterSystem).strengthdamage.score : stunDamageScore;
            }
        }
        if (weapon.system.scale.score) attackerScale = weapon.system.scale.score;
        ({damageScore, miscMod, bonusmod} = applyWeaponMods(
            {damageScore, miscMod, bonusmod},
            weapon.system.mods,
        ));

        if (OD6S.meleeDifficulty) {
            weapon.system.difficulty ? difficultyLevel = weapon.system.difficulty : difficultyLevel = 'OD6S.DIFFICULTY_EASY';
        }

        ({onlyStun, canStun} = computeStunFlags({
            stunOnly: weapon.system.stun?.stun_only,
            weaponStunScore: weapon.system.stun?.score ?? 0,
            isExplosive,
            explosiveZonesEnabled: Boolean(game.settings.get('od6s', 'explosive_zones')),
            blastZone1StunDamage: weapon.system.blast_radius?.["1"]?.stun_damage ?? 0,
        }));

        if(data.subtype === 'rangedattack') {
            data.range = await od6sutilities.getWeaponRange(data.actor, weapon) as typeof data.range;
            if (data.range === false) return false;
        } else {
            data.range = weapon.system.range as typeof data.range;
        }

        const damagedMod = buildDamagedWeaponModifier(weapon.system.damaged, OD6S.weaponDamage);
        if (damagedMod) damageModifiers.push(damagedMod);

        if (weapon.system.damage.muscle) {
            damageModifiers.push(buildStrengthDamageModifier(
                (data.actor.system as OD6SCharacterSystem).strengthdamage.score,
            ));
        }

        // Check for effect modifiers
        const stats = weapon.system.stats
        let found = false;
        if (typeof (stats.specialization) !== 'undefined' && stats.specialization !== '') {
            if (data.actor.items.filter((i: Item) => i.type === 'specialization' && i.name === stats.specialization)) {
                bonusmod += (+getEffectMod('specialization', stats.specialization, data.actor));
                found = true;
            }
        }

        if (!found && typeof (stats.skill) !== 'undefined' && stats.skill !== '') {
            if (data.actor.items.filter((i: Item) => i.type === 'skill' && i.name === stats.skill)) {
                bonusmod += (+getEffectMod('skill', stats.skill, data.actor));
            }
        }
    }

    if (data.subtype === 'vehiclerangedweaponattack') {
        let vehicleWeapon: Item | undefined;
        if (isVehicleActor(data.actor)) {
            if (data.actor.system.embedded_pilot?.value) {
                vehicleWeapon = data.actor.items.filter((i: Item) => i._id === data.itemId)[0];
            } else if (data.actor.type === 'vehicle') {
                vehicleWeapon = (data.actor as any).vehicle_weapons.filter((i: Item) => i._id === data.itemId)[0];
            } else {
                vehicleWeapon = (data.actor as any).starship_weapons.filter((i: Item) => i._id === data.itemId)[0];
            }
        } else if (isCharacterActor(data.actor)) {
            vehicleWeapon = data.actor.system.vehicle.vehicle_weapons?.filter((i: Item) => i.id === data.itemId)[0];
        }

        isAttack = true;
        if (typeof (vehicleWeapon) !== 'undefined') {
            const vwSys = vehicleWeapon.system as OD6SVehicleWeaponItemSystem;
            damageScore = vwSys.damage.score;
            damageType = vwSys.damage.type;
            ({damageScore, miscMod, bonusmod} = applyWeaponMods(
                {damageScore, miscMod, bonusmod},
                vwSys.mods,
            ));
            attackerScale = vwSys.scale.score
                ? vwSys.scale.score
                : selectVehicleData(data.actor).scale?.score ?? 0;
        } else if (isCharacterActor(data.actor)) {
            damageScore = data.damage ?? 0;
            damageType = data.damage_type ?? '';
            attackerScale = data.actor.system.vehicle.scale!.score;
        }
        damageSource = data.name;
    }

    if (data.subtype === 'vehicleramattack') {
        damageType = 'p';
        damageSource = 'OD6S.COLLISION';
        isAttack = true;
        const vehicleData = selectVehicleData(data.actor);
        const ram = ramAttackContribution(
            vehicleData.ram?.score ?? 0,
            vehicleData.ram_damage?.score ?? 0,
        );
        if (ram.modifier) damageModifiers.push(ram.modifier);
        bonusmod += ram.bonusModIncrement;
    }

    if ((data.type === 'brawlattack' || data.subtype === 'brawlattack') && isCharacterActor(data.actor)) {
        damageType = 'p';
        damageScore = data.actor.system.strengthdamage.score;
        isAttack = true;
        canStun = true;
        stunDamageScore = damageScore;
        stunDamageType = 'p';
    }

    if (data.type === 'vehicletoughness') {
        canUseCp = canUseFp = false;
        data.subtype = data.type;
        data.type = 'resistance';
    }

    if (targets.length === 1) {
        if (!attackerScale && isAttack) {
            if (data.subtype !== undefined && data.subtype.includes('vehicle')) {
                attackerScale = selectVehicleData(data.actor).scale?.score ?? 0;
            } else {
                attackerScale = data.actor.system.scale.score ?? 0;
            }
        }

        if (typeof (targets[0].actor.system.scale.score) === 'undefined') {
            defenderScale = 0;
        } else {
            defenderScale = targets[0].actor.system.scale.score;
        }
        if (attackerScale !== defenderScale) {
            scaleMod = attackerScale - defenderScale;
        }
    }

    if (data.type === 'action') {
        let skill: Item | undefined;
        switch (data.subtype) {
            case 'vehicletoughness':
                canUseCp = canUseFp = false;
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                data.type = 'resistance';
                break;
            case 'attribute':
                data.score = data.actor.system.attributes[data.attribute!].score;
                isVisible = !game.settings.get('od6s', 'hide-skill-cards');
                break;
            case 'vehiclerangedattack':
                data.score = data.actor.system.attributes.mec.score;
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            case 'vehiclerangedweaponattack':
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            case 'vehicleramattack':
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            case 'rangedattack':
                data.score = data.actor.system.attributes.agi.score;
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            case 'meleeattack': {
                skill = data.actor.items.find((i: Item) => i.type === 'skill'
                    && i.name === game.i18n.localize('OD6S.MELEE_COMBAT'));
                const resolved = resolveSkillBackedAction({
                    skill: (skill !== undefined && isSkillItem(skill) && isCharacterActor(data.actor))
                        ? {score: skill.system.score, attributeKey: skill.system.attribute.toLowerCase()}
                        : null,
                    attributes: data.actor.system.attributes,
                    flatSkills: OD6S.flatSkills,
                    fallbackAttributeKey: 'agi',
                });
                data.score = resolved.score;
                if (resolved.flatPips !== undefined) flatPips = resolved.flatPips;
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            }
            case 'brawlattack': {
                skill = data.actor.items.find((i: Item) => i.type === 'skill'
                    && i.name === game.i18n.localize('OD6S.BRAWL'));
                const resolved = resolveSkillBackedAction({
                    skill: (skill !== undefined && isSkillItem(skill) && isCharacterActor(data.actor))
                        ? {score: skill.system.score, attributeKey: skill.system.attribute.toLowerCase()}
                        : null,
                    attributes: data.actor.system.attributes,
                    flatSkills: OD6S.flatSkills,
                    fallbackAttributeKey: game.settings.get('od6s', 'brawl_attribute'),
                });
                data.score = resolved.score;
                if (resolved.flatPips !== undefined) flatPips = resolved.flatPips;
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
                break;
            }
            case '':
                if (data.name === game.i18n.localize('OD6S.ENERGY_RESISTANCE') ||
                    data.name === game.i18n.localize('OD6S.PHYSICAL_RESISTANCE') ||
                    data.name === game.i18n.localize('OD6S.RESISTANCE_NO_ARMOR')) {
                    data.type = 'resistance';
                }
                isVisible = !game.settings.get('od6s', 'hide-combat-cards');
        }
    }

    let rollValues = od6sutilities.getDiceFromScore(data.score);

    const penalties = computePenalties({
        rollType: data.type,
        actionItemCount: data.actor.itemTypes.action.length,
        stunsCurrent: isCharacterActor(data.actor) ? (data.actor.system.stuns.current ?? 0) : 0,
        woundPenalty: isPenaltyBypassType(data.type) ? 0 : od6sutilities.getWoundPenalty(data.actor),
    });
    woundPenalty = penalties.woundPenalty;
    const actionPenalty = penalties.actionPenalty;
    const stunnedPenalty = penalties.stunnedPenalty;
    if (penalties.isBypass) isVisible = true;

    if (data.type === 'funds') {
        isVisible = !game.settings.get('od6s', 'hide-skill-cards');
    }

    if (data.score < OD6S.pipsPerDice && !(OD6S.flatSkills && (data.type === 'skill' || data.type === 'specialization'))) {
        ui.notifications.warn(game.i18n.localize("OD6S.SCORE_TOO_LOW"));
        if (isExplosive) await cancelAction({ ...data, isExplosive, itemid: data.itemId } as unknown as RollData);
        return false;
    }

    if (data.type === 'skill' && data.name === 'Dodge') {
        data.subtype = 'dodge';
    }

    if ((data.type === 'skill') || (data.type === 'specialization')) {
        isVisible = !game.settings.get('od6s', 'hide-skill-cards');
        attribute = (data.actor.items.filter((i: Item) => i.id === data.itemId)[0].system as OD6SSkillItemSystem).attribute.toLowerCase();
        if (typeof (attribute) === 'undefined') {
            attribute = null;
        } else {
            if (OD6S.flatSkills) {
                const attributeValues = od6sutilities.getDiceFromScore(data.actor.system.attributes[attribute].score);
                if (attributeValues.dice === 0) {
                    ui.notifications.warn(game.i18n.localize("OD6S.SCORE_TOO_LOW"));
                    return false;
                }
                rollValues.dice = (+attributeValues.dice);
                rollValues.pips = (+attributeValues.pips);
            }
        }
    } else {
        attribute = null;
    }

    // See if there are any effects that should add a bonus to a skill roll
    if (data.type === 'skill') {
        const skillName = data.actor.items.filter((i: Item) => i.id === data.itemId)[0].name;
        bonusmod += (+getEffectMod('skill', skillName, data.actor));
    }

    if (data.type === 'specialization') {
        const specName = data.actor.items.filter((i: Item) => i.id === data.itemId)[0].name;
        bonusmod += (+getEffectMod('specialization', specName, data.actor));
    }

    let fatepointeffect = false;

    if (data.actor.getFlag('od6s', 'fatepointeffect') && canUseFp) {
        rollValues.dice = (+rollValues.dice) * 2;
        rollValues.pips = (+rollValues.pips) * 2;
        fatepointeffect = true;
    }

    if (data.subtype === 'parry' && data.type === 'weapon') {
        data.name = data.name + " " + game.i18n.localize('OD6S.PARRY');
    }

    const canOppose =  ['skill', 'attribute', 'specialization', 'damage', 'resistance', 'toughness'];
    if (canOppose.includes(data.type)) isOpposable = true;
    if (data.type === 'action' && canOppose.includes(data.subtype ?? '')) isOpposable = true;

    if (data.type === 'action' &&
        data.subtype === "meleeattack" &&
        data.name === game.i18n.localize('OD6S.ACTION_MELEE_ATTACK')) {
        miscMod += 5;
        damageScore = (data.actor.system as OD6SCharacterSystem).strengthdamage.score;
    }

    if (data.subtype === 'rangedattack' ||
        data.subtype === 'vehiclerangedattack' ||
        data.subtype === 'vehiclerangedweaponattack') {
        range = "OD6S.RANGE_SHORT_SHORT";

        const rangeDifficulty = game.settings.get('od6s', 'map_range_to_difficulty');
        if (targets.length === 1 || (isExplosive && game.settings.get('od6s','auto_explosive'))) {
            if (data.itemId) {
                const item = data.actor.items.get(data.itemId);
                if (typeof (data.token) !== 'undefined' && data.token !== '') {
                    let distance;
                    if (isExplosive) {
                        distance = item?.getFlag('od6s', 'explosiveRange');
                    } else {
                        distance = Math.floor(canvas.grid.measurePath([(actorToken as Token).center, targets[0].center]).distance);
                    }
                    const rangeConfig = data.range as { short: number; medium: number; long: number };
                    const bucket = bucketRangeFromDistance(distance, rangeConfig, rangeDifficulty);
                    if (bucket === null) {
                        if (isExplosive) {
                            const regionId = item?.getFlag('od6s', 'explosiveTemplate');
                            if (regionId) {
                                const region = canvas.scene.getEmbeddedDocument('Region', regionId);
                                if (region) {
                                    await canvas.scene.deleteEmbeddedDocuments('Region', [regionId]);
                                }
                                await item?.unsetFlag('od6s', 'explosiveSet');
                                await item?.unsetFlag('od6s', 'explosiveTemplate');
                                await item?.unsetFlag('od6s', 'explosiveRange');
                            }
                        }
                        ui.notifications.warn(game.i18n.localize('OD6S.OUT_OF_RANGE'));
                        return false;
                    }
                    range = bucket.range;
                    if (bucket.difficultyLevel !== null) difficultyLevel = bucket.difficultyLevel;
                }
            }
        }

        if (data.subtype.startsWith('vehicle')) {
            const vehSys = data.actor.system as OD6SVehicleSystem;
            const charSys = data.actor.system as OD6SCharacterSystem & { vehicle: { ranged?: { score?: number } } };
            if (vehSys?.embedded_pilot?.value && typeof ((vehSys?.ranged as OD6SScoreField)?.score) !== 'undefined') {
                bonusmod += (+(vehSys.ranged as OD6SScoreField).score);
            } else if (typeof (charSys?.vehicle?.ranged?.score) !== 'undefined') {
                bonusmod += (+charSys.vehicle.ranged.score);
            }
        } else {
            bonusmod += (+(data.actor.system.ranged as OD6SModField).mod);
        }
    }

    if (data.subtype === 'vehicleramattack') {
        const vehicleData = selectVehicleData(data.actor);
        if (vehicleData.ram?.score !== undefined) {
            bonusmod += vehicleData.ram.score;
        }
    }

    if (isCharacterActor(data.actor)) {
        const charSys = data.actor.system;
        if (data.subtype === 'meleeattack') {
            bonusmod += charSys.melee.mod;
        }
        if (data.subtype === 'brawlattack') {
            bonusmod += charSys.brawl.mod;
            canStun = true;
            damageScore = charSys.strengthdamage.score;
            stunDamageScore = damageScore;
            stunDamageType = 'p';
        }
        if (data.subtype === 'dodge') bonusmod += charSys.dodge.mod;
        if (data.subtype === 'parry') bonusmod += charSys.parry.mod;
        if (data.subtype === 'block') bonusmod += charSys.block.mod;
    }

    if (OD6S.flatSkills) {
        bonusdice.dice = 0;
        bonusdice.pips = (+bonusmod);
    } else {
        bonusdice = od6sutilities.getDiceFromScore(bonusmod);
    }

    if (od6sutilities.getScoreFromDice(bonusdice.dice, bonusdice.pips) < 0) {
        penaltydice = bonusdice.dice * -1;
        bonusdice.dice = 0;
        bonusdice.pips = 0;
    }

    if (OD6S.flatSkills && flatPips === 0 && (data.type === 'skill' || data.type === 'specialization')) {
        bonusdice.pips = (+bonusdice.pips) + (+data.score);
    } else if (OD6S.flatSkills && flatPips > 0) {
        bonusdice.pips = (+bonusdice.pips) + (+flatPips);
    }

    if (isAttack) {
        isVisible = !game.settings.get('od6s', 'hide-combat-cards');
        if (game.settings.get('od6s', 'dice_for_scale')) {
            if (scaleMod < 0) {
                data.score = data.score + (scaleMod * -1);
                scaleDice = od6sutilities.getDiceFromScore(scaleMod).dice * -1;
                rollValues.dice = (+rollValues.dice) + (+scaleDice);
            }
        }
    }

    if (data.type === 'specialization' || data.type === 'weapon') {
        if (OD6S.showSkillSpecialization) {
            const item = data.actor.items.get(data.itemId!);
            if (typeof (item) !== 'undefined') {
                if (item.type === 'specialization') {
                    specSkill = (item.system as OD6SSpecializationItemSystem).skill;
                } else {
                    const wsys = item.system as OD6SWeaponItemSystem;
                    if (data.name === wsys.stats.specialization) {
                        specSkill = wsys.stats.skill;
                    }
                }
            }
        }
    }

    if (data.type === 'damage') {
        if (data.itemId) {
            const item = data.actor.items.get(data.itemId);
            const wsys = item?.system as OD6SWeaponItemSystem | undefined;
            if (wsys && wsys.damaged > 0) {
                const score = od6sutilities.getScoreFromDice(rollValues.dice, rollValues.pips) - OD6S.weaponDamage[wsys.damaged].penalty;
                rollValues.dice = od6sutilities.getDiceFromScore(score).dice;
                rollValues.pips = od6sutilities.getDiceFromScore(score).pips;
            }
        }
    }

    let seller = '';
    if (data.type === 'purchase') {
        seller = data.seller ?? '';
        data.type = 'funds';
        data.subtype = 'purchase';
    }

    if(data.type === 'resistance') {
        if (game.settings.get('od6s', 'dice_for_scale')) {
            if (typeof(data.scale) === 'undefined' || data.scale === null) {
                data.scale = 0;
            }
            scaleMod = data.scale;
            scaleDice = od6sutilities.getDiceFromScore(data.scale).dice;
        }
    }

    if(data.actor.system.roll_mod !== 0) {
        data.score = (+data.score) + (+data.actor.system.roll_mod);
        rollValues = od6sutilities.getDiceFromScore(data.score);
    }

    return {
        label: data.name,
        title: data.name,
        dice: rollValues.dice,
        pips: rollValues.pips,
        specSkill: specSkill,
        originaldice: rollValues.dice,
        originalpips: rollValues.pips,
        score: data.score,
        wilddie: game.settings.get('od6s', 'use_wild_die') && data.actor.system.use_wild_die,
        showWildDie: game.settings.get('od6s', 'use_wild_die'),
        canusefp: canUseFp,
        fatepoint: Boolean(false),
        fatepointeffect: fatepointeffect,
        characterpoints: 0,
        canusecp: canUseCp,
        contact: false,
        cpcost: 0,
        cpcostcolor: "black",
        bonusdice: bonusdice.dice,
        bonuspips: bonusdice.pips,
        isvisible: isVisible,
        isknown: false,
        isExplosive: isExplosive,
        type: data.type,
        subtype: data.subtype ?? '',
        attribute: attribute,
        actor: data.actor,
        token: actorToken as Token | undefined,
        actionpenalty: actionPenalty,
        woundpenalty: woundPenalty,
        stunnedpenalty: stunnedPenalty,
        otherpenalty: penaltydice,
        multishot: false,
        shots: 1,
        fulldefense: false,
        itemid: data.itemId ?? '',
        targets: targets,
        target: targets[0],
        timer: 0,
        damagetype: damageType,
        damagescore: damageScore,
        stundamagetype: stunDamageType,
        stundamagescore: stunDamageScore,
        damagemodifiers: damageModifiers,
        difficultylevel: difficultyLevel,
        isoppasable: isOpposable,
        difficulty: difficulty,
        scaledice: scaleDice,
        seller: seller,
        vehicle: vehicle,
        vehiclespeed: 'cruise',
        vehiclecollisiontype: 't_bone',
        vehicleterraindifficulty: vehicleTerrainDifficulty,
        source: damageSource,
        range: range,
        template: "systems/od6s/templates/roll.html",
        only_stun: onlyStun,
        can_stun: canStun,
        stun: onlyStun,
        attackerScale: attackerScale,
        modifiers: {
            range: range,
            attackoption: 'OD6S.ATTACK_STANDARD',
            calledshot: '',
            cover: '',
            coverlight: '',
            coversmoke: '',
            miscmod: miscMod,
            scalemod: scaleMod
        }
    };
}
