import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ArcSVGBuilder from "../../render/builders/ArcSVGBuilder.mjs";
import ComponentSVGBuilder from "../../render/builders/ComponentSVGBuilder.mjs";
import { getDistance } from "../../render/builders/utils.mjs";
import { AESimulationManager } from "./AESimulationManager.mjs";

export class AESDrawingManager {
    /** @type {AESimulationManager} */
    #simulationManager;

    /** @type {SVGElement} */
    #drawingSVG;

    /**
     * @type {{
    *    vertices: { [id: string | number]: ComponentSVGBuilder },
    *    arcs: { [id: string]: ArcSVGBuilder },
    * }}
    */
   #builders = {
        vertices: {},
        arcs: {},
   };

   #highlights = {
        vertices: new Set(),
        arcs: new Set()
   };

    constructor(simulationManager, drawingSVGElement) {
        this.#simulationManager = simulationManager;
        this.#drawingSVG = drawingSVGElement;
    }

    /**
     * 
     * @param {VisualComponent[]} vertices 
     * @param {VisualArc[]} arcs 
     */
    setupComponents(vertices, arcs) {
        const vertexMap = {};
        for(const vertex of vertices) {
            vertexMap[vertex.uid] = vertex;
        }

        // Add arcs
        for(const arc of arcs) {
            const vertex1Geometry = vertexMap[arc.fromVertexUID].geometry;
            const vertex2Geometry = vertexMap[arc.toVertexUID].geometry;
            const arcBuilder = this.#addArc(arc, vertex1Geometry, vertex2Geometry);
            arcBuilder.aesClickableElement.addEventListener("click", () => this.#simulationManager.chooseArc(arc.uid));
        }

        // Add vertices
        for(const vertex of vertices) {
            const vertexElement = this.#addVertex(vertex);
        }
    }

    /**
     * @param {VisualComponent} vertex 
     * @returns {SVGGElement}
     */
    #addVertex(vertex) {
        const id = vertex.uid;
        const vertexBuilder = new ComponentSVGBuilder(vertex.type, "aes");
        vertexBuilder.setCenterLabelText(vertex.identifier);
        vertexBuilder.setStrokeWidth(vertex.styles.outline.width);
        vertexBuilder.setPosition(vertex.geometry.position.x, vertex.geometry.position.y);
        
        this.#builders.vertices[id] = vertexBuilder;
        this.#drawingSVG.appendChild(vertexBuilder.element);

        return vertexBuilder.element;
    }

    /**
     * @param {VisualArc} arc
     * @returns {ArcSVGBuilder} 
     */
    #addArc(arc, vertex1Geometry, vertex2Geometry) {
        const geometry = arc.geometry;
        const connectorEndThickness = arc.styles.connectorEnd.thickness;
        
        const id = arc.uid;
        const arcBuilder = new ArcSVGBuilder("aes");

        arcBuilder.setLabelText(`${arc.C || "ϵ"}:${arc.L}`);
        
        // Set arc geometry
        const startRadius = vertex1Geometry.size/2;
        const start = vertex1Geometry.position;
        
        const endRadius = vertex2Geometry.size/2;
        const end = vertex2Geometry.position;
        
        let points = [ start ];

        if(arc.form === "self-loop") {
            const controlPoint = arc.controlPoint;
            points.push({ 
                x: vertex1Geometry.position.x + controlPoint.x,
                y: vertex1Geometry.position.y + controlPoint.y,
            });
        } else {
            points.push(...geometry.waypoints, end);
        }

        const drawn = arcBuilder.drawPath(arc.form, points, startRadius, endRadius);

        if(arc.form !== "self-loop") {
            // Set connector end invisible if last segment's length is less than connectorEndThickness
            if(getDistance(points[points.length-2], end) >= connectorEndThickness*2) {
                arcBuilder.setConnectorEndVisible(true);
                arcBuilder.updateConnectorEndPosition(connectorEndThickness, end, endRadius, points[points.length-2]);
            } else {
                arcBuilder.setConnectorEndVisible(false);
            }
        } else {
            const intersections = drawn.intersections;
            arcBuilder.updateConnectorEndPosition(connectorEndThickness, end, endRadius, intersections[1]);
        }

        arcBuilder.updateLabelPosition(
            arc.form, points, arc.geometry.arcLabel.baseSegmentIndex,
            arc.geometry.arcLabel.footFracDistance, arc.geometry.arcLabel.perpDistance, 
            startRadius, endRadius);

        arcBuilder.setStrokeWidth(arc.styles.outline.width)
            .setConnectorEndThickness(arc.styles.connectorEnd.thickness);

        this.#builders.arcs[id] = arcBuilder;
        this.#drawingSVG.appendChild(arcBuilder.element); 

        return arcBuilder;
    }

    highlightVertex(vertexUID) {
        const vertexBuilder = this.#builders.vertices[vertexUID];
        if(!vertexBuilder) return;

        vertexBuilder.element.classList.add("active");
        this.#highlights.vertices.add(vertexUID);
    }

    highlightArc(arcUID) {
        const arcBuilder = this.#builders.arcs[arcUID];
        if(!arcBuilder) return;

        arcBuilder.element.classList.add("active");
        this.#highlights.arcs.add(arcUID);
    }

    clearHighlights() {
        for(const highlightedVertexUID of this.#highlights.vertices) {
            const vertexBuilder = this.#builders.vertices[highlightedVertexUID];
            if(!vertexBuilder) continue;

            vertexBuilder.element.classList.remove("active");
        } 

        for(const highlightedArcUID of this.#highlights.arcs) {
            const arcBuilder = this.#builders.arcs[highlightedArcUID];
            if(!arcBuilder) continue;

            arcBuilder.element.classList.remove("active");
        }

        this.#highlights.vertices.clear();
        this.#highlights.arcs.clear();
    }
}