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
     *  export: ExportManager
     *  panels: PanelManagersGroup,
     * }}
    */
    managers;


    constructor(id, modelJSON) {
        this.#id = id || this.#generateID();
        this.#initialize(modelJSON);
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

    #initialize(modelJSON) {
        const visualModel = modelJSON ? VisualRDLTModel.fromJSON(modelJSON) : null;
        console.log(visualModel);

        this.#setupManagers(visualModel);
    }

    /**
     * 
     * @param {VisualRDLTModel} visualModel 
     */
    #setupManagers(visualModel) {
        // Setup workspace manager and its views
        const workspaceManager = new WorkspaceManager(this);


        this.managers = {
            model: new ModelManager(this),
            visualModel: new VisualModelManager(this, visualModel),
            modelling: new ModellingManager(this), 
            drawing: new DrawingViewManager(this, 
                { drawingSVG: workspaceManager.getDrawingSVG() }),
            arcTracing: new ArcTracingManager(this),
            rbsBounds: new RBSBoundsManager(this),
            dragAndDrop: new DragAndDropManager(this),
            userEvents: new UserEventsManager(this,
                { drawingSVG: workspaceManager.getDrawingSVG() }),
            transform: new TransformManager(this),
            workspace: workspaceManager,
            export: new ExportManager(this),
            panels: {
                palette: new PalettePanelManager(this, workspaceManager.getPanelRootElement("palette")),
                properties: new PropertiesPanelManager(this, workspaceManager.getPanelRootElement("properties")),
                execute: new ExecutePanelManager(this, workspaceManager.getPanelRootElement("execute")),
                verifications: new VerificationsPanelManager(this, workspaceManager.getPanelRootElement("verifications"))
            },
        };

        this.managers.modelling.loadModel();
    }

    static fromJSON(json) {
        return new ModelContext(json.id, json.model);
    }
}