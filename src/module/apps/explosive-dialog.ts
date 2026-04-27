import ExplosivesTemplate from "./explosives-template";

declare const foundry: any;

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class ExplosiveDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    data: any;
    token: any;

    constructor(data: any = {}, options: any = {}) {
        super(options);
        this.data = data;
        this.data.timer = 0;
        this.data.stage = 0;
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-explosive-dialog",
        classes: ["od6s", "dialog"],
        tag: "div",
        window: {
            title: "OD6S.SET_EXPLOSIVE",
            resizable: false,
            minimizable: true,
        },
        position: {
            width: 300,
            height: "auto",
        },
        actions: {
            submit: ExplosiveDialog.#onSubmit,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/apps/explosive.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return this.data;
    }

    _onRender(_context: object, _options: object): void {
        const root = this.element as HTMLElement;

        root.querySelector("#explosive-type")?.addEventListener("change", async (ev) => {
            ev.preventDefault();
            this.data.type = (ev.target as HTMLSelectElement).value;
            await this.render();
        });
    }

    static async #onSubmit(this: ExplosiveDialog, event: Event): Promise<void> {
        event.preventDefault();

        if (game.settings.get("od6s", "auto_explosive")) {
            let radius;
            if (game.settings.get("od6s", "explosive_zones")) {
                radius = this.data.item.system.blast_radius["4"].range;
                if (radius < 1) {
                    ui.notifications.warn(game.i18n.localize("OD6S.WARN_EXPLOSIVE_NOT_CONFIGURED_FOR_ZONES"));
                    return;
                }
            } else {
                radius = this.data.item.system.blast_radius["3"].range;
            }

            this.token = (canvas as any).tokens.controlled[0];
            const explosiveTemplate = new ExplosivesTemplate(radius);
            await explosiveTemplate.setExplosiveData(
                this.data,
                this.token.center.x,
                this.token.center.y,
            );
            this.createTemplate(explosiveTemplate);
            await this.close();
        } else {
            this.data.stage += 1;
            if (this.data.type === "OD6S.EXPLOSIVE_THROWN") {
                await this.data.item.setFlag("od6s", "explosiveSet", true);
                await this.data.item.roll(false);
            }
            await this.close();
        }
    }

    createTemplate(explosiveTemplate: any) {
        const result = explosiveTemplate.drawPreview();
        Promise.resolve(result).then((regions) => {
            this.handleResult(regions).then();
        }).catch(() => {
            // Player has likely right-clicked to cancel
        });
    }

    async handleResult(regions: any) {
        this.data.stage += 1;

        if (this.data.stage === 1 && this.data.type === "OD6S.EXPLOSIVE_THROWN") {
            const region = regions[0];
            const distance = Math.floor((canvas as any).grid.measureDistance(
                {x: this.token.center.x, y: this.token.center.y},
                {x: region.shapes[0].x, y: region.shapes[0].y},
                {gridSpaces: false},
            ));

            await this.data.item.update({
                flags: {
                    od6s: {
                        explosiveSet: true,
                        explosiveTemplate: region.id,
                        explosiveRange: distance,
                        explosiveOrigin: {x: this.token.center.x, y: this.token.center.y},
                    },
                },
            });

            await region.update({
                flags: {
                    od6s: {
                        explosive: true,
                        actor: this.data.actor.uuid,
                        item: this.data.item.id,
                    },
                },
            });

            this.data.item.roll(false);
        } else if (this.data.stage === 1) {
            this.render({force: true});
        }
    }
}
