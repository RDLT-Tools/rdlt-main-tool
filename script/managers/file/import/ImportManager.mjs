import App from "../../../App.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import ActivityImportManager from "./ActivityImportManager.mjs";
import RDLTImportManager from "./RDLTImportManager.mjs";

export default class ImportManager {
    /** @type { ModelContext } */
    context;

    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    async importRDLTFile() {
        const raw = await this.#importFileThenRead();
        if(!raw) return;

        const visualModel = RDLTImportManager.loadRDLTModel(raw);
        if(!visualModel) return;

        App.addContext(visualModel);
    }

    async importActivityFile() {
        const raw = await this.#importFileThenRead();
        if(!raw) return;

        const activity = ActivityImportManager.loadActivity(raw);
        if(!activity) return;

        this.context.managers.activities.addActivity(activity);
    }

    #importFileThenRead(accept = ".txt") {
        return new Promise(resolve => {
            const importField = document.createElement("input");
            importField.setAttribute("type", "file");
            importField.setAttribute("accept", accept);

            importField.addEventListener("change", (event) => {
                importField.remove();

                const file = event.target.files[0];
                if(!file) return resolve(null);

                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    resolve(text);
                };

                reader.readAsText(file);
            });

            document.querySelector("#tmp").appendChild(importField);
            importField.click();
        });
    }
}


