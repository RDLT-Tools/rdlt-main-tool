import { AESStep } from "../../../../entities/activity/AESStep.mjs";
import { buildArcTagElement, buildElement } from "../../../../utils.mjs";
import { AESimulationManager } from "../AESimulationManager.mjs";

export class AESStatesPanelManager {
    /** @type {AESimulationManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *      statesTable: HTMLTableElement
     * }}
     */
    #views = {
        statesTable: null,
    };

    /** 
     * @type {{
     *      stateRows: { [AESStateID: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        stateRows: {}
    }

    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#views.statesTable = this.#rootElement.querySelector("table");
    }

    /**
     * 
     * @param {AESStep} currentStep 
     * @param {{ T, CTIndicator }} states 
     * @param {{ arcMap, vertexMap, arcs }} cache 
     */
    refreshStatesView(currentStep, states, cache) {
        const tableBody = this.#views.statesTable.querySelector("tbody");
        tableBody.innerHTML = "";

        let arcs = Object.values(cache.arcMap);

        // Sort by check/traverse
        arcs = arcs.sort((a1, a2) => {
            if(currentStep.currentArc === a1.uid) return -1;
            if(currentStep.currentArc === a2.uid) return 1;

            const maxT1 = Math.max(...(states.T[a1.uid] || [0]));
            const maxT2 = Math.max(...(states.T[a2.uid] || [0]));

            return maxT2 - maxT1;
        });

        for(const arc of arcs) {
            let stateRow = this.#cache.stateRows[arc.uid];

            if(!stateRow) {
                const stateRowCells = [];

                // Arc tag column
                const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(arc.uid);
                stateRowCells.push(buildElement("td", {}, [
                    buildArcTagElement(fromVertexIdentifier, toVertexIdentifier)
                ]));

                // Attributes column
                stateRowCells.push(buildElement("td", {}, [ `${arc.C || "ϵ"}:${arc.L}` ]));
                
                // T column
                stateRowCells.push(buildElement("td", {}, [
                    buildElement("div", { classname: "aes-states-T" }, [])]));

                stateRow = buildElement("tr", {}, stateRowCells);

                this.#cache.stateRows[arc.id] = stateRow;
            }

            // Update T column
            const t = states.T[arc.uid] || [];
            const stateRowTElement = stateRow.querySelector(".aes-states-T");
            stateRowTElement.innerHTML = t.map((ti,i) => `<span data-aes-state-T-ct="${states.CTIndicator[arc.uid][i] === 2 ? "traversed" : "checked"}">${ti}</span>`).join("");
        
            // Set whether active or not
            if(currentStep.currentArc === arc.uid) {
                stateRow.classList.add("active");
            } else {
                stateRow.classList.remove("active");
            }

            tableBody.appendChild(stateRow);
        }

    }
}