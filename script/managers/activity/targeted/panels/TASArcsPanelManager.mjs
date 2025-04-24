import { buildArcTagElement, buildElement } from "../../../../utils.mjs";
import { TargetedArcSelectManager } from "../TargetedArcSelectManager.mjs";

export class TASArcsPanelManager {
    /** @type {TargetedArcSelectManager} */
    #parentManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *      arcsTable: HTMLTableElement
     * }}
     */
    #views = {
        arcsTable: null,
    };

    /** 
     * @type {{
     *      arcRows: { [timestep: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        arcRows: {}
    }


    constructor(parentManager, rootElement) {
        this.#parentManager = parentManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#views.arcsTable = this.#rootElement.querySelector("table");
    }

    /**
     * @param {Set<number>} arcs
     */
    refreshArcsList(arcs) {
        const tableBody = this.#views.arcsTable.querySelector("tbody");
        tableBody.innerHTML = "";
        
        for(const arcUID of arcs) {
            let arcRow = this.#cache.arcRows[arcUID];

            if(!arcRow) {
                arcRow = buildElement("tr", {}, [
                    buildElement("td", {}, [ 
                        buildArcTagElement(...this.#parentManager.getArcIdentifierPair(arcUID))
                    ])
                ]);

                this.#cache.arcRows[arcUID] = arcRow;
            }

            tableBody.appendChild(arcRow);
        }
    }
}