#!/usr/bin/env -S make -f

# See docs/BUILD.md

SHELL := /bin/bash

EXTENSION_UUID := ddterm@amezin.github.com

all clean:
.PHONY: all clean

EXTENSION_PACK_CONTENT :=
TRANSLATABLE_SOURCES :=

tmp:
	mkdir -p tmp

include npm.mk
include ui.mk

JS_SOURCES := $(filter-out $(EXTENSION_PACK_CONTENT), $(wildcard *.js))
TRANSLATABLE_SOURCES += $(JS_SOURCES)
EXTENSION_EXECUTABLES := com.github.amezin.ddterm

EXTENSION_PACK_CONTENT += \
	$(JS_SOURCES) \
	$(EXTENSION_EXECUTABLES) \
	style.css \
	com.github.amezin.ddterm.Extension.xml \
	LICENSE

include extension.mk
include translation-tools.mk

# Various helpers

toggle quit begin-subscription-leak-check end-subscription-leak-check:
	gapplication action com.github.amezin.ddterm $@

.PHONY: toggle quit begin-subscription-leak-check end-subscription-leak-check
