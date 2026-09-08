"""E2E tests for product detail page: info display, tabs, feedback submission."""

import re

from playwright.sync_api import Page, expect


def _go_to_first_product(page: Page):
    """Navigate to the first product's detail page from homepage."""
    first_link = page.locator(".product-item a").first
    first_link.click()
    page.wait_for_url(re.compile(r"/product/.+"))
    page.wait_for_selector(".product_info_container")


def test_product_detail_loads(page: Page):
    _go_to_first_product(page)
    expect(page.locator(".overall-info h3")).to_be_visible()
    expect(page.locator(".image-container img")).to_be_visible()
    expect(page.locator(".add-to-cart-btn")).to_be_visible()


def test_product_shows_attributes(page: Page):
    _go_to_first_product(page)
    info = page.locator(".overall-info")
    expect(info).to_contain_text("Giá:")
    expect(info).to_contain_text("VNĐ")


def test_product_breadcrumb(page: Page):
    _go_to_first_product(page)
    breadcrumb = page.locator(".product_info_header h3")
    expect(breadcrumb).to_contain_text("Trang chủ »")


def test_tab_switch_to_feedback(page: Page):
    _go_to_first_product(page)
    feedback_tab = page.locator(".tab-btn", has_text="Đánh giá")
    feedback_tab.click()
    expect(feedback_tab).to_have_class(re.compile(r"active"))
    expect(page.locator("#fb-name")).to_be_visible()


def test_tab_switch_to_description(page: Page):
    _go_to_first_product(page)
    # Switch to feedback first, then back to description
    page.locator(".tab-btn", has_text="Đánh giá").click()
    desc_tab = page.locator(".tab-btn", has_text="Mô tả")
    desc_tab.click()
    expect(desc_tab).to_have_class(re.compile(r"active"))
    expect(page.locator(".detailed_info_wrapper")).to_be_visible()


def test_feedback_submission(page: Page):
    _go_to_first_product(page)
    page.locator(".tab-btn", has_text="Đánh giá").click()

    page.fill("#fb-name", "E2E Test User")
    # Click 4th star (rating = 4)
    page.locator("[role='radio'][aria-label='4 sao']").click()
    page.fill("#fb-comment", "Automated E2E test feedback")
    page.locator("button", has_text="Gửi phản hồi").click()

    success = page.locator("[role='alert']")
    expect(success).to_contain_text("Gửi phản hồi thành công")


def test_feedback_validation_empty_fields(page: Page):
    _go_to_first_product(page)
    page.locator(".tab-btn", has_text="Đánh giá").click()
    submit_btn = page.locator("button", has_text="Gửi phản hồi")
    submit_btn.click()
    # Browser native validation should prevent submission (required fields)
    expect(page.locator("#fb-name")).to_have_attribute("required", "")
