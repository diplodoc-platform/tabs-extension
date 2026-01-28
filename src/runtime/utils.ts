export const getEventTarget = (event: Event) => {
    // In jsdom, composedPath() may return an empty array or not work correctly
    // Fallback to event.target if composedPath is not available or empty
    if (event.composedPath && typeof event.composedPath === 'function') {
        const path = event.composedPath();
        if (Array.isArray(path) && path.length > 0) {
            return path[0];
        }
    }
    return event.target;
};

export const isCustom = (event: Event) => {
    const target = getEventTarget(event);
    return !target || !(target as HTMLElement).matches;
};

export const getClosestScrollableParent = (element: HTMLElement): HTMLElement | undefined => {
    if (Math.abs(element.scrollHeight - element.clientHeight) > 1) {
        return element;
    }

    return element.parentElement ? getClosestScrollableParent(element.parentElement) : undefined;
};

export interface ElementOffset {
    top: number;
    left: number;
    scrollTop: number;
    scrollLeft: number;
}

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
