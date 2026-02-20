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

        function wpmbCreateMarkerIconElement(iconUrl, iconSize) {
            var size = (iconSize && iconSize >= 16 && iconSize <= 128) ? iconSize : 40;
            var el = document.createElement('div');
            el.className = 'wpmb-marker-icon';
            var img = document.createElement('img');
            img.src = iconUrl;
            img.alt = '';
            img.width = size;
            img.height = size;
            el.appendChild(img);
            return el;
        }

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

            if (mapConfig.showNavControl) {
                map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            }

            if (mapConfig.marker && mapConfig.marker.enabled) {
                var marker;
                if (mapConfig.marker.iconUrl) {
                    var markerEl = wpmbCreateMarkerIconElement(mapConfig.marker.iconUrl, mapConfig.marker.iconSize);
                    marker = new mapboxgl.Marker({ element: markerEl }).setLngLat([mapConfig.lng, mapConfig.lat]);
                } else {
                    var markerOptions = {};
                    if (mapConfig.marker.color) {
                        markerOptions.color = mapConfig.marker.color;
                    }
                    marker = new mapboxgl.Marker(markerOptions).setLngLat([mapConfig.lng, mapConfig.lat]);
                }

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
                var defaultIconUrl = mapConfig.marker && mapConfig.marker.iconUrl;
                var defaultIconSize = mapConfig.marker && mapConfig.marker.iconSize;

                mapConfig.markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var extraMarker;
                    if (defaultIconUrl) {
                        var extraEl = wpmbCreateMarkerIconElement(defaultIconUrl, defaultIconSize);
                        extraMarker = new mapboxgl.Marker({ element: extraEl }).setLngLat([m.lng, m.lat]);
                    } else {
                        var extraOptions = {};
                        var markerColor = m.color || (mapConfig.marker && mapConfig.marker.color);
                        if (markerColor) {
                            extraOptions.color = markerColor;
                        }
                        extraMarker = new mapboxgl.Marker(extraOptions).setLngLat([m.lng, m.lat]);
                    }

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

            if (Array.isArray(mapConfig.cpt_markers) && mapConfig.cpt_markers.length) {
                var cptDefaultIconUrl = mapConfig.marker && mapConfig.marker.iconUrl;
                var cptDefaultIconSize = mapConfig.marker && mapConfig.marker.iconSize;
                var defaultColor = mapConfig.marker && mapConfig.marker.color;

                mapConfig.cpt_markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var cptMarker;
                    if (cptDefaultIconUrl) {
                        var cptEl = wpmbCreateMarkerIconElement(cptDefaultIconUrl, cptDefaultIconSize);
                        cptMarker = new mapboxgl.Marker({ element: cptEl }).setLngLat([m.lng, m.lat]);
                    } else {
                        var cptOptions = {};
                        if (defaultColor) {
                            cptOptions.color = defaultColor;
                        }
                        cptMarker = new mapboxgl.Marker(cptOptions).setLngLat([m.lng, m.lat]);
                    }

                    var cptTitle = m.title || '';
                    var cptText = m.text || '';
                    var cptUrl = m.url || '';
                    var cptHtml = '';

                    if (cptTitle) {
                        cptHtml += '<strong>' + cptTitle + '</strong>';
                    }

                    if (cptText) {
                        if (cptHtml) {
                            cptHtml += '<br>';
                        }
                        cptHtml += (cptText + '').replace(/\n/g, '<br>');
                    }

                    if (cptUrl) {
                        if (cptHtml) {
                            cptHtml += '<br>';
                        }
                        cptHtml += '<a href="' + (cptUrl ? (cptUrl + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '') + '">Voir la fiche</a>';
                    }

                    if (cptHtml) {
                        var cptPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(cptHtml);
                        cptMarker.setPopup(cptPopup);
                    }

                    cptMarker.addTo(map);
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

