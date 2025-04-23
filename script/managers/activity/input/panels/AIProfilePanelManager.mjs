import { buildArcTagElement, buildElement } from "../../../../utils.mjs";
import { ActivityInputManager } from "../ActivityInputManager.mjs";

export class AIProfilePanelManager {
    /** @type {ActivityInputManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *      profileTable: HTMLTableElement
     * }}
     */
    #views = {
        profileTable: null,
    };

    /** 
     * @type {{
     *      profileRows: { [timestep: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        profileRows: {}
    }

    /** @type {number} */
    #activeTimestep = null;

    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#views.profileTable = this.#rootElement.querySelector("table");
    }

    /**
     * @param {Set<number>[]} activityProfile 
     */
    refreshProfileList(activityProfile) {
        for(let i = 0; i < activityProfile.length; i++) {
            const timestep = i + 1;
            const reachabilityConfig = [...activityProfile[i]];

            this.refreshTimestepProfile(timestep, reachabilityConfig);
        }
    }

    refreshTimestepProfile(timestep, reachabilityConfig) {
        const tableBody = this.#views.profileTable.querySelector("tbody");
        
        let profileRow = this.#cache.profileRows[timestep];

        if(!profileRow) {
            const profileRowCells = [];

            // timestep column
            profileRowCells.push(buildElement("td", {}, [ timestep ]));

            // Reachable arcs column
            profileRowCells.push(buildElement("td", { classname: "as-profile-reachables"}, [])); 

            profileRow = buildElement("tr", {}, profileRowCells);
            profileRow.addEventListener("click", () => this.#simulationManager.setCurrentTimestep(timestep));
            this.#cache.profileRows[timestep] = profileRow;
            tableBody.appendChild(profileRow);

        }

        // Set reachable arcs
        const reachableArcsCell = profileRow.querySelector(".as-profile-reachables");
        reachableArcsCell.innerHTML = "";
        for(const arcUID of reachabilityConfig) {
            const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(arcUID);
            reachableArcsCell.appendChild(buildArcTagElement(fromVertexIdentifier, toVertexIdentifier));
        }
    }

    setActiveTimestep(timestep) {
        const previousActiveTimestep = this.#activeTimestep;
        this.#activeTimestep = timestep;

        if(previousActiveTimestep) {
            const previousTimestepRow = this.#cache.profileRows[previousActiveTimestep];
            previousTimestepRow?.classList.remove("active");
        }

        const activeTimestepRow = this.#cache.profileRows[this.#activeTimestep];
        activeTimestepRow?.classList.add("active");
    }
}