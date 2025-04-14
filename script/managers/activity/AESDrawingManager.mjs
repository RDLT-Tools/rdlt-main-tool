import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";
import { AESimulationManager } from "./AESimulationManager.mjs";

export class AESDrawingManager extends BaseModelDrawingManager {
    /** @type {AESimulationManager} */
    #simulationManager;
    #highlights = {
        vertices: new Set(),
        arcs: new Set()
    };

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
            arcBuilder.aesClickableElement.addEventListener("click", () => this.#simulationManager.chooseArc(Number(arcUID)));
        }
    }

    highlightVertex(vertexUID) {
        const vertexBuilder = this.builders.vertices[vertexUID];
        if(!vertexBuilder) return;

        vertexBuilder.element.classList.add("active");
        this.#highlights.vertices.add(vertexUID);
    }

    highlightArc(arcUID) {
        const arcBuilder = this.builders.arcs[arcUID];
        if(!arcBuilder) return;

        arcBuilder.element.classList.add("active");
        this.#highlights.arcs.add(arcUID);
    }

    clearHighlights() {
        for(const highlightedVertexUID of this.#highlights.vertices) {
            const vertexBuilder = this.builders.vertices[highlightedVertexUID];
            if(!vertexBuilder) continue;

            vertexBuilder.element.classList.remove("active");
        } 

        for(const highlightedArcUID of this.#highlights.arcs) {
            const arcBuilder = this.builders.arcs[highlightedArcUID];
            if(!arcBuilder) continue;

            arcBuilder.element.classList.remove("active");
        }

        this.#highlights.vertices.clear();
        this.#highlights.arcs.clear();
    }
}