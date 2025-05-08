import ArcGeometry from "../../entities/geometry/ArcGeometry.mjs";
import ComponentGeometry from "../../entities/geometry/ComponentGeometry.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ArcStyles from "../../entities/styling/ArcStyles.mjs";
import ComponentStyles from "../../entities/styling/ComponentStyles.mjs";
import { isVertexAnObject } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { LocalSessionManager } from "../session/LocalSessionManager.mjs";
import { ClipboardManager } from "../workspace/ClipboardManager.mjs";

export default class ModellingManager {
    /** @type { ModelContext } */
    context;

    
    /**
     * @type {{
     *  mode: "view" | "select",
     *  selected: { components: number[], arcs: number[], annotations: number[] },
     *  events: { 
     *      isMoving: boolean, 
     *      isHighlighting: boolean,
     *      isMultiSelecting: boolean,
     *      isDragging: boolean,
     *      isArcTracing: boolean
     *  },
     *  highlightStart: { x: number, y: number } | null,
     *  view: {
     *      zoomFactor: number,
     *      zoomedOffset: { x: number, y: number }
     *  }
     * }}
     */
    modellingStates = {
        mode: "select",
        selected: {
            components: [], 
            arcs: [], 
            annotations: [] 
        },
        events: {
            isMoving: false,
            isHighlighting: false,
            isMultiSelecting: false,
            isDragging: false,
            isArcTracing: false
        },
        highlightStart: null,
    };


    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    loadModel() {
        const visualModelManager = this.context.managers.visualModel;

        const arcs = visualModelManager.getAllArcs();

        arcs.map(arc => this.#displayNewArc(arc));
        visualModelManager.getAllComponents().map(vertex => this.#displayNewComponent(vertex));

        this.#notifyModelStructureChangesListeners();
    }

    /**
     * @param {number} id 
     * @returns {VisualComponent | null} 
     */
    getComponentById(id) {
        return this.context.managers.visualModel.getComponent(id);
    }

    /**
     * @param {number} id 
     * @returns {VisualArc | null} 
     */
    getArcById(id) {
        return this.context.managers.visualModel.getArc(id);
    }

    generateNextComponentIdentifier() {
        const components = this.context.managers.visualModel.getAllComponents();
        
        if(components.length === 0) return "x1";

        const identifiers = components.map(c => {
            const identifier = c.identifier;
            if(!identifier) return { prefix: "", num: 0 };

            const numericSuffix = identifier.match(/\d+$/)?.[0] || "";
            const prefix = identifier.substring(0, identifier.length - numericSuffix.length);

            return { prefix, num: Number(numericSuffix) || 0 };
        }).sort((i1, i2) => {
            return i1.prefix.localeCompare(i2.prefix) || (i1.num - i2.num);
        });


        const lastIdentifier = identifiers[identifiers.length-1];
        return `${lastIdentifier.prefix}${lastIdentifier.num+1}`;
    }

    renameModel(newName) {
        this.context.managers.visualModel.setModelName(newName);
        this.#saveModel();
    }

    /**
     * @param {"click" | "mouse-down" | "mouse-up" | "mouse-enter" | "mouse-leave"} event 
     * @param {number} id
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onComponentUserEvent(event, id, props) {
        const component = this.getComponentById(id);
        if(!component) return;

        const mode = this.modellingStates.mode;
        const selected = this.modellingStates.selected;
        const modellingEvents = this.modellingStates.events;

        switch(mode) {
            case "select":
                switch(event) {
                    case "mouse-down":
                        if(modellingEvents.isMultiSelecting) {

                        } else {
                            if(!selected.components.includes(id)) {
                                this.#clearSelection();
                                this.#addComponentToSelection(id);
                                this.#refreshSelected();
                            }
                        }

                        this.#startMovement(props.drawingX, props.drawingY);
                        break;
                    
                    case "mouse-up":
                        if(modellingEvents.isMoving) {
                            this.#endMovement();
                        }

                    break;
                    case "mouse-enter":
                        if(modellingEvents.isArcTracing) {
                            this.context.managers.arcTracing.enterTargetComponent(id);
                        }
                    break;
                    case "mouse-leave":
                        if(modellingEvents.isArcTracing) {
                            this.context.managers.arcTracing.leaveTargetComponent(id);
                        }
                    break;
                }
            break;
        }
    }

    /**
     * @param {"mouse-move" | "mouse-down" | "mouse-up" | "key-delete" | "key-selectall" | "key-arrowdown" | "key-arrowup" | "key-arrowleft" | "key-arrowright"} event 
     * @param {{ x?: number, y?: number }} props 
     */
    onDrawingViewUserEvent(event, props = {}) {
        const { x, y } = props;

        const mode = this.modellingStates.mode;
        const modellingEvents = this.modellingStates.events;

        const relativeMoveOffset = { x: 10, y: 10 };

        switch(mode) {
            case "select":
                switch(event) {
                    case "mouse-down":
                        this.#clearSelection();
                        this.#startHighlighting(x, y);

                        break;
                    
                    case "mouse-move":
                        if(modellingEvents.isMoving) {
                            this.context.managers.transform.moveTo(x, y);
                        }

                        if(modellingEvents.isHighlighting) {
                            this.#highlightTo(x, y);
                        }

                        if(modellingEvents.isDragging) {
                            this.context.managers.dragAndDrop.moveTo(x, y);
                        }

                        if(modellingEvents.isArcTracing) {
                            this.context.managers.arcTracing.moveTo(x, y);
                        }

                        break;
                    case "mouse-up":
                        if(modellingEvents.isMoving) {
                            this.#endMovement();
                        }

                        if(modellingEvents.isHighlighting) {
                            this.#stopHighlighting(x, y);
                        }

                        if(modellingEvents.isDragging) {
                            this.#stopDragging(x, y);
                        }

                        if(modellingEvents.isArcTracing) {
                            this.#endArcTracing();
                        }
                        break;
                    case "key-delete":
                        this.removedSelectedArcs(false);
                        this.removeSelectedComponents(true);
                        break;
                    case "key-selectall":
                        this.selectAll();
                        break;
                    case "key-arrowup":
                        this.#moveSelectedRelative(0, -relativeMoveOffset.y);
                        break;
                    case "key-arrowdown":
                        this.#moveSelectedRelative(0, relativeMoveOffset.y);
                        break;
                    case "key-arrowleft":
                        this.#moveSelectedRelative(-relativeMoveOffset.x, 0);
                        break;
                    case "key-arrowright":
                        this.#moveSelectedRelative(relativeMoveOffset.x, 0);
                        break;
                    case "key-copy":
                        this.#copySelected();
                        break;
                    case "key-paste":
                        this.#pasteFromClipboard();
                        break;
                    case "key-duplicate":
                        this.#copySelected();
                        this.#pasteFromClipboard();
                        break;
                    case "key-cut":
                        this.#cutSelected();
                        break;
                }
            break;
        }
    }


    /**
     * @param {"mouse-down"} event 
     * @param {number} componentUID
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onArcTracingHoverUserEvent(event, componentUID, props) {
        switch(event) {
            case "mouse-down":
                this.#startArcTracing(componentUID);
            break;
        }
    }

    /**
     * @param {"click" | "mouse-down" | "mouse-up" | "mouse-enter" | "mouse-leave"} event 
     * @param {number} id
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onArcUserEvent(event, id, props) {
        const mode = this.modellingStates.mode;
        const selected = this.modellingStates.selected;
        const modellingEvents = this.modellingStates.events;

        switch(mode) {
            case "select":
                switch(event) {
                    case "mouse-down":
                        if(modellingEvents.isMultiSelecting) {

                        } else {
                            if(!selected.arcs.includes(id)) {
                                this.#clearSelection();
                                this.#addArcToSelection(id);
                                this.#refreshSelected();
                            }
                        }

                        break;
                    
                }
            break;
        }
    }

    #startMovement(drawingX, drawingY) {
        this.modellingStates.events.isMoving = true;
        this.context.managers.workspace.setModellingEvent("ismoving", true);
        const moveStart = { x: drawingX, y: drawingY };
        const moveInitialPositions = { components: {}, arcs: {}, annotations: {} };

        this.modellingStates.selected.components.forEach((componentId) => 
            moveInitialPositions.components[componentId] = 
                { ...(this.getComponentById(componentId)?.geometry?.position || { x: 0, y: 0 }) }
            );
        
        this.context.managers.transform.startMovement(moveStart, moveInitialPositions);
    }

    #endMovement() {
        this.modellingStates.events.isMoving = false;
        this.context.managers.workspace.setModellingEvent("ismoving", false);
        this.context.managers.transform.endMovement();
        this.#saveModel();
    }

    /**
     * 
     * @param {number} offsetX 
     * @param {number} offsetY 
     */
    #moveSelectedRelative(offsetX, offsetY) {
        const newPositions = {};

        for(const vertexUID of this.modellingStates.selected.components) {
            const vertex = this.getComponentById(vertexUID);
            if(!vertex) continue;

            newPositions[vertexUID] = {
                x: vertex.geometry.position.x + offsetX,
                y: vertex.geometry.position.y + offsetY
            }
        }

        this.updateComponentsPositions(newPositions);
    }

    #startHighlighting(x, y) {
        this.modellingStates.events.isHighlighting = true;
        this.context.managers.workspace.setModellingEvent("ishighlighting", true);
        this.modellingStates.highlightStart = { x, y };
    }

    #highlightTo(x, y) {
        const x1 = this.modellingStates.highlightStart.x;
        const x2 = x;

        const y1 = this.modellingStates.highlightStart.y;
        const y2 = y;
        
        this.context.managers.drawing.highlightOver(
            Math.min(x1, x2), Math.min(y1, y2),
            Math.max(x1, x2), Math.max(y1, y2)
        );
    }
    
    #stopHighlighting(x, y) {
        const { x: sx, y: sy } = this.modellingStates.highlightStart;

        this.modellingStates.events.isHighlighting = false;
        this.context.managers.workspace.setModellingEvent("ishighlighting", false);
        this.modellingStates.highlightStart = null;
        this.context.managers.drawing.hideHighlight();

        const startX = Math.min(sx, x);
        const startY = Math.min(sy, y);
        const endX = Math.max(sx, x);
        const endY = Math.max(sy, y);

        this.#clearSelection();

        // Select all elements that are within (completely inside) highlighted area
        const components = this.context.managers.visualModel.getAllComponents();
        for(const component of components) {
            const { x, y } = component.geometry.position;
            const csx = x - component.geometry.size / 2;
            const csy = y - component.geometry.size / 2;
            const cex = csx + component.geometry.size;
            const cey = csy + component.geometry.size;

            if(csx >= startX && cex <= endX &&
                csy >= startY && cey <= endY) this.#addComponentToSelection(component.uid);
            
        }

        const arcs = this.context.managers.visualModel.getAllArcs();
        for(const arc of arcs) {
            const { 
                start: { x: asx, y: asy }, 
                end: { x: aex, y: aey } } = this.context.managers.drawing.getArcBounds(arc.uid);

                if(asx >= startX && aex <= endX &&
                    asy >= startY && aey <= endY) this.#addArcToSelection(arc.uid);
        }

        this.#refreshSelected();
    }

    #clearSelection() {
        const drawingViewManager = this.context.managers.drawing;

        // Deselect all components
        this.modellingStates.selected.components.forEach(id => drawingViewManager.setIsComponentSelected(id, false));
        this.modellingStates.selected.components = [];
        
        // Deselect all arcs
        this.modellingStates.selected.arcs.forEach(id => drawingViewManager.setIsArcSelected(id, false));
        this.modellingStates.selected.arcs = [];

        this.modellingStates.selected.annotations = [];
    }

    #addComponentToSelection(id) {
        this.context.managers.drawing.setIsComponentSelected(id, true);
        this.modellingStates.selected.components.push(id);
    }
    
    #addArcToSelection(id) {
        this.context.managers.drawing.setIsArcSelected(id, true);
        this.modellingStates.selected.arcs.push(id);
    }

    #refreshSelected() {
        this.context.managers.panels.properties.refreshSelected();
        this.context.managers.panels.components.refreshSelected();
    }

    /**
     * @param {"boundary" | "entity" | "controller"} type
     * @param {{ identifier: string, label: string, isRBSCenter: boolean }} props 
     * @param {ComponentGeometry} geometry 
     * @param {ComponentStyles} styles 
     * @returns {VisualComponent}
     */
    addComponent(type, props = {}, geometry, styles) {
        const visualComponent = this.context.managers.visualModel.addComponent(type, props, geometry, styles);
        this.#displayNewComponent(visualComponent);

        this.#notifyModelStructureChangesListeners();
        this.#saveModel();

        return visualComponent;
    }

    /**
     * 
     * @param {VisualComponent} visualComponent 
     */
    #displayNewComponent(visualComponent) {
        const componentElement = this.context.managers.drawing.addVertex(visualComponent);
        this.context.managers.userEvents.registerComponent(visualComponent.uid, componentElement);

        if(visualComponent.isRBSCenter) {
            const rbsBounds = this.context.managers.rbsBounds.onComponentSetAsRBSCenter(visualComponent.uid);
            this.context.managers.drawing.addRBS(visualComponent, rbsBounds);
        }
    }


    /**
     * @param {number} id 
     * @param {{ type?, identifier?, label?, isRBSCenter? }} props 
     */
    updateComponentProps(id, props) {
        const drawingManager = this.context.managers.drawing;
        const component = this.context.managers.visualModel.updateComponentProps(id, props);
        drawingManager.updateComponentProps(component);

        if('type' in props) {
            drawingManager.updateComponentType(id, component);
            this.#notifyModelStructureChangesListeners();
            this.#refreshSelected();
        }

        if('isRBSCenter' in props) {
            if(component.isRBSCenter) {
                const rbsBounds = this.context.managers.rbsBounds.onComponentSetAsRBSCenter(id);
                drawingManager.addRBS(component, rbsBounds);
            } else {
                drawingManager.removeRBS(id);
            }

            this.#notifyModelStructureChangesListeners();
        }

        if('identifier' in props) {
            
            if(component.isRBSCenter) {
                drawingManager.updateRBSCenterIdentifier(id, component.identifier);
                this.#notifyModelStructureChangesListeners();
            } else {
                this.context.managers.panels.components.refreshVertexAndIncidentArcs(component);
            }
        }

        this.#saveModel();
    }

    /**
     * 
     * @param {{ [id: number]: { x, y } }} newPositions 
     */
    updateComponentsPositions(newPositions) {
        for(const componentUID in newPositions) {
            const { x, y } = newPositions[componentUID];
            this.#updateComponentPosition(Number(componentUID), x, y);
        }
        

        const movedComponentsUIDs = Object.keys(newPositions).map(n => Number(n));
        const rbsBounds = this.context.managers.rbsBounds.onComponentsTransformed(movedComponentsUIDs);
        this.context.managers.drawing.updateMultipleRBSBounds(rbsBounds);
    }

    #updateComponentPosition(id, x, y) {
        const originalGeometry = this.getComponentById(id).geometry;
        if(x === null || x === undefined) x = originalGeometry.position.x;
        if(y === null || y === undefined) y = originalGeometry.position.y;

        const geometry = this.context.managers.visualModel.updateComponentPosition(id, x, y);
        this.context.managers.drawing.updateComponentGeometry(id, geometry);

        // Update geometry of incident arcs
        this.#updateIncidentArcGeometries(id);

        // Update properties panel values, if selected
        this.context.managers.panels.properties.refreshOneComponentValues(this.getComponentById(id));
    }

    #updateIncidentArcGeometries(vertexUID) {
        const incidentArcs = this.context.managers.visualModel.getArcsIncidentToComponent(vertexUID);
        for(const arc of incidentArcs) {
            const vertex1Geometry = this.getComponentById(arc.fromVertexUID).geometry;
            const vertex2Geometry = this.getComponentById(arc.toVertexUID).geometry;
            this.context.managers.drawing.updateArcGeometry(arc, vertex1Geometry, vertex2Geometry);
        }
    }

    /**
     * @param {} component1
     * @param {{ C, L }} props 
     * @param {ArcGeometry} geometry 
     * @param {ArcStyles} styles 
     * @returns {VisualArc}
     */
    addArc(fromVertexUID, toVertexUID, props, geometry, styles, thenSelect = false) {
        const visualArc = this.context.managers.visualModel.addArc(fromVertexUID, toVertexUID, props, geometry, styles);
        this.#displayNewArc(visualArc);

        // Update arc geometries of all coinciding arcs
        this.#updateIncidentArcGeometries(fromVertexUID);

        if(thenSelect) {
            this.#clearSelection();
            this.#addArcToSelection(visualArc.uid);
            this.#refreshSelected();
        }

        this.#notifyModelStructureChangesListeners();
        this.#saveModel();

        return visualArc;
    }

    /**
     * @param {VisualArc} visualArc 
     */
    #displayNewArc(visualArc) {
        const component1 = this.getComponentById(visualArc.fromVertexUID);
        const component2 = this.getComponentById(visualArc.toVertexUID);

        const arcElement = this.context.managers.drawing.addArc(visualArc, component1.geometry, component2.geometry);
        this.context.managers.userEvents.registerArc(visualArc.uid, arcElement);

        // Check changes to any RBS bounds
        const rbsBounds = this.context.managers.rbsBounds.onArcsChanged([visualArc.uid]);
        this.context.managers.drawing.updateMultipleRBSBounds(rbsBounds);
    }

    /**
     * @param {number} id 
     * @param {{ C?, L? }} props 
     */
    updateArcProps(id, props) {
        const arc = this.context.managers.visualModel.updateArcProps(id, props);
        this.context.managers.drawing.updateArcProps(arc);
        
        if('C' in props) {
            this.context.managers.visualModel.resetRBSCache(arc.fromVertexUID);
            const rbsBounds = this.context.managers.rbsBounds.onArcsChanged([id]);
            this.context.managers.drawing.updateMultipleRBSBounds(rbsBounds);   
        }

        this.context.managers.panels.components.refreshArc(arc);

        this.#saveModel();
    }

    startDragAndDrop(componentType) {
        this.modellingStates.events.isDragging = true;
        this.context.managers.workspace.setModellingEvent("isdragging", true);
        this.#showDraggingComponent(componentType, { x: -100, y: -100 });
    }

    /**
     * @param {"boundary" | "entity" | "controller"} componentType 
     * @param {{ x: number, y: number }} position 
     */
    #showDraggingComponent(componentType, position) {
        this.context.managers.drawing.showDraggingComponent(componentType, position);
    }

    endDragAndDrop() {
        this.modellingStates.events.isDragging = false;
        this.context.managers.workspace.setModellingEvent("isdragging", false);
        this.context.managers.drawing.destroyDraggingComponent();
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    moveDraggingComponent(x, y) {
        this.context.managers.drawing.moveDraggingComponent(x, y);
    }



    /**
     * @param {number} x 
     * @param {number} y 
     */
    #stopDragging(x, y) {
        this.modellingStates.events.isDragging = false;
        this.context.managers.workspace.setModellingEvent("isdragging", false);
        this.context.managers.dragAndDrop.drop(x, y);
    }

    #startArcTracing(componentUID) {
        this.#clearSelection();
        this.modellingStates.events.isArcTracing = true;
        this.context.managers.workspace.setModellingEvent("isarctracing", true);
        this.context.managers.arcTracing.startTracing(componentUID);
    }

    /**
     * @param {number} fromVertexUID 
     * @param {{ x: number, y: number }} toPoint 
     */
    traceArcToPoint(fromVertexUID, toPoint) {
        const startVertex = this.getComponentById(fromVertexUID);
        this.context.managers.drawing.traceArcToPoint(startVertex.geometry, toPoint);
    }

    /**
     * @param {number} fromVertexUID 
     * @param {number} toVertexUID 
     */
    traceArcToVertex(fromVertexUID, toVertexUID) {
        const startVertex = this.getComponentById(fromVertexUID);
        const endVertex = this.getComponentById(toVertexUID);
        this.context.managers.drawing.traceArcToVertex(startVertex, endVertex);
    }

    #endArcTracing() {
        this.modellingStates.events.isArcTracing = false;
        this.context.managers.workspace.setModellingEvent("isarctracing", false);
        this.context.managers.arcTracing.endTracing();
        this.context.managers.drawing.endTracing();
    }

    selectSingleComponent(id) {
        this.#clearSelection();
        this.#addComponentToSelection(id);
        this.#refreshSelected();
    }

    selectSingleArc(id) {
        this.#clearSelection();
        this.#addArcToSelection(id);
        this.#refreshSelected();
    }

    selectAll() {
        this.#clearSelection();

        const allVertices = this.context.managers.visualModel.getAllComponents();
        const allArcs = this.context.managers.visualModel.getAllArcs();
        
        allVertices.forEach(v => this.#addComponentToSelection(v.uid));
        allArcs.forEach(a => this.#addArcToSelection(a.uid));

        this.#refreshSelected();
    }

    getRBSComponents(centerUID) {
        return this.context.managers.visualModel.getRBSComponents(centerUID);
    }

    removeSelectedComponents(thenUpdate = true) {
        const removedComponents = [];
        for(const componentUID of this.modellingStates.selected.components) {
            const { removedComponent, removedArcs } = this.context.managers.visualModel.removeComponent(componentUID);
            if(removedComponent) {
                this.context.managers.drawing.removeComponent(removedComponent.uid);
                removedComponents.push(removedComponent);
            }

            removedArcs.forEach(arc => this.context.managers.drawing.removeArc(arc.uid));
        }

        
        const { removedRBS, affectedRBS } = this.context.managers.rbsBounds.onComponentsRemoved(removedComponents.map(c => c.uid));
        removedRBS.forEach(centerUID => this.context.managers.drawing.removeRBS(centerUID));
        this.context.managers.drawing.updateMultipleRBSBounds(affectedRBS);

        if(thenUpdate) {
            this.#clearSelection();
            this.#refreshSelected();
            this.#notifyModelStructureChangesListeners();
            this.#saveModel();
        }
    }

    removedSelectedArcs(thenUpdate = true) {
        const removedArcs = [];

        const affectedVertices = new Set();
        for(const arcUID of this.modellingStates.selected.arcs) {
            const removedArc = this.context.managers.visualModel.removeArc(arcUID);
            if(!removedArc) continue;

            this.context.managers.drawing.removeArc(removedArc.uid);
            affectedVertices.add(removedArc.fromVertexUID);

            removedArcs.push(removedArc);
        }

        // Update geometries of coinciding arcs by each removed arc
        for(const vertexUID of affectedVertices) {
            this.#updateIncidentArcGeometries(vertexUID);
        }

        const rbsBounds = this.context.managers.rbsBounds.onArcsDeleted(removedArcs);
        this.context.managers.drawing.updateMultipleRBSBounds(rbsBounds);
        
        if(thenUpdate) {
            this.#clearSelection();
            this.#refreshSelected();
            this.#notifyModelStructureChangesListeners();
            this.#saveModel();
        }
    }

    #notifyModelStructureChangesListeners() {
        // Update dependent listeners
        this.context.managers.panels.components.refreshComponentsList();
        this.context.managers.panels.execute.refreshModelValues();
        this.context.managers.panels.verifications.refreshModelValues();

        this.#validateModelStructure();
    }

    #validateModelStructure() {
        const drawingManager = this.context.managers.drawing;
        drawingManager.clearHighlights();

        const arcs = this.context.managers.visualModel.getAllArcs();
        const vertices = this.context.managers.visualModel.getAllComponents();

        let modelIsValid = true;

        for(const arc of arcs) {
            const { valid, error } = this.validateArc(arc);
            if(!valid) {
                drawingManager.highlightArc(arc.uid);
                modelIsValid = false;
            }
        }

        for(const vertex of vertices) {
            const { valid, error } = this.validateVertex(vertex);
            if(!valid) {
                drawingManager.highlightVertex(vertex.uid);
                modelIsValid = false;
            }
        }

        this.context.managers.workspace.setModelIsValid(modelIsValid);
    }

    /**
     * @param {VisualArc} arcUID 
     * @returns {{ valid: boolean, error: { title: string, description: string } }}
     */
    validateArc(arc) {
        if(!arc) return { valid: false, error: { title: "Arc not found" } };

        const from = this.getComponentById(arc.fromVertexUID);
        const to = this.getComponentById(arc.toVertexUID);

        // Check if arc connects two objects
        if(isVertexAnObject(from) && isVertexAnObject(to)) {
            return { valid: false, error: { 
                title: "Invalid arc", 
                description: "An arc between objects (i.e. boundary/entity) is not allowed."
            } };
        }

        return { valid: true };
    }

    /**
     * @param {VisualComponent} vertex 
     * @returns {{ valid: boolean, error: { title: string, description: string } }}
     */
    validateVertex(vertex) {
        // Check if vertex is RBS center but not an object
        if(vertex.isRBSCenter && !isVertexAnObject(vertex)) {
            return { valid: false, error: { 
                title: "Invalid RBS Center",
                description: "A controller cannot be the center of an RBS"
            } };
        }

        return { valid: true };
    }

    #cutSelected() {
        this.#copySelected();
        this.removeSelectedComponents(false);
        this.removedSelectedArcs();
    }

    #copySelected() {
        const objects = { vertices: [], arcs: [] };
        for(const vertexUID of this.modellingStates.selected.components) {
            objects.vertices.push(this.getComponentById(vertexUID).copy());
        }

        for(const arcUID of this.modellingStates.selected.arcs) {
            objects.arcs.push(this.getArcById(arcUID).copy());
        }


        if(objects.vertices.length === 0 && objects.arcs.length === 0) return;

        ClipboardManager.copy(objects);
    }

    #pasteFromClipboard() {
        const { vertices, arcs } = ClipboardManager.get();

        const copyOffset = { x: 20, y: 20 };
        const copiedVertexUID = {};

        
        this.#clearSelection();

        for(const { uid, type, identifier, label, isRBSCenter, geometry, styles } of vertices) {
            const copiedGeometry = geometry.copy();
            copiedGeometry.position.x += copyOffset.x;
            copiedGeometry.position.y += copyOffset.y;

            const copiedStyles = styles.copy();

            const newComponent = this.addComponent(
                type, { identifier, label, isRBSCenter },
                copiedGeometry, copiedStyles
            );

            copiedVertexUID[uid] = newComponent.uid;
            this.#addComponentToSelection(newComponent.uid);
        }

        for(const { C, L, fromVertexUID, toVertexUID, geometry, styles } of arcs) {
            const copiedGeometry = geometry.copy();
            for(const waypoint of copiedGeometry.waypoints) {
                waypoint.x += copyOffset.x;
                waypoint.y += copyOffset.y;
            }

            const copiedStyles = styles.copy();

            const newArc = this.addArc(
                copiedVertexUID[fromVertexUID] || fromVertexUID, 
                copiedVertexUID[toVertexUID] || toVertexUID, 
                { C, L },
                copiedGeometry, copiedStyles
            );
            
            this.#addArcToSelection(newArc.uid);
        }

        this.#refreshSelected();

    }

    #saveModel() {
        LocalSessionManager.saveModel(this.context);
    }
}