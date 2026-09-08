# Playwright E2E Testing Guide (Python + pytest)

## Setup

### 1. Install dependencies

```bash
cd e2e
uv sync
```

### 2. Install browser

```bash
# If behind corporate proxy with SSL interception:
NODE_TLS_REJECT_UNAUTHORIZED=0 uv run playwright install chromium

# Normal network:
uv run playwright install chromium
```

### 3. Install system libraries (Linux/WSL only)

```bash
sudo uv run playwright install-deps chromium
# Or manually:
sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
```

### 4. Start the Docker stack

```bash
cd /path/to/3-tier-motorshop
docker compose up -d
```

---

## Running Tests

```bash
cd e2e

# Run all tests (headless)
uv run pytest

# Run with browser visible
uv run pytest --headed

# Run a specific file
uv run pytest tests/test_homepage.py

# Run a specific test
uv run pytest tests/test_homepage.py::test_search_shows_results

# Run tests matching a keyword
uv run pytest -k "admin"

# Run with detailed output
uv run pytest -v --tb=long

# Run in a specific browser
uv run pytest --browser firefox
uv run pytest --browser webkit

# Slow down execution (ms between actions, useful for debugging)
uv run pytest --headed --slowmo 500
```

---

## Project Structure

```
e2e/
├── pyproject.toml       # Dependencies + pytest config
├── conftest.py          # Shared fixtures (page, admin auth, base_url)
└── tests/
    ├── test_homepage.py     # Product listing, search, categories, pagination
    ├── test_product.py      # Product detail, tabs, feedback form
    ├── test_contact.py      # Contact form submission and validation
    ├── test_navigation.py   # Nav links, 404 page
    ├── test_admin_auth.py   # Login, logout, auth guard
    └── test_admin_crud.py   # CRUD operations, contacts/feedback tabs
```

---

## Writing Tests

### Basic test

```python
from playwright.sync_api import Page, expect

def test_example(page: Page):
    # page fixture auto-navigates to base_url (localhost:8000)
    expect(page.locator("h1")).to_have_text("Welcome")
```

The `page` fixture (defined in `conftest.py`) automatically:
- Sets viewport to 1280x720
- Navigates to the base URL

### Navigating

```python
def test_go_to_contact(page: Page, base_url: str):
    page.goto(f"{base_url}/contact")
    # Or click a link:
    page.locator("a", has_text="Contact").click()
    page.wait_for_url("**/contact")
```

### Finding elements (Locators)

```python
# By CSS selector
page.locator(".product-item")
page.locator("#header-search")
page.locator("nav[aria-label='Main navigation'] a")

# By text content
page.locator("button", has_text="Submit")
page.locator("h2", has_text="Contact")

# By role (preferred for accessibility)
page.get_by_role("button", name="Submit")
page.get_by_role("heading", name="Contact")
page.get_by_role("link", name="Homepage")

# By label (for form fields)
page.get_by_label("Username")
page.get_by_label("Password")

# By placeholder
page.get_by_placeholder("Search...")

# Scoping: find element within another
nav = page.locator("nav")
nav.locator("a", has_text="Blog")

# Multiple results: pick one
page.locator(".product-item").first
page.locator(".product-item").nth(2)   # 0-indexed
page.locator(".product-item").last
```

### Interacting with elements

```python
# Click
page.locator("button").click()
page.locator("button").dblclick()

# Type into input
page.fill("#username", "admin")          # Clears then types
page.locator("#search").press_sequentially("honda")  # Types character by character

# Select dropdown
page.select_option("#subject", "product")        # By value
page.select_option("#subject", label="Warranty")  # By visible text

# Check/uncheck
page.locator("#agree").check()
page.locator("#agree").uncheck()

# Upload file
page.locator("input[type='file']").set_input_files("photo.jpg")

# Keyboard
page.keyboard.press("Enter")
page.keyboard.press("Tab")
```

### Assertions (expect)

```python
from playwright.sync_api import expect

# Visibility
expect(page.locator(".modal")).to_be_visible()
expect(page.locator(".modal")).to_be_hidden()

# Text
expect(page.locator("h1")).to_have_text("Exact text")
expect(page.locator("h1")).to_contain_text("partial")

# Attributes
expect(page.locator("input")).to_have_attribute("required", "")
expect(page.locator("a")).to_have_attribute("href", "/contact")

# CSS class
expect(page.locator(".tab")).to_have_class(re.compile(r"active"))

# Count
expect(page.locator(".product-item")).to_have_count(10)

# Value (input fields)
expect(page.locator("#name")).to_have_value("John")

# URL
expect(page).to_have_url(re.compile(r"/contact"))
expect(page).to_have_title("Motor Shop")

# Enabled/disabled
expect(page.locator("button")).to_be_enabled()
expect(page.locator("button")).to_be_disabled()
```

All `expect()` calls auto-wait up to 5 seconds by default.

### Waiting

```python
import re

# Wait for URL change
page.wait_for_url(re.compile(r"/product/.+"))
page.wait_for_url("**/contact")

# Wait for element
page.wait_for_selector(".product-item")
page.wait_for_selector(".modal", state="hidden")

# Wait for network idle (all requests done)
page.wait_for_load_state("networkidle")

# Wait for specific API response
with page.expect_response("**/api/products/") as resp_info:
    page.locator("button").click()
response = resp_info.value
assert response.status == 200
```

### Handling dialogs (window.confirm, alert, prompt)

```python
def test_delete_with_confirm(admin_page: Page):
    # Register handler BEFORE the action that triggers the dialog
    admin_page.on("dialog", lambda dialog: dialog.accept())
    admin_page.locator(".delete-btn").click()

    # To dismiss (cancel):
    admin_page.on("dialog", lambda dialog: dialog.dismiss())

    # To read dialog message:
    def handle(dialog):
        assert "Are you sure?" in dialog.message
        dialog.accept()
    admin_page.on("dialog", handle)
```

### Using fixtures for admin tests

```python
def test_admin_products(admin_page: Page):
    # admin_page is already logged in and on /admin
    expect(admin_page.locator(".admin-table")).to_be_visible()

def test_needs_token(admin_token: str):
    # admin_token is a raw JWT string for API calls
    print(admin_token)
```

### Using API for test setup/teardown

```python
def test_with_api_setup(admin_page: Page, api, admin_token: str):
    # Create test data via API
    resp = api.post(
        "/api/products/",
        headers={"Authorization": f"Bearer {admin_token}"},
        data={"id": "test-item", "name": "Test", "price": 1000, "category": "X"},
    )
    assert resp.ok

    # ... run UI test ...

    # Cleanup via API
    api.delete(
        "/api/products/test-item",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
```

---

## Debugging Tips

### 1. Use `--headed --slowmo`

```bash
uv run pytest tests/test_homepage.py::test_search_shows_results --headed --slowmo 1000
```

### 2. Pause execution mid-test

```python
def test_debug(page: Page):
    page.goto("http://localhost:8000")
    page.pause()  # Opens Playwright Inspector - ONLY works with --headed
```

### 3. Take screenshots on failure

```python
def test_something(page: Page):
    try:
        expect(page.locator(".missing")).to_be_visible()
    except AssertionError:
        page.screenshot(path="debug-screenshot.png")
        raise
```

### 4. Codegen: auto-generate test code

```bash
uv run playwright codegen http://localhost:8000
```

This opens a browser — click around and it generates Python test code for you.

### 5. Trace viewer (detailed recording)

```bash
# Record trace
uv run pytest --tracing on

# View trace (after test finishes)
uv run playwright show-trace test-results/trace.zip
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| `locator("h3")` matches multiple elements | Scope it: `.content h3` or use `has_text=` |
| Test works headed but fails headless | Check viewport size, animations, or timing |
| `strict mode violation` | Locator matches >1 element — make it more specific |
| `element is not visible` | Element might be off-screen — check viewport or scroll |
| `timeout 5000ms exceeded` | Element not found — check selector, or increase timeout |
| Dialog not handled | Register `page.on("dialog", ...)` BEFORE triggering action |

### Increasing timeout

```python
# Per-assertion (ms)
expect(page.locator(".slow-element")).to_be_visible(timeout=10000)

# Per-navigation
page.goto("http://localhost:8000", timeout=30000)

# Global default in pyproject.toml — not supported, use conftest:
@pytest.fixture(scope="session")
def browser_context_args():
    return {"timeout": 10000}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:8000` | App URL to test against |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |

```bash
E2E_BASE_URL=http://staging.example.com uv run pytest
```
