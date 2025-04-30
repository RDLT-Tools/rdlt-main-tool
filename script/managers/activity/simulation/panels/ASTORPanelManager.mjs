import { buildArcDisplayElement, buildArcTagElement, buildElement, buildVertexDisplayElement, buildVertexTagElement } from "../../../../utils.mjs";
import { ActivitySimulationManager } from "../ActivitySimulationManager.mjs";

export class ASTORPanelManager {
    /** @type {ActivitySimulationManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *      torTable: HTMLTableElement
     * }}
     */
    #view = {
        torTable: null,
    };


    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#view.torTable = this.#rootElement.querySelector("table");
    }

    /**
     * @param {{ [vertexUID: number]: { 
     *      T_reached: Set<number>, 
     *      T_condition_satisfied: { 
     *          arcUID: number,  
     *          checkedTime: number
     *      }[] 
     * } }} tor 
     */
    displayTOR(tor) {
        const tableBody = this.#view.torTable.querySelector("tbody");
        tableBody.innerHTML = "";

        if(!tor) {
            this.#rootElement.classList.add("unavailable");
            return;
        }

        for(const vertexUID in tor) {
            const vertex = this.#simulationManager.getVertex(vertexUID);
            if(!vertex) continue;

            const { T_reached, T_condition_satisfied } = tor[vertexUID];

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ]),
                buildElement("td", {}, [ ...T_reached ].join(", "))
            ]);

            
            tableBody.appendChild(row);
            
            if(T_condition_satisfied.length > 0) {
                row.setAttribute("data-has-subtable", "");
                

                const subtableBody = buildElement("tbody");
                const subtable = buildElement("table", { classname: "subtable anchor-right" }, [
                    buildElement("thead", {}, [
                        buildElement("tr", {}, [
                            buildElement("th", {}, [ "Arc" ]),
                            buildElement("th", { style: "text-align: center" }, [ "C" ]),
                            buildElement("th", {}, [ "T-Statisfied" ]),
                        ])
                    ]),
                    subtableBody
                ]);

                const subtableRow = buildElement("tr", { classname: "subtable-parent" }, [
                    buildElement("td", { colspan: "100%" }, [ subtable ])
                ]);

                tableBody.appendChild(subtableRow);
                
                for(const { arcUID, checkedTime } of T_condition_satisfied) {
                    const arc = this.#simulationManager.getArc(arcUID);
                    if(!arc) continue;

                    const subrow = buildElement("tr", {}, [
                        buildElement("td", {}, [
                            buildArcDisplayElement(),
                            buildArcTagElement(...this.#simulationManager.getArcIdentifierPair(arcUID))
                        ]),
                        buildElement("td", { style: "text-align: center" }, [ arc.C || "ϵ" ]),
                        buildElement("td", {}, [ checkedTime ])
                    ]);

                    subtableBody.appendChild(subrow);
                }
            }

        }
    }
}