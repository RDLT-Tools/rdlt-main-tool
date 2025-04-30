import { generateUniqueID } from "../../utils.mjs";
import VisualComponent from "../model/visual/VisualComponent.mjs";

export default class Activity {
    /**
     * @typedef {number} ArcUID
     * @typedef {number} VertexUID
     * @typedef {{ [timestep: number]: Set<ArcUID> }} ActivityProfile
     * @typedef {"aes" | "direct" | "ae" | "import"} ActivityOrigin
     * @typedef {{
     *      pass: boolean,
     *      title: string,
     *      description: string
     * }} ActivityConclusion
     * 
     * @typedef {{ [vertexUID: number]: { 
     *      T_reached: Set<number>, 
     *      T_condition_satisfied: { 
     *          arcUID: number,  
     *          checkedTime: number
     *      }[] 
     * } }} TimelinessOfResponse
     */

    /** @type {string} */
    id;

    /** @type {string} */
    name;

    /** @type {ActivityOrigin} */
    origin;

    /** @type {VertexUID} */
    source;

    /** @type {VertexUID} */
    sink;

    /** @type {ActivityConclusion} */
    conclusion;
    
    /** @type {ActivityProfile} */
    profile;

    /** @type {TimelinessOfResponse} */
    tor;

    /**
     * @param {{ 
     *     id: string, 
     *     name: string, 
     *     origin: ActivityOrigin, 
     *     source: VertexUID, 
     *     sink: VertexUID, 
     *     conclusion: ActivityConclusion, 
     *     profile: ActivityProfile,
     *     tor: TimelinessOfResponse
     * }} values 
     */
    constructor(values) {
        this.id = values.id || generateUniqueID();
        this.name = values.name;
        this.origin = values.origin;
        this.source = values.source;
        this.sink = values.sink;
        this.conclusion = values.conclusion;
        this.profile = values.profile;
        this.tor = values.tor;
    }
}