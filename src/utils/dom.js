export function createEl(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
        el.className = options.className;
    }
    if (options.id) {
        el.id = options.id;
    }
    // Apply any other properties as styles
    const { className, id, ...styles } = options;
    Object.assign(el.style, styles);
    return el;
}

export function append(parent, ...children) {
    children.forEach(c => parent.appendChild(c));
    return parent;
}

