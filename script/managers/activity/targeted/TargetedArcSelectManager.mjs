import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID } from "../../../utils.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import { TabManager } from "../../workspace/TabManager.mjs";
import { TASArcsPanelManager } from "./panels/TASArcsPanelManager.mjs";
import { TASDrawingManager } from "./TASDrawingManager.mjs";
import { TASSubworkspaceManager } from "./TASSubworkspaceManager.mjs";

export class TargetedArcSelectManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** @type {(arcs: Set<number>) => void} */
    #onArcsSelected;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {TASDrawingManager} */
    #drawingManager;

    /** @type {TASSubworkspaceManager} */
    #subworkspaceManager;

    /** @type {TabManager} */
    #subworkspaceTabManager;

    /** 
     * @type {{
     *      arcs: TASArcsPanelManager,
     * }} 
     * */
    #panels;

    /** @type {Set<number>} */
    #selectedArcs = new Set();

    /**
     * @param {ModelContext} context
     * @param {VisualRDLTModel} visualModelSnapshot 
     * @param {(arcs: Set<number>) => void} onArcsSelected 
     */
    constructor(context, visualModelSnapshot, onArcsSelected) {
        this.context = context;
        this.id = generateUniqueID();
        this.#modelSnapshot = visualModelSnapshot;
        this.#onArcsSelected = onArcsSelected;

        this.#initialize();
    }

    async #initialize() {
        this.#subworkspaceTabManager = await this.context.managers.workspace.addTASSubworkspace(this.id);
        const rootElement = this.#subworkspaceTabManager.tabAreaElement;
        this.#drawingManager = new TASDrawingManager(this, rootElement.querySelector(".drawing > svg"));
        this.#subworkspaceManager = new TASSubworkspaceManager(this, rootElement);

        this.#panels = {
            arcs: new TASArcsPanelManager(this, rootElement.querySelector(".panel[data-panel-id='arcs']")),
        };

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(), 
            this.#modelSnapshot.getAllArcs());

        this.#panels.arcs.refreshArcsList(this.#selectedArcs);
    }

    toggleArc(arcUID) {
        if(this.#selectedArcs.has(arcUID)) {
            this.#selectedArcs.delete(arcUID);
        } else {
            this.#selectedArcs.add(arcUID);
        }

        this.#panels.arcs.refreshArcsList(this.#selectedArcs);
        this.#drawingManager.setSelectedArcs(this.#selectedArcs);
    }

    save() {
        if(this.#onArcsSelected) this.#onArcsSelected(this.#selectedArcs);
        this.#subworkspaceTabManager.close();
    }

    /** @returns {string} */
    getVertexIdentifier(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID).identifier;
    }

    /** @returns {[string, string]} */
    getArcIdentifierPair(arcUID) {
        const arc = this.#modelSnapshot.getArc(arcUID);
        if(!arc) return [ "", "" ];

        const vertexFrom = this.#modelSnapshot.getComponent(arc.fromVertexUID);
        const vertexTo = this.#modelSnapshot.getComponent(arc.toVertexUID);

        return [
            vertexFrom?.identifier || "",
            vertexTo?.identifier || "" ];
    }

    getComponent(uid) {
        return this.context.managers.visualModel.getComponent(uid);
    }
}