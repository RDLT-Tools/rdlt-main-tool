// src/modules/mapper.js

import { PNModel } from '../models/pnModel.js';
import {
  mapVertexToTransition,
  handleSplitPlaces,
  handleIncomingArcs,
  handleEpsilonArcs,
  handleSigmaArcs,
  handleRBS,
  handleBridgeArcs,
  handleAuxiliaryPlaces,
  handleSourceTransitions
} from '../utils/strategy.js';
import { exportPNToDOT, exportRDLTToDOT } from './visualization.js';

/**
 * 
 * Castillo's Mapping Algo is split into 9 Steps:
 * 
 * Step 1 (Lines 1–2): Map each RDLT node to a PN transition.
 * Step 2 (Lines 3–8): Process split nodes. 
 *  Analyze outgoing edges to decide if the node qualifies as a split. 
 *  Then, based on sibling detection, decide if a split place (Pxsplit) is created.
 * Step 3 (Lines 9–17): For each node with incoming edges, 
 *  create the input place (Pym) and—if needed for Σ‑constrained arcs—create auxiliary PN components (TJy, PJy).
 * Step 4 (Lines 18–29): Process epsilon arcs and create the appropriate auxiliary PN components.
 * Step 5 (Lines 30–46): Process Σ‑constrained arcs, ensuring that extra auxiliary places and reset arcs are created.
 * Step 6 (Lines 47–55): Map reset-bound subsystems by processing the level‑2 RDLT graphs.
 * Step 7 (Lines 56–60): Process bridge arcs that connect level‑1 and level‑2.
 * Step 8 (Lines 61–68): Process auxiliary places and properly wire reset arcs.
 * Step 9 (Line 69): Connect all source nodes to a global source place.
 */

// Now the mapping function expects the combined RDLT.
export function mapToPetriNet(combinedRDLT) {
  const petriNet = new PNModel();
  let conversionDOT = [{
    log: `[Preprocess] EVSA + Extended Level 1.`,
    dotLines: exportRDLTToDOT(combinedRDLT).split('\n')
  }];
  conversionDOT.push({
    log: mapVertexToTransition(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleSplitPlaces(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleIncomingArcs(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleEpsilonArcs(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleSigmaArcs(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleRBS(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleBridgeArcs(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleAuxiliaryPlaces(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });
  conversionDOT.push({
    log: handleSourceTransitions(combinedRDLT, petriNet),
    dotLines: exportPNToDOT(petriNet).split('\n')
  });

  return {petriNet,conversionDOT};
}
