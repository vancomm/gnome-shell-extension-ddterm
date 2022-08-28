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


def podman_command(command=['podman']):
    return sh.Command(command[0]).bake(
        *command[1:],
        _timeout=30,
        _out=STDOUT,
        _err=STDERR,
        _tee='err'
    )


class Console:
    def __init__(self, container):
        self.tee = None
        self.process = None
        self.container = container

    def write(self, chunk):
        sys.stdout.buffer.write(chunk)

        tee = self.tee
        if tee is not None:
            tee(chunk)

    def attach(self):
        assert self.process is None

        self.process = self.container.podman.attach(
            '--no-stdin', self.container.container_id,
            _out=self, _bg=True, _timeout=None
        )

    def wait(self, timeout=None):
        if self.process is not None:
            self.process.wait(timeout=timeout)


class Container:
    def __init__(self, podman, *args):
        self.container_id = str(podman.create(*args, _out=None)).strip()
        self.podman = podman
        self.console = Console(self)

    def rm(self):
        try:
            self.podman.rm('-f', self.container_id)

        finally:
            self.console.wait(timeout=1)

    def start(self):
        self.podman.start(self.container_id)
        self.console.attach()

    def exec(self, *args, user=None, env=dict(), **kwargs):
        user_args = [] if user is None else ['--user', user]
        user_args.extend(f'--env={k}={v}' for k, v in env.items())

        return self.podman.exec(
            *user_args, self.container_id, *args, **kwargs
        )

    def inspect(self, format=None):
        format_args = () if format is None else ('--format', format)

        return json.loads(self.podman.container.inspect(
            *format_args, self.container_id, _out=None
        ).stdout)
