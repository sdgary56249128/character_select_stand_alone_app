import { customCommonOverlay } from './customOverlay.js';

let galleryPreviewProgress = 0;

// Local change: progress bar under the generate buttons (part of the layout, not an overlay)
let statusBar = null;
let statusBarStart = 0;
let statusBarTimer = null;
let statusBarStep = '';

function formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function statusBarText(key, values = {}) {
    const isEN = globalThis.globalSettings?.language === 'en-US';
    const texts = isEN
        ? { idle: 'Idle', done: `Done · ${values.elapsed}`, running: `Generating ${values.batch} · step ${values.step} · ${values.elapsed}` }
        : { idle: '待機中', done: `完成 · 用時 ${values.elapsed}`, running: `生成中 ${values.batch} · 第 ${values.step} 步 · 已用 ${values.elapsed}` };
    return texts[key];
}

// The generate buttons are rendered after this module loads, so attach once they exist
function ensureStatusBar() {
    if (statusBar?.isConnected) {
        return true;
    }
    const buttons = document.getElementById('generate-buttons-container');
    if (!buttons) {
        return false;
    }
    statusBar ??= document.createElement('div');
    statusBar.id = 'saa-progress-bar';
    statusBar.innerHTML = `<div class="saa-progress-fill"></div><span class="saa-progress-label">${statusBarText('idle')}</span>`;
    buttons.after(statusBar);
    return true;
}
const statusBarAttachTimer = setInterval(() => ensureStatusBar() && clearInterval(statusBarAttachTimer), 500);

function renderStatusBar() {
    const label = statusBar.querySelector('.saa-progress-label');
    const elapsed = formatElapsed(Date.now() - statusBarStart);
    if (!globalThis.inGenerating) {
        label.textContent = statusBarText('done', { elapsed });
        statusBar.querySelector('.saa-progress-fill').style.width = '100%';
        statusBarStart = 0;
        clearInterval(statusBarTimer);
        statusBarTimer = null;
        return;
    }
    const batch = String(globalThis.generate?.loadingMessage ?? '').match(/\[\d+\/\d+\]/)?.[0] ?? '';
    label.textContent = statusBarText('running', { batch, step: statusBarStep, elapsed });
}

function updateStatusBar(progress, total) {
    if (!ensureStatusBar()) {
        return;
    }
    if (!statusBarStart) {
        statusBarStart = Date.now();
    }
    statusBarStep = `${progress}/${total}`;
    statusBar.querySelector('.saa-progress-fill').style.width = `${Math.min(100, (progress / total) * 100)}%`;
    statusBarTimer ??= setInterval(renderStatusBar, 500);
    renderStatusBar();
}

function updateGalleryPreviewProgress() {
    const progressBar = document.querySelector('.cg-minimized-generation-preview-progress');
    if (progressBar) {
        progressBar.style.width = `${galleryPreviewProgress * 100}%`;
    }
}

export function resetGalleryPreviewProgress() {
    galleryPreviewProgress = 0;
}

export function from_main_updateGallery(base64, seed, tagsString, info){
    globalThis.mainGallery.appendImageData(base64, seed, tagsString, globalThis.globalSettings.scroll_to_last, info);
}

export function from_main_updatePreview(base64){
    const buttonOverlay = document.getElementById('cg-button-overlay');
    if (buttonOverlay?.dataset.minimized === 'true' || globalThis.globalSettings.gallery_preview) {
        const created = globalThis.mainGallery?.attachGalleryPreview?.(base64) === true;
        if (created) galleryPreviewProgress = 0;
        updateGalleryPreviewProgress();
        return;
    }

    let overlay = document.getElementById('cg-loading-overlay');
    if (!overlay) {
        overlay = customCommonOverlay().createLoadingOverlay();
    }
    const imgElement = overlay.querySelector('img');
    if (imgElement) {
        imgElement.src = base64;
        imgElement.style.maxWidth = '256px';
        imgElement.style.maxHeight = '384px';
        imgElement.style.objectFit = 'contain';
        imgElement.onerror = () => {
            imgElement.src = globalThis.cachedFiles.loadingWait;
            imgElement.style.maxWidth = '192px';
            imgElement.style.maxHeight = '192px';
            imgElement.onerror = null;
        };
    } 
}

export function from_main_customOverlayProgress(progress, totalProgress){
    const progressValue = Number.parseFloat(progress);
    const totalValue = Number.parseFloat(totalProgress);
    if (Number.isFinite(progressValue) && Number.isFinite(totalValue) && totalValue > 0) {
        galleryPreviewProgress = Math.min(1, Math.max(0, progressValue / totalValue));
        updateGalleryPreviewProgress();
        updateStatusBar(progressValue, totalValue);
    }

    try {
        const loadingMessage = globalThis.generate.loadingMessage.split('<')[0];
        globalThis.generate.loadingMessage = `${loadingMessage} <${progress}/${totalProgress}>`;
    } catch {
        // by pass
    }
}

export function from_renderer_generate_updatePreview(base64) {
    from_main_updatePreview(base64);
}
