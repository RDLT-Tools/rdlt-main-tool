import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";
import ModelContext from "../model/ModelContext.mjs";

export default class RBSBoundsManager {
    /** @type { ModelContext } */
    context;

    /**
     * @typedef {{ minX, minY, maxX, maxY }} RBSBounds
     * @typedef {number} ComponentUID
     * @typedef {{ [rbsCenterUID: ComponentUID]: VisualComponent[] }} RBSComponentsCache
     * @typedef {{ [rbsCenterUID: ComponentUID]: Set<ComponentUID> }} RBSComponentsUIDsCache
     * @typedef {{ [rbsCenterUID: ComponentUID]: RBSBounds }} RBSBoundsCache
     * @type {{ rbsComponentsUIDs: RBSComponentsUIDsCache, rbsBounds: RBSBoundsCache }}
     */
    #cache = {
        rbsComponentsUIDs: {},
        rbsBounds: {}
    };

    /**
     * 
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * @param {number} centerUID
     * @returns {RBSBounds}
     */
    onComponentSetAsRBSCenter(centerUID) {
        this.#refreshRBSComponents(centerUID);
        return this.#recalculateRBSBounds(centerUID);
    }

    #refreshRBSComponents(centerUID) {
        const componentsUIDs = this.context.managers.modelling.getRBSComponents(centerUID).map(c => c.uid);
        this.#cache.rbsComponentsUIDs[centerUID] = new Set(componentsUIDs);
        return componentsUIDs;
    }


    /**
     * @param {number[]} componentsUIDs 
     * @returns {{ [centerUID: number]: RBSBounds }}
     */
    onComponentsTransformed(componentsUIDs, forceUpdateComponents = false) {
        const affectedRBS = new Set();
        for(const centerUID in this.#cache.rbsComponentsUIDs) {
            const rbsComponentsUIDs = this.#cache.rbsComponentsUIDs[centerUID];
            for(const componentUID of componentsUIDs) {
                if(rbsComponentsUIDs.has(componentUID)) {
                    affectedRBS.add(centerUID);
                    if(forceUpdateComponents) this.#refreshRBSComponents(centerUID);
                    break;
                }
            }
        }

        const rbsBounds = {};

        for(const centerUID of affectedRBS) {
            rbsBounds[centerUID] = this.#recalculateRBSBounds(centerUID);
        }

        return rbsBounds;
    }

    /**
     * @param {number[]} componentsUIDs 
     * @returns {{ removedRBS: number[], affectedRBS: { [centerUID: number]: RBSBounds }}}
     */
    onComponentsRemoved(componentsUIDs) {
        const removedRBS = [];
        const affectedRBS = new Set();

        for(let centerUID in this.#cache.rbsComponentsUIDs) {
            centerUID = Number(centerUID);
            
            if(componentsUIDs.includes(centerUID)) {
                delete this.#cache.rbsComponentsUIDs[centerUID];
                removedRBS.push(centerUID);
            } else {
                const rbsComponentsUIDs = this.#cache.rbsComponentsUIDs[centerUID];
                for(const componentUID of componentsUIDs) {
                    if(rbsComponentsUIDs.has(componentUID)) {
                        affectedRBS.add(centerUID);
                        this.#refreshRBSComponents(centerUID);
                        break;
                    }
                }
                
            }

            
        }
        
        const rbsBounds = {};

        for(const centerUID of affectedRBS) {
            rbsBounds[centerUID] = this.#recalculateRBSBounds(centerUID);
        }

        return { removedRBS, affectedRBS: rbsBounds }; 
    }

    onArcsChanged(arcsUIDs) {
        let incidentComponentsUIDs = new Set();
        const modellingManager = this.context.managers.modelling; 

        for(const arcUID of arcsUIDs) {
            const arc = modellingManager.getArcById(arcUID);
            if(!arc) continue;
            incidentComponentsUIDs.add(arc.fromVertexUID);
            incidentComponentsUIDs.add(arc.toVertexUID);
        }

        return this.onComponentsTransformed(incidentComponentsUIDs, true);
    }

    /**
     * @param {VisualArc[]} arcs 
     * @returns {{ [centerUID: number]: RBSBounds }}
     */
    onArcsDeleted(arcs) {
        let incidentComponentsUIDs = new Set();
        for(const arc of arcs) {
            incidentComponentsUIDs.add(arc.fromVertexUID);
            incidentComponentsUIDs.add(arc.toVertexUID);
        }

        return this.onComponentsTransformed(incidentComponentsUIDs, true);
    }


    

    /**
     * @param {number} centerUID 
     * @returns {RBSBounds}
     */
    #recalculateRBSBounds(centerUID) {
        const components = this.context.managers.modelling.getRBSComponents(centerUID);

        // Calculate bounds
        const componentBounds = components.map(c => c.geometry.bounds);
        let minX = Math.min(...componentBounds.map(b => b.minX));
        let minY = Math.min(...componentBounds.map(b => b.minY));
        let maxX = Math.max(...componentBounds.map(b => b.maxX));
        let maxY = Math.max(...componentBounds.map(b => b.maxY));


        const bounds = { minX, minY, maxX, maxY }
        this.#cache.rbsBounds[centerUID] = bounds;

        return bounds;
    }
}