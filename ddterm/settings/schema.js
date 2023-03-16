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

const { Gio } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const SCHEMA_NAME = 'com.github.amezin.ddterm';

function getSchemaSource() {
    const schemaDir = Me.dir.get_child('schemas');
    const defaultSource = Gio.SettingsSchemaSource.get_default();

    if (!schemaDir.query_exists(null))
        return defaultSource;

    return Gio.SettingsSchemaSource.new_from_directory(
        schemaDir.get_path(),
        defaultSource,
        false
    );
}

function getSchema() {
    const schema = getSchemaSource().lookup(SCHEMA_NAME, true);

    if (!schema)
        throw new Error(`Schema ${SCHEMA_NAME} could not be found. Please check your installation`);

    return schema;
}

/* exported getSchemaSource getSchema */
