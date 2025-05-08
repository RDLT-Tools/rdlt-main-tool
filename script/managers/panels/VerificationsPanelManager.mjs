import { verifyFreeChoiceness } from "../../services/free-choiceness.mjs";
import { verifyWellHandledness } from "../../services/well-handledness.mjs";
import { verifySoundness } from "../../services/soundness/soundness-service.mjs";
import { Form } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export default class VerificationsPanelManager {
  /** @type { ModelContext } */
  context;

  /** @type {HTMLDivElement} */
  #rootElement;
  /**
   * @type {{
   *  selectors: {
   *      sources: HTMLSelectElement[],
   *      sinks: HTMLSelectElement[]
   *  },
   *  sections: {
   *      poi: {
   *          root: HTMLDivElement
   *      },
   *      freeChoiceness: {
   *          root: HTMLDivElement,
   *          startButton: HTMLButtonElement,
   *      },
   *    wellHandledness: {
   *          root: HTMLDivElement,
   *          startButton: HTMLButtonElement,
   *      }
   *  }
   * }}
   */
  #views = {
    selectors: {
      sources: [],
      sinks: [],
    },
    sections: {
      poi: {},
      freeChoiceness: {},
      wellHandledness: {},
      soundness: {},
    },
  };

  /**
   * @type {{
   *      poi: Form,
   *      freeChoiceness: Form,
   *      wellHandledness: Form,
   * }}
   */
  #forms = {
    poi: null,
    freeChoiceness: null,
    soundness: null,
    wellHandledness: null,
  };

  /**
   * @param {ModelContext} context
   */
  constructor(context, rootElement) {
    this.context = context;
    this.#rootElement = rootElement;

    this.#initializeView();
    this.#initializeForms();
  }

  #initializeView() {
    this.#initializePOISection();
    this.#initializeFreeChoicenessSection();
    this.#initializeWellHandlednessSection();
    this.#initializeSoundnessSection();
  }

  #initializeForms() {
    this.#forms.poi = new Form(this.#views.sections.poi.root).setFieldNames([
      "source",
      "sink",
    ]);
    this.#views.selectors.sources.push(
      this.#forms.poi.getFieldElement("source")
    );
    this.#views.selectors.sinks.push(this.#forms.poi.getFieldElement("sink"));

    this.#forms.freeChoiceness = new Form(
      this.#views.sections.freeChoiceness.root
    ).setFieldNames(["source", "sink", "type"]);

    this.#forms.wellHandledness = new Form(
      this.#views.sections.wellHandledness.root
    ).setFieldNames(["source", "sink", "type"]);

    this.#views.selectors.sources.push(
      this.#forms.freeChoiceness.getFieldElement("source"),
      this.#forms.wellHandledness.getFieldElement("source")
    );
    this.#views.selectors.sinks.push(
      this.#forms.freeChoiceness.getFieldElement("sink"),
      this.#forms.wellHandledness.getFieldElement("sink")
    );

    // Soundness form elements
    this.#forms.soundness = new Form(
      this.#views.sections.soundness.root
    ).setFieldNames(["source", "sink", "notion"]);
    this.#views.selectors.sources.push(
      this.#forms.soundness.getFieldElement("source")
    );
    this.#views.selectors.sinks.push(
      this.#forms.soundness.getFieldElement("sink")
    );
  }

  #initializePOISection() {
    const sectionRoot = this.#rootElement.querySelector(
      "[data-section-id='poi']"
    );
    const sectionViews = this.#views.sections.poi;

    sectionViews.root = sectionRoot;
    sectionViews.startButton = sectionRoot.querySelector(
      "button[data-subaction='start']"
    );
    sectionViews.startButton.addEventListener("click", async () => {
      const { source, sink } = this.#forms.poi.getValues();
      if (!source || !sink) return;

      await this.context.managers.workspace
        .showPOIs({
          source: Number(source),
          sink: Number(sink),
        })
        .initialize();
    });
  }

  #initializeFreeChoicenessSection() {
    const sectionRoot = this.#rootElement.querySelector(
      "[data-section-id='fc']"
    );
    const sectionViews = this.#views.sections.freeChoiceness;

    sectionViews.root = sectionRoot;
    sectionViews.startButton = sectionRoot.querySelector(
      "button[data-subaction='start']"
    );
    sectionViews.startButton.addEventListener("click", () => {
      const { source, sink, type } = this.#forms.freeChoiceness.getValues();
      if (!source || !sink) return;

      const modelSnapshot = this.context.managers.visualModel.makeCopy();
      const simpleModel = modelSnapshot.toSimpleModel();

      const result = verifyFreeChoiceness(simpleModel, source, sink, type);

      this.context.managers.workspace.showVerificationResults(
        result,
        modelSnapshot
      );
    });
  }

  #initializeSoundnessSection() {
    const sectionRoot = this.#rootElement.querySelector(
      "[data-section-id='soundness']"
    );
    const sectionViews = this.#views.sections.soundness;

    sectionViews.root = sectionRoot;
    sectionViews.startButton = sectionRoot.querySelector(
      "button[data-subaction='start']"
    );
    sectionViews.startButton.addEventListener("click", () => {
      const { source, sink, notion } = this.#forms.soundness.getValues();
      if (!source || !sink) return;

      const modelSnapshot = this.context.managers.visualModel.makeCopy();
      const simpleModel = modelSnapshot.toSimpleModel();

      const result = verifySoundness(simpleModel, source, sink, notion);

      this.context.managers.workspace.showVerificationResults(
        result,
        modelSnapshot
      );
    });
  }

  #initializeWellHandlednessSection() {
    const sectionRoot = this.#rootElement.querySelector(
      "[data-section-id='wh']"
    );
    const sectionViews = this.#views.sections.wellHandledness;

    sectionViews.root = sectionRoot;
    sectionViews.startButton = sectionRoot.querySelector(
      "button[data-subaction='start']"
    );
    sectionViews.startButton.addEventListener("click", () => {
      const { source, sink, type } = this.#forms.wellHandledness.getValues();
      if (!source || !sink) return;

      const modelSnapshot = this.context.managers.visualModel.makeCopy();
      const simpleModel = modelSnapshot.toSimpleModel();

      const { activityProfile, result } = verifyWellHandledness(
        simpleModel,
        source,
        sink,
        type
      );
      console.log("Verification complete", result);
      this.context.managers.workspace.showVerificationResults(
        result,
        modelSnapshot,
        activityProfile
      );
    });
  }

  refreshModelValues() {
    const potentialSourceVertices =
      this.context.managers.visualModel.getPotentialSourceVertices();
    const potentialSinkVertices =
      this.context.managers.visualModel.getPotentialSinkVertices();

    for (const element of this.#views.selectors.sources) {
      element.innerHTML = potentialSourceVertices
        .map(
          (vertex) =>
            `<option value="${vertex.uid}">${vertex.identifier}</option>`
        )
        .join("");
    }

    for (const element of this.#views.selectors.sinks) {
      element.innerHTML = potentialSinkVertices
        .map(
          (vertex) =>
            `<option value="${vertex.uid}">${vertex.identifier}</option>`
        )
        .join("");
    }
  }
}
