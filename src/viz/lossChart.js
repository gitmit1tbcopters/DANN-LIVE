import * as tfvis from '@tensorflow/tfjs-vis';

// Rolling loss/accuracy history, rendered with tfjs-vis's built-in line
// chart. Fed once per epoch from the 'epoch-end' checkpoint.
export function createLossChart(containerEl) {
  const history = { epoch: [], labelLoss: [], domainLoss: [], valAccuracy: [] };

  function pushEpoch({ epoch, labelLoss, domainLoss, valAccuracy }) {
    history.epoch.push(epoch);
    history.labelLoss.push(labelLoss);
    history.domainLoss.push(domainLoss);
    history.valAccuracy.push(valAccuracy);
    render();
  }

  function render() {
    const lossSeries = {
      values: [
        history.epoch.map((e, i) => ({ x: e, y: history.labelLoss[i] })),
        history.epoch.map((e, i) => ({ x: e, y: history.domainLoss[i] })),
      ],
      series: ['L_y (label loss)', 'L_d (domain loss)'],
    };
    tfvis.render.linechart(containerEl, lossSeries, {
      xLabel: 'epoch',
      yLabel: 'loss',
      width: containerEl.clientWidth || 380,
      height: 220,
    });
  }

  function reset() {
    history.epoch = [];
    history.labelLoss = [];
    history.domainLoss = [];
    history.valAccuracy = [];
  }

  return { pushEpoch, reset, history };
}
