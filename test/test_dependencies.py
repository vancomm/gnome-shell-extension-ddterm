import pytest

from . import systemd_container


class TestDependencies(systemd_container.SystemdContainerFixtures):
    @pytest.fixture(scope='class')
    def container_volumes(self, src_dir):
        return [
            (src_dir, src_dir, 'ro')
        ]

    def test_manifest(self, src_dir, container):
        container.exec(
            str(src_dir / 'ddterm' / 'app' / 'tools' / 'dependencies-update.js'),
            '--dry-run',
            timeout=60
        )
