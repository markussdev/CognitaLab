/* Split from script.js. Loaded as classic global script. */
function handleExport(format) {
  const name = document.getElementById('diagramName').value || 'cognita-lab';
  switch (format) {
    case 'json': exportJSON(name); break;
    case 'png': exportPNG(name, 'doc-light'); break;
    case 'png-doc-light': exportPNG(name, 'doc-light'); break;
    case 'png-doc-dark': exportPNG(name, 'doc-dark'); break;
    case 'png-slide': exportPNG(name, 'slide'); break;
    case 'png-mobile': exportPNG(name, 'mobile'); break;
    case 'svg': exportSVG(name); break;
    case 'mermaid': exportMermaid(name); break;
    case 'text': exportText(name); break;
  }
}

function exportJSON(name) {
  const data = {
    diagramName: name,
    template: state.activeTemplate,
    codeImportMeta: state.codeImportMeta,
    lanes: state.lanes,
    blocks: state.blocks,
    connections: state.connections,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  downloadFile(name + '.json', JSON.stringify(data, null, 2), 'application/json');
  toast('JSON exportado', 'success');
}

function getCanvasBlockSize(block) {
  const el = document.getElementById(`block-${block.id}`);
  const w = Math.max(230, Math.min(280, el?.offsetWidth || 240));
  const h = Math.max(96, Math.min(150, el?.offsetHeight || 104));
  return { w, h };
}

function getCanvasBounds(padding = 90) {
  const items = state.blocks.map(b => {
    const s = getCanvasBlockSize(b);
    return { x1: b.x, y1: b.y, x2: b.x + s.w, y2: b.y + s.h };
  });

  (state.lanes || []).forEach(l => items.push({ x1: l.x, y1: l.y, x2: l.x + l.w, y2: l.y + l.h }));

  const minX = Math.min(...items.map(i => i.x1)) - padding;
  const minY = Math.min(...items.map(i => i.y1)) - padding;
  const maxX = Math.max(...items.map(i => i.x2)) + padding;
  const maxY = Math.max(...items.map(i => i.y2)) + padding;
  return { minX, minY, maxX, maxY, W: maxX - minX, H: maxY - minY };
}

function getCanvasConnectionGeometry(from, to) {
  const fs = getCanvasBlockSize(from);
  const ts = getCanvasBlockSize(to);
  const fcx = from.x + fs.w / 2, fcy = from.y + fs.h / 2;
  const tcx = to.x + ts.w / 2, tcy = to.y + ts.h / 2;
  const dx = tcx - fcx, dy = tcy - fcy;
  const OFFSET = 18;

  let fx, fy, tx, ty;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { fx = from.x + fs.w; tx = to.x - OFFSET; }
    else         { fx = from.x;        tx = to.x + ts.w + OFFSET; }
    fy = fcy; ty = tcy;
  } else {
    if (dy >= 0) { fy = from.y + fs.h; ty = to.y - OFFSET; }
    else         { fy = from.y;        ty = to.y + ts.h + OFFSET; }
    fx = fcx; tx = tcx;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    const c = Math.max(70, Math.abs(tx - fx) * 0.42);
    const sx = dx >= 0 ? 1 : -1;
    return { fx, fy, c1x: fx + sx * c, c1y: fy, c2x: tx - sx * c, c2y: ty, tx, ty };
  }

  const c = Math.max(60, Math.abs(ty - fy) * 0.42);
  const sy = dy >= 0 ? 1 : -1;
  return { fx, fy, c1x: fx, c1y: fy + sy * c, c2x: tx, c2y: ty - sy * c, tx, ty };
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 10;
  ctx.save();
  ctx.translate(toX, toY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.55);
  ctx.lineTo(-size, size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    visible[visible.length - 1] = visible[visible.length - 1].replace(/\s+$/, '') + '...';
    lines.length = maxLines;
  }
  if (lines.length > maxLines && visible.length) visible[visible.length - 1] = visible[visible.length - 1].replace(/\s+$/, '') + '…';
  visible.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
  return visible.length * lineHeight;
}

function safeFileStem(name) {
  return String(name || 'cognita-lab')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'cognita-lab';
}

function resolvePNGExportPreset(presetKey, bounds) {
  const tallDiagram = bounds.H > bounds.W * 1.12;
  const docSize = tallDiagram
    ? { width: 2480, height: 3508, orientation: 'retrato' }
    : { width: 3508, height: 2480, orientation: 'paisagem' };

  const presets = {
    'doc-light': {
      ...docSize,
      key: 'doc-light',
      suffix: 'documento-claro',
      theme: 'light',
      padding: 170,
      titleHeight: 210,
      maxScale: 2.2,
      titleSize: 58,
      subtitleSize: 30,
      gridStep: 72,
    },
    'doc-dark': {
      ...docSize,
      key: 'doc-dark',
      suffix: 'documento-escuro',
      theme: 'dark',
      padding: 170,
      titleHeight: 210,
      maxScale: 2.2,
      titleSize: 58,
      subtitleSize: 30,
      gridStep: 72,
    },
    slide: {
      width: 2560,
      height: 1440,
      orientation: '16:9',
      key: 'slide',
      suffix: 'slide-16x9',
      theme: 'dark',
      padding: 120,
      titleHeight: 150,
      maxScale: 1.8,
      titleSize: 42,
      subtitleSize: 22,
      gridStep: 58,
    },
    mobile: {
      width: 1440,
      height: 2560,
      orientation: 'mobile',
      key: 'mobile',
      suffix: 'mobile',
      theme: 'dark',
      padding: 92,
      titleHeight: 150,
      maxScale: 1.55,
      titleSize: 40,
      subtitleSize: 22,
      gridStep: 54,
    },
  };

  return presets[presetKey] || presets['doc-light'];
}

function getPNGExportTheme(themeKey) {
  if (themeKey === 'light') {
    return {
      bg: '#f8fafc',
      grid: 'rgba(15, 23, 42, 0.075)',
      title: '#0f172a',
      muted: '#475569',
      laneFill: 'rgba(14, 165, 233, 0.035)',
      laneStroke: 'rgba(15, 23, 42, 0.14)',
      connection: 'rgba(8, 145, 178, 0.78)',
      connectionLabelBg: 'rgba(248,250,252,0.94)',
      connectionLabel: '#0f766e',
      blockFill: '#ffffff',
      blockBorder: 'rgba(15, 23, 42, 0.18)',
      blockText: '#0f172a',
      blockMuted: '#475569',
      typeFill: 'rgba(15, 23, 42, 0.045)',
      typeBorder: 'rgba(15, 23, 42, 0.10)',
      shadow: 'rgba(15,23,42,0.16)',
    };
  }

  return {
    bg: '#090b10',
    grid: 'rgba(160,170,190,0.10)',
    title: '#f1f4f8',
    muted: '#9aa4b7',
    laneFill: 'rgba(255,255,255,0.018)',
    laneStroke: 'rgba(160,170,190,0.16)',
    connection: 'rgba(142,162,255,0.78)',
    connectionLabelBg: 'rgba(9,11,16,0.92)',
    connectionLabel: '#c8d0e8',
    blockFill: '#11151d',
    blockBorder: 'rgba(180,190,210,0.22)',
    blockText: '#f1f4f8',
    blockMuted: '#9aa4b7',
    typeFill: 'rgba(255,255,255,0.06)',
    typeBorder: 'rgba(180,190,210,0.12)',
    shadow: 'rgba(0,0,0,0.34)',
  };
}

function drawPNGExportBackground(ctx, preset, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, preset.width, preset.height);

  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= preset.width; x += preset.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, preset.height);
    ctx.stroke();
  }
  for (let y = 0; y <= preset.height; y += preset.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(preset.width, y);
    ctx.stroke();
  }
}

function drawPNGExportHeader(ctx, name, preset, theme) {
  if (!preset.titleHeight) return;
  const x = preset.padding;
  const titleY = Math.round(preset.padding * 0.58);
  const subtitleY = titleY + Math.round(preset.titleSize * 0.82);

  ctx.fillStyle = theme.title;
  ctx.font = `800 ${preset.titleSize}px Segoe UI, Arial, sans-serif`;
  ctx.fillText(`Figura - ${name}`, x, titleY);

  ctx.fillStyle = theme.muted;
  ctx.font = `500 ${preset.subtitleSize}px Segoe UI, Arial, sans-serif`;
  const meta = `${state.blocks.length} blocos - ${state.connections.length} conexoes - PNG ${preset.orientation}`;
  ctx.fillText(meta, x, subtitleY);
}

function drawPNGExportDiagram(ctx, bounds, preset, theme) {
  const contentX = preset.padding;
  const contentY = preset.titleHeight;
  const contentW = preset.width - preset.padding * 2;
  const contentH = preset.height - preset.titleHeight - preset.padding;
  const fitScale = Math.min(contentW / bounds.W, contentH / bounds.H, preset.maxScale);
  const dx = contentX + (contentW - bounds.W * fitScale) / 2 - bounds.minX * fitScale;
  const dy = contentY + (contentH - bounds.H * fitScale) / 2 - bounds.minY * fitScale;

  ctx.save();
  ctx.translate(dx, dy);
  ctx.scale(fitScale, fitScale);

  (state.lanes || []).forEach(lane => {
    ctx.fillStyle = theme.laneFill;
    ctx.strokeStyle = theme.laneStroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(lane.x, lane.y, lane.w, lane.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.muted;
    ctx.font = '700 11px Segoe UI, Arial, sans-serif';
    ctx.fillText(String(lane.label || '').toUpperCase(), lane.x + 16, lane.y + 26);
  });

  state.connections.forEach(conn => {
    const from = state.blocks.find(b => b.id === conn.from);
    const to = state.blocks.find(b => b.id === conn.to);
    if (!from || !to) return;

    const g = getCanvasConnectionGeometry(from, to);
    ctx.strokeStyle = theme.connection;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(g.fx, g.fy);
    ctx.bezierCurveTo(g.c1x, g.c1y, g.c2x, g.c2y, g.tx, g.ty);
    ctx.stroke();
    drawArrowHead(ctx, g.c2x, g.c2y, g.tx, g.ty, theme.connection);

    if (conn.label) {
      const lx = (g.fx + g.tx) / 2;
      const ly = (g.fy + g.ty) / 2 - 8;
      ctx.font = '11px Segoe UI, Arial, sans-serif';
      const tw = ctx.measureText(conn.label).width + 14;
      ctx.fillStyle = theme.connectionLabelBg;
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - 14, tw, 20, 5);
      ctx.fill();
      ctx.fillStyle = theme.connectionLabel;
      ctx.textAlign = 'center';
      ctx.fillText(conn.label, lx, ly);
      ctx.textAlign = 'left';
    }
  });

  state.blocks.forEach(b => {
    const { w, h } = getCanvasBlockSize(b);
    const x = b.x, y = b.y;
    const color = b.color || '#8ea2ff';

    ctx.shadowColor = theme.shadow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = theme.blockFill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = theme.blockBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, 5, h, 2);
    ctx.fill();

    ctx.fillStyle = theme.typeFill;
    ctx.strokeStyle = theme.typeBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 14, 78, 22, 5);
    ctx.fill();
    ctx.stroke();

    const typeDef = BLOCK_TYPES.find(t => t.type === b.type) || BLOCK_TYPES[1];
    ctx.fillStyle = color;
    ctx.font = '800 10px Segoe UI, Arial, sans-serif';
    ctx.fillText(typeDef.label.toUpperCase().slice(0, 15), x + 28, y + 29);

    ctx.fillStyle = theme.blockText;
    ctx.font = '800 15px Segoe UI, Arial, sans-serif';
    const titleUsed = wrapCanvasText(ctx, b.title, x + 18, y + 58, w - 34, 18, 2);

    if (b.description) {
      ctx.fillStyle = theme.blockMuted;
      ctx.font = '12px Segoe UI, Arial, sans-serif';
      wrapCanvasText(ctx, b.description, x + 18, y + 64 + titleUsed, w - 34, 16, 2);
    }
  });

  ctx.restore();
}

function exportPNG(name, presetKey = 'doc-light') {
  if (state.blocks.length === 0) { toast('Nenhum conteúdo para exportar', 'error'); return; }

  // Garante que o tamanho real dos cards exista antes de medir/exportar.
  renderAll();

  const bounds = getCanvasBounds(95);
  const preset = resolvePNGExportPreset(presetKey, bounds);
  const theme = getPNGExportTheme(preset.theme);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = preset.width;
  exportCanvas.height = preset.height;
  const exportCtx = exportCanvas.getContext('2d');

  drawPNGExportBackground(exportCtx, preset, theme);
  drawPNGExportHeader(exportCtx, name, preset, theme);
  drawPNGExportDiagram(exportCtx, bounds, preset, theme);

  exportCanvas.toBlob(blob => {
    if (!blob) { toast('Nao foi possivel gerar o PNG', 'error'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileStem(name)}-${preset.suffix}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`PNG ${preset.suffix} exportado`, 'success');
  }, 'image/png');

  return;

  const { minX, minY, W, H } = getCanvasBounds(100);
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(W * scale);
  canvas.height = Math.ceil(H * scale);
  const ctx = canvas.getContext('2d');

  ctx.scale(scale, scale);
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, W, H);

  // Grade discreta para o documento escrito.
  ctx.strokeStyle = 'rgba(160,170,190,0.10)';
  ctx.lineWidth = 0.6;
  for (let x = 0; x <= W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.save();
  ctx.translate(-minX, -minY);

  // Swimlanes primeiro, atrás dos blocos.
  (state.lanes || []).forEach(lane => {
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    ctx.strokeStyle = 'rgba(160,170,190,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lane.x, lane.y, lane.w, lane.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,210,230,0.55)';
    ctx.font = '700 11px Segoe UI, Arial, sans-serif';
    ctx.fillText(String(lane.label || '').toUpperCase(), lane.x + 16, lane.y + 26);
  });

  // Conexões com contraste maior e setas reais no PNG.
  state.connections.forEach(conn => {
    const from = state.blocks.find(b => b.id === conn.from);
    const to = state.blocks.find(b => b.id === conn.to);
    if (!from || !to) return;

    const g = getCanvasConnectionGeometry(from, to);
    const color = 'rgba(142,162,255,0.78)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(g.fx, g.fy);
    ctx.bezierCurveTo(g.c1x, g.c1y, g.c2x, g.c2y, g.tx, g.ty);
    ctx.stroke();
    drawArrowHead(ctx, g.c2x, g.c2y, g.tx, g.ty, color);

    if (conn.label) {
      const lx = (g.fx + g.tx) / 2;
      const ly = (g.fy + g.ty) / 2 - 8;
      ctx.font = '11px Segoe UI, Arial, sans-serif';
      const tw = ctx.measureText(conn.label).width + 14;
      ctx.fillStyle = 'rgba(9,11,16,0.92)';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - 14, tw, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#c8d0e8';
      ctx.textAlign = 'center';
      ctx.fillText(conn.label, lx, ly);
      ctx.textAlign = 'left';
    }
  });

  // Blocos por último, para as linhas não poluírem o texto.
  state.blocks.forEach(b => {
    const { w, h } = getCanvasBlockSize(b);
    const x = b.x, y = b.y;
    const color = b.color || '#8ea2ff';

    ctx.shadowColor = 'rgba(0,0,0,0.34)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#11151d';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(180,190,210,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, 4, h, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(180,190,210,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 14, 72, 22, 5);
    ctx.fill();
    ctx.stroke();

    const typeDef = BLOCK_TYPES.find(t => t.type === b.type) || BLOCK_TYPES[1];
    ctx.fillStyle = '#aeb7c8';
    ctx.font = '700 10px Segoe UI, Arial, sans-serif';
    ctx.fillText(typeDef.label.toUpperCase().slice(0, 14), x + 28, y + 29);

    ctx.fillStyle = '#f1f4f8';
    ctx.font = '700 15px Segoe UI, Arial, sans-serif';
    const titleUsed = wrapCanvasText(ctx, b.title, x + 18, y + 56, w - 34, 18, 2);

    if (b.description) {
      ctx.fillStyle = '#9aa4b7';
      ctx.font = '12px Segoe UI, Arial, sans-serif';
      wrapCanvasText(ctx, b.description, x + 18, y + 62 + titleUsed, w - 34, 16, 2);
    }
  });

  ctx.restore();

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.png'; a.click();
    URL.revokeObjectURL(url);
    toast('PNG exportado em 3x para documentação', 'success');
  }, 'image/png');
}

function exportSVG(name) {
  if (state.blocks.length === 0) { toast('Nenhum conteúdo para exportar', 'error'); return; }
  {
    renderAll();
    const bounds = getCanvasBounds(80);
    const W = Math.ceil(bounds.W);
    const H = Math.ceil(bounds.H);
    const ox = -bounds.minX;
    const oy = -bounds.minY;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f8fafc"/>
<defs><marker id="arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#0891b2"/></marker></defs>
`;

    for (let x = 0; x <= W; x += 34) svg += `<path d="M${x} 0V${H}" stroke="rgba(15,23,42,0.06)" stroke-width="1"/>`;
    for (let y = 0; y <= H; y += 34) svg += `<path d="M0 ${y}H${W}" stroke="rgba(15,23,42,0.06)" stroke-width="1"/>`;

    state.connections.forEach(conn => {
      const from = state.blocks.find(b => b.id === conn.from);
      const to = state.blocks.find(b => b.id === conn.to);
      if (!from || !to) return;
      const g = getCanvasConnectionGeometry(from, to);
      svg += `<path d="M${g.fx + ox},${g.fy + oy} C${g.c1x + ox},${g.c1y + oy} ${g.c2x + ox},${g.c2y + oy} ${g.tx + ox},${g.ty + oy}" stroke="#0891b2" stroke-width="2.2" fill="none" marker-end="url(#arr)"/>`;
      if (conn.label) svg += `<text x="${(g.fx + g.tx) / 2 + ox}" y="${(g.fy + g.ty) / 2 + oy - 8}" fill="#0f766e" font-size="11" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif">${escHtml(conn.label)}</text>`;
    });

    state.blocks.forEach(b => {
      const s = getCanvasBlockSize(b);
      const x = b.x + ox;
      const y = b.y + oy;
      const color = b.color || '#0891b2';
      const typeDef = BLOCK_TYPES.find(t => t.type === b.type) || BLOCK_TYPES[1];
      svg += `<rect x="${x}" y="${y}" width="${s.w}" height="${s.h}" rx="14" fill="#ffffff" stroke="rgba(15,23,42,0.18)" stroke-width="1"/>`;
      svg += `<rect x="${x}" y="${y}" width="5" height="${s.h}" rx="2" fill="${color}"/>`;
      svg += `<text x="${x + 18}" y="${y + 28}" fill="${color}" font-size="10" font-weight="800" font-family="Segoe UI,Arial,sans-serif">${escHtml(typeDef.label.toUpperCase().slice(0, 15))}</text>`;
      svg += `<text x="${x + 18}" y="${y + 58}" fill="#0f172a" font-size="15" font-weight="800" font-family="Segoe UI,Arial,sans-serif">${escHtml(String(b.title || '').slice(0, 34))}</text>`;
      if (b.description) svg += `<text x="${x + 18}" y="${y + 78}" fill="#475569" font-size="12" font-family="Segoe UI,Arial,sans-serif">${escHtml(String(b.description || '').slice(0, 44))}</text>`;
    });

    svg += '</svg>';
    downloadFile(`${safeFileStem(name)}.svg`, svg, 'image/svg+xml');
    toast('SVG exportado', 'success');
    return;
  }
  const minX = Math.min(...state.blocks.map(b => b.x)) - 40;
  const minY = Math.min(...state.blocks.map(b => b.y)) - 40;
  const maxX = Math.max(...state.blocks.map(b => b.x + 220)) + 40;
  const maxY = Math.max(...state.blocks.map(b => b.y + 100)) + 40;
  const W = maxX - minX, H = maxY - minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#06100f"/>
<defs><marker id="arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#47d6bd"/></marker></defs>
`;

  state.connections.forEach(conn => {
    const from = state.blocks.find(b => b.id === conn.from);
    const to = state.blocks.find(b => b.id === conn.to);
    if (!from || !to) return;
    const fx = from.x - minX + 100, fy = from.y - minY + 32;
    const tx = to.x - minX + 20, ty = to.y - minY + 32;
    const dx = tx - fx;
    svg += `<path d="M${fx},${fy} C${fx+dx*0.4},${fy} ${tx-dx*0.4},${ty} ${tx},${ty}" stroke="#47d6bd" stroke-width="1.8" fill="none" marker-end="url(#arr)"/>`;
    if (conn.label) svg += `<text x="${(fx+tx)/2}" y="${(fy+ty)/2-6}" fill="#91aaa5" font-size="10" text-anchor="middle" font-family="Segoe UI,sans-serif">${escHtml(conn.label)}</text>`;
  });

  state.blocks.forEach(b => {
    const x = b.x - minX, y = b.y - minY;
    svg += `<rect x="${x}" y="${y}" width="180" height="70" rx="10" fill="#0b1b19" stroke="${b.color || '#47d6bd'}" stroke-width="0.5"/>`;
    svg += `<rect x="${x}" y="${y}" width="3" height="70" rx="1" fill="${b.color || '#47d6bd'}"/>`;
    svg += `<text x="${x+18}" y="${y+28}" fill="#edf7f5" font-size="12" font-weight="700" font-family="Segoe UI,sans-serif">${escHtml(b.title.substring(0,22))}</text>`;
    if (b.description) svg += `<text x="${x+18}" y="${y+44}" fill="#91aaa5" font-size="10" font-family="Segoe UI,sans-serif">${escHtml(b.description.substring(0,30))}</text>`;
  });

  svg += '</svg>';
  downloadFile(name + '.svg', svg, 'image/svg+xml');
  toast('SVG exportado', 'success');
}

function exportMermaid(name) {
  let md = `flowchart LR\n`;
  state.blocks.forEach(b => {
    const safeId = 'n' + b.id.replace(/-/g, '');
    const label = b.title.replace(/"/g, "'");
    if (b.type === 'decision') md += `  ${safeId}{{"${label}"}}\n`;
    else if (b.type === 'start') md += `  ${safeId}(("${label}"))\n`;
    else if (b.type === 'database') md += `  ${safeId}[("${label}")]\n`;
    else md += `  ${safeId}["${label}"]\n`;
  });
  state.connections.forEach(c => {
    const fromId = 'n' + c.from.replace(/-/g,'');
    const toId = 'n' + c.to.replace(/-/g,'');
    if (c.label) md += `  ${fromId} -->|"${c.label}"| ${toId}\n`;
    else md += `  ${fromId} --> ${toId}\n`;
  });
  downloadFile(name + '.md', md, 'text/plain');
  toast('Mermaid exportado', 'success');
}

function exportText(name) {
  const tName = document.getElementById('diagramName').value;
  const tmpl = state.activeTemplate ? TEMPLATES.find(t => t.id === state.activeTemplate) : null;
  let txt = `COGNITA LAB — Documentação Técnica\n`;
  txt += `${'='.repeat(50)}\n\n`;
  txt += `Diagrama: ${tName}\n`;
  if (tmpl) txt += `Exemplo: ${tmpl.title}\n`;
  txt += `Exportado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  txt += `OBJETIVO\n${'─'.repeat(30)}\n`;
  txt += tmpl ? tmpl.desc : 'Diagrama personalizado da CognitaMente.\n';
  txt += `\n\nBLOCOS PRINCIPAIS\n${'─'.repeat(30)}\n`;
  state.blocks.forEach((b, i) => {
    const typeDef = BLOCK_TYPES.find(t => t.type === b.type);
    txt += `\n${i+1}. ${b.title}\n`;
    txt += `   Tipo: ${typeDef ? typeDef.label : b.type}\n`;
    if (b.description) txt += `   Descrição: ${b.description}\n`;
    if (b.tags && b.tags.length) txt += `   Tags: ${b.tags.join(', ')}\n`;
  });
  txt += `\nCONEXÕES\n${'─'.repeat(30)}\n`;
  state.connections.forEach((c, i) => {
    const from = state.blocks.find(b => b.id === c.from);
    const to = state.blocks.find(b => b.id === c.to);
    txt += `\n${i+1}. ${from ? from.title : '?'} → ${to ? to.title : '?'}`;
    if (c.label) txt += ` [${c.label}]`;
    txt += '\n';
  });
  txt += `\n${'─'.repeat(50)}\nGerado pelo Cognita Lab — Studio técnico da CognitaMente\n`;
  downloadFile(name + '.txt', txt, 'text/plain');
  toast('Documentação exportada', 'success');
}

