 

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class od6sWildDieConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-wild-die-configuration",
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.CONFIG_WILD_DIE_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: 400,
        },
        form: {
            handler: od6sWildDieConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sWildDieConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/wild-die.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const settings = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sWildDie)
            .map((i: any) => i[1]);

        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
        }

        const show = settings.find((s: any) => s.key === "use_wild_die")?.value ?? false;

        return {settings, show};
    }

    static async #onSubmit(
        this: od6sWildDieConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        for (const setting in data) {
            await game.settings.set("nonex-ist-od6s", setting, data[setting]);
            const s = game.settings.settings.get("nonex-ist-od6s." + setting);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: od6sWildDieConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
