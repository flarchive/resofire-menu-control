<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Discovers nav item keys by scanning each enabled extension's compiled
 * js/dist/forum.js for items.add() calls inside navItems extend blocks.
 *
 * This is entirely server-side — no forum page visit required.
 * Results are cached and only re-scanned when extensions_enabled changes.
 */
class NavItemsSerializer
{
    private const CORE_KEYS = ['allDiscussions'];

    private const CORE_LABELS = ['allDiscussions' => 'All Discussions'];

    /** Keys that are structural/dynamic — always excluded. */
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
        $currentHash = md5($enabledJson);

        // Return cached result if the extension set hasn't changed.
        if ($this->settings->get('resofire-menu-control.discovered-for') === $currentHash) {
            $keys   = json_decode($this->settings->get('resofire-menu-control.known-keys', '[]'), true) ?? [];
            $labels = json_decode($this->settings->get('resofire-menu-control.labels', '{}'), true) ?? [];
            if (!empty($keys)) {
                return [$keys, $labels];
            }
        }

        // Scan each enabled extension's forum.js for navItems keys.
        $keys   = self::CORE_KEYS;
        $labels = self::CORE_LABELS;

        foreach ($this->extensions->getEnabledExtensions() as $extension) {
            $forumJs = $extension->getPath() . '/js/dist/forum.js';
            if (!file_exists($forumJs)) {
                continue;
            }

            foreach ($this->extractNavKeys(file_get_contents($forumJs)) as $key) {
                if (!in_array($key, $keys, true)) {
                    $keys[]        = $key;
                    $labels[$key]  = $key; // raw key as fallback label
                }
            }
        }

        // Apply any JS-saved display labels (the real human-readable text).
        $jsLabels = json_decode(
            $this->settings->get('resofire-menu-control.labels', '{}'), true
        ) ?? [];
        foreach ($jsLabels as $k => $v) {
            if (in_array($k, $keys, true) && is_string($v) && $v !== '') {
                $labels[$k] = $v;
            }
        }

        // Cache results keyed to current extension set.
        $this->settings->set('resofire-menu-control.known-keys', json_encode($keys));
        $this->settings->set('resofire-menu-control.discovered-for', $currentHash);

        return [$keys, $labels];
    }

    /**
     * Extract navItems keys from compiled forum.js content.
     * Handles both single and double quoted strings in minified JS.
     */
    private function extractNavKeys(string $js): array
    {
        $keys = [];

        // Match navItems extend/override blocks — both quote styles.
        // The block after { can be long in minified code (~3000 chars is safe).
        $pattern = '/["\']navItems["\'][\s,]*\(?function[^{]*\{(.{0,3000}?)(?:\}\)|\}\);\})/s';
        preg_match_all($pattern, $js, $matches);

        foreach ($matches[1] as $block) {
            // Match .add("key" or .add('key') — but NOT .add("key"+ or .add('key'+
            // (the + guard excludes string concatenations like "tag" + id)
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
