/*
 * Firmware ao vivo do Arduino Uno para o editor Aluno Maker.
 * Os blocos mandam comandos pela USB enquanto o cabo está ligado.
 *
 * Pacote: 0xA5, tamanho, comando, dados. O tamanho inclui o comando.
 * 0x01 ping
 * 0x10 pino modo          0 entrada, 1 saida, 2 entrada com pull-up
 * 0x11 pino valor         escrita digital
 * 0x12 pino               leitura digital
 * 0x13 canal              leitura analogica A0-A5
 * 0x14 pino carga         PWM 0-255 nos pinos 3, 5, 6, 9, 10 e 11
 * 0x15 pino angulo        servo
 * 0x16 pino freqL freqH msL msH
 */
#define F_CPU 16000000UL

#include <avr/interrupt.h>
#include <avr/io.h>
#include <stdint.h>
#include <util/delay.h>

#define SYNC 0xA5
#define CMD_PING 0x01
#define CMD_MODE 0x10
#define CMD_DWRITE 0x11
#define CMD_DREAD 0x12
#define CMD_AREAD 0x13
#define CMD_PWM 0x14
#define CMD_SERVO 0x15
#define CMD_TONE 0x16

#define RSP_PONG 0x81
#define RSP_DREAD 0x92
#define RSP_AREAD 0x93
#define RSP_ERR 0xE0

static volatile uint8_t servo_pin = 255;
static volatile uint16_t servo_us = 1500;

static uint8_t pin_bit (uint8_t pin) {
    return pin < 8 ? pin : (uint8_t)(pin - 8);
}

static volatile uint8_t *pin_port (uint8_t pin) {
    return pin < 8 ? &PORTD : &PORTB;
}

static volatile uint8_t *pin_ddr (uint8_t pin) {
    return pin < 8 ? &DDRD : &DDRB;
}

static volatile uint8_t *pin_input (uint8_t pin) {
    return pin < 8 ? &PIND : &PINB;
}

static uint8_t pin_ok (uint8_t pin) {
    return pin >= 2 && pin <= 13;
}

static void pin_mode (uint8_t pin, uint8_t mode) {
    uint8_t bit = pin_bit(pin);
    if (mode == 1) {
        *pin_ddr(pin) |= (uint8_t)_BV(bit);
        return;
    }
    *pin_ddr(pin) &= (uint8_t)~_BV(bit);
    if (mode == 2) {
        *pin_port(pin) |= (uint8_t)_BV(bit);
    } else {
        *pin_port(pin) &= (uint8_t)~_BV(bit);
    }
}

static void pin_write (uint8_t pin, uint8_t value) {
    uint8_t bit = pin_bit(pin);
    if (value) {
        *pin_port(pin) |= (uint8_t)_BV(bit);
    } else {
        *pin_port(pin) &= (uint8_t)~_BV(bit);
    }
}

static uint8_t pin_read (uint8_t pin) {
    return (*pin_input(pin) & (uint8_t)_BV(pin_bit(pin))) ? 1 : 0;
}

static void pwm_disconnect (uint8_t pin) {
    switch (pin) {
    case 3:
        TCCR2A &= (uint8_t)~_BV(COM2B1);
        break;
    case 5:
        TCCR0A &= (uint8_t)~_BV(COM0B1);
        break;
    case 6:
        TCCR0A &= (uint8_t)~_BV(COM0A1);
        break;
    case 9:
        TCCR1A &= (uint8_t)~_BV(COM1A1);
        break;
    case 10:
        TCCR1A &= (uint8_t)~_BV(COM1B1);
        break;
    case 11:
        TCCR2A &= (uint8_t)~_BV(COM2A1);
        break;
    default:
        break;
    }
}

static void timer1_servo (void) {
    TCCR1A = 0;
    TCCR1B = (uint8_t)(_BV(WGM12) | _BV(CS11));
    OCR1A = 40000;
    TIMSK1 = (uint8_t)_BV(OCIE1A);
}

static void pwm_write (uint8_t pin, uint8_t duty) {
    if (pin == 9 || pin == 10) {
        servo_pin = 255;
        TIMSK1 = 0;
        /* Fast PWM, 8-bit, prescale 64. */
        TCCR1A = (uint8_t)_BV(WGM10);
        TCCR1B = (uint8_t)(_BV(WGM12) | _BV(CS11) | _BV(CS10));
    }
    pin_mode(pin, 1);
    if (duty == 0 || duty == 255) {
        pwm_disconnect(pin);
        pin_write(pin, duty ? 1 : 0);
        return;
    }
    switch (pin) {
    case 3:
        TCCR2A |= (uint8_t)_BV(COM2B1);
        OCR2B = duty;
        break;
    case 5:
        TCCR0A |= (uint8_t)_BV(COM0B1);
        OCR0B = duty;
        break;
    case 6:
        TCCR0A |= (uint8_t)_BV(COM0A1);
        OCR0A = duty;
        break;
    case 9:
        TCCR1A |= (uint8_t)_BV(COM1A1);
        OCR1A = duty;
        break;
    case 10:
        TCCR1A |= (uint8_t)_BV(COM1B1);
        OCR1B = duty;
        break;
    case 11:
        TCCR2A |= (uint8_t)_BV(COM2A1);
        OCR2A = duty;
        break;
    default:
        break;
    }
}

static uint16_t analog_read (uint8_t channel) {
    ADMUX = (uint8_t)(_BV(REFS0) | (channel & 0x07));
    ADCSRA = (uint8_t)(_BV(ADEN) | _BV(ADPS2) | _BV(ADPS1) | _BV(ADPS0));
    ADCSRA |= (uint8_t)_BV(ADSC);
    while (ADCSRA & (uint8_t)_BV(ADSC)) {
    }
    return ADC;
}

static void uart_init (void) {
    UCSR0A = (uint8_t)_BV(U2X0);
    UBRR0H = 0;
    UBRR0L = 16;
    UCSR0B = (uint8_t)(_BV(RXEN0) | _BV(TXEN0));
    UCSR0C = (uint8_t)(_BV(UCSZ01) | _BV(UCSZ00));
}

static uint8_t uart_getc (void) {
    while (!(UCSR0A & (uint8_t)_BV(RXC0))) {
    }
    return UDR0;
}

static void uart_putc (uint8_t value) {
    while (!(UCSR0A & (uint8_t)_BV(UDRE0))) {
    }
    UDR0 = value;
}

static void reply (uint8_t command, const uint8_t *data, uint8_t length) {
    uint8_t index;
    uart_putc(SYNC);
    uart_putc((uint8_t)(length + 1));
    uart_putc(command);
    for (index = 0; index < length; index++) {
        uart_putc(data[index]);
    }
}

static void delay_us_var (uint16_t micros) {
    while (micros--) {
        _delay_us(1);
    }
}

static void play_tone (uint8_t pin, uint16_t freq, uint16_t ms) {
    uint16_t half;
    uint32_t cycles;
    uint32_t index;
    if (freq < 31 || ms == 0) {
        pin_write(pin, 0);
        return;
    }
    pin_mode(pin, 1);
    half = (uint16_t)(500000UL / freq);
    cycles = ((uint32_t)ms * freq) / 1000UL;
    cli();
    for (index = 0; index < cycles; index++) {
        pin_write(pin, 1);
        delay_us_var(half);
        pin_write(pin, 0);
        delay_us_var(half);
    }
    sei();
}

ISR(TIMER1_COMPA_vect) {
    uint8_t pin = servo_pin;
    uint16_t micros = servo_us;
    if (pin < 2 || pin > 13) {
        return;
    }
    pin_write(pin, 1);
    delay_us_var(micros);
    pin_write(pin, 0);
}

static void handle (uint8_t command, const uint8_t *data, uint8_t length) {
    uint8_t bytes[3];
    uint16_t value;
    uint16_t freq;
    uint16_t ms;
    uint8_t angle;
    if (command == CMD_PING && length == 0) {
        reply(RSP_PONG, 0, 0);
        return;
    }
    if (command == CMD_MODE && length == 2 && pin_ok(data[0])) {
        pwm_disconnect(data[0]);
        pin_mode(data[0], data[1]);
        reply(CMD_MODE, 0, 0);
        return;
    }
    if (command == CMD_DWRITE && length == 2 && pin_ok(data[0])) {
        pwm_disconnect(data[0]);
        pin_mode(data[0], 1);
        pin_write(data[0], data[1] ? 1 : 0);
        reply(CMD_DWRITE, 0, 0);
        return;
    }
    if (command == CMD_DREAD && length == 1 && pin_ok(data[0])) {
        bytes[0] = data[0];
        bytes[1] = pin_read(data[0]);
        reply(RSP_DREAD, bytes, 2);
        return;
    }
    if (command == CMD_AREAD && length == 1 && data[0] <= 5) {
        value = analog_read(data[0]);
        bytes[0] = data[0];
        bytes[1] = (uint8_t)value;
        bytes[2] = (uint8_t)(value >> 8);
        reply(RSP_AREAD, bytes, 3);
        return;
    }
    if (command == CMD_PWM && length == 2 && pin_ok(data[0])) {
        pwm_write(data[0], data[1]);
        reply(CMD_PWM, 0, 0);
        return;
    }
    if (command == CMD_SERVO && length == 2 && pin_ok(data[0])) {
        angle = data[1] > 180 ? 180 : data[1];
        pwm_disconnect(data[0]);
        pin_mode(data[0], 1);
        servo_us = (uint16_t)(500 + ((uint32_t)angle * 2000UL / 180UL));
        servo_pin = data[0];
        timer1_servo();
        reply(CMD_SERVO, 0, 0);
        return;
    }
    if (command == CMD_TONE && length == 5 && pin_ok(data[0])) {
        freq = (uint16_t)data[1] | ((uint16_t)data[2] << 8);
        ms = (uint16_t)data[3] | ((uint16_t)data[4] << 8);
        play_tone(data[0], freq, ms);
        reply(CMD_TONE, 0, 0);
        return;
    }
    bytes[0] = command;
    reply(RSP_ERR, bytes, 1);
}

int main (void) {
    uint8_t payload[8];
    uint8_t blink;
    uart_init();
    TCCR0A = (uint8_t)(_BV(WGM00) | _BV(WGM01));
    TCCR0B = (uint8_t)(_BV(CS01) | _BV(CS00));
    TCCR2A = (uint8_t)(_BV(WGM20) | _BV(WGM21));
    TCCR2B = (uint8_t)_BV(CS22);
    sei();

    pin_mode(13, 1);
    for (blink = 0; blink < 3; blink++) {
        pin_write(13, 1);
        _delay_ms(80);
        pin_write(13, 0);
        _delay_ms(80);
    }

    for (;;) {
        uint8_t length;
        uint8_t command;
        uint8_t data_length;
        uint8_t index;
        if (uart_getc() != SYNC) {
            continue;
        }
        length = uart_getc();
        if (length == 0 || length > sizeof payload) {
            continue;
        }
        command = uart_getc();
        data_length = (uint8_t)(length - 1);
        for (index = 0; index < data_length; index++) {
            payload[index] = uart_getc();
        }
        handle(command, payload, data_length);
    }
}
