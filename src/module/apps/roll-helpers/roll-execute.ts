/**
 * Roll execution: builds roll string, executes roll, processes results, creates chat messages.
 */
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-difficulty";
import {applyDifficultyModifiers} from "./difficulty-math";
import type {Modifier} from "./difficulty-math";
import type {RollData, RollMessageFlags, DiceValue} from "./roll-data";
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

    if (actor.type !== 'vehicle' && actor.type !== 'starship') {
        strModDice = od6sutilities.getDiceFromScore(rollData.actor.system.strengthdamage.score);
    }

    rollData.isknown = true;
    let rollMode: string = 'roll';
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

    // Apply costs
    if ((rollData.characterpoints > 0) && (actor.system.characterpoints.value > 0)) {
        doUpdate = true;
        actor.system.characterpoints.value -= rollData.characterpoints;
    }

    if (rollData.fatepoint && (actor.system.fatepoints.value > 0)) {
        doUpdate = true;
        actor.system.fatepoints.value -= 1;
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
        damageScore = actor.system.strengthdamage.score;
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
        if (typeof (item) !== 'undefined') {
            if (item.type === 'specialization') {
                const skill = rollData.actor.items.find((i: Item) => i.name === item.system.skill);
                if (typeof (skill) !== 'undefined' && skill.name !== '') {
                    if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                        rollMin = od6sutilities.getDiceFromScore(item.system.score +
                            rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                    }
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (item.type === "skill") {
                if (item.system.min === true || String(item.system.min).toLowerCase() === 'true') {
                    rollMin = od6sutilities.getDiceFromScore(item.system.score +
                        rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (item.type === "weapon") {
                let found = false;
                const itemData = item.system;
                if ( itemData.type === 'specialization' && typeof (itemData.stats.specialization) !== 'undefined' &&
                    itemData.stats.specialization !== 'null' && itemData.stats.specialization !== '') {
                    const spec = rollData.actor.items.find((i: Item) => i.name === itemData.stats.specialization);
                    if (typeof (spec) !== 'undefined' && spec.name !== '') {
                        found = true
                        const skill = rollData.actor.items.find((i: Item) => i.name === spec.system.skill);
                        if (typeof (skill) !== 'undefined' && skill.name !== '') {
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

                if (!found && typeof (itemData.stats.skill) !== 'undefined' &&
                    itemData.stats.skill !== 'null' && itemData.stats.skill !== '') {
                    const skill = rollData.actor.items.find((i: Item) => i.name === itemData.stats.skill);
                    if (typeof (skill) !== 'undefined' && skill.name !== '') {
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
        let extra;
        const difference = roll.total - difficulty;

        if (OD6S.highHitDamageRound) {
            extra = Math.floor(difference / OD6S.highHitDamageMultiplier);
        } else {
            extra = Math.ceil(difference / OD6S.highHitDamageMultiplier);
        }

        if (OD6S.highHitDamagePipsOrDice) {
            flags.damageModifiers.push({
                "name": 'OD6S.HIGH_HIT_DAMAGE',
                "value": extra,
                "pips": 0
            });
            flags.damageDice.dice += extra;
        } else {
            flags.damageModifiers.push({
                "name": 'OD6S.HIGH_HIT_DAMAGE',
                "value": 0,
                "pips": extra
            });
            flags.damageDice.pips += extra;
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

    if (game.user.isGM && game.settings.get('od6s', 'hide-gm-rolls')) {
        rollMode = "gm";
    }
    const rollMessage = await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: actor}),
            flavor: label,
            flags: {od6s: flags}
        },
        {messageMode: rollMode, create: true}
    );

    if (flags.wild === true && parseInt(OD6S.wildDieOneDefault) === 2 && parseInt(OD6S.wildDieOneAuto) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
        let highest = 0;
        for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
            replacementRoll.terms[0].results[i].result >
            replacementRoll.terms[0].results[highest].result ?
                highest = i : {}
        }
        replacementRoll.terms[0].results[highest].discarded = true;
        replacementRoll.terms[0].results[highest].active = false;
        replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result) + 1;
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
            // @ts-expect-error
            await region.setFlag('od6s', 'originalOwner', game.user.owner);
            await region.setFlag('od6s', 'templateId', rollMessage._id);

            if (!flags.success) {
                // @ts-expect-error
                await od6sutilities.scatterExplosive(rollData.range, origin, templateId);
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
        if(!game.settings.get('od6s','explosive_end_of_round')) {
            // @ts-expect-error
            await template.document.update({hidden: false});
        }
    }

    if (rollData.subtype === 'dodge' || rollData.subtype === 'parry' || rollData.subtype === 'block') {
        doUpdate = true;
        if (rollData.fulldefense) {
            actor.system[rollData.subtype].score = (+(flags.total ?? 0) + baseAttackDifficulty);
        } else {
            actor.system[rollData.subtype].score = +(flags.total ?? 0);
        }
    }

    if (rollData.subtype === 'vehicledodge') {
        let vehicle: Actor | null | undefined;
        if (rollData.actor.type === 'vehicle' || rollData.actor.type === 'starship') {
            vehicle = rollData.actor;
        } else {
            vehicle = await od6sutilities.getActorFromUuid(actor.system.vehicle.uuid);
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
            await OD6S.socket.executeAsGM('updateVehicle', actor.system.vehicle.uuid, vehicleUpdate);
        }
    }

    if (doUpdate) {
        const update = {
            system: {
                fatepoints: actor.system.fatepoints,
                characterpoints: actor.system.characterpoints,
                dodge: { score: actor.system.dodge.score },
                parry: { score: actor.system.parry.score },
                block: { score: actor.system.block.score },
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
