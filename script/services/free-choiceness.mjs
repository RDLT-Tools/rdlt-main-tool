import { performVertexSimplificationLevel1 } from "./vs.mjs";
import { buildVertexMap, isEpsilon } from "../utils.mjs";
/**
 *
 * @param {{
 *      vertices: { uid, identifier }[],
 *      arcs: { uid, fromVertexUID, toVertexUID, C, L }[]
 * }} model
 *
 * @returns {{
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
 *               arcs: ArcUID[]
 *          }
 *      }[]
 * }}
 */

export function verifyFreeChoiceness(model, source, sink) {
  const verticesList = model.components;
  const arcsList = model.arcs;
  const vertexMap = buildVertexMap(verticesList);

  // Verify PCN
  const pcnResult = verifyPCN(verticesList, arcsList, source, sink).instances[0]
    .evaluation;

  console.log("pcnResult", pcnResult);

  if (!pcnResult.conclusion.pass) {
    return {
      title: "Free-Choiceness",
      instances: [
        {
          name: "Main Model",
          evaluation: {
            conclusion: pcnResult.conclusion,
            criteria: pcnResult.criteria,
            violating: pcnResult.violating,
          },
        },
      ],
    };
  }
  // Verify PCS

  let R2Empty = false;
  console.log("verticesList", verticesList);
  console.log("arcsList", arcsList);
  console.log("vertexMap", vertexMap);

  const R2 = extractRBSClusterConnections(vertexMap, arcsList);
  console.log("R2isEmpty(R2)", R2isEmpty(R2));

  const evaluation = {
    conclusion: {
      pass: false,
      title: "The model is NOT free-choice",
      description: "Free-choiceness verification failed.",
    },
    criteria: [],
    violating: {
      arcs: [],
      vertices: [],
    },
  };

  if (R2isEmpty(R2)) {
    R2Empty = true;
    const phase1Results = verifyPhase1(verticesList, arcsList, R2Empty);

    phase1Results.criteria.forEach((c) => {
      evaluation.criteria.push({
        pass: c.pass,
        description: c.description,
      });
    });

    evaluation.violating.arcs = phase1Results.violatingArcs || [];
    evaluation.violating.vertices = phase1Results.violatingVertices || [];

    // Proceed to Phase 2 if Phase 1 passed
    if (phase1Results.isValid) {
      const phase2Results = verifyPhase2(
        phase1Results.validCompositeVectors,
        verticesList,
        arcsList,
        source
      );

      evaluation.criteria.push({
        pass: phase2Results.isValid,
        description: phase2Results.message,
      });

      if (!phase2Results.isValid) {
        evaluation.violating.vertices.push(
          ...new Set(phase2Results.violations.map((v) => v.vertex))
        );
      } else {
        evaluation.conclusion.pass = true;
        evaluation.conclusion.title = "The model is free-choice";
        evaluation.conclusion.description =
          "All free-choiceness conditions are satisfied.";
      }
    }
  } else {
    // Get R1 Components
    R2Empty = false;
    const R1 = performVertexSimplificationLevel1(verticesList, arcsList);
    const R1VerticesUIDs = Array.from(R1.vertexUIDs);
    const R1ArcsUIDs = Array.from(R1.arcUIDs);
    const R1Vertices = verticesList.filter((vertex) =>
      R1VerticesUIDs.includes(vertex.uid)
    );
    const R1Arcs = arcsList.filter((arc) => R1ArcsUIDs.includes(arc.uid));
    console.log("R1", R1);
    console.log("R1Vertices", R1Vertices);
    console.log("R1Arcs", R1Arcs);

    // Get R2 components
    const firstKey = Object.keys(R2)[0];
    const R2VerticesUIDs = R2[firstKey].vertexUIDs;
    const R2ArcsUIDs = R2[firstKey].arcUIDs;
    const R2Vertices = verticesList.filter((vertex) =>
      R2VerticesUIDs.includes(vertex.uid)
    );
    const R2Arcs = arcsList.filter((arc) => R2ArcsUIDs.includes(arc.uid));
    console.log("R2Vertices", R2Vertices);
    console.log("R2Arcs", R2Arcs);

    const R1Phase1Results = verifyPhase1(R1Vertices, R1Arcs, R2Empty);
    const R2Phase1Results = verifyPhase1(R2Vertices, R2Arcs, R2Empty);
    console.log("R1Phase1Results", R1Phase1Results);
    console.log("R2Phase1Results", R2Phase1Results);

    evaluation.violating.arcs = R1Phase1Results.violatingArcs || [];
    evaluation.violating.vertices = R1Phase1Results.violatingVertices || [];

    R1Phase1Results.criteria.forEach((c) => {
      evaluation.criteria.push({
        pass: c.pass,
        description: c.description,
      });
    });

    // R2Phase1Results.criteria.forEach((c) => {
    //   evaluation.criteria.push({
    //     pass: c.pass,
    //     description: c.description,
    //   });
    // });

    let R1Phase2Results;

    if (R1Phase1Results.isValid) {
      R1Phase2Results = verifyPhase2(
        R1Phase1Results.validCompositeVectors,
        R1Vertices,
        R1Arcs,
        source
      );

      evaluation.criteria.push({
        pass: R1Phase2Results.isValid,
        description: R1Phase2Results.message,
      });

      console.log("R1Phase2Results", R1Phase2Results);

      if (!R1Phase2Results.isValid) {
        evaluation.violating.vertices.push(
          ...new Set(R1Phase2Results.violations.map((v) => v.vertex))
        );
        console.log("R1Phase2Results", R1Phase2Results);
      } else {
        R1Phase2Results = {
          isValid: true,
          message: "There exist POS Paths from all POS to each sibling.",
          violations: [],
        };
      }
    } else {
      // if Phase 1 fails, Phase 2 is invalid
      R1Phase2Results = {
        isValid: false,
      };
    }

    if (
      R1Phase2Results.isValid &&
      !R2Phase1Results.isValid &&
      !R2Phase1Results.isInconclusive
    ) {
      evaluation.conclusion.pass = false;
      evaluation.conclusion.title = "The model is NOT Free-choice";
      evaluation.conclusion.description =
        "R1 is Free-choice and R2 is NOT Free-choice.";
    } else if (R1Phase2Results.isValid && R2Phase1Results.isInconclusive) {
      evaluation.conclusion.pass = true;
      evaluation.conclusion.title = "The model is Free-choice";
      evaluation.conclusion.description =
        "R1 is free-choice and R2 is inconclusive.";
    } else if (
      !R1Phase2Results.isValid &&
      !R1Phase2Results.isInconclusive &&
      !R2Phase1Results.isValid &&
      !R2Phase1Results.isInconclusive
    ) {
      evaluation.conclusion.pass = false;
      evaluation.conclusion.title = "The model is NOT Free-choice";
      evaluation.conclusion.description =
        "R1 is NOT Free-choice and R2 is NOT Free-choice.";
    } else if (
      !R1Phase2Results.isValid &&
      !R1Phase2Results.isInconclusive &&
      R2Phase1Results.isInconclusive
    ) {
      evaluation.conclusion.pass = false;
      evaluation.conclusion.title = "The model is NOT Free-choice";
      evaluation.conclusion.description =
        "R1 is NOT free-choice and R2 is inconclusive.";
    } else if (
      R1Phase2Results.isInconclusive &&
      !R2Phase1Results.isValid &&
      !R2Phase1Results.isInconclusive
    ) {
      evaluation.conclusion.pass = false;
      evaluation.conclusion.title = "The model is NOT Free-choice";
      evaluation.conclusion.description =
        "R1 is Inconclusive and R2 is NOT Free-choice.";
    } else if (
      R1Phase2Results.isInconclusive &&
      R2Phase1Results.isInconclusive
    ) {
      evaluation.conclusion.pass = false;
      evaluation.conclusion.title = "The model is Inconclusive";
      evaluation.conclusion.description = "R1 and R2 are inconclusive.";
    }
  }

  return {
    title: "Free-Choiceness",
    instances: [
      {
        name: "Main Model",
        evaluation,
      },
    ],
  };
}

/* ================================== Verifying PCN ============================ */

function verifyPCN(verticesList, arcsList, source, sink) {
  // Step 1: Build constraints map from arcs
  const constraintsMap = {};
  for (const arc of arcsList) {
    constraintsMap[arc.uid] = arc.C ?? null;
  }

  // Step 2: Find sibling sets that satisfy POD condition
  const siblingGroups = findSiblingsWithPOD(verticesList, arcsList);
  console.log("siblingGroups", siblingGroups);

  const parentArcs = findSiblingParentArcs(siblingGroups, arcsList);
  console.log("parentArcs", parentArcs);

  const contractionPaths = generateContractionPaths(
    arcsList,
    parentArcs,
    source,
    sink
  );
  // console.log("contractionPaths", contractionPaths);

	const contPathSeq = sequenceContractionPath(contractionPaths.contractionPaths);
	console.log("Contraction Path Sequence",contPathSeq);
	

  const evaluation = {
    conclusion: {
      pass: false,
      title: "The model is NOT Free-choice",
      description:
        "No sibling sets were found where at least one vertex is a POD.",
    },
    criteria: [],
    violating: {
      siblingGroups: [],
    },
  };

  if (siblingGroups.length > 0) {
    evaluation.conclusion.pass = true;
    evaluation.conclusion.title = "The model is Free-choice";
    evaluation.conclusion.description =
      "Sibling groups with at least one POD were found in the model.";

    evaluation.criteria.push({
      pass: true,
      description: `${siblingGroups.length} sibling group(s) with POD condition met.`,
    });

    evaluation.violating.siblingGroups = siblingGroups.map((group) => ({
      parent: group.parent,
      siblings: group.siblings,
      columnCardinality: group.columnCardinality,
    }));
  } else {
    evaluation.criteria.push({
      pass: false,
      description: "No sibling sets with POD condition met.",
    });
  }

  return {
    title: "t₀-step PCN Free-Choiceness",
    instances: [
      {
        name: "Main Model",
        evaluation,
      },
    ],
  };
}

function findSiblingsWithPOD(verticesList, arcsList) {
  const v = verticesList;
  const a = arcsList;
  // const c = a.map(arc => arc.C);
  // let s = []

  console.log("Vertices", v);
  console.log("Arcs", a);
  // console.log("Constraints", c);

  const matrix = constructAdjacencyMatrix(verticesList, arcsList);
  const retainedRows = [];

  matrix.forEach((row, rowIndex) => {
    const rowSum = row.reduce((sum, val) => sum + val, 0);
    if (rowSum > 1) {
      retainedRows.push({
        rowIndex,
        vertex: verticesList[rowIndex],
        row,
      });
    }
  });

  console.log("Retained Rows (σ > 1)", retainedRows);

  const retainedMatrix = retainedRows.map((r) => r.row);
  console.log("Retained Matrix", retainedMatrix);

  const siblingSets = retainedRows.map(({ row }, i) => {
    const s_i = [];
    row.forEach((val, colIndex) => {
      if (val !== 0) {
        s_i.push(verticesList[colIndex]); // v_j added to s_i
      }
    });
    return s_i;
  });

  console.log("Sibling Sets s_i", siblingSets);

  const constraintMatrices = siblingSets.map((siblingSet) => {
    return verticesList.map((fromVertex) => {
      return siblingSet.map((toVertex) => {
        const arc = arcsList.find(
          (arc) =>
            arc.fromVertexUID === fromVertex.uid &&
            arc.toVertexUID === toVertex.uid
        );
        return arc ? arc.C : null;
      });
    });
  });

  console.log("Constraint Matrices Fᵢ (v × sᵢ)", constraintMatrices);

  // Step 4: Apply C operation and filter POD groups
  const podSiblingSets = [];
  constraintMatrices.forEach((F_i, index) => {
    const numCols = F_i[0].length;
    const C_Fi = [];

    for (let col = 0; col < numCols; col++) {
      const columnValues = new Set();
      for (let row = 0; row < F_i.length; row++) {
        const val = F_i[row][col];
        if (val !== null) {
          columnValues.add(val);
        }
      }
      C_Fi.push(columnValues.size);
    }

    const hasPOD = C_Fi.some((count) => count > 1);
    if (hasPOD) {
      podSiblingSets.push(siblingSets[index]);
    }
  });

  console.log("POD Sibling Groups (at least one POD):", podSiblingSets);

  return podSiblingSets;
}

function findSiblingParentArcs(siblingGroups, arcsList) {
  const candidateSiblingArcs = [];
  const seen = new Set();

  siblingGroups.forEach((siblingGroup) => {
    if (siblingGroup.length < 2) return;

    const siblingUIDs = siblingGroup.map((v) => v.uid);
    console.log("siblingUIDs", siblingUIDs);

    const parentsPerSibling = siblingUIDs.map((sid) => {
      return arcsList
        .filter((arc) => arc.toVertexUID === sid)
        .map((arc) => arc.fromVertexUID);
    });
    console.log("parentsPerSibling", parentsPerSibling);

    const commonParents = parentsPerSibling.reduce((acc, curr) =>
      acc.filter((x) => curr.includes(x))
    );
    console.log("commonParents", commonParents);

    // Collect arcs (x, y) where x is a common parent and y is a sibling
    arcsList.forEach((arc) => {
      const key = `${arc.fromVertexUID}->${arc.toVertexUID}`;
      if (
        commonParents.includes(arc.fromVertexUID) &&
        siblingUIDs.includes(arc.toVertexUID) &&
        !seen.has(key)
      ) {
        seen.add(key);
        candidateSiblingArcs.push(arc);
      }
    });
  });

  return candidateSiblingArcs;
}

function generateContractionPaths(
  arcsList,
  parentArcs,
  source,
  sink
) {
  const contractionPaths = [];
  const failedContractions = [];
  const superset = new Set();
  const processedArcs = new Set();

  function findPaths(startUID, targetUID, arcsList) {
    const paths = [];

    const adjList = new Map();
    for (const arc of arcsList) {
      const from = String(arc.fromVertexUID);
      const to = String(arc.toVertexUID);
      if (!adjList.has(from)) {
        adjList.set(from, []);
      }
      adjList.get(from).push(to);
    }

    function dfs(current, path, visited) {
      const newPath = [...path, current];
      const newVisited = new Set(visited).add(current);

      if (String(current) === String(targetUID)) {
        paths.push(newPath);
        return;
      }

      const neighbors = adjList.get(String(current)) || [];
      for (const neighbor of neighbors) {
        if (!newVisited.has(neighbor)) {
          dfs(neighbor, newPath, newVisited);
        }
      }
    }

    dfs(String(startUID), [], new Set());
    return paths;
  }

  arcsList.forEach((arc) => {
    const { fromVertexUID: x, toVertexUID: y } = arc;
    // console.log("x", x + ", y", y);

    const pathsFromSource = findPaths(source, x, arcsList);
    const pathsToSink = findPaths(y, sink, arcsList);
    // console.log("pathsFromSource", pathsFromSource);
    // console.log("pathsToSink", pathsToSink);

    const outgoingArcs = arcsList.filter((a) => a.fromVertexUID === x);
    const incomingArcs = arcsList.filter((a) => a.toVertexUID === y);
    // console.log("outgoingArcs " + x, outgoingArcs);
    console.log("incomingArcs " + y, incomingArcs);

    if (outgoingArcs.length === 0) return;

    if (incomingArcs.length > 0) {
			const incomingAttributes = new Set(incomingArcs.map(a => a.C));
			console.log("incomingAttributes", y, incomingAttributes);
		
			let isFailed = false;
		
			for (const attr of incomingAttributes) {
				if (!attr || attr === "") {
					superset.add(attr);
				} else if (superset.has(attr)) {
					isFailed = true;
					break;
				}
			}
		
			if (isFailed) {
				failedContractions.push({ from: x, to: y });
				return;
			}
		
			// Otherwise, safe to continue
			console.log("superset", superset);
		}

    pathsFromSource.forEach((p_s) => {
			pathsToSink.forEach((p_t) => {
				const contractedPath = [
					...p_s.map(uid => parseInt(uid, 10)),
					parseInt(y, 10),
					...p_t.slice(1).map(uid => parseInt(uid, 10))
				];
				contractionPaths.push(contractedPath);
		
				arcsList
					.filter((a) => a.fromVertexUID === y)
					.forEach((a) => superset.add(a.C));
		
				processedArcs.add(`${x}->${y}`);
			});
		});		
  });
	// console.log("contractionPaths",contractionPaths);
	// console.log("failedContractions",failedContractions);
	// console.log("superset",superset);
	// console.log("processedArcs",processedArcs);
	
  return { contractionPaths, failedContractions };
}

function sequenceContractionPath(contractionPaths) {
  const sequence = [];
  const seen = new Set();

  for (const path of contractionPaths) {
    for (const vertex of path) {
      if (!seen.has(vertex)) {
        seen.add(vertex);
        sequence.push(vertex);
      }
    }
  }

  return sequence.sort(function (a, b) {  return a - b; });
}




function activityExtraction() {}

/* ================================== Verifying PCS ============================ */

/*
          Phase 1 Functions
              - filterChildVectors
              - findValidCompositeVectors
              - computeBitwiseAND
              - isValidComposite
              - generateCompositeName
              - buildConstraintMatrixForVector
              - getConstraintBetween
*/

function verifyPhase1(verticesList, arcsList, R2Empty) {
  const adjacencyMatrix = constructAdjacencyMatrix(verticesList, arcsList);
  const filteredChildren = filterChildVectors(adjacencyMatrix, verticesList);
  const validCompositeVectors = findValidCompositeVectors(
    filteredChildren,
    adjacencyMatrix
  );

  const constraintMatrices = validCompositeVectors.map((composite) =>
    buildConstraintMatrixForVector(composite, verticesList, arcsList)
  );
  console.log("constraintMatrices", constraintMatrices);

  let constraintsPass = false;

  if (constraintMatrices.length === 0) {
    constraintsPass = false;
  } else {
    constraintsPass = constraintMatrices.every((matrix) =>
      matrix.slice(1).every(([, value]) => value === "1")
    );
  }
  // console.log("constraintsPass", constraintsPass);

  const hasSiblings = filteredChildren.length > 0;
  const sharedParents = validCompositeVectors.length > 0;
  const violatingVertices = new Set();
  const violatingArcs = new Set();

  // console.log("sharedParents", sharedParents);
  // console.log("validCompositeVectprs", validCompositeVectors);
  // console.log("filteredChildren", filteredChildren);

  constraintMatrices.forEach((matrix) => {
    const zeroValueRows = matrix.slice(1).filter(([, value]) => value === "0");
    const zeroVertices = zeroValueRows.map(([vertex]) => vertex);

    let arcsFromZeroVertices;

    if (R2Empty) {
      arcsFromZeroVertices = arcsList.filter((arc) =>
        zeroVertices.includes(`x${arc.fromVertexUID - 3}`)
      );
    } else {
      arcsFromZeroVertices = arcsList.filter((arc) =>
        zeroVertices.includes(`x${arc.fromVertexUID}`)
      );
    }

    console.log("arcsFromZeroVertices", arcsFromZeroVertices);

    const groupedByC = {};
    for (const arc of arcsFromZeroVertices) {
      if (!groupedByC[arc.C]) groupedByC[arc.C] = [];
      groupedByC[arc.C].push(arc);
    }

    for (const group of Object.values(groupedByC)) {
      if (group.length > 1) {
        group.forEach((arc) => violatingArcs.add(arc));
      }
    }
  });
  const violatingArcsArray = Array.from(violatingArcs);
  const violatingArcsList = [];
  violatingArcsArray.forEach((arc) => {
    violatingArcsList.push(arc.uid);
  });
  console.log("violatingArcsList", violatingArcsList);

  return {
    isValid: sharedParents && constraintsPass,
    isInconclusive: !hasSiblings,
    validCompositeVectors,
    violatingVertices: violatingVertices,
    violatingArcs: violatingArcsList,
    criteria: [
      {
        pass: hasSiblings,
        description: hasSiblings
          ? "Sibling vertices are detected."
          : "No sibling vertices found.",
      },
      {
        pass: sharedParents,
        description: sharedParents
          ? "Sibling vertices share the same parent set."
          : "Sibling vertices do not share the same parent set.",
      },
      {
        pass: constraintsPass,
        description: constraintsPass
          ? "Parent constraints are identical."
          : "Parent constraints are not identical.",
      },
    ],
  };
}

/*
    Find vertices with multiple parents and returns the vectors of those vertices.
*/
function filterChildVectors(adjacencyMatrix, verticesList) {
  const transposedMatrix = [];
  const rowLength = adjacencyMatrix[0]?.length || 0;
  for (let colIndex = 0; colIndex < rowLength; colIndex++) {
    const column = [];
    for (let rowIndex = 0; rowIndex < adjacencyMatrix.length; rowIndex++) {
      // Handle potential undefined rows
      if (adjacencyMatrix[rowIndex]) {
        column.push(adjacencyMatrix[rowIndex][colIndex] || 0);
      } else {
        column.push(0);
      }
    }
    transposedMatrix.push(column);
  }
  const retainedChildren = [];
  for (let childIndex = 0; childIndex < transposedMatrix.length; childIndex++) {
    try {
      const childVector = transposedMatrix[childIndex];
      if (!childVector) continue;
      const sum = childVector.reduce((acc, val) => acc + (val || 0), 0);
      if (sum > 1 && verticesList[childIndex]) {
        retainedChildren.push({
          vertex: verticesList[childIndex],
          parentCount: sum,
          childVector,
        });
      }
    } catch (error) {
      console.error(`Error processing child index ${childIndex}:`, error);
    }
  }

  return retainedChildren;
}
/*
    Find valid composite vectors.
*/
function findValidCompositeVectors(filteredChildren, adjacencyMatrix) {
  if (!filteredChildren || !adjacencyMatrix) {
    console.error(
      "Invalid input: filteredChildren and adjacencyMatrix must be provided"
    );
    return [];
  }

  const validVectors = [];
  const vertexIndices = new Map(
    filteredChildren.map((vertex, index) => [vertex.uid, index])
  );

  const matrixSize = adjacencyMatrix.length;
  if (
    matrixSize === 0 ||
    filteredChildren.some((v) => !vertexIndices.has(v.uid))
  ) {
    console.error("Matrix dimensions do not match vertices list");
    return [];
  }

  for (let i = 0; i < filteredChildren.length; i++) {
    for (let j = i + 1; j < filteredChildren.length; j++) {
      const vertexA = filteredChildren[i];
      const vertexB = filteredChildren[j];

      const bitwiseResult = computeBitwiseAND(
        vertexA.childVector,
        vertexB.childVector
      );

      if (
        isValidComposite(
          vertexA.childVector,
          vertexB.childVector,
          bitwiseResult
        )
      ) {
        validVectors.push({
          name: generateCompositeName(vertexA, vertexB),
          parents: [vertexA, vertexB],
          vector: bitwiseResult,
        });
      }
    }
  }

  return validVectors;
}
/*
  	Computes bitwise AND between two vectors.
*/
function computeBitwiseAND(vector1, vector2) {
  if (!vector1 || !vector2 || vector1.length !== vector2.length) {
    console.error("Vectors must be of same length for bitwise AND");
    return [];
  }

  return vector1.map((val, idx) => val & vector2[idx]);
}
/*
    Checks if the result of "A AND B" is equal to vectors A and B.
*/
function isValidComposite(vectorA, vectorB, result) {
  const preservesA = vectorA.every((val, idx) => (val & result[idx]) === val);
  const preservesB = vectorB.every((val, idx) => (val & result[idx]) === val);

  return preservesA && preservesB;
}
/*
    Creates a name for the new vector.
*/
function generateCompositeName(vertexA, vertexB) {
  return `${vertexA.vertex.identifier},${vertexB.vertex.identifier}`;
}
/*
    Checks if the constraints of parent vectors are identical.
*/
function buildConstraintMatrixForVector(
  compositeVector,
  verticesList,
  arcsList
) {
  const matrix = [];
  const header = ["", compositeVector.name];
  matrix.push(header);

  const constraintMap = new Map();

  const rawMatrix = verticesList.map((parent) => {
    const constraints = compositeVector.parents.map((childObj) =>
      getConstraintBetween(parent.uid, childObj.vertex.uid, arcsList)
    );

    // Count non-zero constraints
    constraints.forEach((constraint) => {
      if (constraint !== "0") {
        constraintMap.set(constraint, (constraintMap.get(constraint) || 0) + 1);
      }
    });

    return [parent.identifier, constraints];
  });

  rawMatrix.forEach(([parentIdentifier, constraints]) => {
    const allZero = constraints.every((c) => c === "0");
    const noDuplicates = Array.from(constraintMap.values()).every(
      (count) => count <= 1
    );
    const value = allZero || noDuplicates ? "1" : "0";
    matrix.push([parentIdentifier, value]);
  });
  return matrix;
}
/*
    Gets the constraints between parent and child.
*/
function getConstraintBetween(parentUID, childUID, arcsList) {
  const arc = arcsList.find(
    (a) => a.fromVertexUID === parentUID && a.toVertexUID === childUID
  );
  if (!arc) return "0"; // No arc exists

  const constraint = arc.C;
  return constraint === "ε" ? "0" : constraint;
}

/*
          Phase 2 Functions
              - identifyBackedges
              - findMaximalAntecedentAndConsequent
              - findRestrictedPaths
              - findAllPaths
              - findAllPOS
*/

function verifyPhase2(validCompositeVectors, verticesList, arcsList, source) {
  const adjacencyMatrix = constructAdjacencyMatrix(verticesList, arcsList);
  const backEdges = identifyBackEdges(verticesList, adjacencyMatrix);

  console.log("backEdges", backEdges);

  const siblingGroups = getSiblingGroups(validCompositeVectors);

  console.log("siblingGroups", siblingGroups);

  const results = {
    isValid: true,
    message: "There exist POS Paths from all POS to each sibling.",
    violations: [],
  };

  for (const group of siblingGroups) {
    const posSets = {};

    for (const vertex of group) {
      posSets[vertex.uid] = findAllPOS(
        vertex.uid,
        verticesList,
        source,
        backEdges
      );
    }

    const POSall = new Set();
    for (const vertex of group) {
      posSets[vertex.uid].forEach((v) => POSall.add(v));
    }

    console.log("POSall", POSall);

    // Check each vertex in the group against all POS
    for (const vertex of group) {
      const { antecedent } = findMaximalAntecedentAndConsequent(
        vertex.uid,
        verticesList,
        adjacencyMatrix,
        backEdges,
        source
      );

      for (const w of POSall) {
        if (!antecedent.includes(w)) {
          results.isValid = false;
          results.violations.push({
            siblingGroup: group.map((v) => v.uid),
            vertex: vertex.uid,
            missingInAntecedent: w,
            posAll: Array.from(POSall),
            antecedent: antecedent,
          });
        }
      }
    }
  }

  if (!results.isValid) {
    results.message = "There are no POS Paths from all POS to each sibling.";
  }
  console.log(results.message);

  return results;
}
/**
		Finds all mMximal Antecedent and Maxilam Consequent set given for a given vertex x
 */
function findMaximalAntecedentAndConsequent(
  vertexUID,
  verticesList,
  adjacencyMatrix,
  backEdges,
  source
) {
  const vertexIndex = verticesList.findIndex((v) => v.uid === vertexUID);
  const sourceIndex = verticesList.findIndex((v) => v.uid === parseInt(source));

  if (vertexIndex === -1 || sourceIndex === -1) {
    return { antecedent: [], consequent: [] };
  }

  const antecedent = new Set();
  const visited = new Set();
  const path = [];

  function dfsFindPaths(current) {
    visited.add(current);
    path.push(verticesList[current].uid);

    if (current === vertexIndex) {
      path.forEach((v) => antecedent.add(v));
    } else {
      for (let i = 0; i < verticesList.length; i++) {
        if (adjacencyMatrix[current][i] === 1 && !visited.has(i)) {
          dfsFindPaths(i);
        }
      }
    }

    path.pop();
    visited.delete(current);
  }

  dfsFindPaths(sourceIndex);

  const consequent = new Set();
  const backEdgeOrigins = new Set(backEdges.map((edge) => edge.from));
  const consequentVisited = new Set();

  function dfsFindConsequent(current) {
    if (consequentVisited.has(current)) return;
    consequentVisited.add(current);

    for (let i = 0; i < verticesList.length; i++) {
      if (adjacencyMatrix[current][i] === 1) {
        const nextUID = verticesList[i].uid;

        // Add to consequent unless it's a back edge origin
        if (!backEdgeOrigins.has(nextUID)) {
          consequent.add(nextUID);
          dfsFindConsequent(i);
        } else {
          // Include the back edge target but don't traverse beyond
          consequent.add(nextUID);
        }
      }
    }
  }

  dfsFindConsequent(vertexIndex);

  console.log("antecedent", Array.from(antecedent).sort());
  console.log("consequent", Array.from(consequent).sort());

  return {
    antecedent: Array.from(antecedent).sort(),
    consequent: Array.from(consequent).sort(),
  };
}

/**
		Finds all POS  for a given vertex
 */
function findAllPOS(vertexUID, verticesList, source, backEdges) {
  const posSet = new Set();
  const vertexIndex = verticesList.findIndex((v) => v.uid === vertexUID);
  if (vertexIndex === -1) return [];

  const sourceInt = parseInt(source);
  posSet.add(sourceInt);

  backEdges.forEach((edge) => {
    posSet.add(edge.to);
  });

  return Array.from(posSet);
}

function getSiblingGroups(validCompositeVectors) {
  const groups = new Map();

  validCompositeVectors.forEach((vector) => {
    const key = vector.parents
      .map((p) => p.vertex.uid)
      .sort()
      .join("-");
    if (!groups.has(key)) {
      groups.set(key, new Set());
    }
    vector.parents.forEach((p) => groups.get(key).add(p.vertex));
  });

  return Array.from(groups.values()).map((group) => Array.from(group));
}

/*
          Utility Functions
          - constructAdjacencyMatrix:
          - identifyBackedges
					- R2isEmpty
*/
/*
		Constructs adjacency matrix given an list of vertices and arcs
 */
function constructAdjacencyMatrix(verticesList, arcsList) {
  const size = verticesList.length;
  const adjacencyMatrix = Array(size)
    .fill()
    .map(() => Array(size).fill(0));
  arcsList.forEach((arc) => {
    const fromIndex = verticesList.findIndex(
      (v) => v.uid === arc.fromVertexUID
    );
    const toIndex = verticesList.findIndex((v) => v.uid === arc.toVertexUID);

    if (fromIndex !== -1 && toIndex !== -1) {
      adjacencyMatrix[fromIndex][toIndex] = 1;
    }
  });
  return adjacencyMatrix;
}
/*
		Identifies back edges in the graph using DFS
 */
function identifyBackEdges(verticesList, adjacencyMatrix) {
  const backEdges = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(current) {
    if (recursionStack.has(current)) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);
    recursionStack.add(current);

    for (let i = 0; i < verticesList.length; i++) {
      if (adjacencyMatrix[current][i] === 1) {
        if (dfs(i)) {
          backEdges.push({
            from: verticesList[current].uid,
            to: verticesList[i].uid,
          });
        }
      }
    }

    recursionStack.delete(current);
    return false;
  }

  // Start DFS from each unvisited vertex
  for (let i = 0; i < verticesList.length; i++) {
    if (!visited.has(i)) {
      dfs(i);
    }
  }

  return backEdges;
}
/**
		Checks if RBS with centers exist
 */
function R2isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function extractRBSClusterConnections(vertexMap, arcs) {
  const rbsGroups = {};

  for (const arc of arcs) {
    const from = vertexMap[arc.fromVertexUID];
    if (from && from.isRBSCenter && isEpsilon(arc)) {
      if (!rbsGroups[arc.fromVertexUID]) {
        rbsGroups[arc.fromVertexUID] = new Set();
        rbsGroups[arc.fromVertexUID].add(arc.fromVertexUID);
      }
      rbsGroups[arc.fromVertexUID].add(arc.toVertexUID);
    }
  }

  const result = {};

  for (const [centerUID, vertexSet] of Object.entries(rbsGroups)) {
    const arcUIDs = new Set();
    const vertices = Array.from(vertexSet);

    for (const arc of arcs) {
      if (vertexSet.has(arc.fromVertexUID) && vertexSet.has(arc.toVertexUID)) {
        if (arc.uid) arcUIDs.add(arc.uid);
      }
    }

    result[centerUID] = {
      center: centerUID,
      vertexUIDs: vertices,
      arcUIDs: Array.from(arcUIDs),
    };
  }

  return result;
}
