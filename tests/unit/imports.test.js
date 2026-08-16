import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

function extractImportSpecifiers(source) {
    const specs = [];
    const re = /import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const spec = m[1];
        if (spec.startsWith('.') || spec.startsWith('/')) specs.push(spec);
    }
    return specs;
}

const moduleFiles = walk(path.join(repoRoot, 'js'));

describe('module import graph integrity', () => {
    it('every module import specifier resolves to an existing file', () => {
        const failures = [];
        for (const file of moduleFiles) {
            const source = fs.readFileSync(file, 'utf8');
            const specs = extractImportSpecifiers(source);
            for (const spec of specs) {
                const resolved = path.resolve(path.dirname(file), spec);
                if (!fs.existsSync(resolved)) {
                    failures.push(`${path.relative(repoRoot, file)} -> ${spec}`);
                }
            }
        }
        expect(failures).toEqual([]);
    });

    it('main.js boot entry exists and imports the renderer side-effect module', () => {
        const mainSrc = fs.readFileSync(path.join(repoRoot, 'js/main.js'), 'utf8');
        expect(mainSrc).toContain("import './design/renderer.js';");
        expect(fs.existsSync(path.join(repoRoot, 'js/main.js'))).toBe(true);
    });
});
