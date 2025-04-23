import ModelContext from "../model/ModelContext.mjs";
import { Form } from "../../utils.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";

export default class PropertiesPanelManager {
    /** @type { ModelContext } */
    context;

    /** @type {HTMLDivElement} */
    #rootElement;

    /** @type {{ component: Form }} */
    #forms = {
        component: null
    };

    #views = {
        statusChips: {
            arc: null,
            component: null
        },
        arcVertices: {
            to: { identifier: null, type: null, image: null, button: null },
            from: { identifier: null, type: null, image: null, button: null },
        },
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context, rootElement) {
        this.context = context;
        this.#rootElement = rootElement;
        
        this.#initializeViews();
        this.#initializeForms();
    }

    #initializeViews() {
        const arcVerticesFrom = this.#rootElement.querySelector(".arcvertices-from");
        const arcVerticesTo = this.#rootElement.querySelector(".arcvertices-to");
        this.#views.arcVertices = {
            from: {
                identifier: arcVerticesFrom.querySelector(".vertex-identifier"),
                type: arcVerticesFrom.querySelector(".vertex-type"),
                image: arcVerticesFrom.querySelector("img"),
                button: arcVerticesFrom.querySelector("button")
            },
            to: {
                identifier: arcVerticesTo.querySelector(".vertex-identifier"),
                type: arcVerticesTo.querySelector(".vertex-type"),
                image: arcVerticesTo.querySelector("img"),
                button: arcVerticesTo.querySelector("button")
            },
        };
        
        this.#views.statusChips.arc = this.#rootElement.querySelector(`[data-viewonly="arc"] .status-chip`);
        this.#views.statusChips.component = this.#rootElement.querySelector(`[data-viewonly="component"] .status-chip`);
    }

    #initializeForms() {
        this.#forms.component = 
            new Form(this.#rootElement.querySelector("[data-viewonly='component']"))
            .setFieldNames([ 'type', 'identifier', 'label', 'isRBSCenter', 'x', 'y' ])
            .setOnChangeListener((fieldName, value) => this.#updateOneComponentProperty(fieldName, value));
        
        this.#forms.arc = 
            new Form(this.#rootElement.querySelector("[data-viewonly='arc']"))
            .setFieldNames([ 'C', 'L', 'pathType', 'isAutoDraw' ])
            .setOnChangeListener((fieldName, value) => this.#updateOneArcProperty(fieldName, value));
    }

    #updateOneComponentProperty(fieldName, value) {
        const modellingManager = this.context.managers.modelling;
        const selectedComponents = modellingManager.modellingStates.selected.components;
        if(selectedComponents.length !== 1) return;

        const componentUID = selectedComponents[0];

        if([ 'type', 'identifier', 'label', 'isRBSCenter' ].includes(fieldName)) {
            modellingManager.updateComponentProps(componentUID, { [fieldName]: value });
        } else if([ 'x', 'y' ].includes(fieldName)) {
            modellingManager.updateComponentsPositions({
                [componentUID]: {
                    x: fieldName === 'x' ? Number(value) : null,
                    y: fieldName === 'y' ? Number(value) : null
                }
            });
        }
    }

    #updateOneArcProperty(fieldName, value) {
        const modellingManager = this.context.managers.modelling;
        const selectedArcs = modellingManager.modellingStates.selected.arcs;
        if(selectedArcs.length !== 1) return;

        const arcUID = selectedArcs[0];

        if([ 'C', 'L' ].includes(fieldName)) {
            modellingManager.updateArcProps(arcUID, { [fieldName]: fieldName === 'L' ? Number(value) || 1 : value });
        }
    }

    refreshSelected() {
        const modellingManager = this.context.managers.modelling;
        const selected = modellingManager.modellingStates.selected;

        const noComp = selected.components.length === 0;
        const oneComp = selected.components.length === 1;
        const manyComps = selected.components.length > 1;

        const noArc = selected.arcs.length === 0;
        const oneArc = selected.arcs.length === 1;
        const manyArcs = selected.arcs.length > 1;

        this.#setNoneSelected(noComp && noArc);
        this.#setIsOneComponentSelected(oneComp, selected.components[0]);
        this.#setIsOneArcSelected(oneArc, selected.arcs[0]);

        if(!(noComp && noArc)) this.context.managers.workspace.tabs.right.selectTab("properties");

    }

    /**
     * @param {VisualComponent} component 
     */
    refreshOneComponentValues(component) {
        const modellingManager = this.context.managers.modelling;
        const selectedComponents = modellingManager.modellingStates.selected.components;
        if(selectedComponents.length !== 1 || selectedComponents[0] !== component.uid) return;

        this.#forms.component.setValues({
            type: component.type,
            identifier: component.identifier,
            label: component.label,
            isRBSCenter: component.isRBSCenter,
            x: component.geometry.position.x,
            y: component.geometry.position.y,
        });

        const { valid, error } = modellingManager.validateVertex(component);
        if(valid) this.#hideStatusChip("component");
        else this.#displayStatusChip("component", error.title, error.description);
    }

    /**
     * @param {VisualArc} arc 
     */
    refreshOneArcValues(arc) {
        const modellingManager = this.context.managers.modelling;
        const selectedArcs = modellingManager.modellingStates.selected.arcs;
        if(selectedArcs.length !== 1 || selectedArcs[0] !== arc.uid) return;

        this.#forms.arc.setValues({
            C: arc.C,
            L: arc.L,
            pathType: arc.geometry.pathType,
            isAutoDraw: arc.geometry.isAutoDraw
        });
        
        const { valid, error } = modellingManager.validateArc(arc);
        if(valid) this.#hideStatusChip("arc");
        else this.#displayStatusChip("arc", error.title, error.description);

        // Update vertices view
        const typeLabel = { entity: "Entity", boundary: "Boundary", controller: "Controller" };
        const componentFrom = modellingManager.getComponentById(arc.fromVertexUID);
        const componentTo = modellingManager.getComponentById(arc.toVertexUID);


        const { arcVertices } = this.#views;
        arcVertices.from.identifier.innerHTML = componentFrom.identifier;
        arcVertices.from.type.innerHTML = typeLabel[componentFrom.type];
        arcVertices.from.image.src = `./assets/templates/components/${componentFrom.type}.svg`;
        arcVertices.to.identifier.innerHTML = componentTo.identifier;
        arcVertices.to.type.innerHTML = typeLabel[componentTo.type];
        arcVertices.to.image.src = `./assets/templates/components/${componentTo.type}.svg`;
    }

    #hideStatusChip(variant) {
        this.#views.statusChips[variant].classList.add("hidden");
    }
    
    #displayStatusChip(variant, title, description) {
        const statusChipElement = this.#views.statusChips[variant];
        if(!title) return this.#hideStatusChip(variant);
        
        statusChipElement.querySelector(".status-title").innerText = title;
        statusChipElement.querySelector(".status-description").innerText = description;

        statusChipElement.classList.remove("hidden");
    }

    /**
     * @param {boolean} isSelected 
     * @param {number} [componentUID]
     */
    #setIsOneComponentSelected(isSelected, componentUID) {
        if(isSelected) {
            this.#rootElement.setAttribute("data-view-component", "");
            const component = this.context.managers.modelling.getComponentById(componentUID);
            this.refreshOneComponentValues(component);
        } else {
            this.#rootElement.removeAttribute("data-view-component");
        }
    }

    /**
     * @param {boolean} isSelected 
     * @param {number} [arcUID]
     */
    #setIsOneArcSelected(isSelected, arcUID) {
        if(isSelected) {
            this.#rootElement.setAttribute("data-view-arc", "");
            const arc = this.context.managers.modelling.getArcById(arcUID);
            this.refreshOneArcValues(arc);

            this.#views.arcVertices.from.button.onclick = () => {
                this.context.managers.modelling.selectSingleComponent(arc.fromVertexUID);
            };

            this.#views.arcVertices.to.button.onclick = () => {
                this.context.managers.modelling.selectSingleComponent(arc.toVertexUID);
            };
        } else {
            this.#rootElement.removeAttribute("data-view-arc");
        }
    }

    #setNoneSelected(isSelected) {
        if(isSelected) {
            this.#rootElement.setAttribute("data-view-none", "");
        } else {
            this.#rootElement.removeAttribute("data-view-none");
        }
    }
}