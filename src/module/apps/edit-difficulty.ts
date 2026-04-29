// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class OD6SEditDifficulty extends HandlebarsApplicationMixin(ApplicationV2) {

    data: any;

    constructor(data: any = {}, options: any = {}) {
        super(options);
        this.data = data;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-edit-difficulty",
        classes: ["od6s"],
        tag: "form",
        window: {
            title: "OD6S.EDIT_DIFFICULTY",
            minimizable: true,
        },
        position: {
            width: 100,
            height: 200,
        },
        form: {
            handler: OD6SEditDifficulty.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SEditDifficulty.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/chat/edit-difficulty.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {data: this.data};
    }

    static async #onSubmit(
        this: OD6SEditDifficulty,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const message = (game as any).messages.get(data.messageId);
        if (!message) return;

        const diff = (+data.baseDifficulty) - (+message.getFlag("od6s", "baseDifficulty"));
        const newDifficulty = (+message.getFlag("od6s", "difficulty")) + diff;
        const success = message.rolls[0].total >= newDifficulty;

        await message.update({
            id: message.id,
            flags: {
                od6s: {
                    baseDifficulty: data.baseDifficulty,
                    difficulty: newDifficulty,
                    success,
                },
            },
        });
    }

    static async #onCancel(this: OD6SEditDifficulty): Promise<void> {
        await this.close();
    }
}
