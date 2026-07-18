import { LitElement, html, css } from "../../lit.js";
import { sharedStyles } from '../../styles/shared-styles.js';
import { getItemImage } from '../../utils.js';
import { playIcon } from '../common/icons.js';

/**
 * Podcast show detail: cover + title + publisher header and an episode list.
 * Tapping an episode plays it (show context + episode offset_uri); the header
 * Play button starts the show from its most recent episode.
 *
 * Kept deliberately small (mirrors spotify-section-view): drives the shared app
 * header via 'header-scroll' rather than rendering its own top bar.
 */
export class SpotifyShowView extends LitElement {
    static get properties() {
        return {
            data: { type: Object },
            api: { type: Object },
            hass: { type: Object },
        };
    }

    static get styles() {
        return [
            sharedStyles,
            css`
                :host { display: block; width: 100%; height: 100%; position: relative; z-index: 0; }
                .scroller { height: 100%; overflow-y: auto; overflow-x: hidden; overscroll-behavior-y: auto; }
                .show-inner {
                    padding-top: calc(64px + var(--spf-safe-top, 0px));
                    padding-bottom: 24px;
                    background: var(--spf-bg);
                    min-height: 100%;
                }
                .show-header { display: flex; gap: 16px; padding: 8px 16px 20px; align-items: flex-end; }
                .show-cover {
                    width: 128px; height: 128px; flex: 0 0 128px; border-radius: 8px;
                    background-size: cover; background-position: center; background-color: #282828;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
                }
                .show-meta { min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; }
                .show-kind { font-size: var(--spf-text-base, 13.5px); color: #b3b3b3; text-transform: uppercase; letter-spacing: 0.04em; }
                .show-title { font-size: 28px; font-weight: 800; color: #fff; line-height: 1.1; margin: 6px 0; word-break: break-word; }
                .show-pub { font-size: var(--spf-text-base, 13.5px); color: #b3b3b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .play-row { padding: 0 16px 12px; }
                .play-show-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    background: var(--spf-brand, #1db954); color: #000; border: none; cursor: pointer;
                    border-radius: 999px; padding: 12px 22px; font-weight: 700; font-size: var(--spf-text-md, 15px);
                }
                .ep-row {
                    display: grid; grid-template-columns: 56px 1fr; gap: 16px; padding: 12px 16px;
                    cursor: pointer; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05);
                    transition: background 0.2s;
                }
                .ep-row:hover { background: rgba(255,255,255,0.08); }
                .ep-img { width: 56px; height: 56px; border-radius: 4px; background-size: cover; background-position: center; background-color: #282828; }
                .ep-info { min-width: 0; }
                .ep-title { font-size: var(--spf-text-md, 15px); font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ep-sub { font-size: var(--spf-text-base, 13.5px); color: #b3b3b3; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .empty { padding: 24px 16px; color: #b3b3b3; }
            `
        ];
    }

    updated(changedProperties) {
        if (changedProperties.has('data')) this._emitHeaderState();
    }

    updateHeaderState() { this._emitHeaderState(); }

    _emitHeaderState() {
        this.dispatchEvent(new CustomEvent('header-scroll', {
            detail: { alpha: 1, title: this.data?.name || '', textAlpha: 1 },
            bubbles: true, composed: true
        }));
    }

    _showUri() {
        return this.data?.uri || (this.data?.id ? `spotify:show:${this.data.id}` : null);
    }

    _playShow(e) {
        e?.stopPropagation();
        const uri = this._showUri();
        if (uri && this.api) this.api.playMedia(uri, 'show');
    }

    _playEpisode(ep) {
        const showUri = this._showUri();
        if (!showUri || !this.api || !ep?.id) return;
        // Native way to start a single episode: play the show context, jump to
        // the episode. playMedia falls back to a direct play if the jump fails.
        this.api.playMedia(showUri, 'show', null, { offset_uri: `spotify:episode:${ep.id}` });
    }

    _fmtDuration(ms) {
        if (!Number.isFinite(ms) || ms <= 0) return '';
        const min = Math.round(ms / 60000);
        if (min < 60) return `${min} min`;
        const h = Math.floor(min / 60);
        const m = min % 60;
        return m ? `${h} h ${m} min` : `${h} h`;
    }

    _fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return dt.toLocaleDateString();
    }

    _episodeSub(ep) {
        return [this._fmtDate(ep.release_date), this._fmtDuration(ep.duration_ms)]
            .filter(Boolean).join(' · ');
    }

    render() {
        if (!this.data) return html``;
        const cover = getItemImage(this.data);
        const episodes = this.data.episodes || [];
        const loading = this.data.isLoading;

        return html`
            <div class="scroller" @scroll=${this._emitHeaderState}>
                <div class="show-inner">
                    <div class="show-header">
                        <div class="show-cover" style="background-image: url('${cover}');"></div>
                        <div class="show-meta">
                            <div class="show-kind">Podcast</div>
                            <div class="show-title">${this.data.name || ''}</div>
                            <div class="show-pub">${this.data.publisher || ''}</div>
                        </div>
                    </div>
                    <div class="play-row">
                        <button class="play-show-btn" @click=${this._playShow}>
                            ${playIcon(20)} Wiedergabe
                        </button>
                    </div>
                    ${loading && episodes.length === 0
                        ? html`<div class="empty">Episoden werden geladen…</div>`
                        : episodes.length === 0
                            ? html`<div class="empty">Keine Episoden gefunden.</div>`
                            : episodes.map(ep => this._renderEpisode(ep, cover))}
                </div>
            </div>
        `;
    }

    _renderEpisode(ep, showCover) {
        if (!ep) return '';
        const img = getItemImage(ep) || showCover;
        return html`
            <div class="ep-row" @click=${() => this._playEpisode(ep)}>
                <div class="ep-img" style="background-image: url('${img}');"></div>
                <div class="ep-info">
                    <div class="ep-title">${ep.name || 'Episode'}</div>
                    <div class="ep-sub">${this._episodeSub(ep)}</div>
                </div>
            </div>
        `;
    }
}

customElements.define('spotify-show-view', SpotifyShowView);
