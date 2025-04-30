import VisualArc from "../../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../../entities/model/visual/VisualComponent.mjs";
import { BaseModelDrawingManager } from "../../drawing/BaseModelDrawingManager.mjs";
import { TargetedArcSelectManager } from "./TargetedArcSelectManager.mjs";

export class TASDrawingManager extends BaseModelDrawingManager {
    
    /** @type {TargetedArcSelectManager} */
    #parentManager;
    
    constructor(parentManager, rootElement) {
        super(rootElement, "aes");

        this.#parentManager = parentManager;
    }

    /**
     * @param {VisualComponent[]} vertices 
     * @param {VisualArc[]} arcs 
     */
    setupComponents(vertices, arcs) {
        super.setupComponents(vertices, arcs);

        for(const arcUID in this.builders.arcs) {
            const arcBuilder = this.builders.arcs[arcUID];
            arcBuilder.clickableElement.addEventListener("click", () => this.#parentManager.toggleArc(Number(arcUID)));
        }
    }

    /**
     * 
     * @param {Set<number>} arcs 
     */
    setSelectedArcs(arcs) {
        this.clearHighlights();
        for(const arcUID of arcs) {
            this.highlightArc(arcUID);
        }
    }
}