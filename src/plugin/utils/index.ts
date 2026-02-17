/**
 * Attach a non-enumerable property to an object (e.g. env.bundled for plugin state).
 * @param box - Object to extend
 * @param field - Property key
 * @param value - Property value
 * @returns Same object with typed field
 */
export function addHiddenProperty<
    B extends Record<string | symbol, unknown>,
    F extends string | symbol,
    V,
>(box: B, field: F, value: V): B & {[P in F]: V} {
    if (!(field in box)) {
        Object.defineProperty(box, field, {
            enumerable: false,
            value: value,
        });
    }

    return box as B & {[P in F]: V};
}

export * from './strings';
export * from './tabs';
export * from './files';
