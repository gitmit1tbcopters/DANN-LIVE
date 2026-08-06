import vegaEmbed from 'vega-embed';

function textColor() {
  return document.documentElement.dataset.theme === 'light' ? '#000000' : '#ffffff';
}

// tfjs-vis's linechart always calls vega-embed with the canvas renderer,
// which bakes axis/legend text in as black pixels our theme CSS can't
// reach. Build the same kind of line-chart spec ourselves, call vega-embed
// directly with renderer: 'svg', and bake the current theme's text color
// straight into the spec (CSS can't recolor canvas, and relying on a CSS
// var cascading into the SVG needs a rerender anyway on theme switch).
function buildSpec(values, seriesNames, { xLabel, yLabel, width, height, markerX }) {
  const color = textColor();
  const layer = [
    {
      data: { values },
      mark: { type: 'line', clip: true, point: true },
      encoding: {
        x: { field: 'x', type: 'quantitative', title: xLabel },
        y: { field: 'y', type: 'quantitative', title: yLabel },
        color: { field: 'series', type: 'nominal', legend: { values: seriesNames } },
      },
    },
  ];
  if (markerX !== undefined && markerX !== null) {
    layer.push({
      data: { values: [{ x: markerX }] },
      mark: { type: 'rule', strokeDash: [4, 3], color: '#facc15', strokeWidth: 1.5 },
      encoding: { x: { field: 'x', type: 'quantitative' } },
    });
  }
  return {
    width,
    height,
    padding: 0,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    config: {
      axis: { labelFontSize: 11, titleFontSize: 11, labelColor: color, titleColor: color },
      text: { fontSize: 11, color },
      legend: {
        labelFontSize: 11,
        titleFontSize: 11,
        labelColor: color,
        titleColor: color,
        title: null,
        orient: 'bottom',
        direction: 'horizontal',
        columns: 1,
        labelLimit: width,
      },
    },
    layer,
  };
}

function renderSpec(containerEl, values, seriesNames, opts) {
  const spec = buildSpec(values, seriesNames, opts);
  return vegaEmbed(containerEl, spec, { actions: false, mode: 'vega-lite', renderer: 'svg' });
}

// Rolling loss/accuracy history, rendered with a minimal vega-lite line
// chart. Fed once per epoch from the 'epoch-end' checkpoint.
export function createLossChart(containerEl) {
  const history = { epoch: [], labelLoss: [], domainLoss: [], valAccuracy: [] };
  let markerEpoch = null;

  function pushEpoch({ epoch, labelLoss, domainLoss, valAccuracy }) {
    history.epoch.push(epoch);
    history.labelLoss.push(labelLoss);
    history.domainLoss.push(domainLoss);
    history.valAccuracy.push(valAccuracy);
    render();
  }

  function render() {
    const values = [
      ...history.epoch.map((e, i) => ({ x: e, y: history.labelLoss[i], series: 'L_y (label loss)' })),
      ...history.epoch.map((e, i) => ({ x: e, y: history.domainLoss[i], series: 'L_d (domain loss)' })),
    ];
    renderSpec(containerEl, values, ['L_y (label loss)', 'L_d (domain loss)'], {
      xLabel: 'epoch',
      yLabel: 'loss',
      width: plotWidth(),
      height: 220,
      markerX: markerEpoch,
    });
  }

  // Draws a dashed vertical rule at the given epoch (e.g. while scrubbing
  // playback history) without touching the underlying data. Pass null to
  // clear it.
  function highlightEpoch(epoch) {
    markerEpoch = epoch;
    if (history.epoch.length > 0) render();
  }

  function reset() {
    history.epoch = [];
    history.labelLoss = [];
    history.domainLoss = [];
    history.valAccuracy = [];
    markerEpoch = null;
    renderEmpty();
  }

  // Placeholder axes shown before the first epoch-end checkpoint arrives.
  function renderEmpty() {
    renderSpec(containerEl, [{ x: 0, y: 0, series: 'no data yet' }], ['no data yet'], {
      xLabel: 'epoch',
      yLabel: 'loss',
      width: plotWidth(),
      height: 220,
    });
  }

  // vega-lite's `width` is the plot area only — the rendered SVG adds the
  // y-axis gutter (~40px) on top, so passing the raw container width
  // overflows the card by that much. Reserve room for it.
  function plotWidth() {
    return Math.max((containerEl.clientWidth || 380) - 40, 120);
  }

  document.addEventListener('theme-change', () => {
    history.epoch.length > 0 ? render() : renderEmpty();
  });

  return { pushEpoch, reset, renderEmpty, highlightEpoch, history };
}
