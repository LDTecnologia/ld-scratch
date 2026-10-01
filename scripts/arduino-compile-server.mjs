// Compiles an Aluno Maker Arduino Uno sketch with the local AVR toolchain.
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {spawn} from 'child_process';

const port = Number(process.env.ARDUINO_COMPILE_PORT || 8791);
const gcc = process.env.AVR_GCC || '/tmp/avr-toolchain/extract/avr/bin/avr-gcc';
const objcopy = process.env.AVR_OBJCOPY || '/tmp/avr-toolchain/extract/avr/bin/avr-objcopy';

const run = (command, args, cwd) => new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd});
    let stderr = '';
    child.stderr.on('data', chunk => {
        stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
        if (code === 0) resolve(stderr);
        else reject(new Error(stderr || `${command} saiu com código ${code}`));
    });
});

const compile = async source => {
    if (!source.startsWith('/* aluno-maker-uno */')) {
        throw new Error('Este compilador só aceita o programa gerado pelo editor.');
    }
    if (source.length > 100000) throw new Error('Programa grande demais.');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aluno-uno-'));
    try {
        fs.writeFileSync(path.join(dir, 'program.c'), source);
        await run(gcc, [
            '-mmcu=atmega328p',
            '-DF_CPU=16000000UL',
            '-Os',
            '-std=c11',
            '-o',
            'program.elf',
            'program.c'
        ], dir);
        await run(objcopy, ['-O', 'ihex', '-R', '.eeprom', 'program.elf', 'program.hex'], dir);
        return fs.readFileSync(path.join(dir, 'program.hex'), 'utf8');
    } finally {
        fs.rmSync(dir, {recursive: true, force: true});
    }
};

const server = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
    }
    if (request.method !== 'POST' || request.url !== '/compile') {
        response.writeHead(404, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({error: 'não encontrado'}));
        return;
    }
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
        compile(Buffer.concat(chunks).toString('utf8'))
            .then(hex => {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({hex}));
            })
            .catch(error => {
                response.writeHead(400, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({error: error.message}));
            });
    });
});

server.listen(port, '127.0.0.1', () => {
    console.info(`Compilador do Arduino Uno em http://127.0.0.1:${port}/compile`);
});
