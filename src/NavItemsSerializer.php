<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Discovers IndexPage nav item keys by scanning each enabled extension's
 * compiled js/dist/forum.js. Keys come from PHP scanning (server-side,
 * no forum visit needed). Labels come from JS extractText() discovery
 * (real rendered text — "Pick'em", "Awards" etc.) saved to the DB by
 * the forum JS after the first admin page load.
 */
class NavItemsSerializer
{
    private const CORE_KEYS   = ['allDiscussions'];
    private const CORE_LABELS = ['allDiscussions' => 'All Discussions'];
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
        $enabledJson = $this->settings->get('extensions_enabled', '[]');
        $currentHash = md5($enabledJson) . '-v2';

        // Return cached keys if extension set hasn't changed.
        if ($this->settings->get('resofire-menu-control.discovered-for') === $currentHash) {
            $keys = json_decode($this->settings->get('resofire-menu-control.known-keys', '[]'), true) ?? [];
            if (!empty($keys)) {
                // Always use the latest JS-saved labels — they have real display text.
                $labels = $this->buildLabels($keys);
                return [$keys, $labels];
            }
        }

        // Scan extension JS files for nav keys.
        $keys = self::CORE_KEYS;

        foreach ($this->extensions->getEnabledExtensions() as $extension) {
            $forumJs = $extension->getPath() . '/js/dist/forum.js';
            if (!file_exists($forumJs)) {
                continue;
            }
            foreach ($this->extractNavKeys(file_get_contents($forumJs)) as $key) {
                if (!in_array($key, $keys, true)) {
                    $keys[] = $key;
                }
            }
        }

        $this->settings->set('resofire-menu-control.known-keys', json_encode($keys));
        $this->settings->set('resofire-menu-control.discovered-for', $currentHash);

        return [$keys, $this->buildLabels($keys)];
    }

    /**
     * Build the labels array for the given keys.
     * Priority: JS-saved labels (real extractText output) > raw key as fallback.
     */
    private function buildLabels(array $keys): array
    {
        // JS-saved labels: real display text written by the forum JS after first admin visit.
        $jsLabels = json_decode(
            $this->settings->get('resofire-menu-control.labels', '{}'), true
        ) ?? [];

        $labels = self::CORE_LABELS;
        foreach ($keys as $key) {
            if (isset($jsLabels[$key]) && is_string($jsLabels[$key]) && $jsLabels[$key] !== '') {
                // Real label from JS (e.g. "Pick'em", "Leaderboard", "Awards")
                $labels[$key] = $jsLabels[$key];
            } else {
                // Fallback: raw key until the admin visits the forum index page
                $labels[$key] = $key;
            }
        }

        return $labels;
    }

    /**
     * Extract IndexPage navItems keys from compiled forum.js.
     * Skips UserPage.navItems blocks (which contain 'user.' route references).
     */
    private function extractNavKeys(string $js): array
    {
        $keys    = [];
        $pattern = '/["\']navItems["\'][\s,]*\(?function[^{]*\{(.{0,3000}?)(?:\}\)|\}\);\})/s';

        preg_match_all($pattern, $js, $matches);

        foreach ($matches[1] as $block) {
            // Skip UserPage nav items (likes, mentions, uploads etc.)
            if (preg_match('/["\']user\./', $block)) {
                continue;
            }
            preg_match_all('/\.add\(["\']([a-zA-Z][a-zA-Z0-9_-]*)["\'](?!\s*\+)/', $block, $keyMatches);
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
        if (preg_match('/^tag\d+$/', $key)) {
            return false;
        }
        return true;
    }
}
