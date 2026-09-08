"""E2E tests for admin authentication: login, logout, auth guard."""

import re

from playwright.sync_api import Page, expect


ADMIN_USER = "admin"
ADMIN_PASS = "admin123"


def test_admin_login_success(page: Page, base_url: str):
    page.goto(f"{base_url}/admin/login")
    page.fill("#admin-user", ADMIN_USER)
    page.fill("#admin-pass", ADMIN_PASS)
    page.locator(".submit-btn").click()
    page.wait_for_url(re.compile(r"/admin$"))
    expect(page.locator(".admin-layout")).to_be_visible()
    expect(page.locator("h3", has_text="Admin Panel")).to_be_visible()


def test_admin_login_failure(page: Page, base_url: str):
    page.goto(f"{base_url}/admin/login")
    page.fill("#admin-user", "wronguser")
    page.fill("#admin-pass", "wrongpass")
    page.locator(".submit-btn").click()
    error = page.locator("[role='alert']")
    expect(error).to_be_visible()
    expect(error).to_contain_text("Invalid credentials")


def test_admin_auth_guard_redirects(page: Page, base_url: str):
    page.evaluate("localStorage.removeItem('admin_token')")
    page.goto(f"{base_url}/admin")
    page.wait_for_url(re.compile(r"/admin/login"))
    expect(page.locator(".submit-btn")).to_be_visible()


def test_admin_logout(page: Page, admin_token: str, base_url: str):
    page.evaluate(f"localStorage.setItem('admin_token', '{admin_token}')")
    page.goto(f"{base_url}/admin")
    page.wait_for_selector(".admin-layout")
    page.locator(".admin-logout-btn").click()
    page.wait_for_url(re.compile(r"/admin/login"))
    # Token should be removed
    token = page.evaluate("localStorage.getItem('admin_token')")
    assert token is None
