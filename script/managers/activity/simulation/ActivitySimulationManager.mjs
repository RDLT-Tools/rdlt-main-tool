import Activity from "../../../entities/activity/Activity.mjs";
import VisualArc from "../../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../../entities/model/visual/VisualComponent.mjs";
import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID } from "../../../utils.mjs";
import { BaseModelDrawingManager } from "../../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import { ASSubworkspaceManager } from "./ASSubworkspaceManager.mjs";
import { ASDetailsPanelManager } from "./panels/ASDetailsPanelManager.mjs";
import { ASProfilePanelManager } from "./panels/ASProfilePanelManager.mjs";
import { ASTORPanelManager } from "./panels/ASTORPanelManager.mjs";

export class ActivitySimulationManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** 
     * @type {Activity} 
    */
    #activity;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {BaseModelDrawingManager} */
    #drawingManager;

    /** @type {ASSubworkspaceManager} */
    #subworkspaceManager;

    /** 
     * @type {{
     *      details: ASDetailsPanelManager,
     *      profile: ASProfilePanelManager,
     *      tor: ASTORPanelManager
     * }} 
     * */
    #panels;


    /** 
     * @type {{
     *  currentTimestep: number,
     *  maxTimestep: number
     * }} 
    * */
    #states = {
        currentTimestep: 1,
        maxTimestep: 0
    };



    /**
     * @param {ModelContext} context
     * @param {Activity} activity 
     * @param {VisualRDLTModel} visualModelSnapshot 
     */
    constructor(context, activity, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.#activity = activity;
        this.#modelSnapshot = visualModelSnapshot;

        this.#states.maxTimestep = Math.max(...Object.keys(this.#activity.profile).map(t => Number(t)));

        this.#initialize();
    }

    async #initialize() {
        const subworkspaceTabManager = await this.context.managers.workspace.addASSubworkspace(this.id);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        this.#drawingManager = new BaseModelDrawingManager(rootElement.querySelector(".drawing > svg"), "aes");
        this.#subworkspaceManager = new ASSubworkspaceManager(this, rootElement);

        this.#panels = {
            details: new ASDetailsPanelManager(this, rootElement.querySelector(".panel[data-panel-id='details']")),
            profile: new ASProfilePanelManager(this, rootElement.querySelector(".panel[data-panel-id='profile']")),
            tor: new ASTORPanelManager(this, rootElement.querySelector(".panel[data-panel-id='tor']")),
        };

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(), 
            this.#modelSnapshot.getAllArcs());

        this.#panels.details.displayActivityDetails(this.#activity);

        this.#panels.profile.displayProfileList(this.#activity.profile);
        this.#panels.tor.displayTOR(this.#activity.tor);
        this.setCurrentTimestep(1);
    }
    
    pause() {
        console.log("Pause");
    }

    next() {
        if(this.#states.currentTimestep < this.#states.maxTimestep) {
            this.setCurrentTimestep(this.#states.currentTimestep+1);
        }
    }

    prev() {
        if(this.#states.currentTimestep > 1) {
            this.setCurrentTimestep(this.#states.currentTimestep-1);
            return;
        }
    }

    setCurrentTimestep(timestep) {
        this.#states.currentTimestep = timestep;
        this.#panels.profile.setActiveTimestep(timestep);

        // Update visualization
        this.#drawingManager.clearHighlights();
        
        
        // Highlight current arcs
        const traversedArcUIDs = this.#activity.profile[timestep] || new Set();
        for(const arcUID of traversedArcUIDs) {
            this.#drawingManager.highlightArc(arcUID);
        }
    }

    /** @returns {string} */
    getVertexIdentifier(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID).identifier;
    }

    /** @returns {VisualComponent} */
    getVertex(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID);
    }

    /** @returns {VisualArc} */
    getArc(arcUID) {
        return this.#modelSnapshot.getArc(arcUID);
    }

    /** @returns {[string, string]} */
    getArcIdentifierPair(arcUID) {
        const arc = this.#modelSnapshot.getArc(arcUID);
        if(!arc) return [ "", "" ];

        const vertexFrom = this.#modelSnapshot.getComponent(arc.fromVertexUID);
        const vertexTo = this.#modelSnapshot.getComponent(arc.toVertexUID);

        return [
            vertexFrom?.identifier || "",
            vertexTo?.identifier || "" ];
    }

}