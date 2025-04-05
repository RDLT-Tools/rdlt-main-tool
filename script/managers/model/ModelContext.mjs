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

export default class ModelContext {
    /**
     * @typedef {{ palette: PalettePanelManager, properties: PropertiesPanelManager, execute: ExecutePanelManager }} PanelManagersGroup 
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


    constructor() {
        this.#initialize();
    }

    #initialize() {
        this.#setupManagers();
    }

    #setupManagers() {
        // Setup workspace manager and its views
        const workspaceManager = new WorkspaceManager(this);


        this.managers = {
            model: new ModelManager(this),
            visualModel: new VisualModelManager(this),
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
                execute: new ExecutePanelManager(this, workspaceManager.getPanelRootElement("execute"))
            },
        };
    }
}