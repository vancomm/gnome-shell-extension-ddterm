# Inputs:
# EXTENSION_UUID
# TRANSLATABLE_SOURCES

POT_FILE := tmp/$(EXTENSION_UUID).pot

$(POT_FILE): $(sort $(TRANSLATABLE_SOURCES)) | tmp
	xgettext \
		--from-code=UTF-8 \
		--default-domain=$(EXTENSION_UUID) \
		--package-name=ddterm \
		--output=$@ \
		$^

clean/$(POT_FILE):
	$(RM) $(POT_FILE)

clean: clean/$(POT_FILE)
.PHONY: clean/$(POT_FILE)

MSGCMP_GOALS := $(addprefix msgcmp/,$(EXTENSION_LOCALES_SOURCES))

$(MSGCMP_GOALS): msgcmp/%: % $(POT_FILE)
	msgcmp $(MSGCMP_FLAGS) $^

msgcmp: MSGCMP_FLAGS := --use-untranslated
msgcmp: $(MSGCMP_GOALS)

msgcmp-strict: MSGCMP_FLAGS :=
msgcmp-strict: $(MSGCMP_GOALS)

.PHONY: msgcmp msgcmp-strict $(MSGCMP_GOALS)
all: msgcmp

MSGMERGE_GOALS := $(addprefix msgmerge/,$(EXTENSION_LOCALES_SOURCES))

$(MSGMERGE_GOALS): msgmerge/%: % $(POT_FILE)
	msgmerge -U $^

msgmerge: $(MSGMERGE_GOALS)
.PHONY: msgmerge $(MSGMERGE_GOALS)
