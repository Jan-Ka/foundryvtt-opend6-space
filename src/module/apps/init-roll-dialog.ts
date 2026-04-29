// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import OD6S from "../config/config-od6s";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class InitRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    rollData: any;
    cpLimit: number;
    onSubmit: (dialog: InitRollDialog) => void | Promise<void>;

    constructor(rollData: any, onSubmit: (dialog: InitRollDialog) => void | Promise<void>, options: any = {}) {
        super(options);
        this.rollData = rollData;
        this.cpLimit = OD6S.characterPointLimits.initiative;
        this.onSubmit = onSubmit;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-init-roll-dialog",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.ROLL",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 400,
            height: "auto",
        },
        form: {
            handler: InitRollDialog.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/initRoll.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        this.rollData.cpcostcolor =
            this.rollData.characterpoints > this.rollData.actor.system.characterpoints.value ? "red" : "black";
        return this.rollData;
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;

        root.querySelector(".cpup")?.addEventListener("click", async () => {
            if ((+this.rollData.characterpoints) >= this.cpLimit) {
                ui.notifications.warn(game.i18n.localize("OD6S.MAX_CP"));
            } else if ((+this.rollData.characterpoints) >= this.rollData.actor.system.characterpoints.value) {
                ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_ROLL"));
            } else {
                this.rollData.characterpoints++;
                await this.render();
            }
        });

        root.querySelector(".cpdown")?.addEventListener("click", async () => {
            if (this.rollData.characterpoints > 0) this.rollData.characterpoints--;
            await this.render();
        });

        root.querySelector(".showWildDie input")?.addEventListener("change", async () => {
            this.rollData.wilddie = !this.rollData.wilddie;
            await this.render();
        });

        root.querySelector("#bonusdice")?.addEventListener("change", (ev) => {
            this.rollData.bonusdice = (+(ev.target as HTMLInputElement).valueAsNumber);
        });

        root.querySelector("#bonuspips")?.addEventListener("change", (ev) => {
            this.rollData.bonuspips = (+(ev.target as HTMLInputElement).valueAsNumber);
        });
    }

    static async #onSubmit(
        this: InitRollDialog,
        _event: Event,
        _form: HTMLFormElement,
        _formData: any,
    ): Promise<void> {
        await this.onSubmit(this);
    }
}
