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

const { GLib } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { prettyPrint } = Me.imports.ddterm.util.prettyprint;

const DOMAIN = Me.metadata.name;
const SYSLOG_IDENTIFIER = 'com.github.amezin.ddterm';

let _cached_strings = null;
let _cached_const_entries = null;
let _cached_entry_type = null;

function clean_cache() {
    _cached_strings = null;
    _cached_const_entries = null;
    _cached_entry_type = null;
}

function _cached_string(value) {
    if (!_cached_strings)
        _cached_strings = {};

    let val = _cached_strings[value];

    if (!val) {
        val = GLib.Variant.new_string(value);
        _cached_strings[value] = val;
    }

    return val;
}

function _entry(name, value) {
    return GLib.Variant.new_dict_entry(
        _cached_string(name),
        GLib.Variant.new_variant(value)
    );
}

function _cached_const_entry(name, value) {
    if (!_cached_const_entries)
        _cached_const_entries = {};

    let val = _cached_const_entries[name];

    if (!val) {
        val = _entry(name, _cached_string(value));
        _cached_const_entries[name] = val;
    }

    return val;
}

function _string_entry(name, value) {
    return _entry(name, GLib.Variant.new_string(value));
}

function _entry_type() {
    if (!_cached_entry_type)
        _cached_entry_type = new GLib.VariantType('{sv}');

    return _cached_entry_type;
}

function _format_error(arg) {
    if (!arg.stack)
        return prettyPrint(arg);

    return [
        prettyPrint(arg),
        ...arg.stack.split('\n').map(line => line.padStart(2, ' ')),
    ].join('\n');
}

function _format_arg(arg) {
    if (typeof arg === 'string')
        return arg;

    if (arg instanceof Error)
        return _format_error(arg);

    return prettyPrint(arg);
}

function _log(level, args) {
    const entries = [
        _string_entry('MESSAGE', args.map(_format_arg).join(' ')),
        _cached_const_entry('SYSLOG_IDENTIFIER', SYSLOG_IDENTIFIER),
        _cached_const_entry('GNOME_SHELL_EXTENSION_UUID', Me.uuid),
        _cached_const_entry('GNOME_SHELL_EXTENSION_NAME', Me.metadata.name),
    ];

    const caller = new Error().stack.split('\n')[2];
    const match = caller.match(/^([^@]*)@(.*):(\d+):\d+$/);

    if (match) {
        const [_, func, file, line] = match;

        entries.push(
            _string_entry('CODE_FILE', file),
            _string_entry('CODE_FUNC', func),
            _string_entry('CODE_LINE', line)
        );
    }

    GLib.log_variant(DOMAIN, level, GLib.Variant.new_array(_entry_type(), entries));
}

// eslint-disable-next-line no-redeclare
function log(level, ...args) {
    _log(level, args);
}

function info(...args) {
    _log(GLib.LogLevelFlags.LEVEL_INFO, args);
}

function message(...args) {
    _log(GLib.LogLevelFlags.LEVEL_MESSAGE, args);
}

function debug(...args) {
    _log(GLib.LogLevelFlags.LEVEL_DEBUG, args);
}

function warning(...args) {
    _log(GLib.LogLevelFlags.LEVEL_WARNING, args);
}

function critical(...args) {
    _log(GLib.LogLevelFlags.CRITICAL, args);
}

function log_error(ex, ...args) {
    if (args)
        _log(GLib.LogLevelFlags.LEVEL_WARNING, [...args, ':', _format_error(ex)]);
    else
        _log(GLib.LogLevelFlags.LEVEL_WARNING, [_format_error(ex)]);
}

function domain() {
    return DOMAIN;
}

/* exported log info message debug warning critical log_error clean_cache domain */
