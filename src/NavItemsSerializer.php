<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Discovers nav item keys by scanning each enabled extension's compiled
 * js/dist/forum.js for items.add() calls inside navItems extend blocks.
 *
 * This runs entirely server-side — no forum page visit required.
 * Results are cached in the settings table and refreshed whenever the
 * set of enabled extensions changes.
 */
class NavItemsSerializer
{
    /** Keys that are always present from core, regardless of extensions. */
    private const CORE_KEYS = ['allDiscussions'];

    /** Keys that are structural (separators, dynamic tag links) — always excluded. */
    private const EXCLUDED_KEYS = ['separator', 'moreTags'];

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private ExtensionManager $extensions
    ) {}

    public function __invoke(ForumSerializer $serializer): array
    {
        [$keys, $labels] = $this->getNavKeysAndLabels();

        return [
            'menuControlNavKeys'   => $keys,
            'menuControlNavLabels' => $labels,
        ];
    }

    private function getNavKeysAndLabels(): array
    {
        // Cache key includes the current extensions_enabled value so we
        // auto-refresh whenever extensions are enabled or disabled.
        $enabledJson = $this->settings->get('extensions_enabled', '[]');
        $cacheKey    = 'resofire-menu-control.discovered-for:' . md5($enabledJson);

        // Check if our cached discovery still matches the current extension set.
        $cachedFor = $this->settings->get('resofire-menu-control.discovered-for', '');
        $cachedKeys = $this->settings->get('resofire-menu-control.known-keys', '[]');

        if ($cachedFor === md5($enabledJson) && $cachedKeys !== '[]') {
            $keys   = json_decode($cachedKeys, true) ?? [];
            $labels = json_decode($this->settings->get('resofire-menu-control.labels', '{}'), true) ?? [];
            return [$keys, $labels];
        }

        // Re-scan extension JS files.
        $keys   = self::CORE_KEYS;
        $labels = ['allDiscussions' => 'All Discussions'];

        foreach ($this->extensions->getEnabledExtensions() as $extension) {
            $forumJs = $extension->getPath() . '/js/dist/forum.js';
            if (!file_exists($forumJs)) {
                continue;
            }

            $discovered = $this->extractNavKeys(file_get_contents($forumJs));
            foreach ($discovered as $key) {
                if (!in_array($key, $keys, true)) {
                    $keys[]        = $key;
                    // Use the extension title as a fallback label; JS-saved
                    // labels (with real text) will override this if present.
                    $labels[$key]  = $key;
                }
            }
        }

        // Merge any JS-discovered labels (the real display text from extractText()).
        $jsLabels = json_decode(
            $this->settings->get('resofire-menu-control.labels', '{}'), true
        ) ?? [];
        foreach ($jsLabels as $k => $v) {
            if (in_array($k, $keys, true) && is_string($v) && $v !== '') {
                $labels[$k] = $v;
            }
        }

        // Persist so we don't re-scan on every request.
        $this->settings->set('resofire-menu-control.known-keys', json_encode($keys));
        $this->settings->set('resofire-menu-control.discovered-for', md5($enabledJson));

        return [$keys, $labels];
    }

    /**
     * Extract navItems keys from a compiled forum.js file.
     *
     * Looks for the pattern:  "navItems", function(...){ ... o.add("key", ...
     * Excludes concatenated keys like  o.add("tag" + id, ...)
     * Excludes structural keys (separator, moreTags) and tag\d+ patterns.
     */
    private function extractNavKeys(string $js): array
    {
        $keys = [];

        // Match navItems extend/override blocks in minified JS.
        // The block after the function opening brace can be up to ~3000 chars.
        preg_match_all(
            '/"navItems"\s*,\s*\(?function[^{]*\{(.{0,3000}?)(?:\}\)|\}\);\})/s',
            $js,
            $matches
        );

        foreach ($matches[1] as $block) {
            // Find .add("key", where key is NOT followed by + (not a concatenation)
            preg_match_all('/\.add\("([a-zA-Z][a-zA-Z0-9_-]*)"\s*(?!\+)/', $block, $keyMatches);
            foreach ($keyMatches[1] as $key) {
                if ($this->isValidNavKey($key) && !in_array($key, $keys, true)) {
                    $keys[] = $key;
                }
            }
        }

        return $keys;
    }

    private function isValidNavKey(string $key): bool
    {
        if (in_array($key, self::EXCLUDED_KEYS, true)) {
            return false;
        }
        // Exclude tag1, tag2, tag3... etc.
        if (preg_match('/^tag\d+$/', $key)) {
            return false;
        }
        return true;
    }
}
