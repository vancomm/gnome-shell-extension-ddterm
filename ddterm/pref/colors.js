/*
    Copyright © 2022 Aleksandr Mezin

    This file is part of ddterm GNOME Shell extension.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

const { GLib, GObject, Gio, Gtk } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { backport } = Me.imports.ddterm;
const { util } = Me.imports.ddterm.pref;
const { translations, simpleaction } = Me.imports.ddterm.util;
const { parse_rgba, PALETTE_PROPS } = Me.imports.ddterm.settings.gui;

function show_dialog(parent_window, message, message_type = Gtk.MessageType.ERROR) {
    const dialog = new Gtk.MessageDialog({
        transient_for: parent_window,
        modal: true,
        buttons: Gtk.ButtonsType.CLOSE,
        message_type,
        text: message,
    });
    dialog.connect('response', () => dialog.destroy());
    dialog.show();
}

// Looks up a `Gio.SettingsSchema` with the identifier `schema_id`.
// Throw error if the schema does not exist.
function get_settings_schema(schema_id) {
    const schema_source = Gio.SettingsSchemaSource.get_default();
    const schema = schema_source.lookup(schema_id, true);
    if (schema === null)
        throw new Error(`Settings schema '${schema_id}' not found.`);
    return schema;
}

// Get key named `name` from `schema`.
// Throw error if the key does not exist.
function get_settings_schema_key(schema, name) {
    if (!schema.has_key(name))
        throw new Error(`Key '${name}' does not exist in settings schema '${schema.get_id()}'.`);

    return schema.get_key(name);
}

// eslint-disable-next-line no-shadow
function copy_gnome_terminal_profile(settings) {
    // Lookup gnome terminal's setting schemas
    let profile_list_schema, profile_schema;
    try {
        profile_list_schema = get_settings_schema('org.gnome.Terminal.ProfilesList');
        profile_schema = get_settings_schema('org.gnome.Terminal.Legacy.Profile');
    } catch (e) {
        throw new Error(`${e.message} Probably, GNOME Terminal is not installed.`);
    }

    // Find default gnome terminal profile
    let profiles_list = Gio.Settings.new_full(profile_list_schema, null, null);
    let profilePath = profiles_list.settings_schema.get_path();
    let uuid = profiles_list.get_string('default');
    let gnome_terminal_profile = Gio.Settings.new_full(
        profile_schema,
        null,
        `${profilePath}:${uuid}/`
    );

    // Copy color profile
    try {
        const profile_keys = [
            'use-theme-colors',
            'foreground-color',
            'background-color',
            'bold-color-same-as-fg',
            'bold-color',
            'cursor-colors-set',
            'cursor-foreground-color',
            'cursor-background-color',
            'highlight-colors-set',
            'highlight-foreground-color',
            'highlight-background-color',
            'palette',
            'bold-is-bright',
        ];

        // Check if key is valid
        for (const key of profile_keys) {
            const type_gnome_terminal =
                get_settings_schema_key(profile_schema, key).get_value_type();

            const type_ddterm = settings.settings_schema.get_key(key).get_value_type();

            if (!type_gnome_terminal.equal(type_ddterm)) {
                throw new Error(
                    `The type of key '${key}' in GNOME Terminal is` +
                    ` '${type_gnome_terminal.dup_string()}',` +
                    ` but '${type_ddterm.dup_string()}' is expected.`
                );
            }
        }

        profile_keys.forEach(key => {
            settings.set_value(key, gnome_terminal_profile.get_value(key));
        });
    } catch (e) {
        throw new Error(`Failed to copy color profile from GNOME Terminal. ${e.message}`);
    }
}

const PresetLoader = backport.GObject.registerClass(
    {
        GTypeName: 'DDTermPrefsColorPresetLoader',
        Properties: {
            'preset': GObject.ParamSpec.string(
                'preset',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
                null
            ),
            'settings': GObject.ParamSpec.object(
                'settings',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                GObject.Object
            ),
            'properties': GObject.ParamSpec.boxed(
                'properties',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                GLib.strv_get_type()
            ),
            'model': GObject.ParamSpec.object(
                'model',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Gtk.TreeModel
            ),
        },
    },
    class PresetLoader extends GObject.Object {
        _init(params) {
            super._init(params);

            this._notify_handlers = this.properties.map(
                name => this.settings.connect(`notify::${name}`, this.update_preset.bind(this))
            );

            this._model_handlers = ['row-changed', 'row-deleted', 'row-inserted'].map(
                signal => this.model.connect(signal, this.update_preset.bind(this))
            );

            this._preset = null;
            this.update_preset();
        }

        get preset() {
            return this._preset;
        }

        set preset(value) {
            if (value === this.preset)
                return;

            this.load_preset(value);
        }

        destroy() {
            for (const handler_id of this._notify_handlers)
                this.settings.disconnect(handler_id);

            for (const handler_id of this._model_handlers)
                this.model.disconnect(handler_id);

            this._notify_handlers = [];
            this._model_handlers = [];
        }

        find_preset() {
            const colors = this.properties.map(name => this.settings[name]);
            let found = null;

            this.model.foreach((model, path, iter) => {
                const row = Array.from(
                    { length: model.get_n_columns() },
                    (_, index) => model.get_value(iter, index)
                );

                const name = row[0];
                const values = row.slice(1);

                if (!colors.every(
                    (color, index) => !values[index] || color.equal(parse_rgba(values[index]))
                ))
                    return false;

                found = name;
                return true;
            });

            return found;
        }

        update_preset() {
            const new_preset = this.find_preset();

            if (new_preset === this._preset)
                return;

            this._preset = new_preset;
            this.notify('preset');
        }

        load_preset(name) {
            let row;

            this.model.foreach((model, path, iter) => {
                if (model.get_value(iter, 0) !== name)
                    return false;

                row = Array.from(
                    { length: model.get_n_columns() },
                    (_, index) => model.get_value(iter, index)
                );

                return true;
            });

            const preset = row.slice(1).map(v => v ? parse_rgba(v) : null);

            this.freeze_notify();
            try {
                this.properties.forEach((property, index) => {
                    if (preset[index])
                        this.settings[property] = preset[index];
                });
            } finally {
                this.thaw_notify();
            }
        }
    }
);

const PALETTE_WIDGET_IDS = Array.from(PALETTE_PROPS, (_, i) => `palette${i}`);

var Widget = backport.GObject.registerClass(
    {
        GTypeName: 'DDTermPrefsColors',
        Template: util.ui_file_uri('prefs-colors.ui'),
        Children: [
            'foreground_color',
            'background_color',
            'opacity_scale',
            'bold_color',
            'cursor_foreground_color',
            'cursor_background_color',
            'highlight_foreground_color',
            'highlight_background_color',
            'color_scheme_combo',
            'palette_combo',
            'theme_variant_combo',
        ].concat(PALETTE_WIDGET_IDS),
        Properties: {
            'settings': GObject.ParamSpec.object(
                'settings',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Me.imports.ddterm.settings.gui.Settings
            ),
        },
    },
    class PrefsColors extends Gtk.Grid {
        _init(params) {
            super._init(params);

            this.settings.bind_widgets({
                'theme-variant': this.theme_variant_combo,
                'foreground-color': this.foreground_color,
                'background-color': this.background_color,
                'background-opacity': this.opacity_scale,
                'bold-color': this.bold_color,
                'cursor-foreground-color': this.cursor_foreground_color,
                'cursor-background-color': this.cursor_background_color,
                'highlight-foreground-color': this.highlight_foreground_color,
                'highlight-background-color': this.highlight_background_color,
            });

            this.insert_action_group(
                'settings',
                this.settings.create_action_group([
                    'cursor-colors-set',
                    'highlight-colors-set',
                    'bold-is-bright',
                    'use-theme-colors',
                    'transparent-background',
                ])
            );

            this.insert_action_group(
                'inverse-settings',
                this.settings.create_action_group(
                    ['bold-color-same-as-fg'],
                    { 'invert-boolean': true }
                )
            );

            util.set_scale_value_formatter(this.opacity_scale, util.percent_formatter);

            this.color_scheme_loader = new PresetLoader({
                model: this.color_scheme_combo.model,
                settings: this.settings,
                properties: [
                    'foreground-color',
                    'background-color',
                ],
            });
            this.connect('destroy', () => this.color_scheme_loader.destroy());

            this.color_scheme_loader.bind_property(
                'preset',
                this.color_scheme_combo,
                'active-id',
                GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL
            );

            this.palette_loader = new PresetLoader({
                model: this.palette_combo.model,
                settings: this.settings.palette,
                properties: PALETTE_PROPS,
            });
            this.connect('destroy', () => this.palette_loader.destroy());

            this.palette_loader.bind_property(
                'preset',
                this.palette_combo,
                'active-id',
                GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL
            );

            const foreground_meta = this.settings.meta['foreground-color'];
            const foreground_editable_handler = foreground_meta.connect(
                'notify::editable', this.enable_color_scheme_combo.bind(this)
            );
            this.connect('destroy', () => foreground_meta.disconnect(foreground_editable_handler));

            const background_meta = this.settings.meta['background-color'];
            const background_editable_handler = background_meta.connect(
                'notify::editable', this.enable_color_scheme_combo.bind(this)
            );
            this.connect('destroy', () => background_meta.disconnect(background_editable_handler));

            this.enable_color_scheme_combo();

            this.settings.meta['palette'].bind_editable(this.palette_combo);

            PALETTE_WIDGET_IDS.map(key => this[key]).forEach((widget, index) => {
                this.settings.meta['palette'].bind_editable(widget);

                this.settings.palette.bind_property(
                    PALETTE_PROPS[index],
                    widget,
                    'rgba',
                    GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL
                );
            });

            this.insert_action_group(
                'aux',
                simpleaction.group({
                    'copy-gnome-terminal-profile': () => {
                        try {
                            copy_gnome_terminal_profile(this.settings);
                        } catch (e) {
                            show_dialog(this.get_toplevel(), e.message);
                        }
                    },
                })
            );
        }

        get title() {
            return translations.gettext('Colors');
        }

        enable_color_scheme_combo() {
            this.color_scheme_combo.sensitive =
                this.settings.meta['foreground-color'].editable &&
                this.settings.meta['background-color'].editable;
        }
    }
);

/* exported Widget */
