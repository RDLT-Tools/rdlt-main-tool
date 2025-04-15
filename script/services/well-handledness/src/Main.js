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

// Logging setup (using console instead of a log file)
function log(message) {
  console.log(message);
}

function verifyWellHandledness(R1, R2) {
  let isWellHandled = true;

  [R1, R2].forEach((R_obj) => {
    if (hasLoopSafeNCAs(R_obj)) {
      log(`${R_obj.name} has loop-safe NCAs`);
      // if (hasSafeCAs(R_obj)) {
      //   log(`${R_obj.name} has safe CAs`);
      if (hasEqualLValuesAtAndJoins(R_obj)) {
        log(`${R_obj.name} has equal L-values at AND joins`);
        if (hasLoopSafeComponents(R_obj)) {
          log(`${R_obj.name} has loop-safe components`);

          if (isBalanced(R_obj)) {
            log(`${R_obj.name} is balanced`);
          } else {
            isWellHandled = false;
          }
        } else {
          isWellHandled = false;
        }
      } else {
        isWellHandled = false;
      }
      // } else {
      //   isWellHandled = false;
      // }
    } else {
      isWellHandled = false;
    }
  });

  log(`RDLT ${isWellHandled ? "IS" : "IS NOT"} WELL-HANDLED`);
  return isWellHandled;
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
}
