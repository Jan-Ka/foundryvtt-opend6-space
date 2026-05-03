/**
 * Roll execution: builds roll string, executes roll, processes results, creates chat messages.
 */
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-difficulty";
import {applyDifficultyModifiers} from "./difficulty-math";
import {isCharacterActor, isVehicleActor, isSkillItem, isSpecializationItem, isWeaponItem} from "../../system/type-guards";
import type {Modifier} from "./difficulty-math";
import type {RollData, RollMessageFlags, DiceValue} from "./roll-data";
import {computeHighHitDamage, computeWildDieReduction, resolveRollMode} from "./roll-execute-math";
import {debug} from "../../system/logger";

export async function executeRollAction(rollData: RollData): Promise<unknown> {
    const actor = rollData.actor
    let rollMin = 0;
    let rollString: string;
    let cpString;
    let targetName;
    let targetId;
    let targetType;
    let damageScore = rollData.stun ? rollData.stundamagescore : rollData.damagescore;
    let damageType = rollData.stun ? rollData.stundamagetype : rollData.damagetype;
    let baseDamage;
    let strModDice;
    let doUpdate = false;

    rollData.score = parseInt(rollData.score as unknown as string);

    let baseAttackDifficulty = 10;

    if(rollData.subtype?.includes('attack')) {
        if(rollData.subtype === 'rangedattack') {
            baseAttackDifficulty = OD6S.baseRangedAttackDifficulty;
        } else if(rollData.subtype === 'meleeattack') {
            baseAttackDifficulty = OD6S.baseMeleeAttackDifficulty;
        } else if(rollData.subtype === 'brawlattack') {
            baseAttackDifficulty = OD6S.baseBrawlAttackDifficulty;
        }
    }

    let difficulty;

    if (isCharacterActor(actor)) {
        strModDice = od6sutilities.getDiceFromScore(actor.system.strengthdamage.score);
    }

    rollData.isknown = true;
    const rollMode: string = resolveRollMode({
        explicit: typeof rollData.rollmode === "string" ? rollData.rollmode : null,
        isGM: !!game.user.isGM,
        hideGmRolls: !!game.settings.get('od6s', 'hide-gm-rolls'),
    });
    if (rollData.fatepoint) {
        rollData.dice = (+rollData.originaldice * 2);
        rollData.pips = (+rollData.originalpips * 2);
        await actor.setFlag('od6s', 'fatepointeffect', true)
    }

    if (rollData.scaledice < 0) {
        rollData.otherpenalty += rollData.scaledice;
    }

    if (rollData.type === "resistance" && game.settings.get('od6s','dice_for_scale')) {
        rollData.dice = (+rollData.dice)+(+rollData.scaledice);
    }

    // Subtract Penalties
    rollData.dice = (+rollData.dice) - (+rollData.actionpenalty) -
        (+rollData.woundpenalty) -
        (+rollData.stunnedpenalty) -
        (+rollData.otherpenalty);

    // Wild die explodes on a 6
    if (rollData.wilddie) {
        rollData.dice = (+rollData.dice) - 1;
        if (rollData.dice === 0) {
            rollString = "1dw" + game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
        } else if (rollData.dice <= 0) {
            rollString = '';
        } else {
            rollString = rollData.dice + "d6" + game.i18n.localize("OD6S.BASE_DIE_FLAVOR") + "+1dw" +
                game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
        }
    } else {
        if (rollData.dice <= 0) {
            rollString = ''
        } else {
            rollString = rollData.dice + "d6" + game.i18n.localize("OD6S.BASE_DIE_FLAVOR");
        }
    }

    if (rollData.pips > 0) {
        rollString += "+" + rollData.pips;
    }

    if (rollData.characterpoints > 0) {
        cpString = "+" + rollData.characterpoints + "db"
            + game.i18n.localize("OD6S.CHARACTER_POINT_DIE_FLAVOR");
        rollString += cpString;
    }

    if (rollData.bonusdice > 0) {
        rollString += "+" + rollData.bonusdice + "d6" + game.i18n.localize("OD6S.BONUS_DIE_FLAVOR");
    }
    if (rollData.bonuspips > 0) {
        rollString += "+" + rollData.bonuspips;
    }

    // Apply costs (character points / fate points only exist on character actors)
    const charSys = actor.system as OD6SCharacterSystem;
    if (isCharacterActor(actor)) {
        if ((rollData.characterpoints > 0) && (actor.system.characterpoints.value > 0)) {
            doUpdate = true;
            actor.system.characterpoints.value -= rollData.characterpoints;
        }

        if (rollData.fatepoint && (actor.system.fatepoints.value > 0)) {
            doUpdate = true;
            actor.system.fatepoints.value -= 1;
        }
    }

    if (typeof (rollData.target) !== 'undefined') {
        targetName = rollData.target.name;
        targetId = rollData.target.id;
        targetType = rollData.target.actor.type;
    }

    if (rollData.difficulty) {
        difficulty = rollData.difficulty;
    } else {
        difficulty = await getDifficulty(rollData);
    }
    const baseDifficulty = difficulty;
    const modifiers = applyDifficultyEffects(rollData);

    if (rollData.difficultylevel === 'OD6S.DIFFICULTY_UNKNOWN') {
        rollData.isvisible = false;
        rollData.isknown = false;
    }

    if (game.settings.get('od6s', 'hide-skill-cards')) {
        rollData.isknown = false;
    }

    if (rollData.subtype === 'dodge' || rollData.subtype === 'parry' || rollData.subtype === 'block') {
        rollData.isknown = true;
        rollData.isvisible = true;
    }

    const baseForLog = difficulty;
    difficulty = applyDifficultyModifiers(difficulty, modifiers);
    debug('rolls', 'final difficulty', {
        roll: rollData.label,
        base: baseForLog,
        modifiers: modifiers.map((m: Modifier) => `${m.name}=${m.value}`),
        final: difficulty,
    });

    if (rollData.subtype === 'brawlattack') {
        damageScore = charSys.strengthdamage.score;
        damageType = 'p';
    }

    baseDamage = damageScore;
    const damageEffects = applyDamageEffects(rollData);
    rollData.damagemodifiers = rollData.damagemodifiers.concat(damageEffects);

    if (typeof (rollData.damagemodifiers) !== 'undefined' && rollData.damagemodifiers.length) {
        rollData.damagemodifiers.forEach((d: Modifier) => {
            if (d.name === game.i18n.localize("OD6S.SCALE")) {
                if (game.settings.get('od6s', 'dice_for_scale')) {
                    damageScore = (+damageScore) + (d.value);
                }
            } else {
                if (rollData.actor.getFlag('od6s', 'fatepointeffect') &&
                    d.name === 'OD6S.STRENGTH_DAMAGE_BONUS') {
                    // noop
                } else {
                    damageScore = (+damageScore) + (d.value);
                }
            }
        })
    }

    let damageDice = od6sutilities.getDiceFromScore(damageScore);
    if (rollData.actor.getFlag('od6s', 'fatepointeffect')) {
        const strMod = rollData.damagemodifiers.find((d: Modifier) => d.name === 'OD6S.STRENGTH_DAMAGE_BONUS');
        if (strMod) {
            damageDice.dice = damageDice.dice + strModDice!.dice * 2;
            damageDice.pips = damageDice.pips + strModDice!.pips * 2;
            strModDice!.dice = strModDice!.dice * 2;
            strModDice!.pips = strModDice!.pips * 2;
        }
    }

    if (rollData.subtype === 'vehicleramattack') {
        damageScore = (+damageScore) +
            (+OD6S.vehicle_speeds[rollData.vehiclespeed].damage) +
            (+OD6S.collision_types[rollData.vehiclecollisiontype].score);
        baseDamage = damageScore;
        damageDice = od6sutilities.getDiceFromScore(damageScore);
    }

    if (typeof (rollData.damagemodifiers) !== 'undefined' && rollData.damagemodifiers.length) {
        rollData.damagemodifiers.forEach((d: Modifier) => {
            if (d.pips !== undefined && d.pips > 0) {
                damageDice.pips = damageDice.pips + (+d.pips)
            }
        })
    }

    let scaleBonus = 0;
    for (let i = 0; i < rollData.damagemodifiers.length; i++) {
        if (rollData.damagemodifiers[i].name === game.i18n.localize("OD6S.SCALE")) {
            if (!game.settings.get('od6s', 'dice_for_scale')) {
                scaleBonus = rollData.damagemodifiers[i].value;
            }
        }
    }

    let scaleDice = 0;
    if (game.settings.get('od6s', 'dice_for_scale')) {
        if (rollData.modifiers.scalemod > 0) {
            damageScore = (+damageScore) + (+rollData.modifiers.scalemod);
        } else {
            scaleDice = rollData.scaledice;
        }
    }

    const flags: RollMessageFlags = {
        "rollMode": rollMode,
        "actorId": rollData.actor.id,
        "targetName": targetName,
        "targetId": targetId,
        "targetType": targetType,
        "baseDifficulty": baseDifficulty,
        "difficulty": difficulty,
        "difficultyLevel": rollData.difficultylevel,
        "baseDamage": baseDamage,
        "damageScore": damageScore,
        "damageDice": damageDice,
        "strModDice": strModDice,
        "damageScaleBonus": scaleBonus,
        "damageScaleDice": scaleDice,
        "damageModifiers": rollData.damagemodifiers,
        "damageType": damageType,
        "damageTypeName": OD6S.damageTypes[damageType],
        "stun": rollData.stun,
        "fatepointineffect": rollData.fatepointeffect,
        "isExplosive": rollData.isExplosive,
        "range": rollData.modifiers.range,
        "type": rollData.type,
        "subtype": rollData.subtype ? rollData.subtype : '',
        "multiShot": rollData.multishot,
        "modifiers": modifiers,
        "isEditable": true,
        "editing": false,
        "isVisible": rollData.isvisible,
        "isKnown": rollData.isknown,
        "isOpposable": rollData.isoppasable,
        "wild": false,
        "wildHandled": false,
        "wildResult": OD6S.wildDieResult[OD6S.wildDieOneDefault],
        "canUseCp": rollData.canusecp,
        "specSkill": rollData.specSkill,
        "vehicle": rollData.vehicle,
        "vehiclespeed": rollData.vehiclespeed,
        "vehicleterraindifficulty": rollData.vehicleterraindifficulty,
        "source": rollData.source,
        "location": "",
        "seller": rollData.seller,
        "purchasedItem": '',
        "itemId": rollData.itemid ? rollData.itemid : "",
        "attackerScale": rollData.attackerScale
    }

    if (rollData.itemid) {
        const item = rollData.actor.items.get(rollData.itemid);
        const hasAttributes = isCharacterActor(rollData.actor) || isVehicleActor(rollData.actor);
        if (typeof (item) !== 'undefined') {
            if (isSpecializationItem(item)) {
                const skill = rollData.actor.items.find((i: Item) => i.name === item.system.skill);
                if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                    if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                        rollMin = od6sutilities.getDiceFromScore(item.system.score +
                            rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                    }
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (isSkillItem(item)) {
                if ((item.system.min === true || String(item.system.min).toLowerCase() === 'true') && hasAttributes) {
                    rollMin = od6sutilities.getDiceFromScore(item.system.score +
                        rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (isWeaponItem(item)) {
                let found = false;
                const stats = item.system.stats;
                if (typeof (stats.specialization) !== 'undefined' &&
                    stats.specialization !== 'null' && stats.specialization !== '') {
                    const spec = rollData.actor.items.find((i: Item) => i.type === 'specialization' && i.name === stats.specialization);
                    if (spec !== undefined && spec.name !== '' && isSpecializationItem(spec)) {
                        found = true;
                        const skill = rollData.actor.items.find((i: Item) => i.name === spec.system.skill);
                        if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                            if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                                rollMin = od6sutilities.getDiceFromScore(spec.system.score +
                                    rollData.actor.system.attributes[skill.system.attribute].score).dice * OD6S.pipsPerDice;
                            }
                            if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                                await spec.update({'system.used.value': true});
                            }
                        }
                    }
                }

                if (!found && typeof (stats.skill) !== 'undefined' &&
                    stats.skill !== 'null' && stats.skill !== '') {
                    const skill = rollData.actor.items.find((i: Item) => i.name === stats.skill);
                    if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                        if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                            rollMin = od6sutilities.getDiceFromScore(skill.system.score +
                                rollData.actor.system.attributes[skill.system.attribute].score).dice * OD6S.pipsPerDice;
                        }
                        if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                            await skill.update({'system.used.value': true});
                        }
                    }
                }
            }
        }
        if (rollMin > 0) {
            rollString = "max(" + rollString + "," + rollMin + ")";
        }
    }

    if (rollData.isExplosive) {
        flags.showButton = true;
        if(!game.settings.get('od6s', 'explosive_end_of_round')) {
            flags.triggered = true;
        }
        if(game.settings.get('od6s','auto_explosive')
            && !game.settings.get('od6s','explosive_end_of_round')) {
            flags.targets = await od6sutilities.getExplosiveTargets(
                rollData.actor.isToken ? rollData.actor.token.actor : rollData.actor, rollData.itemid
            )
        }
    }

    // Let's roll!
    if (rollString === '') {
        ui.notifications.warn(game.i18n.localize('OD6S.ZERO_DICE'));
        return;
    }

    const roll = await new Roll(rollString).evaluate();

    let label;
    if (OD6S.showSkillSpecialization && rollData.specSkill !== '') {
        label = rollData.label ? `${game.i18n.localize('OD6S.ROLLING')} ${rollData.specSkill}: ${rollData.label}` : '';
    } else {
        label = rollData.label ? `${game.i18n.localize('OD6S.ROLLING')} ${rollData.label}` : '';
    }

    if (typeof (rollData.vehicle) !== 'undefined' && rollData.vehicle !== ''
        && (rollData.actor.type !== 'vehicle' && rollData.actor.type !== 'starship')) {
        const vehicle = await od6sutilities.getActorFromUuid(rollData.vehicle);
        label = label + " " + game.i18n.localize('OD6S.FOR') + " " + vehicle!.name;
    }

    let useWildDie;

    if(!game.settings.get('od6s', 'use_wild_die')) {
        useWildDie = false;
    } else {
        if(!rollData.wilddie) {
            useWildDie = rollData.wilddie;
        } else {
            useWildDie = rollData.actor.system.use_wild_die;
        }
    }

    if (useWildDie && rollMin < 1) {
        const wildFlavor = game.i18n.localize('OD6S.WILD_DIE_FLAVOR').replace(/[[\]]/g, "");
        const wildTerm = (roll.terms as Array<{ flavor?: string; total?: number }>).find(d => d.flavor === wildFlavor);
        if (wildTerm?.total === 1) {
            flags.wild = true;
            if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) {
                flags.wildHandled = true;
            }
        } else {
            flags.wild = false;
        }
    }

    flags.success = roll.total >= difficulty;
    flags.total = roll.total;
    flags.stun = rollData.stun;

    if (OD6S.randomHitLocations && flags.success) {
        flags.location = OD6S.hitLocations[roll.total.toString().slice(-1)];
    }

    if (rollData.actor.type === 'character' && OD6S.highHitDamage && flags.success) {
        const { extra, asPips } = computeHighHitDamage({
            rollTotal: roll.total,
            difficulty,
            multiplier: OD6S.highHitDamageMultiplier,
            roundDown: OD6S.highHitDamageRound,
            asPips: !OD6S.highHitDamagePipsOrDice,
        });
        if (asPips) {
            flags.damageModifiers.push({ "name": 'OD6S.HIGH_HIT_DAMAGE', "value": 0, "pips": extra });
            flags.damageDice.pips += extra;
        } else {
            flags.damageModifiers.push({ "name": 'OD6S.HIGH_HIT_DAMAGE', "value": extra, "pips": 0 });
            flags.damageDice.dice += extra;
        }
    }

    if (rollData.modifiers.calledshot && flags.success) {
        switch (rollData.modifiers.calledshot) {
            case 'OD6S.CALLED_SHOT_NONE':
            case 'OD6S.CALLED_SHOT_LARGE':
            case 'OD6S.CALLED_SHOT_MEDIUM':
            case 'OD6S.CALLED_SHOT_SMALL':
                flags.location = "";
                break;
            default:
                flags.location = rollData.modifiers.calledshot;
        }

    }
    if (rollMin > 0) {
        label = label + " (" + game.i18n.localize('OD6S.SKILL_MINIMUM') + ": " + rollMin + ")";
    }

    const rollMessage = await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: actor}),
            flavor: label,
            flags: {od6s: flags}
        },
        {rollMode, create: true}
    );

    if (flags.wild === true && parseInt(OD6S.wildDieOneDefault) === 2 && parseInt(OD6S.wildDieOneAuto) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
        const { discardedIndex, newTotal } = computeWildDieReduction(
            replacementRoll.terms[0].results,
            replacementRoll.total,
        );
        replacementRoll.terms[0].results[discardedIndex].discarded = true;
        replacementRoll.terms[0].results[discardedIndex].active = false;
        replacementRoll.total = newTotal;
        flags.total = replacementRoll.total;
        const rollMessageUpdate: { content?: number; rolls?: unknown[]; flags?: { od6s?: Partial<RollMessageFlags> } } = {};
        rollMessageUpdate.content = replacementRoll.total;
        rollMessageUpdate.rolls = rollMessage.rolls;
        rollMessageUpdate.rolls[0] = replacementRoll;
        rollMessageUpdate.flags = {};
        rollMessageUpdate.flags.od6s = {};
        const newSuccess = replacementRoll.total >= rollMessage.getFlag('od6s', 'difficulty')

        if (game.user.isGM) {
            if (rollMessage.getFlag('od6s', 'difficulty') && rollMessage.getFlag('od6s', 'success')) {
                rollMessageUpdate.flags.od6s.success = newSuccess;
            }
            rollMessageUpdate.flags.od6s.originalroll = rollMessage.rolls[0];
            rollMessageUpdate.flags.od6s.wildHandled = true;
            await rollMessage.update(rollMessageUpdate);
        } else {
            game.socket.emit('system.od6s', {
                operation: 'updateRollMessage',
                message: rollMessage,
                update: rollMessageUpdate
            })
        }

        if (rollData.type === 'incapacitated' && !newSuccess && flags.success) {
            await rollData.actor.applyIncapacitatedFailure();
        }

        if (rollData.type === 'mortally_wounded' && !newSuccess && flags.success) {
            await rollData.actor.applyMortallyWoundedFailure();
        }
    }

    if(rollData.isExplosive) {
        const item = rollData.actor.items.find((i: Item) => i.id === rollData.itemid);
        const origin = item!.getFlag('od6s', 'explosiveOrigin');
        const regionId = item!.getFlag('od6s', 'explosiveTemplate');
        const region = canvas.scene.getEmbeddedDocument('Region', regionId);
        if (region) {
            await region.setFlag('od6s','message', rollMessage.id);

            if(rollData.actor.isToken) {
                await region.setFlag('od6s','token', rollData.actor.token.id);
            } else {
                await region.setFlag('od6s','token', '');
            }
        }
        if (game.settings.get('od6s', 'auto_explosive') && region) {
            await region.setFlag('od6s', 'originalOwner', game.user.id);
            await region.setFlag('od6s', 'templateId', rollMessage._id);

            if (!flags.success) {
                await od6sutilities.scatterExplosive(rollData.range, origin, regionId);
                await od6sutilities.wait(100);
                const newTargets = await od6sutilities.getExplosiveTargets(rollData.actor, rollData.itemid);
                if (Object.keys(newTargets).length === 0) {
                    await rollMessage.unsetFlag('od6s', 'showButton');
                    await rollMessage.setFlag('od6s', 'showButton', false);
                }
                await rollMessage.unsetFlag('od6s', 'targets');
                await rollMessage.setFlag('od6s', 'targets', newTargets);
                await od6sutilities.wait(100);
            }
        }
        if (region && !game.settings.get('od6s', 'explosive_end_of_round')) {
            await region.update({ visibility: 2 });
        }
        if (game.settings.get('od6s', 'auto_explosive')) {
            await item?.unsetFlag('od6s', 'explosiveSet');
            await item?.unsetFlag('od6s', 'explosiveTemplate');
            await item?.unsetFlag('od6s', 'explosiveOrigin');
            await item?.unsetFlag('od6s', 'explosiveRange');
        }
    }

    if (rollData.subtype === 'dodge' || rollData.subtype === 'parry' || rollData.subtype === 'block') {
        doUpdate = true;
        if (rollData.fulldefense) {
            charSys[rollData.subtype].score = (+(flags.total ?? 0) + baseAttackDifficulty);
        } else {
            charSys[rollData.subtype].score = +(flags.total ?? 0);
        }
    }

    if (rollData.subtype === 'vehicledodge') {
        let vehicle: Actor | null | undefined;
        if (rollData.actor.type === 'vehicle' || rollData.actor.type === 'starship') {
            vehicle = rollData.actor;
        } else {
            vehicle = await od6sutilities.getActorFromUuid(charSys.vehicle.uuid);
        }
        const dodgeScore = rollData.fulldefense
            ? (+roll.total + baseAttackDifficulty)
            : (+roll.total);
        const vehicleUpdate: { system: { dodge: { score: number } }; flags?: { od6s?: { dodge_actor?: string } } } = {
            system: { dodge: { score: dodgeScore } },
        };
        if (!game.settings.get("od6s", "reaction_skills")) {
            vehicleUpdate.flags = { od6s: { dodge_actor: actor.uuid } };
        }

        if (game.user.isGM) {
            await vehicle?.update(vehicleUpdate);
        } else {
            await OD6S.socket.executeAsGM('updateVehicle', charSys.vehicle.uuid, vehicleUpdate);
        }
    }

    if (doUpdate) {
        const update = {
            system: {
                fatepoints: charSys.fatepoints,
                characterpoints: charSys.characterpoints,
                dodge: { score: charSys.dodge.score },
                parry: { score: charSys.parry.score },
                block: { score: charSys.block.score },
            },
        };
        await actor.update(update);
    }

    if (!rollMessage.getFlag('od6s', 'wildHandled')) {
        if (rollData.type === 'incapacitated' && !rollMessage.getFlag('od6s', 'success')) {
            await rollData.actor.applyIncapacitatedFailure();
        }

        if (rollData.type === 'mortally_wounded' && !rollMessage.getFlag('od6s', 'success')) {
            await rollData.actor.applyMortallyWoundedFailure();
        }
    }

    if (rollData.subtype === 'purchase') {
        await rollMessage.setFlag('od6s', 'purchasedItem', rollData.itemid);
    }

    if (rollData.subtype === 'purchase' && rollMessage.getFlag('od6s', 'success')) {
        if (!rollMessage.getFlag('od6s', 'wild')) {
            const seller = game.actors.get(rollData.seller);
            seller!.sheet._onPurchase(rollData.itemid, rollData.actor.id);
        } else if (rollMessage.getFlag('od6s', 'wildHandled')) {
            const seller = game.actors.get(rollData.seller);
            await seller!.sheet._onPurchase(rollData.itemid, rollData.actor.id);
        }
    }
    await actor.render();
    return await game.messages.render();
}
