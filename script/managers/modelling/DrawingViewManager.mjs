import ArcGeometry from "../../entities/geometry/ArcGeometry.mjs";
import ComponentGeometry from "../../entities/geometry/ComponentGeometry.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ArcStyles from "../../entities/styling/ArcStyles.mjs";
import ComponentStyles from "../../entities/styling/ComponentStyles.mjs";
import ArcSVGBuilder from "../../render/builders/ArcSVGBuilder.mjs";
import ComponentSVGBuilder from "../../render/builders/ComponentSVGBuilder.mjs";
import HighlightSVGBuilder from "../../render/builders/HighlightSVGBuilder.mjs";
import RBSSVGBuilder from "../../render/builders/RBSSVGBuilder.mjs";
import { getDistance } from "../../render/builders/utils.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { LocalSessionManager } from "../session/LocalSessionManager.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";

export default class DrawingViewManager extends BaseModelDrawingManager {
    /** @type { ModelContext } */
    context;


    /**
     * @type {{
     *    
     *    highlight: HighlightSVGBuilder,
     *    dragging: { component: ComponentSVGBuilder },
     *    arcTracing: ArcSVGBuilder
     * }}
     */
    #extraBuilders = {
        highlight: null,
        dragging: {
            component: null
        },
        arcTracing: null
    };

    /**
     * @param {ModelContext} context
     * @param {{ drawingSVG: SVGElement }} options 
     */
    constructor(context, options = {}) {
        super(options.drawingSVG, "model");

        this.context = context;

        // Initialize reusable builders
        this.#extraBuilders.arcTracing = new ArcSVGBuilder("tracing");
        this.#setArcStyles(this.#extraBuilders.arcTracing, new ArcStyles());
        this.#extraBuilders.arcTracing.element.classList.add("arc-tracing");
        this.#extraBuilders.arcTracing.element.style.display = "none";
        this.drawingSVG.appendChild(this.#extraBuilders.arcTracing.element);

        const drawingStates = LocalSessionManager.loadDrawingStates(this.context.id);
        this.viewport.setStates(drawingStates);
        this.viewport.onUpdateListener = (states) => LocalSessionManager.saveDrawingStates(this.context.id, states);
    }

    highlightOver(ix, iy, fx, fy) {
        if(!this.#extraBuilders.highlight) {
            // Setup highlight
            this.#extraBuilders.highlight = new HighlightSVGBuilder();
            this.drawingSVG.appendChild(this.#extraBuilders.highlight.element);
        }

        this.#extraBuilders.highlight.highlightOver(ix, iy, fx, fy);
    }

    hideHighlight() {
        this.#extraBuilders.highlight?.hide();
    }

    /**
     * @param {number} id
     * @returns {ComponentSVGBuilder | null} 
     */
    #getComponentBuilder(id) {
        return this.builders.vertices[id] || null;
    }

    /**
     * @param {number} id
     * @returns {ArcSVGBuilder | null} 
     */
    #getArcBuilder(id) {
        return this.builders.arcs[id] || null;
    }

    /**
     * @param {VisualComponent} vertex 
     * @returns {SVGGElement}
     */
    addVertex(vertex) {
        const vertexBuilder = super.addVertex(vertex);
        return vertexBuilder.element;
    }

    /**
     * 
     * @param {VisualArc} arc
     * @returns {SVGGElement} 
     */
    addArc(arc, vertex1Geometry, vertex2Geometry) {
        const arcBuilder = super.addArc(arc, vertex1Geometry, vertex2Geometry);
        return arcBuilder.element;
    }

    getArcBounds(id) {
        const arcBuilder = this.builders.arcs[id];
        return arcBuilder.getBounds();
    }


    setIsComponentSelected(id, isSelected) {
        const componentBuilder = this.#getComponentBuilder(id);
        if(!componentBuilder) return;

        componentBuilder.setIsSelected(isSelected);
    }

    setIsArcSelected(id, isSelected) {
        const arcBuilder = this.#getArcBuilder(id);
        if(!arcBuilder) return;

        arcBuilder.setIsSelected(isSelected);
    }

    removeArc(id) {
        const arcBuilder = this.#getArcBuilder(id);
        if(!arcBuilder) return;

        arcBuilder.element.remove();
        delete this.builders.arcs[id];
    }

    
    /**
     * @param {VisualComponent} component 
     */
    updateComponentProps(component) {
        const componentBuilder = this.#getComponentBuilder(component.uid);
        if(!componentBuilder) return;

        this.#setComponentProps(componentBuilder, component);
    }
    
    /**
     * @param {number} id
     * @param {ComponentStyles} styles
     */
    updateComponentStyles(id, styles) {
        const componentBuilder = this.#getComponentBuilder(id);
        if(!componentBuilder) return;

        this.#setComponentStyles(componentBuilder, styles);
    }

    /**
     * @param {number} id
     * @param {ComponentGeometry} geometry
     */
    updateComponentGeometry(id, geometry) {
        const componentBuilder = this.#getComponentBuilder(id);
        if(!componentBuilder) return;

        this.#setComponentGeometry(componentBuilder, geometry);
    }

    removeComponent(id) {
        const componentBuilder = this.#getComponentBuilder(id);
        if(!componentBuilder) return;

        componentBuilder.element.remove();
        delete this.builders.vertices[id];
    }

    /**
     * @param {VisualArc} arc 
     */
    updateArcProps(arc) {
        const arcBuilder = this.#getArcBuilder(arc.uid);
        if(!arcBuilder) return;

        this.#setArcProps(arcBuilder, arc);
    }

    /**
    * @param {number} id
     * @param {ArcGeometry} geometry
     * @param {ComponentGeometry} vertex1Geometry
     * @param {ComponentGeometry} vertex2Geometry
     */
    updateArcGeometry(arc, vertex1Geometry, vertex2Geometry, order) {
        const arcBuilder = this.#getArcBuilder(arc.uid);
        if(!arcBuilder) return;

        this.drawArc(arcBuilder, arc, vertex1Geometry, vertex2Geometry, order);
    }
    

    /**
     * @param {ComponentSVGBuilder} builder 
     * @param {VisualComponent} component 
     */
    updateComponentType(id, component) {
        const componentBuilder = this.#getComponentBuilder(id);
        if(!componentBuilder) return;

        componentBuilder.setType(component.type);
        this.#setComponentStyles(componentBuilder, component.styles);
    }


    /**
     * @param {ComponentSVGBuilder} builder 
     * @param {VisualComponent} component 
     */
    #setComponentProps(builder, component) {
        builder.setCenterLabelText(component.identifier);
        builder.setOuterLabelText(component.label);
    }

    /**
     * 
     * @param {ComponentSVGBuilder} builder 
     * @param {ComponentStyles} styles 
     */
    #setComponentStyles(builder, styles) {
        builder.setStrokeWidth(styles.outline.width);
    }

    /**
     * 
     * @param {ComponentSVGBuilder} builder 
     * @param {ComponentGeometry} geometry 
     */
    #setComponentGeometry(builder, geometry) {
        builder.setPosition(geometry.position.x, geometry.position.y);
    }


    /**
     * @param {ArcSVGBuilder} builder 
     * @param {VisualArc} arc 
     */
    #setArcProps(builder, arc) {
        builder.setLabelText(`${arc.C || "ϵ"}:${arc.L}`);
    }

    /**
     * 
     * @param {ArcSVGBuilder} builder 
     * @param {ArcStyles} styles 
     */
    #setArcStyles(builder, styles) {
        builder.setStrokeWidth(styles.outline.width)
            .setConnectorEndThickness(styles.connectorEnd.thickness);
    }

    /**
     * @param {"boundary" | "entity" | "controller"} componentType
     * @param {{ x: number, y: number }} position
     * @returns {SVGGElement}
     */
    showDraggingComponent(componentType, position) {
        const componentBuilder = new ComponentSVGBuilder(componentType, "dragging");
        
        const geometry = new ComponentGeometry({ position });
        const styles = new ComponentStyles();
        
        this.#setComponentGeometry(componentBuilder, geometry);
        this.#setComponentStyles(componentBuilder, styles);
        this.#extraBuilders.dragging.component = componentBuilder;
        this.drawingSVG.appendChild(componentBuilder.element);

        return componentBuilder.element;
    }

    moveDraggingComponent(x, y) {
        const draggingComponentBuilder = this.#extraBuilders.dragging.component;
        if(!draggingComponentBuilder) return;

        draggingComponentBuilder.setPosition(x, y);
    }

    destroyDraggingComponent() {
        const draggingComponentBuilder = this.#extraBuilders.dragging.component;
        if(!draggingComponentBuilder) return;

        this.drawingSVG.removeChild(draggingComponentBuilder.element);
        this.#extraBuilders.dragging.component = null;
    }

    /**
     * 
     * @param {ComponentGeometry} vertex1Geometry 
     * @param {{ x: number, y: number }} targetPoint 
     */
    traceArcToPoint(vertex1Geometry, targetPoint) {
        this.#extraBuilders.arcTracing.element.style.display = "initial";

        const arcTracingBuilder = this.#extraBuilders.arcTracing;
        this.drawArc(arcTracingBuilder, new VisualArc({ fromVertexUID: -1, toVertexUID: -2 }), 
            vertex1Geometry, new ComponentGeometry({
                position: targetPoint, size: 1
            }));
    }

    /**
     * @param {VisualComponent} vertex1 
     * @param {VisualComponent} vertex2 
     */
    traceArcToVertex(vertex1, vertex2) {
        this.#extraBuilders.arcTracing.element.style.display = "initial";

        const arcTracingBuilder = this.#extraBuilders.arcTracing;
        this.drawArc(arcTracingBuilder, new VisualArc({
            fromVertexUID: vertex1.uid,
            toVertexUID: vertex2.uid
        }), vertex1.geometry, vertex2.geometry);
    }

    endTracing() {
        this.#extraBuilders.arcTracing.element.style.display = "none";
    }

    /**
     * @param {VisualComponent} centerComponent 
     * @param {{ minX, minY, maxX, maxY }} bounds 
     * @returns {SVGGElement}
     */
    addRBS(centerComponent, bounds) {
        const rbsBuilder = new RBSSVGBuilder();
        rbsBuilder.setCenterIdentifier(centerComponent.identifier);
        this.#setRBSBounds(rbsBuilder, bounds);
        this.builders.rbs[centerComponent.uid] = rbsBuilder;

        this.groups.rbs.appendChild(rbsBuilder.element);

        return rbsBuilder.element;
    }

    /**
     * @param {{ [centerUID: number]: { minX, minY, maxX, maxY }}} rbsBounds 
     */
    updateMultipleRBSBounds(rbsBounds) {
        for(const centerUID in rbsBounds) {
            this.updateRBSBounds(centerUID, rbsBounds[centerUID]);
        }
    }

    /**
     * @param {number} centerUID 
     * @param {{ minX, minY, maxX, maxY }} bounds 
     */
    updateRBSBounds(centerUID, bounds) {
        const rbsBuilder = this.builders.rbs[centerUID];
        if(!rbsBuilder) return;

        this.#setRBSBounds(rbsBuilder, bounds);
    }

    updateRBSCenterIdentifier(centerUID, identifier) {
        const rbsBuilder = this.builders.rbs[centerUID];
        if(!rbsBuilder) return;

        rbsBuilder.setCenterIdentifier(identifier);
    }

    removeRBS(centerUID) {
        const rbsBuilder = this.builders.rbs[centerUID];
        if(!rbsBuilder) return;

        rbsBuilder.element.remove();
        delete this.builders.rbs[centerUID];
    }

    /**
     * 
     * @param {RBSSVGBuilder} builder 
     * @param {{ minX, minY, maxX, maxY }} bounds
     */
    #setRBSBounds(builder, bounds) {
        builder.setBounds(bounds);
    }
}