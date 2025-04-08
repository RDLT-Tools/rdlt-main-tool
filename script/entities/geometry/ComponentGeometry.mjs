import ArcGeometry from "./ArcGeometry.mjs";
export default class ComponentGeometry {
    static DEFAULTS = {
        position: { x: 0, y: 0 },
        size: 70
    };

    /** @type {{ x: number, y: number }} */
    position;
    
    /** @type {number} */
    size;

    /**
     * 
     * @param {{ position: { x: number, y: number }, size: number }} options 
     */
    constructor(options = {}) {
        const { position, size } = options || {};

        this.position = position || { ...ComponentGeometry.DEFAULTS.position };
        this.size = size || ComponentGeometry.DEFAULTS.size;
    }

    copy() {
        return new ComponentGeometry({
            position: { ...this.position },
            size: this.size
        });
    }

    get bounds() {
        return {
            minX: this.position.x - this.size/2,
            minY: this.position.y - this.size/2,
            maxX: this.position.x + this.size/2,
            maxY: this.position.y + this.size/2
        };
    }

    toJSON() {
        return {
            position: { ...this.position },
            size: this.size
        };
    }

    static fromJSON(json) {
        return new ComponentGeometry(json);
    }
}