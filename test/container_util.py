import contextlib
import json
import logging
import os
import sys
import threading
import time

import sh


LOGGER = logging.getLogger(__name__)

# FDs that are never closed - to make commands work during teardown
STDOUT = os.dup(sys.stdout.fileno())
STDERR = os.dup(sys.stderr.fileno())


def build_command(*args):
    return sh.Command(args[0]).bake(
        *args[1:],
        _timeout=30,
        _out=STDOUT,
        _err=STDERR,
        _tee='err'
    )


podman = build_command('podman')
compose = build_command('podman-compose')


class Console:
    def __init__(self, container_id):
        self.tee = None
        self.process = None
        self.container_id = container_id

    def write(self, chunk):
        sys.stdout.buffer.write(chunk)

        tee = self.tee
        if tee is not None:
            tee(chunk)

    def attach(self):
        assert self.process is None

        self.process = podman.attach(
            '--no-stdin', self.container_id,
            _out=self, _bg=True, _timeout=None
        )

    def wait(self, timeout=None):
        if self.process is not None:
            self.process.wait(timeout=timeout)
            self.process = None


class Container:
    def __init__(self, container_id):
        self.container_id = container_id
        self.console = Console(container_id)

    def start(self):
        podman.start(self.container_id)
        self.console.attach()

    def exec(self, *args, user=None, env=dict(), **kwargs):
        user_args = [] if user is None else ['--user', user]
        user_args.extend(f'--env={k}={v}' for k, v in env.items())

        return podman.exec(
            *user_args, self.container_id, *args, **kwargs
        )

    def inspect(self, format=None):
        format_args = () if format is None else ('--format', format)

        return json.loads(podman.container.inspect(
            *format_args, self.container_id, _out=None
        ).stdout)


class ComposeProject:
    def __init__(self, name=None):
        self.name = name
        self.compose = compose.bake('-p', name) if name else compose

    def list_services(self):
        return str(self.compose.config('--services', _out=None)).split()

    def create(self, name):
        container_id = str(
            self.compose.up('--no-start', '--force-recreate', name, _out=None)
        ).split()[-1]

        return Container(container_id)

    def down(self, *names):
        self.compose.down('-v', *names)
