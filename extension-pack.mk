EXTENSION_PACK_FILE := $(EXTENSION_UUID).shell-extension.zip

build: $(EXTENSION_PACK_CONTENT)
all: build
.PHONY: build

$(EXTENSION_PACK_FILE): $(EXTENSION_PACK_CONTENT)
	$(RM) $@
	zip -y -nw $@ -- $^

pack: $(EXTENSION_PACK_FILE)
pack/clean:
	$(RM) $(EXTENSION_PACK_FILE)

all: pack
clean: pack/clean
.PHONY: pack pack/clean
