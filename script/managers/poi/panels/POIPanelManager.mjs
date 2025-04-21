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
     *      table: HTMLTableElement,
     *   },
     *   tor: {
     *      section: HTMLDivElement,
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
        tor: { section: null, table: null },
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
        this.#view.shared.table = this.#rootElement.querySelector(`[data-poi-section="shared"] table`);
        this.#view.tor.section = this.#rootElement.querySelector(`[data-poi-section="tor"]`);
        this.#view.tor.table = this.#rootElement.querySelector(`[data-poi-section="tor"] table`);
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
     * @param {{
     *      arcs: Set<number>
     * }} result 
     */
    setupSharedResourcesDisplay(result) {
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
     *      timeReached: number[],
     *      parents: {
     *          arcUID: number,
     *          timeSatisfied: number[]
     *      }[]
     * }[]} result 
     */
    setupTORDisplay(result) {
        const tableBody = this.#view.tor.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const { vertexUID, timeReached, parents } of result) {
            const vertex = this.#parentManager.getVertex(vertexUID);
            if(!vertex) continue;

            const row = buildElement("tr", {}, [
                buildElement("td", {}, [
                    buildVertexDisplayElement(vertex.type),
                    buildVertexTagElement(vertex.identifier)
                ])
            ]);

            
            tableBody.appendChild(row);
            
            if(parents.length > 0) {
                row.setAttribute("data-has-subtable", "");
                

                const subtableBody = buildElement("tbody");
                const subtable = buildElement("table", { classname: "subtable anchor-right" }, [
                    buildElement("thead", {}, [
                        buildElement("tr", {}, [
                            buildElement("th", {}, [ "Parents" ]),
                            buildElement("th", { style: "text-align: center" }, [ "Condition" ]),
                            buildElement("th", {}, [ "T-Statisfied" ]),
                        ])
                    ]),
                    subtableBody
                ]);

                const subtableRow = buildElement("tr", { classname: "subtable-parent" }, [
                    buildElement("td", { colspan: "100%" }, [ subtable ])
                ]);

                tableBody.appendChild(subtableRow);
                
                for(const { arcUID, timeSatisfied } of parents) {
                    const arc = this.#parentManager.getArc(arcUID);
                    if(!arc) continue;

                    const subrow = buildElement("tr", {}, [
                        buildElement("td", {}, [
                            buildArcDisplayElement(),
                            buildArcTagElement(...this.#parentManager.getArcIdentifierPair(arcUID))
                        ]),
                        buildElement("td", { style: "text-align: center" }, [ arc.C || "ϵ" ]),
                        buildElement("td", {}, timeSatisfied.join(" "))
                    ]);

                    subtableBody.appendChild(subrow);
                }
            }

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