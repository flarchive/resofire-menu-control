<?php

namespace Resofire\MenuControl;

use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Discovers nav item keys via two complementary mechanisms:
 *
 * 1. PHP file scan — reads each enabled extension's compiled forum.js and
 *    extracts keys from navItems extend() calls. Fast, works on first page
 *    load before any admin has visited the forum, but misses extensions that
 *    add nav items without using navItems extend (e.g. via custom routing).
 *
 * 2. JS runtime discovery — the forum JS reads extractText() on every
 *    rendered nav item and POSTs the real labels + keys to the settings API.
 *    These are stored in resofire-menu-control.labels and are the authoritative
 *    source for what actually appears in the sidebar. Keys found here are
 *    merged into the PHP-scanned list so extensions like Gamepedia that skip
 *    the navItems extend pattern are still included.
 *
 * In Flarum 2.x there is no ForumSerializer. This class is a plain service
 * whose two public methods are called directly from extend.php via the
 * ApiResource extender's ->fields() callback.
 */
class NavItemsSerializer
{
    private const CORE_KEYS     = ['allDiscussions'];
    private const CORE_LABELS   = ['allDiscussions' => 'All Discussions'];
    private const EXCLUDED_KEYS = ['separator', 'moreTags'];

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private ExtensionManager $extensions
    ) {}

    public function getNavKeys(): array
    {
        [$keys] = $this->getNavKeysAndLabels();
        return $keys;
    }

    public function getNavLabels(): array
    {
        [, $labels] = $this->getNavKeysAndLabels();
        return $labels;
    }

    private function getNavKeysAndLabels(): array
    {
        $enabledJson = $this->settings->get('extensions_enabled', '[]');

        // JS-discovered labels are the authoritative runtime source.
        // We always merge them in so extensions that skip navItems extend
        // (e.g. Gamepedia) appear as soon as an admin has visited the forum.
        $jsLabels = json_decode(
            $this->settings->get('resofire-menu-control.labels', '{}'), true
        ) ?? [];
        $jsDiscoveredKeys = array_keys($jsLabels);

        // Cache keyed on enabled-extensions hash + JS-discovered key count,
        // so the cache busts when either extensions change OR when new items
        // are discovered at runtime.
        $currentHash = md5($enabledJson) . '-v4-' . count($jsDiscoveredKeys);

        if ($this->settings->get('resofire-menu-control.discovered-for') === $currentHash) {
            $keys = json_decode(
                $this->settings->get('resofire-menu-control.known-keys', '[]'), true
            ) ?? [];
            if (!empty($keys)) {
                return [$keys, $this->buildLabels($keys, $jsLabels)];
            }
        }

        // PHP file scan — catches extensions that use standard navItems extend.
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

        // Merge JS-discovered keys — catches extensions that skip navItems extend.
        // Preserve the PHP-scanned order first, then append any extras.
        foreach ($jsDiscoveredKeys as $key) {
            if (!in_array($key, $keys, true) && $this->isValidNavKey($key)) {
                $keys[] = $key;
            }
        }

        $this->settings->set('resofire-menu-control.known-keys', json_encode($keys));
        $this->settings->set('resofire-menu-control.discovered-for', $currentHash);

        return [$keys, $this->buildLabels($keys, $jsLabels)];
    }

    private function buildLabels(array $keys, array $jsLabels = []): array
    {
        if (empty($jsLabels)) {
            $jsLabels = json_decode(
                $this->settings->get('resofire-menu-control.labels', '{}'), true
            ) ?? [];
        }

        $labels = self::CORE_LABELS;
        foreach ($keys as $key) {
            if (isset($jsLabels[$key]) && is_string($jsLabels[$key]) && $jsLabels[$key] !== '') {
                $labels[$key] = $jsLabels[$key];
            } else {
                $labels[$key] = $key;
            }
        }

        return $labels;
    }

    private function extractNavKeys(string $js): array
    {
        $keys    = [];
        $pattern = '/extend\s*\)\s*\([^,]+,\s*["\']navItems["\'][^,]*,\s*(?:function|\()[^{]*\{(.{0,3000}?)(?:\}\)|\},)/s';

        preg_match_all($pattern, $js, $matches);

        foreach ($matches[1] as $block) {
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
