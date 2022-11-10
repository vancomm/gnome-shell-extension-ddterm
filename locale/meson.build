i18n = import('i18n')
languages = []

foreach line : fs.read('LINGUAS').split('\n')
  line = line.strip()
  if not line.startswith('#')
    foreach lang : line.split()
      if lang != ''
        languages += lang
      endif
    endforeach
  endif
endforeach

xgettext_args = [
  '--from-code', 'UTF-8',
  '--default-domain', gettext_domain,
]

gettext_targets = i18n.gettext(
  gettext_domain,
  languages: languages,
  args: xgettext_args,
  install_dir: extensiondir / 'locale'
)

locales_compiled = gettext_targets[0]
alias_target('locales', locales_compiled)
pack += locales_compiled

potfiles_file = files('POTFILES')
potfiles_root = meson.project_source_root()

potfiles_tool = [
  'potfiles.py',
  '--potfiles-file', potfiles_file,
  '--source-root', potfiles_root
]

alias_target('potfiles', run_target(
  'POTFILES',
  command: [potfiles_tool, '--', potfiles]
))

potfiles_check = run_target(
  'POTFILES-check',
  command: [potfiles_tool, '--check', '--', potfiles]
)

alias_target('potfiles-check', potfiles_check)

xgettext = find_program('xgettext')

potfiles_deps = []

foreach line : fs.read(potfiles_file).split('\n')
  line = line.strip()
  if not line.startswith('#')
    potfiles_deps += potfiles_root / line
  endif
endforeach

pot = custom_target(
  output: gettext_domain + '.pot',
  input: potfiles_file,
  depend_files: potfiles_deps,
  command: [
    xgettext,
    '--package-name', meson.project_name(),
    '-f', '@INPUT@',
    '-D', meson.project_source_root(),
    '--output', '@OUTPUT@',
    xgettext_args
  ]
)

alias_target('pot', pot)

msgmerge = find_program('msgmerge')
msgcmp = find_program('msgcmp')

po_targets = []
po_check_targets = []
po_untranslated_targets = []

foreach lang : languages
  po_file = files(lang + '.po')

  po_targets += run_target(
    fs.name(po_file),
    command: [msgmerge, '-U', po_file, pot],
    depends: pot
  )

  po_check_targets += run_target(
    fs.name(po_file) + '-check',
    command: [msgcmp, '--use-untranslated', po_file, pot],
    depends: pot
  )

  po_untranslated_targets += run_target(
    fs.name(po_file) + '-untranslated',
    command: [msgcmp, po_file, pot],
    depends: pot
  )
endforeach

alias_target('msgmerge', alias_target('update-po', po_targets))
po_check = alias_target('msgcmp', alias_target('check-po', po_check_targets))
alias_target('msgcmp-strict', alias_target('untranslated', po_untranslated_targets))

locales_check = alias_target('locales-check', potfiles_check, po_check)
checks += locales_check
