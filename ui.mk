# run 'make WITH_GTK4=no' to disable Gtk 4/GNOME 40 support
# (could be necessary on older distros without gtk4-builder-tool)

WITH_GTK4 := yes

GTK3_HANDCRAFTED_UI := menus.ui
EXTENSION_PACK_CONTENT += $(GTK3_HANDCRAFTED_UI)
TRANSLATABLE_SOURCES += $(GTK3_HANDCRAFTED_UI)

GLADE_UI := $(wildcard glade/*.ui)
UI_SRC_PATTERN := glade/%.ui
TRANSLATABLE_SOURCES += $(GLADE_UI)

GTK_MULTI_VERSION_UI := $(wildcard glade/prefs-*.ui)

# Gtk 3 .ui

GTK3_ONLY_UI_SRC := $(filter-out $(GTK_MULTI_VERSION_UI),$(GLADE_UI))
GTK3_ONLY_UI_DST_PATTERN := %.ui
GTK3_ONLY_UI_DST := $(patsubst $(UI_SRC_PATTERN),$(GTK3_ONLY_UI_DST_PATTERN),$(GTK3_ONLY_UI_SRC))

$(GTK3_ONLY_UI_DST): $(GTK3_ONLY_UI_DST_PATTERN): $(UI_SRC_PATTERN)
	gtk-builder-tool simplify $< >$@

GTK3_MULTI_VERSION_UI_PATTERN := %-gtk3.ui
GTK3_MULTI_VERSION_UI := $(patsubst $(UI_SRC_PATTERN),$(GTK3_MULTI_VERSION_UI_PATTERN),$(GTK_MULTI_VERSION_UI))

$(GTK3_MULTI_VERSION_UI): $(GTK3_MULTI_VERSION_UI_PATTERN): $(UI_SRC_PATTERN)
	gtk-builder-tool simplify $< >$@

GTK3_UI := $(GTK3_ONLY_UI_DST) $(GTK3_MULTI_VERSION_UI)

clean/gtk3:
	$(RM) $(GTK3_UI)

clean: clean/gtk3
.PHONY: clean/gtk3

EXTENSION_PACK_CONTENT += $(GTK3_UI)

# Gtk 4 .ui

GTK_3TO4_FIXUP_UI_PATTERN := tmp/%-3to4-fixup.ui
GTK_3TO4_FIXUP_UI := $(patsubst $(UI_SRC_PATTERN),$(GTK_3TO4_FIXUP_UI_PATTERN),$(GTK_MULTI_VERSION_UI))

$(GTK_3TO4_FIXUP_UI): $(GTK_3TO4_FIXUP_UI_PATTERN): $(UI_SRC_PATTERN) glade/3to4-fixup.xsl | tmp
	xsltproc glade/3to4-fixup.xsl $< >$@

GTK_3TO4_UI_PATTERN := tmp/%-3to4.ui
GTK_3TO4_UI := $(patsubst $(GTK_3TO4_FIXUP_UI_PATTERN),$(GTK_3TO4_UI_PATTERN),$(GTK_3TO4_FIXUP_UI))

$(GTK_3TO4_UI): $(GTK_3TO4_UI_PATTERN): $(GTK_3TO4_FIXUP_UI_PATTERN) | tmp
	gtk4-builder-tool simplify --3to4 $< >$@

GTK4_UI_PATTERN := %-gtk4.ui
GTK4_UI := $(patsubst $(GTK_3TO4_UI_PATTERN),$(GTK4_UI_PATTERN),$(GTK_3TO4_UI))

$(GTK4_UI): $(GTK4_UI_PATTERN): $(GTK_3TO4_UI_PATTERN)
	gtk4-builder-tool simplify $< >$@

clean/gtk4:
	$(RM) $(GTK_3TO4_UI) $(GTK_3TO4_FIXUP_UI) $(GTK4_UI)

clean: clean/gtk4
.PHONY: clean/gtk4

EXTENSION_PACK_CONTENT += $(if $(call is-true,$(WITH_GTK4)), $(GTK4_UI))

# .ui validation

GTK3_VALIDATE_UI := $(addprefix gtk-builder-validate/,$(filter-out terminalpage.ui,$(GTK3_UI)) $(GTK3_HANDCRAFTED_UI))

$(GTK3_VALIDATE_UI): gtk-builder-validate/%: %
	gtk-builder-tool validate $<

.PHONY: $(GTK3_VALIDATE_UI)

GTK4_VALIDATE_UI := $(addprefix gtk-builder-validate/,$(GTK4_UI))

$(GTK4_VALIDATE_UI): gtk-builder-validate/%: %
	gtk4-builder-tool validate $<

.PHONY: $(GTK4_VALIDATE_UI)

gtk-builder-validate: $(GTK3_VALIDATE_UI) $(if $(call is-true,$(WITH_GTK4)),$(GTK4_VALIDATE_UI))

all: gtk-builder-validate
.PHONY: gtk-builder-validate
