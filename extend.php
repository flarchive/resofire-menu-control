<?php

use Flarum\Extend;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Settings())
        // The admin-saved item order (JSON array of keys)
        ->serializeToForum('menuControlOrder', 'resofire-menu-control.order', function ($value) {
            return $value ?: null;
        })
        // All nav keys ever discovered (JSON array of keys), used by admin UI
        ->serializeToForum('menuControlKnownKeys', 'resofire-menu-control.known-keys', function ($value) {
            return $value ?: null;
        }),
];
