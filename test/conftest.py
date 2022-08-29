import contextlib
import os
import sys

import pytest

from . import container_util


current_compose_project = None


def teardown_compose_project():
    global current_compose_project

    if current_compose_project is not None:
        project = current_compose_project
        current_compose_project = None
        project.down(_bg=True, _tee=False).wait()


@pytest.hookimpl(tryfirst=True)
def pytest_keyboard_interrupt(excinfo):
    teardown_compose_project()


@pytest.hookimpl(tryfirst=True)
def pytest_internalerror(excrepr, excinfo):
    teardown_compose_project()


@pytest.fixture(scope='session')
def global_tmp_path(tmp_path_factory):
    return tmp_path_factory.getbasetemp().parent


@pytest.fixture(scope='session')
def xvfb_fbdir(tmp_path_factory):
    return tmp_path_factory.mktemp('xvfb')


@pytest.fixture(scope='session')
def compose_project(xvfb_fbdir, request):
    global current_compose_project
    assert current_compose_project is None

    os.environ['DDTERM_TEST_XVFB_FBDIR'] = str(xvfb_fbdir)
    project = container_util.ComposeProject()
    current_compose_project = project

    yield project

    teardown_compose_project()


@pytest.fixture(scope='session')
def compose_container(compose_project, request):
    return compose_project.create(request.param)


def pytest_generate_tests(metafunc):
    if 'compose_container' in metafunc.fixturenames:
        metafunc.parametrize(
            'compose_container',
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
