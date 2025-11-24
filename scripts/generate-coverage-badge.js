#!/usr/bin/env node
/**
 * Read `coverage/coverage-summary.json` and generate a simple SVG badge
 * at `badges/coverage.svg` with the statements coverage percent.
 */

const fs = require('fs');
const path = require('path');

function readCoverageSummary() {
    const summaryFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(summaryFile)) {
        const content = fs.readFileSync(summaryFile, 'utf8');
        try {
            return JSON.parse(content);
        } catch (err) {
            throw new Error('Invalid coverage summary JSON');
        }
    }

    // Fallback to coverage-final.json (Jest sometimes emits this instead)
    const finalFile = path.join(process.cwd(), 'coverage', 'coverage-final.json');
    if (fs.existsSync(finalFile)) {
        const content = fs.readFileSync(finalFile, 'utf8');
        try {
            const finalJson = JSON.parse(content);
            // coverage-final.json may not include a `total` root; compute coverage percent from statements
            let totalStatements = 0;
            let coveredStatements = 0;
            Object.keys(finalJson).forEach((file) => {
                const fileCoverage = finalJson[file];
                if (fileCoverage && fileCoverage.s) {
                    const statements = Object.keys(fileCoverage.s).length;
                    const covered = Object.values(fileCoverage.s).filter((v) => v > 0).length;
                    totalStatements += statements;
                    coveredStatements += covered;
                }
            });
            if (totalStatements === 0) throw new Error('No statement coverage found');
            const pct = Math.round((coveredStatements / totalStatements) * 100);
            return { total: { statements: { pct } } };
        } catch (err) {
            throw new Error('Invalid coverage-final.json');
        }
    }
    throw new Error(`Coverage summary not found at ${summaryFile}`);
}

function getCoveragePercent(summary) {
    const total = summary.total;
    const statements = total.statements && total.statements.pct ? total.statements.pct : 0;
    return Math.round(Number(statements));
}

function getBadgeColor(pct) {
    if (pct >= 90) return '#4c1'; // green
    if (pct >= 75) return '#dfb317'; // yellow
    return '#e05d44'; // red
}

function generateSvg(percent) {
    const color = getBadgeColor(percent);
    const left = 'coverage';
    const right = `${percent}%`;
    // Basic simple SVG badge (lightweight inline template)
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20" role="img" aria-label="Coverage: ${right}">` +
        '<linearGradient id="b" x2="0" y2="100%">' +
        '<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>' +
        '<stop offset="1" stop-opacity=".1"/>' +
        '</linearGradient>' +
        '<rect rx="3" width="120" height="20" fill="#555"/>' +
        `<rect rx="3" x="70" width="50" height="20" fill="${color}"/>` +
        `<path fill="${color}" d="M70 0h4v20h-4z"/>` +
        '<rect rx="3" width="120" height="20" fill="url(#b)"/>' +
        '<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">' +
        `<text x="35" y="14">${left}</text>` +
        `<text x="95" y="14">${right}</text>` +
        '</g>' +
        '</svg>'
    );
}

function writeBadge(svg) {
    const outDir = path.join(process.cwd(), 'badges');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'coverage.svg');
    fs.writeFileSync(outFile, svg, 'utf8');
    console.log('Badge written to', outFile);
}

function main() {
    try {
        const summary = readCoverageSummary();
        const percent = getCoveragePercent(summary);
        const svg = generateSvg(percent);
        writeBadge(svg);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
