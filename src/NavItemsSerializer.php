<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Invokable ApiSerializer attributes callback.
 * Reads extensions_enabled from DB and maps to nav item keys + display labels.
 */
class NavItemsSerializer
{
    /**
     * Map of extension ID → [navItemKey, displayLabel]
     * Keys verified from runtime discovery (admin panel screenshots).
     */
    private const NAV_KEY_MAP = [
        'flarum-tags'              => [['tags',              'Tags']],
        'flarum-subscriptions'     => [['following',         'Following']],
        'fof-user-directory'       => [['fof-user-directory','User Directory']],
        'fof-badges'               => [['fof-user-badges',   'Badges']],
        'fof-user-badges'          => [['fof-user-badges',   'Badges']],
        'huseyinfiliz-leaderboard' => [['leaderboard',       'Leaderboard']],
        'huseyinfiliz-pickem'      => [['pickem',            "Pick'em"]],
        'huseyinfiliz-gamepedia'   => [['gamepedia',         'Gamepedia']],
        'huseyinfiliz-awards'      => [['awards',            'Awards']],
    ];

    /** Labels for keys that always exist regardless of extensions */
    private const CORE_LABELS = [
        'allDiscussions' => 'All Discussions',
    ];

    public function __construct(
        private SettingsRepositoryInterface $settings
    ) {}

    public function __invoke(ForumSerializer $serializer): array
    {
        [$keys, $labels] = $this->computeNavKeysAndLabels();

        return [
            'menuControlNavKeys'   => $keys,
            'menuControlNavLabels' => $labels,
        ];
    }

    private function computeNavKeysAndLabels(): array
    {
        $keys   = ['allDiscussions'];
        $labels = self::CORE_LABELS;

        $enabledJson = $this->settings->get('extensions_enabled', '[]');
        $enabled = json_decode($enabledJson, true) ?? [];

        foreach ($enabled as $extId) {
            if (!isset(self::NAV_KEY_MAP[$extId])) {
                continue;
            }
            foreach (self::NAV_KEY_MAP[$extId] as [$navKey, $label]) {
                if (!in_array($navKey, $keys, true)) {
                    $keys[]         = $navKey;
                    $labels[$navKey] = $label;
                }
            }
        }

        // Merge JS-discovered keys as fallback for unknown/unlisted extensions.
        // These come from previous JS-side discovery saves.
        $savedJson = $this->settings->get('resofire-menu-control.known-keys', '[]');
        $savedKeys = json_decode($savedJson, true) ?? [];
        foreach ($savedKeys as $k) {
            if (is_string($k) && $k !== '' && !in_array($k, $keys, true)) {
                $keys[] = $k;
                // No label known — JS will fall back to showing the raw key
            }
        }

        return [$keys, $labels];
    }
}
