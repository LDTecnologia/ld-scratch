import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import styles from './arduino-board-bar.css';

class ArduinoBoardBar extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            busy: false,
            status: '',
            visible: false
        };
        this.refresh = this.refresh.bind(this);
        this.connect = this.connect.bind(this);
        this.transfer = this.transfer.bind(this);
        this.firmware = this.firmware.bind(this);
    }
    componentDidMount () {
        this.props.vm.addListener('EXTENSION_ADDED', this.refresh);
        this.refresh();
        this._timer = setInterval(this.refresh, 800);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('EXTENSION_ADDED', this.refresh);
        clearInterval(this._timer);
    }
    board () {
        return typeof window === 'undefined' ? null : window.AlunoMakerArduino;
    }
    refresh () {
        const loaded = this.props.vm.extensionManager.isExtensionLoaded('arduinoUno');
        const board = this.board();
        const status = board ? (board._message || board.link.status) : '';
        if (loaded !== this.state.visible || status !== this.state.status) {
            this.setState({visible: loaded, status});
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
    connect () {
        this.run(board => board.connect());
    }
    transfer () {
        this.run(board => board.flashProgram());
    }
    firmware () {
        this.run(board => board.flashLive());
    }
    render () {
        if (!this.state.visible) return null;
        return (
            <div className={styles.bar}>
                <button
                    className={styles.primary}
                    disabled={this.state.busy}
                    type="button"
                    onClick={this.connect}
                >
                    Conectar Arduino
                </button>
                <button
                    className={styles.primary}
                    disabled={this.state.busy}
                    type="button"
                    onClick={this.transfer}
                >
                    Transferir código
                </button>
                <button
                    className={styles.secondary}
                    disabled={this.state.busy}
                    type="button"
                    onClick={this.firmware}
                >
                    Gravar firmware ao vivo
                </button>
                <span className={styles.status}>{this.state.status}</span>
            </div>
        );
    }
}

ArduinoBoardBar.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired
};

export default ArduinoBoardBar;
