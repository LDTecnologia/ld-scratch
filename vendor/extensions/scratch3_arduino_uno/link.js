const PAGE_SIZE = 128;
const STK_OK = 0x10;
const STK_INSYNC = 0x14;
const CRC_EOP = 0x20;
const STK_GET_SYNC = 0x30;
const STK_ENTER_PROGMODE = 0x50;
const STK_LEAVE_PROGMODE = 0x51;
const STK_LOAD_ADDRESS = 0x55;
const STK_PROG_PAGE = 0x64;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const describeSerialError = error => {
    const text = String((error && error.message) || '');
    if (/no port selected/i.test(text)) return 'Escolha a porta USB do Arduino.';
    if (/user gesture|not allowed/i.test(text)) return 'Clique de novo para escolher a porta USB.';
    return text || 'não conectou';
};

const askPort = async () => {
    try {
        return await navigator.serial.requestPort();
    } catch (error) {
        throw new Error(describeSerialError(error));
    }
};

function parseIntelHex (text) {
    const memory = new Uint8Array(32768);
    memory.fill(0xff);
    let base = 0;
    let highest = -1;
    text.split(/\r?\n/).forEach(raw => {
        const line = raw.trim();
        if (!line.startsWith(':')) return;
        const count = parseInt(line.slice(1, 3), 16);
        const addr = parseInt(line.slice(3, 7), 16);
        const type = parseInt(line.slice(7, 9), 16);
        if (type === 0x02) {
            base = parseInt(line.slice(9, 13), 16) << 4;
            return;
        }
        if (type === 0x04) {
            base = parseInt(line.slice(9, 13), 16) << 16;
            return;
        }
        if (type !== 0x00) return;
        for (let index = 0; index < count; index++) {
            const address = base + addr + index;
            if (address < 0 || address >= memory.length) continue;
            memory[address] = parseInt(line.slice(9 + (index * 2), 11 + (index * 2), 16), 16);
            if (address > highest) highest = address;
        }
    });
    if (highest < 0) throw new Error('O arquivo do programa está vazio.');
    return memory.slice(0, highest + 1);
}

class ArduinoLink {
    constructor () {
        this.port = null;
        this.writer = null;
        this.reader = null;
        this.rx = [];
        this.waiters = [];
        this._pumping = null;
        this._queue = Promise.resolve();
        this.status = 'desconectado';
    }

    available () {
        return typeof navigator !== 'undefined' && navigator.serial;
    }

    enqueue (task) {
        const run = this._queue.then(task, task);
        this._queue = run.then(() => undefined, () => undefined);
        return run;
    }

    async connect () {
        if (!this.available()) {
            this.status = 'Use Chrome ou Edge para a porta USB.';
            throw new Error(this.status);
        }
        if (!this.port) {
            try {
                this.port = await askPort();
            } catch (error) {
                this.status = error.message;
                throw error;
            }
        }
        await this.enqueue(() => this._openLive());
        return this.status;
    }

    async disconnect () {
        await this.enqueue(async () => {
            await this._close();
            this.port = null;
            this.status = 'desconectado';
        });
    }

    command (command, payload, expectReply) {
        return this.enqueue(() => this._command(command, payload, expectReply));
    }

    async flashBytes (memory, {checkLive = false} = {}) {
        if (!this.available()) {
            this.status = 'Use Chrome ou Edge para a porta USB.';
            throw new Error(this.status);
        }
        if (!this.port) {
            try {
                this.port = await askPort();
            } catch (error) {
                this.status = error.message;
                throw error;
            }
        }
        return this.enqueue(async () => {
            await this._close();
            await this.port.open({baudRate: 115200});
            this.writer = this.port.writable.getWriter();
            this.reader = this.port.readable.getReader();
            this._startPump();
            this.status = 'gravando';
            try {
                await this._resetBoard();
                await this._sync();
                await this._stk([STK_ENTER_PROGMODE, CRC_EOP]);
                const length = Math.min(memory.length, 0x7e00);
                for (let address = 0; address < length; address += PAGE_SIZE) {
                    const page = new Uint8Array(PAGE_SIZE);
                    page.fill(0xff);
                    page.set(memory.subarray(address, Math.min(address + PAGE_SIZE, memory.length)));
                    if (page.every(byte => byte === 0xff)) continue;
                    const word = address >> 1;
                    await this._stk([STK_LOAD_ADDRESS, word & 0xff, (word >> 8) & 0xff, CRC_EOP]);
                    await this._stk([
                        STK_PROG_PAGE,
                        (PAGE_SIZE >> 8) & 0xff,
                        PAGE_SIZE & 0xff,
                        0x46,
                        ...page,
                        CRC_EOP
                    ]);
                }
                await this._stk([STK_LEAVE_PROGMODE, CRC_EOP]);
            } catch (error) {
                this.status = 'não gravou';
                await this._close();
                throw error;
            }
            await this._close();
            await sleep(200);
            if (!checkLive) {
                this.status = 'programa gravado na placa';
                return this.status;
            }
            await this._openLive();
            return this.status;
        });
    }

    async _openLive () {
        if (!this.port.readable) {
            await this.port.open({baudRate: 115200});
        }
        if (!this.writer) this.writer = this.port.writable.getWriter();
        if (!this.reader) {
            this.reader = this.port.readable.getReader();
            this._startPump();
        }
        const reply = await this._command(0x01, [], true);
        if (!reply || reply[0] !== 0x81) {
            this.status = 'conectado, mas o firmware ao vivo não respondeu';
            throw new Error(this.status);
        }
        this.status = 'conectado';
    }

    async _close () {
        this.rx = [];
        this.waiters.splice(0).forEach(waiter => waiter.reject(new Error('porta fechada')));
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (error) {
                // The port may already be closing.
            }
            try {
                this.reader.releaseLock();
            } catch (error) {
                // Already released.
            }
            this.reader = null;
        }
        if (this._pumping) {
            try {
                await this._pumping;
            } catch (error) {
                // The pump ends when the reader is cancelled.
            }
            this._pumping = null;
        }
        if (this.writer) {
            try {
                this.writer.releaseLock();
            } catch (error) {
                // Already released.
            }
            this.writer = null;
        }
        if (this.port && this.port.readable) {
            try {
                await this.port.close();
            } catch (error) {
                // Ignore a port that the browser already closed.
            }
        }
    }

    _startPump () {
        const reader = this.reader;
        this._pumping = (async () => {
            while (reader === this.reader) {
                const {value, done} = await reader.read();
                if (done) break;
                for (const byte of value) this.rx.push(byte);
                this._wake();
            }
        })();
    }

    _wake () {
        this.waiters.splice(0).forEach(waiter => waiter.resolve());
    }

    async _readExact (count, timeout) {
        const deadline = Date.now() + timeout;
        while (this.rx.length < count) {
            const left = deadline - Date.now();
            if (left <= 0) throw new Error('O Arduino não respondeu.');
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.waiters = this.waiters.filter(waiter => waiter.resolve !== resolve);
                    reject(new Error('O Arduino não respondeu.'));
                }, left);
                this.waiters.push({
                    resolve: () => {
                        clearTimeout(timer);
                        resolve();
                    },
                    reject: error => {
                        clearTimeout(timer);
                        reject(error);
                    }
                });
            });
        }
        return this.rx.splice(0, count);
    }

    async _resetBoard () {
        await this.port.setSignals({dataTerminalReady: false, requestToSend: false});
        await sleep(200);
        await this.port.setSignals({dataTerminalReady: true, requestToSend: false});
        await sleep(80);
        this.rx = [];
    }

    async _sync () {
        const started = Date.now();
        let lastError = null;
        while (Date.now() - started < 1500) {
            try {
                this.rx = [];
                await this.writer.write(new Uint8Array([STK_GET_SYNC, CRC_EOP]));
                const [insync, ok] = await this._readExact(2, 120);
                if (insync === STK_INSYNC && ok === STK_OK) return;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('O Arduino não entrou no modo de gravação.');
    }

    async _stk (bytes) {
        await this.writer.write(new Uint8Array(bytes));
        const [insync, ok] = await this._readExact(2, 1000);
        if (insync !== STK_INSYNC || ok !== STK_OK) {
            throw new Error('O Arduino recusou a gravação.');
        }
    }

    async _command (command, payload, expectReply) {
        if (!this.writer) throw new Error(this.status || 'desconectado');
        const frame = new Uint8Array(3 + payload.length);
        frame[0] = 0xa5;
        frame[1] = payload.length + 1;
        frame[2] = command;
        payload.forEach((byte, index) => {
            frame[index + 3] = byte & 0xff;
        });
        await this.writer.write(frame);
        if (!expectReply) return null;
        const deadline = Date.now() + (command === 0x16 ? 8000 : 800);
        while (Date.now() < deadline) {
            const [sync] = await this._readExact(1, deadline - Date.now());
            if (sync !== 0xa5) continue;
            const [length] = await this._readExact(1, 400);
            return this._readExact(length, 400);
        }
        throw new Error('O Arduino não respondeu.');
    }
}

module.exports = {
    ArduinoLink,
    parseIntelHex
};
