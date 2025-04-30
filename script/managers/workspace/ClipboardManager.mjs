import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../entities/model/visual/VisualComponent.mjs";

export class ClipboardManager {
    /**
     * @type {{ vertices: VisualComponent[], arcs: VisualArc[] }}
     */
    static #clipboard = {
        vertices: [],
        arcs: []
    };

    /**
     * 
     * @param {{ vertices, arcs }} objects 
     */
    static copy(objects) {
        ClipboardManager.#clipboard.vertices = objects.vertices || [];
        ClipboardManager.#clipboard.arcs = objects.arcs || [];
    }

    /**
     * @returns {{ vertices: VisualComponent[], arcs: VisualArc[] }}
     */
    static get() {
        return { ...this.#clipboard };
    }
}