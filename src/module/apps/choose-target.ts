declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class OD6SChooseTarget extends HandlebarsApplicationMixin(ApplicationV2) {

    object: any;

    constructor(object: any = {}, options: any = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-choose-target",
        classes: ["od6s", "dialog"],
        tag: "form",
        window: {
            title: "OD6S.CHOOSE_TARGET",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 300,
            height: "auto",
        },
        form: {
            handler: OD6SChooseTarget.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            cancel: OD6SChooseTarget.#onCancel,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/chat/choose-target.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {object: this.object};
    }

    static async #onSubmit(
        this: OD6SChooseTarget,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        const message = (game as any).messages.get(data.messageId);
        if (!message) return;

        if (message.getFlag("od6s", "isExplosive")) {
            const targets: any[] = [];
            const currentTargets = message.getFlag("od6s", "targets");
            const formTargetIds = Array.isArray(data.choosetarget) ? data.choosetarget : [data.choosetarget];
            const formTargets = this.object.targets.filter((t: any) => formTargetIds.includes(t.id));
            for (const ft of formTargets) {
                const i = currentTargets?.findIndex((e: any) => e.id === ft.id) ?? -1;
                if (i > -1) {
                    targets.push({
                        id: currentTargets[i].id,
                        name: currentTargets[i].name,
                        range: currentTargets[i].range,
                        zone: currentTargets[i].zone,
                    });
                } else {
                    targets.push({id: ft.id, name: ft.name, range: 0, zone: 1});
                }
            }
            await message.unsetFlag("od6s", "targets");
            await message.setFlag("od6s", "targets", targets);
        } else {
            await message.setFlag("od6s", "targetId", data.choosetarget);
            const targetName = (game as any).scenes.active.tokens
                .find((t: any) => t.id === data.choosetarget)?.name;
            await message.setFlag("od6s", "targetName", targetName);
        }
    }

    static async #onCancel(this: OD6SChooseTarget): Promise<void> {
        await this.close();
    }
}
