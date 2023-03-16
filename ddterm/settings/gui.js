/*
    Copyright © 2023 Aleksandr Mezin

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

const { GLib, GObject, Gdk, Gtk } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { backport } = Me.imports.ddterm;
const { schema } = Me.imports.ddterm.settings;
const { settings } = Me.imports.ddterm.settings;

function parse_rgba(s) {
    if (s) {
        const v = new Gdk.RGBA();

        if (v.parse(s))
            return v;
    }

    throw Error(`Cannot parse ${JSON.stringify(s)} as color`);
}

function param_spec_rgba(name) {
    const flags = GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY;
    return GObject.ParamSpec.boxed(name, name, name, flags, Gdk.RGBA);
}

function param_specs_rgba(names) {
    return Object.fromEntries(names.map(k => [k, param_spec_rgba(k)]));
}

var PALETTE_PROPS = Array.from({ length: 16 }, (_, i) => `color${i}`);
var PALETTE_PSPECS = param_specs_rgba(PALETTE_PROPS);

var Palette = GObject.registerClass(
    {
        Properties: {
            'settings': GObject.ParamSpec.object(
                'settings',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                settings.Settings
            ),
            'strv': GObject.ParamSpec.boxed(
                'strv',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
                GLib.strv_get_type()
            ),
            ...PALETTE_PSPECS,
        },
    },
    class DDTermSettingsPalette extends GObject.Object {
        static _classInit(klass) {
            const specs = klass.hasOwnProperty(GObject.properties) ? klass[GObject.properties] : {};

            PALETTE_PROPS.forEach((name, index) => {
                if (klass.prototype.hasOwnProperty(name))
                    return;

                if (!(name in specs))
                    return;

                const descriptor = {
                    enumerable: true,
                    configurable: true,
                    get() {
                        return parse_rgba(this.strv[index]);
                    },
                    set(value) {
                        this.edit(index, value);
                    },
                };

                Object.defineProperty(klass.prototype, name, descriptor);
            });

            backport.GObject.checkProperties(klass);
            return GObject.Object._classInit(klass);
        }

        _init(params) {
            super._init(params);

            this._cached = this.strv;
        }

        get strv() {
            return this.settings.get_strv('palette');
        }

        set strv(value) {
            this.settings.set_strv('palette', value);
        }

        get colors() {
            return this.strv.map(parse_rgba);
        }

        set colors(value) {
            this.strv = value.map(v => v.to_string());
        }

        edit(index, value) {
            if (value instanceof Gdk.RGBA)
                value = value.to_string();

            const strv = this.strv;
            strv[index] = value;
            this.strv = strv;
        }

        notify_changes() {
            const value = this.strv;
            const cached = this._cached;

            this.freeze_notify();

            try {
                PALETTE_PROPS.forEach((name, index) => {
                    if (cached[index] !== value[index]) {
                        this.notify(name);
                        this.notify('strv');
                    }
                });
            } finally {
                this._cached = value;
                this.thaw_notify();
            }
        }
    }
);

const COLOR_PSPECS = param_specs_rgba([
    'background-color',
    'bold-color',
    'cursor-background-color',
    'cursor-foreground-color',
    'foreground-color',
    'highlight-background-color',
    'highlight-foreground-color',
]);

var Settings = GObject.registerClass(
    {
        Properties: {
            'palette': GObject.ParamSpec.object(
                'palette',
                '',
                '',
                GObject.ParamFlags.READABLE,
                Palette
            ),
            ...COLOR_PSPECS,
        },
    },
    class DDTermSettingsGui extends settings.Settings {
        static settings_descriptor(name, pspec) {
            switch (pspec.value_type) {
            case Gdk.RGBA.$gtype:
                return {
                    enumerable: true,
                    configurable: true,
                    get() {
                        return parse_rgba(this.get_string(name));
                    },
                    set(value) {
                        this.set_string(name, value.to_string());
                    },
                };

            default:
                return super.settings_descriptor(name, pspec);
            }
        }

        _init(params) {
            super._init(params);

            this._palette = new Palette({ settings: this });
        }

        get palette() {
            return this._palette;
        }

        on_changed(key) {
            if (key === 'palette')
                this.palette.notify_changes();

            super.on_changed(key);
        }

        bind_widget(setting, widget) {
            this.meta[setting].bind_editable(widget);

            const flags = GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL;

            if (widget instanceof Gtk.ComboBox)
                this.bind_property(setting, widget, 'active-id', flags);

            else if (widget instanceof Gtk.Range)
                this.bind_property(setting, widget.adjustment, 'value', flags);

            else if (widget instanceof Gtk.SpinButton)
                this.bind_property(setting, widget.adjustment, 'value', flags);

            else if (widget instanceof Gtk.Entry)
                this.bind_property(setting, widget, 'text', flags);

            else if (widget instanceof Gtk.TextView)
                this.bind_property(setting, widget.buffer, 'text', flags);

            else if (widget instanceof Gtk.CheckButton)
                this.bind_property(setting, widget, 'active', flags);

            else if (widget instanceof Gtk.ColorChooser)
                this.bind_property(setting, widget, 'rgba', flags);

            else if (widget instanceof Gtk.FontChooser)
                this.bind_property(setting, widget, 'font', flags);

            else
                throw new Error(`Widget ${widget} of unsupported type for setting ${setting}`);
        }

        bind_widgets(mapping) {
            Object.entries(mapping).forEach(
                args => this.bind_widget(...args)
            );
        }
    }
);

function get() {
    return new Settings({
        'settings-schema': schema.getSchema(),
    });
}

/* exported Settings get PALETTE_PROPS PALETTE_PSPECS */
