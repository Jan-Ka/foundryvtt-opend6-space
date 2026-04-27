import OD6S from "../config/config-od6s";
import {od6sutilities} from "../system/utilities";
import {SpecializeDialog} from "./specialize-dialog";

export class od6sspecialize {

    activateListeners(html: any)
    {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onSpecialize(event: Event) {
        event.preventDefault();
        // Create the specialization item, tied to the correct attribute/skill
        const skill = (this as any).actor.getEmbeddedDocument("Item",
            (event.currentTarget as any).dataset.itemId, true);
        const derivedScore = (+skill.system.score) + (+(this as any).actor.system.attributes[skill.system.attribute.toLowerCase()].score) + 1
        const cpCost = Math.floor(Math.floor(derivedScore/OD6S.pipsPerDice)/2);
        const newItemData: any = {
            specname: "",
            type: "specialization",
            skill: skill.name,
            attribute: skill.system.attribute,
            description: skill.system.description,
            score: derivedScore,
            cpcost: cpCost,
            originalcpcost: cpCost,
            actor: (this as any).actor,
            freeadvance: false,
            dice: od6sutilities.getDiceFromScore(derivedScore - 1).dice,
            pips: od6sutilities.getDiceFromScore(derivedScore - 1).pips
        }

        new SpecializeDialog(
            newItemData,
            () => od6sspecialize.addSpecialization(this, newItemData, skill.id),
        ).render({force: true});

    }

    static async addSpecialization(actorSheet: any, itemData: any, skillId: string, _dice?: any, _pips?: any) {
        // Can't have a blank name
        if (typeof(itemData.specname)==='undefined' || itemData.specname==="" ) {
            ui.notifications.error(game.i18n.localize("OD6S.ERR_SPECIALIZATION_NAME"));
            return;
        }

        // Can't spend what you don't have
        if (actorSheet.actor.type === "character") {
            if ((+itemData.cpcost) > (+actorSheet.actor.system.characterpoints.value) &&
                actorSheet.actor.system.sheetmode.value !== "freeedit") {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_SPEC"));
                return;
            }
        }

        // Create new specialization item, derived from original skill
        let newItemData: any = foundry.utils.deepClone(actorSheet.actor.getEmbeddedDocument("Item",
            skillId, true));
        let base;
        if(actorSheet.actor.type === "npc") {
            // Get the score from the form
            base = (+od6sutilities.getScoreFromDice(itemData.dice, itemData.pips)) -
                itemData.actor.system.attributes[itemData.attribute].base;
        } else {
            base = (+newItemData.system.base) + 1;
        }

        newItemData = {
            name: itemData.specname,
            type: itemData.type,
            system: {
                attribute: itemData.attribute,
                description: itemData.specname,
                base: base,
                time: itemData.time,
                skill: itemData.skill
            }
        }

        await actorSheet.actor.createEmbeddedDocuments('Item', [newItemData]);

        // Deduct character points
        if (actorSheet.actor.type === "character") {
            if ((+itemData.cpcost) > 0 &&  actorSheet.actor.system.sheetmode.value !== "freeedit") {
                const update: any = {};
                update.id = actorSheet.actor.id;
                update.system = {};
                update.system.characterpoints = {};
                update.system.characterpoints.value -= actorSheet.actor.system.characterpoints.value;
                await actorSheet.actor.update(update, {diff: true});
            }
        }

        actorSheet.render();
    }
}
