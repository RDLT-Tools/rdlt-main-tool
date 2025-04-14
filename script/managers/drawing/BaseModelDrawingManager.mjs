import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ArcSVGBuilder from "../../render/builders/ArcSVGBuilder.mjs";
import ComponentSVGBuilder from "../../render/builders/ComponentSVGBuilder.mjs";
import RBSSVGBuilder from "../../render/builders/RBSSVGBuilder.mjs";
import { getDistance } from "../../render/builders/utils.mjs";
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
     * 
     * @param {SVGElement} drawingSVGElement 
     * @param {DrawingOrigin} origin 
     */
    constructor(drawingSVGElement, origin = "model") {
        this.origin = origin;
        this.drawingSVG = drawingSVGElement;
        
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
            const vertex1Geometry = vertexMap[arc.fromVertexUID].geometry;
            const vertex2Geometry = vertexMap[arc.toVertexUID].geometry;
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
        this.drawingSVG.appendChild(vertexBuilder.element);

        return vertexBuilder;
    }

    /**
     * @param {VisualArc} arc
     * @returns {ArcSVGBuilder} 
     */
    addArc(arc, vertex1Geometry, vertex2Geometry) {
        const geometry = arc.geometry;
        const connectorEndThickness = arc.styles.connectorEnd.thickness;
        
        const id = arc.uid;
        const arcBuilder = new ArcSVGBuilder(this.origin);

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

        this.builders.arcs[id] = arcBuilder;
        this.drawingSVG.appendChild(arcBuilder.element); 

        return arcBuilder;
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
        this.drawingSVG.appendChild(rbsBuilder.element);

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
}