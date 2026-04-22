export function trim(target: string) {
    return target.trim();
}

export function unquote(target: string) {
    return target.match(/^(["']).*\1$/) ? target.slice(1, -1) : target;
}
