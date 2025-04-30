import { setHasExact } from "../../../utils.mjs";

export class GlobalKeyEventsManager {

    /** @typedef {"Shift" | "Control" | "+" | "-"} Keys */
    /** @typedef {-1 | 0 | 1} ScrollDirection */
    /** @typedef {(keys: Set<Keys>, scrollDirection: ScrollDirection, relativeCursorPosition: { x: number, y: number }) => void} KeyEventsHandler */
    
    /** @type {{ element: HTMLElement, handler: KeyEventsHandler }[]} */
    static #listeners = [];

    /** @type {Set<Keys>} */
    static #heldKeys = new Set();

    static overridenKeys = [
        [ "Control", "=" ],
        [ "Control", "-" ],
        [ "Control", "d" ],
    ];

    static initialize() {
        document.addEventListener("keydown", (event) => {
            if(document.activeElement.tagName !== "BODY") {
                GlobalKeyEventsManager.#heldKeys.clear();
                return;
            }

            GlobalKeyEventsManager.#heldKeys.add(event.key);
            GlobalKeyEventsManager.#notifyListeners();

            if(GlobalKeyEventsManager.overridenKeys.some(
                keyset => setHasExact(GlobalKeyEventsManager.#heldKeys, ...keyset)
            )) {
                event.preventDefault();
            }
        });

        document.addEventListener("keyup", (event) => {
            if(document.activeElement.tagName !== "BODY") {
                GlobalKeyEventsManager.#heldKeys.clear();
                return;
            }

            GlobalKeyEventsManager.#heldKeys.delete(event.key);
            GlobalKeyEventsManager.#notifyListeners();
        });
    }

    static #notifyListeners(scrollDirection = 0, cursorPosition = null) {
        for(const { element, handler } of GlobalKeyEventsManager.#listeners) {
            requestAnimationFrame(() => {
                const { width, height, x, y } = element.getBoundingClientRect();
                if(width === 0 || height === 0) return;

                const relativeCursorPosition = cursorPosition !== null ? {
                    x: cursorPosition.x - x,
                    y: cursorPosition.y - y 
                } : null;
    
                handler(GlobalKeyEventsManager.#heldKeys, scrollDirection, relativeCursorPosition);
            });
        }
    }

    /**
     * 
     * @param {HTMLElement} element 
     * @param {KeyEventsHandler} handler 
     */
    static listen(element, handler) {
        this.#listeners.push({ element, handler });
        element.addEventListener("wheel", (event) => {
            event.preventDefault();
            this.#notifyListeners(Math.sign(event.deltaY || 0), {
                x: event.clientX, y: event.clientY
            });
        }, { passive: false }); 
    }
}