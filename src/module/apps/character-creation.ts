// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {
    addSpecDiceBudget,
    removeSpecDiceBudget,
    applySpecDelete,
    applySkillDelete,
    type AllocationConfig,
} from "./character-creation-helpers";
import {debug} from "../system/logger";


const {ApplicationV2, HandlebarsApplicationMixin, DialogV2} = foundry.applications.api;

function getAllocationConfig(): AllocationConfig {
    return {
        pipsPerDice: OD6S.pipsPerDice,
        specializationDice: OD6S.specializationDice,
        specStartingPipsPerDie: OD6S.specStartingPipsPerDie,
        initialSkills: OD6S.initialSkills,
    };
}

export default class OD6SCreateCharacter extends HandlebarsApplicationMixin(ApplicationV2) {

    actor: any;
    characterTemplates: any;
    selectedTemplate: any = "";
    templateData: any = {};
    skillScore: number;
    specScore = 0;
    custom: any = {};
    done = false;
    step = 1;
    customTemplate: any = {};

    constructor(actor: any, templates: any, options: any = {}) {
        super(options);
        this.actor = actor;
        this.characterTemplates = templates;
        this.skillScore = OD6S.initialSkills;
        this.custom.templateName = game.i18n.localize("OD6S.CREATE_CUSTOM_TEMPLATE");
        this.custom.attributeScore = OD6S.initialAttributes;
        this.custom.characterPoints = OD6S.initialCharacterPoints;
        this.custom.fatePoints = OD6S.initialFatePoints;
        this.custom.move = OD6S.initialMove;
        this.custom.attributeDice = OD6S.initialAttributes;
        this.custom.attributes = {};
        for (const a in OD6S.attributes) {
            this.custom.attributes[a] = 0;
        }
        this.custom.me = false;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-create-character",
        classes: ["od6s", "create-character-dialog"],
        tag: "div",
        window: {
            title: "OD6S.CREATE_CHARACTER",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 800,
            height: "auto",
        },
        actions: {
            next: OD6SCreateCharacter.#onNext,
            back: OD6SCreateCharacter.#onBack,
            cancel: OD6SCreateCharacter.#onCancel,
            finish: OD6SCreateCharacter.#onFinish,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/actor/character/create-character.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        if (this.actor.system.chartype.content !== "") {
            const idx = this.characterTemplates.findIndex((t: any) => t.name === this.actor.system.chartype.content);
            this.selectedTemplate = idx >= 0 ? this.characterTemplates[idx]._id : null;
            const matchedTemplate = this.selectedTemplate
                ? this.characterTemplates.find((i: any) => i._id === this.selectedTemplate)
                : null;
            this.templateData = matchedTemplate
                ? await od6sutilities.getItemByName(matchedTemplate.name)
                : null;
            if (!this.templateData) {
                ui.notifications.error(game.i18n.localize("OD6S.ERROR_TEMPLATE_NOT_FOUND"));
                this.templateData = {};
            }
        }

        const attrs: any[] = [];
        if (Object.keys(this.templateData).length !== 0) {
            for (const attribute in this.templateData.system.attributes) {
                attrs.push({
                    id: attribute,
                    score: this.templateData.system.attributes[attribute],
                    sort: OD6S.attributes[attribute].sort,
                    active: OD6S.attributes[attribute].active,
                });
            }
            attrs.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        }

        this.done = this.skillScore === 0 && this.specScore === 0;

        const data: any = {
            attrs,
            done: this.done,
            characterTemplates: this.characterTemplates,
            selectedTemplate: this.selectedTemplate,
            templateData: this.templateData,
            step: this.step,
            actor: this.actor,
            skillScore: this.skillScore,
            specScore: this.specScore,
            custom: this.custom,
        };

        if (typeof this.templateData.system !== "undefined"
            && typeof this.templateData.system.items !== "undefined") {
            data.skills = await od6sutilities.getSkillsFromTemplate(
                this.templateData.system.items.filter((i: any) => i.type === "skill"),
            );
        }
        return data;
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;
        const find = (sel: string): HTMLElement | null => root.querySelector(sel);
        const findAll = (sel: string): NodeListOf<HTMLElement> => root.querySelectorAll(sel);

        find(".template-dropdown")?.addEventListener("change", async (ev) => {
            const value = (ev.target as HTMLSelectElement).value;
            if (value === "custom") {
                this.selectedTemplate = value;
                this.templateData = {};
            } else {
                this.selectedTemplate = value;
                this.templateData = await od6sutilities.getItemByName(
                    this.characterTemplates.find((i: any) => i._id === this.selectedTemplate).name);
            }
            await this.actor.sheet._onClearCharacterTemplate();
            await this.render();
        });

        findAll(".skill-add").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                await this.actor.sheet.addItem(ev, this);
            });
        });

        findAll(".skill-delete").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                const target = ev.currentTarget as HTMLElement;
                const skill = this.actor.items.find((s: any) => s._id === target.dataset.itemId);
                this.skillScore = applySkillDelete(skill.system.base, this.skillScore);
                await this.actor.sheet.deleteItem(ev);
                await this.actor.sheet.getData();
                await this.render();
            });
        });

        findAll(".spec-delete").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                const target = ev.currentTarget as HTMLElement;
                const spec = this.actor.items.find((s: any) => s._id === target.dataset.itemId);
                const skill = this.actor.items.find((s: any) => s.name === spec.system.skill);
                const updated = applySpecDelete(
                    spec.system.base,
                    skill.system.base,
                    this.skillScore,
                    this.specScore,
                    getAllocationConfig(),
                );
                this.skillScore = updated.skillScore;
                this.specScore = updated.specScore;
                await this.actor.sheet.deleteItem(ev);
                await this.actor.sheet.getData();
                await this.render();
            });
        });

        findAll(".increase-dialog").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                if (this.skillScore < 1) {
                    ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_SKILL_DICE"));
                    return;
                }
                const target = ev.currentTarget as HTMLElement;
                const skill = this.actor.items.find((i: any) => i._id === target.dataset.itemId);
                if (typeof skill !== "undefined" && skill !== "") {
                    const updates: any[] = [{
                        _id: skill._id,
                        id: skill.id,
                        "system.base": (+target.dataset.base!) + 1,
                    }];
                    const specs = this.actor.items
                        .filter((i: any) => i.type === "specialization" && i.system.skill === skill.name);
                    for (const spec of specs) {
                        updates.push({_id: spec.id, "system.base": spec.system.base + 1});
                    }
                    await this.actor.updateEmbeddedDocuments("Item", updates);
                    await this.actor.sheet.getData();
                    this.skillScore = this.skillScore - 1;
                }
                await this.render();
            });
        });

        findAll(".increase-spec-dialog").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                if (this.specScore < 1) return;
                const target = ev.currentTarget as HTMLElement;
                const spec = this.actor.items.find((i: any) => i._id === target.dataset.itemId);
                if (typeof spec !== "undefined" && spec !== "") {
                    await spec.update({"system.base": (+target.dataset.base!) + 1});
                    await this.actor.sheet.getData();
                    this.specScore = this.specScore - 1;
                }
                await this.render();
            });
        });

        findAll(".decrease-dialog").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                if (this.skillScore >= OD6S.initialSkills) return;
                const target = ev.currentTarget as HTMLElement;
                if (+target.dataset.base! < 1) return;
                const skill = this.actor.items.find((i: any) => i._id === target.dataset.itemId);
                if (typeof skill !== "undefined" && skill !== "") {
                    const updates: any[] = [{
                        _id: skill._id,
                        id: skill.id,
                        "system.base": (+target.dataset.base!) - 1,
                    }];
                    const specs = this.actor.items
                        .filter((i: any) => i.type === "specialization" && i.system.skill === skill.name);
                    for (const spec of specs) {
                        updates.push({_id: spec.id, "system.base": spec.system.base - 1});
                    }
                    await this.actor.updateEmbeddedDocuments("Item", updates);
                    await this.actor.sheet.getData();
                    this.skillScore = this.skillScore + 1;
                }
                await this.render();
            });
        });

        findAll(".decrease-spec-dialog").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                const target = ev.currentTarget as HTMLElement;
                if (+target.dataset.base! <= 1) return;
                const spec = this.actor.items.find((i: any) => i._id === target.dataset.itemId);
                if (typeof spec !== "undefined" && spec !== "") {
                    await spec.update({"system.base": (+target.dataset.base!) - 1});
                    await this.actor.sheet.getData();
                    this.specScore = this.specScore + 1;
                }
                await this.render();
            });
        });

        findAll(".specialize-dialog").forEach((elem) => {
            elem.addEventListener("click", async (ev) => {
                ev.preventDefault();
                if (this.specScore === 0 && this.skillScore < OD6S.pipsPerDice) {
                    (ui.notifications as any).warning("OD6S.NOT_ENOUGH_SKILL_DICE");
                    return;
                }
                const specData = (ev.currentTarget as HTMLElement).dataset as DOMStringMap;
                const result = await DialogV2.input({
                    window: {title: game.i18n.localize("OD6S.CREATE_SPECIALIZATION")},
                    content: await foundry.applications.handlebars.renderTemplate(
                        "systems/od6s/templates/apps/character-creation/specialize.html",
                        specData,
                    ),
                    ok: {label: game.i18n.localize("OD6S.CREATE_SPECIALIZATION")},
                });
                if (result?.specname) await this.addSpec(result.specname, specData);
            });
        });

        find(".create-custom-template-name")?.addEventListener("change", async (ev) => {
            this.customTemplate.name = (ev.target as HTMLInputElement).value;
            await this.render();
        });

        find(".fate-points")?.addEventListener("change", async (ev) => {
            this.custom.fatePoints = (ev.target as HTMLInputElement).value;
            await this.render();
        });

        find(".character-points")?.addEventListener("change", async (ev) => {
            this.custom.characterPoints = (ev.target as HTMLInputElement).value;
            await this.render();
        });

        find(".move")?.addEventListener("change", async (ev) => {
            this.custom.move = (ev.target as HTMLInputElement).value;
            await this.render();
        });

        find(".me")?.addEventListener("change", async () => {
            this.custom.me = !this.custom.me;
            await this.render();
        });

        find(".add-spec-dice")?.addEventListener("click", async () => {
            const before = {skill: this.skillScore, spec: this.specScore};
            const result = addSpecDiceBudget(this.skillScore, this.specScore, getAllocationConfig());
            if (!result.ok) {
                ui.notifications.warn("OD6S.NOT_ENOUGH_SKILL_DICE");
            } else {
                this.skillScore = result.skillScore;
                this.specScore = result.specScore;
            }
            debug("character-creation", "add spec dice",
                {before, after: {skill: this.skillScore, spec: this.specScore}, ok: result.ok});
            await this.render();
        });

        find(".remove-spec-dice")?.addEventListener("click", async () => {
            const before = {skill: this.skillScore, spec: this.specScore};
            const result = removeSpecDiceBudget(this.skillScore, this.specScore, getAllocationConfig());
            if (!result.ok) {
                ui.notifications.warn("OD6S.NOT_ENOUGH_SPECIALIZATION_DICE");
            } else {
                this.skillScore = result.skillScore;
                this.specScore = result.specScore;
            }
            debug("character-creation", "remove spec dice",
                {before, after: {skill: this.skillScore, spec: this.specScore}, ok: result.ok});
            await this.render();
        });
    }

    static async #onNext(this: OD6SCreateCharacter): Promise<void> {
        if (this.step === 1) {
            await this.actor.sheet._onClearCharacterTemplate();
            await this.actor.deleteEmbeddedDocuments("Item", this.actor.items.map((i: any) => i.id));
            const template = await od6sutilities.getItemByName(
                this.characterTemplates.find((i: any) => i._id === this.selectedTemplate).name);
            await this.actor.sheet._addCharacterTemplate(template);
            await this.actor.sheet.getData();
        }
        this.step = this.step + 1;
        await this.render();
    }

    static async #onBack(this: OD6SCreateCharacter): Promise<void> {
        if (this.step === 2) {
            await this.actor.sheet._onClearCharacterTemplate();
            await this.actor.deleteEmbeddedDocuments("Item", this.actor.items.map((i: any) => i.id));
        }
        this.skillScore = OD6S.initialSkills;
        this.specScore = 0;
        this.step = this.step - 1;
        await this.render();
    }

    static async #onCancel(this: OD6SCreateCharacter): Promise<void> {
        await this.close();
    }

    static async #onFinish(this: OD6SCreateCharacter): Promise<void> {
        const update: any = {};
        if ((this.actor.img === "" || this.actor.img === "icons/svg/mystery-man.svg")
            && typeof this.templateData.img !== "undefined" && this.templateData.img !== "") {
            update.img = this.templateData.img;
        }
        update["system.created.value"] = true;
        await this.actor.update(update);
        this.done = true;
        await this.close();
    }

    async addSpec(name: any, data: any) {
        if (typeof name === "undefined" || name === "") {
            ui.notifications.warn(game.i18n.localize("OD6S.ERR_SPECIALIZATION_NAME"));
            return;
        }
        if (this.actor.specializations.find((s: any) => s.name === name)) {
            ui.notifications.warn(game.i18n.localize("OD6S.ERR_SPECIALIZATION_EXISTS"));
            return;
        }

        const skill: any = this.actor.getEmbeddedDocument("Item", data.itemId, true);
        let base = skill.system.base;
        let add: number;
        if (OD6S.specializationDice) {
            add = OD6S.pipsPerDice;
            base = base + add;
        } else {
            add = 1;
            base = base + add;
        }

        const newItemData = {
            name,
            type: "specialization",
            system: {
                attribute: skill.system.attribute,
                description: data.specname,
                base,
                time: skill.time,
                skill: skill.name,
            },
        };
        await this.actor.createEmbeddedDocuments("Item", [newItemData]);
        await this.actor.sheet.getData();

        if (this.specScore === 0) {
            this.specScore = (OD6S.pipsPerDice * OD6S.specStartingPipsPerDie) - add;
            this.skillScore = this.skillScore - OD6S.pipsPerDice;
        } else {
            this.specScore = this.specScore - add;
        }

        await this.render();
    }

    async close(options: object = {}): Promise<this> {
        const wasDone = this.done;
        await super.close(options);
        if (wasDone) {
            this.actor.sheet.render(true);
        } else {
            await this.actor.sheet._onClearCharacterTemplate();
            await this.actor.deleteEmbeddedDocuments("Item", this.actor.items.map((i: any) => i.id));
        }
        return this;
    }
}
