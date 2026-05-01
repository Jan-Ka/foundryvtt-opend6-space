/**
 * Handles the preview and placement of explosive blast regions on the canvas.
 * Replaces the old MeasuredTemplate-based system with Scene Regions (Foundry v14).
 */
export default class ExplosivesTemplate {

    /** @type {number} Throttle timestamp for mouse movement */
    #moveTime = 0;

    /** @type {CanvasLayer} The initially active layer to restore */
    #initialLayer: any;

    /** @type {object} Bound event handlers */
    #events: any;

    /** @type {PIXI.Graphics} Preview circle */
    #circle: any;

    /** @type {PIXI.Graphics} Range line from origin to target */
    #rangeLine: any;

    /** @type {PIXI.Text} Distance measurement display */
    #rangeMeasure: any;

    /** @type {PIXI.Container} Container for all preview graphics */
    #container: any;

    /** @type {object} Explosive data from the dialog */
    exData: any;

    /** @type {object} Actor sheet reference */
    actorSheet: any;

    /** @type {number} Origin X position */
    originX: any;

    /** @type {number} Origin Y position */
    originY: any;

    /** @type {number} Blast radius in grid units */
    radius;

    /** @type {number} Current preview X position */
    previewX: any;

    /** @type {number} Current preview Y position */
    previewY: any;

    /** @type {boolean} Whether the preview position has a wall collision */
    _preview = false;

    constructor(radius: any) {
        this.radius = radius;
    }

    async setExplosiveData(data: any, x: any, y: any) {
        this.exData = data;
        this.actorSheet = this.exData.actor.sheet;
        this.originX = x;
        this.originY = y;
        this.previewX = x;
        this.previewY = y;
    }

    /**
     * Creates a preview of the blast radius on the canvas.
     * @returns {Promise<RegionDocument[]>} Resolves with created region documents, or rejects on cancel.
     */
    async drawPreview() {
        this.#initialLayer = canvas.activeLayer;

        // Create PIXI graphics for the preview
        this.#container = new PIXI.Container();
        this.#circle = new PIXI.Graphics();
        this.#rangeLine = new PIXI.Graphics();
        this.#rangeMeasure = new PIXI.Text({ text: "0 M" });

        this.#container.addChild(this.#circle);
        this.#container.addChild(this.#rangeLine);
        this.#container.addChild(this.#rangeMeasure);

        canvas.stage.addChild(this.#container);

        // Draw initial circle
        this.#drawCircle(this.previewX, this.previewY);

        // Hide the sheet that originated the preview
        this.actorSheet?.minimize();

        return this.#activatePreviewListeners();
    }

    /**
     * Draw the blast radius circle at the given position.
     */
    #drawCircle(x: any, y: any) {
        const radiusPixels = this.radius * canvas.dimensions.distancePixels;
        this.#circle.clear();
        this.#circle.lineStyle(2, 0xFFFF00, 0.8);
        this.#circle.beginFill(0xFFFF00, 0.15);
        this.#circle.drawCircle(x, y, radiusPixels);
        this.#circle.endFill();
    }

    /**
     * Activate canvas listeners for placement preview.
     * @returns {Promise<RegionDocument[]>}
     */
    #activatePreviewListeners() {
        return new Promise((resolve, reject) => {
            this.#events = {
                cancel: this.#onCancelPlacement.bind(this),
                confirm: this.#onConfirmPlacement.bind(this),
                move: this.#onMovePlacement.bind(this),
                resolve,
                reject,
            };

            (canvas.stage as any).on("mousemove", this.#events.move);
            (canvas.stage as any).on("mousedown", this.#events.confirm);
            canvas.app.view.oncontextmenu = this.#events.cancel;
        });
    }

    /**
     * Clean up preview graphics and listeners.
     */
    async #finishPlacement() {
        canvas.stage.removeChild(this.#container);
        this.#container.destroy({ children: true });
        (canvas.stage as any).off("mousemove", this.#events.move);
        (canvas.stage as any).off("mousedown", this.#events.confirm);
        canvas.app.view.oncontextmenu = null;
        this.#initialLayer?.activate();
        await this.actorSheet?.maximize();
    }

    /**
     * Handle mouse movement during placement.
     */
    #onMovePlacement(event: any) {
        event.stopPropagation();
        const now = Date.now();
        if (now - this.#moveTime <= 20) return;
        this.#moveTime = now;

        const center = event.data.getLocalPosition(canvas.stage);
        const snapped = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS
            ? { x: center.x, y: center.y }
            : canvas.grid.getSnappedPoint({ x: center.x, y: center.y }, { mode: CONST.GRID_SNAPPING_MODES.CENTER, resolution: 1 });

        this.previewX = snapped.x;
        this.previewY = snapped.y;

        // Redraw circle at new position
        this.#drawCircle(this.previewX, this.previewY);

        // Draw range line
        const distance = Math.floor(canvas.grid.measurePath([
            { x: this.originX, y: this.originY },
            { x: this.previewX, y: this.previewY },
        ]).distance);

        this.#rangeLine.clear();
        this.#rangeLine.lineStyle(4, 0xffd900, 1);
        this.#rangeLine.moveTo(this.originX, this.originY);
        this.#rangeLine.lineTo(this.previewX, this.previewY);

        this.#rangeMeasure.x = this.previewX - 30;
        this.#rangeMeasure.y = this.previewY + 60;
        this.#rangeMeasure.style.fill = 0xFFFFFF;
        this.#rangeMeasure.text = distance + " M";

        // Check wall collision
        const origin = { x: this.originX, y: this.originY };
        const target = { x: this.previewX, y: this.previewY };
        this._preview = !!(
            CONFIG.Canvas.polygonBackends.move.testCollision(origin, target, { type: "move", mode: "any" }) ||
            CONFIG.Canvas.polygonBackends.sight.testCollision(origin, target, { type: "sight", mode: "any" })
        );
    }

    /**
     * Confirm placement and create a Region document.
     */
    async #onConfirmPlacement(_event: any) {
        // Block placement through walls
        const origin = { x: this.originX, y: this.originY };
        const target = { x: this.previewX, y: this.previewY };
        if (
            CONFIG.Canvas.polygonBackends.move.testCollision(origin, target, { type: "move", mode: "any" }) ||
            CONFIG.Canvas.polygonBackends.sight.testCollision(origin, target, { type: "sight", mode: "any" })
        ) return;

        await this.#finishPlacement();

        const snapped = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS
            ? { x: this.previewX, y: this.previewY }
            : canvas.grid.getSnappedPoint({ x: this.previewX, y: this.previewY }, { mode: CONST.GRID_SNAPPING_MODES.CENTER, resolution: 1 });

        const radiusPixels = this.radius * canvas.dimensions.distancePixels;

        // Create a Region document with a circular shape
        const regionData = {
            name: "Explosive",
            visibility: 1, // GM only initially
            shapes: [{
                type: "ellipse",
                x: snapped.x,
                y: snapped.y,
                radiusX: radiusPixels,
                radiusY: radiusPixels,
            }],
            flags: {
                od6s: {
                    explosive: true,
                },
            },
        };

        const regions = await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
        this.#events.resolve(regions);
    }

    /**
     * Cancel placement on right-click.
     */
    async #onCancelPlacement(_event: any) {
        await this.#finishPlacement();
        this.#events.reject();
    }
}
