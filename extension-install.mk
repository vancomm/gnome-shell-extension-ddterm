include extension-install-user.mk
include extension-install-system.mk
include extension-install-develop.mk

ifneq ($(DESTDIR),)
EXTENSION_INSTALL_METHOD := system
else ifeq ($(shell id -u),0)
EXTENSION_INSTALL_METHOD := system
else
EXTENSION_INSTALL_METHOD := user
endif

install: $(EXTENSION_INSTALL_METHOD)-install
uninstall: $(EXTENSION_INSTALL_METHOD)-uninstall

.PHONY: install uninstall
