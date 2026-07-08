import { verifyFreeChoiceness } from "../../services/free-choiceness.mjs";
import { verifyWellHandledness } from "../../services/well-handledness.mjs";
import { verifySoundness } from "../../services/soundness/soundness-service.mjs";
import { analyzeSeparability } from "../../services/separability.mjs";
import {
  createVertex,
  createArc,
  createRDLT,
} from "../../services/separability/src/rdltModel.js";
import { Form } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

function simpleModelToRDLT(simpleModel) {
  console.log('[simpleModelToRDLT] simpleModel keys:', Object.keys(simpleModel));
  console.log('[simpleModelToRDLT] simpleModel:', JSON.parse(JSON.stringify(simpleModel)));

  const rawVertices = simpleModel.components ?? simpleModel.vertices  ??
                      simpleModel.nodes      ?? simpleModel.elements  ??
                      simpleModel.vertexList ?? simpleModel.verts     ?? [];
  const rawArcs     = simpleModel.arcs      ?? simpleModel.edges      ??
                      simpleModel.links     ?? simpleModel.arcList     ??
                      simpleModel.edgeList  ?? [];

  if (rawVertices.length > 0) {
    console.log('[simpleModelToRDLT] sample vertex keys:', Object.keys(rawVertices[0]));
    console.log('[simpleModelToRDLT] sample vertex:', JSON.parse(JSON.stringify(rawVertices[0])));
  } else {
    console.warn(
      '[simpleModelToRDLT] rawVertices is EMPTY. ' +
      'The simpleModel top-level keys are logged above — find the key that ' +
      'holds the vertex array and add it to the rawVertices fallback chain.'
    );
  }
  if (rawArcs.length > 0) {
    console.log('[simpleModelToRDLT] sample arc keys:', Object.keys(rawArcs[0]));
    console.log('[simpleModelToRDLT] sample arc:', JSON.parse(JSON.stringify(rawArcs[0])));
  }

  const vertexUid = v =>
    v.uid        ?? v.vuid      ?? v.id      ?? null;

  const vertexUidMap = new WeakMap();
  rawVertices.forEach(v => {
    const uid = vertexUid(v);
    if (uid != null) vertexUidMap.set(v, String(uid));
  });

  // Helper: resolve an arc endpoint to a vuid string.
  const resolveEndpoint = (val) => {
    if (val == null) return undefined;
    if (typeof val === 'object') return vertexUidMap.get(val) ?? String(vertexUid(val) ?? 'undefined');
    return String(val);
  };

  console.log('[simpleModelToRDLT] All vertex isRBSCenter values:');
  rawVertices.forEach(v => {
    const mVal = (v.isCenter || v.isRBSCenter || Number(v.M) === 1) ? 1 : 0;
    console.log(
      `  vertex uid=${vertexUid(v)} identifier=${v.identifier ?? v.label ?? '?'}` +
      ` isRBSCenter=${v.isRBSCenter} isCenter=${v.isCenter} M=${v.M}` +
      ` → computed M=${mVal}`
    );
  });

  const vertices = rawVertices.map(v => {
    const mVal = (v.isCenter || v.isRBSCenter || Number(v.M) === 1) ? 1 : 0;
    const vertex = createVertex(
      String(vertexUid(v) ?? v.nodeId ?? '?'),         // vuid
      String(v.identifier ?? v.label ?? v.name ?? v.id ?? vertexUid(v)), // display id
      v.type ?? 'c',                                    // 'b' | 'e' | 'c'
      mVal                                              // M
    );
    vertex.isCenter = mVal === 1;
    return vertex;
  });

  // This confirms createVertex stored M correctly.
  console.log('[simpleModelToRDLT] RDLT vertices after createVertex:');
  vertices.forEach(v => console.log(`  vuid=${v.vuid} id=${v.id} M=${v.M} isCenter=${v.isCenter}`));

  const arcs = rawArcs.map(a => {
    const fromVal = a.fromVertexUID ??
                    a.from       ?? a.source     ?? a.fromId    ??
                    a.fromVertex ?? a.fromNode    ?? a.startVertex ??
                    a.start      ?? a.tail        ?? a.origin    ?? undefined;

    const toVal   = a.toVertexUID ??
                    a.to         ?? a.target     ?? a.toId      ??
                    a.toVertex   ?? a.toNode      ?? a.endVertex ??
                    a.end        ?? a.head        ?? a.destination ?? undefined;

    const fromVuid = resolveEndpoint(fromVal);
    const toVuid   = resolveEndpoint(toVal);

    if (fromVuid === undefined || fromVuid === 'undefined') {
      console.warn(
        '[simpleModelToRDLT] Could not resolve arc from-endpoint.',
        'Arc keys:', Object.keys(a),
        'Arc:', a
      );
    }

    return createArc(
      String(a.uid  ?? a.auid ?? a.id),    // auid
      fromVuid ?? 'undefined',              // from vuid
      toVuid   ?? 'undefined',              // to vuid
      a.C ?? a.c ?? 'E',                    // C attribute
      Number(a.L ?? a.l ?? 0),              // L attribute
      (a.inBridge  || a.In  || a.in)  ? 1 : 0,   // In bridge
      (a.outBridge || a.Out || a.out) ? 1 : 0      // Out bridge
    );
  });

  _inferBridgesFromSCC(vertices, arcs);

  const hasRBS = vertices.some(v => v.isCenter);
  return createRDLT(vertices, arcs, hasRBS);
}

function _inferBridgesFromSCC(vertices, arcs) {
  const centers = vertices.filter(v => v.isCenter);
  if (centers.length === 0) return;

  const fwdAdj = new Map();
  const bwdAdj = new Map();
  vertices.forEach(v => { fwdAdj.set(v.vuid, []); bwdAdj.set(v.vuid, []); });
  arcs.forEach(a => {
    if (fwdAdj.has(a.from)) fwdAdj.get(a.from).push(a.to);
    if (bwdAdj.has(a.to))   bwdAdj.get(a.to).push(a.from);
  });

  function reachableSet(startVuid, adjMap) {
    const visited = new Set([startVuid]);
    const queue   = [startVuid];
    while (queue.length) {
      const u = queue.shift();
      for (const v of (adjMap.get(u) ?? [])) {
        if (!visited.has(v)) { visited.add(v); queue.push(v); }
      }
    }
    return visited;
  }

  // Approximate SCC of v as forward(v) ∩ backward(v).
  function sccOf(vuid) {
    const fwd = reachableSet(vuid, fwdAdj);
    const bwd = reachableSet(vuid, bwdAdj);
    const scc = new Set();
    for (const u of fwd) { if (bwd.has(u)) scc.add(u); }
    return scc;
  }

  // Process each center independently.
  for (const center of centers) {
    const epsilonNeighbors = [];
    arcs.forEach(a => {
      if (a.from === center.vuid && (!a.c || a.c === 'E' || a.c === '')) {
        epsilonNeighbors.push(a.to);
      }
    });

    const rbsRegion = new Set([center.vuid]);
    for (const neighbor of epsilonNeighbors) {
      const scc = sccOf(neighbor);
      for (const v of scc) rbsRegion.add(v);
    }

    console.log(
      `[simpleModelToRDLT] RBS region for center ${center.id} (vuid=${center.vuid}):`,
      [...rbsRegion]
    );

    arcs.forEach(a => {
      const fromIn = rbsRegion.has(a.from);
      const toIn   = rbsRegion.has(a.to);
      if (!fromIn && toIn) {
        a.In       = 1;
        a.inBridge = true;
        console.log(`[simpleModelToRDLT]   in-bridge:  ${a.from} → ${a.to}`);
      } else if (fromIn && !toIn) {
        a.Out       = 1;
        a.outBridge = true;
        console.log(`[simpleModelToRDLT]  out-bridge:  ${a.from} → ${a.to}`);
      }
    });
  }
}

function validateRDLTIntegrity(rdlt, label = 'RDLT') {
  const vuids = new Set((rdlt.vertices ?? []).map(v => v.vuid));
  const bad   = [];

  for (const a of (rdlt.arcs ?? [])) {
    if (!vuids.has(a.from)) bad.push(`arc "${a.auid}" from="${a.from}" (no such vertex)`);
    if (!vuids.has(a.to))   bad.push(`arc "${a.auid}" to="${a.to}"   (no such vertex)`);
  }

  if (bad.length) {
    console.error(
      `[separability] ${label} has ${bad.length} arc(s) whose from/to vuid ` +
      `does not match any vertex.  This means simpleModelToRDLT is mapping ` +
      `arc endpoints with a different property name than vertex vuids.\n` +
      `Check the simpleModel structure and update the adapter accordingly.\n` +
      bad.join('\n')
    );
    console.table(
      (rdlt.vertices ?? []).map(v => ({ vuid: v.vuid, id: v.id }))
    );
    console.table(
      (rdlt.arcs ?? []).map(a => ({ auid: a.auid, from: a.from, to: a.to }))
    );
    return false;
  }
  return true;
}

function _buildPipelineTraceInstance(pipeline) {
  const inp  = pipeline.input ?? {};
  const evsa = pipeline.evsa ?? {};
  const mca  = pipeline.mca  ?? {};
  const mas  = pipeline.mas  ?? {};

  const count = 'float:right;font-weight:400;font-size:0.9em;color:#6b7280;';
  const mono  = 'font-family:monospace;';
  const muted = 'color:#6b7280;';

  const centerLabel = inp.centerIds && inp.centerIds.length
    ? ' &nbsp;[' + inp.centerIds.join(', ') + ']' : '';
  const inputBlock =
    '<div class="collapsible">' +
      '<header>Input</header>' +
      '<main>' +
        (inp.vertices ?? '?') + ' vertices &nbsp;&middot;&nbsp; ' +
        (inp.arcs     ?? '?') + ' arcs &nbsp;&middot;&nbsp; ' +
        (inp.centers  ?? '?') + ' center(s)' + centerLabel +
      '</main>' +
    '</div>';

  const evsaRows = (evsa.subRDLTs ?? []).map(function(r) {
    return '<tr>' +
      '<td style="' + mono + '">' + r.label + '</td>' +
      '<td style="text-align:right;' + muted + '">' + r.vertices + 'v&thinsp;/&thinsp;' + r.arcs + 'a</td>' +
    '</tr>';
  }).join('');
  const evsaBlock =
    '<div class="collapsible">' +
      '<header>Step 1 &mdash; EVSA' +
        '<span style="' + count + '">' + (evsa.count ?? '?') + ' sub-RDLT' + (evsa.count === 1 ? '' : 's') + '</span>' +
      '</header>' +
      '<main><table><tbody>' + evsaRows + '</tbody></table></main>' +
    '</div>';

  const rdltIds = mca.rdltIds && mca.rdltIds.length ? mca.rdltIds.join(', ') : '&mdash;';
  const mcaBlock =
    '<div class="collapsible">' +
      '<header>Step 2 &mdash; MCA' +
        '<span style="' + count + '">' + (mca.count ?? '?') + ' MinCS entr' + (mca.count === 1 ? 'y' : 'ies') + '</span>' +
      '</header>' +
      '<main>' +
        '<table><tbody>' +
          '<tr><td style="' + muted + '">rdltIds</td><td style="text-align:right;' + mono + '">[' + rdltIds + ']</td></tr>' +
        '</tbody></table>' +
      '</main>' +
    '</div>';

  const perMca = mas.perMca ?? [];
  const masRows = perMca.map(function(entry) {
    return '<tr>' +
      '<td style="' + mono + muted + '">MinCS[' + entry.mcaIdx + ']</td>' +
      '<td style="' + mono + '">' + entry.riLabel + '</td>' +
      '<td style="text-align:right;">' + entry.masCount + ' MAS</td>' +
    '</tr>';
  }).join('');
  const masBlock =
    '<div class="collapsible">' +
      '<header>Step 3 &mdash; MAS' +
        '<span style="' + count + '">' + (mas.count ?? '?') + ' total</span>' +
      '</header>' +
      '<main><table><tbody>' + masRows + '</tbody></table></main>' +
    '</div>';

  const descriptionHTML =
    '<div>' + inputBlock + evsaBlock + mcaBlock + masBlock + '</div>';

  return {
    _isPipelineTrace: true,
    name: 'Pipeline Trace',
    evaluation: {
      conclusion: {
        pass: true,
        title: 'Pipeline Trace',
        description: descriptionHTML
      },
      criteria: [],
      violating: { vertices: [], arcs: [] }
    },
    model: { vertices: [], arcs: [] }
  };
}

export default class VerificationsPanelManager {
  /** @type { ModelContext } */
  context;

  /** @type {HTMLDivElement} */
  #rootElement;
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
      separability: {},
    },
  };

  #forms = {
    poi: null,
    freeChoiceness: null,
    soundness: null,
    wellHandledness: null,
  };

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
    this.#initializeSeparabilitySection();
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

  #initializeSeparabilitySection() {
    const sectionRoot = this.#rootElement.querySelector(
      "[data-section-id='sep']"
    );

    if (!sectionRoot) {
      console.warn(
        'VerificationsPanelManager: [data-section-id="sep"] not found. ' +
        'Ensure main.html includes the separability section.'
      );
      return;
    }

    const sectionViews = this.#views.sections.separability;

    sectionViews.root = sectionRoot;
    sectionViews.startButton = sectionRoot.querySelector(
      "button[data-subaction='start']"
    );
    sectionViews.simulateCheckbox = sectionRoot.querySelector(
      "input[name='simulate']"
    );

    sectionViews.startButton.addEventListener("click", () => {
      const simulate = sectionViews.simulateCheckbox?.checked ?? false;

      const modelSnapshot = this.context.managers.visualModel.makeCopy();
      const simpleModel   = modelSnapshot.toSimpleModel();

      const rdlt = simpleModelToRDLT(simpleModel);

      validateRDLTIntegrity(rdlt, 'rdlt');

      const result = analyzeSeparability(rdlt, { simulate });
      if (result._pipeline) result._pipelineHTML = _buildPipelineTraceInstance(result._pipeline).evaluation.conclusion.description;

      const overallInstance = result.instances?.[0];
      if (overallInstance?.name === 'Overall Separability Analysis') {

        if (!overallInstance.model.vertices.length) {
          overallInstance.model.vertices = (simpleModel.components ?? []).map(c => c.uid);
        }
        if (!overallInstance.model.arcs.length) {
          overallInstance.model.arcs = (simpleModel.arcs ?? []).map(a => a.uid);
        }

        const subsections = overallInstance.evaluation.subsections ?? [];
        if (subsections.length > 0) {
          overallInstance._subsections = subsections;
        }
      }

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
