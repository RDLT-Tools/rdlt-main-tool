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

  makeAbstractArcsStepA(av){ /* ...as before...*/ }
  makeAbstractArcsStepB(arts){ /* ...as before...*/ }
  makeAbstractArcsStepC(arts){ /* ...as before...*/ }
  calculate_eRU(s,e){ /* ...as before...*/ }
}
