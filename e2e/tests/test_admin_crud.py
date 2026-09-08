"""E2E tests for admin CRUD: products, contacts, feedback tabs."""

import re
import uuid

from playwright.sync_api import Page, expect


TEST_PRODUCT_ID = f"e2e-test-{uuid.uuid4().hex[:8]}"


def test_admin_products_tab_visible(admin_page: Page):
    expect(admin_page.locator(".admin-table")).to_be_visible()
    headers = admin_page.locator(".admin-table th")
    expect(headers.nth(0)).to_have_text("ID")
    expect(headers.nth(1)).to_have_text("Tên sản phẩm")


def test_admin_create_product(admin_page: Page):
    admin_page.locator(".admin-btn-primary", has_text="Thêm sản phẩm").click()
    expect(admin_page.locator("h4", has_text="Thêm sản phẩm mới")).to_be_visible()

    admin_page.fill("#prod-id", TEST_PRODUCT_ID)
    admin_page.fill("#prod-name", "E2E Test Product")
    admin_page.fill("#prod-price", "999000")
    admin_page.fill("#prod-category", "Test Category")
    admin_page.fill("#prod-brand", "E2E Brand")
    admin_page.fill("#prod-origin", "Vietnam")
    admin_page.fill("#prod-material", "Steel")
    admin_page.fill("#prod-color", "Red")

    admin_page.locator(".admin-btn-primary", has_text="Thêm").click()

    alert = admin_page.locator("[role='alert']")
    expect(alert).to_contain_text("Thêm sản phẩm thành công")

    # Verify product appears in table
    expect(admin_page.locator(f"text={TEST_PRODUCT_ID}")).to_be_visible()


def test_admin_edit_product(admin_page: Page):
    # First create a product to edit
    product_id = f"e2e-edit-{uuid.uuid4().hex[:8]}"
    admin_page.locator(".admin-btn-primary", has_text="Thêm sản phẩm").click()
    admin_page.fill("#prod-id", product_id)
    admin_page.fill("#prod-name", "Before Edit")
    admin_page.fill("#prod-price", "100000")
    admin_page.fill("#prod-category", "Test")
    admin_page.locator(".admin-btn-primary", has_text="Thêm").click()
    admin_page.locator("[role='alert']").wait_for(state="visible")

    # Click edit on the new product row
    row = admin_page.locator("tr", has_text=product_id)
    row.locator(".admin-btn-edit").click()
    expect(admin_page.locator("h4", has_text="Sửa sản phẩm")).to_be_visible()

    admin_page.fill("#prod-name", "After Edit")
    admin_page.locator(".admin-btn-primary", has_text="Cập nhật").click()

    alert = admin_page.locator("[role='alert']")
    expect(alert).to_contain_text("Cập nhật thành công")

    # Cleanup
    row = admin_page.locator("tr", has_text=product_id)
    admin_page.on("dialog", lambda dialog: dialog.accept())
    row.locator(".admin-btn-delete").click()


def test_admin_delete_product(admin_page: Page):
    # Create a product to delete
    product_id = f"e2e-del-{uuid.uuid4().hex[:8]}"
    admin_page.locator(".admin-btn-primary", has_text="Thêm sản phẩm").click()
    admin_page.fill("#prod-id", product_id)
    admin_page.fill("#prod-name", "To Be Deleted")
    admin_page.fill("#prod-price", "100000")
    admin_page.fill("#prod-category", "Test")
    admin_page.locator(".admin-btn-primary", has_text="Thêm").click()
    admin_page.locator("[role='alert']").wait_for(state="visible")

    row = admin_page.locator("tr", has_text=product_id)
    expect(row).to_be_visible()

    # Accept the confirmation dialog
    admin_page.on("dialog", lambda dialog: dialog.accept())
    row.locator(".admin-btn-delete").click()

    alert = admin_page.locator("[role='alert']")
    expect(alert).to_contain_text("Đã xóa sản phẩm")
    expect(admin_page.locator(f"text={product_id}")).to_be_hidden()


def test_admin_cancel_form(admin_page: Page):
    admin_page.locator(".admin-btn-primary", has_text="Thêm sản phẩm").click()
    expect(admin_page.locator(".admin-form")).to_be_visible()
    admin_page.locator(".admin-btn-secondary", has_text="Hủy").click()
    expect(admin_page.locator(".admin-form")).to_be_hidden()


def test_admin_contacts_tab(admin_page: Page):
    admin_page.locator(".admin-sidebar-btn", has_text="Liên hệ").click()
    table = admin_page.locator(".admin-table")
    expect(table).to_be_visible()
    headers = table.locator("th")
    expect(headers.nth(0)).to_have_text("Tên")
    expect(headers.nth(1)).to_have_text("Email")


def test_admin_feedback_tab(admin_page: Page):
    admin_page.locator(".admin-sidebar-btn", has_text="Phản hồi").click()
    table = admin_page.locator(".admin-table")
    expect(table).to_be_visible()
    headers = table.locator("th")
    expect(headers.nth(0)).to_have_text("Tên")
    expect(headers.nth(1)).to_have_text("Đánh giá")
