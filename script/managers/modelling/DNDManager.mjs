import ComponentGeometry from "../../entities/geometry/ComponentGeometry.mjs";
import ModelContext from "../model/ModelContext.mjs";

export default class DragAndDropManager {
    /** @type { ModelContext } */
    context;


    /**
     * @type {{
     *      isDragging: boolean,
     *      elementID: "component" | null,
     *      componentType: "controller" | "entity" | "boundary" | "null" 
     * }}
     */
    #states = {
        isDragging: false
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    handleComponentDND(componentType) {
        this.#states.isDragging = true;
        this.#states.elementID = "component";
        this.#states.componentType = componentType;
        
        this.context.managers.modelling.startDragAndDrop(componentType);
    }

    moveTo(x, y) {
        this.context.managers.modelling.moveDraggingComponent(x, y);
    }

    drop(x, y) {
        if(!this.#states.isDragging) return;

        const componentType = this.#states.componentType;

        this.#states.isDragging = false;
        this.#states.elementID = null;
        this.#states.componentType = null;

        this.context.managers.modelling.endDragAndDrop();

        if(x >= 0 && y >= 0) {
            this.context.managers.modelling.addComponent(
                componentType, { identifier: this.context.managers.modelling.generateNextComponentIdentifier() }, 
                new ComponentGeometry({ position: { x, y } })
            );
        }
    }
}