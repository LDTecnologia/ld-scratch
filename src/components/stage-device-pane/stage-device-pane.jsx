import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import TargetPane from '../../containers/target-pane.jsx';
import boardIcon from '../../lib/libraries/extensions/arduino/arduino-uno.png';
import {ARDUINO_PUBLISHED, ensureArduinoDevice, isArduinoDevice} from '../../lib/arduino-device';
import styles from './stage-device-pane.css';

const describePortError = error => {
    const text = String((error && error.message) || '');
    if (/no port selected/i.test(text)) return 'Escolha a porta USB do Arduino.';
    if (/user gesture|not allowed/i.test(text)) return 'Clique de novo para escolher a porta USB.';
    return text || 'não conectou';
};

class StageDevicePane extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            busy: false,
            mode: 'upload',
            status: 'desconectado',
            tab: ARDUINO_PUBLISHED ? 'devices' : 'sprites'
        };
        this.refresh = this.refresh.bind(this);
        this.connect = this.connect.bind(this);
        this.choosePort = this.choosePort.bind(this);
        this.transfer = this.transfer.bind(this);
        this.firmware = this.firmware.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.onFooter = this.onFooter.bind(this);
        this.onTargets = this.onTargets.bind(this);
        this.openCode = this.openCode.bind(this);
        this.openDefault = this.openDefault.bind(this);
        this._actorId = null;
    }
    componentDidMount () {
        this.props.vm.addListener('EXTENSION_ADDED', this.refresh);
        this.props.vm.addListener('targetsUpdate', this.onTargets);
        this.props.vm.runtime.on('PROJECT_LOADED', this.openDefault);
        if (ARDUINO_PUBLISHED && !this.props.vm.extensionManager.isExtensionLoaded('arduinoUno')) {
            this.props.vm.extensionManager.loadExtensionURL('arduinoUno').catch(() => {});
        }
        this.refresh();
        this._timer = setInterval(this.refresh, 800);
        this.openDefault();
    }
    componentWillUnmount () {
        this.props.vm.removeListener('EXTENSION_ADDED', this.refresh);
        this.props.vm.removeListener('targetsUpdate', this.onTargets);
        this.props.vm.runtime.removeListener('PROJECT_LOADED', this.openDefault);
        clearInterval(this._timer);
    }
    openDefault () {
        if (!this.props.vm.runtime.getTargetForStage()) return;
        const current = this.props.vm.editingTarget;
        if (current && !current.isStage && !isArduinoDevice(current)) this._actorId = current.id;
        this.openCode(ARDUINO_PUBLISHED ? 'devices' : 'sprites');
    }
    openCode (tab) {
        const vm = this.props.vm;
        if (tab === 'devices') {
            const device = ensureArduinoDevice(vm);
            if (device) vm.setEditingTarget(device.id);
        } else if (tab === 'backdrops') {
            const stage = vm.runtime.getTargetForStage();
            if (stage) vm.setEditingTarget(stage.id);
        } else {
            const actor = vm.runtime.targets.find(target => target.id === this._actorId) ||
                vm.runtime.targets.find(target => (
                    !target.isStage && target.isOriginal && !isArduinoDevice(target)
                ));
            if (actor) {
                this._actorId = actor.id;
                vm.setEditingTarget(actor.id);
            }
        }
        if (tab !== this.state.tab) this.setState({tab});
    }
    onTargets (data) {
        const target = this.props.vm.runtime.getTargetById(data.editingTarget);
        if (!target) return;
        if (!target.isStage && !isArduinoDevice(target)) this._actorId = target.id;
        const tab = target.isStage ? 'backdrops' : (isArduinoDevice(target) ? 'devices' : 'sprites');
        if (tab !== this.state.tab) this.setState({tab});
    }
    board () {
        return typeof window === 'undefined' ? null : window.AlunoMakerArduino;
    }
    refresh () {
        const board = this.board();
        const status = board ? (board._message || board.link.status) : 'desconectado';
        if (status !== this.state.status) {
            this.setState({status});
        }
    }
    run (action) {
        const board = this.board();
        if (!board || this.state.busy) return;
        this.setState({busy: true});
        Promise.resolve(action(board)).finally(() => {
            this.setState({busy: false});
            this.refresh();
        });
    }
    openPort () {
        const board = this.board();
        if (!board) return Promise.reject(new Error('A extensão Arduino Uno não está pronta.'));
        if (!board.link.available()) {
            board._message = 'Use Chrome ou Edge para a porta USB.';
            this.refresh();
            return Promise.reject(new Error(board._message));
        }
        if (board.link.port) return Promise.resolve(board);
        const requested = navigator.serial.requestPort();
        return requested.then(port => {
            board.link.port = port;
            return board;
        }, error => {
            board._message = describePortError(error);
            throw new Error(board._message);
        });
    }
    afterPort (task) {
        if (this.state.busy) return;
        const opening = this.openPort();
        opening
            .then(board => {
                this.setState({busy: true});
                return task(board);
            })
            .catch(error => {
                const board = this.board();
                if (board) board._message = describePortError(error);
            })
            .finally(() => {
                this.setState({busy: false});
                this.refresh();
            });
    }
    choosePort () {
        if (typeof navigator === 'undefined' || !navigator.serial) {
            const board = this.board();
            if (board) board._message = 'Use Chrome ou Edge para a porta USB.';
            this.refresh();
            return;
        }
        const requested = navigator.serial.requestPort();
        requested.then(port => {
            const board = this.board();
            if (!board) return;
            board.link.port = port;
            board._message = 'porta USB escolhida';
            this.refresh();
        }, error => {
            const board = this.board();
            if (board) board._message = describePortError(error);
            this.refresh();
        });
    }
    connect () {
        this.afterPort(board => board.connect());
    }
    disconnect () {
        this.run(board => board.disconnect());
    }
    transfer () {
        this.run(board => board.flashProgram());
    }
    firmware () {
        this.afterPort(board => board.flashLive());
    }
    onFooter () {
        if (this.state.mode === 'live' && this.state.status === 'conectado') {
            this.disconnect();
            return;
        }
        const mode = this.state.mode;
        this.afterPort(board => (mode === 'upload' ? board.flashProgram() : board.connect()));
    }
    renderDevices () {
        const connected = this.state.status === 'conectado';
        const footerLabel = this.state.mode === 'upload' ?
            'Carregar no Arduino' :
            (connected ? 'Desconectar' : 'Conectar o Arduino');
        return (
            <React.Fragment>
                <div className={styles.body}>
                    <div className={styles.devices}>
                        <div className={styles.deviceCard}>
                            <img
                                alt=""
                                className={styles.deviceImage}
                                draggable={false}
                                src={boardIcon}
                            />
                            <span className={styles.deviceName}>Arduino Uno</span>
                        </div>
                        <button
                            className={styles.addCard}
                            type="button"
                            onClick={this.props.onAddDevice}
                        >
                            <span className={styles.addMark}>+</span>
                            Adicionar
                        </button>
                    </div>
                    <div className={styles.details}>
                        <button
                            className={styles.headingButton}
                            type="button"
                            onClick={this.choosePort}
                        >
                            Conexões
                        </button>
                        <button
                            className={styles.connection}
                            type="button"
                            onClick={this.choosePort}
                        >
                            <span className={styles.usb} aria-hidden="true" />
                            USB
                        </button>
                        <h3 className={styles.heading}>Interruptor de modo</h3>
                        <div className={styles.modeSwitch}>
                            <button
                                className={this.state.mode === 'upload' ? styles.modeOn : styles.modeOff}
                                type="button"
                                onClick={() => this.setState({mode: 'upload'})}
                            >
                                Carregar
                            </button>
                            <button
                                className={this.state.mode === 'live' ? styles.modeOn : styles.modeOff}
                                type="button"
                                onClick={() => this.setState({mode: 'live'})}
                            >
                                Viver
                            </button>
                        </div>
                        <button
                            className={styles.footer}
                            disabled={this.state.busy}
                            type="button"
                            onClick={this.onFooter}
                        >
                            <span>{footerLabel}</span>
                            <span className={styles.footerStatus}>{this.state.status}</span>
                        </button>
                        {this.state.mode === 'live' ? (
                            <button
                                className={styles.prepare}
                                disabled={this.state.busy}
                                type="button"
                                onClick={this.firmware}
                            >
                                Preparar a placa ao vivo
                            </button>
                        ) : null}
                    </div>
                </div>
            </React.Fragment>
        );
    }
    render () {
        const tabs = [
            ...(ARDUINO_PUBLISHED ? [{id: 'devices', label: 'Dispositivos'}] : []),
            {id: 'sprites', label: 'Atores'},
            {id: 'backdrops', label: 'Fundo'}
        ];
        return (
            <div className={styles.pane}>
                <div className={styles.tabs} role="tablist">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            aria-selected={this.state.tab === tab.id}
                            className={this.state.tab === tab.id ? styles.tabOn : styles.tabOff}
                            role="tab"
                            type="button"
                            onClick={() => this.openCode(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {this.state.tab === 'devices' ? this.renderDevices() : (
                    <div className={styles.selector}>
                        <TargetPane
                            stageSize={this.props.stageSize}
                            view={this.state.tab === 'sprites' ? 'sprites' : 'stage'}
                            vm={this.props.vm}
                        />
                    </div>
                )}
            </div>
        );
    }
}

StageDevicePane.propTypes = {
    onAddDevice: PropTypes.func.isRequired,
    stageSize: PropTypes.string.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageDevicePane;
