// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";
import {bindPrimaryTabs} from "../system/utilities/bind-tabs";
import OD6S from "../config/config-od6s";


const {HandlebarsApplicationMixin, DialogV2} = foundry.applications.api;
const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;

/**
 * OD6S item sheet — ApplicationV2 with HandlebarsApplicationMixin.
 *
 * Template path is dynamic per item.type, so we override _renderHTML to
 * load the right template instead of declaring a multi-PARTS entry per type.
 */
export class OD6SItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["od6s", "sheet", "item"],
        position: {width: 520, height: 480},
        window: {resizable: true, minimizable: true},
        form: {submitOnChange: true, closeOnSubmit: false},
        actions: {},
    };

    static PARTS = {
        body: {template: "systems/od6s/templates/item/item-weapon-sheet.html"},
    };

    get template(): string {
        return `systems/od6s/templates/item/item-${this.item.type}-sheet.html`;
    }

    async _prepareContext(_options?: object): Promise<object> {
        return {
            item: this.item,
            system: this.item.system,
            editable: this.isEditable,
            owner: this.item.isOwner,
            actor: this.actor,
            cssClass: this.isEditable ? "editable" : "locked",
        };
    }

    async _renderHTML(_context: any, options: any): Promise<Record<string, HTMLElement>> {
        const context = await this._prepareContext(options);
        const html = await foundry.applications.handlebars.renderTemplate(this.template, context);
        const tempEl = document.createElement("div");
        tempEl.innerHTML = html;
        const element = tempEl.firstElementChild as HTMLElement | null;
        if (!element) throw new Error(`Item sheet template "${this.template}" produced no root element.`);
        element.dataset.applicationPart = "body";
        return {body: element};
    }

    _replaceHTML(result: Record<string, HTMLElement>, content: HTMLElement, _options: any): void {
        content.replaceChildren(result.body);
    }

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;

        bindPrimaryTabs(this as any, root);

        if (!this.isEditable) return;
        const $ = (sel: string): NodeListOf<HTMLElement> => root.querySelectorAll(sel);

        $(".editskill").forEach((el) => el.addEventListener("change", this._editSkill.bind(this)));
        $(".editspecialization").forEach((el) => el.addEventListener("change", this._editSpecialization.bind(this)));
        $(".editweapondamage").forEach((el) => el.addEventListener("change", this._editWeaponDamage.bind(this)));
        $(".editweaponstun").forEach((el) => el.addEventListener("change", this._editWeaponStunDamage.bind(this)));
        $(".editweaponfirecontrol").forEach((el) => el.addEventListener("change", this._editWeaponFireControl.bind(this)));
        $(".editarmor").forEach((el) => el.addEventListener("change", this._editArmor.bind(this)));
        $(".edittemplateattribute").forEach((el) => el.addEventListener("click", this._editTemplateAttribute.bind(this)));
        $(".template-item-add").forEach((el) => el.addEventListener("click", this._addTemplateItem.bind(this)));
        $(".template-item-edit").forEach((el) => el.addEventListener("click", this._editTemplateItem.bind(this)));
        $(".template-item-delete").forEach((el) => el.addEventListener("click", this._deleteTemplateItem.bind(this)));
        $(".effect-add").forEach((el) => el.addEventListener("click", this._addEffect.bind(this)));
        $(".effect-edit").forEach((el) => el.addEventListener("click", this._editEffect.bind(this)));
        $(".effect-delete").forEach((el) => el.addEventListener("click", this._deleteEffect.bind(this)));
        $(".label-add").forEach((el) => el.addEventListener("click", this._addLabel.bind(this)));
        $(".label-edit").forEach((el) => el.addEventListener("change", this._editLabel.bind(this)));
        $(".label-delete").forEach((el) => el.addEventListener("click", this._deleteLabel.bind(this)));
        $(".add-actor-type").forEach((el) => el.addEventListener("click", this._addActorType.bind(this)));
        $(".delete-actor-type").forEach((el) => el.addEventListener("click", this._deleteActorType.bind(this)));
    }

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    async _onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        let data: any;
        try {
            data = (foundry.applications.ux.TextEditor as any).implementation.getDragEventData(event);
        } catch {
            return;
        }

        let item: any = "";
        if (data.type === "Item") {
            item = await this._onDropItem(event, data);
        }
        if (typeof item === "undefined") return;

        await this._addTemplateItemAction(item.name, item.type, this);
    }

    async _onDropItem(_event: DragEvent, data: any): Promise<any> {
        const item = await Item.implementation.fromDropData(data);

        switch (this.item.type) {
            case "item-group":
            case "species-template":
            case "character-template":
                return item;

            case "weapon":
                if (item.type === "specialization") {
                    (this.item.system as OD6SWeaponItemSystem).stats.specialization = (item as Item).name;
                    await this.item.update(this.item.system, {diff: true});
                }
        }
        return undefined;
    }

    /* -------------------------------------------- */
    /*  Action handlers                             */
    /* -------------------------------------------- */

    async _addActorType(): Promise<void> {
        const data = {
            actorTypes: (game as any).od6s.OD6SActor.TYPES.filter((i: any) => !this.item.system.actor_types.includes(i)),
        };
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-add-actor-type.html", data);
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.ADD") + " " + game.i18n.localize("OD6S.ACTOR_TYPE")},
            content,
            ok: {label: game.i18n.localize("OD6S.ADD")},
        });
        if (result?.["actor-type"]) await this._addActorTypeAction(result["actor-type"]);
    }

    async _addActorTypeAction(type: any): Promise<void> {
        const update: any = {id: this.item.id, system: {actor_types: this.item.system.actor_types}};
        update.system.actor_types.push(type);
        await this.item.update(update);
    }

    async _deleteActorType(ev: any): Promise<void> {
        const type = ev.currentTarget.dataset.type;
        const update: any = {
            id: this.item.id,
            system: {
                actor_types: this.item.system.actor_types.filter((i: any) => i !== type),
                items: [],
            },
        };
        for (const i of this.item.system.items) {
            for (const t of update.system.actor_types) {
                if (OD6S.allowedItemTypes[t].includes(i.type)) {
                    update.system.items.push(i);
                    break;
                }
            }
        }
        await this.item.update(update);
    }

    async _addLabel(_ev: any): Promise<void> {
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-add-label.html",
            {id: this.item.id});
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.ADD") + " " + game.i18n.localize("OD6S.LABEL") + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.ADD")},
        });
        if (result?.key) await this._addLabelAction(result.key, result.value);
    }

    async _addLabelAction(key: any, value: any): Promise<void> {
        if (this.item.system.labels[key]) {
            ui.notifications.warn(game.i18n.localize("OD6S.LABEL_ALREADY_EXISTS"));
            return;
        }
        await this.item.update({id: this.item.id, [`system.labels.${key}`]: value});
    }

    async _editLabel(ev: any): Promise<void> {
        await this.item.update({
            id: this.item.id,
            [`system.labels.${ev.currentTarget.dataset.key}`]: ev.target.value,
        });
    }

    async _deleteLabel(ev: any): Promise<void> {
        await this.item.update({
            id: this.item.id,
            system: this.item.system,
            [`system.labels.-=${ev.currentTarget.dataset.key}`]: null,
        });
    }

    async _addEffect(): Promise<void> {
        const name = game.i18n.localize("OD6S.NEW_ACTIVE_EFFECT");
        const effect = await this.document.createEmbeddedDocuments("ActiveEffect", [{label: name}]);
        new (foundry.applications.sheets as any).ActiveEffectConfig({document: effect[0]}).render({force: true});
    }

    async _editEffect(ev: any): Promise<void> {
        const effect = this.document.getEmbeddedDocument("ActiveEffect", ev.currentTarget.dataset.effectId);
        new (foundry.applications.sheets as any).ActiveEffectConfig({document: effect}).render({force: true});
    }

    async _deleteEffect(ev: any): Promise<void> {
        await this.document.deleteEmbeddedDocuments("ActiveEffect", [ev.currentTarget.dataset.effectId]);
    }

    /* -------------------------------------------- */
    /*  Numeric edit handlers (skill/spec/damage…)   */
    /* -------------------------------------------- */

    async _editSkill(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        const oldDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.base);
        let newScore: any;
        if (event.target.id === "dice") {
            newScore = od6sutilities.getScoreFromDice(event.target.value, oldDice.pips);
        } else if (event.target.id === "pips") {
            newScore = od6sutilities.getScoreFromDice(oldDice.dice, event.target.value);
        }
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
            await this.item.sheet.render(false, {log: true});
        } else {
            await this.item.update({id: this.item.id, _id: this.item.id, "system.base": newScore});
        }
    }

    async _editSpecialization(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        const oldDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.score);
        let newScore: any;
        if (event.target.id === "system.die.dice") {
            newScore = od6sutilities.getScoreFromDice(event.target.value, oldDice.pips);
        } else if (event.target.id === "system.die.pips") {
            newScore = od6sutilities.getScoreFromDice(oldDice.dice, event.target.value);
        }
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
            await this.item.sheet.render(false, {log: true});
        } else {
            await this.item.update({id: itemId, "system.base": newScore}, {diff: true});
        }
    }

    async _editWeaponDamage(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        if (event.currentTarget.dataset.score === "") event.currentTarget.dataset.score = 0;
        const oldDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.score);
        let newDamage: any;
        if (event.target.id === "dice") newDamage = od6sutilities.getScoreFromDice(event.target.value, oldDice.pips);
        else if (event.target.id === "pips") newDamage = od6sutilities.getScoreFromDice(oldDice.dice, event.target.value);

        const update: any = {_id: itemId, system: {damage: {score: newDamage}}};
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [update]);
        } else {
            await this.item.update({"system.damage.score": newDamage}, {diff: true});
        }
    }

    async _editWeaponStunDamage(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        if (event.currentTarget.dataset.score === "") event.currentTarget.dataset.score = 0;
        const oldDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.score);
        let newDamage: any;
        if (event.target.id === "dice") newDamage = od6sutilities.getScoreFromDice(event.target.value, oldDice.pips);
        else if (event.target.id === "pips") newDamage = od6sutilities.getScoreFromDice(oldDice.dice, event.target.value);

        const update: any = {_id: itemId, system: {stun: {score: newDamage}}};
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [update]);
        } else {
            await this.item.update({"system.stun.score": newDamage}, {diff: true});
        }
    }

    async _editWeaponFireControl(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        if (event.currentTarget.dataset.score === "") event.currentTarget.dataset.score = 0;
        const oldDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.score);
        let newScore: any;
        if (event.target.id === "dice") newScore = od6sutilities.getScoreFromDice(event.target.value, oldDice.pips);
        else if (event.target.id === "pips") newScore = od6sutilities.getScoreFromDice(oldDice.dice, event.target.value);

        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item",
                [{id: itemId, _id: itemId, "system.fire_control.score": newScore}]);
        } else {
            await this.item.update({id: this.item.id, "system.fire_control.score": newScore}, {diff: true});
        }
    }

    async _editArmor(event: any): Promise<void> {
        const itemId = event.currentTarget.dataset.itemId;
        const update: any = {id: itemId, _id: itemId, system: {}};
        const oldPrDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.pr);
        const oldErDice = od6sutilities.getDiceFromScore(event.currentTarget.dataset.er);
        let newScore: any;
        if (event.target.id === "prDice") {
            newScore = od6sutilities.getScoreFromDice(event.target.value, oldPrDice.pips);
            update.system.pr = newScore;
        } else if (event.target.id === "prPips") {
            newScore = od6sutilities.getScoreFromDice(oldPrDice.dice, event.target.value);
            update.system.pr = newScore;
        } else if (event.target.id === "erDice") {
            newScore = od6sutilities.getScoreFromDice(event.target.value, oldErDice.pips);
            update.system.er = newScore;
        } else if (event.target.id === "erPips") {
            newScore = od6sutilities.getScoreFromDice(oldErDice.dice, event.target.value);
            update.system.er = newScore;
        }
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [update]);
        } else {
            await this.item.update(update);
        }
    }

    /* -------------------------------------------- */
    /*  Template item handlers                       */
    /* -------------------------------------------- */

    async _getGameItemsByType(type: any): Promise<any[]> {
        const compendia = await od6sutilities.getItemsFromCompendiumByType(type);
        const world = await od6sutilities.getItemsFromWorldByType(type);
        const data = compendia.concat(world);
        return data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    async _addTemplateItem(event: any): Promise<void> {
        const type = event.currentTarget.dataset.type;
        const templateItems = await Promise.all(await this._getGameItemsByType(type));
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-template-add.html",
            {templateItems});
        const label = game.i18n.localize(
            (game.system as any).template.Item[event.currentTarget.dataset.type].label);
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.ADD") + " " + label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.ADD")},
        });
        if (result?.itemname) await this._addTemplateItemAction(result.itemname, type, this);
    }

    async _addTemplateItemAction(name: any, type: any, itemSheet: any): Promise<void> {
        if (this.item.type === "item-group") {
            let allowed = false;
            for (const [key, items] of Object.entries(OD6S.allowedItemTypes)) {
                if (this.item.system.actor_types.includes(key)) {
                    for (const i of (items as string[])) {
                        if (OD6S.templateItemTypes["item-group"].includes(i)) {
                            allowed = true;
                            break;
                        }
                    }
                }
            }
            if (!allowed) return;
        } else if (!OD6S.templateItemTypes[this.item.type].includes(type)) {
            return;
        }

        const item = await od6sutilities.getItemByName(name);
        const description = item ? (item.system as { description?: string }).description ?? "" : "";
        const newItem = {name, type, description};
        (itemSheet.item.system as { items: unknown[] }).items.push(newItem);
        await itemSheet.item.update(
            {id: itemSheet.id, system: itemSheet.item.system},
            {diff: true});
        await this.render();
    }

    async _editTemplateItem(event: any): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const item = this.item.system.items.find((i: any) => i.name === target.dataset.name);
        const itemData = {name: target.dataset.name, type: target.dataset.type, description: item.description};
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-template-item-edit.html",
            itemData);
        const label = game.i18n.localize(
            (game.system as any).template.Item[target.dataset.type!].label);
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.EDIT") + " " + label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.EDIT")},
        });
        if (typeof result?.itemdesc === "string") {
            await this._editTemplateItemAction(result.itemdesc, event, this);
        }
    }

    async _editTemplateItemAction(desc: any, event: any, itemSheet: any): Promise<void> {
        const data = event.currentTarget.dataset;
        const newItem = {name: data.name, type: data.type, description: desc};
        const itemIndex = itemSheet.item.system.items.findIndex(
            (i: any) => i.name === data.name && i.type === data.type);
        itemSheet.item.system.items[itemIndex] = newItem;
        await itemSheet.item.update(
            {id: itemSheet.item.id, system: itemSheet.item.system},
            {diff: false});
        await this.render();
    }

    async _deleteTemplateItem(event: any): Promise<void> {
        const result = await DialogV2.confirm({
            window: {title: game.i18n.localize("OD6S.DELETE")},
            content: `<p>${game.i18n.localize("OD6S.DELETE_CONFIRM")}</p>`,
        });
        if (!result) return;

        const target = event.currentTarget as HTMLElement;
        const itemIndex = this.item.system.items.findIndex(
            (i: any) => i.name === target.dataset.name && i.type === target.dataset.type);
        this.item.system.items.splice(itemIndex, 1);
        await this.item.update(
            {id: this.item.id, system: this.item.system},
            {diff: true});
        await this.render();
    }

    async _editTemplateAttribute(event: any): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const score = target.dataset.score;
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-attribute-edit.html",
            {score});
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.EDIT") + " " + target.dataset.label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.EDIT_ATTRIBUTE")},
        });
        if (result) await this._editAttributeAction(result.dice, result.pips, event, this);
    }

    async _editAttributeAction(dice: any, pips: any, event: any, itemSheet: any): Promise<void> {
        const newScore = od6sutilities.getScoreFromDice(dice, pips);
        const target = event.currentTarget as HTMLElement;
        const attrname = target.dataset.attrname!;
        switch (target.dataset.sub) {
            case "base": itemSheet.item.system.attributes[attrname] = newScore; break;
            case "min": itemSheet.item.system.attributes[attrname].min = newScore; break;
            case "max": itemSheet.item.system.attributes[attrname].max = newScore; break;
        }
        await itemSheet.item.update(
            {id: itemSheet.item.id, system: itemSheet.item.system},
            {diff: true});
        await this.render();
    }
}
