import { utils } from './rdlt-utils.mjs';

/**
* @typedef {Object} ArcEntry
* @property {string} arc - The arc string "x, y"
* @property {number|string} lAttribute - The l-attribute (max traversals)
* @property {string} cAttribute - The c-attribute (constraint symbol or ε)
* @property {number} eRU - Effective reuse count
* @property {string} [rId] - Optional r-id
*/

/**
* Class representing an RDLT matrix and providing analysis operations.
*/
export class Matrix {
    /**
    * Create a Matrix for RDLT analysis.
    * @param {ArcEntry[]} R - List of arc entries (with arc, lAttribute, cAttribute, eRU, rId).
    * @param {{cycle: ArcEntry[], ca: ArcEntry[]}[]} cycleList - List of cycles with arcs and critical arcs.
    * @param {ArcEntry[]} [inList] - Optional list of incoming arcs.
    * @param {ArcEntry[]} [outList] - Optional list of outgoing arcs.
    */
    constructor(R, cycleList, inList = [], outList = []) {
        this._R_ = R;
        this.cycleList = cycleList;
        this.inList = inList;
        this.outList = outList;
        this.join_safe_violations = []
        this.loop_safe_violations = []
        this.safeCA_violations = []
        this.matrix_data = []  // This should be populated during evaluation
        this.violations = []  // This should be populated during evaluation
        this.l_safe_vector = null;
        this.matrixOperations = null;
        
        // Extract arcs and critical arcs from the cycle list
        const arcsInCycleList = this.cycleList.map(cycle => cycle.cycle);
        const caInCycleList = this.cycleList.map(cycle => cycle.ca); // Critical arcs
        
        console.log("CycleList: ", this.cycleList);
        
        // Extract arcs and build graph
        this.arcsList = R.map(r => r.arc);
        this.graph = utils.listToGraph(this.arcsList);
        
        // Extract vertices
        this.vertices = utils.extractVertices(this.arcsList);
        const { source, target } = utils.getSourceAndTargetVertices(R);
        this.source = source;
        this.sink = target;
        
        // Process cycles and critical arcs
        this.allAIC = [];  // all arcs in cycles
        this.allCA = [];   // all critical arcs
        
        arcsInCycleList.forEach(aicList => {
            console.log("Current AIC List: ", aicList);
            aicList.forEach(aic => {
                console.log("Processing AIC: ", aic);
                this.allAIC.push(aic['arc']);
            });
        });
        
        caInCycleList.forEach(cicList => {
            console.log("Current CA list: ", cicList);
            
            cicList.forEach(arcInfo => {
                let arc = arcInfo['arc'];
                console.log("Processing Critical Arc: ", arc);
                this.allCA.push(arc);
            });
        });
        
        // for (const { cycle, ca } of cycleList) {
        //     cycle.forEach(e => this.allAIC.push(e.arc));
        //     ca.forEach(e => this.allCA.push(e.arc));
        // }
        
        console.log("All arcs in cycles: ", this.allAIC);
        console.log("All Critical Arcs: ", this.allCA);
        
        // console.log("Input R: ", R);
        // Build the rdltStructure: [arc, x, y, l, c, eRU, cv, op, ocv, loopsafe, safeCA, joinsafe, rId]
        this.rdltStructure = this._R_.map(r => {
            const [x, y] = r.arc.split(', ').map(s => s.trim());
            const l = String(r["l-attribute"]);
            const c = String(r["c-attribute"]).replace(/^$/g, 'ε'); // replace empty string with epsilon
            const eru = String(r.eRU);
            let op = `${r["c-attribute"]}_${y}`.replace(/^_/, 'ε_'); // replace empty string with epsilon
            console.log("Setting op: " + op);
            return [r.arc, x, y, l, c, eru, 'cv_value', op, 'cycle_vector', 'loopsafe', 'ocv_value', 'safeCA', 'joinsafe', r["r-id"] || null];
        });
        console.log("RDLT Structure: ", this.rdltStructure);
        
        // Initialize vectors
        const n = this.rdltStructure.length;
        this.loopSafeVector = Array(n).fill(null).map(() => Array(1).fill(0));
        this.safeCAVector  = Array(n).fill(null).map(() => Array(1).fill(0));
        this.joinSafeVector = Array(n).fill(null).map(() => Array(1).fill(0));
    }
    
    /**
    * Get sign of symbolic element.
    * @param {string|number} element
    * @returns {number} 1 for positive, 0 for zero, -1 for negative
    */
    sign(element) {
        if (typeof element === 'string') {
            if (element === '0') return 0;
            if (element.includes('ε')) return 1;
            if (element.startsWith('-')) return -1;
        }
        return 1;
    }
    
    /**
    * Element-wise multiplication rule for cycle vector.
    * @param {number} A
    * @param {string|number} B
    * @returns {string|number}
    */
    elementMult(A, B) {
        if (A === 1) return B;
        if (A === -1) return `-${B}`;
        return B;
    }
    
    /**
    * Literal OR operation between two symbolic values.
    * @param {string} A
    * @param {string} B
    * @returns {string}
    */
    literalOR(A, B) {
        const sA = this.sign(A), sB = this.sign(B);
        if (A === B) return A;
        if (sB === 0) return A;
        if (sA === 0) return B;
        if (A === `-${B}` || B === `-${A}`) return sA === 1 ? A : B;
        return sB === 0 ? A : B;
    }
    
    /**
    * Evaluates the RDLT structure to check if it satisfies L-safeness criteria.
    */
    evaluateLSafeness(){
        const matrix = [];
        
        for(let r of this.rdltStructure){
            let cv, cyc = this.cycleVectorOperation(r);
            let ls = this.loopSafe(r, cv);
            let safeVector = this.outCycleVectorOperation(r);
            this.joinSafe();
            matrix.push([cv, cyc, ls, safeVector]);
        }
        
        // Check each safety condition independently
        const joinSafe = this.checkIfAllPositive("join");
        const loopSafe = this.checkIfAllPositive("loop");
        const safe = this.checkIfAllPositive("safe");
        
        // Only report Loop-Safe NCAs as not satisfied if there are actual violations
        if(!loopSafe && !this.loop_safe_violations){
            loopSafe = true;
        }
        
        if(joinSafe && loopSafe && safe){
            this.l_safe_vector = true;
        }
        else{
            this.l_safe_vector = false;
        }
        
        console.log(`JOIN-Safe: ${joinSafe ? 'Satisfied.' : 'Not Satisfied.'}`);
        console.log(`Loop-Safe NCAs: ${loopSafe ? 'Satisfied.' : 'Not Satisfied.'}`);
        console.log(`Safe CAs: ${safe ? 'Satisfied.' : 'Not Satisfied.'}\n`);
        
        this.matrixOperations = matrix;
        return { l_safe_vector: this.l_safe_vector, matrix};
    }

    /**
    * Evaluates the RDLT structure to check if it satisfies safeness of CAs and loop-safeness of NCAs.
    */
    evaluateSafeLoopSafe(){
        const matrix = [];
        
        for(let r of this.rdltStructure){
            let cv, cyc = this.cycleVectorOperation(r);
            let ls = this.loopSafe(r, cv);
            let safeVector = this.outCycleVectorOperation(r);
            this.joinSafe();
            matrix.push([cv, cyc, ls, safeVector]);
        }
        
        // Check each safety condition independently
        const loopSafe = this.checkIfAllPositive("loop");
        const safe = this.checkIfAllPositive("safe");
        
        // Only report Loop-Safe NCAs as not satisfied if there are actual violations
        if(!loopSafe && !this.loop_safe_violations){
            loopSafe = true;
        }
        
        let safeLoopSafe;
        if(loopSafe && safe){
            safeLoopSafe = true;
        }
        else{
            safeLoopSafe = false;
        }
        console.log(`Loop-Safe NCAs: ${loopSafe ? 'Satisfied.' : 'Not Satisfied.'}`);
        console.log(`Safe CAs: ${safe ? 'Satisfied.' : 'Not Satisfied.'}\n`);
        
        this.matrixOperations = matrix;
        return { pass: safeLoopSafe, matrix};
    }
    
    /**
    * Validates that no join-, loop-, or safe- checks produced negative results.
    * Records any loop- or safe- violations in their respective violation lists.
    *
    * @param {'join'|'loop'|'safe'} [checkType] - If provided, only returns that check's result.
    * @returns {boolean} True if all requested checks pass, false otherwise.
    */
    checkIfAllPositive(checkType) {
        let joinSafeResult = true;
        let loopSafeResult = true;
        let safeCAResult   = true;
        
        this.rdltStructure.forEach(row => {
            if (Array.isArray(row) && row.length > 12) {
                const arc       = row[0];
                const loopsafe  = row[9];   // Loop-safe value
                const safeCA    = row[11];  // Safe-CA value
                const joinSafe  = row[12];  // Join-safe value
                const rid       = row.length > 13 ? row[13] : null;
                
                // Join-safe violation?
                if (typeof joinSafe === 'string' && joinSafe.startsWith('-')) {
                    joinSafeResult = false;
                }
                
                // Loop-safe violation?
                if (typeof loopsafe === 'string' && loopsafe.startsWith('-')) {
                    // avoid duplicates
                    if (!this.loop_safe_violations.some(v => v.arc === arc)) {
                        this.loop_safe_violations.push({ arc, 'r-id': rid });
                    }
                    loopSafeResult = false;
                }
                
                // Safe-CA violation?
                if (typeof safeCA === 'string' && safeCA.startsWith('-')) {
                    if (!this.safeCA_violations.some(v => v.arc === arc)) {
                        this.safeCA_violations.push({ arc, 'r-id': rid });
                    }
                    safeCAResult = false;
                }
            }
        });
        
        switch (checkType) {
            case 'join': return joinSafeResult;
            case 'loop': return loopSafeResult;
            case 'safe': return safeCAResult;
            default:
            return joinSafeResult && loopSafeResult && safeCAResult;
        }
    }
    
    
    /**
    * Ensures join-safeness by enforcing multiple structural and logical rules on the RDLT.
    *
    * Returns true if the structure is JOIN-safe, false otherwise.
    */
    joinSafe() {
        // Reset previous violations
        this.join_safe_violations = [];
        let joinSafe = true;
        
        // Build lookup for incoming and outgoing arcs per vertex
        const vertexIncoming = {};
        const vertexOutgoing = {};
        
        for (const r of this._R_) {
            const [src, dst] = r.arc.split(', ').map(s => s.trim());
            if (!vertexOutgoing[src]) vertexOutgoing[src] = [];
            vertexOutgoing[src].push(dst);
            
            if (!vertexIncoming[dst]) vertexIncoming[dst] = [];
            vertexIncoming[dst].push(src);
        }
        
        // Identify valid join vertices: more than 1 incoming arc, not a source, and all bridges status match
        const joins = [];
        for (const [v, incoming] of Object.entries(vertexIncoming)) {
            if (incoming.length > 1 && !this.source.includes(v)) {
                const bridgeStatuses = incoming.map(src => {
                    const arc = `${src}, ${v}`;
                    return this.isBridge(arc)[0];  // boolean isBridge
                });
                if (new Set(bridgeStatuses).size === 1) {
                    joins.push(v);
                }
            }
        }
        
        // Identify split vertices: more than 1 outgoing arc, not a sink
        const splits = Object.entries(vertexOutgoing)
        .filter(([v, out]) => out.length > 1 && !this.sink.includes(v))
        .map(([v]) => v);
        
        const involvedArcs = new Set();
        const loggedViolations = new Set();
        
        // Helper: mark an arc as unsafe, record violation once
        const markArcUnsafe = (arc, violationType, details = {}) => {
            const arcData = this.findRByArc(arc) || {};
            const rId = arcData['r-id'] || null;
            const key = `${arc}|${rId}`;
            if (loggedViolations.has(key)) return;
            loggedViolations.add(key);
            involvedArcs.add(arc);
            this.join_safe_violations.push({
                violation: violationType,
                arc,
                'r-id': rId,
                ...details
            });
        };
        
        // Memoized path-finding
        const pathCache = new Map();
        const findAllPaths = (start, end, maxDepth = 10) => {
            const key = `${start}->${end}`;
            if (pathCache.has(key)) return pathCache.get(key);
            const results = [];
            const stack = [[start, [start]]];
            while (stack.length) {
                const [node, path] = stack.pop();
                if (node === end) {
                    results.push(path);
                    continue;
                }
                if (path.length >= maxDepth) continue;
                for (const nxt of vertexOutgoing[node] || []) {
                    if (!path.includes(nxt)) {
                        stack.push([nxt, path.concat(nxt)]);
                    }
                }
            }
            pathCache.set(key, results);
            return results;
        };
        
        // Validate each split->join path exists
        const validateSplitToJoinPath = (split, join) => {
            if (!joins.includes(join) || !vertexOutgoing[split]) return true;
            let ok = true;
            for (const dest of vertexOutgoing[split]) {
                const paths = findAllPaths(dest, join);
                if (!paths.length) {
                    markArcUnsafe(
                        `${split}, ${dest}`,
                        "Split-Join Violation: no path to join",
                        { split_origin: split, join_vertex: join }
                    );
                    ok = false;
                }
            }
            return ok;
        };
        
        // Ensure intermediate nodes don't stray outside the split-join path
        const checkIntermediateNodeConnections = (split, join, path) => {
            for (const v of path.slice(1, -1)) {
                for (const nxt of vertexOutgoing[v] || []) {
                    if (nxt !== join && !path.includes(nxt)) {
                        markArcUnsafe(
                            `${v}, ${nxt}`,
                            "External Connection Violation: stray arc",
                            { split_origin: split, join_vertex: join }
                        );
                        return false;
                    }
                }
            }
            return true;
        };
        
        // Validate that joins only receive arcs from valid split paths
        const validateJoinInputs = (joinV) => {
            if (!joins.includes(joinV)) return true;
            // Collect valid splits that reach this join
            const validPaths = {};
            for (const split of splits) {
                const paths = findAllPaths(split, joinV);
                if (paths.length) validPaths[split] = paths;
            }
            if (!Object.keys(validPaths).length) return false;
            
            // Gather all valid arcs
            const validArcs = new Set();
            for (const paths of Object.values(validPaths)) {
                for (const p of paths) {
                    for (let i = 0; i < p.length - 1; i++) {
                        validArcs.add(`${p[i]}, ${p[i+1]}`);
                    }
                }
            }
            
            let ok = true;
            // Check join incoming
            for (const src of vertexIncoming[joinV] || []) {
                const arc = `${src}, ${joinV}`;
                if (!validArcs.has(arc)) {
                    markArcUnsafe(
                        arc,
                        "Invalid Join Input: arc not in valid paths",
                        { join_vertex: joinV, invalid_source: src }
                    );
                    ok = false;
                }
            }
            // Check intermediate stray arcs
            const validVertices = new Set([...validArcs].flatMap(a => a.split(', ')).concat(joinV));
            for (const v of validVertices) {
                if (v === joinV || Object.keys(validPaths).includes(v)) continue;
                for (const src of vertexIncoming[v] || []) {
                    const arc = `${src}, ${v}`;
                    if (!validArcs.has(arc)) {
                        markArcUnsafe(
                            arc,
                            "Process Interruption: stray incoming arc",
                            { intermediate_vertex: v, external_source: src }
                        );
                        ok = false;
                    }
                }
                for (const dst of vertexOutgoing[v] || []) {
                    const arc = `${v}, ${dst}`;
                    if (!validArcs.has(arc)) {
                        markArcUnsafe(
                            arc,
                            "Unauthorized Branching: stray outgoing arc",
                            { intermediate_vertex: v, external_destination: dst }
                        );
                        ok = false;
                    }
                }
            }
            // Ensure all splits' outgoing arcs lead to join
            for (const split of Object.keys(validPaths)) {
                for (const dest of vertexOutgoing[split]) {
                    const direct = `${split}, ${dest}`;
                    const leads = validPaths[split].some(p => p[0] === split && p[1] === dest);
                    if (!leads) {
                        markArcUnsafe(
                            direct,
                            "Disconnected Path: split arc not reaching join",
                            { split_vertex: split, join_vertex: joinV, disconnected_destination: dest }
                        );
                        ok = false;
                    }
                }
            }
            return ok;
        };
        
        // Classify join type based on C-attributes of incoming arcs
        const classifyJoinType = (joinV) => {
            const conds = {};
            for (const src of vertexIncoming[joinV] || []) {
                const arc = `${src}, ${joinV}`;
                const row = this.rdltStructure.find(r => r[0] === arc);
                conds[arc] = row ? row[4] : null;
            }
            const eps = Object.values(conds).filter(c => c === 'ε' || c === '0');
            const nonEps = Object.values(conds).filter(c => c && c !== 'ε' && c !== '0');
            if (!eps.length && nonEps.length) return "AND-JOIN";
            if (eps.length && nonEps.length) return "MIX-JOIN";
            if (eps.length && !nonEps.length) return "OR-JOIN";
            if (new Set(Object.values(conds)).size === 1) return "OR-JOIN";
            return "OR-JOIN";
        };
        
        // Check for duplicate or incorrect C-conditions based on join type
        const checkDuplicateConditions = (joinV) => {
            const type = classifyJoinType(joinV);
            const conds = {};
            for (const src of vertexIncoming[joinV] || []) {
                const arc = `${src}, ${joinV}`;
                const row = this.rdltStructure.find(r => r[0] === arc);
                conds[arc] = row ? row[4] : null;
            }
            let ok = true;
            if (type === "AND-JOIN") {
                const freq = {};
                for (const [arc, c] of Object.entries(conds)) {
                    if (c && c !== 'ε' && c !== '0') freq[c] = (freq[c]||0) + 1;
                }
                for (const [c, count] of Object.entries(freq)) {
                    if (count > 1) {
                        Object.entries(conds).filter(([a, cc]) => cc === c).slice(1).forEach(([arc]) => {
                            markArcUnsafe(
                                arc,
                                "Duplicate Condition in AND-JOIN",
                                { join_vertex: joinV, condition: c }
                            );
                            ok = false;
                        });
                    }
                }
            }
            if (type === "MIX-JOIN") {
                const nonEpsSet = new Set(Object.values(conds).filter(c => c && c !== 'ε' && c !== '0'));
                if (nonEpsSet.size > 1) {
                    const ref = [...nonEpsSet][0];
                    for (const [arc, c] of Object.entries(conds)) {
                        if (c && c !== 'ε' && c !== ref) {
                            markArcUnsafe(
                                arc,
                                "Different Non-Epsilon Conditions in MIX-JOIN",
                                { join_vertex: joinV, expected_condition: ref, actual_condition: c }
                            );
                            ok = false;
                        }
                    }
                }
            }
            if (type === "OR-JOIN") {
                const uniq = new Set(Object.values(conds));
                if (uniq.size > 1) {
                    const ref = [...uniq].reduce((a,b) =>
                        Object.values(conds).filter(c=>c===a).length >
                    Object.values(conds).filter(c=>c===b).length ? a : b
                );
                for (const [arc, c] of Object.entries(conds)) {
                    if (c !== ref) {
                        markArcUnsafe(
                            arc,
                            "Different Conditions in OR-JOIN",
                            { join_vertex: joinV, expected_condition: ref, actual_condition: c }
                        );
                        ok = false;
                    }
                }
            }
        }
        return ok;
    };
    
    // Ensure AND-JOINs have equal L-values
    const checkEqualLValues = (joinV) => {
        if (classifyJoinType(joinV) !== "AND-JOIN") return true;
        const lvals = {};
        for (const src of vertexIncoming[joinV] || []) {
            const arc = `${src}, ${joinV}`;
            const row = this.rdltStructure.find(r => r[0] === arc);
            if (row) lvals[arc] = row[3];
        }
        const uniq = new Set(Object.values(lvals));
        if (uniq.size > 1) {
            const ref = [...uniq].reduce((a,b) =>
                Object.values(lvals).filter(v=>v===a).length >
            Object.values(lvals).filter(v=>v===b).length ? a : b
        );
        for (const [arc, lv] of Object.entries(lvals)) {
            if (lv !== ref) {
                markArcUnsafe(
                    arc,
                    "Unequal L-values in AND-JOIN",
                    { join_vertex: joinV, expected_l_value: ref, actual_l_value: lv }
                );
                return false;
            }
        }
    }
    return true;
};

    // Check loop-safeness or safeCA based on join type
    const checkLoopSafety = (joinV) => {
        const type = classifyJoinType(joinV);
        for (const r of this.rdltStructure) {
            const arc = r[0];
            const [, dst] = arc.split(', ').map(s => s.trim());
            if (dst === joinV) {
                if (type === "OR-JOIN") {
                    const safeCA = r[11];
                    if (typeof safeCA === 'string' && safeCA.startsWith('-')) {
                        markArcUnsafe(
                            arc,
                            "SafeCA Violation in OR-JOIN",
                            { join_vertex: joinV, safe_ca_value: safeCA }
                        );
                        return false;
                    }
                } else {
                    const ls = r[9];
                    if (typeof ls === 'string' && ls.startsWith('-')) {
                        markArcUnsafe(
                            arc,
                            `Loop-Safe Violation in ${type}`,
                            { join_vertex: joinV, loop_safe_value: ls }
                        );
                        return false;
                    }
                }
            }
        }
        return true;
    };

    // Main enforcement loops
    for (const join of joins) {
        if (!validateJoinInputs(join)) joinSafe = false;
        if (!checkDuplicateConditions(join)) joinSafe = false;
        if (!checkEqualLValues(join)) joinSafe = false;
        if (!checkLoopSafety(join)) joinSafe = false;
    }
    for (const split of splits) {
        for (const join of joins) {
            if (!validateSplitToJoinPath(split, join)) {
                joinSafe = false;
                continue;
            }
            for (const path of findAllPaths(split, join)) {
                if (!checkIntermediateNodeConnections(split, join, path)) {
                    joinSafe = false;
                }
            }
        }
    }

    // Update join-safe vector in the RDLT structure
    this.rdltStructure.forEach(r => {
        console.log("r is: ", r);
        const arc = r[0];
        const js = involvedArcs.has(arc) ? -1 : 1;
        r[12] = this.elementMult(js, r[7]);
    });

    return joinSafe;
    }


    /**
    * Determine if an arc is a bridge (exists in In_List or Out_List).
    *
    * @param {string} arc - The arc string to check.
    * @returns {[boolean, string]} Tuple where:
    *   - first element is true if the arc is in In_List or Out_List, false otherwise
    *   - second element is "bridge" if true, "non-bridge" if false
    */
    isBridge(arc) {
        if (this.In_List && this.Out_List) {
            if (this.In_List.includes(arc) || this.Out_List.includes(arc)) {
                return [true, "bridge"];
            }
        }
        return [false, "non-bridge"];
    }

    /**
    * Searches for the RDLT component corresponding to a given arc.
    *
    * This method iterates through the RDLT structure and checks each component to
    * find the one that matches the provided arc. If the arc is found, the corresponding
    * RDLT component is returned. If the arc is not found, it returns null.
    *
    * @param {string} arc - The arc to search for in the RDLT structure.
    * @returns {Object|null} The RDLT component that corresponds to the given arc,
    *                        or null if no matching arc is found.
    */
    findRByArc(arc) {
        // Use Array.prototype.find for brevity; fallback to explicit loop if preferred
        const result = this._R_.find(r => r.arc === arc);
        return result || null;
    }  

    /**
    * Performs out-cycle vector operations for the given arc row.
    * This updates the OutCycleVector and computes the SafeCA value.
    *
    * @param {Array} r - The current arc data row.
    * @returns {string|number} The SafeCA value after processing.
    */
    outCycleVectorOperation(r) {
        // Step 1: Group arcs by their start vertex
        const startMap = {};
        this.rdltStructure.forEach(row => {
            const sv = row[1];
            if (!startMap[sv]) startMap[sv] = [];
            startMap[sv].push(row);
        });
        console.log("Start vertex to arcs: ", startMap);
        
        // Step 2: Determine ocv for this arc
        let ocv = 0;
        if (r[6] === -1) { // part of a critical cycle
            const arcsFrom = startMap[r[1]] || [];
            const hasNonCrit = arcsFrom.some(a =>
                a[0] !== r[0] && a[6] !== -1
            );
            ocv = hasNonCrit ? 1 : -1;
        } else if (this.allAIC.includes(r[0])) {
            // non-critical cycle arc
            ocv = 1;
        } else {
            ocv = 0;
        }
        
        // Step 3 & 4: Update OutCycleVector (col 10) and multiply by C-attribute (col 7)
        r[10] = this.elementMult(ocv, r[7]);
        
        // Step 5: Compute SafeCA by OR-ing new OutCycleVector (col 10) with existing CycleVector (col 8)
        r[11] = this.literalOR(r[10], r[8]);
        console.log("Evaluating literal OR of the following: ", r[10], r[8]);
        
        // Step 6: Return the SafeCA value
        return r[11];
    }


    /**
    * Determines loop-safeness for a given arc row.
    *
    * @param {Array} r - The arc data row.
    * @param {number} cv - The cycle value for this arc (−1, 0, or 1).
    * @returns {any} The final loop-safe result after element-wise multiplication.
    */
    loopSafe(r, cv) {
        let ls = 0;
        console.log("Chceking for the arc data: ", r);
        
        // Only non-critical cycle arcs (cv === 1) are checked for loop-safeness
        if (cv === 1) {
            const lAttr = parseInt(r[3], 10); // L-attribute stored in column 3
            const eRU   = parseInt(r[5], 10); // eRU stored in column 5
            
            if (lAttr > eRU) {
                ls = 1;    // loop-safe
            } else {
                ls = -1;   // not loop-safe
                // this.loop_safe_violations.push(r[0]); // optional: log violation arc ID
            }
        }
        
        // Temporarily store raw loop-safe marker (unused further)
        r[9] = ls;
        
        // Combine with the existing base value (r[7]) via element-wise multiplication
        const loopsafeResult = this.elementMult(ls, r[7]);
        r[9] = loopsafeResult;  // final loop-safe entry in column 9
        console.log("Column 9: ", r[9]);
        
        return loopsafeResult;
    }


    /**
    * Verify Classical Soundness: if L-safe and activity extraction reaches sink.
    * @returns {{classicalSound: boolean, lSafe: boolean}}
    */
    verifyClassicalSoundness() {
        const lSafe = this.isLSafe();
        if (!lSafe) return { classicalSound: false, lSafe };
        // attempt a single activity extraction
        const profile = this.extractActivity();
        const reachesSink = profile.length > 0 && profile[profile.length - 1].some(a => a[0] === this.sink);
        return { classicalSound: reachesSink, lSafe };
    }

    /**
    * Targeted activity extraction that halts on deadlock.
    * Returns the sequence of reachability configs or [] on failure.
    */
    extractActivity() {
        // simple DFS with loop bound L, early exit on deadlock or reaching sink
        const visitedCounts = {};
        const result = [];
        const dfs = (v, path) => {
            if (v === this.sink) {
                result.push([...path]);
                return true;
            }
            const outs = this.graph[v] || [];
            for (const w of outs) {
                const arc = `${v}, ${w}`;
                const cnt = visitedCounts[arc] || 0;
                const L = parseInt(this.rdltStructure.find(r => r[0] === arc)[3], 10);
                if (cnt >= L) continue;
                visitedCounts[arc] = cnt + 1;
                path.push([arc]);
                if (dfs(w, path)) return true;
                path.pop();
            }
            return false;
        };
        dfs(this.source, []);
        return result;
    }

    /**
    * Retrieves and logs violations found during L-safeness checks.
    *
    * @returns {Array<Object>} The list of formatted violation details.
    */
    getViolations() {
        // Reset stored violations
        this.violations = [];
        const seenViolations = new Set();
        
        // Process JOIN-Safeness Violations
        if (this.join_safe_violations.length) {
            this.join_safe_violations.forEach(v => {
                const arc = v.arc || 'Unknown';
                const rid = v['r-id'] || 'Unknown';
                const compositeKey = `${arc}|${rid}`;
                
                if (!seenViolations.has(compositeKey)) {
                    seenViolations.add(compositeKey);
                    
                    const details = {
                        type: 'JOIN-Safeness',
                        split_origin: v.split_origin || 'Unknown',
                        join_vertex: v.join_vertex || 'Unknown',
                        problematic_arc: v.problematic_arc || arc,
                        'r-id': rid,
                        arc,
                        violation: v.violation || 'JOIN-Safeness'
                    };
                    this.violations.push(details);
                    
                    console.log('\nJOIN-Safeness Violation:');
                    console.log(`  r-id: ${details['r-id']}`);
                    console.log(`  arc: ${this.convertArcFormat(details.arc)}`);
                    console.log(`  Violation: ${details.violation}`);
                }
            });
        }
        
        // Process Loop-Safeness Violations
        if (this.loop_safe_violations.length) {
            this.loop_safe_violations.forEach(v => {
                const arc = v.arc || 'Unknown';
                const rid = v['r-id'] || 'Unknown';
                const details = {
                    type: 'Loop-Safeness',
                    arc,
                    'r-id': rid
                };
                this.violations.push(details);
                
                console.log('\nLoop-Safeness Violation:');
                console.log(`  arc: ${this.convertArcFormat(arc)}`);
                console.log(`  r-id: ${rid}`);
            });
        }
        
        // Process Safeness of Critical Arcs (CAs) Violations
        if (this.safeCA_violations.length) {
            this.safeCA_violations.forEach(v => {
                const arc = v.arc || 'Unknown';
                const rid = v['r-id'] || 'Unknown';
                const details = {
                    type: 'Safeness of Critical Arcs',
                    arc,
                    'r-id': rid
                };
                this.violations.push(details);
                
                console.log('\nSafeness Violation:');
                console.log(`  arc: ${this.convertArcFormat(arc)}`);
                console.log(`  r-id: ${rid}`);
            });
        }
        
        // Final summary
        if (!this.violations.length) {
            console.log('\nNo violations found. The RDLT structure is L-safe.');
        } else {
            console.log(`\nFound ${this.violations.length} violations in total.`);
        }
        
        return this.violations;
    }


    /**
    * Handles the cycle-vector operation for a given arc row,
    * updating the rdltStructure in-place and returning the cycle value.
    *
    * @param {Array} r - The current arc data row.
    * @returns {[number, string|number]} A tuple [cv, cyc] where:
    *   - cv is the cycle value (-1 for critical, 1 for non-critical, 0 otherwise)
    *   - cyc is the result of element-wise multiplication of cv and the base value r[7]
    */
    cycleVectorOperation(r) {
        console.log("cycleVectorOperation called with r:", r);
        let B = 0;
        // Is the arc in a cycle at all?
        if (this.allAIC.includes(r[0])) {
            // Critical arcs get -1, others in-cycle get +1
            B = this.allCA.includes(r[0]) ? -1 : 1;
        } else {
            B = 0;
        }
        
        const cv = B;
        // Column 6 holds the raw cycle value
        r[6] = cv;
        console.log("Column 6 holds raw cycle value: ", cv);
        
        // Column 8 = elementMult(cv, baseValue col 7)
        r[8] = this.elementMult(cv, r[7]);
        const cyc = r[8];
        console.log("Column 8 elementMult (cv, baseValue col 7): ", cyc);
        
        return [cv, cyc];
    }

    /**
    * Prints a concise view of the RDLT structure to the console.
    * Only the arc, c-attribute, l-attribute, loop-safe, safe, and join-safe columns are shown.
    */
    printMatrix() {
        const cols = [0, 3, 5, 9, 11, 12];
        this.rdltStructure.forEach(row => {
            // Extract only the requested columns
            const filtered = cols
            .filter(c => c < row.length)
            .map(c => row[c]);
            // Format the arc string and prepend it
            const formattedArc = this.convertArcFormat(filtered[0]);
            console.log([formattedArc, ...filtered.slice(1)]);
        });
    }

    /**
    * Converts an arc string "x, y" to the format "(x, y)".
    *
    * @param {string} arc - The arc in "x, y" format.
    * @returns {string} The arc in "(x, y)" format.
    */
    convertArcFormat(arc) {
        const [x, y] = arc.split(', ');
        return `(${x}, ${y})`;
    }
}
