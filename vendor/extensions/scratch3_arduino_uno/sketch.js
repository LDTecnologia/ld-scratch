const {sanitizeNumber, cIdent} = require('./c-safe');

const templateStart = `/* aluno-maker-uno */
#define F_CPU 16000000UL
#include <avr/interrupt.h>
#include <avr/io.h>
#include <stdint.h>
#include <util/delay.h>

static volatile uint8_t servo_pin = 255;
static volatile uint16_t servo_us = 1500;

static uint8_t pin_bit(uint8_t pin) {
    return pin < 8 ? pin : (uint8_t)(pin - 8);
}
static volatile uint8_t *pin_port(uint8_t pin) { return pin < 8 ? &PORTD : &PORTB; }
static volatile uint8_t *pin_ddr(uint8_t pin) { return pin < 8 ? &DDRD : &DDRB; }
static volatile uint8_t *pin_input(uint8_t pin) { return pin < 8 ? &PIND : &PINB; }

static void pin_mode(uint8_t pin, uint8_t mode) {
    uint8_t bit = pin_bit(pin);
    if (pin < 2 || pin > 13) return;
    if (mode == 1) { *pin_ddr(pin) |= (uint8_t)_BV(bit); return; }
    *pin_ddr(pin) &= (uint8_t)~_BV(bit);
    if (mode == 2) *pin_port(pin) |= (uint8_t)_BV(bit);
    else *pin_port(pin) &= (uint8_t)~_BV(bit);
}
static void pin_write(uint8_t pin, uint8_t value) {
    uint8_t bit = pin_bit(pin);
    if (pin < 2 || pin > 13) return;
    if (value) *pin_port(pin) |= (uint8_t)_BV(bit);
    else *pin_port(pin) &= (uint8_t)~_BV(bit);
}
static uint8_t pin_read(uint8_t pin) {
    if (pin < 2 || pin > 13) return 0;
    return (*pin_input(pin) & (uint8_t)_BV(pin_bit(pin))) ? 1 : 0;
}
static void delay_ms(uint16_t ms) { while (ms--) _delay_ms(1); }
static void delay_us_var(uint16_t us) { while (us--) _delay_us(1); }

static void pwm_write(uint8_t pin, uint8_t duty) {
    pin_mode(pin, 1);
    if (pin == 5) { TCCR0A |= _BV(COM0B1); OCR0B = duty; }
    else if (pin == 6) { TCCR0A |= _BV(COM0A1); OCR0A = duty; }
    else if (pin == 3) { TCCR2A |= _BV(COM2B1); OCR2B = duty; }
    else if (pin == 11) { TCCR2A |= _BV(COM2A1); OCR2A = duty; }
    else if (pin == 9) { TCCR1A |= _BV(COM1A1) | _BV(WGM10); TCCR1B |= _BV(WGM12) | _BV(CS11) | _BV(CS10); OCR1A = duty; }
    else if (pin == 10) { TCCR1A |= _BV(COM1B1) | _BV(WGM10); TCCR1B |= _BV(WGM12) | _BV(CS11) | _BV(CS10); OCR1B = duty; }
    else if (duty) pin_write(pin, 1);
    else pin_write(pin, 0);
}

ISR(TIMER1_COMPA_vect) {
    uint8_t pin = servo_pin;
    if (pin < 2 || pin > 13) return;
    pin_write(pin, 1);
    delay_us_var(servo_us);
    pin_write(pin, 0);
}
static void servo_write(uint8_t pin, uint8_t angle) {
    if (angle > 180) angle = 180;
    pin_mode(pin, 1);
    servo_us = (uint16_t)(500 + ((uint32_t)angle * 2000UL / 180UL));
    servo_pin = pin;
    TCCR1A = 0;
    TCCR1B = _BV(WGM12) | _BV(CS11);
    OCR1A = 40000;
    TIMSK1 = _BV(OCIE1A);
}
static void play_tone(uint8_t pin, uint16_t freq, uint16_t ms) {
    uint32_t cycles;
    uint16_t half;
    if (freq < 31 || ms == 0) { pin_write(pin, 0); return; }
    pin_mode(pin, 1);
    half = (uint16_t)(500000UL / freq);
    cycles = ((uint32_t)ms * freq) / 1000UL;
    while (cycles--) {
        pin_write(pin, 1);
        delay_us_var(half);
        pin_write(pin, 0);
        delay_us_var(half);
    }
}
`;

function readArg (blocks, block, name) {
    const input = block.inputs && block.inputs[name];
    if (input && input.block && input.block !== input.shadow) {
        const reporter = blocks.getBlock(input.block);
        if (reporter) return expression(blocks, reporter);
    }
    const field = block.fields && block.fields[name];
    if (field && field.value !== undefined && field.value !== null && `${field.value}` !== '') {
        return expressionFromLiteral(field.value);
    }
    if (input && (input.shadow || input.block)) {
        const shadow = blocks.getBlock(input.shadow || input.block);
        if (shadow) return expression(blocks, shadow);
    }
    return '0';
}

function expressionFromLiteral (value) {
    if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value).trim())) {
        return sanitizeNumber(value);
    }
    return cIdent(value);
}

function expression (blocks, block) {
    const opcode = block.opcode;
    if (opcode === 'math_number' || opcode === 'math_integer' || opcode === 'math_positive_number' ||
        opcode === 'math_whole_number' || opcode === 'math_angle') {
        return sanitizeNumber(block.fields.NUM.value);
    }
    if (opcode === 'text') {
        return sanitizeNumber(block.fields.TEXT.value);
    }
    if (opcode === 'arduinoUno_digitalRead') {
        return `pin_read((uint8_t)(${readArg(blocks, block, 'PIN')}))`;
    }
    if (opcode === 'arduinoUno_analogRead') {
        return `analog_read((uint8_t)(${readArg(blocks, block, 'PIN')}))`;
    }
    if (opcode === 'data_variable') {
        return cIdent(block.fields.VARIABLE.value);
    }
    if (opcode === 'operator_add') return binary(blocks, block, '+');
    if (opcode === 'operator_subtract') return binary(blocks, block, '-');
    if (opcode === 'operator_multiply') return binary(blocks, block, '*');
    if (opcode === 'operator_divide') return binary(blocks, block, '/');
    if (opcode === 'operator_mod') return binary(blocks, block, '%');
    if (opcode === 'operator_gt') return binary(blocks, block, '>');
    if (opcode === 'operator_lt') return binary(blocks, block, '<');
    if (opcode === 'operator_equals') return binary(blocks, block, '==');
    if (opcode === 'operator_and') return binary(blocks, block, '&&');
    if (opcode === 'operator_or') return binary(blocks, block, '||');
    if (opcode === 'operator_not') {
        return `!(${readFlexible(blocks, block, ['OPERAND'])})`;
    }
    throw new Error(`Não dá para gravar o bloco ${opcode}.`);
}

function hasArg (block, name) {
    const field = block.fields && block.fields[name];
    if (field && field.value !== undefined && field.value !== null && `${field.value}` !== '') return true;
    const input = block.inputs && block.inputs[name];
    return Boolean(input && (input.block || input.shadow));
}

function readFlexible (blocks, block, names) {
    const name = names.find(candidate => hasArg(block, candidate));
    return name ? readArg(blocks, block, name) : '0';
}

function binary (blocks, block, operator) {
    const left = readFlexible(blocks, block, ['NUM1', 'OPERAND1']);
    const right = readFlexible(blocks, block, ['NUM2', 'OPERAND2']);
    return `(${left} ${operator} ${right})`;
}

function statementLines (blocks, startId, indent) {
    const pad = '    '.repeat(indent);
    let code = '';
    let id = startId;
    const seen = new Set();
    while (id) {
        if (seen.has(id)) break;
        seen.add(id);
        const block = blocks.getBlock(id);
        if (!block) break;
        code += emit(blocks, block, indent, pad);
        id = block.next;
    }
    return code;
}

function emit (blocks, block, indent, pad) {
    const opcode = block.opcode;
    if (opcode === 'arduinoUno_setPinMode') {
        return `${pad}pin_mode((uint8_t)(${readArg(blocks, block, 'PIN')}), (uint8_t)(${readArg(blocks, block, 'MODE')}));\n`;
    }
    if (opcode === 'arduinoUno_digitalWrite') {
        return `${pad}pin_write((uint8_t)(${readArg(blocks, block, 'PIN')}), (uint8_t)(${readArg(blocks, block, 'VALUE')}));\n`;
    }
    if (opcode === 'arduinoUno_pwmWrite') {
        return `${pad}pwm_write((uint8_t)(${readArg(blocks, block, 'PIN')}), (uint8_t)(${readArg(blocks, block, 'DUTY')}));\n`;
    }
    if (opcode === 'arduinoUno_servoWrite') {
        return `${pad}servo_write((uint8_t)(${readArg(blocks, block, 'PIN')}), (uint8_t)(${readArg(blocks, block, 'ANGLE')}));\n`;
    }
    if (opcode === 'arduinoUno_playTone') {
        return `${pad}play_tone((uint8_t)(${readArg(blocks, block, 'PIN')}), (uint16_t)(${readArg(blocks, block, 'FREQ')}), (uint16_t)(${readArg(blocks, block, 'MS')}));\n`;
    }
    if (opcode === 'control_wait') {
        return `${pad}delay_ms((uint16_t)((${readArg(blocks, block, 'DURATION')}) * 1000));\n`;
    }
    if (opcode === 'control_repeat') {
        const body = statementLines(blocks, substack(block, 'SUBSTACK'), indent + 1);
        return `${pad}for (uint16_t _rep${indent} = 0; _rep${indent} < (uint16_t)(${readArg(blocks, block, 'TIMES')}); _rep${indent}++) {\n${body}${pad}}\n`;
    }
    if (opcode === 'control_forever') {
        const body = statementLines(blocks, substack(block, 'SUBSTACK'), indent + 1);
        return `${pad}while (1) {\n${body}${pad}}\n`;
    }
    if (opcode === 'control_if') {
        const body = statementLines(blocks, substack(block, 'SUBSTACK'), indent + 1);
        return `${pad}if (${readArg(blocks, block, 'CONDITION')}) {\n${body}${pad}}\n`;
    }
    if (opcode === 'control_if_else') {
        const yes = statementLines(blocks, substack(block, 'SUBSTACK'), indent + 1);
        const no = statementLines(blocks, substack(block, 'SUBSTACK2'), indent + 1);
        return `${pad}if (${readArg(blocks, block, 'CONDITION')}) {\n${yes}${pad}} else {\n${no}${pad}}\n`;
    }
    if (opcode === 'control_wait_until') {
        return `${pad}while (!(${readArg(blocks, block, 'CONDITION')})) { _delay_ms(1); }\n`;
    }
    if (opcode === 'data_setvariableto') {
        return `${pad}${cIdent(block.fields.VARIABLE.value)} = (${readArg(blocks, block, 'VALUE')});\n`;
    }
    if (opcode === 'data_changevariableby') {
        const name = cIdent(block.fields.VARIABLE.value);
        return `${pad}${name} = ${name} + (${readArg(blocks, block, 'VALUE')});\n`;
    }
    if (opcode === 'arduinoUno_digitalRead' || opcode === 'arduinoUno_analogRead') {
        return '';
    }
    throw new Error(`Não dá para gravar o bloco ${opcode}.`);
}

function substack (block, name) {
    const input = block.inputs && block.inputs[name];
    return input ? input.block : null;
}

function collectVariables (blocks, startId, found) {
    let id = startId;
    const seen = new Set();
    while (id) {
        if (seen.has(id)) break;
        seen.add(id);
        const block = blocks.getBlock(id);
        if (!block) break;
        if (block.opcode === 'data_setvariableto' || block.opcode === 'data_changevariableby' ||
            block.opcode === 'data_variable') {
            found.add(block.fields.VARIABLE.value);
        }
        const inputs = block.inputs || {};
        Object.keys(inputs).forEach(key => {
            if (inputs[key] && inputs[key].block) {
                collectVariables(blocks, inputs[key].block, found);
            }
        });
        id = block.next;
    }
}

function generateSketch (blocks) {
    let setup = '';
    let loop = '';
    const names = new Set();
    blocks.getScripts().forEach(id => {
        const block = blocks.getBlock(id);
        if (!block) return;
        if (block.opcode === 'arduinoUno_whenStart') {
            setup += statementLines(blocks, block.next, 2);
            collectVariables(blocks, block.next, names);
        }
        if (block.opcode === 'arduinoUno_whenRepeat') {
            loop += statementLines(blocks, block.next, 2);
            collectVariables(blocks, block.next, names);
        }
    });
    if (!setup && !loop) {
        throw new Error('Coloque os blocos embaixo de “ao iniciar o Arduino” ou “repetir no Arduino”.');
    }
    const declarations = Array.from(names).map(name => `    int ${cIdent(name)} = 0;\n`).join('');
    const setupGuard = setup ? `        if (!started) {\n${setup}            started = 1;\n        }\n` : '';
    const startedDecl = setup ? '    uint8_t started = 0;\n' : '';
    return `${templateStart}
static uint16_t analog_read(uint8_t channel) {
    ADMUX = (uint8_t)(_BV(REFS0) | (channel & 7));
    ADCSRA = (uint8_t)(_BV(ADEN) | _BV(ADPS2) | _BV(ADPS1) | _BV(ADPS0));
    ADCSRA |= (uint8_t)_BV(ADSC);
    while (ADCSRA & (uint8_t)_BV(ADSC)) {}
    return ADC;
}

int main(void) {
    TCCR0A = _BV(WGM00) | _BV(WGM01);
    TCCR0B = _BV(CS01) | _BV(CS00);
    TCCR2A = _BV(WGM20) | _BV(WGM21);
    TCCR2B = _BV(CS22);
    sei();
${declarations}${startedDecl}    while (1) {
${setupGuard}${loop || '        _delay_ms(10);\n'}    }
}
`;
}

module.exports = generateSketch;
