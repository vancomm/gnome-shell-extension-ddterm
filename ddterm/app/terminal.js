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

const { GLib, GObject, Vte } = imports.gi;

const { tcgetpgrp } = imports.ddterm.app;

var Terminal = GObject.registerClass(
    class DDTermTerminal extends Vte.Terminal {
        _init(params) {
            super._init(params);

            this._child_pid = null;

            this.connect('child-exited', () => {
                this._child_pid = null;
            });
        }

        get_cwd() {
            const uri = this.current_directory_uri;
            if (uri)
                return GLib.filename_from_uri(uri)[0];

            if (!this._child_pid)
                return null;

            try {
                return GLib.file_read_link(`/proc/${this._child_pid}/cwd`);
            } catch {
                return null;
            }
        }

        has_foreground_process() {
            if (!this._child_pid || !this.pty)
                return false;

            try {
                return tcgetpgrp.tcgetpgrp(this.pty.get_fd()) !== this._child_pid;
            } catch (ex) {
                if (!(ex instanceof tcgetpgrp.InterpreterNotFoundError))
                    logError(ex, "Can't check foreground process group");

                return false;
            }
        }

        spawn(argv, spawn_flags, cwd) {
            this.spawn_async(
                Vte.PtyFlags.DEFAULT,
                cwd,
                argv,
                null,
                spawn_flags,
                null,
                -1,
                null,
                (terminal, pid, error) => {
                    if (error)
                        terminal.feed(error.message);

                    if (pid)
                        this._child_pid = pid;
                }
            );
        }
    }
);

/* exported Terminal */
