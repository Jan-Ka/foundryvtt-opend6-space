// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";
import {OD6SItem} from "../item/item";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SAddItem extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;
    dice = 0;
    pips = 0;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
        this.object.selected = 0;
        this.object.description = this.object?.items?.[0]?.system?.description;
        if (typeof this.object.description === "undefined") this.object.description = "";
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-add-item",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.ADD",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 300,
            height: "auto",
        },
        form: {
            handler: OD6SAddItem.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SAddItem.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/actor/common/add-item.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {object: this.object};
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;

        root.querySelector(".select-skill")?.addEventListener("change", async (ev) => {
            this.object.selected = +(ev.currentTarget as HTMLSelectElement).value;
            this.object.description = this.object.items[this.object.selected].system?.description;
            if (typeof this.object.description === "undefined") this.object.description = "";
            await this.render();
        });

        root.querySelectorAll(".addskill input").forEach((el) => {
            el.addEventListener("change", (ev) => {
                const target = ev.target as HTMLInputElement;
                if (target.id === "dice") {
                    this.dice = +target.value;
                } else if (target.id === "pips") {
                    this.pips = +target.value;
                }
            });
        });
    }

    static async #onSubmit(
        this: OD6SAddItem,
        event: SubmitEvent,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const submitter = event.submitter as HTMLButtonElement | null;
        const mode = submitter?.value;

        let actor: any;
        if (data.token !== "") {
            const token = (game as any).scenes.active.tokens.get(data.token);
            actor = token!.actor;
        } else {
            actor = await (game as any).actors.get(data.actor);
        }

        if (mode === "selected") {
            const items = JSON.parse(data.serializeditems);
            if (items[data["add-item"]].type === "skill" || items[data["add-item"]].type === "specialization") {
                items[data["add-item"]].system.base = od6sutilities.getScoreFromDice(this.dice, this.pips);
            }
            await actor!.createEmbeddedDocuments("Item", [items[data["add-item"]]]);
            await actor!.sheet.getData?.();
            this.object.caller?.render(false);
        }

        if (mode === "empty") {
            const itemData: any = {system: {}, type: data.type};
            if (itemData.type === "skill" || itemData.type === "specialization") {
                itemData.system.attribute = data.attrname;
            }
            itemData.name = game.i18n.localize("OD6S.NEW_ITEM");
            // @ts-expect-error OD6SItem(data) v1 construction signature still needed for cloning
            const item = new OD6SItem(itemData);
            await actor!.createEmbeddedDocuments("Item", [item.toObject()]);
            this.object.caller?.render(false);
        }
    }

    static async #onCancel(this: OD6SAddItem): Promise<void> {
        await this.close();
    }
}

export default OD6SAddItem;
