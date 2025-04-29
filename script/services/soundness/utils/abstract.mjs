// Port of abstract.py

import { utils } from './rdlt-utils.mjs';
import { Cycle } from './cycle.mjs';

/**
 * Create abstract arcs derived from R2 for R1 enhancement.
 */
export class AbstractArc {
  constructor(R1,R2,In_list,Out_list,Centers_list,Arcs_List){
    this.R1=R1;
    this.R2=R2;
    this.In_list=In_list;
    this.Out_list=Out_list;
    this.Centers_list=Centers_list;
    this.Arcs_List=Arcs_List;
    this.graph=utils.buildGraph(R1);
    this.r2_graph=utils.buildGraph(R2);
    this.abstract_vertices=this.findAbstractVertices();
  }

  unique(list){
    return Array.from(new Set(list.flatMap(a=>a.split(', ')))).sort();
  }

  findAbstractVertices(){
    const vin=new Set(this.In_list.map(a=>a.split(', ')[1]));
    const vout=new Set(this.Out_list.map(a=>a.split(', ')[0]));
    return [...new Set([...this.Centers_list,...vin,...vout])];
  }

  findPaths(start,end,maxDepth=5){
    if(start===end)return[[start]];
    const res=[];
    const stack=[[start,[start]]];
    while(stack.length){
      const [v,p]=stack.pop();
      (this.r2_graph[v]||[]).forEach(n=>{
        if(!p.includes(n)&&p.length<maxDepth){
          const np=[...p,n];
          if(n===end)res.push(np);
          else stack.push([n,np]);
        }
      });
    }
    return res;
  }

  /**
   * Step A: Create abstract arcs from cycles and direct paths between abstract vertices.
   * 
   * @param {string[]} abstract_vertices – list of abstract vertex names, e.g. ["x1","x2",…]
   * @returns {Array<{ 'r-id': string, arc: string, 'c-attribute': string, 'l-attribute': string, eRU: string }>}
   */
  makeAbstractArcsStepA(abstract_vertices) {
    // console.log("Step A: Starting with abstract vertices:", abstract_vertices);

    const abstract_arcs = [];
    const seen_self_loops = new Set();
    const seen_paths = new Set();

    // all second endpoints of in-bridges
    const in_vertices = new Set(this.In_list.map(a => a.split(', ')[1]));
    const abstract_set = new Set(abstract_vertices);

    // find all cycles in R2
    const cycles = new Cycle(this.R2).findCycles(this.r2_graph);
    // console.log("Step A: Found cycles in R2:", cycles);

    // self-loops from any cycle vertex that is also an in-bridge target
    for (const cycle_arcs of (cycles || [])) {
        const cycle_vertices = new Set();
        for (const [u, v] of cycle_arcs) {
            cycle_vertices.add(u);
            cycle_vertices.add(v);
        }
        for (const vertex of cycle_vertices) {
            if (abstract_set.has(vertex) && in_vertices.has(vertex)) {
                const arc = `${vertex}, ${vertex}`;
                if (!seen_self_loops.has(arc)) {
                    seen_self_loops.add(arc);
                    abstract_arcs.push({
                        'r-id': `A-${abstract_arcs.length}`,
                        arc,
                        'c-attribute': '0',
                        'l-attribute': '0',
                        'eRU': '0'
                    });
                    // console.log("Step A: Added self-loop arc:", arc);
                }
            }
        }
    }

    // direct paths between abstract vertices via R2
    for (const in_bridge of this.In_list) {
        const in_vertex = in_bridge.split(', ')[1];
        if (!abstract_set.has(in_vertex)) continue;

        for (const out_vertex of abstract_vertices) {
            if (out_vertex === in_vertex) continue;
            const paths = this.findPaths(in_vertex, out_vertex);
            // console.log(`Paths from ${in_vertex} to ${out_vertex}:`, paths);
            for (const path of paths) {
                if (path.length >= 2) {
                    const key = path.join('→');
                    if (!seen_paths.has(key)) {
                        seen_paths.add(key);
                        abstract_arcs.push({
                            'r-id': `A-${abstract_arcs.length}`,
                            arc: `${path[0]}, ${path[path.length - 1]}`,
                            'c-attribute': '0',
                            'l-attribute': '0',
                            'eRU': '0'
                        });
                    }
                }
            }
        }
    }

    // console.log("Step A: Final abstract arcs:", abstract_arcs);
    return abstract_arcs;
  }

  /**
   * Step B: Add self-loops for any in-bridge vertex that has a cyclic path returning to itself.
   * 
   * @param {Array<{ arc: string, [k: string]: any }>} abstract_arcs – from Step A
   * @returns {typeof abstract_arcs}
   */
  makeAbstractArcsStepB(abstract_arcs) {
    // console.log("Step B: Starting with abstract arcs:", abstract_arcs);

    const processed = new Set();

    for (const in_bridge of this.In_list) {
        const in_v = in_bridge.split(', ')[1];
        if (processed.has(in_v)) continue;
        processed.add(in_v);

        // all paths from in_v back to itself
        const loops = this.findPaths(in_v, in_v);
        if (!loops) continue;

        for (const path of loops) {
            if (path.length > 1) {
                const selfArc = `${in_v}, ${in_v}`;
                if (!abstract_arcs.some(a => a.arc === selfArc)) {
                    abstract_arcs.push({
                        'r-id': `A-${abstract_arcs.length}`,
                        arc: selfArc,
                        'c-attribute': '0',
                        'l-attribute': '0',
                        'eRU': '0'
                    });
                }
            }
        }
    }

    // console.log("Step B: Final abstract arcs:", abstract_arcs);
    return abstract_arcs;
  }

  /**
   * Step C: Finalize abstract arcs by computing their eRU and setting l-attribute = eRU+1.
   * 
   * @param {Array<{ 'r-id': string, arc: string }>} abstract_arcs – from Step B
   * @returns {Array<{ 'r-id': string, arc: string, 'c-attribute': string, 'l-attribute': string, eRU: string }>}
   */
  makeAbstractArcsStepC(abstract_arcs) {
    // console.log("Step C: Starting with abstract arcs:", abstract_arcs);

    const finalized = [];

    for (const arcObj of abstract_arcs) {
        const [start, end] = arcObj.arc.split(', ');
        const eRU = this.calculate_eRU(start, end);
        finalized.push({
            'r-id': arcObj['r-id'],
            arc: arcObj.arc,
            'c-attribute': '0',
            'l-attribute': String(eRU + 1),
            'eRU': String(eRU)
        });
        // console.log("Step C: Finalized arc:", finalized[finalized.length - 1]);
    }

    // console.log("Step C: Final abstract arcs:", finalized);
    return finalized;
  }

  /**
   * Calculate the expanded Reusability (eRU) for an abstract arc.
   * 
   * @param {string} start – start vertex
   * @param {string} end – end vertex
   * @returns {number} expanded reusability
   */
  calculate_eRU(start, end) {
    let total = 0;
    let path_eRU = 0;

    // direct match in R2
    for (const arc of this.R2) {
      if (arc.arc === `${start}, ${end}`) {
        path_eRU = Number(arc.eRU || 0);
        break;
      }
    }

    // for self-loop, take max eRU among all incident R2 arcs
    if (start === end) {
      const loops = [];
      for (const arc of this.R2) {
        const [u,v] = arc.arc.split(', ');
        if (u === start || v === end) loops.push(Number(arc.eRU || 0));
      }
      if (loops.length) {
        path_eRU = Math.max(...loops);
      }
    }

    // contributions from in-bridges in R1
    for (const in_bridge of this.In_list) {
      const in_v = in_bridge.split(', ')[1];
      if (in_v === start) {
        for (const arc of this.R1) {
          if (arc.arc === in_bridge) {
            const lVal = Number(arc['l-attribute']);
            total += lVal * (path_eRU + 1);
          }
        }
      }
    }

    return total;
  }
}
