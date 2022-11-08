EXTENSION_METADATA_FILE := metadata.json

# Prevent people from trying to feed source archives to 'gnome-extensions install'.
# https://github.com/ddterm/gnome-shell-extension-ddterm/issues/61

$(EXTENSION_METADATA_FILE): $(EXTENSION_METADATA_FILE).in
	cp $< $@

clean/$(EXTENSION_METADATA_FILE):
	$(RM) $(EXTENSION_METADATA_FILE)

all: $(EXTENSION_METADATA_FILE)
clean: clean/$(EXTENSION_METADATA_FILE)
.PHONY: clean/$(EXTENSION_METADATA_FILE)

EXTENSION_PACK_CONTENT += $(EXTENSION_METADATA_FILE)
