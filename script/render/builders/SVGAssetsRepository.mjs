import { getRawSVGAsset } from "./utils.mjs";

export default class SVGAssetsRepository {
    /**
     * @typedef {{ boundary: string, controller: string, entity: string }} ComponentsCache
     * @type {{ components: ComponentsCache }}
     */
    static cache;

    static TEMPLATES_DIR = location.href.split("/").slice(0, -1).join("/") + "/assets/templates";

    static async initialize() {
        SVGAssetsRepository.cache = {
            components: {
                boundary: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C69.33 15 85 30.67 85 50Z" fill="white" stroke="black" stroke-width="3"/>
                        <path d="M5 22V79" stroke="black" stroke-width="3"/>
                        <path d="M5 50H15.5" stroke="black" stroke-width="3"/>
                    </svg>`,
                controller: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C69.33 15 85 30.67 85 50Z" fill="white" stroke="black" stroke-width="3"/>
                        <path d="M56 25L46 15.5L56 6" stroke="black" stroke-width="3"/>
                    </svg>`,
                entity: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C69.33 15 85 30.67 85 50Z" fill="white" stroke="black" stroke-width="3"/>
                        <path d="M23 85H76.5" stroke="black" stroke-width="3"/>
                    </svg>`
            },
            selection: {
                componentHover: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="12.75" y="12.75" width="74.5" height="74.5" stroke="#0997F6" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="2 2"/>
                    </svg>`,
                componentSelected: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="12.75" y="12.75" width="74.5" height="74.5" stroke="#0997F6" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="2 2"/>
                        <circle cx="12.5" cy="12.5" r="2" fill="white" stroke="#0997F6"/>
                        <circle cx="87.5" cy="12.5" r="2" fill="white" stroke="#0997F6"/>
                        <circle cx="87.5" cy="87.5" r="2" fill="white" stroke="#0997F6"/>
                        <circle cx="12.5" cy="87.5" r="2" fill="white" stroke="#0997F6"/>
                    </svg>`,
                arcHover: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 66L43 34L97.5 44" stroke="white" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
                    </svg>`,
                arcSelected: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 66L43 34L97.5 44" stroke="#0997F6" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
                        <circle cx="6" cy="64" r="4" fill="white" stroke="#0997F6" stroke-width="2"/>
                    </svg>`,
                highlight: `
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="50" height="50" fill="#0997F6" fill-opacity="0.07" stroke="#0997F6" stroke-opacity="0.7" stroke-width="1.5"/>
                    </svg>`,
                arcTracingHover: `
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="35" stroke="#53B7F9" fill="none" stroke-opacity="0.3" stroke-width="15" />
                        <circle cx="85" cy="54" r="4" fill="#0997F6" fill-opacity="0.5"/>
                    </svg>`
            }

        };

        // This code is deprecated: all such assets are now hardcoded in cache
        // await SVGAssetsRepository.loadAllAssets();


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
