<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Invokable class used as an ApiSerializer->attributes() callback.
 * Computes the list of nav item keys by reading extensions_enabled from the DB,
 * mapping each enabled extension ID to its known navItems key(s).
 *
 * Injected by Laravel's container via ContainerUtil::wrapCallback.
 */
class NavItemsSerializer
{
    /**
     * Map of extension ID → nav item key(s) added to IndexPage.navItems.
     * Keys verified against each extension's source code where available.
     */
    private const NAV_KEY_MAP = [
        'flarum-tags'              => ['tags'],
        'flarum-subscriptions'     => ['following'],
        'fof-user-directory'       => ['fof-user-directory'],
        'fof-badges'               => ['fof-user-badges'],
        'fof-user-badges'          => ['fof-user-badges'],
        'huseyinfiliz-leaderboard' => ['leaderboard'],
        'huseyinfiliz-pickem'      => ['pickem'],
        'huseyinfiliz-gamepedia'   => ['gamepedia'],
        'huseyinfiliz-awards'      => ['awards'],
    ];

    public function __construct(
        private SettingsRepositoryInterface $settings
    ) {}

    /**
     * Called by ApiSerializer extender. Returns attributes to add to the forum payload.
     * Available in JS as app.forum.attribute('menuControlNavKeys').
     */
    public function __invoke(ForumSerializer $serializer): array
    {
        return [
            'menuControlNavKeys' => $this->computeNavKeys(),
        ];
    }

    private function computeNavKeys(): array
    {
        // Core always provides allDiscussions
        $keys = ['allDiscussions'];

        // Read enabled extensions from DB
        $enabledJson = $this->settings->get('extensions_enabled', '[]');
        $enabled = json_decode($enabledJson, true) ?? [];

        foreach ($enabled as $extId) {
            if (isset(self::NAV_KEY_MAP[$extId])) {
                foreach (self::NAV_KEY_MAP[$extId] as $navKey) {
                    if (!in_array($navKey, $keys, true)) {
                        $keys[] = $navKey;
                    }
                }
            }
        }

        // Merge any JS-discovered keys as fallback for unlisted extensions.
        $savedJson = $this->settings->get('resofire-menu-control.known-keys', '[]');
        $savedKeys = json_decode($savedJson, true) ?? [];
        foreach ($savedKeys as $k) {
            if (is_string($k) && $k !== '' && !in_array($k, $keys, true)) {
                $keys[] = $k;
            }
        }

        return $keys;
    }
}
