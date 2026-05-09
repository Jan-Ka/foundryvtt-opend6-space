 
import {od6sutilities} from "../system/utilities";
import {bindPrimaryTabs} from "../system/utilities/bind-tabs";
import OD6S from "../config/config-od6s";
import {isItemGroupItem, isTemplateLikeItem, isWeaponItem} from "../system/type-guards";


const {HandlebarsApplicationMixin, DialogV2} = foundry.applications.api;
const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;

/** Drop payload returned by TextEditor.getDragEventData — type/uuid plus arbitrary extras. */
type DropData = Record<string, unknown> & { type?: string; uuid?: string };

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

    async _renderHTML(_context: object, options: object): Promise<Record<string, HTMLElement>> {
        const context = await this._prepareContext(options);
        const html = await foundry.applications.handlebars.renderTemplate(this.template, context);
        const tempEl = document.createElement("div");
        tempEl.innerHTML = html;
        const element = tempEl.firstElementChild as HTMLElement | null;
        if (!element) throw new Error(`Item sheet template "${this.template}" produced no root element.`);
        element.dataset.applicationPart = "body";
        return {body: element};
    }

    _replaceHTML(result: Record<string, HTMLElement>, content: HTMLElement, _options: object): void {
        content.replaceChildren(result.body);
    }

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;

        bindPrimaryTabs(this, root);

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
        let data: DropData;
        try {
            data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) as DropData;
        } catch {
            return;
        }

        let item: Item | undefined;
        if (data.type === "Item") {
            item = await this._onDropItem(event, data);
        }
        if (!item) return;

        await this._addTemplateItemAction(item.name, item.type, this);
    }

    async _onDropItem(_event: DragEvent, data: DropData): Promise<Item | undefined> {
        const item = await Item.implementation.fromDropData(data);

        switch (this.item.type) {
            case "item-group":
            case "species-template":
            case "character-template":
                return item;

            case "weapon":
                if (item.type === "specialization" && isWeaponItem(this.item)) {
                    this.item.system.stats.specialization = item.name;
                    await this.item.update(this.item.system, {diff: true});
                }
        }
        return undefined;
    }

    /* -------------------------------------------- */
    /*  Action handlers                             */
    /* -------------------------------------------- */

    async _addActorType(): Promise<void> {
        if (!isItemGroupItem(this.item)) return;
        const item = this.item;
        const data = {
            actorTypes: game.od6s.OD6SActor.TYPES.filter((i: string) => !item.system.actor_types.includes(i)),
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

    async _addActorTypeAction(type: string): Promise<void> {
        if (!isItemGroupItem(this.item)) return;
        const item = this.item;
        const actorTypes = [...item.system.actor_types, type];
        await item.update({id: item.id, system: {actor_types: actorTypes}});
    }

    async _deleteActorType(ev: Event): Promise<void> {
        if (!isItemGroupItem(this.item)) return;
        const item = this.item;
        const target = ev.currentTarget as HTMLElement;
        const type = target.dataset.type;
        const actorTypes = item.system.actor_types.filter((i: string) => i !== type);
        const items: OD6STemplateItemEntry[] = [];
        for (const i of item.system.items as OD6STemplateItemEntry[]) {
            for (const t of actorTypes) {
                if (OD6S.allowedItemTypes[t].includes(i.type)) {
                    items.push(i);
                    break;
                }
            }
        }
        await this.item.update({id: item.id, system: {actor_types: actorTypes, items}});
    }

    async _addLabel(): Promise<void> {
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

    async _addLabelAction(key: string, value: string): Promise<void> {
        if (this.item.system.labels[key]) {
            ui.notifications.warn(game.i18n.localize("OD6S.LABEL_ALREADY_EXISTS"));
            return;
        }
        await this.item.update({id: this.item.id, [`system.labels.${key}`]: value});
    }

    async _editLabel(ev: Event): Promise<void> {
        const target = ev.currentTarget as HTMLElement;
        const input = ev.target as HTMLInputElement;
        await this.item.update({
            id: this.item.id,
            [`system.labels.${target.dataset.key}`]: input.value,
        });
    }

    async _deleteLabel(ev: Event): Promise<void> {
        const target = ev.currentTarget as HTMLElement;
        await this.item.update({
            id: this.item.id,
            system: this.item.system,
            [`system.labels.-=${target.dataset.key}`]: null,
        });
    }

    async _addEffect(): Promise<void> {
        const name = game.i18n.localize("OD6S.NEW_ACTIVE_EFFECT");
        const effect = await this.document.createEmbeddedDocuments("ActiveEffect", [{label: name}]);
        new foundry.applications.sheets.ActiveEffectConfig({document: effect[0]}).render({force: true});
    }

    async _editEffect(ev: Event): Promise<void> {
        const target = ev.currentTarget as HTMLElement;
        const effectId = target.dataset.effectId;
        if (!effectId) return;
        const effect = this.document.getEmbeddedDocument("ActiveEffect", effectId);
        if (!effect) return;
        new foundry.applications.sheets.ActiveEffectConfig({document: effect}).render({force: true});
    }

    async _deleteEffect(ev: Event): Promise<void> {
        const target = ev.currentTarget as HTMLElement;
        await this.document.deleteEmbeddedDocuments("ActiveEffect", [target.dataset.effectId!]);
    }

    /* -------------------------------------------- */
    /*  Numeric edit handlers (skill/spec/damage…)   */
    /* -------------------------------------------- */

    async _editSkill(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.base ?? 0));
        let newScore: number | undefined;
        if (input.id === "dice") {
            newScore = od6sutilities.getScoreFromDice(Number(input.value), oldDice.pips);
        } else if (input.id === "pips") {
            newScore = od6sutilities.getScoreFromDice(oldDice.dice, Number(input.value));
        }
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
            await this.item.sheet.render(false, {log: true});
        } else {
            await this.item.update({id: this.item.id, _id: this.item.id, "system.base": newScore});
        }
    }

    async _editSpecialization(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
        let newScore: number | undefined;
        if (input.id === "system.die.dice") {
            newScore = od6sutilities.getScoreFromDice(Number(input.value), oldDice.pips);
        } else if (input.id === "system.die.pips") {
            newScore = od6sutilities.getScoreFromDice(oldDice.dice, Number(input.value));
        }
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
            await this.item.sheet.render(false, {log: true});
        } else {
            await this.item.update({id: itemId, "system.base": newScore}, {diff: true});
        }
    }

    async _editWeaponDamage(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        if (target.dataset.score === "") target.dataset.score = "0";
        const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
        let newDamage: number | undefined;
        if (input.id === "dice") newDamage = od6sutilities.getScoreFromDice(Number(input.value), oldDice.pips);
        else if (input.id === "pips") newDamage = od6sutilities.getScoreFromDice(oldDice.dice, Number(input.value));

        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{_id: itemId, system: {damage: {score: newDamage}}}]);
        } else {
            await this.item.update({"system.damage.score": newDamage}, {diff: true});
        }
    }

    async _editWeaponStunDamage(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        if (target.dataset.score === "") target.dataset.score = "0";
        const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
        let newDamage: number | undefined;
        if (input.id === "dice") newDamage = od6sutilities.getScoreFromDice(Number(input.value), oldDice.pips);
        else if (input.id === "pips") newDamage = od6sutilities.getScoreFromDice(oldDice.dice, Number(input.value));

        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [{_id: itemId, system: {stun: {score: newDamage}}}]);
        } else {
            await this.item.update({"system.stun.score": newDamage}, {diff: true});
        }
    }

    async _editWeaponFireControl(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        if (target.dataset.score === "") target.dataset.score = "0";
        const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
        let newScore: number | undefined;
        if (input.id === "dice") newScore = od6sutilities.getScoreFromDice(Number(input.value), oldDice.pips);
        else if (input.id === "pips") newScore = od6sutilities.getScoreFromDice(oldDice.dice, Number(input.value));

        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item",
                [{id: itemId, _id: itemId, "system.fire_control.score": newScore}]);
        } else {
            await this.item.update({id: this.item.id, "system.fire_control.score": newScore}, {diff: true});
        }
    }

    async _editArmor(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const input = event.target as HTMLInputElement;
        const itemId = target.dataset.itemId;
        const system: { pr?: number; er?: number } = {};
        const oldPrDice = od6sutilities.getDiceFromScore(Number(target.dataset.pr ?? 0));
        const oldErDice = od6sutilities.getDiceFromScore(Number(target.dataset.er ?? 0));
        if (input.id === "prDice") {
            system.pr = od6sutilities.getScoreFromDice(Number(input.value), oldPrDice.pips);
        } else if (input.id === "prPips") {
            system.pr = od6sutilities.getScoreFromDice(oldPrDice.dice, Number(input.value));
        } else if (input.id === "erDice") {
            system.er = od6sutilities.getScoreFromDice(Number(input.value), oldErDice.pips);
        } else if (input.id === "erPips") {
            system.er = od6sutilities.getScoreFromDice(oldErDice.dice, Number(input.value));
        }
        const update = {id: itemId, _id: itemId, system};
        if (this.actor != null) {
            await this.actor.updateEmbeddedDocuments("Item", [update]);
        } else {
            await this.item.update(update);
        }
    }

    /* -------------------------------------------- */
    /*  Template item handlers                       */
    /* -------------------------------------------- */

    async _getGameItemsByType(
        type: string,
    ): Promise<Array<{_id: string; name: string; type: string; description?: string}>> {
        const compendia = await od6sutilities.getItemsFromCompendiumByType(type as OD6SItemType);
        const world = await od6sutilities.getItemsFromWorldByType(type as OD6SItemType);
        const data = [...compendia, ...world];
        return data.sort((a, b) => a.name.localeCompare(b.name));
    }

    async _addTemplateItem(event: Event): Promise<void> {
        const target = event.currentTarget as HTMLElement;
        const type = target.dataset.type!;
        const templateItems = await Promise.all(await this._getGameItemsByType(type));
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-template-add.html",
            {templateItems});
        const label = game.i18n.localize(
            game.system.template.Item[type].label);
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.ADD") + " " + label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.ADD")},
        });
        if (result?.itemname) await this._addTemplateItemAction(result.itemname, type, this);
    }

    async _addTemplateItemAction(name: string, type: string, itemSheet: OD6SItemSheet): Promise<void> {
        if (isItemGroupItem(this.item)) {
            const item = this.item;
            let allowed = false;
            for (const [key, items] of Object.entries(OD6S.allowedItemTypes)) {
                if (item.system.actor_types.includes(key)) {
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

        if (!isTemplateLikeItem(itemSheet.item)) return;
        const sheetItem = itemSheet.item;
        const item = await od6sutilities.getItemByName(name);
        const description = item?.system.description ?? "";
        const newItem: OD6STemplateItemEntry = {name, type, description};
        (sheetItem.system.items as OD6STemplateItemEntry[]).push(newItem);
        await sheetItem.update(
            {id: sheetItem.id, system: sheetItem.system},
            {diff: true});
        await this.render();
    }

    async _editTemplateItem(event: Event): Promise<void> {
        if (!isTemplateLikeItem(this.item)) return;
        const target = event.currentTarget as HTMLElement;
        const items = this.item.system.items as OD6STemplateItemEntry[];
        const item = items.find((i) => i.name === target.dataset.name);
        const itemData = {name: target.dataset.name, type: target.dataset.type, description: item?.description};
        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/od6s/templates/item/item-template-item-edit.html",
            itemData);
        const label = game.i18n.localize(
            game.system.template.Item[target.dataset.type!].label);
        const result = await DialogV2.input({
            window: {title: game.i18n.localize("OD6S.EDIT") + " " + label + "!"},
            content,
            ok: {label: game.i18n.localize("OD6S.EDIT")},
        });
        if (typeof result?.itemdesc === "string") {
            await this._editTemplateItemAction(result.itemdesc, event, this);
        }
    }

    async _editTemplateItemAction(desc: string, event: Event, itemSheet: OD6SItemSheet): Promise<void> {
        if (!isTemplateLikeItem(itemSheet.item)) return;
        const target = event.currentTarget as HTMLElement;
        const data = target.dataset;
        const newItem: OD6STemplateItemEntry = {name: data.name!, type: data.type!, description: desc};
        const items = itemSheet.item.system.items as OD6STemplateItemEntry[];
        const itemIndex = items.findIndex((i) => i.name === data.name && i.type === data.type);
        if (itemIndex < 0) return;
        items[itemIndex] = newItem;
        await itemSheet.item.update(
            {id: itemSheet.item.id, system: itemSheet.item.system},
            {diff: false});
        await this.render();
    }

    async _deleteTemplateItem(event: Event): Promise<void> {
        if (!isTemplateLikeItem(this.item)) return;
        const item = this.item;
        const result = await DialogV2.confirm({
            window: {title: game.i18n.localize("OD6S.DELETE")},
            content: `<p>${game.i18n.localize("OD6S.DELETE_CONFIRM")}</p>`,
        });
        if (!result) return;

        const target = event.currentTarget as HTMLElement;
        const items = item.system.items as OD6STemplateItemEntry[];
        const itemIndex = items.findIndex(
            (i) => i.name === target.dataset.name && i.type === target.dataset.type);
        if (itemIndex < 0) return;
        items.splice(itemIndex, 1);
        await item.update(
            {id: item.id, system: item.system},
            {diff: true});
        await this.render();
    }

    async _editTemplateAttribute(event: Event): Promise<void> {
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

    async _editAttributeAction(
        dice: string,
        pips: string,
        event: Event,
        itemSheet: OD6SItemSheet,
    ): Promise<void> {
        const newScore = od6sutilities.getScoreFromDice(Number(dice), Number(pips));
        const target = event.currentTarget as HTMLElement;
        const attrname = target.dataset.attrname!;
        const attributes = (itemSheet.item.system as { attributes: Record<string, unknown> }).attributes;
        switch (target.dataset.sub) {
            case "base": attributes[attrname] = newScore; break;
            case "min": (attributes[attrname] as { min: number }).min = newScore; break;
            case "max": (attributes[attrname] as { max: number }).max = newScore; break;
        }
        await itemSheet.item.update(
            {id: itemSheet.item.id, system: itemSheet.item.system},
            {diff: true});
        await this.render();
    }
}
