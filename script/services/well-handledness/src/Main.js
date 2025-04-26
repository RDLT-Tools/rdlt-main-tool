// Import necessary modules
import { parseRdltInput } from "../utils/Parser.js";
import { generateVertexSimplifications } from "./EVSA.js";
import { unweightArcs } from "../utils/Unweight.js";
import {
  hasLoopSafeNCAs,
  hasEqualLValuesAtAndJoins,
  hasSafeCAs,
  hasLoopSafeComponents,
  isBalanced,
} from "./LSafe.js";
import { parseRDLT } from "../utils/Parser.new.js";
import { modifiedActivityExtraction } from "./activity_extraction.js";

// Logging setup (using console instead of a log file)
function log(message) {
  console.log(message);
}

export function verify(RDLT, R1, R2) {
  let isWellHandled = true;
  const Violations = {
    "Loop safe NCAs": [],
    "Safe CAs": [],
    "Equal L-values at AND joins": [],
    "Not loop safe components": [],
    "Not balanced": [],
  };

  // [R1, R2].forEach((R_obj) => {
  //   if (R_obj.arcs.length > 0) {
  //     const loopSafeNCAsResult = hasLoopSafeNCAs(R_obj);
  //     Violations["Loop safe NCAs"] = loopSafeNCAsResult.entries;
  //     const hasLoopSafeNCAsFlag = loopSafeNCAsResult.hasLoopSafeNCAs;

  //     if (hasLoopSafeNCAsFlag) {
  //       log(`${R_obj.name} Loop-safe NCAs`);

  //       const safeCAsResult = hasSafeCAs(R_obj);
  //       Violations["Safe CAs"] = safeCAsResult.entries;
  //       const hasSafeCAsFlag = safeCAsResult.hasSafeCAs;
  //       if (hasSafeCAsFlag) {
  //         log(`${R_obj.name} has safe CAs`);

  //         const hasEqualLValuesResult = hasEqualLValuesAtAndJoins(R_obj);
  //         Violations["Equal L-values at AND joins"] =
  //           hasEqualLValuesResult.entries;
  //         const hasEqualLValuesFlag = hasEqualLValuesResult.hasEqualLValues;
  //         if (hasEqualLValuesFlag) {
  //           log(`${R_obj.name} has equal L-values at AND joins`);

  //           const hasLoopSafeComponentsResult = hasLoopSafeComponents(R_obj);
  //           Violations["Not loop safe components"] =
  //             hasLoopSafeComponentsResult.entries;
  //           const hasLoopSafeComponentsFlag =
  //             hasLoopSafeComponentsResult.hasLoopSafeComponentsValues;
  //           if (hasLoopSafeComponentsFlag) {
  //             log(`${R_obj.name} has loop-safe components`);

  //             const isBalancedResult = isBalanced(R_obj);
  //             Violations["Not balanced"] = isBalancedResult.entries;
  //             const isBalancedFlag = isBalancedResult.isBalanced;
  //             if (isBalancedFlag) {
  //               log(`${R_obj.name} is balanced`);
  //             } else {
  //               isWellHandled = false;
  //             }
  //           } else {
  //             isWellHandled = false;
  //           }
  //         } else {
  //           isWellHandled = false;
  //         }
  //       } else {
  //         isWellHandled = false;
  //       }
  //     } else {
  //       isWellHandled = false;
  //     }
  //     console.error("Violations:", Violations);
  //   } else {
  //     log(`${R_obj.name} is empty`);
  //   }
  // });

  [R1, R2].forEach((R_obj) => {
    if (R_obj.arcs.length > 0) {
      const loopSafeNCAsResult = hasLoopSafeNCAs(R_obj);
      Violations["Loop safe NCAs"] = loopSafeNCAsResult.entries;
      const hasLoopSafeNCAsFlag = loopSafeNCAsResult.hasLoopSafeNCAs;

      if (hasLoopSafeNCAsFlag) {
        log(`${R_obj.name} Loop-safe NCAs`);
      } else {
        isWellHandled = false;
      }

      const safeCAsResult = hasSafeCAs(R_obj);
      Violations["Safe CAs"] = safeCAsResult.entries;
      const hasSafeCAsFlag = safeCAsResult.hasSafeCAs;
      if (hasSafeCAsFlag) {
        log(`${R_obj.name} has safe CAs`);
      } else {
        isWellHandled = false;
      }

      const hasEqualLValuesResult = hasEqualLValuesAtAndJoins(R_obj);
      Violations["Equal L-values at AND joins"] = hasEqualLValuesResult.entries;
      const hasEqualLValuesFlag = hasEqualLValuesResult.hasEqualLValues;
      if (hasEqualLValuesFlag) {
        log(`${R_obj.name} has equal L-values at AND joins`);
      } else {
        isWellHandled = false;
      }

      const hasLoopSafeComponentsResult = hasLoopSafeComponents(R_obj);
      Violations["Not loop safe components"] =
        hasLoopSafeComponentsResult.entries;
      const hasLoopSafeComponentsFlag =
        hasLoopSafeComponentsResult.hasLoopSafeComponentsValues;
      if (hasLoopSafeComponentsFlag) {
        log(`${R_obj.name} has loop-safe components`);
      } else {
        isWellHandled = false;
      }

      const isBalancedResult = isBalanced(R_obj);
      Violations["Not balanced"] = isBalancedResult.entries;
      const isBalancedFlag = isBalancedResult.isBalanced;
      if (isBalancedFlag) {
        log(`${R_obj.name} is balanced`);
      } else {
        isWellHandled = false;
      }
    } else {
      log(`${R_obj.name} is empty`);
    }
  });
  log(`RDLT ${isWellHandled ? "IS" : "IS NOT"} WELL-HANDLED`);

  let source = null;
  let sink = null;

  // Find source and sink vertices
  for (const v of RDLT.vertices) {
    if (!v.incoming || v.incoming.length === 0) {
      source = v;
    }
    if (!v.outgoing || v.outgoing.length === 0) {
      sink = v;
    }
  }

  // Assuming you have a modifiedActivityExtraction function defined
  const { activityProfile, problematicVertices, traversalTimes, checkedTimes } =
    modifiedActivityExtraction(RDLT, source, sink);

  return { isWellHandled, Violations, activityProfile };
}

function preprocess(RDLT) {
  const [R1, R2] = generateVertexSimplifications(RDLT);

  log(`R1 Arcs: ${R1.arcs.map((arc) => arc.name).join(", ")}`);
  log(`R2 Arcs: ${R2.arcs.map((arc) => arc.name).join(", ")}`);

  [R1, R2].forEach((R_obj, i) => {
    log(`R${i + 1} Cycles:`);
    R_obj.cycle_list.forEach((cycle, j) => {
      log(
        `Cycle ${j + 1}: ${cycle.vertices
          .map((vertex) => vertex.name)
          .join(", ")}`
      );
      log(
        `R${i + 1} Critical Arcs: ${cycle.criticalArcs
          .map((arc) => arc.name)
          .join(", ")}`
      );
      log(
        `R${i + 1} Escape Arcs: ${cycle.escapeArcs
          .map((arc) => arc.name)
          .join(", ")}`
      );
    });
  });

  const lAttributesMod = unweightArcs(RDLT.l_attr);
  log(`l_attributes = ${JSON.stringify(lAttributesMod, null, 2)}`);

  return [R1, R2];
}

// Function to process JSON data
// export function processRDLT(jsonData) {
//   log("Processing RDLT data");
//   const RDLT = parseRdltInput(jsonData, "R");

//   //   console.log("RDLT:", RDLT);
//   console.log("RDLT.vertices:", RDLT.vertices);

//   log(
//     `Vertices: ${Array.from(RDLT.vertices)
//       .map((vertex) => vertex._name)
//       .join(", ")}`
//   );
//   log(`Arcs: ${RDLT.arcs.map((arc) => arc.name).join(", ")}`);

//   log(
//     `C attributes: ${Array.from(RDLT.c_attr.entries())
//       .map(([arc, value]) => `${arc._name}:${value}`)
//       .join(", ")}`
//   );

//   log(
//     `L attributes: ${Array.from(RDLT.l_attr.entries())
//       .map(([arc, value]) => `${arc._name}:${value}`)
//       .join(", ")}`
//   );

//   log(
//     `Centers: ${Array.from(RDLT.centers)
//       .map((center) => center.name)
//       .join(", ")}`
//   );

//   log(
//     `In-bridges: ${RDLT.in_bridges
//       .map((in_bridge) => in_bridge.name)
//       .join(", ")}`
//   );
//   log(
//     `Out-bridges: ${RDLT.out_bridges
//       .map((out_bridge) => out_bridge.name)
//       .join(", ")}`
//   );

//   const [R1, R2] = preprocess(RDLT);
//   const isWellHandled = verifyWellHandledness(R1, R2);

//   log("Verification complete");

//   return isWellHandled;
// }

export function processRDLT(model) {
  let RDLT = parseRDLT(model);
  const [R1, R2] = preprocess(RDLT);
  return { RDLT, R1, R2 };
}
