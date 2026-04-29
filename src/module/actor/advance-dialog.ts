// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class AdvanceDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    actorSheet: any;
    advanceData: any;
    onSubmit: (dialog: AdvanceDialog, formData: any) => void | Promise<void>;

    constructor(
        actorSheet: any,
        advanceData: any,
        onSubmit: (dialog: AdvanceDialog, formData: any) => void | Promise<void>,
        options: any = {},
    ) {
        super(options);
        this.actorSheet = actorSheet;
        this.advanceData = advanceData;
        this.onSubmit = onSubmit;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-advance-dialog",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.ADVANCE",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 400,
            height: "auto",
        },
        form: {
            handler: AdvanceDialog.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/actor/character/advance.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        this.advanceData.cpcostcolor =
            this.advanceData.cpcost > this.actorSheet.actor.system.characterpoints.value ? "red" : "black";
        return this.advanceData;
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;

        root.querySelector(".freeadvancecheckbox input")?.addEventListener("change", async () => {
            this.advanceData.cpcost = 0;
            this.advanceData.score = this.advanceData.originalscore;
            this.advanceData.freeadvance = !this.advanceData.freeadvance;
            await this.render();
        });

        root.querySelector(".metaphysicsteachercheckbox input")?.addEventListener("change", async () => {
            this.advanceData.metaphysicsteacher = !this.advanceData.metaphysicsteacher;
            if (this.advanceData.metaphysicsteacher && this.advanceData.cpcost > 0) {
                this.advanceData.cpcost = Math.ceil(this.advanceData.cpcost / OD6S.advanceCostMetaphysicsSkill);
            } else if (!this.advanceData.metaphysicsteacher && this.advanceData.cpcost > 0) {
                this.advanceData.cpcost = Math.ceil(this.advanceData.cpcost * OD6S.advanceCostMetaphysicsSkill);
            }
            await this.render();
        });

        root.querySelector(".advanceup")?.addEventListener("click", async () => {
            this.pipUp();
            await this.render();
        });

        root.querySelector(".advancedown")?.addEventListener("click", async () => {
            this.pipDown();
            await this.render();
        });
    }

    static async #onSubmit(
        this: AdvanceDialog,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        await this.onSubmit(this, formData.object);
    }

    cpCost(up: boolean) {
        if (this.advanceData.freeadvance) {
            return;
        }

        const item = this.actorSheet.actor.items.get(this.advanceData.itemid);
        let skillAttr = "";
        if (typeof item !== "undefined") {
            skillAttr = item.system.attribute;
        }
        let teacherCostMultiplier = OD6S.advanceCostMetaphysicsSkill;
        if (this.advanceData.metaphysicsteacher) {
            teacherCostMultiplier = 1;
        }

        let score: any;
        OD6S.flatSkills ? (score = this.advanceData.base)
            : (score = od6sutilities.getDiceFromScore(this.advanceData.score));

        if (up) {
            if ((this.advanceData.type === "attribute")
                && (this.advanceData.label === game.i18n.localize("OD6S.CHAR_METAPHYSICS"))
                && (this.advanceData.score === 0)) {
                this.advanceData.cpcost = 20;
                return;
            }

            if (this.advanceData.type === "attribute") {
                this.advanceData.cpcost += Math.ceil((+score.dice) * OD6S.advanceCostAttribute);
            } else if (this.advanceData.type === "skill") {
                if (skillAttr === "met") {
                    OD6S.flatSkills
                        ? (this.advanceData.cpcost += Math.ceil((+this.advanceData.base) * teacherCostMultiplier))
                        : (this.advanceData.cpcost += Math.ceil((+score.dice) * teacherCostMultiplier));
                } else {
                    OD6S.flatSkills
                        ? (this.advanceData.cpcost += Math.ceil((+this.advanceData.base) * OD6S.advanceCostSkill))
                        : (this.advanceData.cpcost += Math.ceil((+score.dice) * OD6S.advanceCostSkill));
                    if (item.system.isAdvancedSkill) this.advanceData.cpcost = this.advanceData.cpcost * 2;
                }
            } else if (this.advanceData.type === "specialization") {
                OD6S.flatSkills
                    ? (this.advanceData.cpcost += Math.ceil(((+this.advanceData.base) + 1) * OD6S.advanceCostSpecialization))
                    : (this.advanceData.cpcost += Math.ceil(+score.dice * OD6S.advanceCostSpecialization));
            }
        } else {
            if ((this.advanceData.type === "attribute")
                && (this.advanceData.label === game.i18n.localize("OD6S.CHAR_METAPHYSICS"))
                && (this.advanceData.score === OD6S.pipsPerDice)) {
                this.advanceData.cpcost = 0;
                return;
            }

            if (this.advanceData.cpcost <= 0) {
                this.advanceData.cpcost = 0;
                return;
            }

            if (score.pips === 0) {
                --score.dice;
            }
            if (this.advanceData.type === "attribute") {
                this.advanceData.cpcost -= Math.ceil((+score.dice) * OD6S.advanceCostAttribute);
            } else if (this.advanceData.type === "skill") {
                if (skillAttr === "met") {
                    OD6S.flatSkills
                        ? (this.advanceData.cpcost -= Math.ceil((+this.advanceData.base) * teacherCostMultiplier))
                        : (this.advanceData.cpcost -= Math.ceil((+score.dice) * teacherCostMultiplier));
                } else {
                    OD6S.flatSkills
                        ? (this.advanceData.cpcost -= Math.ceil((+this.advanceData.base) * OD6S.advanceCostSkill))
                        : (this.advanceData.cpcost -= Math.ceil((+score.dice) * OD6S.advanceCostSkill));
                }
            } else if (this.advanceData.type === "specialization") {
                OD6S.flatSkills
                    ? (this.advanceData.cpcost -= Math.ceil((+this.advanceData.base) * OD6S.advanceCostSpecialization))
                    : (this.advanceData.cpcost -= Math.ceil(+score.dice * OD6S.advanceCostSpecialization));
            }
        }
    }

    pipUp() {
        const item = this.actorSheet.actor.items.get(this.advanceData.itemid);
        let skillAttr = "";
        if (typeof item !== "undefined") {
            skillAttr = item.system.attribute;
        }

        if ((this.advanceData.type === "attribute")
            && (this.advanceData.label === game.i18n.localize("OD6S.CHAR_METAPHYSICS"))
            && (this.advanceData.score === 0)) {

            this.cpCost(true);
            this.advanceData.score = OD6S.pipsPerDice;
            return true;
        }

        if (OD6S.skillUsed && this.advanceData.type !== "attribute" && skillAttr !== "met") {
            if (!this.advanceData.used) {
                ui.notifications.warn(game.i18n.localize("OD6S.SKILL_MUST_BE_USED"));
                return false;
            }
        }

        if ((this.advanceData.originalscore < this.advanceData.score)
                && (!this.advanceData.freeadvance)) {
            ui.notifications.warn(game.i18n.localize("OD6S.ALREADY_ADVANCED"));
            return false;
        }

        if (this.advanceData.type === "attribute") {
            let attr = "";
            for (const attribute in OD6S.attributes) {
                if (OD6S.attributes[attribute].name === this.advanceData.label) {
                    attr = attribute;
                    break;
                }
            }

            if (attr !== "") {
                if ((this.advanceData.score + 1) > this.actorSheet.actor.system.attributes[attr].max) {
                    ui.notifications.warn(game.i18n.localize("OD6S.WARN_ADVANCE_GREATER_THAN_MAX"));
                    return false;
                }
            }
        }

        this.cpCost(true);
        if (OD6S.flatSkills) this.advanceData.base++;
        this.advanceData.score++;
        return true;
    }

    pipDown() {
        if ((this.advanceData.type === "attribute")
            && (this.advanceData.label === game.i18n.localize("OD6S.CHAR_METAPHYSICS"))
            && (this.advanceData.score === OD6S.pipsPerDice)) {

            this.cpCost(false);
            this.advanceData.score = 0;
            return true;
        }

        if (this.advanceData.score < 1) {
            return false;
        }

        if (this.advanceData.score <= this.advanceData.originalscore) {
            return false;
        }

        this.cpCost(false);
        if (OD6S.flatSkills) this.advanceData.base--;
        this.advanceData.score--;
        return true;
    }
}
