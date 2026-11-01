(() => {
  'use strict';

  const stages = window.NETWORK_STAGES;
  const sources = window.NETWORK_SOURCES;
  const totalStages = Array.isArray(stages) ? stages.length : 0;
  const VIEWBOX_WIDTH = 1000;
  const VIEWBOX_HEIGHT = 560;

  if (!Array.isArray(stages) || totalStages !== 9 || !sources) {
    document.body.innerHTML = '<p style="padding:2rem;color:#e6edf3">Не удалось загрузить данные девяти этапов. Проверьте файлы js/stages.js и js/app.js.</p>';
    return;
  }

  const state = {
    current: 0,
    furthest: 0,
    started: false,
    siteUrl: null,
    zoom: 1,
    viewX: 0,
    viewY: 0,
    baseWidth: VIEWBOX_WIDTH,
    baseHeight: VIEWBOX_HEIGHT,
    drag: null
  };

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    header: $('#page-header'),
    start: $('#start-screen'),
    form: $('#url-form'),
    input: $('#site-url'),
    hint: $('#start-hint'),
    workspace: $('#workspace'),
    title: $('#stage-title'),
    number: $('#stage-number'),
    counter: $('#step-counter'),
    lead: $('#stage-lead'),
    what: $('#stage-what'),
    why: $('#stage-why'),
    exampleLabel: $('#example-label'),
    example: $('#stage-example'),
    note: $('#stage-note'),
    sources: $('#stage-sources'),
    steps: $('#steps-list'),
    timelineState: $('#timeline-state'),
    caption: $('#diagram-caption'),
    viewport: $('#diagram-viewport'),
    svg: $('#diagram-svg'),
    zoomLabel: $('#zoom-level'),
    resetView: $('#reset-view-button'),
    back: $('#back-button'),
    next: $('#next-button'),
    progress: $('#progress-fill'),
    progressCaption: $('#progress-caption')
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function normalizeHttpsUrl(rawValue) {
    let value = rawValue.trim();
    if (!value) return { error: 'Введи адрес сайта, например https://example.com.' };
    if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)) value = `https://${value}`;

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return { error: 'Не получилось распознать адрес. Проверь написание домена.' };
    }

    if (parsed.protocol !== 'https:') {
      return { error: 'Для этой учебной модели выбери адрес с HTTPS — он включает защищённое соединение.' };
    }
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return { error: 'Укажи полное доменное имя, например example.com.' };
    }
    if (parsed.username || parsed.password) {
      return { error: 'Не добавляй имя пользователя или пароль в адрес.' };
    }
    return { url: parsed };
  }

  function personalize(text) {
    if (!state.siteUrl) return String(text ?? '');
    return String(text ?? '')
      .replaceAll('{{host}}', state.siteUrl.hostname)
      .replaceAll('{{url}}', state.siteUrl.href)
      .replaceAll('example.com', state.siteUrl.hostname);
  }

  function createTimeline() {
    stages.forEach((stage, index) => {
      const button = document.createElement('button');
      button.className = 'step-item';
      button.type = 'button';
      button.dataset.stage = String(index);
      button.disabled = index > state.furthest;
      button.innerHTML = `<span class="step-number">${index + 1}</span><span class="step-label">${escapeHtml(stage.title)}</span>`;
      button.addEventListener('click', () => {
        if (index <= state.furthest) setStage(index);
      });
      elements.steps.append(button);

      if (index < totalStages - 1) {
        const connector = document.createElement('span');
        connector.className = 'step-connector';
        connector.dataset.connector = String(index);
        connector.setAttribute('aria-hidden', 'true');
        connector.innerHTML = '<span></span>';
        elements.steps.append(connector);
      }
    });
  }

  // Measure real glyph widths instead of estimating text width by character count.
  // The canvas uses the same font family and sizes as the SVG labels.
  let measureContext = null;
  function getMeasureContext() {
    if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
    return measureContext;
  }

  function measureTextWidth(text, fontSize, fontWeight = 600) {
    const context = getMeasureContext();
    context.font = `${fontWeight} ${fontSize}px Inter, system-ui, sans-serif`;
    return context.measureText(String(text)).width;
  }

  function splitLongWord(word, maxWidth, fontSize, fontWeight) {
    const pieces = [];
    let piece = '';
    for (const character of Array.from(word)) {
      const candidate = piece + character;
      if (piece && measureTextWidth(candidate, fontSize, fontWeight) > maxWidth) {
        pieces.push(piece);
        piece = character;
      } else {
        piece = candidate;
      }
    }
    if (piece) pieces.push(piece);
    return pieces.length ? pieces : [''];
  }

  function fitWithEllipsis(text, maxWidth, fontSize, fontWeight) {
    const suffix = '…';
    let result = String(text);
    while (result && measureTextWidth(result + suffix, fontSize, fontWeight) > maxWidth) {
      result = Array.from(result).slice(0, -1).join('');
    }
    return result ? result + suffix : suffix;
  }

  function wrapTextToWidth(value, maxWidth, fontSize, maxLines = 2, fontWeight = 600) {
    const safeWidth = Math.max(32, maxWidth);
    const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';

    for (const originalWord of words) {
      const chunks = measureTextWidth(originalWord, fontSize, fontWeight) <= safeWidth
        ? [originalWord]
        : splitLongWord(originalWord, safeWidth, fontSize, fontWeight);

      for (const word of chunks) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measureTextWidth(candidate, fontSize, fontWeight) > safeWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
    }
    if (line) lines.push(line);

    if (lines.length > maxLines) {
      const visible = lines.slice(0, maxLines);
      const remainder = lines.slice(maxLines - 1).join(' ');
      visible[maxLines - 1] = fitWithEllipsis(remainder, safeWidth, fontSize, fontWeight);
      return visible;
    }
    return lines.length ? lines : [''];
  }

  function getDiagramNodes(diagram) {
    return diagram.nodes || diagram.participants || [];
  }

  function validateDiagram(stage) {
    const diagram = stage.diagram;
    const nodes = diagram ? getDiagramNodes(diagram) : [];
    if (!diagram || !Array.isArray(nodes) || nodes.length < 2 || !Array.isArray(diagram.edges)) {
      return 'У этого этапа отсутствуют данные схемы.';
    }

    const ids = new Set(nodes.map((node) => node.id));
    if (ids.size !== nodes.length) return 'В схеме повторяется идентификатор узла.';

    for (const node of nodes) {
      if (!node.id || !Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        return 'У одного из элементов схемы некорректные координаты или идентификатор.';
      }
      if ((Number(node.width) || 0) < 100) return `У элемента «${node.label}» слишком маленькая ширина.`;
    }

    for (const edge of diagram.edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        return `Для сообщения «${edge.label || 'без подписи'}» не найден участник.`;
      }
    }
    return null;
  }

  function svgText(lines, x, centerY, className, lineHeight, fontSize = null) {
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    const tspans = lines.map((line, index) =>
      `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeHtml(line)}</tspan>`
    ).join('');
    const fontAttribute = fontSize ? ` font-size="${fontSize}"` : '';
    return `<text class="${className}" x="${x}" y="${startY}" dominant-baseline="middle"${fontAttribute}>${tspans}</text>`;
  }

  function renderNode(node, index, options = {}) {
    const compact = Boolean(options.compact);
    const width = Number(node.width) || 190;
    const titleSize = compact ? 19 : 22;
    const subtitleSize = compact ? 13.5 : 15;
    const titleLineHeight = compact ? 21 : 24;
    const subtitleLineHeight = compact ? 15 : 17;
    const contentWidth = width - (compact ? 28 : 32);
    const titleLines = wrapTextToWidth(node.label, contentWidth, titleSize, 2, 700);
    const subtitleLines = node.sub
      ? wrapTextToWidth(node.sub, contentWidth, subtitleSize, 2, 500)
      : [];

    const gap = subtitleLines.length ? (compact ? 3 : 5) : 0;
    const textHeight = titleLines.length * titleLineHeight
      + (subtitleLines.length ? gap + subtitleLines.length * subtitleLineHeight : 0);
    const minHeight = compact ? 62 : 96;
    const height = Math.max(Number(options.height) || Number(node.height) || 0, minHeight, textHeight + (compact ? 16 : 24));
    const centerX = Number(node.x);
    const centerY = Number(options.y ?? node.y);
    const left = centerX - width / 2;
    const top = centerY - height / 2;

    let titleCenterY = centerY;
    let subtitleCenterY = centerY;
    if (subtitleLines.length) {
      const totalHeight = textHeight;
      const blockTop = centerY - totalHeight / 2;
      titleCenterY = blockTop + titleLines.length * titleLineHeight / 2;
      subtitleCenterY = blockTop + titleLines.length * titleLineHeight + gap
        + subtitleLines.length * subtitleLineHeight / 2;
    }

    const titleMarkup = svgText(titleLines, centerX, titleCenterY, 'node-title', titleLineHeight, titleSize);
    const subtitleMarkup = subtitleLines.length
      ? svgText(subtitleLines, centerX, subtitleCenterY, 'node-subtitle', subtitleLineHeight, subtitleSize)
      : '';
    const compactClass = compact ? ' sequence-node' : '';

    return {
      width,
      height,
      markup: `
        <g class="node-group${compactClass}" style="--node-delay:${index * 0.035}s">
          <rect class="node-box ${escapeHtml(node.type || 'server')}" x="${left}" y="${top}" width="${width}" height="${height}" rx="14"></rect>
          <circle class="node-indicator" cx="${left + 16}" cy="${top + 16}" r="4"></circle>
          ${titleMarkup}
          ${subtitleMarkup}
        </g>`
    };
  }

  function renderLabel(label, centerX, centerY, availableWidth, fontSize = 15, index = 0) {
    if (!label || availableWidth < 68) return '';
    const paddingX = 14;
    const innerWidth = Math.max(48, availableWidth - paddingX * 2);
    const lines = wrapTextToWidth(label, innerWidth, fontSize, 2, 650);
    const measuredWidth = Math.max(...lines.map((line) => measureTextWidth(line, fontSize, 650)), 0);
    const width = Math.min(availableWidth, Math.max(66, measuredWidth + paddingX * 2));
    const lineHeight = fontSize + 3;
    const height = lines.length * lineHeight + 10;
    return `
      <g class="edge-label-group" style="--edge-delay:${index * 0.07}s">
        <rect class="edge-label-bg" x="${centerX - width / 2}" y="${centerY - height / 2}" width="${width}" height="${height}" rx="8"></rect>
        ${svgText(lines, centerX, centerY, 'edge-label', lineHeight, fontSize)}
      </g>`;
  }

  function renderEdgePath(x1, y, x2, index, reverse = false) {
    const className = reverse ? 'edge-path is-return' : 'edge-path';
    const marker = reverse ? 'arrowhead-return' : 'arrowhead';
    return `<path class="${className}" style="--edge-delay:${index * 0.07}s" marker-end="url(#${marker})" pathLength="1" d="M ${x1} ${y} L ${x2} ${y}"></path>`;
  }

  // Flow charts: cards are enlarged to their content, and arrows touch card edges.
  function renderFlowDiagram(diagram, nodeMap) {
    const edgeLines = [];
    const edgeLabels = [];
    const nodesMarkup = diagram.nodes.map((node, index) => renderNode(node, index).markup).join('');

    diagram.edges.forEach((edge, index) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;
      const direction = to.x >= from.x ? 1 : -1;
      const fromWidth = Number(from.width) || 190;
      const toWidth = Number(to.width) || 190;
      const x1 = from.x + direction * fromWidth / 2;
      const x2 = to.x - direction * toWidth / 2;
      const y = Number.isFinite(edge.y) ? edge.y : from.y;
      if (Math.abs(x2 - x1) < 10) return;

      edgeLines.push(renderEdgePath(x1, y, x2, index, direction < 0));
      if (edge.label) {
        const available = Math.abs(x2 - x1) - 10;
        const centerX = (x1 + x2) / 2 + (edge.labelOffsetX || 0);
        const centerY = Number.isFinite(edge.labelY) ? edge.labelY : y - 42;
        edgeLabels.push(renderLabel(edge.label, centerX, centerY, available, 16, index));
      }
    });

    return {
      edgeLines: edgeLines.join(''),
      nodesMarkup,
      edgeLabels: edgeLabels.join('')
    };
  }

  // Sequence diagrams use a row for every message. Each row repeats only
  // its sender and receiver, so no vertical lifelines are needed.
  function renderSequenceDiagram(diagram, nodeMap, viewHeight) {
    const rowCount = diagram.edges.length;
    const topPadding = 32;
    const bottomPadding = 22;
    const rowGap = (viewHeight - topPadding - bottomPadding) / Math.max(rowCount, 1);
    const edgeLines = [];
    const edgeLabels = [];
    const rowNodes = [];

    diagram.edges.forEach((edge, index) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      const direction = to.x >= from.x ? 1 : -1;
      const fromWidth = Number(from.width) || 190;
      const toWidth = Number(to.width) || 190;
      const rowCenter = topPadding + rowGap * (index + 0.5);
      const cardCenterY = rowCenter + 9;
      const cardHeight = Math.min(72, Math.max(54, rowGap * 0.66));
      const x1 = from.x + direction * fromWidth / 2;
      const x2 = to.x - direction * toWidth / 2;
      const arrowY = cardCenterY;

      const fromCard = renderNode(from, index * 2, { compact: true, y: cardCenterY, height: cardHeight });
      const toCard = renderNode(to, index * 2 + 1, { compact: true, y: cardCenterY, height: cardHeight });
      rowNodes.push(fromCard.markup, toCard.markup);
      edgeLines.push(renderEdgePath(x1, arrowY, x2, index, direction < 0));

      if (edge.label) {
        const available = Math.abs(x2 - x1) - 14;
        const centerX = (x1 + x2) / 2;
        const labelProbe = wrapTextToWidth(edge.label, Math.max(48, available - 28), 16, 2, 650);
        const labelHeight = labelProbe.length * 17.5 + 10;
        const labelCenterY = cardCenterY - cardHeight / 2 - labelHeight / 2 - 7;
        edgeLabels.push(renderLabel(edge.label, centerX, labelCenterY, available, 16, index));
      }
    });

    return {
      edgeLines: edgeLines.join(''),
      nodesMarkup: rowNodes.join(''),
      edgeLabels: edgeLabels.join('')
    };
  }

  function renderDiagram(stage) {
    const diagram = stage.diagram;
    const diagramError = validateDiagram(stage);
    if (diagramError) {
      elements.svg.innerHTML = `<text class="diagram-fallback" x="500" y="280" text-anchor="middle">${escapeHtml(diagramError)}</text>`;
      elements.svg.setAttribute('viewBox', '0 0 1000 560');
      return;
    }

    state.baseWidth = Number(diagram.viewBox?.width) || VIEWBOX_WIDTH;
    state.baseHeight = Number(diagram.viewBox?.height) || VIEWBOX_HEIGHT;
    state.zoom = 1;
    state.viewX = 0;
    state.viewY = 0;
    applyDiagramView();

    const sceneNodes = getDiagramNodes(diagram);
    const nodeMap = new Map(sceneNodes.map((node) => [node.id, node]));
    const defs = `
      <defs>
        <marker id="arrowhead" data-base-width="12" data-base-height="12" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 1 1 L 11 6 L 1 11 z" fill="#8bb5f7"></path>
        </marker>
        <marker id="arrowhead-return" data-base-width="12" data-base-height="12" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 1 1 L 11 6 L 1 11 z" fill="#72d3ad"></path>
        </marker>
      </defs>`;

    const rendered = diagram.kind === 'sequence'
      ? renderSequenceDiagram(diagram, nodeMap, state.baseHeight)
      : renderFlowDiagram(diagram, nodeMap);

    elements.svg.setAttribute('viewBox', `0 0 ${state.baseWidth} ${state.baseHeight}`);
    elements.svg.setAttribute('aria-label', `Схема этапа: ${stage.title}`);
    elements.svg.classList.toggle('is-sequence', diagram.kind === 'sequence');
    elements.svg.classList.remove('is-ready');
    // Плашки сообщений рисуются последними: их фон всегда остаётся над линиями и карточками.
    elements.svg.innerHTML = `${defs}<g class="edges-layer">${rendered.edgeLines}</g><g class="nodes-layer">${rendered.nodesMarkup}</g><g class="labels-layer">${rendered.edgeLabels}</g>`;
    applyDiagramView();
    requestAnimationFrame(() => requestAnimationFrame(() => elements.svg.classList.add('is-ready')));
    elements.zoomLabel.textContent = '100%';
  }

  function renderSources(stage) {
    elements.sources.replaceChildren();
    (stage.sources || []).forEach((sourceId) => {
      const source = sources[sourceId];
      if (!source) return;
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source.label;
      link.title = 'Открыть стандарт или документацию';
      elements.sources.append(link);
    });
  }

  function renderStage() {
    const stage = stages[state.current];
    elements.title.textContent = stage.title;
    elements.number.textContent = `ЭТАП ${state.current + 1}`;
    elements.counter.textContent = `${state.current + 1} / ${totalStages}`;
    elements.lead.textContent = personalize(stage.lead);
    elements.what.textContent = personalize(stage.what);
    elements.why.textContent = personalize(stage.why);
    elements.exampleLabel.textContent = stage.exampleLabel || 'ПРИМЕР';
    elements.example.textContent = personalize(stage.example);
    elements.note.textContent = personalize(stage.note);
    elements.caption.textContent = personalize(stage.caption || 'Учебная схема процесса');
    elements.timelineState.textContent = state.current + 1 === totalStages
      ? 'Финальный этап'
      : `Открыт этап ${state.current + 1}`;
    renderSources(stage);
    renderDiagram(stage);
    renderTimeline();
  }

  function renderTimeline() {
    const buttons = [...elements.steps.querySelectorAll('.step-item')];
    const connectors = [...elements.steps.querySelectorAll('.step-connector')];

    buttons.forEach((button, index) => {
      const isCurrent = index === state.current;
      const isComplete = index < state.furthest;
      const isUnlocked = index <= state.furthest;
      button.classList.toggle('is-current', isCurrent);
      button.classList.toggle('is-complete', isComplete);
      button.disabled = !isUnlocked;
      if (isCurrent) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });

    connectors.forEach((connector, index) => {
      connector.classList.toggle('is-complete', index < state.furthest);
    });

    elements.progress.style.width = `${(state.current + 1) / totalStages * 100}%`;
    elements.progressCaption.textContent = `Текущий этап: ${state.current + 1} из ${totalStages}`;
    elements.back.disabled = state.current === 0;

    const finalStage = state.current === totalStages - 1;
    elements.next.innerHTML = finalStage
      ? 'Завершить <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>'
      : 'Далее <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"></path></svg>';
  }

  function scrollCurrentStageIntoView() {
    const currentButton = elements.steps.querySelector(`[data-stage="${state.current}"]`);
    if (currentButton) currentButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setStage(index) {
    if (!Number.isInteger(index) || index < 0 || index > state.furthest) return;
    state.current = index;
    renderStage();
    scrollCurrentStageIntoView();
  }

  function startExperience(event) {
    event.preventDefault();
    if (state.started) return;

    const result = normalizeHttpsUrl(elements.input.value);
    if (result.error) {
      elements.hint.textContent = result.error;
      elements.hint.classList.add('has-error');
      elements.input.focus();
      return;
    }

    state.siteUrl = result.url;
    elements.input.value = result.url.href;
    state.started = true;
    state.current = 0;
    state.furthest = 0;
    elements.hint.classList.remove('has-error');

    elements.header.classList.add('is-compact');
    elements.start.classList.add('is-exiting');
    elements.workspace.inert = false;
    elements.workspace.classList.add('is-visible');
    renderStage();

    window.setTimeout(() => {
      elements.start.hidden = true;
      scrollCurrentStageIntoView();
    }, 680);
  }

  function finishExperience() {
    elements.workspace.classList.remove('is-visible');
    elements.workspace.inert = true;
    elements.start.hidden = false;
    void elements.start.offsetHeight;
    elements.start.classList.remove('is-exiting');
    elements.header.classList.remove('is-compact');

    state.current = 0;
    state.furthest = 0;
    state.started = false;
    state.siteUrl = null;
    resetDiagramView();
    renderStage();
    elements.steps.scrollTop = 0;
    elements.input.value = 'https://example.com';
    elements.hint.textContent = 'Адрес нужен для примеров внутри схемы. Приложение не отправляет реальные сетевые запросы.';
    elements.hint.classList.remove('has-error');
    window.setTimeout(() => elements.input.focus(), 620);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateDiagramMarkerScale() {
    const markers = elements.svg.querySelectorAll('marker[data-base-width][data-base-height]');
    markers.forEach((marker) => {
      const baseWidth = Number(marker.dataset.baseWidth);
      const baseHeight = Number(marker.dataset.baseHeight);
      marker.setAttribute('markerWidth', String(baseWidth / state.zoom));
      marker.setAttribute('markerHeight', String(baseHeight / state.zoom));
    });
  }

  function applyDiagramView() {
    const width = state.baseWidth / state.zoom;
    const height = state.baseHeight / state.zoom;
    elements.svg.setAttribute('viewBox', `${state.viewX.toFixed(2)} ${state.viewY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`);
    updateDiagramMarkerScale();
    elements.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function resetDiagramView() {
    state.zoom = 1;
    state.viewX = 0;
    state.viewY = 0;
    applyDiagramView();
  }

  elements.viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const bounds = elements.viewport.getBoundingClientRect();
    const pointerX = clamp(event.clientX - bounds.left, 0, bounds.width);
    const pointerY = clamp(event.clientY - bounds.top, 0, bounds.height);

    const oldWidth = state.baseWidth / state.zoom;
    const oldHeight = state.baseHeight / state.zoom;
    const worldX = state.viewX + pointerX * oldWidth / bounds.width;
    const worldY = state.viewY + pointerY * oldHeight / bounds.height;

    state.zoom = clamp(state.zoom * Math.exp(-event.deltaY * 0.0015), 0.5, 3);

    const newWidth = state.baseWidth / state.zoom;
    const newHeight = state.baseHeight / state.zoom;
    state.viewX = worldX - pointerX * newWidth / bounds.width;
    state.viewY = worldY - pointerY * newHeight / bounds.height;
    applyDiagramView();
  }, { passive: false });

  elements.viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const bounds = elements.viewport.getBoundingClientRect();
    state.drag = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      viewX: state.viewX,
      viewY: state.viewY,
      viewWidth: state.baseWidth / state.zoom,
      viewHeight: state.baseHeight / state.zoom,
      pixelWidth: bounds.width,
      pixelHeight: bounds.height
    };
    elements.viewport.setPointerCapture(event.pointerId);
    elements.viewport.classList.add('is-dragging');
  });

  elements.viewport.addEventListener('pointermove', (event) => {
    if (!state.drag) return;
    const dx = event.clientX - state.drag.pointerX;
    const dy = event.clientY - state.drag.pointerY;
    state.viewX = state.drag.viewX - dx * state.drag.viewWidth / state.drag.pixelWidth;
    state.viewY = state.drag.viewY - dy * state.drag.viewHeight / state.drag.pixelHeight;
    applyDiagramView();
  });

  function stopDragging() {
    state.drag = null;
    elements.viewport.classList.remove('is-dragging');
  }

  elements.viewport.addEventListener('pointerup', stopDragging);
  elements.viewport.addEventListener('pointercancel', stopDragging);
  elements.viewport.addEventListener('lostpointercapture', stopDragging);

  elements.form.addEventListener('submit', startExperience);
  elements.input.addEventListener('input', () => {
    elements.hint.classList.remove('has-error');
    elements.hint.textContent = 'Адрес нужен для примеров внутри схемы. Приложение не отправляет реальные сетевые запросы.';
  });
  elements.back.addEventListener('click', () => setStage(state.current - 1));
  elements.next.addEventListener('click', () => {
    if (state.current === totalStages - 1) finishExperience();
    else {
      state.current += 1;
      state.furthest = Math.max(state.furthest, state.current);
      renderStage();
      scrollCurrentStageIntoView();
    }
  });
  elements.resetView.addEventListener('click', resetDiagramView);

  createTimeline();
  renderStage();
  applyDiagramView();
})();
