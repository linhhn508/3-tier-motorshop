"""E2E tests for the homepage: product listing, search, category filter, pagination."""

import re

from playwright.sync_api import Page, expect


def test_homepage_loads_with_products(page: Page):
    expect(page.locator(".content h3")).to_contain_text("SẢN PHẨM MỚI NHẤT")
    products = page.locator(".product-item")
    expect(products.first).to_be_visible()
    assert products.count() > 0


def test_search_shows_results(page: Page):
    page.fill("#header-search", "honda")
    page.locator("button[aria-label='Tìm kiếm']").click()
    page.wait_for_url(re.compile(r"\?q=honda"))
    expect(page.locator(".content h3")).to_contain_text("Kết quả tìm kiếm")


def test_search_no_results(page: Page):
    page.fill("#header-search", "xyznonexistent999")
    page.locator("button[aria-label='Tìm kiếm']").click()
    page.wait_for_url(re.compile(r"\?q=xyznonexistent999"))
    expect(page.locator(".no-results")).to_be_visible()


def test_category_filter(page: Page):
    first_category = page.locator("#menu a").nth(1)  # skip "Tất cả"
    category_name = first_category.inner_text()
    first_category.click()
    page.wait_for_url(re.compile(r"\?category="))
    expect(page.locator(".content h3")).to_contain_text(category_name)


def test_pagination_navigation(page: Page):
    pagination = page.locator("nav[aria-label='Page navigation']")
    if pagination.is_visible():
        next_btn = page.locator("#next-btn")
        if next_btn.is_enabled():
            next_btn.click()
            active_page = page.locator("#page-numbers button.active")
            expect(active_page).to_have_text("2")

            prev_btn = page.locator("#prev-btn")
            prev_btn.click()
            active_page = page.locator("#page-numbers button.active")
            expect(active_page).to_have_text("1")


def test_product_card_links_to_detail(page: Page):
    first_link = page.locator(".product-item a").first
    href = first_link.get_attribute("href")
    assert href and href.startswith("/product/")
    first_link.click()
    page.wait_for_url(re.compile(r"/product/.+"))
    expect(page.locator(".product_info_container")).to_be_visible()
