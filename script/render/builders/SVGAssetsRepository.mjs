import { getRawSVGAsset } from "./utils.mjs";

export default class SVGAssetsRepository {
    /**
     * @typedef {{ boundary: string, controller: string, entity: string }} ComponentsCache
     * @type {{ components: ComponentsCache }}
     */
    static cache;

    static TEMPLATES_DIR = "/assets/templates";

    static async initialize() {
        SVGAssetsRepository.cache = {
            components: {
                boundary: "",
                controller: "",
                entity: ""
            },
            selection: {
                componentHover: "",
                componentSelected: "",
                arcHover: "",
                arcSelected: "",
                highlight: "",
                arcTracingHover: ""
            }

        };

        await SVGAssetsRepository.loadAllAssets();


    }

    static async loadAllAssets() {
        const COMPONENTS_DIR = `${SVGAssetsRepository.TEMPLATES_DIR}/components`;
        const SELECTION_DIR = `${SVGAssetsRepository.TEMPLATES_DIR}/selection`;

        // Load all component template SVGs
        SVGAssetsRepository.cache.components.boundary = await getRawSVGAsset(`${COMPONENTS_DIR}/boundary.svg`);
        SVGAssetsRepository.cache.components.entity = await getRawSVGAsset(`${COMPONENTS_DIR}/entity.svg`);
        SVGAssetsRepository.cache.components.controller = await getRawSVGAsset(`${COMPONENTS_DIR}/controller.svg`);

        // Load selection template SVGs
        SVGAssetsRepository.cache.selection.componentHover = await getRawSVGAsset(`${SELECTION_DIR}/component-hover.svg`);
        SVGAssetsRepository.cache.selection.componentSelected = await getRawSVGAsset(`${SELECTION_DIR}/component-selected.svg`);
        SVGAssetsRepository.cache.selection.arcHover = await getRawSVGAsset(`${SELECTION_DIR}/arc-hover.svg`);
        SVGAssetsRepository.cache.selection.arcSelected = await getRawSVGAsset(`${SELECTION_DIR}/arc-selected.svg`);
        SVGAssetsRepository.cache.selection.highlight = await getRawSVGAsset(`${SELECTION_DIR}/highlight.svg`);
        SVGAssetsRepository.cache.selection.arcTracingHover = await getRawSVGAsset(`${SELECTION_DIR}/arctracing-hover.svg`);
    }

    /**
     * @typedef { "boundary" | "entity" | "controller" } ComponentType
     * @param { ComponentType } type 
     * @returns {SVGElement}
     */
    static loadComponentSVGElement(type) {
        const raw = SVGAssetsRepository.cache.components[type];
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadComponentHoverSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.componentHover;
        return SVGAssetsRepository.loadSVGElement(raw);
    }
    
    static loadComponentSelectedSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.componentSelected;
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadArcHoverSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.arcHover;
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadArcSelectedSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.arcSelected;
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadHighlightSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.highlight;
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadArcTracingHoverSVGElement() {
        const raw = SVGAssetsRepository.cache.selection.arcTracingHover;
        return SVGAssetsRepository.loadSVGElement(raw);
    }

    static loadSVGElement(raw) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(raw, "image/svg+xml");
        const svgElement = svgDoc.documentElement;
    
        return svgElement;
    }
}
