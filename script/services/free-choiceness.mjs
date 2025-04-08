
/**
 * 
 * @param {{ 
 *      components: { uid, identifier }[],
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
 *          }
 *      }[]
 * }}
 */
export function verifyFreeChoiceness(model, source, sink, type) {
    // TODO: Implement free choiceness
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
                        description: "It's not able to choose freely lorem ipsum dolor sit amet."
                    },
                    criteria: [
                        {
                            pass: true,
                            description: "The constraints are valid"
                        },
                        {
                            pass: false,
                            description: "The L values are valid"
                        }
                    ],
                    violating: {
                        arcs: [],
                        vertices: [ 1, 2 ]
                    }
                }
            }
        ]
        
    };
}