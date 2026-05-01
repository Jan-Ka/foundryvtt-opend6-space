import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {AdvanceDialog} from "./advance-dialog";

export class od6sadvance {

    activateListeners(html: HTMLElement | JQuery)
    {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onAdvance(event: Event) {
        event.preventDefault();
        const element = event.currentTarget as HTMLElement;
        const dataset = element.dataset;
        let originalScore = 0;
        const cpcost = 0;
        const base = dataset.base;
        const freeAdvance = Boolean(false);
        let itemid: string | number = 0;
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
            itemid = dataset.itemId!;
            used = skill.system.used.value;
        } else if (dataset.type === "attribute") {
            const attrname = dataset.attrname!;
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
            itemid = dataset.itemId!;
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
            attrname: dataset.attrname,
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
                    formData.dice,
                    formData.pips,
                ),
            ).render({force: true});
        }
    }

    static async advanceAction(actor: Actor, advanceData: any, dice?: number, pips?: number) {

        const actorData = actor.system as OD6SCharacterSystem;
        const actorUpdate: any = {};
        const updates: any[] = [];
        actorUpdate.system = {};
        let specs: Item[] = [];

        /* freeadvance was checked, use form data instead */
        if (advanceData.freeadvance) {
            OD6S.flatSkills ? advanceData.score = advanceData.base :
                advanceData.score = od6sutilities.getScoreFromDice(dice!, pips!);
        }

        /* Character Point cost is too high. */
        if (!advanceData.freeadvance) {
            if (advanceData.cpcost > actorData.characterpoints.value) {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_ADVANCE"));
                return;
            }
        }

        /* Determine item or attribute */
        if (advanceData.type === "attribute") {
            actorUpdate.system.attributes = {};
            actorUpdate.system.attributes[advanceData.attrname!] = {};
            actorUpdate.system.attributes[advanceData.attrname!].base = advanceData.score;
        }

        if(advanceData.type === "skill") {
            const skill = actor.items.get(advanceData.itemid);

            if(OD6S.specLink) {
                /* Also advance any specializations derived from this skill */
                specs = actor.items.filter((i: Item) => i.type === 'specialization' &&
                    (i.system as OD6SSpecializationItemSystem).skill === skill?.name);
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
                            (+(specs[spec].system as OD6SSpecializationItemSystem).base);
                    }
                    updates.push({
                        _id: specs[spec]._id,
                        "system.base": newSpecScore
                    })
                }
            }
        }

        if(advanceData.type === "specialization") {
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
