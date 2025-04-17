import Activity from "../../../entities/activity/Activity.mjs";
import { buildArcMap } from "../../../utils.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import { sanitizeForFilename } from "../utils.mjs";
import ActivityFileExportManager from "./ActivityFileExportManager.mjs";
import ImageExportManager from "./ImageExportManager.mjs";
import RDLTFileExportManager from "./RDLTFileExportManager.mjs";

export default class ExportManager {
    /** @type { ModelContext } */
    context;

    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    exportToRDLTFile() {
        const visualModelManager = this.context.managers.visualModel;
        const filename = sanitizeForFilename(visualModelManager.getModelName()) + ".txt";
        return RDLTFileExportManager.exportToRDLTFile(filename, visualModelManager);
    }
    
    exportToPNGImage() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const visualModelManager = this.context.managers.visualModel;
        for(const component of visualModelManager.getAllComponents()) {
            const { position: { x, y }, size } = component.geometry;
            const { outline } = component.styles;
            
            minX = Math.min(minX, x - size/2 - outline.width);
            minY = Math.min(minY, y - size/2 - outline.width);
            maxX = Math.max(maxX, x + size/2 + outline.width);
            maxY = Math.max(maxY, y + size/2 + outline.width);
        }

        for(const arc of visualModelManager.getAllArcs()) {
            const { waypoints } = arc.geometry;
            const { outline } = arc.styles;

            for(const { x, y } of waypoints) {
                minX = Math.min(minX, x - outline.width);
                minY = Math.min(minY, y - outline.width);
                maxX = Math.max(maxX, x + outline.width);
                maxY = Math.max(maxY, y + outline.width);
            }
        }

        const margin = 50;
        minX -= margin;
        minY -= margin;
        maxX += margin;
        maxY += margin;


        const modelName = this.context.managers.visualModel.getModelName() || "Untitled Model";
        const filename = modelName.replace(/[^A-z0-9-_]/g, "") + ".png";
        const svgElement = this.context.managers.workspace.getDrawingSVG();
        return ImageExportManager.exportSVGToImage(filename, svgElement, { minX, minY, maxX, maxY });
    }

    /**
     * @param {Activity} activity 
     */
    exportActivityToTextFile(activity) {
        const modelName = this.context.getModelName();
        const filename = `${sanitizeForFilename(modelName)}_activity-${sanitizeForFilename(activity.name)}.txt`;
        const arcMap = buildArcMap(this.context.managers.visualModel.getAllArcs());
        return ActivityFileExportManager.exportToTextFile(filename, activity, arcMap);
    }

}