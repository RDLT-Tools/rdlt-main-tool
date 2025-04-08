export default class ArcGeometry {
    static DEFAULTS = {
        pathType: "straight",
        isAutoDraw: false,
        arcLabel: { baseSegmentIndex: 0, footFracDistance: 0.5, perpDistance: 0 }
    };

    /** 
     * @typedef { "straight" | "elbowed" } PathType 
     * @type {PathType}
    */ 
    pathType;

    /** @type {boolean} */
    isAutoDraw;

    /** @type {{ x: number, y: number }[]} */
    waypoints;

    /**
     * @type {{ baseSegmentIndex: number, footFracDistance: number, perpDistance: number }}
     */
    arcLabel;

    /**
     * 
     * @param {{ 
     *  pathType: PathType, 
     *  isAutoDraw: boolean, 
     *  waypoints: { x: number, y: number } 
     *  arcLabel: { footFracDistance: number, perpDistance: number }
     * }} options 
     */
    constructor(options = {}) {
        const { pathType, isAutoDraw, waypoints, arcLabel } = options || {};

        this.pathType = pathType || ArcGeometry.DEFAULTS.pathType;
        this.isAutoDraw = isAutoDraw || ArcGeometry.DEFAULTS.isAutoDraw;
        this.waypoints = waypoints || [];
        this.arcLabel = arcLabel || { ...ArcGeometry.DEFAULTS.arcLabel };
    }

    copy() {
        return new ArcGeometry({
            pathType: this.pathType,
            isAutoDraw: this.isAutoDraw,
            waypoints: this.waypoints.map(point => ({ ...point })),
            arcLabel: this.arcLabel
        });
    }

    toJSON() {
        return {
            pathType: this.pathType,
            isAutoDraw: this.isAutoDraw,
            waypoints: this.waypoints.map(waypoint => ({ ...waypoint})),
            arcLabel: {...this.arcLabel}
        };
    }

    static fromJSON(json) {
        return new ArcGeometry(json);
    }
}