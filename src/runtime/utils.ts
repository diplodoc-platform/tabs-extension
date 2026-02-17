/**
 * Event target considering shadow DOM (composedPath()[0] or fallback to target).
 * @param event - DOM event
 * @returns Target element
 */
export const getEventTarget = (event: Event) => {
    const path = event.composedPath();
    return Array.isArray(path) && path.length > 0 ? path[0] : event.target;
};

/**
 * True if the event target is a custom element (or missing), so we skip tab handling.
 * @param event - DOM event
 * @returns Whether to ignore
 */
export const isCustom = (event: Event) => {
    const target = getEventTarget(event);
    return !target || !(target as HTMLElement).matches;
};

/**
 * Nearest ancestor (or self) that has overflow scroll. Used to preserve scroll when switching tabs.
 * @param element - Starting element
 * @returns Scrollable parent or undefined
 */
export const getClosestScrollableParent = (element: HTMLElement): HTMLElement | undefined => {
    if (Math.abs(element.scrollHeight - element.clientHeight) > 1) {
        return element;
    }

    return element.parentElement ? getClosestScrollableParent(element.parentElement) : undefined;
};

/** Position and scroll values used to restore scroll after tab switch. */
export interface ElementOffset {
    top: number;
    left: number;
    scrollTop: number;
    scrollLeft: number;
}

/**
 * Offset of element relative to scrollable parent and parent's scroll position.
 * @param element - Child element
 * @param scrollableParent - Scroll container
 * @returns Offset and scroll values
 */
export const getOffsetByScrollableParent = (
    element: HTMLElement,
    scrollableParent: HTMLElement,
): ElementOffset => {
    const elementBounds = element.getBoundingClientRect();
    const scrollableParentBounds = scrollableParent.getBoundingClientRect();
    return {
        top: elementBounds.top - scrollableParentBounds.top,
        left: elementBounds.left - scrollableParentBounds.left,
        scrollTop: scrollableParent.scrollTop,
        scrollLeft: scrollableParent.scrollLeft,
    };
};
