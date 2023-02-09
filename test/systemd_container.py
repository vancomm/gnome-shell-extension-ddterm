import contextlib
import logging
import queue

import filelock
import pytest

from . import container_util


LOGGER = logging.getLogger(__name__)

STARTUP_TIMEOUT_SEC = 10

CAP_ADD = [
    'SYS_NICE',
    'SYS_PTRACE',
    'SETPCAP',
    'NET_RAW',
    'NET_BIND_SERVICE',
    'DAC_READ_SEARCH',
]


@pytest.mark.runtest_cm.with_args(lambda item, when: item.cls.journal_context(item, when))
class SystemdContainerFixtures:
    current_container: container_util.Container = None

    @classmethod
    def journal_message(cls, msg):
        cls.current_container.exec('systemd-cat', input=msg.encode(), interactive=True)

    @classmethod
    def journal_sync(cls, msg):
        buffer = queue.SimpleQueue()
        pattern = msg.encode()
        grep = container_util.QueueOutput(buffer, lambda line: pattern in line)

        with cls.current_container.console.with_output(grep):
            cls.journal_message(msg)

            try:
                buffer.get(timeout=1)
            except queue.Empty:
                raise TimeoutError()

    @classmethod
    @contextlib.contextmanager
    def journal_context(cls, item, when):
        if cls.current_container is not None:
            cls.journal_message(f'Beginning of {item.nodeid} {when}')

        try:
            yield

        finally:
            if cls.current_container is not None:
                try:
                    cls.journal_sync(f'End of {item.nodeid} {when}')
                except Exception:
                    LOGGER.exception("Can't sync journal")

    @pytest.fixture(scope='class')
    def container_ports(self):
        return []

    @pytest.fixture(scope='class')
    def container_volumes(self):
        return []

    @pytest.fixture(scope='session')
    def container_start_lock(self, global_tmp_path):
        return filelock.FileLock(global_tmp_path / 'container-starting.lock')

    @pytest.fixture(scope='class')
    def container(
        self,
        request,
        podman,
        container_image,
        container_volumes,
        container_ports,
        container_start_lock
    ):
        assert request.cls.current_container is None

        with container_start_lock:
            c = container_util.Container.run(
                podman,
                container_image,
                cap_add=CAP_ADD,
                publish=container_ports,
                volumes=container_volumes,
                pull='never',
                log_driver='none',
                timeout=STARTUP_TIMEOUT_SEC
            )

        try:
            c.attach()
            request.cls.current_container = c

            c.exec('busctl', '--system', '--watch-bind=true', 'status', timeout=STARTUP_TIMEOUT_SEC)
            c.exec('systemctl', 'is-system-running', '--wait', timeout=STARTUP_TIMEOUT_SEC)

            yield c

        finally:
            request.cls.current_container = None
            c.kill()
