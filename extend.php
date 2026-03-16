<?php

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use Resofire\MenuControl\NavItemsSerializer;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    // Serialize the saved order to the forum payload for the forum JS to use.
    (new Extend\Settings())
        ->serializeToForum('menuControlOrder', 'resofire-menu-control.order', function ($value) {
            return $value ?: null;
        }),

    // Serialize the PHP-computed nav key list to the forum/admin API payload.
    // NavItemsSerializer reads extensions_enabled from the DB and maps each enabled
    // extension ID to its known navItems key. This is authoritative — no JS timing issues.
    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attributes(NavItemsSerializer::class),
];
