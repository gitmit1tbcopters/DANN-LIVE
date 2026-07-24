import { describe, it, expect, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { buildDANN } from '../../model/dann.js';
import { ClassBucketDataset, UnlabeledDataset } from '../../data/imageLoader.js';
import { trainLoop } from '../../training/trainLoop.js';

const IMAGE_SIZE = 8;
const NUM_CLASSES = 2;

function fakeTensor() {
  return tf.zeros([IMAGE_SIZE, IMAGE_SIZE, 1]);
}

function buildSession() {
  const { featureExtractor, labelPredictor, domainClassifier } = buildDANN({
    imageSize: IMAGE_SIZE,
    channels: 1,
    numClasses: NUM_CLASSES,
  });

  const sourceTrain = new ClassBucketDataset(IMAGE_SIZE);
  const targetTrain = new UnlabeledDataset(IMAGE_SIZE);
  const sourceVal = new ClassBucketDataset(IMAGE_SIZE);
  const targetVal = new UnlabeledDataset(IMAGE_SIZE);

  for (let i = 0; i < 8; i++) {
    sourceTrain.addExample(i % NUM_CLASSES, fakeTensor());
    targetTrain.addExample(fakeTensor());
    sourceVal.addExample(i % NUM_CLASSES, fakeTensor());
    targetVal.addExample(fakeTensor());
  }

  return { featureExtractor, labelPredictor, domainClassifier, sourceTrain, targetTrain, sourceVal, targetVal };
}

const CHECKPOINTS_PER_STEP = 7;

async function drainSteps(gen, numSteps) {
  let last;
  for (let i = 0; i < numSteps * CHECKPOINTS_PER_STEP; i++) {
    const { value, done } = await gen.next();
    expect(done).toBe(false);
    last = value;
  }
  return last;
}

describe('trainLoop', () => {
  let session;

  afterEach(() => {
    session?.sourceTrain.dispose();
    session?.targetTrain.dispose();
    session?.sourceVal.dispose();
    session?.targetVal.dispose();
    tf.disposeVariables();
  });

  it('finishes (done: true) once globalStep reaches the fixed totalSteps', async () => {
    session = buildSession();
    const gen = trainLoop({ ...session, batchSize: 2, totalSteps: 1, stepsPerEpoch: 1 });

    await drainSteps(gen, 1); // one full training step
    const epochEnd = await gen.next(); // epoch-end checkpoint
    expect(epochEnd.done).toBe(false);
    expect(epochEnd.value.stepId).toBe('epoch-end');

    const final = await gen.next();
    expect(final.done).toBe(true);
  });

  it('continues past the original totalSteps when getTotalSteps later returns a higher value', async () => {
    session = buildSession();
    let liveTotal = 1;
    const gen = trainLoop({
      ...session,
      batchSize: 2,
      totalSteps: 1,
      stepsPerEpoch: 1,
      getTotalSteps: () => liveTotal,
    });

    await drainSteps(gen, 1);
    await gen.next(); // epoch-end

    // Simulate the user raising the total while paused, before the
    // generator's outer while-loop re-evaluates its exit condition.
    liveTotal = 2;

    const next = await gen.next();
    expect(next.done).toBe(false);
    expect(next.value.stepId).toBe('sample-batch');
    expect(next.value.values.globalStep).toBe(1);
  });

  it('a continuation generator seeded with initialGlobalStep/initialEpoch resumes counters instead of restarting from 0', async () => {
    session = buildSession();
    const gen = trainLoop({
      ...session,
      batchSize: 2,
      totalSteps: 8,
      stepsPerEpoch: 4,
      initialGlobalStep: 4,
      initialEpoch: 1,
    });

    const firstStep = await gen.next();
    expect(firstStep.value.values.globalStep).toBe(4);
    expect(firstStep.value.values.epoch).toBe(1);
  });
});
