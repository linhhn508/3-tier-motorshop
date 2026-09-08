"""E2E tests for navigation links and 404 page."""

import re

from playwright.sync_api import Page, expect


def test_nav_links_exist(page: Page):
    nav = page.locator("nav[aria-label='Main navigation']")
    expect(nav.locator("a", has_text="Homepage")).to_be_visible()
    expect(nav.locator("a", has_text="Blog")).to_be_visible()
    expect(nav.locator("a", has_text="Contact")).to_be_visible()


def test_nav_to_contact(page: Page, base_url: str):
    page.locator("nav[aria-label='Main navigation'] a", has_text="Contact").click()
    page.wait_for_url(re.compile(r"/contact"))
    expect(page.locator(".page-header h2")).to_have_text("Liên hệ")


def test_nav_to_blog(page: Page, base_url: str):
    page.locator("nav[aria-label='Main navigation'] a", has_text="Blog").click()
    page.wait_for_url(re.compile(r"/blog"))


def test_nav_logo_goes_home(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    page.locator("img[alt='My Motor Shop']").click()
    page.wait_for_url(re.compile(r"/$"))
    expect(page.locator(".content h3")).to_contain_text("SẢN PHẨM MỚI NHẤT")


def test_404_page(page: Page, base_url: str):
    page.goto(f"{base_url}/this-page-does-not-exist")
    expect(page.locator(".not-found-code")).to_have_text("404")
    expect(page.locator(".not-found-title")).to_have_text("Trang không tồn tại")


def test_404_back_to_home(page: Page, base_url: str):
    page.goto(f"{base_url}/this-page-does-not-exist")
    page.locator(".not-found-link").click()
    page.wait_for_url(re.compile(r"/$"))
    expect(page.locator(".content h3")).to_contain_text("SẢN PHẨM MỚI NHẤT")
