const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.beforeEach(async ({ page }) => {
    await page.route("https://jsonplaceholder.typicode.com/**", route =>
        route.fulfill({ status: 503, body: "Offline in test" })
    );
    await page.goto("/");
});

test("uses semantic landmarks, a labelled form, and accessible status messages", async ({ page }) => {
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TaskFlow Offline");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
    await expect(page.getByLabel("Título de la tarea:")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar tarea" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(2);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
        "content",
        "width=device-width, initial-scale=1.0"
    );
});

test("has no WCAG 2.1 A/AA automated accessibility violations", async ({ page }) => {
    for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 800 });

        const accessibility = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

        expect(accessibility.violations, `WCAG violations at ${width}px`).toEqual([]);
    }
});

test("fits common mobile, tablet, and desktop viewport widths without horizontal overflow", async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });

        const dimensions = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
        }));

        expect(dimensions.documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(
            dimensions.viewportWidth
        );
    }
});

test("keeps external and YouTube links secure", async ({ page }) => {
    const links = await page.locator("a[href], iframe[src]").evaluateAll(elements =>
        elements.map(element => ({
            href: element.href || element.src,
            target: element.getAttribute("target"),
            rel: element.getAttribute("rel")
        }))
    );
    const youtubeHosts = new Set([
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
    ]);

    for (const link of links) {
        const url = new URL(link.href);

        expect(["http:", "https:"], `unsafe URL scheme: ${url.href}`).toContain(url.protocol);

        if (url.origin === await page.evaluate(() => location.origin)) {
            continue;
        }

        expect(url.protocol, `insecure external URL: ${url.href}`).toBe("https:");

        if (link.target === "_blank") {
            const rel = (link.rel || "").split(/\s+/);
            expect(rel).toContain("noopener");
            expect(rel).toContain("noreferrer");
        }

        if (/youtube|youtu\.be/i.test(url.hostname)) {
            expect(youtubeHosts.has(url.hostname), `untrusted YouTube host: ${url.hostname}`).toBe(true);
            expect(url.protocol, `YouTube URL must use HTTPS: ${url.href}`).toBe("https:");
        }
    }
});

test("adds new tasks as text in the semantic task list", async ({ page }) => {
    const taskTitle = "<img src=x onerror=alert(1)>";

    await page.getByLabel("Título de la tarea:").fill(taskTitle);
    await page.getByRole("button", { name: "Agregar tarea" }).click();

    await expect(page.getByRole("listitem")).toContainText(taskTitle);
    await expect(page.locator("#lista-tareas img")).toHaveCount(0);
});
