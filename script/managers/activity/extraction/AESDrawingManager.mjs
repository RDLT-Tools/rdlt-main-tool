import VisualArc from "../../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../../entities/model/visual/VisualComponent.mjs";
import { BaseModelDrawingManager } from "../../drawing/BaseModelDrawingManager.mjs";
import { AESimulationManager } from "./AESimulationManager.mjs";

export class AESDrawingManager extends BaseModelDrawingManager {
    /** @type {AESimulationManager} */
    #simulationManager;
    

    constructor(simulationManager, drawingSVGElement) {
        super(drawingSVGElement, "aes");
        this.#simulationManager = simulationManager;
    }

    /**
     * 
     * @param {VisualComponent[]} vertices 
     * @param {VisualArc[]} arcs 
     */
    setupComponents(vertices, arcs) {
        super.setupComponents(vertices, arcs);

        for(const arcUID in this.builders.arcs) {
            const arcBuilder = this.builders.arcs[arcUID];
            arcBuilder.clickableElement.addEventListener("click", () => this.#simulationManager.chooseArc(Number(arcUID)));
        }
    }

    highlightTargetedArcs(targetedArcs) {
        for(const arcUID of targetedArcs) {
            const arcBuilder = this.builders.arcs[arcUID];
            arcBuilder.element.classList.add("targeted");
        }
    }
}