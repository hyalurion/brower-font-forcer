// Shared site blocklist for Font Standardizer.
// Loaded by both the content script and the popup so both sides
// always evaluate the exact same list.
//
// Excluded sites keep their own fonts untouched. AI chat apps such as
// ChatGPT and Claude rely on carefully tuned font stacks, so forcing
// system-ui there breaks their typography and readability.
(function(global) {
    'use strict';

    // Default blocked domains. Subdomains are matched automatically
    // (e.g. "chatgpt.com" also excludes "api.chatgpt.com").
    var DEFAULT_BLOCKED_DOMAINS = [
        'chatgpt.com',  // ChatGPT
        'claude.ai'     // Claude
    ];

    // Check whether a hostname matches the default blocklist.
    // Optionally accepts an array of extra (user-defined) domains.
    function isBlockedHostname(hostname, extraDomains) {
        if (!hostname) return false;
        var host = String(hostname).toLowerCase().trim().replace(/\.$/, '');
        if (!host) return false;
        var domains = DEFAULT_BLOCKED_DOMAINS.concat(
            Array.isArray(extraDomains) ? extraDomains : []
        );
        return domains.some(function(domain) {
            var d = String(domain || '').toLowerCase().trim().replace(/\.$/, '');
            if (!d) return false;
            return host === d || host.slice(-(d.length + 1)) === '.' + d;
        });
    }

    global.FontForceBlocklist = {
        DEFAULT_BLOCKED_DOMAINS: DEFAULT_BLOCKED_DOMAINS,
        isBlockedHostname: isBlockedHostname
    };
})(typeof window !== 'undefined' ? window : this);
