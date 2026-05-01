// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class od6sInitiativeConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "od6s-initiative-configuration",
        classes: ["od6s", "settings-config"],
        tag: "form",
        window: {
            title: "OD6S.CONFIG_INITIATIVE_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sInitiativeConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sInitiativeConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/settings/initiative-settings.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const settings: any[] = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sInitiative)
            .map((i: any) => i[1]);

        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
        }

        const reroll = settings.find((s: any) => s.key === "reroll_initiative");
        if (reroll && reroll.value === false) {
            for (const s of settings) {
                if (s.key === "auto_reroll_character" || s.key === "auto_reroll_npc") {
                    s.choice = false;
                    s.value = false;
                }
            }
        }

        return {settings};
    }

    static async #onSubmit(
        this: od6sInitiativeConfiguration,
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

        if (data.reroll_initiative === false) {
            await game.settings.set("od6s", "auto_reroll_character", false);
            await game.settings.set("od6s", "auto_reroll_npc", false);
        }

        await this.render();
    }

    static async #onCloseForm(this: od6sInitiativeConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
