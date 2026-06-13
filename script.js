const svg = document.getElementById('plot');
const infoPanel = document.getElementById('info');

const inputs = {
    d1: document.getElementById('d1'),
    d2: document.getElementById('d2'),
    d3: document.getElementById('d3'),
    a1_x: document.getElementById('a1_x'),
    a1_y: document.getElementById('a1_y'),
    a2_x: document.getElementById('a2_x'),
    a2_y: document.getElementById('a2_y'),
    sensor_h: document.getElementById('sensor_h'),
    direction: document.getElementById('direction')
};

function draw() {
    // Get values
    const d1 = parseFloat(inputs.d1.value) || 0;
    const d2 = parseFloat(inputs.d2.value) || 0;
    const d3 = parseFloat(inputs.d3.value) || 0;
    const a1 = { x: parseFloat(inputs.a1_x.value) || 0, y: parseFloat(inputs.a1_y.value) || 0 };
    const a2 = { x: parseFloat(inputs.a2_x.value) || 0, y: parseFloat(inputs.a2_y.value) || 0 };
    const direction = inputs.direction.value;
    const sh = parseFloat(inputs.sensor_h.value) || 0;

    // Calculate points
    const R = { x: 0, y: 0 };
    let D1, D2;
    
    if (direction === 'positive') {
        D1 = { x: -d3, y: d1 };
        D2 = { x: -d3, y: d1 + d2 };
    } else {
        D1 = { x: -d3, y: -d1 };
        D2 = { x: -d3, y: -(d1 + d2) };
    }

    // Determine bounds for scaling
    const points = [R, D1, D2, a1, a2];
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    const minX = Math.min(...xs) - 2;
    const maxX = Math.max(...xs) + 2;
    const minY = Math.min(...ys) - 2;
    const maxY = Math.max(...ys) + 2;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    
    // Scale factors
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // Use uniform scaling to preserve aspect ratio. 
    // Since we are mapping math X to SVG Y, and math Y to SVG X, we swap rangeX/rangeY for width/height.
    const scale = Math.min(width / (rangeY || 1), height / (rangeX || 1)) * 0.8;
    
    const cx = width / 2;
    const cy = height / 2;
    
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    function toSvg(p) {
        if (direction === 'positive') {
            // Positive case: X facing down (SVG +y), Y facing right (SVG +x)
            return {
                x: cx + (p.y - midY) * scale,
                y: cy + (p.x - midX) * scale
            };
        } else {
            // Negative case: X facing up (SVG -y), Y facing left (SVG -x)
            return {
                x: cx - (p.y - midY) * scale,
                y: cy - (p.x - midX) * scale
            };
        }
    }

    // Build SVG content
    let svgContent = '';

    // Draw grid & axes
    svgContent += `<g stroke="rgba(255,255,255,0.05)" stroke-width="1">`;
    for(let i = Math.floor(minX); i <= Math.ceil(maxX); i++) {
        const p1 = toSvg({x: i, y: minY});
        const p2 = toSvg({x: i, y: maxY});
        svgContent += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />`;
    }
    for(let i = Math.floor(minY); i <= Math.ceil(maxY); i++) {
        const p1 = toSvg({x: minX, y: i});
        const p2 = toSvg({x: maxX, y: i});
        svgContent += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />`;
    }
    svgContent += `</g>`;

    // Draw Origin axes
    const origin = toSvg(R);
    const xAxisP1 = toSvg({x: minX, y: 0});
    const xAxisP2 = toSvg({x: maxX, y: 0});
    const yAxisP1 = toSvg({x: 0, y: minY});
    const yAxisP2 = toSvg({x: 0, y: maxY});
    
    // X Axis (Red)
    svgContent += `<line x1="${xAxisP1.x}" y1="${xAxisP1.y}" x2="${xAxisP2.x}" y2="${xAxisP2.y}" stroke="rgba(255,100,100,0.4)" stroke-width="2"/>`;
    // Y Axis (Green)
    svgContent += `<line x1="${yAxisP1.x}" y1="${yAxisP1.y}" x2="${yAxisP2.x}" y2="${yAxisP2.y}" stroke="rgba(100,255,100,0.4)" stroke-width="2"/>`;
    
    // Add axis labels
    svgContent += `<text x="${xAxisP2.x + 5}" y="${xAxisP2.y + 5}" fill="rgba(255,100,100,0.8)" font-size="12" font-weight="bold">+X</text>`;
    svgContent += `<text x="${yAxisP2.x + 5}" y="${yAxisP2.y - 5}" fill="rgba(100,255,100,0.8)" font-size="12" font-weight="bold">+Y</text>`;

    // Draw path curve from R to D1, then straight to D2
    const svgR = toSvg(R);
    const svgD1 = toSvg(D1);
    const svgD2 = toSvg(D2);
    
    // Smooth curve from R to D1
    // A reasonable approximation for reverse movement that turns into D1:
    // P1: R (start)
    // CP1: moving backward (x decreases, y is same)
    // CP2: curving towards D1 (x is same as D1, y starts moving to D1.y)
    // P2: D1 (end)
    let cp1x = R.x - d3 * 0.5;
    let cp1y = R.y;
    let cp2x = D1.x;
    let cp2y = D1.y - (direction === 'positive' ? d1*0.5 : -d1*0.5);
    
    const svgCP1 = toSvg({x: cp1x, y: cp1y});
    const svgCP2 = toSvg({x: cp2x, y: cp2y});

    // Draw path
    svgContent += `
        <path d="M ${svgR.x} ${svgR.y} C ${svgCP1.x} ${svgCP1.y}, ${svgCP2.x} ${svgCP2.y}, ${svgD1.x} ${svgD1.y}" fill="none" stroke="rgba(255, 255, 255, 0.5)" stroke-width="3" stroke-dasharray="6,6" />
        <line x1="${svgD1.x}" y1="${svgD1.y}" x2="${svgD2.x}" y2="${svgD2.y}" stroke="rgba(255, 255, 255, 0.5)" stroke-width="3" stroke-dasharray="6,6" />
    `;

    // Draw dimension lines
    const svgPx_d3 = toSvg({ x: -d3, y: 0 });
    const svgMidD3 = toSvg({ x: -d3/2, y: 0 });
    const svgMidD1 = toSvg({ x: -d3, y: (direction === 'positive' ? d1/2 : -d1/2) });
    const svgMidD2 = toSvg({ x: -d3, y: D1.y + (direction === 'positive' ? d2/2 : -d2/2) });

    // Dimension lines
    svgContent += `<line x1="${svgR.x}" y1="${svgR.y}" x2="${svgPx_d3.x}" y2="${svgPx_d3.y}" stroke="rgba(255, 255, 0, 0.4)" stroke-width="2" stroke-dasharray="4,4" />`;
    svgContent += `<line x1="${svgPx_d3.x}" y1="${svgPx_d3.y}" x2="${svgD1.x}" y2="${svgD1.y}" stroke="rgba(255, 255, 0, 0.4)" stroke-width="2" stroke-dasharray="4,4" />`;
    
    // Dimension text
    function drawDimText(sp, text) {
        return `<text x="${sp.x + 8}" y="${sp.y}" fill="rgba(255, 255, 0, 0.9)" font-size="13" font-style="italic" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))">${text}</text>`;
    }
    
    svgContent += drawDimText(svgMidD3, 'd3');
    svgContent += drawDimText(svgMidD1, 'd1');
    svgContent += drawDimText(svgMidD2, 'd2');

    function drawPoint(p, label, color) {
        const sp = toSvg(p);
        return `
            <circle cx="${sp.x}" cy="${sp.y}" r="6" fill="${color}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
            <text x="${sp.x + 10}" y="${sp.y - 10}" fill="${color}" font-size="14" font-weight="bold" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))">${label}</text>
        `;
    }

    svgContent += drawPoint(R, 'R (0,0)', '#10b981');
    svgContent += drawPoint(D1, 'D1', '#f59e0b');
    svgContent += drawPoint(D2, 'D2', '#f59e0b');
    svgContent += drawPoint(a1, 'A1', '#ef4444');
    svgContent += drawPoint(a2, 'A2', '#ef4444');

    svg.innerHTML = svgContent;

    // Update Info Panel
    infoPanel.innerHTML = `
        <div class="info-item">
            <span class="info-label">R (Origin)</span>
            <span class="info-value">(0.00, 0.00)</span>
        </div>
        <div class="info-item">
            <span class="info-label">D1 Point</span>
            <span class="info-value" style="color: var(--point-d)">(${D1.x.toFixed(2)}, ${D1.y.toFixed(2)})</span>
        </div>
        <div class="info-item">
            <span class="info-label">D2 Point</span>
            <span class="info-value" style="color: var(--point-d)">(${D2.x.toFixed(2)}, ${D2.y.toFixed(2)})</span>
        </div>
        <div class="info-item">
            <span class="info-label">A1 Sensor</span>
            <span class="info-value" style="color: var(--point-a)">(${a1.x.toFixed(2)}, ${a1.y.toFixed(2)}, ${sh.toFixed(2)})</span>
        </div>
        <div class="info-item">
            <span class="info-label">A2 Sensor</span>
            <span class="info-value" style="color: var(--point-a)">(${a2.x.toFixed(2)}, ${a2.y.toFixed(2)}, ${sh.toFixed(2)})</span>
        </div>
        <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background: var(--point-r)"></div> R Waypoint</div>
            <div class="legend-item"><div class="legend-color" style="background: var(--point-d)"></div> D Waypoints</div>
            <div class="legend-item"><div class="legend-color" style="background: var(--point-a)"></div> Sensors</div>
        </div>
    `;
}

// Add event listeners to all inputs
Object.values(inputs).forEach(input => {
    input.addEventListener('input', draw);
});

// Use ResizeObserver for more robust SVG resizing
const resizeObserver = new ResizeObserver(() => {
    draw();
});
resizeObserver.observe(svg.parentElement);

// Initial draw after a brief moment to ensure fonts and layout are ready
setTimeout(draw, 100);

let testCases = [];

async function loadTestCases() {
    try {
        const response = await fetch('test_cases.json');
        if (!response.ok) return; // Silent return if file doesn't exist
        testCases = await response.json();
        
        const presetSelect = document.getElementById('preset');
        testCases.forEach((tc, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = tc.name;
            presetSelect.appendChild(option);
        });
        
        presetSelect.addEventListener('change', (e) => {
            if (e.target.value === '') return;
            const tc = testCases[e.target.value];
            if (tc.d1 !== undefined) inputs.d1.value = tc.d1;
            if (tc.d2 !== undefined) inputs.d2.value = tc.d2;
            if (tc.d3 !== undefined) inputs.d3.value = tc.d3;
            if (tc.a1 && tc.a1.x !== undefined) inputs.a1_x.value = tc.a1.x;
            if (tc.a1 && tc.a1.y !== undefined) inputs.a1_y.value = tc.a1.y;
            if (tc.a2 && tc.a2.x !== undefined) inputs.a2_x.value = tc.a2.x;
            if (tc.a2 && tc.a2.y !== undefined) inputs.a2_y.value = tc.a2.y;
            if (tc.h !== undefined) inputs.sensor_h.value = tc.h;
            if (tc.direction !== undefined) inputs.direction.value = tc.direction;
            draw();
        });
    } catch (err) {
        console.error('Failed to load test cases', err);
    }
}

// Load test cases
loadTestCases();
