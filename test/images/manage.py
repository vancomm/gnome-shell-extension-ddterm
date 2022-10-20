#!/usr/bin/env python3

import argparse
import json
import os
import pathlib
import subprocess
import sys


SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()


def all_dockerfiles():
    return SCRIPT_DIR.glob('*.dockerfile')


def list(indent):
    json.dump([os.path.relpath(f) for f in all_dockerfiles()], sys.stdout, indent=indent)


def generate(dockerfiles, prefix, tag):
    if not dockerfiles:
        dockerfiles = all_dockerfiles()

    for dockerfile in dockerfiles:
        pathlib.Path(dockerfile).write_text(f'FROM {prefix}{dockerfile.stem}:{tag}\n')


def build(dockerfiles, pull):
    if not dockerfiles:
        dockerfiles = all_dockerfiles()

    pull_arg = ['--pull'] if pull else []

    for dockerfile in dockerfiles:
        subprocess.run(
            ['podman', 'build'] + pull_arg + ['-f', dockerfile, os.path.dirname(dockerfile)],
            check=True
        )


COMMANDS = {
    'list': list,
    'generate': generate,
    'build': build,
}


def run_command(command, **kwargs):
    COMMANDS[command](**kwargs)


def main(*args, **kwargs):
    parser = argparse.ArgumentParser(
        description="Manage container images",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', required=True)

    list_parser = subparsers.add_parser('list', help="List dockerfiles")

    list_parser.add_argument(
        '--indent', '-i',
        default=None
    )

    generate_parser = subparsers.add_parser('generate', help="Generate/update dockerfiles")

    generate_parser.add_argument(
        '--file', '-f',
        action='append',
        dest='dockerfiles',
        help="Dockerfiles to update. Update all if not specified"
    )

    generate_parser.add_argument(
        '--prefix', '-p',
        default='ghcr.io/ddterm/gnome-shell-pod/',
        help="Image name prefix"
    )

    generate_parser.add_argument(
        'tag',
        help="Image tag"
    )

    build_parser = subparsers.add_parser('build', help="Build dockerfiles/warm up cache")

    build_parser.add_argument(
        '--pull',
        action='store_true',
        default=False,
        help="Pull base images"
    )

    build_parser.add_argument(
        'dockerfiles',
        nargs='*',
        help="Dockerfiles to build. Build all if not specified"
    )

    run_command(**vars(parser.parse_args(*args, **kwargs)))


if __name__ == '__main__':
    main()
