import { processRDLT, verify } from "./Well-handledness/src/Main.js";

/**
 *
 * @param {{
 *      vertices: { uid, identifier }[],
 *      arcs: { uid, fromVertexUID, toVertexUID }[]
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
export function verifyWellHandledness(model, source, sink, type) {
  // TODO: Implement free choiceness
  console.log("Clicked verification button for well-handledness");
  console.log({ model, source, sink, type });
  const { RDLT, R1, R2 } = processRDLT(model);
  console.log("RDLT:", RDLT);
  console.log("R1:", R1);
  console.log("R2:", R2);
  const isWellHandled = verify(R1, R2);

  console.log("Verification complete");

  return {
    title: "Well-Handlednessg",
    instances: [
      {
        name: "Main Model",
        evaluation: {
          conclusion: {
            pass: isWellHandled,
            title: isWellHandled
              ? "The model is well-handled"
              : "The model is NOT well-handled",
            description: isWellHandled
              ? "The model satisfies well-handledness criteria."
              : "The model violates well-handledness criteria.",
          },
          criteria: [
            {
              pass: true,
              description: "The constraints are valid",
            },
            {
              pass: false,
              description: "The L values are valid",
            },
          ],
          violating: {
            arcs: [],
            vertices: [1, 2],
          },
        },
        // for MAS only
        model: {
          vertices: [1, 2, 3, 4],
          arcs: [1, 2, 3],
        },
      },
    ],
  };
}
