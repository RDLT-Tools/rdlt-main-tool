import Activity from "../../../entities/activity/Activity.mjs";
import VisualArc from "../../../entities/model/visual/VisualArc.mjs";
import { serializeString, startBlobDownload } from "../utils.mjs";

export default class ActivityFileExportManager {
    /**
     * @param {string} filename
     * @param {Activity} activity 
     * @param {{ [arcUID: number]: VisualArc }} arcMap 
     */
    static exportToTextFile(filename, activity) {
        /** @type {string[]} */
        const rows = [];

        // <name>
        rows.push(activity.name);

        // <source-vuid> <sink-vuid> <is-pass> <conc-title> <conc-desc>
        const concTitleSerialized = serializeString(activity.conclusion?.title || "");
        const concDescSerialized = serializeString(activity.conclusion?.description || "");
        rows.push(`${activity.source} ${activity.sink} ${activity.conclusion.pass ? 1 : 0} ${concTitleSerialized} ${concDescSerialized}`);

        // <timestep> ...[<from-vuid>-<to-vuid>]
        for(const timestep in activity.profile) {
            const arcUIDs = [...activity.profile[timestep]].join(" ");
            rows.push(`${timestep} ${arcUIDs}`);
        }

        const raw = rows.join("\n");
        startBlobDownload(filename, raw);
    }
}