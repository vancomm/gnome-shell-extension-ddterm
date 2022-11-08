# https://www.gnu.org/software/make/manual/html_node/Command-Variables.html
INSTALL := install
INSTALL_PROGRAM := $(INSTALL)
INSTALL_DATA := $(INSTALL) -m 644

# https://www.gnu.org/software/make/manual/html_node/Directory-Variables.html
prefix := /usr
datarootdir := $(prefix)/share
datadir := $(datarootdir)

extensiondir := $(datadir)/gnome-shell/extensions

# https://www.gnu.org/software/make/manual/html_node/DESTDIR.html
EXTENSION_SYS_INSTALLED_DIR := \
    $(DESTDIR)$(extensiondir)/$(EXTENSION_UUID)

EXTENSION_SYS_INSTALLED_CONTENT := \
    $(addprefix $(EXTENSION_SYS_INSTALLED_DIR)/,$(EXTENSION_PACK_CONTENT))

EXTENSION_SYS_INSTALLED_DIRS := $(sort $(dir $(EXTENSION_SYS_INSTALLED_CONTENT)))

EXTENSION_SYS_INSTALLED_EXECUTABLES := \
    $(addprefix $(EXTENSION_SYS_INSTALLED_DIR)/,$(EXTENSION_EXECUTABLES))

$(EXTENSION_SYS_INSTALLED_DIRS):
	mkdir -p $@

installdirs: $(EXTENSION_SYS_INSTALLED_DIRS)

$(EXTENSION_SYS_INSTALLED_CONTENT): $(EXTENSION_SYS_INSTALLED_DIR)/%: % | installdirs
	$(INSTALL) $< $@

$(EXTENSION_SYS_INSTALLED_CONTENT): INSTALL := $(INSTALL_DATA)
$(EXTENSION_SYS_INSTALLED_EXECUTABLES): INSTALL := $(INSTALL_PROGRAM)

system-install: $(EXTENSION_SYS_INSTALLED_CONTENT)
system-uninstall:
	$(RM) -r $(EXTENSION_SYS_INSTALLED_DIR)

.PHONY: system-install system-uninstall installdirs
