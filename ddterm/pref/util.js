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

const { Gtk } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const UI_DIR = Me.dir.get_child('ddterm').get_child('pref').get_child('ui');
const VERSIONED_UI_DIR = UI_DIR.get_child(`gtk${Gtk.get_major_version()}`);

function ui_file_uri(name) {
    return VERSIONED_UI_DIR.get_child(name).get_uri();
}

/* exported ui_file_uri */

const PERCENT_FORMAT = new Intl.NumberFormat(undefined, { style: 'percent' });

function percent_formatter(_, value) {
    return PERCENT_FORMAT.format(value);
}

/* exported percent_formatter */

function set_scale_value_formatter(scale, formatter) {
    if (scale.set_format_value_func)
        scale.set_format_value_func(formatter);
    else
        scale.connect('format-value', formatter);
}

/* exported set_scale_value_formatter */
