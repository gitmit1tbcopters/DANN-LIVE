import * as tf from '@tensorflow/tfjs';
import { PCA } from 'ml-pca';
import * as d3 from 'd3';
import { classColor } from './classColors.js';

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

  // Optional second, smaller mount point (e.g. next to the test panel)
  // that mirrors the same points/test-point whenever render() runs.
  let mirror = null;

  function attachMirror(mirrorSvgEl) {
    const mirrorSvg = d3.select(mirrorSvgEl);
    const mirrorWidth = mirrorSvgEl.clientWidth || 360;
    const mirrorHeight = 260;
    mirrorSvg.attr('viewBox', `0 0 ${mirrorWidth} ${mirrorHeight}`);
    mirror = { svg: mirrorSvg, width: mirrorWidth, height: mirrorHeight };
    renderMirrorEmpty();
  }

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
    if (!lastPca) return false;
    const arr = await featureTensor.array();
    const vec = Array.isArray(arr[0]) ? arr[0] : arr;
    const projected = lastPca.predict([vec], { nComponents: 2 }).to2DArray()[0];
    testPoint = { x: projected[0], y: projected[1] };
    render(lastPoints, testPoint);
    return true;
  }

  function render(points, test = null) {
    // Main Feature Space plots training data only — the test point (if any)
    // is shown exclusively in the mirror ("Where It Lands") panel.
    drawInto(svg, width, height, points, null, 4, 7);
    if (mirror) drawInto(mirror.svg, mirror.width, mirror.height, points, test, 4, 7);
  }

  function drawInto(targetSvg, targetWidth, targetHeight, points, test, pointRadius, testRadius) {
    const allForExtent = test ? [...points, test] : points;
    const xExtent = d3.extent(allForExtent, (p) => p.x);
    const yExtent = d3.extent(allForExtent, (p) => p.y);
    const xScale = d3.scaleLinear().domain(xExtent).range([20, targetWidth - 20]);
    const yScale = d3.scaleLinear().domain(yExtent).range([targetHeight - 20, 20]);

    targetSvg.selectAll('*').remove();
    targetSvg
      .selectAll('circle.data-point')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (p) => xScale(p.x))
      .attr('cy', (p) => yScale(p.y))
      .attr('r', pointRadius)
      .attr('fill', (p) => (p.domain === 'source' ? classColor(p.classLabel) : '#9ca3af'))
      .attr('opacity', (p) => (p.domain === 'source' ? 0.8 : 0.5));

    if (test) {
      targetSvg
        .append('circle')
        .attr('class', 'test-point')
        .attr('cx', xScale(test.x))
        .attr('cy', yScale(test.y))
        .attr('r', testRadius)
        .attr('fill', '#facc15')
        .attr('stroke', '#0b0d12')
        .attr('stroke-width', 2);
    }
  }

  // Placeholder shown before the first epoch-end checkpoint arrives.
  function renderEmpty() {
    svg.selectAll('*').remove();
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.4)
      .attr('font-size', '13px')
      .text('no data yet — run an epoch to see the feature space');
    if (mirror) renderMirrorEmpty();
  }

  function renderMirrorEmpty() {
    mirror.svg.selectAll('*').remove();
    mirror.svg
      .append('text')
      .attr('x', mirror.width / 2)
      .attr('y', mirror.height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.4)
      .attr('font-size', '11px')
      .text('test an image to see its match');
  }

  return { update, plotTestPoint, renderEmpty, attachMirror };
}
