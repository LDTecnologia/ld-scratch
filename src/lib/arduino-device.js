const DEVICE_NAME = 'aluno-maker-arduino';

// Keep the Arduino work in the project, but out of the published editor
// until USB connection and program upload are finished.
const ARDUINO_PUBLISHED = false;

const isArduinoDevice = target => Boolean(
    target &&
    !target.isStage &&
    target.sprite &&
    target.sprite.name === DEVICE_NAME
);

const ensureArduinoDevice = vm => {
    const runtime = vm.runtime;
    const stage = runtime.getTargetForStage();
    if (!stage) return null;
    const existing = runtime.targets.find(isArduinoDevice);
    if (existing) return existing;

    const sprite = new stage.sprite.constructor(null, runtime);
    sprite.name = DEVICE_NAME;
    const costume = stage.getCostumes()[0];
    sprite.addCostumeAt({
        name: 'Arduino',
        asset: costume.asset,
        assetId: costume.assetId,
        dataFormat: costume.dataFormat,
        bitmapResolution: costume.bitmapResolution || 1,
        rotationCenterX: costume.rotationCenterX || 0,
        rotationCenterY: costume.rotationCenterY || 0
    }, 0);
    const target = new stage.constructor(sprite, runtime);
    sprite.clones.push(target);
    target.visible = false;
    if (typeof target.initAudio === 'function') target.initAudio();
    runtime.addTarget(target);
    vm.emitTargetsUpdate(false);
    return target;
};

export {
    ARDUINO_PUBLISHED,
    DEVICE_NAME,
    ensureArduinoDevice,
    isArduinoDevice
};
