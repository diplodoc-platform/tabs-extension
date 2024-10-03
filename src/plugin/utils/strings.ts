export function generateID() {
    const id = Math.random().toString(36).substr(2, 8);
    return id.substring(id.length - 8);
}

export function trim(target: string) {
    return target.trim();
}

export function unquote(target: string) {
    return target.match(/^(["']).*\1$/) ? target.slice(1, -1) : target;
}
