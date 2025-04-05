export default class ModelComponent {
    static ID_COUNTER = 1;

    /** @type {number} */
    uid;

    /** @type {string} */
    identifier;

    /** 
     * @typedef {"boundary" | "entity" | "controller"} ComponentType
     * @type {ComponentType} */
    type;

    /** @type {boolean} */
    isRBSCenter;

    /**
     * 
     * @param {{ uid?: number, identifier: string, type: ComponentType, isRBSCenter: boolean }} options 
     */
    constructor(options = {}) {
        const { uid, identifier, type, isRBSCenter } = options || {};

        this.uid = uid || ModelComponent.ID_COUNTER++;
        this.identifier = identifier || "";
        this.type = type;
        this.isRBSCenter = isRBSCenter || false;
    }

    /**
     * @param {ComponentType} type 
     * @returns {ModelComponent}
     */
    static create(type) {
        return new ModelComponent({ 
            identifier: "", type, isRBSCenter: false
        });
    }

    copy() {
        return new ModelComponent({
            uid: this.uid,
            identifier: this.identifier,
            type: this.type,
            isRBSCenter: this.isRBSCenter
        });
    }
}