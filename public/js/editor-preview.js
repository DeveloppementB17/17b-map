(function () {
    if (typeof wpmbEditorConfig === 'undefined') {
        return;
    }

    function initMaps() {
        if (typeof mapboxgl === 'undefined') {
            return;
        }

        var config = wpmbEditorConfig || {};
        var token = config.accessToken || '';
        var mapsConfig = config.maps || {};

        if (!token) {
            return;
        }

        mapboxgl.accessToken = token;

        var containers = document.querySelectorAll('.wpmb-map[data-map-id]');
        if (!containers.length) {
            return;
        }

        containers.forEach(function (container) {
            var id = parseInt(container.getAttribute('data-map-id'), 10) || 0;
            if (!id || !mapsConfig[id]) {
                return;
            }

            // Bloc wrapper dans l'éditeur (contient les styles Dimensions).
            var parentBlock = container.closest('[data-type="wpmb/mapbox-map"]');
            if (parentBlock && parentBlock.style && parentBlock.style.minHeight) {
                container.style.height = parentBlock.style.minHeight;
            } else {
                container.style.height = '';
            }

            var previousId = parseInt(container.getAttribute('data-wpmb-map-id') || '0', 10) || 0;

            // Si une instance existe déjà pour ce conteneur :
            if (container.wpmbMapInstance) {
                // 1) Si la carte sélectionnée n'a pas changé, on ne fait qu'un resize.
                if (previousId === id && typeof container.wpmbMapInstance.resize === 'function') {
                    container.wpmbMapInstance.resize();
                    return;
                }

                // 2) Si la carte a changé, on détruit l'instance précédente avant de recréer.
                if (typeof container.wpmbMapInstance.remove === 'function') {
                    container.wpmbMapInstance.remove();
                }
            }

            var mapConfig = mapsConfig[id];
            var zoom = mapConfig.zoom || 10;
            var style = mapConfig.style || 'mapbox://styles/mapbox/streets-v11';

            var map = new mapboxgl.Map({
                container: container,
                style: style,
                center: [mapConfig.lng, mapConfig.lat],
                zoom: zoom,
            });

            if (mapConfig.marker && mapConfig.marker.enabled) {
                var markerOptions = {};
                if (mapConfig.marker.color) {
                    markerOptions.color = mapConfig.marker.color;
                }

                var marker = new mapboxgl.Marker(markerOptions).setLngLat([mapConfig.lng, mapConfig.lat]);

                if (mapConfig.marker.title || mapConfig.marker.text) {
                    var title = mapConfig.marker.title || '';
                    var text = mapConfig.marker.text || '';
                    var html = '';

                    if (title) {
                        html += '<strong>' + title + '</strong>';
                    }

                    if (text) {
                        if (html) {
                            html += '<br>';
                        }
                        html += String(text).replace(/\n/g, '<br>');
                    }

                    var popup = new mapboxgl.Popup({ offset: 25 }).setHTML(html);
                    marker.setPopup(popup);
                }

                marker.addTo(map);
            }

            if (Array.isArray(mapConfig.markers) && mapConfig.markers.length) {
                mapConfig.markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var extraOptions = {};
                    var markerColor = m.color || (mapConfig.marker && mapConfig.marker.color);
                    if (markerColor) {
                        extraOptions.color = markerColor;
                    }

                    var extraMarker = new mapboxgl.Marker(extraOptions).setLngLat([m.lng, m.lat]);

                    if (m.title || m.text) {
                        var eTitle = m.title || '';
                        var eText = m.text || '';
                        var eHtml = '';

                        if (eTitle) {
                            eHtml += '<strong>' + eTitle + '</strong>';
                        }

                        if (eText) {
                            if (eHtml) {
                                eHtml += '<br>';
                            }
                            eHtml += String(eText).replace(/\n/g, '<br>');
                        }

                        var ePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(eHtml);
                        extraMarker.setPopup(ePopup);
                    }

                    extraMarker.addTo(map);
                });
            }

            container.wpmbMapInstance = map;
            container.setAttribute('data-wpmb-map-id', String(id));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMaps);
    } else {
        initMaps();
    }

    if (window.wp && window.wp.data && typeof window.wp.data.subscribe === 'function') {
        window.wp.data.subscribe(function () {
            initMaps();
        });
    }
})(); 

