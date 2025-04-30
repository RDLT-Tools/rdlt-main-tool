import Activity from "../../../entities/activity/Activity.mjs";
import { buildArcDisplayElement, buildArcTagElement, buildElement, buildVertexDisplayElement, buildVertexTagElement } from "../../../utils.mjs";
import { POIManager } from "../POIManager.mjs";

export default class POIPanelManager {
    /** @type {POIManager} */
    #parentManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * 
     * @type {{
     *   pod: {
     *      section: HTMLDivElement,
     *      table: HTMLTableElement,
     *   },
     *   pos: {
     *      section: HTMLDivElement,
     *      table: HTMLTableElement,
     *   },
     *   deadlocks: {
     *      section: HTMLDivElement,
     *      table: HTMLTableElement,
     *   },
     *   shared: {
     *      section: HTMLDivElement,
     *      activitiesTable: HTMLTableElement,
     *      table: HTMLTableElement,
     *   },
     *   pore: {
     *      section: HTMLDivElement,
     *      table: HTMLTableElement,
     *   },
     * }}
     */
    #view = {
        pod: { section: null, table: null },
        pos: { section: null, table: null },
        deadlocks: { section: null, table: null },
        shared: { section: null, table: null },
        pore: { section: null, table: null },
    };

    constructor(parentManager, rootElement) {
        this.#parentManager = parentManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#view.pos.section = this.#rootElement.querySelector(`[data-poi-section="pos"]`);
        this.#view.pos.table = this.#rootElement.querySelector(`[data-poi-section="pos"] table`);
        this.#view.pod.section = this.#rootElement.querySelector(`[data-poi-section="pod"]`);
        this.#view.pod.table = this.#rootElement.querySelector(`[data-poi-section="pod"] table`);
        this.#view.deadlocks.section = this.#rootElement.querySelector(`[data-poi-section="deadlocks"]`);
        this.#view.deadlocks.table = this.#rootElement.querySelector(`[data-poi-section="deadlocks"] table`);
        this.#view.shared.section = this.#rootElement.querySelector(`[data-poi-section="shared"]`);
        this.#view.shared.table = this.#rootElement.querySelector(`[data-poi-section="shared"] .sr-table`);
        this.#view.shared.activitiesTable = this.#rootElement.querySelector(`[data-poi-section="shared"] .acts-table`);
        this.#view.pore.section = this.#rootElement.querySelector(`[data-poi-section="pore"]`);
        this.#view.pore.table = this.#rootElement.querySelector(`[data-poi-section="pore"] table`);
    }

    /**
     * @param {{
     *      vertices: Set<number>
     * }} result 
     */
    setupPODDisplay(result) {
        const tableBody = this.#view.pod.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const vertexUID of result.vertices) {
            const vertex = this.#parentManager.getVertex(vertexUID);
            if(!vertex) return;

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ])
            ]);

            tableBody.appendChild(row);
        }
    }

    /**
     * @param {{
     *      vertices: Set<number>
     * }} result 
    */
    setupPOSDisplay(result) {
        const tableBody = this.#view.pos.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const vertexUID of result.vertices) {
            const vertex = this.#parentManager.getVertex(vertexUID);
            if(!vertex) return;

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ])
            ]);

            tableBody.appendChild(row);
        }
    }

    /**
     * @param {Activity[]} activities
     */
    setupSharedResourcesActivitiesDisplay(activities) {
        // Setup activities table
        const actsTableBody = this.#view.shared.activitiesTable.querySelector("tbody");
        actsTableBody.innerHTML = "";

        for(const activity of activities) {
            const checkbox = buildElement("input", { type: "checkbox" });
            checkbox.addEventListener("change", (event) => {
                this.#parentManager.toggleSRSelectedActivity(activity.id, event.target.checked);
            });

            const activityRow = buildElement("tr", {}, [
                buildElement("td", {}, [ checkbox ]),
                buildElement("td", {}, [ activity.name || "<Untitled Activity>" ]),
            ]);

            actsTableBody.appendChild(activityRow);
        }
    }

    /**
     * @param {{
     *      arcs: Set<number>
     * }} result 
     */
    refreshSharedResourcesDisplay(result) {
        const tableBody = this.#view.shared.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const arcUID of result.arcs) {
            const arc = this.#parentManager.getArc(arcUID);
            if(!arc) return;


            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildArcDisplayElement(),
                    buildArcTagElement(...this.#parentManager.getArcIdentifierPair(arcUID))
                ])
            ]);

            tableBody.appendChild(row);
        }
    }

    /**
     * @param {{
     *      vertices: Set<number>
     * }} result 
     */
    setupDeadlocksDisplay(result) {
        const tableBody = this.#view.deadlocks.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const vertexUID of result.vertices) {
            const vertex = this.#parentManager.getVertex(vertexUID);
            if(!vertex) return;

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ])
            ]);

            tableBody.appendChild(row);
        }
    }

    /**
     * @param {{ 
     *      vertexUID: number,
     *      arcs: Set<number>
     * }[]} result
     */
    setupPOReDisplay(result) {
        const tableBody = this.#view.pore.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const { vertexUID, arcs } of result) {
            const vertex = this.#parentManager.getVertex(vertexUID);
            if(!vertex) continue;

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ])
            ]);

            
            tableBody.appendChild(row);
            
            if(arcs.size > 0) {
                row.setAttribute("data-has-subtable", "");

                const subtableBody = buildElement("tbody");
                const subtable = buildElement("table", { classname: "subtable" }, [ subtableBody ]);

                const subtableRow = buildElement("tr", { classname: "subtable-parent" }, [
                    buildElement("td", { colspan: "100%" }, [ subtable ])
                ]);

                tableBody.appendChild(subtableRow);
                
                for(const arcUID of arcs) {
                    const arc = this.#parentManager.getArc(arcUID);
                    if(!arc) continue;

                    const subrow = buildElement("tr", {}, [
                        buildElement("td", {}, [
                            buildArcDisplayElement(),
                            buildArcTagElement(...this.#parentManager.getArcIdentifierPair(arcUID))
                        ])
                    ]);

                    subtableBody.appendChild(subrow);
                }
            }

        }
    }
}