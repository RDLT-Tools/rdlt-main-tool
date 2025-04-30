import { buildArcTagElement, buildElement } from "../../../../utils.mjs";
import { ActivitySimulationManager } from "../ActivitySimulationManager.mjs";

export class ASProfilePanelManager {
    /** @type {ActivitySimulationManager} */
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
     * @param {{ [timestep: number]: Set<number> }} activityProfile 
     */
    displayProfileList(activityProfile) {
        const tableBody = this.#views.profileTable.querySelector("tbody");
        tableBody.innerHTML = "";

        const timesteps = Object.keys(activityProfile).map(t => Number(t)).sort((a,b) => a-b);
        for(const timeStep of timesteps) {
            const reachabilityConfig = [...activityProfile[timeStep]];

            const profileRowCells = [];

            // Timestep column
            profileRowCells.push(buildElement("td", {}, [ timeStep ]));

            // Reachable arcs column
            profileRowCells.push(buildElement("td", { classname: "as-profile-reachables"}, [])); 

            const profileRow = buildElement("tr", {}, profileRowCells);


            // Set reachable arcs
            const reachableArcsCell = profileRow.querySelector(".as-profile-reachables");
            reachableArcsCell.innerHTML = "";
            for(const arcUID of reachabilityConfig) {
                const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(arcUID);
                reachableArcsCell.appendChild(buildArcTagElement(fromVertexIdentifier, toVertexIdentifier));
            }

            profileRow.addEventListener("click", () => this.#simulationManager.setCurrentTimestep(timeStep));

            tableBody.appendChild(profileRow);
            this.#cache.profileRows[timeStep] = profileRow;
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