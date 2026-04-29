// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import {od6sutilities} from "../system/utilities";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SAddCrew extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-add-crew",
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
            handler: OD6SAddCrew.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SAddCrew.#onCancel,
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
        this: OD6SAddCrew,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const actor = await od6sutilities.getActorFromUuid(data.actor);
        await actor!.sheet.linkCrew(data.addcrew);
    }

    static async #onCancel(this: OD6SAddCrew): Promise<void> {
        await this.close();
    }
}

export default OD6SAddCrew;
