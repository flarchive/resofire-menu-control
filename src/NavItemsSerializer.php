<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

class NavItemsSerializer
{
    /**
     * Map of extension ID → [[navItemKey, displayLabel], ...]
     * Keys verified from live console output on the actual install.
     */
    private const NAV_KEY_MAP = [
        'flarum-tags'              => [['tags',                   'Tags']],
        'flarum-subscriptions'     => [['following',              'Following']],
        'fof-user-directory'       => [['fof-user-directory',     'User Directory']],
        // Actual key observed in console: 'badges' (not 'fof-user-badges')
        'fof-badges'               => [['badges',                 'Badges']],
        'fof-user-badges'          => [['badges',                 'Badges']],
        // Actual key observed in console: 'huseyinfiliz-leaderboard' (not 'leaderboard')
        'huseyinfiliz-leaderboard' => [['huseyinfiliz-leaderboard', 'Leaderboard']],
        'huseyinfiliz-pickem'      => [['huseyinfiliz-pickem',    "Pick'em"]],
        'huseyinfiliz-gamepedia'   => [['huseyinfiliz-gamepedia', 'Gamepedia']],
        'huseyinfiliz-awards'      => [['huseyinfiliz-awards',    'Awards']],
    ];

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
                    $keys[]          = $navKey;
                    $labels[$navKey] = $label;
                }
            }
        }

        // Merge JS-discovered keys as fallback for unknown extensions.
        $savedJson = $this->settings->get('resofire-menu-control.known-keys', '[]');
        $savedKeys = json_decode($savedJson, true) ?? [];
        foreach ($savedKeys as $k) {
            if (is_string($k) && $k !== '' && !in_array($k, $keys, true)) {
                $keys[] = $k;
            }
        }

        return [$keys, $labels];
    }
}
