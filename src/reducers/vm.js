import VM from 'scratch-vm';
import storage from '../lib/storage';
import {ARDUINO_PUBLISHED} from '../lib/arduino-device';

const SET_VM = 'scratch-gui/vm/SET_VM';
const defaultVM = new VM();
defaultVM.attachStorage(storage);

// Only extensions shipped in vendor/extensions may load. A project or
// library entry cannot pull a script from another host, so an upstream
// version change cannot replace the blocks this editor provides.
const bundledExtensionIds = new Set([
    'coreExample',
    'pen',
    'wedo2',
    'music',
    'microbit',
    'text2speech',
    'translate',
    'videoSensing',
    'ev3',
    'makeymakey',
    'boost',
    'gdxfor',
    ...(ARDUINO_PUBLISHED ? ['arduinoUno'] : [])
]);
const loadBundledExtension = defaultVM.extensionManager.loadExtensionURL.bind(defaultVM.extensionManager);
defaultVM.extensionManager.loadExtensionURL = extensionURL => {
    if (bundledExtensionIds.has(extensionURL)) {
        return loadBundledExtension(extensionURL);
    }
    return Promise.reject(new Error(`Extensão não hospedada neste editor: ${extensionURL}`));
};
const initialState = defaultVM;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_VM:
        return action.vm;
    default:
        return state;
    }
};
const setVM = function (vm) {
    return {
        type: SET_VM,
        vm: vm
    };
};

export {
    reducer as default,
    initialState as vmInitialState,
    setVM
};
