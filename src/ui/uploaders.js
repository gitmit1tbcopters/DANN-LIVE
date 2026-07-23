import { loadImageAsTensor, ClassBucketDataset, UnlabeledDataset } from '../data/imageLoader.js';
import { generateSyntheticTargetDataset } from '../data/syntheticDomain.js';

const IMAGE_SIZE = 64;

const BTN = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel';
const FIELD_FOCUS = 'text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel rounded-sm';
const DROPZONE = 'flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-sunken px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:bg-surface-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-panel';
const DROPZONE_ACTIVE = 'border-accent-rose bg-surface-hover text-ink';

function filesToDataTransfer(files) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt;
}

// Wires a dropzone <label> + its paired <input type="file"> so repeated
// drops or repeated "choose files" picks accumulate rather than replace
// the previous selection. Both paths funnel through one accumulated
// File[] that gets synced back into input.files (browsers don't allow
// programmatically appending to a real FileList otherwise).
function wireAccumulatingDropzone(labelEl, fileInputEl, onChange) {
  let accumulated = [];

  function addFiles(newFiles) {
    accumulated = [...accumulated, ...newFiles];
    fileInputEl.files = filesToDataTransfer(accumulated).files;
    onChange(accumulated);
  }

  fileInputEl.addEventListener('click', () => {
    fileInputEl.value = '';
  });
  fileInputEl.addEventListener('change', () => {
    if (fileInputEl.files.length === 0) return;
    addFiles([...fileInputEl.files]);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    labelEl.addEventListener(evt, (e) => {
      e.preventDefault();
      labelEl.classList.add(...DROPZONE_ACTIVE.split(' '));
    });
  });
  ['dragleave', 'dragend'].forEach((evt) => {
    labelEl.addEventListener(evt, () => {
      labelEl.classList.remove(...DROPZONE_ACTIVE.split(' '));
    });
  });
  labelEl.addEventListener('drop', (e) => {
    e.preventDefault();
    labelEl.classList.remove(...DROPZONE_ACTIVE.split(' '));
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    addFiles([...files]);
  });

  return { getFiles: () => accumulated };
}

// Class-bucketed source uploader + optional target-domain uploader, with an
// automatic synthetic-domain-shift fallback when no target images are given.
export function initUploaders(containerEl, { onReady }) {
  let classRows = [];

  containerEl.innerHTML = `
    <div class="mb-3.5">
      <div class="mb-2 flex items-center gap-2.5">
        <strong class="text-sm font-semibold text-ink">Source classes</strong>
        <button type="button" id="add-class-btn" class="${BTN}">+ Add class</button>
      </div>
      <div id="class-rows" class="flex flex-col gap-1.5"></div>
    </div>
    <div class="mb-3.5">
      <strong class="text-sm font-semibold text-ink">Target domain (optional)</strong>
      <p class="hint mb-1.5 mt-1">Leave empty to auto-generate a synthetic domain shift (MNIST-M-style blend + color/contrast/noise/rotation) from the source images.</p>
      <label class="${DROPZONE}">
        <span id="target-files-label" class="truncate">Click to choose target images, or drag &amp; drop</span>
        <input type="file" id="target-files" accept="image/*" multiple class="sr-only" />
      </label>
    </div>
    <button type="button" id="build-datasets-btn" class="${BTN}">Build datasets &amp; continue</button>
    <div id="uploader-status" class="hint mt-2"></div>
  `;

  const classRowsEl = containerEl.querySelector('#class-rows');
  const statusEl = containerEl.querySelector('#uploader-status');

  const targetFileInputEl = containerEl.querySelector('#target-files');
  const targetFilesLabelEl = containerEl.querySelector('#target-files-label');
  const targetDropzone = wireAccumulatingDropzone(targetFileInputEl.closest('label'), targetFileInputEl, (files) => {
    targetFilesLabelEl.textContent = files.length
      ? `${files.length} target images selected`
      : 'Click to choose target images, or drag & drop';
  });

  function addClassRow() {
    const index = classRows.length;
    const row = document.createElement('div');
    row.className = 'class-row flex items-center gap-2.5';
    row.innerHTML = `
      <input type="text" class="class-name w-28 shrink-0 rounded-md border border-border bg-sunken px-2 py-1.5 text-sm ${FIELD_FOCUS}" placeholder="class ${index}" value="class-${index}" />
      <label class="${DROPZONE}">
        <span class="class-count truncate">Choose images…</span>
        <input type="file" class="class-files sr-only" accept="image/*" multiple />
      </label>
    `;
    const fileInput = row.querySelector('.class-files');
    const countEl = row.querySelector('.class-count');
    const dropzone = wireAccumulatingDropzone(fileInput.closest('label'), fileInput, (files) => {
      countEl.textContent = files.length ? `${files.length} images selected` : 'Choose images…';
    });
    row.getFiles = dropzone.getFiles;
    classRowsEl.appendChild(row);
    classRows.push(row);
  }

  containerEl.querySelector('#add-class-btn').addEventListener('click', addClassRow);
  addClassRow();
  addClassRow();

  containerEl.querySelector('#build-datasets-btn').addEventListener('click', async () => {
    statusEl.textContent = 'Decoding images…';
    const sourceDataset = new ClassBucketDataset(IMAGE_SIZE);
    const classNames = [];
    let classIndex = 0;
    let anyFiles = false;

    for (const row of classRows) {
      const files = row.getFiles();
      if (files.length === 0) continue;
      anyFiles = true;
      const nameInput = row.querySelector('.class-name');
      classNames.push(nameInput.value || `class-${classIndex}`);
      for (const file of files) {
        const tensor = await loadImageAsTensor(file, IMAGE_SIZE);
        sourceDataset.addExample(classIndex, tensor);
      }
      classIndex += 1;
    }

    if (!anyFiles || sourceDataset.numClasses < 2) {
      statusEl.textContent = 'Need at least 2 source classes with images before continuing.';
      return;
    }

    const targetFiles = targetDropzone.getFiles();

    let targetDataset;
    let isSynthetic = false;
    if (targetFiles.length > 0) {
      targetDataset = new UnlabeledDataset(IMAGE_SIZE);
      for (const file of targetFiles) {
        const tensor = await loadImageAsTensor(file, IMAGE_SIZE);
        targetDataset.addExample(tensor);
      }
    } else {
      statusEl.textContent = 'No target images uploaded — generating synthetic target domain…';
      targetDataset = generateSyntheticTargetDataset(sourceDataset, IMAGE_SIZE);
      isSynthetic = true;
    }

    statusEl.textContent = `Ready: ${sourceDataset.totalCount} source images across ${sourceDataset.numClasses} classes, ${targetDataset.totalCount} target images${isSynthetic ? ' (synthetic)' : ''}.`;
    onReady({ sourceDataset, targetDataset, isSynthetic, imageSize: IMAGE_SIZE, numClasses: sourceDataset.numClasses, classNames });
  });
}

export { IMAGE_SIZE };
