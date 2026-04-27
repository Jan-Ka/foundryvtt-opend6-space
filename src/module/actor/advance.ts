import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {AdvanceDialog} from "./advance-dialog";

export class od6sadvance {

    activateListeners(html: any)
    {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onAdvance(event: Event) {
        event.preventDefault();
        const element = event.currentTarget as HTMLElement;
        const dataset = (element as any).dataset;
        let originalScore = 0;
        const cpcost = 0;
        const base = dataset.base;
        const freeAdvance = Boolean(false);
        let itemid = 0;
        let used = false;
        let metaPhysicsSkill = false;
        const metaphysicsteacher = false;
        const actorData = (this as any).actor.system;

        /* Determine the type of thing we're trying to advance so we can set the correct data fields */
        if (dataset.type === "skill") {
            const skill = (this as any).actor.getEmbeddedDocument("Item", dataset.itemId);
            let attribute;
            for (attribute in (this as any).actor.system.attributes) {
                if (skill.system.attribute === attribute) {
                    originalScore = (+skill.system.base);
                    if (!OD6S.flatSkills)
                        originalScore += (+actorData.attributes[attribute].base)
                }
            }
            if (skill.system.attribute === 'met') {
                metaPhysicsSkill = true;
            }
            itemid = dataset.itemId;
            used = skill.system.used.value;
        } else if (dataset.type === "attribute") {
            const attrname = dataset.attrname;
            originalScore = actorData.attributes[attrname].base;
        } else if (dataset.type === "specialization") {
            const spec = (this as any).actor.getEmbeddedDocument("Item", dataset.itemId);
            used = spec.system.used.value;
            let attribute;
            for (attribute in (this as any).actor.system.attributes) {
                if (spec.system.attribute === attribute) {
                    originalScore = (+spec.system.base);
                    if (!OD6S.flatSkills)
                        originalScore += (+actorData.attributes[attribute].base)
                }
            }
            itemid = dataset.itemId;
        }

        /* Structure to pass to dialog */
        const advanceData = {
            label: dataset.label,
            score: originalScore,
            base: base,
            cpcost: cpcost,
            cpcostcolor: "black",
            freeadvance: freeAdvance,
            type: dataset.type,
            originalscore: originalScore,
            itemid: itemid,
            used: used,
            metaPhysicsSkill: metaPhysicsSkill,
            metaphysicsteacher: metaphysicsteacher
        }

        if (OD6S.flatSkills) {
            new AdvanceDialog(
                this,
                advanceData,
                (dlg, formData) => od6sadvance.advanceAction(
                    dlg.actorSheet.actor,
                    dlg.advanceData,
                    event,
                    formData.base,
                ),
            ).render({force: true});
        } else {
            new AdvanceDialog(
                this,
                advanceData,
                (dlg, formData) => od6sadvance.advanceAction(
                    dlg.actorSheet.actor,
                    dlg.advanceData,
                    event,
                    formData.dice,
                    formData.pips,
                ),
            ).render({force: true});
        }
    }

    static async advanceAction(actor: any, advanceData: any, event: Event, dice?: any, pips?: any) {

        const actorData = actor.system;
        const actorUpdate: any = {};
        const updates: any[] = [];
        actorUpdate.system = {};
        let specs: any[] = [];

        /* freeadvance was checked, use form data instead */
        if (advanceData.freeadvance) {
            OD6S.flatSkills ? advanceData.score = advanceData.base :
                advanceData.score = od6sutilities.getScoreFromDice(dice, pips);
        }

        /* Character Point cost is too high. */
        if (!advanceData.freeadvance) {
            if (advanceData.cpcost > actorData.characterpoints.value) {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_ADVANCE"));
                return;
            }
        }

        /* Determine item or attribute */
        if ((event.currentTarget as any).dataset.type === "attribute") {
            actorUpdate.system.attributes = {};
            actorUpdate.system.attributes[(event.currentTarget as any).dataset.attrname] = {};
            actorUpdate.system.attributes[(event.currentTarget as any).dataset.attrname].base = advanceData.score;
        }

        if((event.currentTarget as any).dataset.type === "skill") {
            const skill = actor.items.get(advanceData.itemid);

            if(OD6S.specLink) {
                /* Also advance any specializations derived from this skill */
                specs = actor.items.filter((i: any) => i.type === 'specialization' &&
                    i.system.skill === skill.name);
            }

            /* Add/subtract to item score, not displayed/aggregate score */
            let newScore;
            let newSkillScore;

            OD6S.flatSkills ? newScore = advanceData.base : newScore = advanceData.score - advanceData.originalscore;
            if (!OD6S.flatSkills) {
                newSkillScore = (+newScore) +
                    (+actor.getEmbeddedDocument("Item", advanceData.itemid, true).system.base);
            }

            updates.push ({
                _id: advanceData.itemid,
                "system.base": newSkillScore
            });

            if(OD6S.specLink) {
                for (const spec in specs) {
                    let newSpecScore;
                    if (!OD6S.flatSkills) {
                        newSpecScore = (+newScore) +
                            (+specs[spec].system.base);
                    }
                    updates.push({
                        _id: specs[spec]._id,
                        "system.base": newSpecScore
                    })
                }
            }
        }

        if((event.currentTarget as any).dataset.type === "specialization") {
            /* Add/subtract to item score, not displayed/aggregate score */
            let newScore;
            OD6S.flatSkills ? newScore = advanceData.base : newScore = advanceData.score - advanceData.originalscore;
            if (!OD6S.flatSkills) {
                newScore = (+newScore) +
                    (+actor.getEmbeddedDocument("Item", advanceData.itemid, true).system.base);
            }
            updates.push ({
                _id: advanceData.itemid,
                "system.base": newScore
            });
        }

        if (advanceData.cpcost > 0) {
            actorUpdate.system.characterpoints = {};
            actorUpdate.system.characterpoints.value = actorData.characterpoints.value -= (+advanceData.cpcost);
            if (actorUpdate.system.characterpoints.value < 0) {
                actorUpdate.system.characterpoints.value = 0;
            }
        }

        actorUpdate.id = actor.id;

        await actor.update(actorUpdate, {diff: true});
        if(updates.length > 0) {await actor.updateEmbeddedDocuments("Item", updates)}
        actor.render();
    }
}
