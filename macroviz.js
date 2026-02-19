function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

export function renderMacroBreakdown(container, totals) {
  if (!container) return;
  container.innerHTML = '';

  const grams = {
    carbs: safeNum(totals?.c),
    protein: safeNum(totals?.p),
    fat: safeNum(totals?.f)
  };
  const kcals = {
    carbs: grams.carbs * 4,
    protein: grams.protein * 4,
    fat: grams.fat * 9
  };
  const totalMacroKcal = kcals.carbs + kcals.protein + kcals.fat;

  const split = totalMacroKcal > 0
    ? {
        carbs: (kcals.carbs / totalMacroKcal) * 100,
        protein: (kcals.protein / totalMacroKcal) * 100,
        fat: (kcals.fat / totalMacroKcal) * 100
      }
    : { carbs: 0, protein: 0, fat: 0 };

  const ringWrap = document.createElement('div');
  ringWrap.className = 'macro-breakdown-chart';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 220');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Macro breakdown donut chart');

  const bg = document.createElementNS(svgNS, 'circle');
  bg.setAttribute('cx', '110');
  bg.setAttribute('cy', '110');
  bg.setAttribute('r', '76');
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'var(--border)');
  bg.setAttribute('stroke-width', '30');
  svg.appendChild(bg);

  const segments = [
    { key: 'carbs', color: '#f97316' },
    { key: 'protein', color: '#16a34a' },
    { key: 'fat', color: '#eab308' }
  ];

  let angle = -Math.PI / 2;
  segments.forEach((segment) => {
    const pct = split[segment.key] / 100;
    if (pct <= 0) return;
    const end = angle + pct * Math.PI * 2;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', arcPath(110, 110, 76, angle, end));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', segment.color);
    path.setAttribute('stroke-width', '30');
    path.setAttribute('stroke-linecap', 'butt');
    svg.appendChild(path);
    angle = end;
  });

  const centerTop = document.createElementNS(svgNS, 'text');
  centerTop.setAttribute('x', '110');
  centerTop.setAttribute('y', '102');
  centerTop.setAttribute('text-anchor', 'middle');
  centerTop.setAttribute('class', 'macro-breakdown-center-label');
  centerTop.textContent = 'Macro kcal';

  const centerValue = document.createElementNS(svgNS, 'text');
  centerValue.setAttribute('x', '110');
  centerValue.setAttribute('y', '124');
  centerValue.setAttribute('text-anchor', 'middle');
  centerValue.setAttribute('class', 'macro-breakdown-center-value');
  centerValue.textContent = `${Math.round(totalMacroKcal)}`;

  svg.append(centerTop, centerValue);
  ringWrap.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'macro-breakdown-legend';

  const rows = [
    { key: 'carbs', label: 'Carbs', colorClass: 'carbs' },
    { key: 'protein', label: 'Protein', colorClass: 'protein' },
    { key: 'fat', label: 'Fat', colorClass: 'fat' }
  ];

  rows.forEach((row) => {
    const item = document.createElement('div');
    item.className = 'macro-breakdown-row';

    const left = document.createElement('span');
    left.className = 'macro-breakdown-label';

    const dot = document.createElement('span');
    dot.className = `macro-breakdown-dot ${row.colorClass}`;

    const text = document.createElement('span');
    text.textContent = row.label;
    left.append(dot, text);

    const right = document.createElement('span');
    right.className = 'muted tiny';
    right.textContent = `${Math.round(grams[row.key])} g • ${Math.round(split[row.key])}%`;

    item.append(left, right);
    legend.appendChild(item);
  });

  container.append(ringWrap, legend);
}
