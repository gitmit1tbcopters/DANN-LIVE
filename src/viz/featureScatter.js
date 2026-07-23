import * as tf from '@tensorflow/tfjs';
import { PCA } from 'ml-pca';
import * as d3 from 'd3';

// Periodic (once-per-epoch, or on-demand) feature-space visualization.
// Unlike the per-step checkpoint overlay, this is allowed to read real
// embedding vectors back from the GPU/CPU backend — it runs far less often
// and the sample size is small (tens of points, not full tensors).
export function createFeatureScatter(svgEl, { sampleSize = 40 } = {}) {
  const svg = d3.select(svgEl);
  const width = svgEl.clientWidth || 360;
  const height = 260;
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // Retained so a later plotTestPoint() call can project onto the same
  // PCA basis/scales as the most recent per-epoch scatter, rather than
  // fitting a new (incomparable) projection from a single point.
  let lastPca = null;
  let lastPoints = null;
  let testPoint = null;

  async function update(featureExtractor, sourceDataset, targetDataset) {
    const nSource = Math.min(sampleSize, sourceDataset.totalCount);
    const nTarget = Math.min(sampleSize, targetDataset.totalCount);
    if (nSource === 0 || nTarget === 0) return;

    const { xs: xsSource, ys: ysSource } = sourceDataset.sampleBatch(nSource);
    const xsTarget = targetDataset.sampleBatch(nTarget);

    const { hSource, hTarget } = tf.tidy(() => ({
      hSource: featureExtractor.apply(xsSource),
      hTarget: featureExtractor.apply(xsTarget),
    }));

    const sourceArr = await hSource.array();
    const targetArr = await hTarget.array();
    const sourceLabels = ysSource.argMax(-1).arraySync();

    tf.dispose([xsSource, ysSource, xsTarget, hSource, hTarget]);

    const combined = [...sourceArr, ...targetArr];
    const pca = new PCA(combined);
    const projected = pca.predict(combined, { nComponents: 2 }).to2DArray();

    const points = projected.map((p, i) => ({
      x: p[0],
      y: p[1],
      domain: i < sourceArr.length ? 'source' : 'target',
      classLabel: i < sourceArr.length ? sourceLabels[i] : null,
    }));

    lastPca = pca;
    lastPoints = points;
    testPoint = null; // stale relative to the new projection basis
    render(points, testPoint);
  }

  // Projects a single held-out feature vector (e.g. from the testing panel)
  // onto the most recent per-epoch PCA basis, so it can be shown alongside
  // the training-data scatter without recomputing a whole new projection.
  async function plotTestPoint(featureTensor) {
    if (!lastPca) return;
    const arr = await featureTensor.array();
    const vec = Array.isArray(arr[0]) ? arr[0] : arr;
    const projected = lastPca.predict([vec], { nComponents: 2 }).to2DArray()[0];
    testPoint = { x: projected[0], y: projected[1] };
    render(lastPoints, testPoint);
  }

  function render(points, test = null) {
    const allForExtent = test ? [...points, test] : points;
    const xExtent = d3.extent(allForExtent, (p) => p.x);
    const yExtent = d3.extent(allForExtent, (p) => p.y);
    const xScale = d3.scaleLinear().domain(xExtent).range([20, width - 20]);
    const yScale = d3.scaleLinear().domain(yExtent).range([height - 20, 20]);

    svg.selectAll('*').remove();
    svg
      .selectAll('circle.data-point')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (p) => xScale(p.x))
      .attr('cy', (p) => yScale(p.y))
      .attr('r', 4)
      .attr('fill', (p) => (p.domain === 'source' ? '#3b82f6' : '#e11d8f'))
      .attr('opacity', 0.75);

    if (test) {
      svg
        .append('circle')
        .attr('class', 'test-point')
        .attr('cx', xScale(test.x))
        .attr('cy', yScale(test.y))
        .attr('r', 7)
        .attr('fill', '#facc15')
        .attr('stroke', '#0b0d12')
        .attr('stroke-width', 2);
    }
  }

  return { update, plotTestPoint };
}
