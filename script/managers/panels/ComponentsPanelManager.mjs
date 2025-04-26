import ModelContext from "../model/ModelContext.mjs";
import { buildArcDisplayElement, buildArcTagElement, buildElement, buildVertexDisplayElement, buildVertexTagElement, Form } from "../../utils.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";

export default class ComponentsPanelManager {
    /** @type { ModelContext } */
    context;

    /** @type {HTMLDivElement} */
    #rootElement;


    /**
     * @type {{ 
     *      search: HTMLInputElement,
     *      verticesTable: HTMLTableElement, 
     *      arcsTable: HTMLTableElement }}
     */
    #views = {
        search: null,
        verticesTable: null,
        arcsTable: null,
    };

    /**
     * @type {{ 
     *      vertexRows: { [vertexUID: number]: HTMLTableRowElement },
     *      arcRows: { [arcUID: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        vertexRows: {},
        arcRows: {}
    };

    #searchKeyword = "";

    #selected = {
        vertices: new Set(),
        arcs: new Set()
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context, rootElement) {
        this.context = context;
        this.#rootElement = rootElement;
        
        this.#initializeViews();
    }

    #initializeViews() {
        this.#views.verticesTable = this.#rootElement.querySelector(`[data-section-id='vertices'] table`);
        this.#views.arcsTable = this.#rootElement.querySelector(`[data-section-id='arcs'] table`);
        this.#views.search = this.#rootElement.querySelector("input[name='search']");

        this.#views.search.addEventListener("input", (event) => {
            this.#searchKeyword = event.target.value.trim().toLowerCase();
            this.refreshComponentsList();
        });

    }

    /**
     * 
     * @param {VisualComponent[]} vertices 
     * @param {VisualArc[]} arcs 
     */
    refreshComponentsList() {
        const vertices = this.context.managers.visualModel.getAllComponents();
        const arcs = this.context.managers.visualModel.getAllArcs();

        const verticesTableBody = this.#views.verticesTable.querySelector("tbody");
        verticesTableBody.innerHTML = "";

        for(const vertex of vertices) {
            if(!this.#vertexMatchesSearch(vertex)) continue;

            let vertexRow = this.#cache.vertexRows[vertex.uid];

            if(!vertexRow) {
                vertexRow = buildElement("tr", {}, [
                    buildElement("td", {}, [ 
                        buildVertexDisplayElement(vertex.type),
                        buildVertexTagElement(vertex.identifier)
                    ]),
                    buildElement("td", { classname: "vertex-type" }, [ vertex.typeLabel ])
                ]);

                vertexRow.addEventListener("click", () => {
                    this.context.managers.modelling.selectSingleComponent(vertex.uid);
                });

                this.#cache.vertexRows[vertex.uid] = vertexRow;
            } else {
                this.#refreshVertexValues(vertex);
            }

            verticesTableBody.appendChild(vertexRow);
        }

        const arcsTableBody = this.#views.arcsTable.querySelector("tbody");
        arcsTableBody.innerHTML = "";

        for(const arc of arcs) {
            if(!this.#arcMatchesSearch(arc)) continue; 
            
            const from = this.context.managers.modelling.getComponentById(arc.fromVertexUID);
            const to = this.context.managers.modelling.getComponentById(arc.toVertexUID);

            let arcRow = this.#cache.arcRows[arc.uid];

            if(!arcRow) {
                arcRow = buildElement("tr", {}, [
                    buildElement("td", {}, [ 
                        buildArcDisplayElement(),
                        buildArcTagElement(from.identifier, to.identifier)
                    ]),
                    buildElement("td", { classname: "arc-attrs" }, [ `${arc.C || "ϵ"}:${arc.L}` ])
                ]);

                arcRow.addEventListener("click", () => {
                    this.context.managers.modelling.selectSingleArc(arc.uid);
                });

                this.#cache.arcRows[arc.uid] = arcRow;
            } else {
                this.#refreshArcValues(arc);
            }

            arcsTableBody.appendChild(arcRow);
        }
    }

    /**
     * 
     * @param {VisualComponent} vertex 
     */
    #refreshVertexValues(vertex) {
        const vertexRow = this.#cache.vertexRows[vertex.uid];
        if(!vertexRow) return;

        vertexRow.querySelector(".vertex-display").setAttribute("data-vertex-type", vertex.type);
        vertexRow.querySelector(".vertex-tag").innerText = vertex.identifier;
        vertexRow.querySelector(".vertex-type").innerText = vertex.typeLabel;
    }

    /**
     * 
     * @param {VisualArc} arc
     */
    #refreshArcValues(arc) {
        const arcRow = this.#cache.arcRows[arc.uid];
        if(!arcRow) return;

        const from = this.context.managers.visualModel.getComponent(arc.fromVertexUID);
        const to = this.context.managers.visualModel.getComponent(arc.toVertexUID);

        arcRow.querySelector(".arc-tag .from").innerText = from.identifier;
        arcRow.querySelector(".arc-tag .to").innerText = to.identifier;
        arcRow.querySelector(".arc-attrs").innerText = `${arc.C || "ϵ"}:${arc.L}`;
    }

    /**
     * @param {VisualArc} arc 
     */
    refreshArc(arc) {
        this.#refreshArcValues(arc);
    }

    /**
     * 
     * @param {VisualComponent} vertex 
     * @returns 
     */
    refreshVertexAndIncidentArcs(vertex) {
        this.#refreshVertexValues(vertex);

        const incidentArcs = this.context.managers.visualModel.getArcsIncidentToComponent(vertex.uid);
        for(const arc of incidentArcs) {
            this.#refreshArcValues(arc);
        }
    } 

    /**
     * 
     * @param {Set<number>} vertices 
     * @param {Set<number>} arcs 
     */
    refreshSelected() {
        const { components: vertices, arcs } = this.context.managers.modelling.modellingStates.selected;

        const prevSelected = { ...this.#selected };

        // Update selected
        this.#selected.vertices = new Set(vertices);
        this.#selected.arcs = new Set(arcs);

        // Activate selected (if not yet)
        for(const vertexUID of this.#selected.vertices) {
            if(prevSelected.vertices.has(vertexUID)) {
                prevSelected.vertices.delete(vertexUID);
            } else {
                this.#cache.vertexRows[vertexUID]?.classList.add("active");
            }
        }

        for(const arcUID of this.#selected.arcs) {
            if(prevSelected.arcs.has(arcUID)) {
                prevSelected.arcs.delete(arcUID);
            } else {
                this.#cache.arcRows[arcUID]?.classList.add("active");
            }
        }

        // Deactivate previously selected
        for(const vertexUID of prevSelected.vertices) {
            this.#cache.vertexRows[vertexUID]?.classList.remove("active");
        }

        for(const arcUID of prevSelected.arcs) {
            this.#cache.arcRows[arcUID]?.classList.remove("active");
        }
    }

    /**
     * @param {VisualComponent} vertex 
     */
    #vertexMatchesSearch(vertex) {
        const keyword = this.#searchKeyword;
        if(!keyword) return true;

        return vertex.identifier.toLowerCase().includes(keyword)
            || vertex.label.toLowerCase().includes(keyword)
            || vertex.type.includes(keyword);
    }

    /**
     * @param {VisualArc} arc 
     */
    #arcMatchesSearch(arc) {
        const keyword = this.#searchKeyword;
        if(!keyword) return true;

        const from = this.context.managers.visualModel.getComponent(arc.fromVertexUID);
        const to = this.context.managers.visualModel.getComponent(arc.toVertexUID);

        return from.identifier.toLowerCase().includes(keyword)
            || to.identifier.toLowerCase().includes(keyword)
            || arc.C.includes(keyword);
    }


}