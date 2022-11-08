EXTENSION_DEVELOP_SYMLINK := $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)

develop: build
	mkdir -p "$(dir $(EXTENSION_DEVELOP_SYMLINK))"
	@if [[ -e "$(EXTENSION_DEVELOP_SYMLINK)" && ! -L "$(EXTENSION_DEVELOP_SYMLINK)" ]]; then \
		echo "$(EXTENSION_DEVELOP_SYMLINK) exists and is not a symlink, not overwriting"; exit 1; \
	fi
	if [[ "$(abspath .)" != "$(abspath $(EXTENSION_DEVELOP_SYMLINK))" ]]; then \
		ln -snf "$(abspath .)" "$(EXTENSION_DEVELOP_SYMLINK)"; \
	fi

develop-uninstall:
	if [[ -L "$(EXTENSION_DEVELOP_SYMLINK)" ]]; then \
		unlink "$(EXTENSION_DEVELOP_SYMLINK)"; \
	fi

.PHONY: develop develop-uninstall
