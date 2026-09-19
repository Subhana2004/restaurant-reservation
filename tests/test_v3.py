"""Mesa V3 is served separately and reuses the real reservation API."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_v3_page_and_assets_keep_prior_versions(tmp_path):
    with TestClient(create_app(str(tmp_path / "mesa_v3.db"))) as client:
        assert client.get("/").status_code == 200
        assert client.get("/v2").status_code == 200
        page = client.get("/v3")
        assert page.status_code == 200
        assert "Make room for" in page.text
        assert "the good stuff." in page.text
        assert 'id="availability-note"' in page.text
        assert 'class="workspace-shell"' in page.text
        assert 'class="journey-rail"' in page.text
        assert 'class="coach-rail"' in page.text
        assert 'class="mobile-nav"' in page.text
        for name in ("rail-progress-fill", "coach-date", "coach-plan", "coach-next-button", "sort-restaurants"):
            assert f'id="{name}"' in page.text
        for name in ("plan", "discover", "compare", "review"):
            assert f'data-step="{name}"' in page.text
        for name in ("studio-heading", "plan-summary", "copy-plan", "favorite-count", "surprise-me", "details-dialog", "compare-tray", "compare-dialog", "compare-list", "open-compare", "clear-compare"):
            assert f'id="{name}"' in page.text
        assert 'data-slot="19:00"' in page.text
        assert 'data-vibe="comfort"' in page.text
        assert 'data-hero-plan="tomorrow"' in page.text
        assert 'data-hero-plan="weekend"' in page.text
        assert 'data-filter="saved"' in page.text
        for name in ("search-form", "restaurant-grid", "booking-dialog", "reservations-dialog", "cancel-dialog", "open-reservations"):
            assert f'id="{name}"' in page.text
        assert client.get("/v3/").status_code == 200
        assert client.get("/v3-assets/app.js").status_code == 200
        styles = client.get("/v3-assets/styles.css")
        assert styles.status_code == 200
        assert "--cream:#F9F6F0" in styles.text
        assert "--ink:#292722" in styles.text
        assert "--red:#AD432E" in styles.text
        assert ".hero{background:#F4E5D5" in styles.text
        assert "background:#EAF1E9" in styles.text
        favicon = client.get("/v3-assets/favicon.svg")
        assert favicon.status_code == 200
        assert '#4358BA' in favicon.text
        studio_js = client.get("/v3-assets/studio.js")
        assert studio_js.status_code == 200
        assert "GET" not in studio_js.text or "api(" in studio_js.text
        assert "data-card-time" in studio_js.text
        assert "mesa-favorite-places-v1" in studio_js.text
        assert "This is a plan, not a confirmed reservation." in studio_js.text
        assert client.get("/v3-assets/studio.css").status_code == 200
        workspace_css = client.get("/v3-assets/workspace.css")
        assert workspace_css.status_code == 200
        assert "--primary:#4358BA" in workspace_css.text
        assert "--canvas:#F4F5F1" in workspace_css.text
        assert ".workspace-shell" in workspace_css.text
        assert ".coach-rail" in workspace_css.text
        workspace_js = client.get("/v3-assets/workspace.js")
        assert workspace_js.status_code == 200
        assert "stageFromState" in workspace_js.text
        assert "sortCards" in workspace_js.text
        assert "data-party" in workspace_js.text
        compare_js = client.get("/v3-assets/compare.js")
        assert compare_js.status_code == 200
        assert "compare-card-button" in compare_js.text
        assert "reflectsCurrentSlot" in compare_js.text
        assert "compare-list" in compare_js.text
        assert 'state.loadedSlot' in client.get("/v3-assets/app.js").text
        compare_css = client.get("/v3-assets/compare.css")
        assert compare_css.status_code == 200
        assert ".compare-tray" in compare_css.text
        assert ".hero-quick" in compare_css.text
        assert client.get("/v2-assets/olive.svg").status_code == 200
        assert len(client.get("/restaurants").json()) == 3
        assert client.get("/docs").status_code == 200
