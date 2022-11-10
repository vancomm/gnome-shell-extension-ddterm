gio = dependency('gio-2.0', required: false)

if gio.found()
  schemasdir = gio.get_variable('schemasdir')
  glib_compile_schemas = find_program(gio.get_variable('glib_compile_schemas'))
else
  schemasdir = get_option('datadir') / 'glib-2.0' / 'schemas'
  glib_compile_schemas = find_program('glib-compile-schemas')
endif

schemas_sources = files('com.github.amezin.ddterm.gschema.xml')
schemas_copied = []

foreach file : schemas_sources
  schemas_copied += custom_target(
    command: ['cp', '@INPUT@', '@OUTPUT@'],
    input: file,
    output: fs.name(file),
    install: true,
    install_dir: schemasdir,
    build_by_default: true
  )
endforeach

pack += schemas_copied

# 'gnome-extensions pack' compiles schemas with '--strict'
schemas_compiled = custom_target(
  command: [glib_compile_schemas, '--strict', '@OUTDIR@'],
  input: schemas_copied,
  output: 'gschemas.compiled',
  build_by_default: true
)

alias_target('schemas', schemas_compiled)
alias_target('gsettings-compile-schemas', schemas_compiled)

pack += schemas_compiled

meson.add_install_script(
  glib_compile_schemas, schemasdir,
  skip_if_destdir: true
)

checks += run_target(
  'schemas-check',
  command: [glib_compile_schemas, '--strict', '--dry-run', meson.current_source_dir()]
)
