import { AESStep } from "../../../../entities/activity/AESStep.mjs";
import { buildArcTagElement, buildElement } from "../../../../utils.mjs";
import { AESimulationManager } from "../AESimulationManager.mjs";

export class AESProfilePanelManager {
    /** @type {AESimulationManager} */
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
     *      profileRows: { [AESStateID: number]: HTMLTableRowElement }
     * }}
     */
    #cache = {
        profileRows: {}
    }

    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;

        this.#initializeView();
    }

    #initializeView() {
        this.#views.profileTable = this.#rootElement.querySelector("table");
    }

    /**
     * 
     * @param {AESStep} currentStep 
     * @param {{ T, CTIndicator, activityProfile }} states 
     * @param {{ arcMap, vertexMap, arcs }} cache 
     */
    refreshActivityProfileView(states, cache) {
        const tableBody = this.#views.profileTable.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const timeStep in states.activityProfile) {
            const reachabilityConfig = [...states.activityProfile[timeStep]];

            let profileRow = this.#cache.profileRows[timeStep];

            if(!profileRow) {
                const profileRowCells = [];

                // Timestep column
                profileRowCells.push(buildElement("td", {}, [ timeStep ]));

                // Reachable arcs column
                profileRowCells.push(buildElement("td", { classname: "aes-profile-reachables"}, [])); 

                profileRow = buildElement("tr", {}, profileRowCells);

                this.#cache.profileRows[timeStep] = profileRow;
            }

            // Update reachable arcs
            const reachableArcsCell = profileRow.querySelector(".aes-profile-reachables");
            reachableArcsCell.innerHTML = "";
            for(const arcUID of reachabilityConfig) {
                const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(arcUID);
                reachableArcsCell.appendChild(buildArcTagElement(fromVertexIdentifier, toVertexIdentifier));
            }

            tableBody.appendChild(profileRow);
        }

    }
}