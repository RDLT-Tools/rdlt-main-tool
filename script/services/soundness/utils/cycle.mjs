import { utils } from './rdlt-utils.mjs';

/**
* Cycle detection and analysis for RDLTs
*/
export class Cycle {
	constructor(R) {
		this.R = R;
		this.arcsList = [];
		this.verticesList  = [];
		this.processedArcs = [];
		this.processArcs();
		this.graph = this.listToGraph(this.arcsList);
		this.global_cycle_counter = 0;
		this.cycleList = [];
		this.critical_arcs = [];
		this.eRU_list = [];
	}
	
	/**
	* Processes the arcs in this.R and populates this.arcsList and this.verticesList.
	*
	* Each arc entry in this.R should have:
	*   - "arc": {string} in the format "start, end"
	*   - "r-id": {string|number} identifier
	*
	* @throws {TypeError} If this.R is neither an array nor an object mapping to arrays.
	* @returns {{arcsList: Array<[string, string, string]>, verticesList: string[]}}
	*   - arcsList: Array of tuples [r-id, startVertex, endVertex]
	*   - verticesList: Array of unique vertex names
	*/
	processArcs() {
		this.processingLog = [];
		
		let arcList;
		if (Array.isArray(this.R)) {
			arcList = this.R;
		} else if (this.R && typeof this.R === 'object') {
			// Flatten all arrays in the object
			arcList = Object.values(this.R).flat();
		} else {
			throw new TypeError(`Expected R to be an array or object, found ${typeof this.R}.`);
		}
		
		for (const entry of arcList) {
			const arc = entry['arc'];
			const rId = entry['r-id'];
			if (typeof arc === 'string' && (typeof rId === 'string' || typeof rId === 'number')) {
				const [startVertex, endVertex] = arc.split(', ');
				this.arcsList.push([rId, startVertex, endVertex]);
				this.processingLog.push(entry);
			}
		}
		
		// Extract unique vertices
		const verts = new Set();
		for (const [, start, end] of this.arcsList) {
			verts.add(start);
			verts.add(end);
		}
		this.verticesList = Array.from(verts);
		
		return {
			arcsList: this.arcsList,
			verticesList: this.verticesList
		};
	}
	
	listToGraph(edgeList) {
		const graph = {};
		edgeList.forEach(([rid, s, t]) => {
			graph[s] = graph[s] || [];
			graph[s].push(t);
		});
		return graph;
	}
	
	findRByArc(arcStr) {
		return this.R.find(e => e.arc === arcStr) || null;
	}
	
	findCycles(adj) {
		const incoming = {};
		Object.entries(adj).forEach(([u, nbrs]) => {
			nbrs.forEach(v => {
				incoming[v] = incoming[v] || [];
				incoming[v].push(u);
			});
		});
		
		const visited = new Set();
		let path = [];
		let pathSet = new Set();
		const cycles = [];
		
		const isSame = (c1, c2) => {
			if (c1.length !== c2.length) return false;
			const s1 = c1.map(a=>`${a[0]},${a[1]}`);
			const s2 = c2.map(a=>`${a[0]},${a[1]}`);
			const dbl = s2.concat(s2);
			return dbl.some((_,i)=>s1.every((v,j)=>v===dbl[i+j]));
		};
		
		const dfs = node => {
			if (pathSet.has(node)) {
				const idx = path.indexOf(node);
				const cyc = path.slice(idx);
				const pairs = [];
				for (let i=0;i<cyc.length-1;i++) pairs.push([cyc[i],cyc[i+1]]);
				pairs.push([cyc[cyc.length-1], node]);
				if (!cycles.some(c=>isSame(c,pairs))) cycles.push(pairs);
				return;
			}
			path.push(node); pathSet.add(node);
			if (!visited.has(node)) visited.add(node);
			(adj[node]||[]).forEach(n=>dfs(n));
			path.pop(); pathSet.delete(node);
		};
		
		// start from join points
		Object.entries(incoming).filter(([,ps])=>ps.length>1).forEach(([n])=>{if(adj[n])dfs(n);} );
		Object.keys(adj).forEach(n=>{if(!visited.has(n))dfs(n);} );
		
		return cycles;
	}
	
	/**
	* Main method: finds and stores cycles with critical arcs and eRU
	* @returns {Array<Object>} cycleList
	*/
	storeToCycleList() {
		const cycles = this.findCycles(this.graph);
		this.cycleList = [];
		
		// Identify join points: vertices with multiple incoming arcs
		const incoming = {};
		this.arcsList.forEach(({ start, end }) => {
			incoming[end] = incoming[end] || [];
			incoming[end].push(start);
		});
		const joinPoints = Object.fromEntries(
			Object.entries(incoming).filter(([, sources]) => sources.length > 1)
		);
		
		cycles.forEach((cycleArcs, idx) => {
			// Convert raw cycle arcs to full R entries
			const cycleR = cycleArcs
			.map(([s, e]) => this.findRByArc(`${s}, ${e}`))
			.filter(r => r)
			.map(r => ({ ...r }));
			if (!cycleR.length) return;
			
			// Build connectivity graph for this cycle
			const cycleGraph = {};
			const cycleVertices = new Set();
			cycleR.forEach(arc => {
				const [s, e] = arc.arc.split(', ');
				cycleVertices.add(s);
				cycleVertices.add(e);
				if (!cycleGraph[s]) cycleGraph[s] = new Set();
				cycleGraph[s].add(e);
			});
			
			// Consolidate joins
			let consolidated = [...cycleR];
			[...cycleVertices]
			.filter(v => v in joinPoints)
			.forEach(join => {
				const currentIn = consolidated.filter(a => a.arc.endsWith(`, ${join}`));
				joinPoints[join].forEach(source => {
					if (currentIn.some(a => a.arc.startsWith(`${source}, `))) return;
					const rArc = this.findRByArc(`${source}, ${join}`);
					if (rArc && cycleVertices.has(source)) {
						if ([...cycleVertices].some(start =>
							start !== source && this.isConnected(cycleGraph, start, source)
						)) {
							consolidated.push({ ...rArc });
							cycleGraph[source] = cycleGraph[source] || new Set();
							cycleGraph[source].add(join);
						}
					}
				});
			});
			
			// Compute min L and critical arcs
			const lVals = consolidated
			.map(a => parseInt(a['l-attribute'], 10))
			.filter(n => !isNaN(n));
			if (!lVals.length) return;
			const minL = Math.min(...lVals);
			const critical = consolidated.filter(a => parseInt(a['l-attribute'], 10) === minL)
			.map(a => ({ ...a }));
			
			// Assign eRU and store
			const cycleId = `c-${this.cycleList.length + 1}`;
			consolidated.forEach(a => { a.eRU = minL; });
			this.cycleList.push({ 'cycle-id': cycleId, cycle: consolidated, ca: critical });
		});
		
		return this.cycleList;
	}
	
	/**
	* Evaluates cycles in the RDLT and returns them in human-readable form.
	*
	* This is the main entry point for cycle analysis. It:
	* 1. Populates this.cycleList by calling this.storeToCycleList()
	* 2. Formats each cycle and its critical arcs for readability
	* 3. Returns the formatted cycles as a structured array
	*
	* @returns {Array<Object>} An array of cycle objects, each with:
	*   - cycle-id: {string} A unique identifier for the cycle
	*   - cycle: {string[]} Array of formatted arc strings ("r-id: arc")
	*   - ca: {string[]} Array of formatted critical arc strings
	*
	* Notes:
	* - If no cycles are found, returns an empty array.
	* - Arc strings are formatted via this.formatReadableR().
	*/
	evaluateCycle() {
		// 1. Build the raw cycle list
		this.storeToCycleList();
		
		// 2. Format each cycle and its critical arcs
		console.log("(cycle.mjs) Cycle List: ", this.cycleList);
		
		const formattedCycles = this.cycleList
		.filter(cycle => Array.isArray(cycle.cycle) && cycle.cycle.length > 0)
		.map(cycle => ({
			'cycle-id': cycle['cycle-id'],
			cycle: this.formatReadableR(cycle.cycle),
			ca: this.formatReadableR(cycle.ca || [])
		}));
		
		// 3. Return the human-readable cycles
		console.log("(cycle.mjs) formatted cycles: ", formattedCycles);
		return formattedCycles;
	}
	
	/**
	* Formats arc data into a human-readable representation.
	*
	* Converts an array of arc objects into strings of the form "r-id: arc"
	* for easy display and interpretation.
	*
	* @param {Array<Object>} arcs - Array of objects each containing:
	*   - r-id {string} Identifier of the arc
	*   - arc {string}  The arc description
	* @returns {string[]} An array of formatted strings: "r-id: arc"
	*
	* Notes:
	* - Used by evaluateCycle() when displaying cycle and critical arc info.
	*/
	formatReadableR(arcs) {
		console.log("Formatting the arcs: ", arcs);
		return arcs.map(r => `${r['r-id']}: ${r.arc}`);
	}
}