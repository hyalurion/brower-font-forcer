// ── State ──
let toggleBtn, statusDot, statusText;
let isExcludedSite = false;

// ── UI Helpers ──

function updateUI(isEnabled) {
    toggleBtn.classList.toggle('active', isEnabled);
    toggleBtn.setAttribute('aria-checked', String(isEnabled));
    toggleBtn.setAttribute('aria-label',
        isEnabled
            ? (chrome.i18n.getMessage('disableFontForce') || 'Disable font standardization')
            : (chrome.i18n.getMessage('enableFontForce') || 'Enable font standardization')
    );
    if (statusDot) statusDot.classList.toggle('inactive', !isEnabled);
    updateStatusText();
}

function updateStatusText() {
    if (!statusText) return;
    const lang = chrome.i18n.getUILanguage().replace('-', '_');
    if (isExcludedSite) {
        statusText.textContent = getMessage('statusExcluded', lang);
        return;
    }
    const isEnabled = toggleBtn.classList.contains('active');
    const key = isEnabled ? 'statusEnabled' : 'statusDisabled';
    statusText.textContent = getMessage(key, lang);
}

// ── i18n ──

let translations = {};

function loadTranslations(language, callback) {
    if (translations[language]) return callback();
    fetch(`_locales/${language}/messages.json`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => { translations[language] = data; callback(); })
        .catch(() => {
            if (language !== 'en') loadTranslations('en', callback);
            else callback();
        });
}

function getMessage(key, language) {
    return translations[language]?.[key]?.message
        || translations['en']?.[key]?.message
        || key;
}

function applyTranslations(language) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = getMessage(el.getAttribute('data-i18n'), language);
    });
    updateStatusText();
}

// ── Actions ──

function toggleFontForce() {
    chrome.storage.sync.get(['fontForceEnabled'], result => {
        const next = result.fontForceEnabled === false;
        chrome.storage.sync.set({ fontForceEnabled: next }, () => {
            updateUI(next);
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleFontForce', enabled: next }).catch(() => {});
                }
            });
        });
    });
}

function loadCurrentState() {
    chrome.storage.sync.get(['fontForceEnabled'], result => {
        updateUI(result.fontForceEnabled !== false);
    });
}

function initializeI18n() {
    const lang = chrome.i18n.getUILanguage().replace('-', '_');
    loadTranslations(lang, () => applyTranslations(lang));
}

// ── Site exclusion ──

function setExcludedSite(flag) {
    isExcludedSite = !!flag;
    if (statusDot) statusDot.classList.toggle('excluded', isExcludedSite);
    updateStatusText();
}

function checkSiteExclusion() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0] || !tabs[0].url) return;
        let hostname = '';
        try { hostname = new URL(tabs[0].url).hostname; } catch (e) { return; }

        // Default blocklist (chatgpt.com, claude.ai, ...)
        if (window.FontForceBlocklist && window.FontForceBlocklist.isBlockedHostname(hostname)) {
            setExcludedSite(true);
            return;
        }
        // User's custom blocklist in sync storage
        chrome.storage.sync.get({ blockedDomains: [] }, result => {
            const custom = Array.isArray(result.blockedDomains) ? result.blockedDomains : [];
            const host = hostname.toLowerCase().trim();
            const hit = custom.some(d => {
                const dm = String(d || '').toLowerCase().trim();
                return !!dm && (host === dm || host.endsWith('.' + dm));
            });
            if (hit) setExcludedSite(true);
        });
    });
}

// ── Init ──

document.addEventListener('DOMContentLoaded', () => {
    toggleBtn = document.getElementById('toggleBtn');
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');

    initializeI18n();
    loadCurrentState();
    checkSiteExclusion();

    toggleBtn.addEventListener('click', toggleFontForce);
    toggleBtn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFontForce(); }
    });
});