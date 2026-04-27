import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

export function prepareBaseActorData(actor: any): void {
    // Set all mod values to zero
    if(actor.type.match(/^(character|npc|creature)/)) {
        for (const a in actor.system.attributes) {
            actor.system.attributes[a].mod = 0;
            actor.system.attributes[a].label = OD6S.attributes[a].name;
        }

        const mList = {...OD6S.data_tab.offense, ...OD6S.data_tab.defense}
        for (const m in mList) {
            actor.system[m].mod = 0;
        }
    }

    if (['starship', 'vehicle'].includes(actor.type)) {
        actor.system.sensors.mod = 0;
        for (const a in actor.system.attributes) {
            actor.system.attributes[a].mod = 0;
            actor.system.attributes[a].label = OD6S.attributes[a].name;
        }
    }

    if (typeof(actor.system.use_wild_die) === 'undefined') {
        if (actor.type !== 'vehicle' && actor.type !== 'starship' && actor.type !== 'container' && actor.type !== 'base') {
            actor.system.use_wild_die = true;
        }
    }
}

export async function prepareDerivedActorData(actor: any): Promise<void> {
    const actorData = actor.system;

    if(actor.type.match(/^(character|npc|creature)/)) {
        if (OD6S.woundConfig === 1) {
            actorData.wounds.value =
                Object.keys(Object.fromEntries(Object.entries(OD6S.deadliness[3]).filter(([_k, v]: any) => v!.description === actor.getWoundLevelFromBodyPoints())))[0];
        } else if (OD6S.woundConfig === 2) {
            actorData.wounds.value = 0;
        }

        // Remove mortally wounded flag if actor is not mortally wounded
        if (actor.getFlag('od6s', 'mortally_wounded')) {
            if (OD6S.woundsId[od6sutilities.getWoundLevel(actor.system.wounds.value, actor)] !== 'mortally_wounded') {
                await actor.unsetFlag('od6s','mortally_wounded');
            }
        }
    }

    if (['character','npc'].includes(actor.type)) {
        actor.system.species.label = OD6S.speciesLabelName;
    }

    if (actor.type === 'character') {
        actor.system.chartype.label = OD6S.typeLabel;
    }

    actor.applyMods();

    if (actor.type !== 'container') actor.setInitiative(actorData);

    // Iterate over custom active effects and handle them
    const changes = [];
    const itemRegex = new RegExp(`^(system)?.?(items)?.?(skill|specialization|weapon|vehicle-weapon|starship-weapon)s?`);

    for ( const effect of actor.allApplicableEffects() ) {
        if (!effect.active) continue;
        changes.push(...effect.changes.filter((c: any) => c.type === "custom" &&
            !c.key.match(itemRegex)));
    }

    for (const change in changes) {
        if(changes[change].key.match(itemRegex)) continue;
        const changeValue = od6sutilities.evaluateChange(changes[change], actor)
        const origValue = foundry.utils.getProperty(actor, changes[change].key);
        if (typeof(origValue) === 'undefined' || origValue === null) continue;
        foundry.utils.setProperty(actor, changes[change].key, changeValue + origValue)
        actor.applyMods();
    }

    // Iterate over owned items and apply custom active effects
    for (const item in actor.items.contents) {
        const i = actor.items.contents[item];
        i.findActiveEffects();
        i.applyMods();

        if(i.type === 'skill' || i.type === 'specialization') {
            if (i.system.isAdvancedSkill) {
                i.system.total = i.system.score;
                i.system.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(i.system.score));
            } else {
                i.system.total = i.system.score + actor.system.attributes[i.system.attribute].score;
                i.system.totalText = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(i.system.total));
            }
        }
    }

    if (actor.type !== 'container') {
        for (const a in actor.system.attributes) {
            const dice = od6sutilities.getDiceFromScore(actor.system.attributes[a].score);
            actor.system.attributes[a].text = `${od6sutilities.getTextFromDice(dice)}`;
        }
    }

    if (['starship', 'vehicle'].includes(actor.type)) {
        if (actor.system.crew.value > 0) {
            await actor.sendVehicleData();
        }
    }
}

export function applyMods(actor: any): void {
    const actorData = actor.system;

    for (const a in actorData.attributes) {
        actorData.attributes[a].score = actorData.attributes[a].base + actorData.attributes[a].mod;
        if(actor.type.match(/^(character|npc|creature)/)) {
            actorData.strengthdamage.score = setStrengthDamageBonus(actor);
        }
    }

    if(actor.type.match(/^(character|npc|creature)/)) {
        actor.system.pr.score = setResistance(actor, 'pr')
        actor.system.pr.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.pr.score));
        actor.system.er.score = setResistance(actor, 'er')
        actor.system.er.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.er.score));
        actor.system.noArmor = {};
        actor.system.noArmor.mod = 0;
        actor.system.noArmor.score = setResistance(actor, 'noArmor');
        actor.system.noArmor.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.noArmor.score));
        actor.system.noArmor.label = game.i18n.localize("OD6S.RESISTANCE_NO_ARMOR")
    }
}

export function setStrengthDamageBonus(actor: any): any {
    let damage;
    if(!actor.type.match(/^(character|npc|creature)/)) return 0;

    // If game setting is true, use straight strength score plus modifier
    if (game.settings.get('od6s', 'strength_damage')) {
        return actor.system.attributes?.str.score + actor.system.strengthdamage?.mod;
    }

    const liftSkill = actor.items.find((skill: any) => skill.name === OD6S.strDamSkill);
    const base = liftSkill ? liftSkill.system.score + actor.system.attributes.str.score : actor.system.attributes.str.score;

    if (game.settings.get('od6s', 'od6_bonus')) {
        // Use base directly multiplied by the multiplier
        const modifiedBase = base * OD6S.strDamMultiplier;
        damage = OD6S.strDamRound ? Math.floor(modifiedBase) : Math.ceil(modifiedBase);
    } else {
        // Calculate based on dice conversion and then apply half dice logic
        const dice = Math.ceil(base / OD6S.pipsPerDice);
        const halfDice = OD6S.strDamRound ? Math.floor(dice / 2) : Math.ceil(dice / 2);
        damage = (halfDice * OD6S.pipsPerDice) + actor.system.strengthdamage.mod;
    }

    damage += actor.system.strengthdamage.mod; // Always add modifier to the damage
    return damage;
}

export function setInitiative(actor: any): any {
    if (actor.type === 'container' || actor.type === 'base') return
    if (actor.type === 'vehicle' || actor.type === 'starship') {
        if (!actor.system.embedded_pilot) return;
    }
    // Base init is the character's perception score.  Special abilities and optional rules may add to it.
    // Using perception can be overridden in system config options
    // 0.7.3 add an option to change the base attribute
    const score = actor.system.attributes[OD6S.initiative.attribute].score + actor.system.initiative.mod;
    const dice = od6sutilities.getDiceFromScore(score);
    const tiebreaker = (+(actor.system.attributes.per.score / 100 + actor.system.attributes.agi.score / 100).toPrecision(2));
    dice.dice--;
    const formula = dice.dice + "d6[Base]" + "+" + dice.pips + "+1d6x6[Wild]+" + tiebreaker;
    actor.system.initiative.formula = formula;
    actor.system.initiative.score = score;
    return actor.system;
}

export function setResistance(actor: any, type: any): any {
    let dr = 0;
    if (['vehicle', 'starship', 'container', 'base'].includes(actor.type)) return 0;

    // Accumulate DR from equipped and undamaged armor
    if (actor.itemTypes.armor && type !== 'noArmor') {
        actor.itemTypes.armor.forEach((armor: any) => {
            if (armor.system.equipped.value) {
                dr += armor.system[type];
                if (armor.system.damaged > 0) {
                    dr -= OD6S.armorDamage[armor.system.damaged].penalty;
                    dr = Math.max(0, dr);
                }
            }
        });
    }

    if (OD6S.resistanceOption) {
        const staminaItem = actor.items.find((skill: any) => skill.name === OD6S.resistanceSkill);
        const staminaScore = staminaItem ? parseInt(staminaItem.system.score, 10) : 0;
        const staminaAttr= staminaItem ? staminaItem.system.attribute : 'str';
        const strScore = parseInt(actor.system.attributes[staminaAttr].score, 10);

        // Default the resistance multiplier if not set or zero
        if (!OD6S.resistanceMultiplier || OD6S.resistanceMultiplier === 0) {
            OD6S.resistanceMultiplier = 1;
        }

        const damageResistance = OD6S.resistanceRound ?
            Math.floor((staminaScore + strScore) * OD6S.resistanceMultiplier) :
            Math.ceil((staminaScore + strScore) * OD6S.resistanceMultiplier);

        dr += damageResistance + actor.system[type].mod;
    } else {
        dr += actor.system.attributes.str.score + actor.system[type].mod;
    }
    return dr;
}
