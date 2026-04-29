// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;
import OD6S from "../config/config-od6s";


const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

interface SortAttribute {
    id: string;
    name: string;
    sort: number;
    active: boolean;
}

export default class od6sAttributesSortingConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    attributes: SortAttribute[];
    dragStart: string | null = null;
    requiresWorldReload = true;

    constructor(options: any = {}) {
        super(options);

        const attributes: SortAttribute[] = [];
        for (const i in OD6S.attributes) {
            attributes.push({
                id: i,
                name: OD6S.attributes[i].name,
                sort: OD6S.attributes[i].sort,
                active: OD6S.attributes[i].active,
            });
        }
        this.attributes = attributes.sort((a, b) => a.sort - b.sort);
    }

    static DEFAULT_OPTIONS = {
        id: "od6s-attributes-sorting-configuration",
        classes: ["od6s", "settings-config"],
        tag: "form",
        window: {
            title: "OD6S.CONFIG_ATTRIBUTES_SORTING",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sAttributesSortingConfiguration.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sAttributesSortingConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/od6s/templates/settings/attributes-sorting.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        return {attributes: this.attributes};
    }

    _onRender(_context: object, _options: object): void {
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: "li.attributes-sort-list",
            dropSelector: ".attributes-sort",
            permissions: {
                dragstart: () => true,
                drop: () => true,
            },
            callbacks: {
                dragstart: this.#onDragStart.bind(this),
                drop: this.#onDrop.bind(this),
            },
        }).bind(this.element);
    }

    #onDragStart(event: DragEvent): void {
        const target = event.target as HTMLElement;
        this.dragStart = target.dataset.attributeId ?? null;
    }

    #onDrop(event: DragEvent): void {
        const source = this.attributes.find((a) => a.id === this.dragStart);
        this.dragStart = null;
        if (!source) return;

        const dropTarget = (event.target as HTMLElement).closest("li[data-attribute-id]") as HTMLElement | null;
        if (!dropTarget) return;
        const target = this.attributes.find((a) => a.id === dropTarget.dataset.attributeId);
        if (!target || source === target) return;

        const attributes: SortAttribute[] = [];
        if (source.sort < target.sort) {
            for (let i = 0; i < this.attributes.length; i++) {
                if (i <= target.sort && i > source.sort) {
                    attributes.push({
                        id: this.attributes[i].id,
                        name: this.attributes[i].name,
                        sort: this.attributes[i].sort - 1,
                        active: this.attributes[i].active,
                    });
                } else if (i === source.sort) {
                    attributes.push({
                        id: source.id,
                        name: source.name,
                        sort: target.sort,
                        active: source.active,
                    });
                } else {
                    attributes.push(this.attributes[i]);
                }
            }
        } else {
            for (let i = 0; i < this.attributes.length; i++) {
                if (i >= target.sort && i < source.sort) {
                    attributes.push({
                        id: this.attributes[i].id,
                        name: this.attributes[i].name,
                        sort: this.attributes[i].sort + 1,
                        active: this.attributes[i].active,
                    });
                } else if (i === source.sort) {
                    attributes.push({
                        id: source.id,
                        name: source.name,
                        sort: target.sort,
                        active: source.active,
                    });
                } else {
                    attributes.push(this.attributes[i]);
                }
            }
        }
        this.attributes = attributes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        this.render();
    }

    static async #onSubmit(
        this: od6sAttributesSortingConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        _formData: any,
    ): Promise<void> {
        // Submission happens via closeForm action; nothing to do per-change.
    }

    static async #onCloseForm(this: od6sAttributesSortingConfiguration): Promise<void> {
        const attrSort: Record<string, {sort: number}> = {};
        for (const a of this.attributes) {
            attrSort[a.id] = {sort: a.sort};
        }
        await game.settings.set("od6s", "attributes_sorting", attrSort);
        if (this.requiresWorldReload) {
            await SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
