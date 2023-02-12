import contextlib
import base64
import pathlib

import pytest
import pytest_html.extras
import wand.image

from . import systemd_container


DISPLAY_NUMBER = 99
X11_DISPLAY_BASE_PORT = 6000
DISPLAY_PORT = X11_DISPLAY_BASE_PORT + DISPLAY_NUMBER
DISPLAY = f':{DISPLAY_NUMBER}'


class ScreenshotContextManager(contextlib.AbstractContextManager):
    def __init__(self, failing_only, screen_path, extra):
        super().__init__()

        self.failing_only = failing_only
        self.screen_path = screen_path
        self.extra = extra

    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is None and self.failing_only:
            return

        xwd_blob = pathlib.Path(self.screen_path).read_bytes()

        with wand.image.Image(blob=xwd_blob, format='xwd') as img:
            png_blob = img.make_blob('png')

        self.extra.append(pytest_html.extras.png(base64.b64encode(png_blob).decode('ascii')))


class XvfbContainerFixtures(systemd_container.SystemdContainerFixtures):
    @pytest.fixture(scope='session')
    def xvfb_fbdir(self, tmpdir_factory):
        return tmpdir_factory.mktemp('xvfb')

    @pytest.fixture(scope='session')
    def xvfb_volumes(self, test_src_dir, xvfb_fbdir):
        return [
            (
                test_src_dir / 'etc/systemd/system/xvfb@.service.d/fbdir.conf',
                '/etc/systemd/system/xvfb@.service.d/fbdir.conf',
                'ro'
            ),
            (xvfb_fbdir, '/xvfb', 'rw'),
        ]

    @pytest.fixture(scope='session')
    def xvfb_publish_ports(self):
        return [('127.0.0.1', '', DISPLAY_PORT)]

    @pytest.fixture(scope='class')
    def container_volumes(self, xvfb_volumes):
        return xvfb_volumes

    @pytest.fixture(scope='class')
    def container_ports(self, xvfb_publish_ports):
        return xvfb_publish_ports

    @pytest.fixture
    def screenshot(self, xvfb_fbdir, extra, pytestconfig):
        return ScreenshotContextManager(
            pytestconfig.getoption('--screenshot-failing-only'),
            xvfb_fbdir / 'Xvfb_screen0',
            extra
        )

    @pytest.fixture(scope='class')
    def host_display(self, container):
        host, port = container.get_port(DISPLAY_PORT)
        display_number = int(port) - X11_DISPLAY_BASE_PORT
        return f'{host}:{display_number}'
