"""E2E tests for the contact page: form submission and validation."""

from playwright.sync_api import Page, expect


def test_contact_page_loads(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    expect(page.locator(".page-header h2")).to_have_text("Liên hệ")
    expect(page.locator(".contact-info")).to_be_visible()
    expect(page.locator(".contact-form")).to_be_visible()


def test_contact_form_submission(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")

    page.fill("#contact-name", "E2E Tester")
    page.fill("#contact-phone", "0365913732")
    page.fill("#contact-email", "e2e@test.com")
    page.select_option("#contact-subject", "product")
    page.fill("#contact-message", "Automated E2E test message")
    page.locator("button", has_text="Gửi tin nhắn").click()

    success = page.locator("[role='alert']")
    expect(success).to_contain_text("Gửi tin nhắn thành công")


def test_contact_form_required_fields(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    expect(page.locator("#contact-name")).to_have_attribute("required", "")
    expect(page.locator("#contact-phone")).to_have_attribute("required", "")
    expect(page.locator("#contact-message")).to_have_attribute("required", "")


def test_contact_form_subject_options(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    options = page.locator("#contact-subject option")
    assert options.count() == 5
    expect(options.nth(0)).to_have_text("-- Chọn chủ đề --")


def test_contact_info_displayed(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    info = page.locator(".contact-info")
    expect(info).to_contain_text("Địa chỉ")
    expect(info).to_contain_text("Hotline tư vấn")
