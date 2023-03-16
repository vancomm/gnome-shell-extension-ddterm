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

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { pspecs } = Me.imports.ddterm.settings.generated;

function setting(key) {
    return {
        inputs: [key],
        eval: inputs => inputs[key],
    };
}

function map(expr, fn) {
    return {
        inputs: expr.inputs,
        eval: inputs => fn(expr.eval(inputs)),
    };
}

function not(expr) {
    return map(expr, v => !v);
}

function and(a, b) {
    return {
        inputs: [...a.inputs, ...b.inputs],
        eval: inputs => a.eval(inputs) && b.eval(inputs),
    };
}

const ENABLE_CUSTOM_COLORS = not(setting('use-theme-colors'));
const ENABLE_CURSOR_COLORS = and(ENABLE_CUSTOM_COLORS, setting('cursor-colors-set'));
const ENABLE_HIGHLIGHT_COLORS = and(ENABLE_CUSTOM_COLORS, setting('highlight-colors-set'));
const ENABLE_URL_DETECT = setting('detect-urls');
const ENABLE_WINDOW_ANIMATION = setting('override-window-animation');

const ENABLE_SHORTCUTS = setting('shortcuts-enabled');
const SHORTCUTS_KEYS = Object.keys(pspecs.PSPECS).filter(key => key.startsWith('shortcut-'));
const SHORTCUTS_ENABLED_IF = Object.fromEntries(SHORTCUTS_KEYS.map(key => [key, ENABLE_SHORTCUTS]));

var ENABLED_IF = {
    'scrollback-lines': not(setting('scrollback-unlimited')),
    'custom-font': not(setting('use-system-font')),

    'background-opacity': setting('transparent-background'),

    'foreground-color': ENABLE_CUSTOM_COLORS,
    'background-color': ENABLE_CUSTOM_COLORS,

    'bold-color-same-as-fg': ENABLE_CUSTOM_COLORS,
    'bold-color': and(ENABLE_CUSTOM_COLORS, not(setting('bold-color-same-as-fg'))),

    'cursor-colors-set': ENABLE_CUSTOM_COLORS,
    'cursor-background-color': ENABLE_CURSOR_COLORS,
    'cursor-foreground-color': ENABLE_CURSOR_COLORS,

    'highlight-colors-set': ENABLE_CUSTOM_COLORS,
    'highlight-background-color': ENABLE_HIGHLIGHT_COLORS,
    'highlight-foreground-color': ENABLE_HIGHLIGHT_COLORS,

    'detect-urls-as-is': ENABLE_URL_DETECT,
    'detect-urls-file': ENABLE_URL_DETECT,
    'detect-urls-http': ENABLE_URL_DETECT,
    'detect-urls-voip': ENABLE_URL_DETECT,
    'detect-urls-email': ENABLE_URL_DETECT,
    'detect-urls-news-man': ENABLE_URL_DETECT,

    'custom-command': map(setting('command'), v => v === 'custom-command'),

    'show-animation': ENABLE_WINDOW_ANIMATION,
    'hide-animation': ENABLE_WINDOW_ANIMATION,
    'show-animation-duration': ENABLE_WINDOW_ANIMATION,
    'hide-animation-duration': ENABLE_WINDOW_ANIMATION,

    'window-monitor-connector': map(setting('window-monitor'), v => v === 'connector'),

    ...SHORTCUTS_ENABLED_IF,
};

/* exported ENABLED_IF */
