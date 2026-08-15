const _MAX_HISTORY = 50;

export function createHistory({ getState, applyState, onChange }) {
    let stack = [];
    let index = -1;
    let timer = null;

    function capture() {
        const state = getState();
        if (index < stack.length - 1) {
            stack = stack.slice(0, index + 1);
        }
        if (stack.length > 0) {
            const last = stack[stack.length - 1];
            if (JSON.stringify(last) === JSON.stringify(state)) return;
        }
        stack.push(JSON.parse(JSON.stringify(state)));
        if (stack.length > _MAX_HISTORY) {
            stack.shift();
        }
        index = stack.length - 1;
        if (onChange) onChange();
    }

    function debouncedCapture() {
        clearTimeout(timer);
        timer = setTimeout(() => capture(), 600);
    }

    function undo() {
        if (index <= 0) return;
        index--;
        applyState(JSON.parse(JSON.stringify(stack[index])));
        if (onChange) onChange();
    }

    function redo() {
        if (index >= stack.length - 1) return;
        index++;
        applyState(JSON.parse(JSON.stringify(stack[index])));
        if (onChange) onChange();
    }

    return {
        capture,
        debouncedCapture,
        undo,
        redo,
        canUndo: () => index > 0,
        canRedo: () => index < stack.length - 1
    };
}
