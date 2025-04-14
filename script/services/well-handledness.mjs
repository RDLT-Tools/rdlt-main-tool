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

  return {
    title: "Free-Choiceness",
    instances: [
      {
        name: "Main Model",
        evaluation: {
          conclusion: {
            pass: false,
            title: "The model is NOT free-choice",
            description:
              "It's not able to choose freely lorem ipsum dolor sit amet.",
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
