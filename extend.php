<?php

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use Resofire\MenuControl\NavItemsSerializer;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/resources/less/forum.less'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Settings())
        ->serializeToForum('menuControlOrder', 'resofire-menu-control.order', function ($value) {
            return $value ?: null;
        })
        ->serializeToForum('menuControlFlip', 'resofire-menu-control.flip', function ($value) {
            return (bool) $value;
        })
        ->serializeToForum('menuControlSticky', 'resofire-menu-control.sticky', function ($value) {
            return (bool) $value;
        })
        ->serializeToForum('menuControlIcons', 'resofire-menu-control.icons', function ($value) {
            return $value ? json_decode($value, true) : (object)[];
        }),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attributes(NavItemsSerializer::class),
];
