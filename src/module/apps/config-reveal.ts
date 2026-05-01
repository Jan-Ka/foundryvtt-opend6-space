// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class od6sRevealConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "od6s-reveal-configuration",
        classes: ["od6s", "settings-config"],
        tag: "form",
        window: {
            title: "OD6S.CONFIG_REVEAL_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sRevealConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sRevealConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/settings/settings-v2.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const settings = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sReveal)
            .map((i: any) => i[1]);

        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
        }

        return {settings};
    }

    static async #onSubmit(
        this: od6sRevealConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        for (const setting in data) {
            await game.settings.set("od6s", setting, data[setting]);
            const s = game.settings.settings.get("od6s." + setting);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: od6sRevealConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
