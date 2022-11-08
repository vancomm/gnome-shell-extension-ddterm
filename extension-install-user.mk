user-install: $(EXTENSION_PACK_FILE) develop-uninstall
	gnome-extensions install -f $<

user-uninstall: develop-uninstall
	gnome-extensions uninstall $(EXTENSION_UUID)

.PHONY: user-install user-uninstall
