// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sroll} from "../apps/roll";
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import OD6SCreateCharacter from "../apps/character-creation";

// Listener modules
import {registerInventoryListeners} from "./sheet-listeners/inventory";
import {registerCombatActionListeners} from "./sheet-listeners/combat-actions";
import {registerVehicleListeners} from "./sheet-listeners/vehicle";
import {registerScoreListeners} from "./sheet-listeners/scores";
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
            this._prepareCharacterItems(context);
            await this._setCommonFlags();
        } else if (actor.type === "vehicle") {
            this._prepareVehicleItems(context);
        } else if (actor.type === "starship") {
            this._prepareStarshipItems(context);
        } else if (actor.type === "container") {
            this._prepareContainerItems(context);
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
    /*  Item Preparation Methods                     */
    /* -------------------------------------------- */

    _prepareCharacterItems(sheetData: any) {
        const actorData = sheetData.actor;
        const gear: any[] = [];
        const skills: any[] = [];
        const specializations: any[] = [];
        const weapons: any[] = [];
        const armor: any[] = [];
        const advantages: any[] = [];
        const disadvantages: any[] = [];
        const specialabilities: any[] = [];
        const cybernetics: any[] = [];
        const manifestations: any[] = [];
        const actions: any[] = [];

        for (const i of sheetData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            if (i.type === "gear") {
                gear.push(i);
            } else if (i.type === "skill") {
                skills.push(i);
            } else if (i.type === "specialization") {
                specializations.push(i);
            } else if (i.type === "weapon") {
                weapons.push(i);
            } else if (i.type === "armor") {
                armor.push(i);
            } else if (i.type === "advantage") {
                advantages.push(i);
            } else if (i.type === "disadvantage") {
                disadvantages.push(i);
            } else if (i.type === "specialability") {
                specialabilities.push(i);
            } else if (i.type === "cybernetic") {
                cybernetics.push(i);
            } else if (i.type === "manifestation") {
                manifestations.push(i);
            } else if (i.type === "action") {
                actions.push(i);
            }
        }

        actorData.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.skills = skills.sort((a, b) => a.sort - b.sort);
        actorData.specializations = specializations.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.weapons = weapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.armor = armor.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.advantages = advantages.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.disadvantages = disadvantages.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.specialabilities = specialabilities.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.cybernetics = cybernetics.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.manifestations = manifestations.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        actorData.actions = actions.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    _prepareVehicleItems(sheetData: any) {
        const actorData = sheetData.actor;
        const vehicle_weapons: any[] = [];
        const vehicle_gear: any[] = [];
        const cargo_hold: any[] = [];
        const skills: any[] = [];
        const specializations: any[] = [];

        for (const i of sheetData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            if (i.type === "skill") {
                skills.push(i);
            } else if (i.type === "specialization") {
                specializations.push(i);
            } else if (i.type === "vehicle-weapon") {
                vehicle_weapons.push(i);
            } else if (i.type === "vehicle-gear") {
                vehicle_gear.push(i);
            } else if (OD6S.cargo_hold.includes(i.type)) {
                // Cargo can hold any cargo-eligible type that isn't a
                // native equipped slot for this actor (vehicle-weapon /
                // vehicle-gear handled above). Without this catch-all,
                // items added via the cargo-hold + dialog of types like
                // starship-weapon / starship-gear are created but never
                // displayed.
                cargo_hold.push(i);
            }
        }

        actorData.vehicle_weapons = vehicle_weapons;
        actorData.vehicle_gear = vehicle_gear;
        actorData.cargo_hold = cargo_hold;
        actorData.skills = skills;
        actorData.specializations = specializations;
    }

    _prepareStarshipItems(sheetData: any) {
        const actorData = sheetData.actor;
        const starship_weapons: any[] = [];
        const starship_gear: any[] = [];
        const cargo_hold: any[] = [];
        const skills: any[] = [];
        const specializations: any[] = [];

        for (const i of sheetData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            if (i.type === "skill") {
                skills.push(i);
            } else if (i.type === "specialization") {
                specializations.push(i);
            } else if (i.type === "starship-weapon") {
                starship_weapons.push(i);
            } else if (i.type === "starship-gear") {
                starship_gear.push(i);
            } else if (OD6S.cargo_hold.includes(i.type)) {
                // Cargo can hold any cargo-eligible type that isn't a
                // native equipped slot for this actor (starship-weapon /
                // starship-gear handled above). Without this catch-all,
                // items added via the cargo-hold + dialog of types like
                // vehicle-weapon / vehicle-gear are created but never
                // displayed.
                cargo_hold.push(i);
            }
        }

        actorData.starship_weapons = starship_weapons;
        actorData.starship_gear = starship_gear;
        actorData.cargo_hold = cargo_hold;
        actorData.skills = skills;
        actorData.specializations = specializations;
    }

    _prepareContainerItems(sheetData: any) {
        if (!this.document.isOwner) return;
        const actorData = sheetData.actor;
        const container: any[] = [];
        for (const i of sheetData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;
            container.push(i);
        }
        actorData.container = container;
    }

    /* -------------------------------------------- */
    /*  Render & Event Listeners                     */
    /* -------------------------------------------- */

    async _onRender(context: object, options: object): Promise<void> {
        await super._onRender(context, options);

        const root = this.element as HTMLElement;

        bindPrimaryTabs(this as any, root);

        if (!this.isEditable) return;

        const html = [root];

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
    /*  Roll Methods                                 */
    /* -------------------------------------------- */

    async _rollAvailableVehicleAction(ev: any) {
        const rollData: any = {score: 0, scale: 0};
        const data = ev.currentTarget.dataset;
        const actorData = this.document.system;

        if (data.rollable !== "true") return;

        if (["vehicleramattack", "vehiclemaneuver", "vehicledodge"].includes(data.type)) {
            rollData.score = od6sutilities.getScoreFromSkill(this.document,
                    actorData.vehicle.specialization.value,
                    actorData.vehicle.skill.value, OD6S.vehicle_actions[data.id].base)
                + actorData.vehicle.maneuverability.score;
        } else if (data.type === "vehiclesensors") {
            rollData.score = +(od6sutilities.getScoreFromSkill(this.document, "",
                actorData.vehicle.sensors.skill, OD6S.vehicle_actions[data.id].base)) + (+data.score);
        } else if (data.type === "vehicleshields") {
            rollData.score = od6sutilities.getScoreFromSkill(this.document, "",
                actorData.vehicle.shields.skill.value, OD6S.vehicle_actions[data.id].base);
        } else {
            const item = actorData.vehicle.vehicle_weapons.find((i: any) => i.id === data.id);
            if (item !== null && typeof item !== "undefined") {
                rollData.score = od6sutilities.getScoreFromSkill(this.document, item.system.specialization.value,
                    game.i18n.localize(item.system.skill.value), item.system.attribute.value);
                rollData.score += item.system.fire_control.score;
                rollData.scale = item.system.scale.score;
                rollData.damage = item.system.damage.score;
                rollData.damage_type = item.system.damage.type;
            }
        }

        if (!rollData.scale) rollData.scale = actorData.vehicle.scale.score;
        rollData.name = game.i18n.localize(data.name);
        rollData.type = "action";
        rollData.actor = this.document;
        rollData.subtype = data.type;
        await od6sroll._onRollDialog(rollData);
    }

    async _rollAvailableAction(ev: any) {
        const rollData: any = {token: this.token};
        const data = ev.currentTarget.dataset;
        let name = game.i18n.localize(data.name);
        let flatPips = 0;

        if (data.rollable !== "true") return;
        if (data.id !== "") {
            const item = this.document.items.find((i: any) => i.id === data.id);
            if (item !== null && typeof item !== "undefined") {
                return await item.roll(data.type === "parry");
            }
        }

        if (["dodge", "parry", "block"].includes(data.type)) {
            switch (data.type) {
                case "dodge": name = OD6S.actions.dodge.skill; break;
                case "parry": name = OD6S.actions.parry.skill; break;
                case "block": name = OD6S.actions.block.skill; break;
            }
            name = game.i18n.localize(name);
        }

        if (data.type === "attribute") {
            name = data.name;
            rollData.attribute = data.id;
        } else {
            let skill = this.document.items.find((i: any) => i.type === "skill" && i.name === name);
            if (skill !== null && typeof skill !== "undefined") {
                if (OD6S.flatSkills) {
                    rollData.score = (+this.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                    flatPips = (+skill.system.score);
                } else {
                    rollData.score = (+skill.system.score)
                        + (+this.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                }
            } else {
                skill = await od6sutilities._getItemFromWorld(name);
                if (skill !== null && typeof skill !== "undefined") {
                    rollData.score = (+this.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                } else {
                    skill = await od6sutilities._getItemFromCompendium(name);
                    if (skill !== null && typeof skill !== "undefined") {
                        rollData.score = (+this.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                    } else {
                        for (const a in OD6S.actions) {
                            if (OD6S.actions[a].type === ev.currentTarget.dataset.type) {
                                rollData.score = (+this.document.system.attributes[OD6S.actions[a].base].score);
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (flatPips > 0) rollData.flatpips = flatPips;
        rollData.name = name;
        rollData.type = "action";
        rollData.actor = this.document;
        rollData.subtype = data.type;
        await od6sroll._onRollDialog(rollData);
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
    /*  Rolling                                      */
    /* -------------------------------------------- */

    async _rollBodyPoints() {
        const strDice = od6sutilities.getDiceFromScore(this.document.system.attributes.str.score
            + this.document.system.attributes.str.mod);
        let rollString;
        if (game.settings.get("od6s", "use_wild_die")) {
            if (strDice.dice < 2) rollString = "1dw";
            else rollString = (+strDice.dice - 1) + "d6+1dw";
        } else {
            rollString = strDice.dice + "d6";
        }
        rollString += "+" + (+strDice.pips + 20);

        const label = game.i18n.localize("OD6S.ROLLING") + " " + game.i18n.localize(OD6S.bodyPointsName);

        let rollMode: any = 0;
        if (game.user.isGM && game.settings.get("od6s", "hide-gm-rolls")) {
            rollMode = (CONST as any).DICE_ROLL_MODES.PRIVATE;
        }
        const roll = await new Roll(rollString).evaluate();
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker(),
            flavor: label,
            rollMode,
            create: true,
        });

        await this.document.update({"system.wounds.body_points.max": roll.total});
    }

    async rollPurchase(ev: any, buyerId: any) {
        const item = this.document.items.get(ev.currentTarget.dataset.itemId);
        if (typeof item === "undefined") return ui.notifications.warn(game.i18n.localize("OD6S.ITEM_NOT_FOUND"));
        const data: any = {
            name: game.i18n.localize("OD6S.PURCHASE") + " " + item.name,
            itemId: item.id,
            actor: (game as any).actors.get(buyerId),
            seller: this.document.id,
            type: "purchase",
            difficultyLevel: OD6S.difficultyShort[item.system.price],
        };
        data.score = data.actor.system.funds.score;
        await od6sroll._onRollDialog(data);
    }

    async _onPurchase(itemId: any, buyerId: any) {
        const seller = this.document;
        const buyer = (game as any).actors.get(buyerId);
        const item = seller.items.get(itemId);

        if (OD6S.cost === "1") {
            if ((+buyer!.system.credits.value) < (+item!.system.cost)) {
                ui.notifications.warn(game.i18n.localize("OD6S.WARN_NOT_ENOUGH_CURRENCY"));
                return;
            }
            await buyer!.update({"system.credits.value": (+buyer!.system.credits.value) - (+item!.system.cost)});
        }

        const boughtItem = JSON.parse(JSON.stringify(item));
        boughtItem.system.quantity = 1;
        if (item!.type === "gear") {
            const hasItem = buyer!.items.filter((i: any) => i.name === item!.name);
            if (hasItem.length > 0) {
                await hasItem[0].update({"system.quantity": (+hasItem[0].system.quantity) + 1});
            } else {
                await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
            }
        } else {
            await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
        }

        const sellerUpdate: any = {};
        if (item!.system.quantity > 0) sellerUpdate["system.quantity"] = (+item!.system.quantity) - 1;
        await item!.update(sellerUpdate);
    }

    async _onTransfer(itemId: any, senderId: any, recId: any) {
        const sender = (game as any).actors.get(senderId);
        const receiver = (game as any).actors.get(recId);
        const item = sender!.items.get(itemId);

        const recItem = JSON.parse(JSON.stringify(item));
        recItem.quantity = 1;
        if (item!.type === "gear") {
            const hasItem = receiver!.items.filter((i: any) => i.name === item!.name);
            if (hasItem.length > 0) {
                await hasItem[0].update({"system.quantity": (+hasItem[0].system.quantity) + 1});
            } else {
                await receiver!.createEmbeddedDocuments("Item", [recItem]);
            }

            const senderUpdate: any = {};
            if (item!.system.quantity > 0) senderUpdate["system.quantity"] = (+item!.system.quantity) - 1;
            await item!.update(senderUpdate);

            if ((sender!.type === "character" || sender!.type === "container")
                && item!.system.quantity === 0) {
                await sender!.deleteEmbeddedDocuments("Item", [item!.id]);
            }
        } else {
            await receiver!.createEmbeddedDocuments("Item", [recItem]);
            await sender!.deleteEmbeddedDocuments("Item", [item!.id]);
        }

        await this.render();
    }
}
