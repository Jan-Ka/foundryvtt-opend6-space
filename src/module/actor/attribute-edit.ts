import {od6sutilities} from "../system/utilities";

declare const foundry: any;

export class od6sattributeedit {

    activateListeners(html: any) {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onAttributeEdit(event: any) {
        event.preventDefault();

        const attribute = event.currentTarget.dataset.attrname;
        // @ts-expect-error this.actor is bound by mixin caller
        const score = this.actor.system.attributes[attribute].base;

        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/actor/common/attribute-edit.html",
            {score});

        const result = await foundry.applications.api.DialogV2.input({
            window: {title: game.i18n.localize("OD6S.EDIT") + " " + event.currentTarget.dataset.label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.EDIT_ATTRIBUTE")},
        });
        if (!result) return;

        // @ts-expect-error this.actor is bound by mixin caller
        await od6sattributeedit.editAttributeAction(result.dice, result.pips, event, this.actor);
    }

    static async editAttributeAction(dice: any, pips: any, event: any, actor: any) {
        event.preventDefault();
        const newScore = od6sutilities.getScoreFromDice(dice, pips);
        const attribute = event.currentTarget.dataset.attrname;

        const update: any = {};
        update.id = actor.id;
        update.system = {};
        update.system.attributes = {};
        update.system.attributes[attribute] = {};
        update.system.attributes[attribute].base = newScore;

        await actor.update(update, {"diff": true});
        //await actor.update({[system.attributes[attribute].score]: newScore});
        actor.render();
    }
}
