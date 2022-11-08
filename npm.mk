# Bundled libs

HANDLEBARS_DIST := node_modules/handlebars/dist/handlebars.js
RXJS_DIST := node_modules/rxjs/dist/bundles/rxjs.umd.js

handlebars.js rxjs.js:
	cp $< $@

handlebars.js: $(HANDLEBARS_DIST)
rxjs.js: $(RXJS_DIST)

clean/npm:
	$(RM) handlebars.js rxjs.js

clean: clean/npm
.PHONY: clean/npm

EXTENSION_PACK_CONTENT += handlebars.js rxjs.js

# ESLint

ESLINT_CMD := node_modules/.bin/eslint

lint/eslintrc-gjs.yml:
	curl -o $@ 'https://gitlab.gnome.org/GNOME/gjs/-/raw/8c50f934bc81f224c6d8f521116ddaa5583eef66/.eslintrc.yml'

lint: lint/eslintrc-gjs.yml $(ESLINT_CMD)
	$(ESLINT_CMD) .

.PHONY: lint
all: lint

# Autoinstall

NPM_AUTOINSTALL := yes

ifeq ($(call is-true,$(NPM_AUTOINSTALL)),1)

$(HANDLEBARS_DIST) $(RXJS_DIST) $(ESLINT_CMD): node_modules/.package-lock.json

node_modules/.package-lock.json: package.json package-lock.json
	npm install

endif
