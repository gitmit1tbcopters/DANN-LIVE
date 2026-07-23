import * as d3 from 'd3';
import { STEP_NARRATIVE } from '../tutor/narrative.js';

// Architecture diagram with per-layer detail inside each module, so students
// see the actual conv/pool/dense stack rather than one opaque box per module.
// Layer lists mirror src/model/dann.js exactly (kept in sync by hand).
const FEATURE_LAYERS = ['conv 5x5, 32', 'pool 2x2', 'conv 5x5, 64', 'pool 2x2', 'conv 3x3, 128', 'pool 2x2', 'flatten', 'dense 128'];
const LABEL_LAYERS = ['dense 64', 'dropout 0.5', 'dense 10 (softmax)'];
const DOMAIN_LAYERS = ['dense 64', 'dense 1 (sigmoid)'];

const MODULES = [
  { id: 'input', title: 'input image', shape: '64x64x3', layers: [], x: 205, y: 20, w: 170, color: '#3a2f26' },
  { id: 'featureExtractor', title: 'G_f  feature extractor', shape: null, layers: FEATURE_LAYERS, x: 140, y: 100, w: 300, color: '#3a2f26' },
  { id: 'labelPredictor', title: 'G_y  label predictor', shape: null, layers: LABEL_LAYERS, x: 20, y: 470, w: 190, color: '#2c4a7c' },
  { id: 'domainClassifier', title: 'G_d  domain classifier', shape: null, layers: DOMAIN_LAYERS, x: 370, y: 500, w: 190, color: '#c0392b' },
];

const ROW_H = 22;
const HEADER_H = 26;
const PAD_Y = 8;

function moduleHeight(m) {
  if (m.layers.length === 0) return 40;
  return HEADER_H + m.layers.length * ROW_H + PAD_Y;
}

const GRL = { id: 'grl', label: 'GRL', caption: 'fwd id / back -lambda', x: 390, y: 400, w: 150, h: 44 };

const STEP_TO_NODE = {
  'sample-batch': 'input',
  'forward-source': 'featureExtractor',
  'forward-target': 'featureExtractor',
  'label-loss': 'labelPredictor',
  'grl-reverse': 'grl',
  'domain-loss': 'domainClassifier',
  'backward-and-update': 'featureExtractor',
};

const NODE_TOOLTIP = {
  input: STEP_NARRATIVE['sample-batch'].text,
  featureExtractor: STEP_NARRATIVE['forward-source'].text,
  labelPredictor: STEP_NARRATIVE['label-loss'].text,
  grl: STEP_NARRATIVE['grl-reverse'].text,
  domainClassifier: STEP_NARRATIVE['domain-loss'].text,
};

export function createNetworkDiagram(svgEl) {
  const svg = d3.select(svgEl);
  svg.attr('viewBox', '0 0 580 620').attr('preserveAspectRatio', 'xMidYMid meet');

  function centerOf(id) {
    if (id === 'grl') return { x: GRL.x + GRL.w / 2, y: GRL.y + GRL.h / 2 };
    const m = MODULES.find((m) => m.id === id);
    return { x: m.x + m.w / 2, y: m.y + moduleHeight(m) / 2 };
  }
  function topOf(id) {
    if (id === 'grl') return { x: GRL.x + GRL.w / 2, y: GRL.y };
    const m = MODULES.find((m) => m.id === id);
    return { x: m.x + m.w / 2, y: m.y };
  }
  function bottomOf(id) {
    if (id === 'grl') return { x: GRL.x + GRL.w / 2, y: GRL.y + GRL.h };
    const m = MODULES.find((m) => m.id === id);
    return { x: m.x + m.w / 2, y: m.y + moduleHeight(m) };
  }

  const edgeLayer = svg.append('g');
  const nodeLayer = svg.append('g');

  function edge(fromId, toId, { dashed = false, stroke = '#8a7d68', label = null, labelId = null } = {}) {
    const a = bottomOf(fromId);
    const b = topOf(toId);
    edgeLayer
      .append('line')
      .attr('class', `edge edge-${fromId}-${toId}`)
      .attr('x1', a.x)
      .attr('y1', a.y)
      .attr('x2', b.x)
      .attr('y2', b.y)
      .attr('stroke', stroke)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', dashed ? '5,4' : null)
      .attr('marker-end', 'url(#arrowhead)');
    if (label) {
      edgeLayer
        .append('text')
        .attr('id', labelId)
        .attr('x', (a.x + b.x) / 2 + 8)
        .attr('y', (a.y + b.y) / 2)
        .attr('fill', '#6b5f4f')
        .style('font-size', '9px')
        .text(label);
    }
  }

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M0,0 L10,5 L0,10 z')
    .attr('fill', '#8a7d68');

  edge('input', 'featureExtractor', { label: 'batch: -', labelId: 'label-batch' });
  edge('featureExtractor', 'labelPredictor', { label: 'L_y: -', labelId: 'label-yloss' });
  edge('featureExtractor', 'grl', { label: 'h (128,)' });
  edge('grl', 'domainClassifier', { dashed: true, stroke: '#c0392b', label: 'lambda: -  L_d: -', labelId: 'label-dloss' });

  const moduleG = nodeLayer
    .selectAll('g.module')
    .data(MODULES)
    .enter()
    .append('g')
    .attr('class', 'module')
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  moduleG.append('title').text((d) => NODE_TOOLTIP[d.id] ?? '');

  moduleG
    .append('rect')
    .attr('width', (d) => d.w)
    .attr('height', (d) => moduleHeight(d))
    .attr('rx', 8)
    .attr('fill', (d) => d.color)
    .attr('id', (d) => `node-${d.id}`);

  moduleG
    .append('text')
    .attr('x', (d) => d.w / 2)
    .attr('y', (d) => (d.layers.length === 0 ? moduleHeight(d) / 2 : 16))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#f0e6d6')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .text((d) => (d.layers.length === 0 ? `${d.title}  ${d.shape}` : d.title));

  // Per-layer chip rows inside modules with an inner layer stack.
  const layerRows = moduleG
    .filter((d) => d.layers.length > 0)
    .selectAll('g.layer-row')
    .data((d) => d.layers.map((label, i) => ({ label, i, w: d.w })))
    .enter()
    .append('g')
    .attr('class', 'layer-row')
    .attr('transform', (d) => `translate(6,${HEADER_H + d.i * ROW_H})`);

  layerRows
    .append('rect')
    .attr('width', (d) => d.w - 12)
    .attr('height', ROW_H - 5)
    .attr('rx', 4)
    .attr('fill', 'rgba(240,230,214,0.12)');

  layerRows
    .append('text')
    .attr('x', (d) => (d.w - 12) / 2)
    .attr('y', (ROW_H - 5) / 2 + 1)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#f0e6d6')
    .style('font-size', '9.5px')
    .style('font-family', 'monospace')
    .text((d) => d.label);

  // GRL badge — drawn last so it visually sits on the domain branch edge.
  const grlG = nodeLayer
    .append('g')
    .attr('class', 'module')
    .attr('transform', `translate(${GRL.x},${GRL.y})`);

  grlG.append('title').text(NODE_TOOLTIP.grl);

  grlG
    .append('rect')
    .attr('width', GRL.w)
    .attr('height', GRL.h)
    .attr('rx', 8)
    .attr('fill', '#8a3f5e')
    .attr('id', 'node-grl');

  grlG
    .append('text')
    .attr('x', GRL.w / 2)
    .attr('y', GRL.h / 2 - 8)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#f0e6d6')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(GRL.label);

  grlG
    .append('text')
    .attr('x', GRL.w / 2)
    .attr('y', GRL.h / 2 + 12)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#e0c8d4')
    .style('font-size', '9.5px')
    .style('font-family', 'monospace')
    .text(GRL.caption);

  let lastLambda = null;

  function pulse(stepId, values = {}) {
    const nodeId = STEP_TO_NODE[stepId];
    svg.selectAll('rect[id^="node-"]').attr('stroke', 'none');
    svg.selectAll('line.edge').attr('stroke-width', 2);
    if (nodeId) {
      svg
        .select(`#node-${nodeId}`)
        .attr('stroke', '#c0392b')
        .attr('stroke-width', 3);
    }
    if (stepId === 'grl-reverse') {
      edgeLayer.select('.edge-featureExtractor-grl').attr('stroke-width', 3.5);
      edgeLayer.select('.edge-grl-domainClassifier').attr('stroke-width', 3.5);
    }

    if (values.lambda !== undefined) lastLambda = values.lambda;

    if (stepId === 'sample-batch' && values.batchSize !== undefined) {
      svg.select('#label-batch').text(`batch: ${values.batchSize}`);
    }
    if (stepId === 'label-loss' && values.labelLoss !== undefined) {
      svg.select('#label-yloss').text(`L_y: ${values.labelLoss.toFixed(3)}`);
    }
    if (stepId === 'domain-loss' && values.domainLoss !== undefined) {
      const lambdaText = lastLambda !== null ? lastLambda.toFixed(2) : '-';
      svg.select('#label-dloss').text(`lambda: ${lambdaText}  L_d: ${values.domainLoss.toFixed(3)}`);
    }
  }

  return { pulse };
}
