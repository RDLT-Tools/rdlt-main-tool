import { processRDLT, verify } from "./well-handledness/src/Main.js";

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
  const { isWellHandled, Violations, activityProfile } = verify(RDLT, R1, R2);

  console.log("Verification complete");

  let result = {
    title: "Well-Handledness",
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
              pass: Violations["Loop safe NCAs"].length === 0,
              description:
                Violations["Loop safe NCAs"].length === 0
                  ? "RDLT has loop-safe NCAs"
                  : "RDLT has loop-unsafe NCAs",
            },
            {
              pass: Violations["Safe CAs"].length === 0,
              description:
                Violations["Safe CAs"].length === 0
                  ? "RDLT has safe CAs"
                  : "RDLT has unsafe CAs",
            },
            {
              pass: Violations["Equal L-values at AND joins"].length === 0,
              description:
                Violations["Equal L-values at AND joins"].length === 0
                  ? "RDLT has equal L-values at its AND joins"
                  : "RDLT has unequal L-values at its AND joins",
            },
            {
              pass: Violations["Not loop safe components"].length === 0,
              description:
                Violations["Not loop safe components"].length === 0
                  ? "All components are loop-safe"
                  : "A not loop-safe component was found",
            },
            {
              pass: Violations["Not balanced"].length === 0,
              description:
                Violations["Not balanced"].length === 0
                  ? "RDLT is balanced"
                  : "RDLT is not balanced",
            },
          ],
          violating: {
            arcs: [
              ...Violations["Loop safe NCAs"],
              ...Violations["Safe CAs"],
              ...Violations["Equal L-values at AND joins"],
              ...Violations["Not loop safe components"],
            ].map((obj) => obj.id),
            vertices: [...Violations["Not balanced"]].map((obj) => obj.uID),
          },
        },
      },
    ],
  };

  return { activityProfile, result };
}
