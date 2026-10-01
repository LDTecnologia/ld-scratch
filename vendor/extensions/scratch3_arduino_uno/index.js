const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');

const {ArduinoLink, parseIntelHex} = require('./link');
const generateSketch = require('./sketch');

const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNiIgZmlsbD0iIzAwOTc5RCIvPjxyZWN0IHg9IjgiIHk9IjEwIiB3aWR0aD0iMjQiIGhlaWdodD0iMTgiIHJ4PSIyIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxOSIgcj0iMiIgZmlsbD0iIzAwOTc5RCIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTkiIHI9IjIiIGZpbGw9IiMwMDk3OUQiLz48Y2lyY2xlIGN4PSIyNiIgY3k9IjE5IiByPSIyIiBmaWxsPSIjMDA5NzlEIi8+PC9zdmc+';

const COMPILE_URL = 'http://127.0.0.1:8791/compile';
const LIVE_HEX_URL = 'static/arduino-uno/aluno-maker-uno.hex';

const pins = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

class Scratch3ArduinoUnoBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this.link = new ArduinoLink();
        this._message = 'desconectado';
        if (typeof window !== 'undefined') window.AlunoMakerArduino = this;
    }

    getInfo () {
        return {
            id: 'arduinoUno',
            name: formatMessage({
                id: 'arduinoUno.name',
                default: 'Arduino Uno',
                description: 'Name of the Arduino Uno extension'
            }),
            blockIconURI: blockIconURI,
            color1: '#00979D',
            color2: '#007A82',
            color3: '#005E66',
            blocks: [
                {
                    opcode: 'whenStart',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'arduinoUno.whenStart',
                        default: 'ao iniciar o Arduino',
                        description: 'Hat for code that runs once after the board starts'
                    })
                },
                {
                    opcode: 'whenRepeat',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'arduinoUno.whenRepeat',
                        default: 'repetir no Arduino',
                        description: 'Hat for code that repeats on the board'
                    })
                },
                '---',
                {
                    opcode: 'setPinMode',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduinoUno.setPinMode',
                        default: 'definir pino [PIN] como [MODE]',
                        description: 'Set an Arduino pin mode'
                    }),
                    arguments: {
                        PIN: {type: ArgumentType.STRING, menu: 'digitalPins', defaultValue: '13'},
                        MODE: {type: ArgumentType.STRING, menu: 'pinModes', defaultValue: '1'}
                    }
                },
                {
                    opcode: 'digitalWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduinoUno.digitalWrite',
                        default: 'escrever [VALUE] no pino [PIN]',
                        description: 'Write high or low to a digital pin'
                    }),
                    arguments: {
                        VALUE: {type: ArgumentType.STRING, menu: 'levels', defaultValue: '1'},
                        PIN: {type: ArgumentType.STRING, menu: 'digitalPins', defaultValue: '13'}
                    }
                },
                {
                    opcode: 'digitalRead',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'arduinoUno.digitalRead',
                        default: 'pino [PIN] ligado?',
                        description: 'Read a digital pin'
                    }),
                    arguments: {
                        PIN: {type: ArgumentType.STRING, menu: 'digitalPins', defaultValue: '2'}
                    }
                },
                {
                    opcode: 'analogRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduinoUno.analogRead',
                        default: 'valor analógico [PIN]',
                        description: 'Read an analog input'
                    }),
                    arguments: {
                        PIN: {type: ArgumentType.STRING, menu: 'analogPins', defaultValue: '0'}
                    }
                },
                {
                    opcode: 'pwmWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduinoUno.pwmWrite',
                        default: 'intensidade [DUTY] no pino [PIN]',
                        description: 'PWM duty from 0 to 255'
                    }),
                    arguments: {
                        DUTY: {type: ArgumentType.NUMBER, defaultValue: 128},
                        PIN: {type: ArgumentType.STRING, menu: 'pwmPins', defaultValue: '9'}
                    }
                },
                {
                    opcode: 'servoWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduinoUno.servoWrite',
                        default: 'servo no pino [PIN] a [ANGLE] graus',
                        description: 'Move a servo to an angle'
                    }),
                    arguments: {
                        PIN: {type: ArgumentType.STRING, menu: 'digitalPins', defaultValue: '9'},
                        ANGLE: {type: ArgumentType.NUMBER, defaultValue: 90}
                    }
                },
                {
                    opcode: 'playTone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduinoUno.playTone',
                        default: 'tocar [FREQ] Hz no pino [PIN] por [MS] ms',
                        description: 'Play a tone on a pin'
                    }),
                    arguments: {
                        FREQ: {type: ArgumentType.NUMBER, defaultValue: 440},
                        PIN: {type: ArgumentType.STRING, menu: 'digitalPins', defaultValue: '8'},
                        MS: {type: ArgumentType.NUMBER, defaultValue: 500}
                    }
                }
            ],
            menus: {
                digitalPins: {acceptReporters: true, items: pins},
                pwmPins: {acceptReporters: true, items: ['3', '5', '6', '9', '10', '11']},
                analogPins: {
                    acceptReporters: true,
                    items: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((label, index) => ({
                        text: label,
                        value: String(index)
                    }))
                },
                pinModes: {
                    acceptReporters: false,
                    items: [
                        {text: 'entrada', value: '0'},
                        {text: 'saída', value: '1'},
                        {text: 'entrada com pull-up', value: '2'}
                    ]
                },
                levels: {
                    acceptReporters: true,
                    items: [
                        {text: 'desligado', value: '0'},
                        {text: 'ligado', value: '1'}
                    ]
                }
            }
        };
    }

    connect () {
        return this.link.connect()
            .then(() => {
                this._message = this.link.status;
            })
            .catch(error => {
                this._message = error.message || 'não conectou';
            });
    }

    disconnect () {
        return this.link.disconnect().then(() => {
            this._message = this.link.status;
        });
    }

    status () {
        return this.link.status || this._message;
    }

    flashLive () {
        return fetch(LIVE_HEX_URL)
            .then(response => {
                if (!response.ok) throw new Error('O firmware local não foi encontrado.');
                return response.text();
            })
            .then(text => this.link.flashBytes(parseIntelHex(text), {checkLive: true}))
            .then(result => {
                this._message = result;
            })
            .catch(error => {
                this._message = error.message || 'não gravou';
            });
    }

    flashProgram () {
        let source;
        try {
            const device = this.runtime.targets.find(target => (
                target.sprite && target.sprite.name === 'aluno-maker-arduino'
            ));
            const blocks = (device || this.runtime.getEditingTarget()).blocks;
            source = generateSketch(blocks);
        } catch (error) {
            this._message = error.message;
            return;
        }
        return fetch(COMPILE_URL, {
            method: 'POST',
            headers: {'Content-Type': 'text/plain;charset=utf-8'},
            body: source
        })
            .then(response => response.json().then(body => {
                if (!response.ok) throw new Error(body.error || 'A compilação falhou.');
                return body.hex;
            }))
            .then(hex => this.link.flashBytes(parseIntelHex(hex), {checkLive: false}))
            .then(result => {
                this._message = result;
            })
            .catch(error => {
                this._message = error.message || 'não gravou o programa';
            });
    }

    setPinMode (args) {
        return this._send(0x10, [this._pin(args.PIN), this._unit(args.MODE, 0, 2)], false);
    }

    digitalWrite (args) {
        return this._send(0x11, [this._pin(args.PIN), Cast.toNumber(args.VALUE) ? 1 : 0], false);
    }

    digitalRead (args) {
        return this._send(0x12, [this._pin(args.PIN)], true).then(reply => (
            reply && reply[0] === 0x92 ? Boolean(reply[2]) : false
        ));
    }

    analogRead (args) {
        const channel = Math.max(0, Math.min(5, Math.round(Cast.toNumber(args.PIN)) || 0));
        return this._send(0x13, [channel], true).then(reply => {
            if (!reply || reply[0] !== 0x93) return 0;
            return reply[2] | (reply[3] << 8);
        });
    }

    pwmWrite (args) {
        return this._send(0x14, [this._pin(args.PIN), this._unit(args.DUTY, 0, 255)], false);
    }

    servoWrite (args) {
        return this._send(0x15, [this._pin(args.PIN), this._unit(args.ANGLE, 0, 180)], false);
    }

    playTone (args) {
        const freq = this._unit(args.FREQ, 31, 8000);
        const ms = this._unit(args.MS, 0, 5000);
        return this._send(0x16, [
            this._pin(args.PIN),
            freq & 0xff,
            (freq >> 8) & 0xff,
            ms & 0xff,
            (ms >> 8) & 0xff
        ], true);
    }

    _pin (value) {
        const pin = Math.round(Cast.toNumber(value));
        if (pin < 2 || pin > 13) return 13;
        return pin;
    }

    _unit (value, min, max) {
        const number = Math.round(Cast.toNumber(value));
        if (!Number.isFinite(number)) return min;
        return Math.max(min, Math.min(max, number));
    }

    _send (command, payload, expectReply) {
        if (this.link.status !== 'conectado') {
            this._message = 'conecte o Arduino antes';
            return expectReply ? Promise.resolve(null) : undefined;
        }
        return this.link.command(command, payload, expectReply).catch(error => {
            this._message = error.message || 'falha na USB';
            return null;
        });
    }
}

module.exports = Scratch3ArduinoUnoBlocks;
