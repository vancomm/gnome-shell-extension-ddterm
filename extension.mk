# Generic GNOME Shell Extension makefile
#
# Inputs:
# EXTENSION_UUID
# EXTENSION_PACK_CONTENT
# EXTENSION_EXECUTABLES (should be a subset of EXTENSION_PACK_CONTENT)

include extension-schemas.mk
include extension-locales.mk
include extension-metadata.mk

include extension-pack.mk
include extension-install.mk

prefs enable disable reset info show:
	gnome-extensions $@ $(EXTENSION_UUID)

.PHONY: prefs enable disable reset info show
