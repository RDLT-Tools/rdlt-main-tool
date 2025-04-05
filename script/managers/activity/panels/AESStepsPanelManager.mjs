import { AESStep } from "../../../entities/activity/AESStep.mjs";
import { buildElement } from "../../../utils.mjs";
import { AESimulationManager } from "../AESimulationManager.mjs";

export class AESStepsPanelManager {
    /** @type {AESimulationManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *      stepsTable: HTMLTableElement
     * }}
     */
    #views = {
        stepsTable: null,
    };

    /** 
     * @type {{
     *      stepRows: { [AESStepID: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        stepRows: {}
    }

    #activeStepID = null;

    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#views.stepsTable = this.#rootElement.querySelector("table");
    }

    /**
     * 
     * @param {AESStep[]} steps 
     */
    refreshStepsList(steps) {
        const tableBody = this.#views.stepsTable.querySelector("tbody");
        tableBody.innerHTML = "";

        for(let i = 0; i < steps.length; i++) {
            const step = steps[i];

            let stepRow = this.#cache.stepRows[step.id];

            if(!stepRow) {
                const stepRowCells = [];

                // Step number column
                stepRowCells.push(buildElement("td", {}, [ i+1 ]));
                
                // Action column
                stepRowCells.push(buildElement("td", {}, [ 
                    buildElement("div", { classname: "aes-step-indicator" }),
                    " ",
                    step.actionLabel ]));

                // Component column
                if([ "start", "backtrack", "end-sink" ].includes(step.action)) {
                    const currentVertexIdentifier = this.#simulationManager.getVertexIdentifier(step.currentVertex);
                    stepRowCells.push(buildElement("td", {}, [
                        buildElement("div", { classname: "vertex-tag" }, [ currentVertexIdentifier ])
                    ]));
                } else if([ "try-explore", "explore", "check", "traverse" ].includes(step.action)) {
                    const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(step.currentArc);
                    stepRowCells.push(buildElement("td", {}, [
                        buildElement("div", { classname: "arc-tag" }, [
                            buildElement("div", {}, [ fromVertexIdentifier ]),
                            buildElement("div", {}, [ toVertexIdentifier ]),
                        ])
                    ]))
                } else {
                    stepRowCells.push(buildElement("td"));
                }

                // Remarks column
                stepRowCells.push(buildElement("td", {}, [ step.remarks ]));

                stepRow = buildElement("tr", {
                    "data-aes-step-action": step.action
                }, stepRowCells);

                stepRow.addEventListener("click", () => this.#simulationManager.setCurrentStepID(step.id));

                this.#cache.stepRows[step.id] = stepRow;
            }
            

            tableBody.appendChild(stepRow);
        }

    }

    setActiveStep(stepID) {
        const previousStepID = this.#activeStepID;
        this.#activeStepID = stepID;

        if(previousStepID) {
            const previousStepRow = this.#cache.stepRows[previousStepID];
            previousStepRow?.classList.remove("active");
        }

        const activeStepRow = this.#cache.stepRows[this.#activeStepID];
        activeStepRow?.classList.add("active");
    }
}