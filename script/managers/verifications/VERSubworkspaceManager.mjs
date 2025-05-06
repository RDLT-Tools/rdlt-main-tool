import { makeSVGElement } from "../../render/builders/utils.mjs";
import { buildElement } from "../../utils.mjs";
import { TabGroupManager } from "../workspace/TabGroupManager.mjs";
import { TabManager } from "../workspace/TabManager.mjs";
import { VerificationsResultManager } from "./VerificationsResultManager.mjs";

export class VERSubworkspaceManager {
  /** @type {VerificationsResultManager} */
  #verManager;

  /** @type {HTMLDivElement} */
  #rootAreaElement;

  /**
   * @type {{
   *      main: HTMLDivElement,
   *      buttons: { actions: { [action: string]: HTMLButtonElement } },
   *      header: { title: HTMLSpanElement, instanceSelector: HTMLSelectElement },
   *      panels: { [panelID: string]: HTMLDivElement },
   *      svg: SVGElement[]
   * }}
   */
  #view = {
    header: {},
    buttons: { actions: {} },
    panels: {},
    svg: [],
  };

  /**
   * @type {{
   *  left: TabGroupManager,
   *  right: TabGroupManager
   * }}
   * */
  #tabs = { left: null, right: null };

  /** @type {} */
  constructor(verManager, rootAreaElement) {
    this.#verManager = verManager;
    this.#rootAreaElement = rootAreaElement;
    this.#initializeView();
    this.#initializeTabs();
  }

  #initializeView() {
    this.#view.main = this.#rootAreaElement.querySelector(".ver-main");

    const headerElement =
      this.#rootAreaElement.querySelector(".ver-main > header");
    this.#view.header = {
      title: headerElement.querySelector(".ver-main > header h1"),
      instanceSelector: headerElement.querySelector(".ver-controls select"),
    };

    // Initialize panels
    [...this.#rootAreaElement.querySelectorAll(".panel")].forEach((panel) => {
      const panelID = panel.getAttribute("data-panel-id");
      this.#view.panels[panelID] = panel;
    });

    // Initialize action buttons
    [
      ...this.#rootAreaElement.querySelectorAll("button[data-ver-action]"),
    ].forEach((button) => {
      const action = button.getAttribute("data-ver-action");
      this.#view.buttons.actions[action] = button;
      button.addEventListener("click", () => this.#onActionClicked(action));
    });

    //Initialize simulate button
    this.#view.simulateButton = this.#rootAreaElement.querySelector(
      'button[data-subaction="simulate-mae"]'
    );
    if(!this.#verManager.activityProfile) this.#view.simulateButton.classList.add("hidden");

    this.#view.modal = this.#rootAreaElement.querySelector(".modal");

    // Get the <span> element that closes the modal
    this.#view.exit = this.#rootAreaElement.querySelector(".close");

    this.#view.close = this.#rootAreaElement.querySelector(".close-modal");

    this.#view.simulateButton.addEventListener("click", () => {
      this.#verManager.handleSimulateMAE(this.#view);
    });

    this.#view.exit.addEventListener("click", () => {
      this.#verManager.closeSimulateMAE(this.#view);
    });

    this.#view.close.addEventListener("click", () => {
      this.#verManager.closeSimulateMAE(this.#view);
    });

    // Initialize header
    this.#view.header.title.innerHTML = this.#verManager.result.title;

    const instances = this.#verManager.result.instances;

    // Initialize SVGs
    const drawingView = this.#rootAreaElement.querySelector(".drawing");
    for (const instance of instances) {
      const instanceSVG = makeSVGElement("svg");
      drawingView.appendChild(instanceSVG);
      this.#view.svg.push(instanceSVG);
    }

    // Initialize instance selector
    const instanceSelector = this.#view.header.instanceSelector;
    instanceSelector.innerHTML = "";
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      const option = buildElement("option", { value: i }, [instance.name]);
      instanceSelector.appendChild(option);
    }

    instanceSelector.addEventListener("change", () => {
      const selectedIndex = Number(instanceSelector.value);
      this.#verManager.displayInstanceResult(selectedIndex);
    });
  }

  #onActionClicked(action) {
    switch (action) {
    }
  }

  #initializeTabs() {
    const rightPanelsTabButtonsContainer = this.#rootAreaElement.querySelector(
      ".right-panels > .tab-buttons"
    );
    const rightPanelsTabAreaContainer = this.#rootAreaElement.querySelector(
      ".right-panels > .panel-tabs"
    );

    this.#tabs.right = new TabGroupManager(
      this,
      rightPanelsTabButtonsContainer,
      rightPanelsTabAreaContainer
    );

    this.#tabs.right.loadTab(
      TabManager.load(
        this,
        "result",
        "Result",
        rightPanelsTabButtonsContainer.querySelector(
          ".tab-button[data-tab-id='result']"
        ),
        rightPanelsTabAreaContainer.querySelector(
          ".tab-area[data-tab-id='result']"
        )
      )
    );

    this.#tabs.right.selectTab("result");
  }

  getInstanceSVG(index) {
    return this.#view.svg[index];
  }
}
