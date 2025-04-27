/**
* RDLT Join Analysis Module - JavaScript ES Module Port
*
* Provides functionality for analyzing JOIN patterns in an RDLT.
* Focuses on identifying, grouping, and analyzing arcs that share the same target vertex,
* which represent JOIN patterns in the RDLT.
*/

export class TestJoins {
    /**
    * Extracts the target vertex from the given arc string.
    * @param {string} arc - A string representing an arc, formatted as "start, end".
    * @returns {string} The target vertex extracted from the arc.
    */
    static getTargetVertex(arc) {
        const parts = arc.split(', ');
        return parts[parts.length - 1];
    }
    
    /**
    * Groups arcs in R2 by their target vertex and assigns a 'joinId' to each group.
    * @param {Array<{arc: string}>} R2 - List of objects each containing an 'arc' key.
    * @returns {Array<{joinId: string, joinArcs: string[]}>} Array of groups with joinId and corresponding arcs.
    */
    static groupArcsByTargetVertex(R2) {
        const targetVertexGroups = {};
        
        for (const r of R2) {
            const targetVertex = TestJoins.getTargetVertex(r.arc);
            if (!targetVertexGroups[targetVertex]) {
                targetVertexGroups[targetVertex] = [];
            }
            targetVertexGroups[targetVertex].push(r.arc);
        }
        
        return Object.entries(targetVertexGroups).map(([vertex, arcs], idx) => ({
            joinId: `j${idx + 1}-${vertex}`,
            joinArcs: arcs
        }));
    }
    
    /**
    * Checks if arcs in R2 with the same target vertex have consistent c-attributes.
    * Based on this check, decides whether to use only R1 data or combine R1 and R2 data.
    * @param {Array<object>} R1 - Arcs and attributes from the R1 structure.
    * @param {Array<object>} R2 - Arcs and attributes from the R2 structure.
    * @returns {Array<object>} R1 if all c-attributes are consistent (OR-JOINs), otherwise R1.concat(R2).
    */
    static checkSimilarTargetVertexAndUpdate(R1, R2) {
        const groups = TestJoins.groupArcsByTargetVertex(R2);
        let allGroupsSame = true;
        
        for (const group of groups) {
            const cAttrs = new Set(
                R2.filter(r => group.joinArcs.includes(r.arc))
                .map(r => r['c-attribute'])
            );
            if (cAttrs.size > 1) {
                allGroupsSame = false;
                break;
            }
        }
        
        return allGroupsSame ? R1 : R1.concat(R2);
    }
    
    /**
    * Prints updated data for debugging: arcs, vertices, c-attributes, l-attributes, and eRU.
    * @param {Array<object>} data - List of arc objects with their associated attributes.
    */
    static printUpdatedData(data) {
        const arcs = data.map(item => item.arc);
        const vertices = [...new Set(arcs.map(arc => arc.split(', ').pop()))];
        const cAttrs = data.map(item => item['c-attribute'] ?? 'N/A');
        const lAttrs = data.map(item => item['l-attribute'] ?? 'N/A');
        const erus = data.map(item => item.eRU ?? 'N/A');
        
        console.log(`Arcs List (${data.length}):`, arcs);
        console.log(`Vertices List (${vertices.length}):`, vertices);
        console.log(`C-attribute List (${data.length}):`, cAttrs);
        console.log(`L-attribute List (${data.length}):`, lAttrs);
        console.log(`eRU List (${data.length}):`, erus);
    }
}
