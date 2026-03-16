<?php

namespace Resofire\MenuControl;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Serializes nav item keys and labels to the forum/admin API payload.
 *
 * Keys and labels come entirely from the DB — saved there by the forum JS
 * via the toArray() intercept, which fires after every extension has added
 * its items. This means keys are always the real values the extensions use,
 * not hardcoded guesses.
 *
 * On first install (before any forum visit), known-keys is empty and the
 * admin panel will prompt the admin to visit the forum index page first.
 */
class NavItemsSerializer
{
    public function __construct(
        private SettingsRepositoryInterface $settings
    ) {}

    public function __invoke(ForumSerializer $serializer): array
    {
        // Keys discovered at runtime by forum JS and saved to DB.
        $keysJson  = $this->settings->get('resofire-menu-control.known-keys', '[]');
        $labelsJson = $this->settings->get('resofire-menu-control.labels', '{}');

        $keys   = json_decode($keysJson,   true) ?? [];
        $labels = json_decode($labelsJson, true) ?? [];

        return [
            'menuControlNavKeys'   => array_values(array_filter($keys, 'is_string')),
            'menuControlNavLabels' => is_array($labels) ? $labels : [],
        ];
    }
}
