"""Mesa V3 is served separately and reuses the real reservation API."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_v3_page_and_assets_keep_prior_versions(tmp_path):
    with TestClient(create_app(str(tmp_path / "mesa_v3.db"))) as client:
        assert client.get("/").status_code == 200
        assert client.get("/v2").status_code == 200
        page = client.get("/v3")
        assert page.status_code == 200
        assert "Good food." in page.text
        assert "Better" in page.text
        assert 'id="availability-note"' in page.text
        assert 'class="workspace-shell"' in page.text
        assert 'class="journey-rail"' in page.text
        assert 'class="coach-rail"' in page.text
        assert 'class="mobile-nav"' in page.text
        assert 'class="editorial-steps"' in page.text
        assert 'class="hero-photo-caption"' in page.text
        assert 'id="share-plan"' in page.text
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
        assert '#BD432B' in favicon.text
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
        dining_css = client.get("/v3-assets/dining.css")
        assert dining_css.status_code == 200
        assert "--primary:#BD432B" in dining_css.text
        assert "--canvas:#F8F7F2" in dining_css.text
        assert "--hero-warm:#F5E6BF" in dining_css.text
        assert "--occasion-warm:#F3EFE3" in dining_css.text
        assert "--spice-ink:#A83B27" in dining_css.text
        assert "--status-ink:#316A4C" in dining_css.text
        assert '--jade:var(--status-ink)' in dining_css.text
        assert '<meta name="theme-color" content="#F8F7F2"' in page.text
        assert ".editorial-steps" in dining_css.text
        assert ".card-image img" in dining_css.text
        paprika = client.get("/v3-assets/paprika.css")
        assert paprika.status_code == 200
        assert "--primary:#BD432B" in paprika.text
        assert "--hero-warm:#F5E6BF" in paprika.text
        assert '"Plus Jakarta Sans"' in paprika.text
        assert ".caption-badge" in paprika.text
        assert ".vibe-chip.active" in paprika.text
        assert "paprika.css" in page.text
        assert 'class="reservation-dock"' in page.text
        assert page.text.count('id="search-form"') == 1
        assert 'id="hero-plan-date"' in page.text
        assert 'id="hero-plan-party"' in page.text
        table_css = client.get("/v3-assets/table-first.css")
        assert table_css.status_code == 200
        assert ".reservation-dock" in table_css.text
        assert ".restaurant-card:first-child" in table_css.text
        table_js = client.get("/v3-assets/table-first.js")
        assert table_js.status_code == 200
        assert "updateHeroPlan" in table_js.text
        dining_js = client.get("/v3-assets/dining.js")
        assert dining_js.status_code == 200
        assert "fallbackPhoto" in dining_js.text
        assert "share-plan" in dining_js.text
        assert "renderDiningCollection" in dining_js.text
        assert "photo-1603894584373" in client.get("/v3-assets/app.js").text
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
