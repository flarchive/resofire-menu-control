<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Discovers IndexPage nav item keys by scanning each enabled extension's
 * compiled js/dist/forum.js for items.add() calls inside navItems extend
 * blocks that target the forum index (not user profile pages).
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
        $currentHash = md5($enabledJson) . '-v2';  // bump to bust stale cache

        if ($this->settings->get('resofire-menu-control.discovered-for') === $currentHash) {
            $keys   = json_decode($this->settings->get('resofire-menu-control.known-keys', '[]'), true) ?? [];
            $labels = json_decode($this->settings->get('resofire-menu-control.labels', '{}'), true) ?? [];
            if (!empty($keys)) {
                return [$keys, $labels];
            }
        }

        $keys   = self::CORE_KEYS;
        $labels = self::CORE_LABELS;

        foreach ($this->extensions->getEnabledExtensions() as $extension) {
            $forumJs = $extension->getPath() . '/js/dist/forum.js';
            if (!file_exists($forumJs)) {
                continue;
            }

            foreach ($this->extractNavKeys(file_get_contents($forumJs)) as $key) {
                if (!in_array($key, $keys, true)) {
                    $keys[]       = $key;
                    $labels[$key] = $key;
                }
            }
        }

        // Apply real display labels saved by the forum JS (extractText output).
        $jsLabels = json_decode($this->settings->get('resofire-menu-control.labels', '{}'), true) ?? [];
        foreach ($jsLabels as $k => $v) {
            if (in_array($k, $keys, true) && is_string($v) && $v !== '') {
                $labels[$k] = $v;
            }
        }

        $this->settings->set('resofire-menu-control.known-keys', json_encode($keys));
        $this->settings->set('resofire-menu-control.discovered-for', $currentHash);

        return [$keys, $labels];
    }

    /**
     * Extract IndexPage navItems keys from a compiled forum.js.
     *
     * Key insight: extensions that add items to UserPage.navItems (likes,
     * mentions, uploads) use routes like 'user.likes', 'user.mentions' etc.
     * Extensions adding to IndexPage.navItems use routes like 'index',
     * 'tags', 'following' — none contain 'user.'.
     * We skip any navItems block that references a 'user.' route.
     */
    private function extractNavKeys(string $js): array
    {
        $keys    = [];
        $pattern = '/["\']navItems["\'][\s,]*\(?function[^{]*\{(.{0,3000}?)(?:\}\)|\}\);\})/s';

        preg_match_all($pattern, $js, $matches);

        foreach ($matches[1] as $block) {
            // Skip UserPage.navItems blocks — they contain 'user.' route names.
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
