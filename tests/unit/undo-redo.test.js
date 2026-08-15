import { describe, it, expect } from 'vitest';

describe('core/undo-redo', () => {
    it('captures, undoes, and redoes through a state getter/setter', async () => {
        const { createHistory } = await import('../../js/core/undo-redo.js');
        let current = { v: 1 };
        const history = createHistory({
            getState: () => current,
            applyState: (s) => { current = s; },
            onChange: () => {}
        });
        history.capture();
        current = { v: 2 };
        history.capture();
        current = { v: 3 };
        history.capture();
        expect(current.v).toBe(3);
        history.undo();
        expect(current.v).toBe(2);
        history.undo();
        expect(current.v).toBe(1);
        history.redo();
        expect(current.v).toBe(2);
    });

    it('does not capture duplicate consecutive states', async () => {
        const { createHistory } = await import('../../js/core/undo-redo.js');
        let current = { v: 1 };
        const history = createHistory({
            getState: () => current,
            applyState: (s) => { current = s; },
            onChange: () => {}
        });
        history.capture();
        history.capture();
        history.undo();
        expect(current.v).toBe(1);
        history.redo();
        expect(current.v).toBe(1);
    });

    it('tracks canUndo/canRedo through captures and steps', async () => {
        const { createHistory } = await import('../../js/core/undo-redo.js');
        let current = { v: 1 };
        const history = createHistory({
            getState: () => current,
            applyState: (s) => { current = s; },
            onChange: () => {}
        });
        history.capture();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
        current = { v: 2 };
        history.capture();
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
        history.undo();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(true);
        history.redo();
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });
});
