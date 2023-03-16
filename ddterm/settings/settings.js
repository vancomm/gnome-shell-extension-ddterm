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

const { GLib, GObject, Gio } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { backport } = Me.imports.ddterm;
const { pspecs } = Me.imports.ddterm.settings.generated;
const { schema } = Me.imports.ddterm.settings;
const { ENABLED_IF } = Me.imports.ddterm.settings.enabled;

const TYPE_STRV = GLib.strv_get_type();

function settings_getter(name, pspec) {
    switch (pspec.value_type) {
    case GObject.TYPE_BOOLEAN:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_boolean(name);
        };

    case GObject.TYPE_INT:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_int(name);
        };

    case GObject.TYPE_UINT:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_uint(name);
        };

    case GObject.TYPE_INT64:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_int64(name);
        };

    case GObject.TYPE_UINT64:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_uint64(name);
        };

    case GObject.TYPE_DOUBLE:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_double(name);
        };

    case GObject.TYPE_STRING:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_string(name);
        };

    case TYPE_STRV:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_strv(name);
        };

    case GObject.TYPE_VARIANT:
        return function () {
            // eslint-disable-next-line no-invalid-this
            return this.get_value(name).get_variant();
        };

    default:
        throw Error(`Unhandled type: ${pspec.value_type}`);
    }
}

function settings_setter(name, pspec) {
    switch (pspec.value_type) {
    case GObject.TYPE_BOOLEAN:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_boolean(name, value);
        };

    case GObject.TYPE_INT:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_int(name, value);
        };

    case GObject.TYPE_UINT:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_uint(name, value);
        };

    case GObject.TYPE_INT64:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_int64(name, value);
        };

    case GObject.TYPE_UINT64:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_uint64(name, value);
        };

    case GObject.TYPE_DOUBLE:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_double(name, value);
        };

    case GObject.TYPE_STRING:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_string(name, value);
        };

    case TYPE_STRV:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_strv(name, value);
        };

    case GObject.TYPE_VARIANT:
        return function (value) {
            // eslint-disable-next-line no-invalid-this
            this.set_value(name, GLib.Variant.new_variant(value));
        };

    default:
        throw Error(`Unhandled type: ${pspec.value_type}`);
    }
}

var Settings = GObject.registerClass(
    {
        Properties: pspecs.PSPECS,
    },
    class DDTermSettingsBase extends Gio.Settings {
        static settings_descriptor(name, pspec) {
            return {
                enumerable: true,
                configurable: true,
                get: settings_getter(name, pspec),
                set: settings_setter(name, pspec),
            };
        }

        static _classInit(klass) {
            const specs = klass.hasOwnProperty(GObject.properties) ? klass[GObject.properties] : {};

            for (const [name, pspec] of Object.entries(specs)) {
                if (klass.prototype.hasOwnProperty(name))
                    continue;

                Object.defineProperty(
                    klass.prototype,
                    name,
                    klass.settings_descriptor(name, pspec)
                );
            }

            backport.GObject.checkProperties(klass);
            return GObject.Object._classInit(klass);
        }

        _init(params) {
            super._init(params);

            this.meta = {};
            this._enabled_by_setting = {};

            for (const key of Object.keys(pspecs.PSPECS)) {
                const meta = new Meta({ settings: this, key });
                this.meta[key] = meta;

                const enabled_expr = ENABLED_IF[key];
                meta.enabled_expr = enabled_expr;

                if (!enabled_expr)
                    continue;

                for (const setting of enabled_expr.inputs) {
                    const by_setting = this._enabled_by_setting[setting] || [];
                    by_setting.push(meta);
                    this._enabled_by_setting[setting] = by_setting;
                }
            }
        }

        create_action(key, params = {}) {
            return new Action({
                settings: this,
                key,
                name: key,
                ...params,
            });
        }

        create_action_group(keys, ...args) {
            const group = Gio.SimpleActionGroup.new();

            for (const key of keys)
                group.add_action(this.create_action(key, ...args));

            return group;
        }

        on_changed(key) {
            this.notify(key);

            for (const meta of this._enabled_by_setting[key] || []) {
                meta.notify('enabled');
                meta.notify('editable');
            }
        }

        on_writable_changed(key) {
            const meta = this.meta[key];
            meta.notify('writable');
            meta.notify('editable');
        }
    }
);

const Meta = backport.GObject.registerClass(
    {
        Properties: {
            'settings': GObject.ParamSpec.object(
                'settings',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Settings
            ),
            'key': GObject.ParamSpec.string(
                'key',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                null
            ),
            'writable': GObject.ParamSpec.boolean(
                'writable',
                '',
                '',
                GObject.ParamFlags.READABLE,
                true
            ),
            'editable': GObject.ParamSpec.boolean(
                'editable',
                '',
                '',
                GObject.ParamFlags.READABLE,
                true
            ),
            'enabled': GObject.ParamSpec.boolean(
                'enabled',
                '',
                '',
                GObject.ParamFlags.READABLE,
                true
            ),
        },
    },
    class DDTermSettingsMeta extends GObject.Object {
        get writable() {
            return this.settings.is_writable(this.key);
        }

        get editable() {
            return this.writable && this.enabled;
        }

        get enabled() {
            if (!this.enabled_expr)
                return true;

            return this.enabled_expr.eval(
                Object.fromEntries(
                    this.enabled_expr.inputs.map(key => [key, this.settings[key]])
                )
            );
        }

        bind_editable(widget, property = 'sensitive', flags = GObject.BindingFlags.SYNC_CREATE) {
            return this.bind_property('editable', widget, property, flags);
        }
    }
);

var Action = backport.GObject.registerClass(
    {
        Implements: [Gio.Action],
        Properties: {
            'settings': GObject.ParamSpec.object(
                'settings',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Settings
            ),
            'key': GObject.ParamSpec.string(
                'key',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                null
            ),
            'enabled': GObject.ParamSpec.boolean(
                'enabled',
                '',
                '',
                GObject.ParamFlags.READWRITE,
                true
            ),
        },
    },
    class DDTermSettingsAction extends Gio.PropertyAction {
        _init(params) {
            const { settings, key } = params;
            const meta = settings.meta[key];

            super._init({
                object: settings,
                'property-name': key,
                enabled: meta.editable,
                ...params,
            });

            meta.bind_editable(this, 'enabled', GObject.BindingFlags.DEFAULT);
        }

        vfunc_get_enabled() {
            return this.enabled;
        }
    }
);

function get() {
    return new Settings({
        'settings-schema': schema.getSchema(),
    });
}

/* exported Settings Action get */
