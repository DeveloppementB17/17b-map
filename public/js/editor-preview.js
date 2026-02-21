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

        function WpmbGeocoderControlEditor() {
            this._container = null;
        }

        WpmbGeocoderControlEditor.prototype.onAdd = function () {
            this._container = document.createElement('div');
            this._container.className = 'mapboxgl-ctrl wpmb-geocoder-ctrl wpmb-geocoder-ctrl--disabled';
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'wpmb-geocoder-input';
            input.placeholder = 'Rechercher une adresse\u2026';
            input.disabled = true;
            input.setAttribute('aria-label', 'Rechercher une adresse (actif en front-end)');
            this._container.appendChild(input);
            return this._container;
        };

        WpmbGeocoderControlEditor.prototype.onRemove = function () {
            if (this._container && this._container.parentNode) {
                this._container.parentNode.removeChild(this._container);
            }
        };

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

            if (mapConfig.geocoderEnabled) {
                map.addControl(new WpmbGeocoderControlEditor(), 'top-left');
            }

            var allMarkerCoords = [];

            if (mapConfig.marker && mapConfig.marker.enabled) {
                allMarkerCoords.push([mapConfig.lng, mapConfig.lat]);
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

            if (mapConfig.clustering) {
                var mainMarkerCoords = (mapConfig.marker && mapConfig.marker.enabled) ? [mapConfig.lng, mapConfig.lat] : null;
                map.on('load', function () {
                    var clusterFeatures = [];
                    var defaultMarkerColor = (mapConfig.marker && mapConfig.marker.color) || '#11b4da';
                    var defaultIconUrl = (mapConfig.marker && mapConfig.marker.iconUrl) || '';
                    var markerIconSize = (mapConfig.marker && mapConfig.marker.iconSize) || 40;

                    if (Array.isArray(mapConfig.markers)) {
                        mapConfig.markers.forEach(function (m) {
                            if (!m || !m.lat || !m.lng) {
                                return;
                            }
                            clusterFeatures.push({
                                type: 'Feature',
                                geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
                                properties: {
                                    title: m.title || '',
                                    text: m.text || '',
                                    url: '',
                                    image: '',
                                    color: m.color || defaultMarkerColor,
                                    iconUrl: defaultIconUrl
                                }
                            });
                        });
                    }

                    if (Array.isArray(mapConfig.cpt_markers)) {
                        mapConfig.cpt_markers.forEach(function (m) {
                            if (!m || !m.lat || !m.lng) {
                                return;
                            }
                            clusterFeatures.push({
                                type: 'Feature',
                                geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
                                properties: {
                                    title: m.title || '',
                                    text: m.text || '',
                                    url: m.url || '',
                                    image: m.image || '',
                                    color: m.color || defaultMarkerColor,
                                    iconUrl: m.iconUrl || defaultIconUrl
                                }
                            });
                        });
                    }

                    if (!clusterFeatures.length) {
                        return;
                    }

                    // Collecte les URLs d'icônes uniques sans présupposer leur chargement.
                    var iconUrlToId = {};
                    clusterFeatures.forEach(function (f) {
                        var url = f.properties.iconUrl;
                        if (url && !iconUrlToId[url]) {
                            iconUrlToId[url] = 'wpmb-icon-' + id + '-' + Object.keys(iconUrlToId).length;
                        }
                    });

                    var iconEntries = Object.keys(iconUrlToId).map(function (url) {
                        return { url: url, id: iconUrlToId[url] };
                    });

                    // Redimensionne une image HTMLImageElement à size×size via canvas.
                    function wpmbResizeImageData(img, size) {
                        var canvas = document.createElement('canvas');
                        canvas.width = size;
                        canvas.height = size;
                        canvas.getContext('2d').drawImage(img, 0, 0, size, size);
                        return canvas.getContext('2d').getImageData(0, 0, size, size);
                    }

                    function buildClusterLayers() {
                        var sourceId = 'wpmb-cluster-source-' + id;

                        map.addSource(sourceId, {
                            type: 'geojson',
                            data: { type: 'FeatureCollection', features: clusterFeatures },
                            cluster: true,
                            clusterMaxZoom: 14,
                            clusterRadius: 50
                        });

                        map.addLayer({
                            id: 'wpmb-clusters-' + id,
                            type: 'circle',
                            source: sourceId,
                            filter: ['has', 'point_count'],
                            paint: {
                                'circle-color': [
                                    'step', ['get', 'point_count'],
                                    '#51bbd6', 10, '#f1f075', 30, '#f28cb1'
                                ],
                                'circle-radius': [
                                    'step', ['get', 'point_count'],
                                    20, 10, 30, 30, 40
                                ]
                            }
                        });

                        map.addLayer({
                            id: 'wpmb-cluster-count-' + id,
                            type: 'symbol',
                            source: sourceId,
                            filter: ['has', 'point_count'],
                            layout: {
                                'text-field': '{point_count_abbreviated}',
                                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                                'text-size': 12
                            }
                        });

                        // Cercles pour les points sans icône chargée avec succès.
                        map.addLayer({
                            id: 'wpmb-unclustered-point-' + id,
                            type: 'circle',
                            source: sourceId,
                            filter: ['all', ['!', ['has', 'point_count']], ['!', ['has', 'iconImageId']]],
                            paint: {
                                'circle-color': ['coalesce', ['get', 'color'], '#11b4da'],
                                'circle-radius': 6,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#fff'
                            }
                        });

                        // Icônes pour les points dont l'image a bien été chargée.
                        map.addLayer({
                            id: 'wpmb-unclustered-icon-' + id,
                            type: 'symbol',
                            source: sourceId,
                            filter: ['all', ['!', ['has', 'point_count']], ['has', 'iconImageId']],
                            layout: {
                                'icon-image': ['get', 'iconImageId'],
                                'icon-size': 1,
                                'icon-allow-overlap': true,
                                'icon-ignore-placement': true
                            }
                        });

                        function wpmbClusterPopup(e) {
                            var coords = e.features[0].geometry.coordinates.slice();
                            var props = e.features[0].properties;
                            var pHtml = '';

                            if (props.image) {
                                pHtml += '<img src="' + (props.image + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" class="wpmb-popup-image" alt="">';
                            }
                            if (props.title) {
                                pHtml += '<strong>' + props.title + '</strong>';
                            }
                            if (props.text) {
                                if (props.title) {
                                    pHtml += '<br>';
                                }
                                pHtml += (props.text + '').replace(/\n/g, '<br>');
                            }
                            if (props.url) {
                                if (props.title || props.text) {
                                    pHtml += '<br>';
                                }
                                pHtml += '<a href="' + (props.url + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">Voir la fiche</a>';
                            }

                            if (pHtml) {
                                new mapboxgl.Popup()
                                    .setLngLat(coords)
                                    .setHTML(pHtml)
                                    .addTo(map);
                            }
                        }

                        map.on('click', 'wpmb-clusters-' + id, function (e) {
                            var features = map.queryRenderedFeatures(e.point, { layers: ['wpmb-clusters-' + id] });
                            var clusterId = features[0].properties.cluster_id;
                            map.getSource(sourceId).getClusterExpansionZoom(clusterId, function (err, zoom) {
                                if (err) {
                                    return;
                                }
                                map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
                            });
                        });

                        map.on('click', 'wpmb-unclustered-point-' + id, wpmbClusterPopup);
                        map.on('click', 'wpmb-unclustered-icon-' + id, wpmbClusterPopup);

                        ['wpmb-clusters-' + id, 'wpmb-unclustered-point-' + id, 'wpmb-unclustered-icon-' + id].forEach(function (layerId) {
                            map.on('mouseenter', layerId, function () { map.getCanvas().style.cursor = 'pointer'; });
                            map.on('mouseleave', layerId, function () { map.getCanvas().style.cursor = ''; });
                        });

                        if (mapConfig.fitBounds) {
                            var clusterBounds = new mapboxgl.LngLatBounds();
                            if (mainMarkerCoords) {
                                clusterBounds.extend(mainMarkerCoords);
                            }
                            clusterFeatures.forEach(function (f) {
                                clusterBounds.extend(f.geometry.coordinates);
                            });
                            if (!clusterBounds.isEmpty()) {
                                map.fitBounds(clusterBounds, { padding: 50, maxZoom: 16 });
                            }
                        }
                    }

                    if (!iconEntries.length) {
                        buildClusterLayers();
                        return;
                    }

                    // Charge les images, puis marque chaque feature uniquement si son image
                    // a bien été chargée. Les features sans image restent sur le layer circle.
                    var loadedCount = 0;
                    iconEntries.forEach(function (entry) {
                        map.loadImage(entry.url, function (err, img) {
                            if (!err && img) {
                                if (!map.hasImage(entry.id)) {
                                    try {
                                        var imageData = wpmbResizeImageData(img, markerIconSize);
                                        map.addImage(entry.id, imageData);
                                    } catch (e) {
                                        // Redimensionnement impossible (ex. SVG cross-origin) : on saute.
                                    }
                                }
                                if (map.hasImage(entry.id)) {
                                    clusterFeatures.forEach(function (f) {
                                        if (iconUrlToId[f.properties.iconUrl] === entry.id) {
                                            f.properties.iconImageId = entry.id;
                                        }
                                    });
                                }
                            }
                            loadedCount++;
                            if (loadedCount === iconEntries.length) {
                                buildClusterLayers();
                            }
                        });
                    });
                });
            } else {
                if (Array.isArray(mapConfig.markers) && mapConfig.markers.length) {
                    var defaultIconUrl = mapConfig.marker && mapConfig.marker.iconUrl;
                    var defaultIconSize = mapConfig.marker && mapConfig.marker.iconSize;

                    mapConfig.markers.forEach(function (m) {
                        if (!m || !m.lat || !m.lng) {
                            return;
                        }
                        allMarkerCoords.push([m.lng, m.lat]);

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
                        allMarkerCoords.push([m.lng, m.lat]);

                        var resolvedIconUrl = m.iconUrl || cptDefaultIconUrl;
                        var cptMarker;
                        if (resolvedIconUrl) {
                            var cptEl = wpmbCreateMarkerIconElement(resolvedIconUrl, cptDefaultIconSize);
                            cptMarker = new mapboxgl.Marker({ element: cptEl }).setLngLat([m.lng, m.lat]);
                        } else {
                            var cptOptions = {};
                            var resolvedColor = m.color || defaultColor;
                            if (resolvedColor) {
                                cptOptions.color = resolvedColor;
                            }
                            cptMarker = new mapboxgl.Marker(cptOptions).setLngLat([m.lng, m.lat]);
                        }

                        var cptTitle = m.title || '';
                        var cptText = m.text || '';
                        var cptUrl = m.url || '';
                        var cptImage = m.image || '';
                        var cptHtml = '';

                        if (cptImage) {
                            cptHtml += '<img src="' + (cptImage + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" class="wpmb-popup-image" alt="">';
                        }

                        if (cptTitle) {
                            cptHtml += '<strong>' + cptTitle + '</strong>';
                        }

                        if (cptText) {
                            if (cptTitle) {
                                cptHtml += '<br>';
                            }
                            cptHtml += (cptText + '').replace(/\n/g, '<br>');
                        }

                        if (cptUrl) {
                            if (cptTitle || cptText) {
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

                if (mapConfig.fitBounds && allMarkerCoords.length) {
                    var fitBds = new mapboxgl.LngLatBounds();
                    allMarkerCoords.forEach(function (c) { fitBds.extend(c); });
                    map.fitBounds(fitBds, { padding: 50, maxZoom: 16 });
                }
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

