(function (blocks, element, components, data) {
    const { registerBlockType } = blocks;
    const { createElement: el, Fragment } = element;
    const { SelectControl, Spinner } = components;
    const { useSelect } = data;

    registerBlockType('wpmb/mapbox-map', {
        title: 'Carte Mapbox',
        icon: 'location-alt',
        category: 'widgets',
        supports: {
            align: ['wide', 'full'],
            spacing: {
                margin: true,
                padding: true,
            },
            dimensions: {
                minHeight: true,
            },
        },
        attributes: {
            mapId: {
                type: 'number',
                default: 0,
            },
        },
        edit: function (props) {
            const maps = useSelect(
                function (select) {
                    return select('core').getEntityRecords('postType', 'mapbox_map', {
                        per_page: -1,
                    }) || [];
                },
                []
            );

            if (!maps) {
                return el(Spinner, null);
            }

            const options = [
                { label: 'Sélectionne une carte…', value: 0 },
            ].concat(
                maps.map(function (map) {
                    const title = map.title && map.title.rendered ? map.title.rendered : '#' + map.id;
                    return {
                        label: title,
                        value: map.id,
                    };
                })
            );

            const selectedMap = maps.find(function (map) {
                return map.id === props.attributes.mapId;
            });

            return el(
                Fragment,
                null,
                el(
                    'div',
                    { className: props.className },
                    el(SelectControl, {
                        label: 'Carte Mapbox',
                        value: props.attributes.mapId,
                        options: options,
                        onChange: function (value) {
                            const intValue = parseInt(value, 10) || 0;
                            props.setAttributes({ mapId: intValue });
                        },
                    }),
                    props.attributes.mapId
                        ? el(
                              'div',
                              { className: 'wpmb-block-preview' },
                              el(
                                  'p',
                                  null,
                                  'Prévisualisation de la carte : ',
                                  selectedMap && selectedMap.title && selectedMap.title.rendered
                                      ? selectedMap.title.rendered
                                      : '#' + props.attributes.mapId
                              ),
                              el('div', {
                                  className: 'wpmb-map wpmb-map-preview',
                                  'data-map-id': props.attributes.mapId,
                              })
                          )
                        : null
                )
            );
        },
        save: function () {
            return null; // Rendu dynamique côté PHP.
        },
    });
})(
    window.wp.blocks,
    window.wp.element,
    window.wp.components,
    window.wp.data
);

