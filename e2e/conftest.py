import os
import pytest
from playwright.sync_api import Page, APIRequestContext


BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")
ADMIN_USER = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "admin123")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture()
def page(page: Page, base_url: str):
    """Override default page fixture to set base_url and a reasonable viewport."""
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(base_url)
    return page


@pytest.fixture()
def admin_token(playwright) -> str:
    """Get a valid admin JWT token via API."""
    ctx = playwright.request.new_context(base_url=BASE_URL)
    resp = ctx.post(
        "/api/auth/login",
        data={"username": ADMIN_USER, "password": ADMIN_PASS},
    )
    assert resp.ok, f"Admin login failed: {resp.status} {resp.text()}"
    token = resp.json()["token"]
    ctx.dispose()
    return token


@pytest.fixture()
def admin_page(page: Page, admin_token: str, base_url: str):
    """A page already logged in as admin."""
    page.evaluate(f"localStorage.setItem('admin_token', '{admin_token}')")
    page.goto(f"{base_url}/admin")
    page.wait_for_selector(".admin-layout")
    return page


@pytest.fixture()
def api(playwright) -> APIRequestContext:
    """Raw API context for setup/teardown helpers."""
    ctx = playwright.request.new_context(base_url=BASE_URL)
    yield ctx
    ctx.dispose()
