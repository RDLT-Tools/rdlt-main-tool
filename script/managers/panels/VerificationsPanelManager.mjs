import { verifyFreeChoiceness } from "../../services/free-choiceness.mjs";
import { verifyWellHandledness } from "../../services/well-handledness.mjs";
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
   *      freeChoiceness: {
   *          root: HTMLDivElement,
   *          startButton: HTMLButtonElement,
   *      },
   *      wellHandledness: {
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
      freeChoiceness: {},
      wellHandledness: {},
    },
  };

  /**
   * @type {{
   *      freeChoiceness: Form,
   * }}
   *
   * @type {{
   *      wellHandledness: Form,
   * }}
   */
  #forms = {
    freeChoiceness: null,
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
    this.#initializeWellHandlednessSection();
    this.#initializeFreeChoicenessSection();
    this.#initializeWellHandlednessSection();
  }

  #initializeForms() {
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
      console.log("Clicked verification button for free-choiceness");
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
      console.log("Clicked verification button for well-handledness");
      const { source, sink, type } = this.#forms.wellHandledness.getValues();
      if (!source || !sink) return;

      const modelSnapshot = this.context.managers.visualModel.makeCopy();
      const simpleModel = modelSnapshot.toSimpleModel();

      const result = verifyWellHandledness(simpleModel, source, sink, type);

      this.context.managers.workspace.showVerificationResults(
        result,
        modelSnapshot
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
