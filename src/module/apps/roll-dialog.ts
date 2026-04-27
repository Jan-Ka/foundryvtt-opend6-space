import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {od6sroll} from "./roll";

declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    actorSheet: any;
    rollData: any;
    cpLimit: any;
    onSubmit: () => void | Promise<void>;

    constructor(actorSheet: any, onSubmit: () => void | Promise<void>, options: any = {}) {
        super(options);
        this.actorSheet = actorSheet;
        this.rollData = this.actorSheet.rollData;
        this.cpLimit = OD6S.characterPointLimits;
        this.onSubmit = onSubmit;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-roll-dialog",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.ROLL",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 500,
            height: "auto",
        },
        form: {
            handler: RollDialog.#onSubmitForm,
            submitOnChange: false,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        standard: {
            template: "systems/od6s/templates/roll.html",
        },
        metaphysics: {
            template: "systems/od6s/templates/metaphysicsRoll.html",
        },
    };

    _configureRenderOptions(options: any): void {
        super._configureRenderOptions(options);
        const isMetaphysics = this.rollData?.template?.includes("metaphysics");
        options.parts = [isMetaphysics ? "metaphysics" : "standard"];
    }

    async _prepareContext(_options?: object): Promise<object> {
        if (this.rollData.actor.type === "character") {
            this.rollData.cpcostcolor =
                this.rollData.characterpoints > this.rollData.actor.system.characterpoints.value ? "red" : "black";
        }
        return this.rollData;
    }

    async _onClose(_options: object): Promise<void> {
        if (!this.#submitted) {
            await od6sroll.cancelAction(null as any);
        }
    }

    #submitted = false;

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;
        const find = (sel: string): HTMLElement | null => root.querySelector(sel);
        const findAll = (sel: string): NodeListOf<HTMLElement> => root.querySelectorAll(sel);

        find(".cpup")?.addEventListener("click", async () => {
            let rollType = this.rollData.type;
            const actor = this.rollData.actor;
            if (rollType === "weapon") {
                const item = actor.items.find((i: any) => i.id === this.rollData.itemid);
                const spec = item.system.specialization;
                if (actor.items.find((i: any) => i.type === "specialization" && i.name === spec)) {
                    rollType = "specialization";
                } else if (actor.items.find((i: any) => i.type === "skill" && i.name === item.skill)) {
                    rollType = "skill";
                } else {
                    rollType = "attribute";
                }
            }

            if (rollType === "skill") {
                if (this.rollData.title.includes("Parry")) rollType = "parry";
                else if (this.rollData.title.includes("Dodge")) rollType = "dodge";
                else if (this.rollData.title.includes("Block")) rollType = "block";
            }
            if (this.rollData.subtype === "vehicledodge") rollType = "dodge";
            if (this.rollData.subtype === "parry") rollType = "parry";

            if ((+this.rollData.characterpoints) >= this.cpLimit[rollType]) {
                ui.notifications.warn(game.i18n.localize("OD6S.MAX_CP"));
            } else if ((+this.rollData.characterpoints) >= actor.system.characterpoints.value) {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_ROLL"));
            } else {
                this.rollData.characterpoints++;
                await this.render();
            }
        });

        find(".cpdown")?.addEventListener("click", async () => {
            if (this.rollData.characterpoints > 0) this.rollData.characterpoints--;
            await this.render();
        });

        find("#useattribute")?.addEventListener("change", async (ev) => {
            const value = (ev.target as HTMLSelectElement).value;
            this.rollData.attribute = value;
            const attributeScore = this.rollData.actor.system.attributes[value].score;
            const skillScore = this.rollData.actor.items
                .filter((i: any) => i.name === this.rollData.label)[0].system.score;
            const newScore = (+attributeScore) + (+skillScore);
            const newDice = od6sutilities.getDiceFromScore(newScore);
            this.rollData.dice = newDice.dice;
            this.rollData.pips = newDice.pips;
            await this.render();
        });

        find("#scaledice")?.addEventListener("change", (ev) => {
            this.rollData.scaledice = +(ev.target as HTMLInputElement).valueAsNumber;
        });

        find("#bonusdice")?.addEventListener("change", (ev) => {
            this.rollData.bonusdice = +(ev.target as HTMLInputElement).valueAsNumber;
        });

        find("#bonuspips")?.addEventListener("change", (ev) => {
            this.rollData.bonuspips = +(ev.target as HTMLInputElement).valueAsNumber;
        });

        find(".timer input")?.addEventListener("change", async (ev) => {
            const item = this.rollData.actor.items.find((i: any) => i.id === this.rollData.itemid);
            const value = (ev.target as HTMLInputElement).valueAsNumber;
            await item.setFlag("od6s", "explosiveTimer", value);
            this.rollData.timer = value;
            await this.render();
        });

        find(".contact input")?.addEventListener("change", async () => {
            const item = this.rollData.actor.items.find((i: any) => i.id === this.rollData.itemid);
            await item.setFlag("od6s", "explosiveTimer", 0);
            this.rollData.contact = !this.rollData.contact;
            this.rollData.timer = "";
            await this.render();
        });

        find("#fatepoint")?.addEventListener("click", async () => {
            this.rollData.fatepoint = !this.rollData.fatepoint;
            if (this.rollData.fatepoint && this.rollData.actor.system.fatepoints.value <= 0) {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_FP_ROLL"));
                this.rollData.fatepoint = !this.rollData.fatepoint;
            }
            if (this.rollData.fatepoint) {
                this.rollData.dice = this.rollData.dice * 2;
                this.rollData.pips = this.rollData.pips * 2;
            } else {
                this.rollData.dice = this.rollData.originaldice;
                this.rollData.pips = this.rollData.originalpips;
            }
            await this.render();
        });

        find("#wilddie")?.addEventListener("click", async () => {
            this.rollData.wilddie = !this.rollData.wilddie;
            await this.render();
        });

        find("#fulldefense")?.addEventListener("click", async () => {
            this.rollData.fulldefense = !this.rollData.fulldefense;
            if (this.rollData.actor.system.stuns.current && this.rollData.actor.system.stuns.rounds > 0) {
                this.rollData.stunnedpenalty = this.rollData.fulldefense
                    ? 0 : this.rollData.actor.system.stuns.current;
            }
            await this.render();
        });

        find("#stun")?.addEventListener("click", async () => {
            this.rollData.stun = !this.rollData.stun;
        });

        find("#difficulty")?.addEventListener("change", async (ev) => {
            this.rollData.difficulty = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#actionpenalty")?.addEventListener("change", async (ev) => {
            this.rollData.actionpenalty = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#woundpenalty")?.addEventListener("change", async (ev) => {
            this.rollData.woundpenalty = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#stunnedpenalty")?.addEventListener("change", async (ev) => {
            this.rollData.stunnedpenalty = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#otherpenalty")?.addEventListener("change", async (ev) => {
            this.rollData.otherpenalty = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#shots")?.addEventListener("change", async (ev) => {
            this.rollData.shots = +(ev.target as HTMLInputElement).valueAsNumber;
            await this.render();
        });

        find("#target")?.addEventListener("change", async (ev) => {
            this.rollData.target = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        findAll(".difficultylevel select").forEach((sel) => {
            sel.addEventListener("change", async (ev) => {
                const target = ev.target as HTMLSelectElement;
                const wrapper = target.closest(".difficultylevel") as HTMLElement | null;
                const skillKey = wrapper?.dataset.skill;
                if (typeof skillKey !== "undefined") {
                    this.rollData.skills[skillKey].difficulty = target.value;
                } else {
                    this.rollData.difficultylevel = target.value;
                }
                await this.render();
            });
        });

        find("#range")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.range = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#attackoption")?.addEventListener("change", async (ev) => {
            const value = (ev.target as HTMLSelectElement).value;
            this.rollData.multishot = value === "OD6S.ATTACK_RANGED_SINGLE_FIRE_AS_MULTI";
            this.rollData.modifiers.attackoption = value;
            await this.render();
        });

        find("#calledshot")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.calledshot = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#cover")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.cover = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#coverlight")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.coverlight = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#coversmoke")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.coversmoke = (ev.target as HTMLSelectElement).value;
            await this.render();
        });

        find("#miscmod")?.addEventListener("change", async (ev) => {
            this.rollData.modifiers.miscmod = (ev.target as HTMLInputElement).value;
            await this.render();
        });

        find("#vehiclespeed")?.addEventListener("change", (ev) => {
            this.rollData.vehiclespeed = (ev.target as HTMLSelectElement).value;
        });

        find("#vehiclecollisiontype")?.addEventListener("change", (ev) => {
            this.rollData.vehiclecollisiontype = (ev.target as HTMLSelectElement).value;
        });

        find("#vehicleterraindifficulty")?.addEventListener("change", (ev) => {
            this.rollData.vehicleterraindifficulty = (ev.target as HTMLSelectElement).value;
        });
    }

    static async #onSubmitForm(
        this: RollDialog,
        _event: Event,
        _form: HTMLFormElement,
        _formData: any,
    ): Promise<void> {
        this.#submitted = true;
        await this.onSubmit();
    }
}
