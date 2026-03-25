<?php

use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema\Attribute;
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
        })
        ->serializeToForum('menuControlCustomIcons', 'resofire-menu-control.custom-icons', function ($value) {
            return $value ? json_decode($value, true) : (object)[];
        })
        ->serializeToForum('menuControlHighlighted', 'resofire-menu-control.highlighted', function ($value) {
            return $value ? json_decode($value, true) : [];
        })
        ->serializeToForum('menuControlHighlightColor', 'resofire-menu-control.highlight-color', function ($value) {
            return $value ?: null;
        })
        ->serializeToForum('menuControlCustomLinks', 'resofire-menu-control.custom-links', function ($value) {
            return $value ? json_decode($value, true) : [];
        }),

    // Inject PHP-computed nav keys and labels into the forum API payload.
    // In Flarum 2.x, ForumSerializer is replaced by ForumResource. The
    // ->fields() closure is called with zero arguments by ApiResource::extend(),
    // so NavItemsSerializer is resolved from the container at call-time via
    // app(), which is the standard pattern for zero-arity extender closures.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(function () {
            $serializer = app(NavItemsSerializer::class);

            return [
                Attribute::make('menuControlNavKeys')
                    ->get(fn () => $serializer->getNavKeys()),

                Attribute::make('menuControlNavLabels')
                    ->get(fn () => $serializer->getNavLabels()),
            ];
        }),
];
