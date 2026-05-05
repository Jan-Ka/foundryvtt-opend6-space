// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import OD6SCreateCharacter from "../apps/character-creation";

// Listener modules
import {registerInventoryListeners} from "./sheet-listeners/inventory";
import {registerCombatActionListeners, registerCombatRollListeners} from "./sheet-listeners/combat-actions";
import {registerVehicleListeners} from "./sheet-listeners/vehicle";
import {registerScoreListeners, registerRollListeners} from "./sheet-listeners/scores";
import {registerEffectListeners} from "./sheet-listeners/effects";
import {registerDragListeners} from "./sheet-listeners/drag";

// Helper modules
import {bindPrimaryTabs} from "../system/utilities/bind-tabs";
import {deleteItem, addItem, onItemCreate} from "./sheet-helpers/item-crud";
import {
    onDropCharacterTemplate, onDropSpeciesTemplate, onDropItemGroup,
    addCharacterTemplate, templateItems,
    onClearCharacterTemplate, onClearSpeciesTemplate,
} from "./sheet-helpers/templates";
import {onDrop, onDropItem, onDropActor} from "./sheet-helpers/drops";
import {onSortItem, onSortCrew, onSortCargoItem, onSortContainerItem} from "./sheet-helpers/sorting";
import {
    prepareCharacterItems, prepareVehicleItems,
    prepareStarshipItems, prepareContainerItems,
} from "./sheet-helpers/prepare-items";
import {
    rollAvailableAction, rollAvailableVehicleAction,
    rollBodyPoints, rollPurchase as rollPurchaseHelper,
} from "./sheet-helpers/rolls";
import {onPurchase, onTransfer} from "./sheet-helpers/inventory-transfer";


const {HandlebarsApplicationMixin, DialogV2} = foundry.applications.api;
const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;

/**
 * OD6S actor sheet — ApplicationV2 + HandlebarsApplicationMixin.
 * Single template (`actor-sheet.html`) handles all actor types via internal branching.
 */
export class OD6SActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["od6s", "sheet", "actor"],
        position: {width: 915, height: 800},
        window: {resizable: true, minimizable: true},
        form: {submitOnChange: true, closeOnSubmit: false},
        actions: {},
    };

    static PARTS = {
        body: {template: "systems/od6s/templates/actor/common/actor-sheet.html"},
    };

    async _prepareContext(_options?: object): Promise<object> {
        const actor = this.actor;
        const context: any = {
            actor,
            document: actor,
            system: actor.system,
            items: actor.items.contents,
            dtypes: ["String", "Number", "Boolean"],
            editable: this.isEditable,
            owner: actor.isOwner,
            cssClass: this.isEditable ? "editable" : "locked",
        };

        if (actor.type === "character" || actor.type === "npc" || actor.type === "creature") {
            Object.assign(actor, prepareCharacterItems(context.items));
            await this._setCommonFlags();
        } else if (actor.type === "vehicle") {
            Object.assign(actor, prepareVehicleItems(context.items, OD6S.cargo_hold));
        } else if (actor.type === "starship") {
            Object.assign(actor, prepareStarshipItems(context.items, OD6S.cargo_hold));
        } else if (actor.type === "container" && actor.isOwner) {
            Object.assign(actor, prepareContainerItems(context.items));
        }

        context.items = context.items.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

        if (actor.type !== "container") {
            const attributes: any[] = [];
            for (const i in OD6S.attributes) {
                const entry = actor.system.attributes[i];
                entry.id = i;
                entry.sort = OD6S.attributes[i].sort;
                entry.active = OD6S.attributes[i].active;
                attributes.push(entry);
            }
            context.attrs = attributes.sort((a, b) => a.sort - b.sort);
        }

        return context;
    }

    async _setCommonFlags() {
        const actor = this.document;
        if (typeof actor.getFlag("od6s", "fatepointeffect") === "undefined") {
            await actor.setFlag("od6s", "fatepointeffect", false);
        }
        if (typeof actor.getFlag("od6s", "crew") === "undefined") {
            await actor.setFlag("od6s", "crew", "");
        }
        if (typeof actor.getFlag("od6s", "hasTakenTurn") === "undefined") {
            await actor.setFlag("od6s", "hasTakenTurn", false);
        }
    }

    /* -------------------------------------------- */
    /*  Render & Event Listeners                     */
    /* -------------------------------------------- */

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;

        bindPrimaryTabs(this as any, root);

        // Roll triggers must be bound for any owner regardless of edit mode —
        // V2 sheets render in PLAY mode by default (isEditable === false), but
        // rolling a skill/attack is a play-mode action. See issue #76.
        const html = [root];
        if (this.actor.isOwner) {
            registerRollListeners(html, this);
            registerCombatRollListeners(html, this);
        }

        if (!this.isEditable) return;

        root.querySelectorAll(".alpha-item-sort-button").forEach((elem) =>
            elem.addEventListener("click", async () => {
                await this._alphaSortAllItems();
                await this.render();
            }));

        root.querySelectorAll(".track_stuns_counter").forEach((elem) =>
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                await this.document.update({system: {stuns: {value: 0}}});
                await this.render();
            }));

        root.querySelectorAll(".create-character").forEach((elem) =>
            elem.addEventListener("click", async () => {
                const newChar = new OD6SCreateCharacter(this.document,
                    od6sutilities.getAllItemsByType("character-template"));
                newChar.render({force: true});
                await this.close();
            }));

        root.querySelectorAll(".reset-template").forEach((elem) =>
            elem.addEventListener("click", async () => {
                const ok = await DialogV2.confirm({
                    window: {title: game.i18n.localize("OD6S.CLEAR_TEMPLATE")},
                    content: `<p>${game.i18n.localize("OD6S.CONFIRM_TEMPLATE_CLEAR")}</p>`,
                });
                if (ok) await this._onClearCharacterTemplate();
            }));

        root.querySelectorAll(".reset-species-template").forEach((elem) =>
            elem.addEventListener("click", async () => {
                const ok = await DialogV2.confirm({
                    window: {title: game.i18n.localize("OD6S.CLEAR_SPECIES_TEMPLATE")},
                    content: `<p>${game.i18n.localize("OD6S.CONFIRM_SPECIES_TEMPLATE_CLEAR")}</p>`,
                });
                if (ok) await this._onClearSpeciesTemplate();
            }));

        // Existing listener modules accept html[0]; pass [root] for compatibility.
        registerInventoryListeners(html, this);
        registerCombatActionListeners(html, this);
        registerVehicleListeners(html, this);
        registerScoreListeners(html, this);
        registerEffectListeners(html, this);
        registerDragListeners(html, this);
    }

    _sortItems(items: any, sortType: any) {
        if (sortType === "alpha") return items.sort((a: any, b: any) => a.name.localeCompare(b.name));
        return items;
    }

    _resetSortToAlpha(items: any) {
        items = items.sort((a: any, b: any) => a.name.localeCompare(b.name));
        let sortNumber = 1000;
        for (const i in items) {
            items[i].sort = sortNumber;
            sortNumber = sortNumber + 500;
        }
        return items;
    }

    async _alphaSortAllItems() {
        const items = this._resetSortToAlpha(this.document.items.contents);
        const updates = items.map((i: any) => ({_id: i._id, sort: i.sort}));
        await this.document.updateEmbeddedDocuments("Item", updates);
    }

    /* -------------------------------------------- */
    /*  Item CRUD Methods (delegates)                */
    /* -------------------------------------------- */

    async deleteItem(ev: any) {
        return deleteItem(this, ev);
    }

    async addItem(ev: any, caller: any = this) {
        return addItem(this, ev, caller);
    }

    _onItemCreate(event: any) {
        return onItemCreate(this, event);
    }

    /* -------------------------------------------- */
    /*  Action Methods                               */
    /* -------------------------------------------- */

    async _onActionAdd() {
        await this._createAction({name: game.i18n.localize("OD6S.ACTION_OTHER"), subtype: "misc"});
        await this.render();
    }

    async _onAvailableActionAdd(event: any) {
        await this._createAction({
            name: event.currentTarget.dataset.name,
            type: "availableaction",
            subtype: event.currentTarget.dataset.type,
            itemId: event.currentTarget.dataset.id,
            rollable: event.currentTarget.dataset.rollable,
        });
    }

    /* -------------------------------------------- */
    /*  Drop Handling (delegates)                    */
    /* -------------------------------------------- */

    async _onDropItemGroup(event: any, item: any, data: any) {
        return onDropItemGroup(this, event, item, data);
    }

    async _onDropSpeciesTemplate(event: any, item: any, data: any) {
        return onDropSpeciesTemplate(this, event, item, data);
    }

    async _onDropCharacterTemplate(event: any, item: any, data: any) {
        return onDropCharacterTemplate(this, event, item, data);
    }

    async _addCharacterTemplate(item: any) {
        return addCharacterTemplate(this, item);
    }

    async _templateItems(itemList: any) {
        return templateItems(this, itemList);
    }

    async _onDrop(event: any) {
        return onDrop(this, event);
    }

    async _onDropItem(event: any, data: any) {
        return onDropItem(this, event, data);
    }

    async _onDropActor(event: any, data: any) {
        return onDropActor(this, event, data);
    }

    /* -------------------------------------------- */
    /*  Sorting Methods (delegates)                  */
    /* -------------------------------------------- */

    _onSortItem(event: any, itemData: any) {
        return onSortItem(this, event, itemData);
    }

    async _onSortCrew(event: any, data: any) {
        return onSortCrew(this, event, data);
    }

    async _onSortContainerItem(event: any, itemData: any) {
        return onSortContainerItem(this, event, itemData);
    }

    async _onSortCargoItem(event: any, itemData: any) {
        return onSortCargoItem(this, event, itemData);
    }

    /* -------------------------------------------- */
    /*  Utility Methods                              */
    /* -------------------------------------------- */

    _isEquippable(itemType: any) {
        return OD6S.equippable.includes(itemType);
    }

    async _createAction(data: any) {
        if (data.name.startsWith("OD6S.")) {
            data.name = game.i18n.localize(data.name);
        }
        if (["dodge", "parry", "block", "vehicledodge"].includes(data.subtype)) {
            if (this.document.itemTypes.action.find((i: any) => i.system.subtype === data.subtype)) {
                ui.notifications.warn(game.i18n.localize("OD6S.ACTION_ONLY_ONE"));
                return;
            }
        }
        return await this.document.createEmbeddedDocuments("Item", [{
            name: data.name,
            type: "action",
            system: {
                type: data.type,
                subtype: data.subtype,
                rollable: data.rollable,
                itemId: data.itemId,
            },
        }]);
    }

    /* -------------------------------------------- */
    /*  Template Clearing Methods (delegates)        */
    /* -------------------------------------------- */

    async _onClearSpeciesTemplate() {
        return onClearSpeciesTemplate(this);
    }

    async _onClearCharacterTemplate() {
        return onClearCharacterTemplate(this);
    }

    /* -------------------------------------------- */
    /*  Drag Handlers                                */
    /* -------------------------------------------- */

    async _dragAvailableCombatAction(event: any) {
        const data = event.target.children[0].dataset;
        const transferData = {
            name: data.name,
            type: "availableaction",
            subtype: typeof data.subtype !== "undefined" ? data.subtype : data.type,
            itemId: data.id,
            rollable: data.rollable,
        };
        return event.dataTransfer.setData("text/plain", JSON.stringify(transferData));
    }

    async _dragAssignedCombatAction(event: any) {
        const data = event.target.children[0].dataset;
        const transferData = {
            name: data.name,
            type: "assignedaction",
            subtype: typeof data.subtype !== "undefined" ? data.subtype : data.type,
            itemId: data.itemId,
            rollable: data.rollable,
            id: data.id,
        };
        return event.dataTransfer.setData("text/plain", JSON.stringify(transferData));
    }

    async _dragCrewMember(event: any) {
        const data = event.target.dataset;
        const transferData = {crewUuid: data.crewUuid, type: "crewmember"};
        return event.dataTransfer.setData("text/plain", JSON.stringify(transferData));
    }

    _onDragStart(event: any) {
        const li = event.currentTarget;
        if ("link" in event.target.dataset) return;

        let dragData;
        if (li.dataset.itemId) {
            const item = this.document.items.get(li.dataset.itemId);
            dragData = item!.toDragData();
        }
        if (li.dataset.effectId) {
            const effect = this.document.effects.get(li.dataset.effectId);
            dragData = effect!.toDragData();
        }
        if (li.dataset.crewUuid) {
            dragData = li.dataset.crewUuid;
        }
        if (!dragData) return;
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    /* -------------------------------------------- */
    /*  Roll Methods (delegates)                     */
    /* -------------------------------------------- */

    async _rollAvailableVehicleAction(ev: any) {
        return rollAvailableVehicleAction(this, ev);
    }

    async _rollAvailableAction(ev: any) {
        return rollAvailableAction(this, ev);
    }

    async _editEffect(ev: any) {
        const effect = this.document.effects.find((e: any) => e.id === ev.currentTarget.dataset.effectId);
        new (foundry.applications.sheets as any).ActiveEffectConfig({document: effect}).render({force: true});
    }

    /* -------------------------------------------- */
    /*  Crew Management                              */
    /* -------------------------------------------- */

    async linkCrew(uuid: any) {
        if (this.document.system.crewmembers.includes(uuid)) return;

        const actor = await od6sutilities.getActorFromUuid(uuid);
        let result;
        if (game.user.isGM) {
            result = await actor!.addToCrew(this.document.uuid);
        } else {
            result = await OD6S.socket.executeAsGM("addToVehicle", this.document.uuid, uuid);
        }

        if (result) {
            const crew = {uuid: actor!.uuid, name: actor!.name, sort: 0};
            const update: any = {
                id: this.document.id,
                system: {crewmembers: this.document.system.crewmembers},
            };
            update.system.crewmembers.push(crew);
            await this.document.update(update);
        }
    }

    async unlinkCrew(crewID: any) {
        const crewMembers = this.document.system.crewmembers.filter((e: any) => e.uuid !== crewID);

        if (await fromUuid(crewID)) {
            if (game.user.isGM) {
                const actor = await od6sutilities.getActorFromUuid(crewID);
                await actor!.removeFromCrew(this.document.uuid);
            } else {
                game.socket.emit("system.od6s", {
                    operation: "removeFromVehicle",
                    message: {actorId: crewID, vehicleId: this.document.uuid},
                });
            }
        }

        await this.document.update({
            id: this.document.id,
            system: {crewmembers: crewMembers},
        });
    }

    /* -------------------------------------------- */
    /*  Rolling & Inventory (delegates)              */
    /* -------------------------------------------- */

    async _rollBodyPoints() {
        return rollBodyPoints(this);
    }

    async rollPurchase(ev: any, buyerId: any) {
        return rollPurchaseHelper(this, ev, buyerId);
    }

    async _onPurchase(itemId: any, buyerId: any) {
        return onPurchase(this, itemId, buyerId);
    }

    async _onTransfer(itemId: any, senderId: any, recId: any) {
        return onTransfer(this, itemId, senderId, recId);
    }
}
