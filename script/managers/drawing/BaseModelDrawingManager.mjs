import ComponentGeometry from "../../entities/geometry/ComponentGeometry.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ArcSVGBuilder from "../../render/builders/ArcSVGBuilder.mjs";
import ComponentSVGBuilder from "../../render/builders/ComponentSVGBuilder.mjs";
import RBSSVGBuilder from "../../render/builders/RBSSVGBuilder.mjs";
import { getDistance, makeGroupSVG } from "../../render/builders/utils.mjs";
import { DrawingViewportManager } from "./DrawingViewportManager.mjs";

export class BaseModelDrawingManager {
    /**
     * @typedef {"model" | "aes" | "vs"} DrawingOrigin
     */
    origin;

    /** @type {SVGElement} */
    drawingSVG;

    /**
     * @type {{
     *    vertices: { [id: string | number]: ComponentSVGBuilder },
     *    arcs: { [id: string]: ArcSVGBuilder },
     *    rbs: { [centerUID: string]: RBSSVGBuilder },
     * }}
    */
    builders = {
        vertices: {},
        arcs: {},
        rbs: {}
    };

    /** @type {DrawingViewportManager} */
    viewport;

    /**
     * @type {{
     *      vertices: SVGGElement,
     *      arcs: SVGGElement,
     *      rbs: SVGGElement,
     * }}
     */
    groups = {
        vertices: null,
        arcs: null,
        rbs: null
    };

    #highlights = {
        vertices: new Set(),
        arcs: new Set()
    };

    /**
     * 
     * @param {SVGElement} drawingSVGElement 
     * @param {DrawingOrigin} origin 
     */
    constructor(drawingSVGElement, origin = "model") {
        this.origin = origin;
        this.drawingSVG = drawingSVGElement;


        
        this.#initialize();
    }


    #initialize() {
        this.groups.vertices = makeGroupSVG([], { className: "group-vertices" });
        this.groups.arcs = makeGroupSVG([], { className: "group-arcs" });
        this.groups.rbs = makeGroupSVG([], { className: "group-rbs" });
        
        this.drawingSVG.appendChild(this.groups.rbs);
        this.drawingSVG.appendChild(this.groups.arcs);
        this.drawingSVG.appendChild(this.groups.vertices);

        this.viewport = new DrawingViewportManager(this.drawingSVG);
    }

    /**
     * 
     * @param {VisualComponent[]} vertices 
     * @param {VisualArc[]} arcs 
     */
    setupComponents(vertices, arcs) {
        const vertexMap = {};
        const rbsVertices = {};

        for(const vertex of vertices) {
            vertexMap[vertex.uid] = vertex;
            if(vertex.isRBSCenter) {
                rbsVertices[vertex.uid] = new Set();
                rbsVertices[vertex.uid].add(vertex.uid);
            }
        }

        // Add arcs
        for(const arc of arcs) {
            const vertex1Geometry = vertexMap[arc.fromVertexUID]?.geometry;
            const vertex2Geometry = vertexMap[arc.toVertexUID]?.geometry;
            if(!vertex1Geometry || !vertex2Geometry) continue;
            
            this.addArc(arc, vertex1Geometry, vertex2Geometry);

            if(!arc.C.trim()) {
                rbsVertices[arc.fromVertexUID]?.add(arc.toVertexUID);
            }
        }

        // Add vertices
        for(const vertex of vertices) {
            this.addVertex(vertex);
        }

        // Add RBSs
        for(const centerVertexUID in rbsVertices) {
            const vertices = [...rbsVertices[centerVertexUID]].map(uid => vertexMap[uid]);
            const centerVertex = vertexMap[centerVertexUID];
            this.#addRBS(centerVertex, vertices);
        }
    }

    /**
     * @param {VisualComponent} vertex 
     * @returns {ComponentSVGBuilder}
     */
    addVertex(vertex) {
        const id = vertex.uid;
        const vertexBuilder = new ComponentSVGBuilder(vertex.type, this.origin);
        vertexBuilder.setCenterLabelText(vertex.identifier);
        vertexBuilder.setOuterLabelText(vertex.label);
        vertexBuilder.setStrokeWidth(vertex.styles.outline.width);
        vertexBuilder.setPosition(vertex.geometry.position.x, vertex.geometry.position.y);

        this.builders.vertices[id] = vertexBuilder;
        this.groups.vertices.appendChild(vertexBuilder.element);

        return vertexBuilder;
    }

    /**
     * @param {VisualArc} arc
     * @returns {ArcSVGBuilder} 
     * @param {{ index: number, count: number }} order
     */
    addArc(arc, vertex1Geometry, vertex2Geometry) {
        const id = arc.uid;
        const arcBuilder = new ArcSVGBuilder(this.origin);

        arcBuilder.setLabelText(`${arc.C || "ϵ"}:${arc.L}`);
        if(arc.isAbstractArc) arcBuilder.setIsAbstract(true);
        
        this.drawArc(arcBuilder, arc, vertex1Geometry, vertex2Geometry);

        this.builders.arcs[id] = arcBuilder;
        this.groups.arcs.appendChild(arcBuilder.element); 

        return arcBuilder;
    }

    /**
     * 
     * @param {ArcSVGBuilder} arcBuilder 
     * @param {VisualArc} arc 
     * @param {ComponentGeometry} vertex1Geometry 
     * @param {ComponentGeometry} vertex2Geometry 
     * @param {{ index: number, count: number }} order 
     */
    drawArc(arcBuilder, arc, vertex1Geometry, vertex2Geometry) {
        const geometry = arc.geometry;
        const connectorEndThickness = arc.styles.connectorEnd.thickness;
                
        // Set arc geometry
        const startRadius = vertex1Geometry.size/2;
        const start = vertex1Geometry.position;
        
        const endRadius = vertex2Geometry.size/2;
        const end = vertex2Geometry.position;
        
        let points = [ start ];

        const { index = 0, count = 1 } = arc.order;
        const displayArcForm = count > 1 && arc.form === "straight" ? "curved" : arc.form;

        if(displayArcForm === "self-loop") {
            const controlPoint = arc.controlPoint;
            points.push({ 
                x: vertex1Geometry.position.x + controlPoint.x,
                y: vertex1Geometry.position.y + controlPoint.y,
            });
        } else if(displayArcForm === "curved") {
            points.push(end);
        } else {
            points.push(...geometry.waypoints, end);
        }

        const curveDiff = 44;
        let curveDeviation = 0;

        if(count % 2 === 0) {
            if(index % 2 === 0) {
                curveDeviation = curveDiff * (index/2+1) - curveDiff/2;
            } else {
                curveDeviation = -curveDiff * ((index-1)/2+1) + curveDiff/2;
            }
        } else {
            if(index === 0) curveDeviation = 0;
            else if(index % 2 === 1) {
                curveDeviation = curveDiff * ((index-1)/2+1);
            } else {
                curveDeviation = -curveDiff * ((index-2)/2+1);
            }
        }

        const drawn = arcBuilder.drawPath(displayArcForm, points, startRadius, endRadius, curveDeviation);

        if(displayArcForm === "curved") {
            arcBuilder.updateConnectorEndPosition(connectorEndThickness, end, endRadius, drawn.controlPoint);
            points = drawn.cubicBezierPoints;
        } else if(displayArcForm === "self-loop") {
            const intersections = drawn.intersections;
            arcBuilder.updateConnectorEndPosition(connectorEndThickness, end, endRadius, intersections[1]);
        } else {
            // Set connector end invisible if last segment's length is less than connectorEndThickness
            if(getDistance(points[points.length-2], end) >= connectorEndThickness*2) {
                arcBuilder.setConnectorEndVisible(true);
                arcBuilder.updateConnectorEndPosition(connectorEndThickness, end, endRadius, points[points.length-2]);
            } else {
                arcBuilder.setConnectorEndVisible(false);
            }
        }

        arcBuilder.updateLabelPosition(
            displayArcForm, points, arc.geometry.arcLabel.baseSegmentIndex,
            arc.geometry.arcLabel.footFracDistance, arc.geometry.arcLabel.perpDistance, 
            startRadius, endRadius);

        arcBuilder.setStrokeWidth(arc.styles.outline.width)
            .setConnectorEndThickness(arc.styles.connectorEnd.thickness);

    }

    /**
     * @param {VisualComponent} centerComponent 
     * @param {VisualComponent[]} vertices 
     * @returns {RBSSVGBuilder}
     */
    #addRBS(centerComponent, vertices) {
        const rbsBuilder = new RBSSVGBuilder();
        rbsBuilder.setCenterIdentifier(centerComponent.identifier);
        rbsBuilder.setBounds(this.#calculateRBSBounds(vertices));

        this.builders.rbs[centerComponent.uid] = rbsBuilder;
        this.groups.rbs.appendChild(rbsBuilder.element);

        return rbsBuilder;
    }

    #calculateRBSBounds(vertices) {
        const vertexBounds = vertices.map(c => c.geometry.bounds);
        let minX = Math.min(...vertexBounds.map(b => b.minX));
        let minY = Math.min(...vertexBounds.map(b => b.minY));
        let maxX = Math.max(...vertexBounds.map(b => b.maxX));
        let maxY = Math.max(...vertexBounds.map(b => b.maxY));

        const bounds = { minX, minY, maxX, maxY };

        return bounds;
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