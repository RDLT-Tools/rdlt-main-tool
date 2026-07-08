import {
  buildArcTagElement,
  buildElement,
  buildVertexTagElement,
} from "../../../utils.mjs";
import { VerificationsResultManager } from "../VerificationsResultManager.mjs";

export default class VERResultTabManager {
  /** @type {VerificationsResultManager} */
  #parentManager;

  /** @type {HTMLDivElement} */
  #rootElement;

  /**
   *
   * @type {{
   *   masInfo: HTMLDivElement,
   *   subsectionsContainer: HTMLDivElement,
   *   conclusion: {
   *       root: HTMLDivElement,
   *       title: HTMLDivElement,
   *       description: HTMLDivElement,
   *   },
   *   criteria: {
   *      section: HTMLDivElement,
   *      table: HTMLTableElement,
   *   },
   *   violatingArcs: {
   *      section: HTMLDivElement,
   *      table: HTMLTableElement,
   *   },
   *   violatingVertices: {
   *      section: HTMLDivElement,
   *      table: HTMLTableElement,
   *   }
   * }}
   */
  #view = {
    masInfo: null,
    subsectionsContainer: null,
    conclusion: { root: null, title: null, description: null },
    criteria: { section: null, table: null },
    violatingArcs: { section: null, table: null },
    violatingVertices: { section: null, table: null },
  };

  /** @type {{ [auid: string]: { fromUID: number|string, toUID: number|string } }} */
  #abstractArcInfo = {};

  constructor(parentManager, rootElement) {
    this.#parentManager = parentManager;
    this.#rootElement = rootElement;

    this.#initializeView();
  }

  #initializeView() {
    this.#view.masInfo = this.#rootElement.querySelector(
      `[data-ver-section="mas-info"]`
    );

    this.#view.subsectionsContainer = this.#rootElement.querySelector(
      `[data-ver-section="subsections"]`
    );

    this.#view.conclusion.root =
      this.#rootElement.querySelector(".status-chip");
    this.#view.conclusion.title =
      this.#rootElement.querySelector(".status-title");
    this.#view.conclusion.description = this.#rootElement.querySelector(
      ".status-description"
    );

    this.#view.criteria.section = this.#rootElement.querySelector(
      `[data-ver-section="criteria"]`
    );
    this.#view.criteria.table = this.#rootElement.querySelector(
      `[data-ver-section="criteria"] table`
    );
    this.#view.violatingVertices.section = this.#rootElement.querySelector(
      `[data-ver-section="v-vertices"]`
    );
    this.#view.violatingVertices.table = this.#rootElement.querySelector(
      `[data-ver-section="v-vertices"] table`
    );
    this.#view.violatingArcs.section = this.#rootElement.querySelector(
      `[data-ver-section="v-arcs"]`
    );
    this.#view.violatingArcs.table = this.#rootElement.querySelector(
      `[data-ver-section="v-arcs"] table`
    );
  }

  /**
   *
   * @param {{
   *      name,
   *      evaluation: {
   *          conclusion: {
   *              pass,
   *              title,
   *              description
   *          },
   *          criteria: {
   *              pass, description
   *          }[],
   *          violating: {
   *              arcs: number[],
   *              vertices: number[]
   *          },
   *          violatingRemarks: {
   *              vertices: {[vertexUID: number]: string}
   *          },
   *      },
   *      model: {
   *          vertices: number[],
   *          arcs: number[]
   *      }
   * }} instance
   */
  displayInstanceResult(instance) {
    this.#abstractArcInfo = instance._meta?.abstractArcInfo ?? {};
    this.#view.conclusion.root.classList.remove("hidden");

    const {
      name,
      evaluation: { conclusion, criteria, violating, violatingRemarks },
    } = instance;

    // Setup conclusion chip
    if (conclusion.pass) {
      this.#view.conclusion.root.classList.add("passed");
    } else {
      this.#view.conclusion.root.classList.remove("passed");
    }

    this.#view.conclusion.title.innerHTML = conclusion.title;
    this.#view.conclusion.description.innerHTML = conclusion.description;

    // If the instance has subsections, render each as its own collapsible
    // and collect all violating arcs across subsections into the shared v-arcs section.
    if (instance._subsections?.length) {
      this.#renderMasInfo(null);
      this.#view.subsectionsContainer.classList.remove("hidden");
      this.#renderSubsections(instance._subsections);
      this.#view.criteria.section.classList.add("hidden");

      const allViolatingArcs = instance._subsections.flatMap(
        s => s.violating?.arcs ?? []
      );
      this.#renderViolatingArcs(allViolatingArcs);

      this.#view.violatingVertices.section.classList.add("hidden");
      return;
    }

    // Normal (non-subsection) rendering
    this.#renderMasInfo(instance._meta ?? null);
    this.#view.subsectionsContainer.classList.add("hidden");
    this.#view.subsectionsContainer.innerHTML = "";

    // Setup criteria
    const criteriaSection = this.#view.criteria.section;
    const criteriaTableBody = this.#view.criteria.table.querySelector("tbody");
    criteriaTableBody.innerHTML = "";
    if (criteria && criteria.length > 0) {
      criteriaSection.classList.remove("hidden");
      for (const criterion of criteria) {
        const criteriaRow = buildElement("tr", { classname: "criteria-row" }, [
          buildElement("td", {}, [
            buildElement("i", {
              classname: "fas fa-" + (criterion.pass ? "check" : "close"),
            }),
          ]),
          buildElement("td", {}, [criterion.description]),
        ]);

        criteriaTableBody.appendChild(criteriaRow);
      }
    } else {
      criteriaSection.classList.add("hidden");
    }

    // Setup violating arcs
    this.#renderViolatingArcs(violating?.arcs ?? [], violatingRemarks);

    // Setup violating vertices
    const violatingVerticesSection = this.#view.violatingVertices.section;
    const violatingVerticesTableBody =
      this.#view.violatingVertices.table.querySelector("tbody");
    violatingVerticesTableBody.innerHTML = "";

    if (violating?.vertices && violating.vertices.length > 0) {
      violatingVerticesSection.classList.remove("hidden");
      for (const vertexUID of violating.vertices) {
        const identifier = this.#parentManager.getVertexIdentifier(vertexUID);
        const row = buildElement("tr", {}, [
          buildElement("td", {}, [buildVertexTagElement(identifier)]),
          buildElement("td", {}, [violatingRemarks?.vertices[vertexUID] || ""]),
        ]);

        violatingVerticesTableBody.appendChild(row);
      }
    } else {
      violatingVerticesSection.classList.add("hidden");
    }
  }

  #renderMasInfo(meta) {
    const container = this.#view.masInfo;
    if (!container) return;
    container.innerHTML = "";

    const path = meta?.contractionPath;
    if (!path || path.length === 0) {
      container.classList.add("hidden");
      return;
    }

    container.classList.remove("hidden");

    // ── Contraction Path collapsible ─────────────────────────────────────────
    const pathNodes = [];
    path.forEach((uid, i) => {
      if (i > 0) {
        pathNodes.push(buildElement("span", { style: "margin:0 4px;vertical-align:middle;color:#555;" }, ["→"]));
      }
      const identifier = this.#parentManager.getVertexIdentifier(uid);
      pathNodes.push(buildVertexTagElement(identifier || String(uid)));
    });
    container.appendChild(
      buildElement("div", { classname: "collapsible" }, [
        buildElement("header", {}, ["Contraction Path"]),
        buildElement("main", {}, pathNodes),
      ])
    );

    // ── MinCS collapsible ─────────────────────────────────────────────────────
    const minCSVertices = meta.minCSVertices ?? [];
    const minCSArcs     = meta.minCSArcs     ?? [];
    if (minCSVertices.length === 0 && minCSArcs.length === 0) return;

    const mcaIdx  = meta.mcaIdx;
    const mcaLabel = mcaIdx != null
      ? buildElement("span", { style: "float:right;font-weight:400;font-size:0.9em;color:#6b7280;" }, [`[${mcaIdx}]`])
      : null;
    const minCSHeader = buildElement("header", {}, mcaLabel ? ["MinCS", mcaLabel] : ["MinCS"]);

    const minCSMain = buildElement("main");

    // Vertices
    if (minCSVertices.length > 0) {
      minCSMain.appendChild(
        buildElement("div", { style: "font-size:0.85em;color:#6b7280;margin:4px 0 2px;" }, ["Vertices"])
      );
      const vertRow = buildElement("div");
      minCSVertices.forEach(uid => {
        const identifier = this.#parentManager.getVertexIdentifier(uid);
        vertRow.appendChild(buildVertexTagElement(identifier || String(uid)));
      });
      minCSMain.appendChild(vertRow);
    }

    // Arcs table
    if (minCSArcs.length > 0) {
      minCSMain.appendChild(
        buildElement("div", { style: "font-size:0.85em;color:#6b7280;margin:8px 0 2px;" }, ["Arcs"])
      );
      const thead = buildElement("thead");
      thead.appendChild(buildElement("tr", {}, [
        buildElement("th", {}, ["Arc"]),
        buildElement("th", {}, ["C"]),
        buildElement("th", {}, ["L"]),
      ]));
      const tbody = buildElement("tbody");
      for (const arc of minCSArcs) {
        const fromId = this.#parentManager.getVertexIdentifier(arc.fromUID);
        const toId   = this.#parentManager.getVertexIdentifier(arc.toUID);
        tbody.appendChild(buildElement("tr", {}, [
          buildElement("td", {}, [buildArcTagElement(
            fromId || String(arc.fromUID),
            toId   || String(arc.toUID)
          )]),
          buildElement("td", {}, [arc.c]),
          buildElement("td", {}, [String(arc.l)]),
        ]));
      }
      minCSMain.appendChild(buildElement("table", {}, [thead, tbody]));
    }

    container.appendChild(
      buildElement("div", { classname: "collapsible" }, [minCSHeader, minCSMain])
    );
  }

  #renderViolatingArcs(arcUIDs, violatingRemarks) {
    const section = this.#view.violatingArcs.section;
    const table   = this.#view.violatingArcs.table;
    table.innerHTML = "";

    if (!arcUIDs || arcUIDs.length === 0) {
      section.classList.add("hidden");
      return;
    }

    const thead = buildElement("thead");
    thead.appendChild(
      buildElement("tr", {}, [buildElement("th", {}, ["Arc"])])
    );
    const tbody = buildElement("tbody");
    for (const arcUID of arcUIDs) {
      let identifierPair = this.#parentManager.getArcIdentifierPair(arcUID);

      // Abstract arcs (AA_...) don't exist in the visual model — resolve via lookup map.
      if (!identifierPair[0] && !identifierPair[1]) {
        const info = this.#abstractArcInfo[arcUID];
        if (info) {
          identifierPair = [
            this.#parentManager.getVertexIdentifier(info.fromUID),
            this.#parentManager.getVertexIdentifier(info.toUID),
          ];
        }
      }

      tbody.appendChild(
        buildElement("tr", {}, [
          buildElement("td", {}, [buildArcTagElement(...identifierPair)]),
          buildElement("td", {}, [violatingRemarks?.arcs?.[arcUID] || ""]),
        ])
      );
    }
    table.appendChild(thead);
    table.appendChild(tbody);
    section.classList.remove("hidden");
  }

  #renderSubsections(subsections) {
    this.#view.subsectionsContainer.innerHTML = "";
    for (const sub of subsections) {
      this.#view.subsectionsContainer.appendChild(
        this.#buildSubsectionEl(sub)
      );
    }
  }

  #buildSubsectionEl(sub) {
    const section = buildElement("div", { classname: "collapsible" });
    section.appendChild(buildElement("header", {}, [sub.title]));

    const main = buildElement("main");

    // Criteria table
    if (sub.criteria?.length > 0) {
      const tbody = buildElement("tbody");
      for (const criterion of sub.criteria) {
        const iconClass = criterion.pass === null
          ? "fas fa-minus"
          : "fas fa-" + (criterion.pass ? "check" : "close");
        tbody.appendChild(
          buildElement("tr", { classname: "criteria-row" }, [
            buildElement("td", {}, [buildElement("i", { classname: iconClass })]),
            buildElement("td", {}, [criterion.description]),
          ])
        );
      }
      main.appendChild(buildElement("table", {}, [tbody]));
    }

    section.appendChild(main);
    return section;
  }
}
