import { utils } from './rdlt-utils.mjs';

/**
 * Cycle detection and analysis for RDLTs
 */
export class Cycle {
  constructor(R) {
    this.R = R;
    this.Arcs_List = [];
    this.Vertices_List = [];
    this.processed_arcs = [];
    this.processArcs();
    this.graph = this.listToGraph(this.Arcs_List);
    this.global_cycle_counter = 0;
    this.Cycle_List = [];
    this.critical_arcs = [];
    this.eRU_list = [];
  }

  processArcs() {
    this.R.forEach(e => {
      if (e.arc && e['r-id']) {
        const [s, t] = e.arc.split(', ').map(x => x.trim());
        this.Arcs_List.push([e['r-id'], s, t]);
        this.processed_arcs.push(e);
      }
    });
    this.Vertices_List = [...new Set(this.Arcs_List.flatMap(([,a,b])=>[a,b]))];
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

  storeToCycleList() {
    const cycles = this.findCycles(this.graph);
    this.Cycle_List = [];
    const arcGraph = {};
    this.Arcs_List.forEach(([rid,s,t])=>{
      arcGraph[s] = arcGraph[s]||new Set();
      arcGraph[s].add(t);
    });
    const joinPts = {};
    this.Arcs_List.forEach(([rid,s,t])=>{
      joinPts[t] = joinPts[t]||[];
      joinPts[t].push(s);
    });
    Object.entries(joinPts)
      .filter(([,ps])=>ps.length>1)
      .forEach(([k,v])=>joinPts[k]=v);

    cycles.forEach((cs,idx)=>{
      const format = cs.map(([a,b])=>`${a}: ${b}`);
      const las = cs.map(([a,b])=>parseInt(this.findRByArc(`${a}, ${b}`)?.['l-attribute']||0,10));
      const ca = las.length?Math.min(...las):null;
      this.Cycle_List.push({ 'cycle-id':`c-${idx+1}`, cycle:format, ca });
      if(ca!==null){
        cs.forEach(([a,b])=>{
          if(parseInt(this.findRByArc(`${a}, ${b}`)?.['l-attribute']||0,10)===ca)
            this.critical_arcs.push(`${a}, ${b}`);
        });
      }
    });
  }
}