#!/usr/bin/env python3

import argparse
import difflib
import os.path
import sys


def check_diff(potfiles_file, expected):
    with open(potfiles_file) as f:
        actual = list(f)

    delta = list(
        difflib.unified_diff(
            expected,
            actual,
            potfiles_file + '.expected',
            potfiles_file
        )
    )

    if not delta:
        return

    print(f'Please update {potfiles_file!r}:')
    sys.stdout.writelines(delta)
    sys.exit(1)


def run(check, potfiles_file, source_root, inputs):
    expected = sorted(os.path.relpath(f, source_root) + '\n' for f in inputs)

    if check:
        check_diff(potfiles_file, expected)
        return

    with open(potfiles_file, 'w') as f:
        f.writelines(expected)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--potfiles-file', required=True)
    parser.add_argument('--source-root', required=True)
    parser.add_argument('inputs', nargs='*')
    run(**vars(parser.parse_args()))


if __name__ == '__main__':
    main()
