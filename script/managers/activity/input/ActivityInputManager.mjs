import Activity from "../../../entities/activity/Activity.mjs";
import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID } from "../../../utils.mjs";
import { BaseModelDrawingManager } from "../../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import { TabManager } from "../../workspace/TabManager.mjs";
import { AIDrawingManager } from "./AIDrawingManager.mjs";
import { AISubworkspaceManager } from "./AISubworkspaceManager.mjs";
import { AIDetailsPanelManager } from "./panels/AIDetailsPanelManager.mjs";
import { AIProfilePanelManager } from "./panels/AIProfilePanelManager.mjs";

export class ActivityInputManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {AIDrawingManager} */
    #drawingManager;

    /** @type {AISubworkspaceManager} */
    #subworkspaceManager;

    /** @type {TabManager} */
    #subworkspaceTabManager;

    /** 
     * @type {{
     *      details: AIDetailsPanelManager,
     *      profile: AIProfilePanelManager,
     * }} 
     * */
    #panels;


    /** 
     * @type {{
     *  currentTimestep: number,
     * }} 
    * */
    #states = {
        currentTimestep: 1,
    };

    /** @type {Set<number>[]} */
    #activityProfile = [ new Set() ];



    /**
     * @param {ModelContext} context
     * @param {VisualRDLTModel} visualModelSnapshot 
     */
    constructor(context, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.#modelSnapshot = visualModelSnapshot;

        this.#initialize();
    }

    async #initialize() {
        this.#subworkspaceTabManager = await this.context.managers.workspace.addAISubworkspace(this.id);
        const rootElement = this.#subworkspaceTabManager.tabAreaElement;
        this.#drawingManager = new AIDrawingManager(this, rootElement.querySelector(".drawing > svg"));
        this.#subworkspaceManager = new AISubworkspaceManager(this, rootElement);

        this.#panels = {
            details: new AIDetailsPanelManager(this, rootElement.querySelector(".panel[data-panel-id='details']")),
            profile: new AIProfilePanelManager(this, rootElement.querySelector(".panel[data-panel-id='profile']")),
        };

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(), 
            this.#modelSnapshot.getAllArcs());

        this.#panels.details.setup(this.#modelSnapshot.getPotentialSourceVertices(), this.#modelSnapshot.getPotentialSinkVertices());
        this.#panels.profile.refreshProfileList(this.#activityProfile);
        this.setCurrentTimestep(1);
    }
    
    pause() {
        console.log("Pause");
    }

    next() {
        if(this.#states.currentTimestep < this.#activityProfile.length) {
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

        this.#drawingManager.setSelectedArcs(this.#getCurrentReachabilityConfig());
    }

    addTimestep() {
        this.#activityProfile.push(new Set());
        this.#panels.profile.refreshProfileList(this.#activityProfile);
        this.setCurrentTimestep(this.#activityProfile.length);
        this.#refreshActivityProfile();
    }

    toggleArc(arcUID) {
        const currentReachabilityConfig = this.#getCurrentReachabilityConfig();
        if(currentReachabilityConfig.has(arcUID)) {
            currentReachabilityConfig.delete(arcUID);
        } else {
           currentReachabilityConfig.add(arcUID); 
        }

        this.#refreshCurrentReachabilityConfig();
    }

    #refreshActivityProfile() {
        this.#panels.profile.refreshProfileList(this.#activityProfile);
    }
    
    #refreshCurrentReachabilityConfig() {
        const currentTimestep = this.#states.currentTimestep;
        const currentReachabilityConfig = this.#getCurrentReachabilityConfig();
        this.#drawingManager.setSelectedArcs(currentReachabilityConfig);
        this.#panels.profile.refreshTimestepProfile(currentTimestep, currentReachabilityConfig);
    }

    #getCurrentReachabilityConfig() {
        return this.#activityProfile[this.#states.currentTimestep-1];
    }

    saveActivity() {
        const { name, source, sink } = this.#panels.details.getFormValues();

        const activityProfile = {};
        for(let i = 0; i < this.#activityProfile.length; i++) {
            activityProfile[i+1] = this.#activityProfile[i];
        }

        const activity = new Activity({
            name: name?.trim() || "<Untitled Activity>", 
            source: Number(source), sink: Number(sink),
            origin: "direct",
            conclusion: {
                pass: true,
                title: "Activity was created through direct input",
                description: "Unable to verify whether reachability configurations are valid"
            },
            profile: activityProfile
        });

        this.context.managers.activities.addActivity(activity);
        this.context.managers.workspace.gotoMainModel();
        this.context.managers.workspace.showPanel("execute");
        this.#subworkspaceTabManager.close();
    }

    /** @returns {string} */
    getVertexIdentifier(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID).identifier;
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

    getComponent(uid) {
        return this.context.managers.visualModel.getComponent(uid);
    }
}