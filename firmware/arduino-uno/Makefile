MCU = atmega328p
F_CPU = 16000000UL
PREFIX ?= avr-
CC = $(PREFIX)gcc
OBJCOPY = $(PREFIX)objcopy
CFLAGS = -mmcu=$(MCU) -DF_CPU=$(F_CPU) -Os -Wall -std=c11

aluno-maker-uno.hex: main.c
	$(CC) $(CFLAGS) -o main.elf main.c
	$(OBJCOPY) -O ihex -R .eeprom main.elf aluno-maker-uno.hex

.PHONY: clean
clean:
	rm -f main.elf aluno-maker-uno.hex
