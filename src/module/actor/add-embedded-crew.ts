// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SAddEmbeddedCrew extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-add-embedded-crew",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.ADD_CREW",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 300,
            height: "auto",
        },
        form: {
            handler: OD6SAddEmbeddedCrew.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SAddEmbeddedCrew.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/actor/common/add-crew.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {object: this.object};
    }

    static async #onSubmit(
        this: OD6SAddEmbeddedCrew,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const document: any = await fromUuid(data.actor);
        const crew = await fromUuid(data.addcrew);
        if (document.documentName === "Actor") {
            await document.addEmbeddedPilot(crew);
            document.sheet.render();
        } else {
            await document.actor.addEmbeddedPilot(crew);
            document.actor.sheet.render(false);
        }
    }

    static async #onCancel(this: OD6SAddEmbeddedCrew): Promise<void> {
        await this.close();
    }
}

export default OD6SAddEmbeddedCrew;
