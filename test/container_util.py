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


class ConsoleReader:
    def __init__(self):
        super().__init__()

        self.wait_line_event = threading.Event()
        self.wait_line_lock = threading.Lock()
        self.wait_line_substr = None
        self.shut_down = False

    def write(self, chunk):
        sys.stdout.buffer.write(chunk)

        with self.wait_line_lock:
            if self.wait_line_substr is not None:
                if self.wait_line_substr in chunk:
                    self.wait_line_event.set()

    def done(self, *_):
        with self.wait_line_lock:
            self.shut_down = True
            self.wait_line_event.set()

    def set_wait_line(self, substr):
        with self.wait_line_lock:
            if self.shut_down:
                return

            self.wait_line_substr = substr
            self.wait_line_event.clear()

    def wait_line(self, timeout=None):
        if not self.wait_line_event.wait(timeout=timeout):
            raise TimeoutError()


class ConsoleReaderSubprocess(ConsoleReader):
    def __init__(self, container):
        super().__init__()

        self.process = container.podman.attach(
            '--no-stdin', container.container_id,
            _out=self, _done=self.done, _bg=True, _timeout=None
        )

    def join(self, timeout=None):
        LOGGER.info('Waiting for console reader subprocess to stop')

        with contextlib.suppress(sh.SignalException_SIGKILL):
            self.process.wait(timeout=timeout)

        LOGGER.info('Console reader shut down')


class Container:
    def __init__(self, podman, container_id):
        self.container_id = container_id
        self.podman = podman
        self.console = None

    def kill(self):
        try:
            self.podman.kill(self.container_id)

        except sh.ErrorReturnCode:
            LOGGER.exception('Failed to kill container %r', self.container_id)

        finally:
            if self.console:
                self.console.join()

    def start_console(self):
        assert self.console is None
        self.console = ConsoleReaderSubprocess(self)

    @classmethod
    def run(cls, podman, *args):
        container_id = str(podman.run('-td', *args, _out=None)).strip()

        return cls(podman, container_id)

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
