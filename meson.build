project(
  'ddterm',
  version: '41',
  meson_version: '>= 0.60.0',
  license: 'GPL3+'
)

uuid = 'ddterm@amezin.github.com'
gettext_domain = uuid
extensiondir = get_option('datadir') / 'gnome-shell' / 'extensions' / uuid
pack = []
checks = []
potfiles = []

metadata = configuration_data()
metadata.set('version', meson.project_version())
metadata.set_quoted('uuid', uuid)
metadata.set_quoted('gettext_domain', gettext_domain)

pack = [
  configure_file(
    input: 'metadata.json.in',
    output: '@BASENAME@',
    configuration: metadata,
    install_dir: extensiondir
  )
]

default_target_kwargs = {
  'install': true,
  'install_dir': extensiondir,
  'build_by_default': true
}

copy_as_is_kwargs = default_target_kwargs + {
  'command': ['cp', '@INPUT@', '@OUTPUT@']
}

pack += custom_target(
  input: 'node_modules/handlebars/dist/handlebars.js',
  output: 'handlebars.js',
  kwargs: copy_as_is_kwargs
)

pack += custom_target(
  input: 'node_modules/rxjs/dist/bundles/rxjs.umd.js',
  output: 'rxjs.js',
  kwargs: copy_as_is_kwargs
)

js_sources = files(
  'application.js',
  'appwindow.js',
  'connectionset.js',
  'extension.js',
  'importcheck.js',
  'misc.js',
  'panelicon.js',
  'prefs.js',
  'prefsanimation.js',
  'prefsbehavior.js',
  'prefscolors.js',
  'prefscommand.js',
  'prefscompatibility.js',
  'prefsdialog.js',
  'prefspanelicon.js',
  'prefspositionsize.js',
  'prefsscrolling.js',
  'prefsshortcuts.js',
  'prefstabs.js',
  'prefstext.js',
  'prefsutil.js',
  'rxutil.js',
  'settings.js',
  'tcgetpgrp.js',
  'terminalpage.js',
  'timers.js',
  'translations.js',
  'urldetect_patterns.js',
  'wm.js',
)

potfiles += js_sources

gtk3_handcrafted_ui = files('menus.ui')

potfiles += gtk3_handcrafted_ui

aux_resources = files(
  'com.github.amezin.ddterm.Extension.xml',
  'style.css',
  'LICENSE',
)

fs = import('fs')

foreach file : js_sources + gtk3_handcrafted_ui + aux_resources
  pack += custom_target(
    input: file,
    output: fs.name(file),
    kwargs: copy_as_is_kwargs
  )
endforeach

pack += custom_target(
  input: files('com.github.amezin.ddterm'),
  output: 'com.github.amezin.ddterm',
  install_mode: 'rwxr-xr-x',
  kwargs: copy_as_is_kwargs
)

subdir('schemas')

gtk3_builder_tool = find_program('gtk-builder-tool')

with_gtk4 = get_option('gtk4')

gtk4_builder_tool = find_program(
  'gtk4-builder-tool',
  required: with_gtk4,
  disabler: true
)

xsltproc = find_program(
  'xsltproc',
  required: with_gtk4,
  disabler: true
)

subdir('glade')

gtk3_simplified_ui = []
gtk4_simplified_ui = []

foreach file : gtk34_glade_ui
  fixup = custom_target(
    command: [xsltproc, '-o', '@OUTPUT@', xslt_fixup, '@INPUT@'],
    input: file,
    output: fs.stem(file) + '-fixup.ui',
    depend_files: [xslt_fixup]
  )

  gtk4_target = custom_target(
    command: [gtk4_builder_tool, 'simplify', '--3to4', '@INPUT@'],
    capture: true,
    input: fixup,
    output: fs.stem(file) + '-gtk4.ui',
    kwargs: default_target_kwargs
  )

  if not is_disabler(gtk4_target)
    gtk4_simplified_ui += gtk4_target
  endif

  gtk3_simplified_ui += custom_target(
    command: [gtk3_builder_tool, 'simplify', '@INPUT@'],
    capture: true,
    input: file,
    output: fs.stem(file) + '-gtk3.ui',
    kwargs: default_target_kwargs
  )
endforeach

foreach file : gtk3_glade_ui
  gtk3_simplified_ui += custom_target(
    command: [gtk3_builder_tool, 'simplify', '@INPUT@'],
    capture: true,
    input: file,
    output: fs.name(file),
    kwargs: default_target_kwargs
  )
endforeach

pack += gtk3_simplified_ui
pack += gtk4_simplified_ui

subdir('locale')

zip = find_program('zip', required: false, disabler: true)

built_pack = custom_target(
  output: uuid + '.shell-extension.zip',
  input: pack,
  command: [zip, '-y', '-MM', '-nw', '-', '--', '@INPUT@'],
  capture: true  # to make sure the archive is created from scratch, not updated
)

alias_target('pack', built_pack)

run_target('install-user', command: ['gnome-extensions', 'install', '-f', built_pack])
run_target('uninstall-user', command: ['gnome-extensions', 'uninstall', uuid])

foreach action : ['prefs', 'enable', 'disable', 'reset', 'info', 'show']
  run_target(action, command: ['gnome-extensions', action, uuid])
endforeach

foreach action : ['toggle', 'quit', 'begin-subscription-leak-check', 'end-subscription-leak-check']
  run_target(action, command: ['gapplication', 'action', 'com.github.amezin.ddterm', action])
endforeach

gtk_validate_targets = []
gtk_validate_targets_skip = ['terminalpage.ui']

foreach target : gtk3_simplified_ui + gtk3_handcrafted_ui
  target_is_file = gtk3_handcrafted_ui.contains(target)
  name = target_is_file ? fs.name(target) : fs.name(target.full_path())

  validate = run_target(
    'gtk-builder-tool validate ' + name,
    command: [gtk3_builder_tool, 'validate', target],
    depends: target_is_file ? [] : [target]
  )

  if not gtk_validate_targets_skip.contains(name)
    gtk_validate_targets += [validate]
  endif
endforeach

foreach target : gtk4_simplified_ui
  gtk_validate_targets += [run_target(
    'gtk4-builder-tool validate ' + fs.name(target.full_path()),
    command: [gtk4_builder_tool, 'validate', target],
    depends: [target]
  )]
endforeach

checks += alias_target('gtk-builder-validate', gtk_validate_targets)

checks += run_target(
  'eslint',
  command: ['env', '-C', meson.current_source_dir(), 'node_modules/.bin/eslint']
)

alias_target('check', checks)
