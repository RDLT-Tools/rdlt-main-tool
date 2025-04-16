import ModelManager from "./ModelManager.mjs";
import VisualModelManager from "./VisualModelManager.mjs";
import DragAndDropManager from "../modelling/DNDManager.mjs";
import DrawingViewManager from "../modelling/DrawingViewManager.mjs";
import ModellingManager from "../modelling/ModellingManager.mjs";
import ArcTracingManager from "../modelling/ArcTracingManager.mjs";
import RBSBoundsManager from "../modelling/RBSBoundsManager.mjs";
import PalettePanelManager from "../panels/PalettePanelManager.mjs";
import PropertiesPanelManager from "../panels/PropertiesPanelManager.mjs";
import TransformManager from "../modelling/TransformManager.mjs";
import UserEventsManager from "../modelling/events/UserEventsManager.mjs";
import WorkspaceManager from "../modelling/WorkspaceManager.mjs";
import ExportManager from "../file/export/ExportManager.mjs";
import ExecutePanelManager from "../panels/ExecutePanelManager.mjs";
import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import VerificationsPanelManager from "../panels/VerificationsPanelManager.mjs";
import { ActivitiesManager } from "../activity/ActivitiesManager.mjs";

export default class ModelContext {
    
    /** @type {string} */
    #id;
    
    /**
     * @typedef {{ 
     *      palette: PalettePanelManager, 
     *      properties: PropertiesPanelManager, 
     *      execute: ExecutePanelManager,
     *      verifications: VerificationsPanelManager
     * }} PanelManagersGroup 
     * 
     * @type {{ 
     *  model: ModelManager,
     *  visualModel: VisualModelManager,
     *  modelling: ModellingManager, 
     *  drawing: DrawingViewManager,
     *  arcTracing: ArcTracingManager,
     *  rbsBounds: RBSBoundsManager,
     *  dragAndDrop: DragAndDropManager,
     *  userEvents: UserEventsManager,
     *  transform: TransformManager,
     *  workspace: WorkspaceManager,
     *  export: ExportManager,
     *  activities: ActivitiesManager,
     *  panels: PanelManagersGroup,
     * }}
    */
    managers = {};


    constructor(id, visualModel) {
        this.#id = id || this.#generateID();
        this.#initialize(visualModel);
    }

    get id() { return this.#id; }

    #generateID() {
        const timestamp = Date.now();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let randomChars = "";
        for (let i = 0; i < 5; i++) {
            randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return `${timestamp}${randomChars}`;
    }

    #initialize(visualModel) {
        this.#setupManagers(visualModel);
    }

    /**
     * 
     * @param {VisualRDLTModel} visualModel 
     */
    #setupManagers(visualModel) {
        // Setup workspace manager and its views
        

        this.managers.visualModel = new VisualModelManager(this, visualModel);
        this.managers.model = new ModelManager(this);
        this.managers.modelling = new ModellingManager(this); 
        
        this.managers.arcTracing = new ArcTracingManager(this);
        this.managers.rbsBounds = new RBSBoundsManager(this);
        this.managers.dragAndDrop = new DragAndDropManager(this);
        
        this.managers.transform = new TransformManager(this);
        this.managers.export = new ExportManager(this);
        this.managers.activities = new ActivitiesManager(this);

        const workspaceManager = new WorkspaceManager(this);
        this.managers.workspace = workspaceManager;
        this.managers.userEvents = new UserEventsManager(this,
            { drawingSVG: workspaceManager.getDrawingSVG() });
        this.managers.drawing = new DrawingViewManager(this,
            { drawingSVG: workspaceManager.getDrawingSVG() });
        this.managers.panels = {
            palette: new PalettePanelManager(this, workspaceManager.getPanelRootElement("palette")),
            properties: new PropertiesPanelManager(this, workspaceManager.getPanelRootElement("properties")),
            execute: new ExecutePanelManager(this, workspaceManager.getPanelRootElement("execute")),
            verifications: new VerificationsPanelManager(this, workspaceManager.getPanelRootElement("verifications"))
        };

        this.managers.modelling.loadModel();
    }

    
    getModelName() {
        return this.managers.visualModel.getModelName();
    }

    onContextOpened() {
        this.managers.drawing.viewport.refresh();
    }

    static fromJSON(json) {
        return new ModelContext(json.id, VisualRDLTModel.fromJSON(json.model));
    }
}