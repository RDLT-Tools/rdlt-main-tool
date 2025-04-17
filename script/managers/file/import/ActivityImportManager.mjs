import Activity from "../../../entities/activity/Activity.mjs";
import { generateUniqueID } from "../../../utils.mjs";
import { parseNextBoolean, parseNextList, parseNextNumber, parseNextString } from "./utils.mjs";

export default class ActivityImportManager {
    /** @returns {Activity} */
    static loadActivity(raw) {
        const lines = raw.split("\n");
        const activity = new Activity({
            id: generateUniqueID(),
            origin: "import",
            profile: {}
        });

        for(let li = 0; li < lines.length; li++) {
            const line = lines[li];

            if(li === 0) {
                activity.name = line;
            } else if(li === 1) {
                const parsedSourceVertexUID = parseNextNumber(line, 0);
                const parsedSinkVertexUID = parseNextNumber(line, parsedSourceVertexUID.nextIndex);
                const parsedConcPass = parseNextBoolean(line, parsedSinkVertexUID.nextIndex);
                const parsedConcTitle = parseNextString(line, parsedConcPass.nextIndex);
                const parsedConcDesc = parseNextString(line, parsedConcTitle.nextIndex);

                activity.source = parsedSourceVertexUID.value;
                activity.sink = parsedSinkVertexUID.value;
                activity.conclusion = {
                    pass: parsedConcPass.value,
                    title: parsedConcTitle.value,
                    description: parsedConcDesc.value
                };
            } else {
                if(!line.trim()) continue;

                const parsedTimestep = parseNextNumber(line, 0);
                const parsedArcUIDs = parseNextList(line, parsedTimestep.nextIndex);

                activity.profile[parsedTimestep.value] = new Set(parsedArcUIDs.values.map(auid => Number(auid)));
            }
        }

        return activity;
    }
}