declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class SpecializeDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    newItemData: any;
    onSubmit: (dialog: SpecializeDialog) => void | Promise<void>;

    constructor(newItemData: any, onSubmit: (dialog: SpecializeDialog) => void | Promise<void>, options: any = {}) {
        super(options);
        this.newItemData = newItemData;
        this.onSubmit = onSubmit;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-specialize-dialog",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.CREATE_SPECIALIZATION",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 400,
            height: "auto",
        },
        form: {
            handler: SpecializeDialog.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/actor/common/specialize.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return this.newItemData;
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;

        root.querySelector(".freeadvancecheckbox input")?.addEventListener("change", async () => {
            this.newItemData.freeadvance = !this.newItemData.freeadvance;
            this.newItemData.cpcost = this.newItemData.freeadvance ? 0 : this.newItemData.originalcpcost;
            await this.render();
        });

        root.querySelector("#specname")?.addEventListener("change", (ev) => {
            this.newItemData.specname = (ev.target as HTMLInputElement).value;
        });

        root.querySelector("#dice")?.addEventListener("change", (ev) => {
            this.newItemData.dice = (ev.target as HTMLInputElement).value;
        });

        root.querySelector("#pips")?.addEventListener("change", (ev) => {
            this.newItemData.pips = (ev.target as HTMLInputElement).value;
        });
    }

    static async #onSubmit(
        this: SpecializeDialog,
        _event: Event,
        _form: HTMLFormElement,
        _formData: any,
    ): Promise<void> {
        await this.onSubmit(this);
    }
}
