import Activity from "../../entities/activity/Activity.mjs";
import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID, pickRandomFromSet } from "../../utils.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import VERResultTabManager from "./panels/VERResultTabManager.mjs";
import { VERSubworkspaceManager } from "./VERSubworkspaceManager.mjs";

export class VerificationsResultManager {
  /** @type {ModelContext} */
  context;

  /** @type {string} */
  id;

  /**
   * @typedef {number} VertexUID
   * @typedef {number} ArcUID
   * @typedef {{
   *      title: string,
   *      instances: {
   *          name: string,
   *          evaluation: {
   *              conclusion: {
   *                  pass: boolean,
   *                  title: string,
   *                  description: string
   *              },
   *              criteria: {
   *                  pass: boolean,
   *                  description: string
   *              }[],
   *              violating: {
   *                  vertices: VertexUID[],
   *                  arcs: ArcUID[]
   *              },
   *          },
   *          model: {
   *              vertices: VertexUID[],
   *              arcs: ArcUID[],
   *          }
   *      }[]
   * }} VerificationResultData
   *
   * @type {VerificationResultData}
   */
  result;

  /** @type {VisualRDLTModel} */
  #modelSnapshot;

  /** @type {VERSubworkspaceManager} */
  #subworkspaceManager;

  /**
   * @type {{
   *      result: VERResultTabManager
   * }}
   * */
  #panels;

  /** @type {BaseModelDrawingManager[]} */
  #drawingManagers = [];

  #currentInstanceIndex = 0;

  /**
   * @param {ModelContext} context
   * @param {VerificationResultData} result
   * @param {*} visualModelSnapshot
   */
  constructor(context, result, visualModelSnapshot, activityProfile = null) {
    this.context = context;
    this.id = generateUniqueID();
    this.result = result;
    this.#modelSnapshot = visualModelSnapshot;
    this.activityProfile = activityProfile;

    this.#initialize();
  }

  async #initialize() {
    const subworkspaceTabManager =
      await this.context.managers.workspace.addVerificationResultSubworkspace(
        this.id,
        this.result.title
      );
    const rootElement = subworkspaceTabManager.tabAreaElement;

    // this.#drawingManager = new AESDrawingManager(this, rootElement.querySelector(".drawing > svg"));
    this.#subworkspaceManager = new VERSubworkspaceManager(this, rootElement);

    this.#panels = {
      result: new VERResultTabManager(
        this,
        rootElement.querySelector(`[data-panel-id="result"]`)
      ),
    };

    this.#panels.result.displayInstanceResult(this.result.instances[0]);

    const allVertices = this.#modelSnapshot.getAllComponents();
    const allArcs = this.#modelSnapshot.getAllArcs();

    // Initialize model drawings
    for (let i = 0; i < this.result.instances.length; i++) {
      const instance = this.result.instances[i];
      const drawingManager = new BaseModelDrawingManager(
        this.#subworkspaceManager.getInstanceSVG(i),
        "vs"
      );

      const vertices = instance.model?.vertices
        ? allVertices.filter((v) => instance.model?.vertices.includes(v.uid))
        : allVertices;

      const arcs = instance.model?.arcs
        ? allArcs.filter((v) => instance.model?.arcs.includes(v.uid))
        : allArcs;

      drawingManager.setupComponents(vertices, arcs);

      // Highlight violating arcs
      const violatingArcsUIDs = instance.evaluation?.violating?.arcs || [];
      for (const arcUID of violatingArcsUIDs) {
        drawingManager.highlightArc(arcUID);
      }

      // Highlight violating vertices
      const violatingVerticesUIDs =
        instance.evaluation?.violating?.vertices || [];
      for (const vertexUID of violatingVerticesUIDs) {
        drawingManager.highlightVertex(vertexUID);
      }

      this.#drawingManagers.push(drawingManager);
    }

    this.displayInstanceResult(0);
  }

  getVertexIdentifier(vertexUID) {
    return this.#modelSnapshot.getComponent(vertexUID)?.identifier || "";
  }

  /**
   * @returns {[ string, string ]}
   */
  getArcIdentifierPair(arcUID) {
    const arc = this.#modelSnapshot.getArc(arcUID);
    if (!arc) return ["", ""];

    const from = this.getVertexIdentifier(arc.fromVertexUID);
    const to = this.getVertexIdentifier(arc.toVertexUID);

    return [from, to];
  }

  displayInstanceResult(instanceIndex) {
    const prevIndex = this.#currentInstanceIndex;

    this.#currentInstanceIndex = instanceIndex;
    const instance = this.result.instances[instanceIndex];

    // Change visible drawing
    this.#subworkspaceManager
      .getInstanceSVG(prevIndex)
      .classList.remove("active");
    this.#subworkspaceManager
      .getInstanceSVG(instanceIndex)
      .classList.add("active");

    // Update result tab
    this.#panels.result.displayInstanceResult(instance);
  }
  handleSimulateMAE(view) {
    this.context.managers.workspace.startActivitySimulation(new Activity({
      name: "Activity from Well-Handledness",
      origin: "direct",
      profile: this.activityProfile
    }));

    return;

    view.modal.style.display = "block";
    const body = view.modal.querySelector(".modal-body");
    body.innerHTML = ""; // Clear previous content

    for (const key in this.activityProfile) {
      const valueSet = this.activityProfile[key];
      // Create a container div to hold the arcTag
      const wrapper = document.createElement("div");
      wrapper.style.display = "block"; // Force block display

      const timeStep = document.createElement("label");
      timeStep.style.display = "inline-block"; // Make label inline
      timeStep.innerText = `S(${key}): `;

      wrapper.appendChild(timeStep); // Append timeStep to the wrapper
      for (const value of valueSet) {
        const arc = this.#modelSnapshot.getArc(value);
        if (!arc) return ["", ""];

        const fromVertex = this.getVertexIdentifier(arc.fromVertexUID);
        const toVertex = this.getVertexIdentifier(arc.toVertexUID);

        const arcTag = document.createElement("div");
        arcTag.className = "arc-tag";
        arcTag.style.display = "inline-block"; // Set display to inline-block

        const from = document.createElement("div");
        from.className = "arc-tag-from";
        from.textContent = fromVertex;

        const to = document.createElement("div");
        to.className = "arc-tag-to";
        to.textContent = toVertex;

        arcTag.appendChild(from);
        arcTag.appendChild(to);

        wrapper.appendChild(arcTag); // Place arcTag inside the wrapper
        body.appendChild(wrapper);
      }
    }

    // Simulate MAE logic here
    console.log("Simulate MAE:", this.activityProfile);
  }

  closeSimulateMAE(view) {
    view.modal.style.display = "none";
  }
}
