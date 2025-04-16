import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import ModelContext from "../model/ModelContext.mjs";

export class ActivitiesManager {
    /** @type {ModelContext} */
    context;
    
    /** 
     * @typedef {number} ArcUID
     * @typedef {number} VertexUID
     * @typedef {{ [timestep: number]: Set<ArcUID> }} ActivityProfile
     * @typedef {"aes" | "direct" | "ae" | "import"} ActivityOrigin
     * @typedef {{ id: string, name: string, origin: ActivityOrigin, source: VertexUID, sink: VertexUID, profile: ActivityProfile }} Activity
     * @type {Activity[]} 
    */
    #activities = [];

    /**
     * 
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * @param {Activity} activity 
     */
    addActivity(activity) {
        this.#activities.push(activity);
        this.#refreshActivitiesList();
    }

    importActivity() {
        console.log("About to import a new activity");
    }

    simulateActivity(activityID) {
        const activity = this.#activities.find(a => a.id === activityID);
        if(!activity) return;

        this.context.managers.workspace.startActivitySimulation(activity);
    }

    deleteActivity(activityID) {
        this.#activities = this.#activities.filter(a => a.id !== activityID);
        this.#refreshActivitiesList();
    }

    #refreshActivitiesList() {
        this.context.managers.panels.execute.refreshActivitiesList(this.#activities);
    }
}