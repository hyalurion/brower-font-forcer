// Font standardization script - targeted replacement
(function() {
    'use strict';

    let isEnabled = true;
    let isSiteBlocked = false;
    let observer = null;
    let checkInterval = null;

    // Target fonts: only replace elements using these fonts.
    // Extend this list as needed. Organized by script/region so the
    // extension works internationally, not only on Chinese pages.
    const targetFonts = [
        // ── Simplified Chinese (zh-CN) ──
        'Microsoft YaHei', 'Microsoft YaHei UI', '微软雅黑',
        'DengXian', '等线',
        'MiSans', 'MiSans VF', 'MiSans Latin', 'MiSans TC', 'MiSans HK', '小米字体',
        'PingFang SC', 'PingFangSC', '苹方', '苹果字体','SF Pro SC','SF Pro Text','Helvetica Neue',
        'Hiragino Sans GB',
        'SimSun', '宋体', 'NSimSun', '新宋体',
        'SimHei', '黑体',
        'KaiTi', '楷体', 'FangSong', '仿宋',
        'Noto Sans SC', 'Noto Sans CJK SC', 'Noto Serif SC',
        'Source Han Sans SC', '思源黑体', 'Source Han Serif SC', '思源宋体',
        'HarmonyOS Sans SC', 'HarmonyOS Sans',

        // ── Traditional Chinese: Taiwan & Hong Kong (zh-TW / zh-HK) ──
        'Microsoft JhengHei', 'Microsoft JhengHei UI', '微軟正黑體',
        'PMingLiU', '新細明體', 'MingLiU', '細明體',
        'DFKai-SB', '標楷體', 'BiauKai',
        'PingFang HK', 'PingFangHK', 'PingFang TC', 'PingFangTC',
        'Heiti TC', '黑體-繁', 'LiHei Pro', '儷黑 Pro', 'LiSong Pro',
        'Noto Sans TC', 'Noto Sans CJK TC', 'Noto Serif TC',
        'Source Han Sans TC', 'Source Han Sans HK', 'Source Han Serif TC',
        'Taipei Sans TC',

        // ── Japanese (ja) ──
        'Meiryo', 'Meiryo UI',
        'Yu Gothic', 'YuGothic', 'Yu Gothic UI', 'Yu Mincho', 'YuMincho',
        'MS Gothic', 'MS ゴシック', 'MS PGothic', 'ＭＳ Ｐゴシック',
        'MS PMincho', 'ＭＳ Ｐ明朝', 'MS Mincho', 'ＭＳ 明朝',
        'Hiragino Sans', 'Hiragino Kaku Gothic Pro', 'Hiragino Kaku Gothic ProN',
        'Hiragino Mincho ProN', 'Hiragino Maru Gothic ProN',
        'Noto Sans JP', 'Noto Sans CJK JP', 'Noto Serif JP',
        'Source Han Sans JP', 'Source Han Serif JP',
        'Osaka',

        // ── Korean (ko) ──
        'Malgun Gothic', '맑은 고딕',
        'NanumGothic', '나눔고딕', 'NanumMyeongjo', '나눔명조',
        'NanumSquare', 'NanumSquareRound',
        'Apple SD Gothic Neo',
        'Noto Sans KR', 'Noto Sans CJK KR', 'Noto Serif KR',
        'Source Han Sans KR', 'Source Han Serif KR',
        'Batang', '바탕', 'BatangChe', 'Gulim', '굴림',
        'Dotum', '돋움', 'Gungsuh', '궁서',

        // ── Thai (th) ──
        'Sukhumvit Set',
        'Leelawadee UI', 'Leelawadee',
        'TH Sarabun New', 'Angsana New', 'AngsanaUPC',
        'Cordia New', 'CordiaUPC', 'Browallia New', 'BrowalliaUPC',
        'Noto Sans Thai', 'Noto Sans Thai Looped', 'Noto Serif Thai',
        'IBM Plex Sans Thai', 'Sarabun', 'Prompt', 'Kanit',

        // ── Vietnamese (vi) ──
        // Vietnamese pages mostly use Latin web fonts (covered by the
        // Latin list below); these are Vietnam-specific families.
        'Be Vietnam', 'Be Vietnam Pro',

        // ── English / Latin (en + international) ──
        'Mona Sans VF',
        '-apple-system', 'BlinkMacSystemFont',
        'SF Pro', 'SF Pro Text', 'SF Pro Display',
        'Segoe UI', 'Segoe UI Variable',
        'Helvetica', 'Helvetica Neue', '-Helvetica Neue',
        'Arial', 'Tahoma', 'Verdana', 'Trebuchet MS',
        'Calibri', 'Cambria', 'Georgia', 'Times New Roman',
        'Ubuntu', 'Cantarell', 'DejaVu Sans', 'Liberation Sans', 'Nimbus Sans',
        'Noto Sans Backtick Fix',
        'Noto Sans',
        'ui-sans-serif',
        // Popular Latin web fonts (also common on Vietnamese sites)
        'Roboto', 'Open Sans', 'Inter', 'Lato', 'Montserrat',
        'Poppins', 'Nunito', 'Source Sans Pro', 'Work Sans',
        'DM Sans', 'Manrope', 'Rubik',
        'sans-serif',
    ];

    // Build a Set for O(1) lookup (lowercased)
    const targetFontSet = new Set(targetFonts.map(f => f.toLowerCase()));

    const DISABLED_FONT_FAMILY = '__font-force-disabled__';
    const disabledFontFaces = [];
    const disabledRuntimeFontFaces = [];

    function normalizeFontFamily(value) {
        return (value || '').trim().replace(/['"]/g, '').toLowerCase();
    }

    function disableFontFaceRules(ruleList) {
        Array.from(ruleList).forEach(function(rule) {
            if (rule.cssRules) {
                disableFontFaceRules(rule.cssRules);
                return;
            }
            if (typeof CSSFontFaceRule === 'undefined' || !(rule instanceof CSSFontFaceRule)) return;
            let family = '';
            try {
                family = normalizeFontFamily(rule.style.getPropertyValue('font-family'));
            } catch (e) {
                return;
            }
            if (!family || !targetFontSet.has(family)) return;
            try {
                const originalFamily = rule.style.getPropertyValue('font-family');
                rule.style.setProperty('font-family', '"' + DISABLED_FONT_FAMILY + '"');
                disabledFontFaces.push({ rule: rule, originalFamily: originalFamily });
            } catch (e) {}
        });
    }

    function scanSheetForFontFaces(sheet) {
        // Never rewrite our own neutralizer rules
        if (sheet && sheet.ownerNode && sheet.ownerNode.id === NEUTRALIZER_ID) return;
        try {
            if (sheet && sheet.cssRules) disableFontFaceRules(sheet.cssRules);
        } catch (e) {}
    }

    function disableCustomFontFaces() {
        ensureFontFaceNeutralizer();
        Array.from(document.styleSheets).forEach(scanSheetForFontFaces);
        // Constructed stylesheets adopted by the document (frameworks, web components)
        Array.from(document.adoptedStyleSheets || []).forEach(scanSheetForFontFaces);
        // Styles inside open shadow roots
        document.querySelectorAll('*').forEach(function(el) {
            const sr = el.shadowRoot;
            if (!sr) return;
            Array.from(sr.adoptedStyleSheets || []).forEach(scanSheetForFontFaces);
            sr.querySelectorAll('style').forEach(function(st) {
                if (st.sheet) scanSheetForFontFaces(st.sheet);
            });
        });
        if (document.fonts) {
            Array.from(document.fonts).forEach(function(face) {
                let family = '';
                try {
                    family = normalizeFontFamily(face.family);
                } catch (e) {
                    return;
                }
                if (!family || !targetFontSet.has(family)) return;
                try {
                    if (document.fonts.delete(face)) {
                        disabledRuntimeFontFaces.push(face);
                    }
                } catch (e) {}
            });
        }
    }

    function restoreCustomFontFaces() {
        removeFontFaceNeutralizer();
        while (disabledFontFaces.length) {
            const entry = disabledFontFaces.pop();
            try {
                entry.rule.style.setProperty('font-family', entry.originalFamily);
            } catch (e) {}
        }
        if (document.fonts) {
            while (disabledRuntimeFontFaces.length) {
                const face = disabledRuntimeFontFaces.pop();
                try {
                    document.fonts.add(face);
                } catch (e) {}
            }
        }
    }

    // ── Font-face neutralizer ──
    // A stylesheet kept as the LAST node of <html>. For every target family it
    // defines a @font-face whose src points at a non-existent local font and
    // whose descriptors (weight/style/stretch/unicode-range) match everything.
    // Equally-matching @font-face rules resolve last-wins in document order,
    // so this neutralizes site font-faces we cannot touch via CSSOM
    // (e.g. cross-origin CDN sheets) and covers shadow DOM too.
    const NEUTRALIZER_ID = 'force-font-neutralizer';

    function buildNeutralizerCSS() {
        // Live-face remap: Blink falls through dead (local-miss) faces to the
        // next live face of the family, so a broken-src face cannot beat a
        // site's live face. Instead we register a LIVE face that resolves the
        // family to a real system font. With exact matching descriptors the
        // last-defined rule (ours) wins the slot and renders a system font.
        const remapSrc = ['Segoe UI', 'PingFang SC', 'Noto Sans', 'Roboto',
            'Helvetica Neue'].map(function(l) {
            return 'local("' + l + '")';
        }).join(',');
        const weights = ['300', '400', '500', '700', '900'];
        const styles = ['normal', 'italic'];
        return targetFonts.map(function(name) {
            const family = '"' + name.replace(/["\\]/g, '') + '"';
            return weights.map(function(w) {
                return styles.map(function(s) {
                    return '@font-face{font-family:' + family + ';src:' + remapSrc +
                        ';font-weight:' + w + ';font-style:' + s + ';unicode-range:U+0-10FFFF;}';
                }).join('');
            }).join('');
        }).join('');
    }

    function ensureFontFaceNeutralizer() {
        let el = document.getElementById(NEUTRALIZER_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = NEUTRALIZER_ID;
        }
        const css = buildNeutralizerCSS();
        if (el.textContent !== css) el.textContent = css;
        const root = document.documentElement;
        if (root && (el.parentNode !== root || root.lastElementChild !== el)) {
            root.appendChild(el);
        }
    }

    function removeFontFaceNeutralizer() {
        const el = document.getElementById(NEUTRALIZER_ID);
        if (el) el.remove();
    }

    // ── Site blocklist ──
    // Excluded sites (e.g. AI chat apps such as ChatGPT / Claude) keep
    // their own fonts untouched. Defense-in-depth on top of the static
    // exclude_matches rules in manifest.json, and also honors the
    // user's custom blocklist stored in chrome.storage.sync.

    function getCustomBlockedDomains(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get({ blockedDomains: [] }, function(result) {
                callback(Array.isArray(result.blockedDomains) ? result.blockedDomains : []);
            });
        } else {
            callback([]);
        }
    }

    function checkSiteBlocked(callback) {
        const blocklist = window.FontForceBlocklist;
        if (!blocklist) {
            callback(false);
            return;
        }
        if (blocklist.isBlockedHostname(location.hostname)) {
            callback(true);
            return;
        }
        // Not in the default list: also check the user's custom domains
        getCustomBlockedDomains(function(custom) {
            callback(blocklist.isBlockedHostname(location.hostname, custom));
        });
    }

    // Check if an element's computed font-family contains any target font
    function isTargetFontElement(el) {
        if (el.hasAttribute('data-force-font-processed')) return false;
        try {
            const computedFamily = getComputedStyle(el).fontFamily.toLowerCase();
            const families = computedFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
            return families.some(f => targetFontSet.has(f));
        } catch (e) {
            return false;
        }
    }

    // Scan DOM and mark elements that use target fonts
    function scanAndMarkTargetFonts(root) {
        root = root || document.documentElement;
        if (!root) return;

        if (root.nodeType === Node.ELEMENT_NODE && isTargetFontElement(root)) {
            root.setAttribute('data-force-font', 'true');
        }
        if (root.nodeType === Node.ELEMENT_NODE) {
            root.setAttribute('data-force-font-processed', 'true');
        }

        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
            if (isTargetFontElement(el)) {
                el.setAttribute('data-force-font', 'true');
            }
            el.setAttribute('data-force-font-processed', 'true');
        });
    }

    // Clear all data-force-font markers
    function clearForceFontMarkers(root) {
        root = root || document.documentElement;
        if (!root) return;

        if (root.nodeType === Node.ELEMENT_NODE) {
            root.removeAttribute('data-force-font');
            root.removeAttribute('data-force-font-processed');
        }

        const marked = root.querySelectorAll('[data-force-font], [data-force-font-processed]');
        marked.forEach(el => {
            el.removeAttribute('data-force-font');
            el.removeAttribute('data-force-font-processed');
        });
    }

    // Check if extension is enabled
    function checkEnabled() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.get(['fontForceEnabled'], function(result) {
                isEnabled = result.fontForceEnabled !== false;
                if (isEnabled) {
                    applyFontForce();
                    startObserving();
                } else {
                    removeFontForce();
                    stopObserving();
                }
            });
        } else {
            applyFontForce();
            startObserving();
        }
    }

    // Apply font forcing (targeted)
    function applyFontForce() {
        if (!isEnabled) return;
        scanAndMarkTargetFonts();
        disableCustomFontFaces();
    }

    // Remove font forcing
    function removeFontForce() {
        const style = document.getElementById('force-font-style');
        if (style) style.remove();
        clearForceFontMarkers();
        restoreCustomFontFaces();
    }

    // Start observing dynamic changes
    function startObserving() {
        if (!isEnabled || observer) return;

        // Monitor body for new elements
        observer = new MutationObserver(function(mutations) {
            if (!isEnabled) return;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            scanAndMarkTargetFonts(node);
                            if (node.tagName === 'STYLE' ||
                                (node.tagName === 'LINK' && node.getAttribute('rel') === 'stylesheet')) {
                                disableCustomFontFaces();
                                if (node.tagName === 'LINK') {
                                    // cssRules is empty until the sheet finishes loading
                                    node.addEventListener('load', function() {
                                        if (isEnabled) setTimeout(disableCustomFontFaces, 0);
                                    }, { once: true });
                                }
                            }
                        }
                    });
                }
            });
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                if (isEnabled && observer && document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            });
        }

        // Throttle function
        function throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        // Throttled re-scan for CSS changes
        const throttledReapply = throttle(function() {
            clearForceFontMarkers();
            applyFontForce();
        }, 500);

        // Monitor head for CSS changes
        let headObserver = new MutationObserver(function(mutations) {
            if (!isEnabled) return;
            let cssChanged = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE &&
                            (node.tagName.toLowerCase() === 'style' ||
                             (node.tagName.toLowerCase() === 'link' && node.getAttribute('rel') === 'stylesheet'))) {
                            cssChanged = true;
                            if (node.tagName.toLowerCase() === 'link') {
                                // cssRules is empty until the sheet finishes loading
                                node.addEventListener('load', function() {
                                    if (isEnabled) setTimeout(disableCustomFontFaces, 0);
                                }, { once: true });
                            }
                        }
                    });
                } else if (mutation.type === 'characterData' || mutation.type === 'attributes') {
                    if (mutation.target.tagName && (
                        mutation.target.tagName.toLowerCase() === 'style' ||
                        (mutation.target.tagName.toLowerCase() === 'link' &&
                         mutation.target.getAttribute('rel') === 'stylesheet' &&
                         mutation.attributeName === 'href'))) {
                        cssChanged = true;
                    }
                }
            });
            if (cssChanged) {
                setTimeout(function() { throttledReapply(); }, 100);
            }
        });

        if (document.head) {
            headObserver.observe(document.head, {
                childList: true, subtree: true,
                characterData: true, attributes: true,
                attributeFilter: ['href', 'rel']
            });
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                if (isEnabled && document.head) {
                    headObserver.observe(document.head, {
                        childList: true, subtree: true,
                        characterData: true, attributes: true,
                        attributeFilter: ['href', 'rel']
                    });
                }
            });
        }

        // Catch stylesheets already present before the observers attached
        function initialDisablePass() {
            if (isEnabled) disableCustomFontFaces();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialDisablePass, { once: true });
        } else {
            initialDisablePass();
        }

        // Periodic re-scan
        if (!checkInterval) {
            checkInterval = setInterval(function() {
                if (isEnabled) applyFontForce();
            }, 3000);
        }

        window.__forceFontObservers = window.__forceFontObservers || [];
        window.__forceFontObservers.push(observer, headObserver);
    }

    // Stop observing
    function stopObserving() {
        if (observer) { observer.disconnect(); observer = null; }
        if (window.__forceFontObservers) {
            window.__forceFontObservers.forEach(function(obs) { obs.disconnect(); });
            window.__forceFontObservers = [];
        }
        if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
    }

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.action === 'toggleFontForce') {
                // Never apply on excluded sites, even if toggled from popup
                if (isSiteBlocked) {
                    sendResponse({ success: false, blocked: true });
                    return;
                }
                isEnabled = request.enabled;
                if (isEnabled) {
                    applyFontForce();
                    startObserving();
                } else {
                    removeFontForce();
                    stopObserving();
                }
                sendResponse({ success: true });
            }
        });
    }

    // Expose for testing
    window.__forceFontScript = {
        toggleEnabled: function(enabled) {
            if (isSiteBlocked) return;
            isEnabled = enabled;
            if (isEnabled) { applyFontForce(); startObserving(); }
            else { removeFontForce(); stopObserving(); }
        }
    };

    // Initialize: bail out entirely on excluded sites
    checkSiteBlocked(function(blocked) {
        isSiteBlocked = blocked;
        if (isSiteBlocked) return;
        checkEnabled();
    });
})();