import contextlib

import pytest

from . import container_util


@pytest.fixture(scope='session')
def compose_service_name(request):
    return request.param


def pytest_generate_tests(metafunc):
    if 'compose_service_name' in metafunc.fixturenames:
        metafunc.parametrize(
            'compose_service_name',
            (
                pytest.param(name, marks=pytest.mark.uses_compose_service.with_args(name))
                for name in metafunc.config.option.container
            ),
            indirect=True,
            scope='session'
        )


@pytest.hookimpl(trylast=True)
def pytest_collection_modifyitems(session, config, items):
    def key(item):
        service_marker = item.get_closest_marker('uses_compose_service')
        return service_marker.args[0] if service_marker else None

    items.sort(key=key)


def pytest_configure(config):
    compose_services = config.getoption('--container')

    if not compose_services:
        project = container_util.ComposeProject()
        config.option.container = project.list_services()


def pytest_addoption(parser):
    parser.addoption('--container', action='append')
    parser.addoption('--screenshot-failing-only', default=False, action='store_true')


def get_runtest_cm(item, when):
    cm = item.get_closest_marker('runtest_cm')
    if cm:
        return cm.args[0](item, when)

    return contextlib.nullcontext()


@pytest.hookimpl(hookwrapper=True, trylast=True)
def pytest_runtest_setup(item):
    with get_runtest_cm(item, 'setup'):
        yield


@pytest.hookimpl(hookwrapper=True, trylast=True)
def pytest_runtest_call(item):
    with get_runtest_cm(item, 'call'):
        yield


@pytest.hookimpl(hookwrapper=True, trylast=True)
def pytest_runtest_teardown(item):
    with get_runtest_cm(item, 'teardown'):
        yield
