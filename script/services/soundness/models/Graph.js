import { Vertex } from './Vertex.js';
import { Edge } from './Edge.js';
import { ResetBoundSubsystem } from './ResetBoundSubsystem.js';
import { Activity } from './Activity.js';
import { ActivityProfile } from './ActivityProfile.js';
import { VertexType } from './VertexType.js';

// TODO: Initially, this graph has activity as an array. Change the implementation para
// Activity profile yung linalagay, not the activity itself. Meron naman kasing
// Activities yung activity profile. So, we can just add the activity to the profile
// instead of the graph.

/**
 * Represents the entire Graph structure.
 */
export class Graph {
  /**
   * @param {Vertex[]} vertices
   * @param {Edge[]} edges
   * @param {ResetBoundSubsystem[]} resetBoundSubsystems
   * @param {ActivityProfile} activityProfile
   */
  constructor(vertices = [], edges = [], resetBoundSubsystems = [], activityProfile = []) {
    this.vertices = vertices;
    this.edges = edges;
    this.resetBoundSubsystems = resetBoundSubsystems;
    this.activityProfile = activityProfile;
  }

  /**
   * Adds a vertex to the graph.
   * @param {Vertex} vertex
   */
  addVertex(vertex) {
    this.vertices.push(vertex);
  }

  /**
   * Adds an edge to the graph.
   * @param {Edge} edge
   */
  addEdge(edge) {
    this.edges.push(edge);
  }

  /**
   * Adds a reset-bound subsystem to the graph.
   * @param {ResetBoundSubsystem} subsystem
   */
  addResetBoundSubsystem(subsystem) {
    this.resetBoundSubsystems.push(subsystem);
  }

  /**
   * Adds an activity to the graph.
   * @param {Activity} activity
   */
  addActivity(activity) {
    this.activities.push(activity);
  }

  extractActivityProfile(sourceId, targetId) {
    let source = this.vertices.find(vertex => vertex.id === sourceId);
    let target = this.vertices.find(vertex => vertex.id === targetId);

    if (!source || !target) {
      throw new Error("Source or target vertex not found in the graph.");
    }

    let allProfiles = [];
    let initialProfile = new ActivityProfile(source, target);

    // Check operation
    const check = (x, time) => {
      // console.log(`Checking edges from Vertex: ${x.id} at Time: ${time}`); // Debug : Checking edges
      // let candidateEdges = this.edges.filter(edge => edge.from.id === x.id && edge.canExplore());
      // console.log(`Candidate Edges: `, candidateEdges); // Debug: Candidate edges

      // if (candidateEdges.length === 0) {
      //   console.log("No valid edges to traverse."); // Debug: No edges
      //   return null;
      // }

      // let randomIndex = Math.floor(Math.random() * candidateEdges.length);
      // let checkedEdge = candidateEdges[randomIndex];
      // console.log(`Checked Edge: `, checkedEdge); // Debug: Checked edge

      // const inboundEdges = this.edges.filter(edge => edge.to.id === x.id && edge !== checkedEdge);
      const inboundEdges = this.edges.filter(edge => edge.to.id === x.id && edge !== x);
      console.log(`Inbound Edges: ${inboundEdges.map(edge => edge.id).join(", ")}`); // Debug: Inbound edges
      let maxV = 0;
      if (inboundEdges.length > 0) {
        maxV = Math.max(...inboundEdges.map(edge => edge.getLatestTraversalTime()));
        console.log(`Max Traversal Time (maxV) for inbound edges: ${maxV}`); // Debug: maxV
      } else {
        maxV = time - 1; // maxV will be current time
        console.log("No inbound edges to calculate maxV."); // Debug: No inbound edges
      }

      // checkedEdge.recordCheckTime(maxV + 1);
      x.recordCheckTime(maxV + 1);
      // console.log(`Recorded Check Time for Edge: ${checkedEdge.id}, Time: ${maxV + 1}`); // Debug: Record check time
      console.log(`Recorded Check Time for Edge: ${x.id}, Time: ${maxV + 1}`); // Debug: Record check time

      return x;
    };

    // Traverse and update operation
    const traverseAndUpdate = (checkedEdge, activityProfile, time) => {
      // Determine the candidate slot index: the last index where CTI==1.
      let index = checkedEdge.CTI.lastIndexOf(1);
      if (index === -1) throw Error("Edge is not checked. Cannot traverse.");

      console.log(`Traversing and updating for Edge: ${checkedEdge.id}`); // Debug: Traversing edge
      
      const outboundEdges = this.edges.filter(edge => edge.to.id === checkedEdge.to.id && edge !== checkedEdge);
      console.log("Found outbound edges: ", outboundEdges);

      let typeAlike = [];
      if (this.resetBoundSubsystems.length > 0) {
        this.resetBoundSubsystems.forEach(rbs => {
          outboundEdges.forEach(edge => {
            if (rbs.isTypeAlike(checkedEdge, edge)) {
              typeAlike.push(edge);
            }
          });
        });
        console.log(`Type-alike edges found: ${typeAlike.map(edge => edge.id).join(", ")}`); // Debug: Type-alike edges
      } else {
        typeAlike = outboundEdges;
        console.log(`No RBS found. All outbound edges are type-alike`); // Debug: Outbound edges
      }

      console.log("Type alike edges: ", typeAlike); // Debug: Type alike edges

      if (!checkedEdge.isUnconstrained(typeAlike)) {
        console.log(`Edge: ${checkedEdge.id} is constrained. Stopping traversal.`); // Debug: Constrained edge
        return null;
      }
      else{
        console.log(`Edge: ${checkedEdge.id} is unconstrained. Continuing traversal.`); // Debug: Unconstrained edge
      }

      // Compute outboundMAX from outbound edges before any further updates.
      let computedOutboundMAX = 0;
      if (outboundEdges.length > 0) {
        computedOutboundMAX = Math.max(
          ...outboundEdges.map(edge => edge.getLatestTraversalTime() - 1),
          time - 1
        ); // Get the maximum traversal time between outbound edges and checked edge
        console.log("outbound edges traversal times: ", ...outboundEdges.map(edge => edge.getLatestTraversalTime()));
        console.log(`Max Traversal Time (outboundMAX) for outbound edges: ${computedOutboundMAX}`); // Debug: outboundMAX
      } else {
        // We subtract 1 to ensure the traversal time is incremented correctly.
        // This is a safeguard to prevent double incrementing the time step.
        computedOutboundMAX = time - 1; // If no outbound edges, use the current time (minus 1 to ensure proper incrementation)
        console.log(`No outbound edges. Using checkedEdge's latest traversal time: ${computedOutboundMAX}`); // Debug: No outbound edges
      }

      // Freeze the computed outboundMAX so that later backtracking does not affect it.
      const recordedOutboundMAX = computedOutboundMAX;

      activityProfile.addActivity(checkedEdge, recordedOutboundMAX + 1); // Add the activity to the profile
      checkedEdge.finalizeTraversalTime(recordedOutboundMAX + 1, 1); // record the traversal time of the checked edge

      typeAlike.forEach(edge => {
        if (edge.constraint !== "") {
          edge.finalizeTraversalTime(recordedOutboundMAX + 1, 1);
          console.log(`Finalized Traversal Time for Edge: ${edge.id}, Time: ${recordedOutboundMAX + 1}, Criteria: 1`); // Debug: Finalize traversal
          activityProfile.addActivity(edge, recordedOutboundMAX + 1); // Add the activity to the profile
        } else if (
          (edge.from.type === VertexType.ENTITY_OBJECT || edge.from.type === VertexType.BOUNDARY_OBJECT) &&
          edge.constraint === "" &&
          !edge.isCheckedTraversed()
        ) {
          edge.finalizeTraversalTime(recordedOutboundMAX + 1, 2);
          activityProfile.addActivity(edge, recordedOutboundMAX + 1); // Add the activity to the profile
          console.log(`Finalized Traversal Time for Edge: ${edge.id}, Time: ${recordedOutboundMAX + 1}, Criteria: 2`); // Debug: Finalize traversal
        }
      });

      // Return the next vertex and the snapshot info for backtracking.
      return { nextVertex: checkedEdge.to, index: index, recordedOutboundMAX: recordedOutboundMAX};
    };

    // Systematic DFS Approach for Activity Extraction
    const dfs = (currentVertex, currentProfile, currentTime) => {
      console.log("current profile: ", currentProfile.activities); // Debug: Current profile
      // If we reached the target, store a COPY of the current profile
      if (currentVertex.id === target.id) {
        // clone or deepCopy currentProfile
        console.log("Target reached. Storing profile:", currentProfile.activities); // Debug: Target reached
        allProfiles.push({...currentProfile});
        return;
      }

      // gather candidate edges from currentVertex
      let candidateEdges = this.edges.filter(e => e.from === currentVertex && e.canExplore());

      if (candidateEdges.length === 0) {
        console.log(`No candidate edges available from vertex ${currentVertex.id} at time ${currentTime}`);
        return;
      }
      
      // Instead of random picking, systematically iterate
      for(let edge of candidateEdges){
        console.log(`===== Current Time: ${currentTime}=====`);

        // 1) attempt a check
        let checkOk = check(edge, currentTime); 
        if (!checkOk) {
          // Can't use this edge
          continue
        };

        // 2) Attempt traversal along this edge.
        let traversalResult = traverseAndUpdate(edge, currentProfile, currentTime);;
        if(!traversalResult){
          // Can't use this edge
          continue;
        }

        // Recurse deeper
        dfs(traversalResult.nextVertex, currentProfile, currentTime + 1);

        // 3) Backtracking: revert only the transient changes made by traversal.
        // This restores the updated slot back to its pre-traversal (checked) state.
        // edge.traversalTimes[traversalResult.index] = traversalResult.slotSnapshot.traversalTime;
        // edge.CTI[traversalResult.index] = traversalResult.slotSnapshot.CTI;
      }
    }

    // Main Activity Extraction Algorithm
    // let currentVertex = source;
    // let candidateArc = null;
    // let time = 1;

    // while (currentVertex.id !== target.id) {
    //   console.log(`Current Vertex: ${currentVertex.id}`); // Debug: Current vertex
    //   let predecessorVertex = currentVertex;
    //   let checkedEdge = check(currentVertex, time);

    //   while (checkedEdge !== null) {
    //     console.log(`Traversing Edge: ${checkedEdge.id}`); // Debug: Traversing edge
    //     checkedEdge = traverseAndUpdate(checkedEdge);

    //     if (checkedEdge != null) {
    //       console.log(`Moving to Vertex: ${checkedEdge.id}`); // Debug: Moving to next vertex
    //       candidateArc = currentVertex;
    //       currentVertex = checkedEdge;
    //     }

    //     time++;
    //     console.log(`Time Step Incremented: ${time}`); // Debug: Time increment
    //     checkedEdge = check(currentVertex, time);
    //   }

    //   if (predecessorVertex === currentVertex) {
    //     console.log(`No traversal done. Backtracking from Vertex: ${currentVertex.id}`); // Debug: Backtracking
    //     if (currentVertex !== source) {
    //       console.log(`Backtracking to Candidate Arc: ${candidateArc.id}`); // Debug: Backtracking to candidate arc
    //       currentVertex = candidateArc;
    //       time--; // Decrement time step to backtrack
    //     } else {
    //       console.log("Activity extraction failed. Returning null."); // Debug: Extraction failure
    //       return null;
    //     }
    //   }
    // }

    dfs(source, initialProfile, 1);

    console.log("Activity extraction completed successfully. Profiles found: ", allProfiles.length); // Debug: Success
    console.log("All profiles: ", allProfiles);
    return allProfiles;
  }
}