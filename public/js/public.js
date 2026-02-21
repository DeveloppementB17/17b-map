(function () {
    if (typeof wpmbMapsConfig === 'undefined') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof mapboxgl === 'undefined') {
            return;
        }

        var config = wpmbMapsConfig || {};
        var token = config.accessToken || '';
        var mapsConfig = config.maps || {};

        if (!token) {
            return;
        }

        var containers = document.querySelectorAll('.wpmb-map[data-map-id]');
        if (!containers.length) {
            return;
        }

        mapboxgl.accessToken = token;

        function wpmbEscapeHtml(str) {
            return String(str).replace(/[&<>"']/g, function (s) {
                switch (s) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '"': return '&quot;';
                    case "'": return '&#039;';
                    default: return s;
                }
            });
        }

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

        function WpmbGeocoderControl(accessToken, onSelect) {
            this._token = accessToken;
            this._onSelect = onSelect || null;
            this._map = null;
            this._container = null;
            this._debounceTimer = null;
        }

        WpmbGeocoderControl.prototype.onAdd = function (map) {
            var self = this;
            this._map = map;
            this._container = document.createElement('div');
            this._container.className = 'mapboxgl-ctrl wpmb-geocoder-ctrl';

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'wpmb-geocoder-input';
            input.placeholder = 'Rechercher une adresse\u2026';
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('aria-label', 'Rechercher une adresse');

            var resultsList = document.createElement('ul');
            resultsList.className = 'wpmb-geocoder-results-list';

            ['mousedown', 'mousemove', 'wheel', 'touchstart', 'touchend'].forEach(function (evt) {
                self._container.addEventListener(evt, function (e) { e.stopPropagation(); });
            });

            input.addEventListener('input', function () {
                var query = input.value;
                if (self._debounceTimer) { clearTimeout(self._debounceTimer); }
                self._debounceTimer = setTimeout(function () {
                    self._search(query, resultsList, input);
                }, 350);
            });

            input.addEventListener('blur', function () {
                setTimeout(function () {
                    resultsList.style.display = 'none';
                }, 200);
            });

            resultsList.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });

            resultsList.addEventListener('click', function (e) {
                var li = e.target.closest('[data-lng]');
                if (!li) { return; }
                var lng = parseFloat(li.getAttribute('data-lng'));
                var lat = parseFloat(li.getAttribute('data-lat'));
                input.value = li.textContent || '';
                resultsList.style.display = 'none';
                map.flyTo({ center: [lng, lat], zoom: 14 });
                if (self._onSelect) { self._onSelect([lng, lat]); }
            });

            this._container.appendChild(input);
            this._container.appendChild(resultsList);
            return this._container;
        };

        WpmbGeocoderControl.prototype._search = function (query, resultsList, input) {
            var self = this;
            while (resultsList.firstChild) { resultsList.removeChild(resultsList.firstChild); }
            var trimmed = (query || '').trim();
            if (trimmed.length < 3) {
                resultsList.style.display = 'none';
                return;
            }
            var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
                encodeURIComponent(trimmed) +
                '.json?access_token=' + encodeURIComponent(self._token) +
                '&autocomplete=true&limit=5&language=fr';

            fetch(url)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    while (resultsList.firstChild) { resultsList.removeChild(resultsList.firstChild); }
                    if (!data || !Array.isArray(data.features) || !data.features.length) {
                        resultsList.style.display = 'none';
                        return;
                    }
                    data.features.forEach(function (f) {
                        if (!Array.isArray(f.center) || f.center.length < 2) { return; }
                        var li = document.createElement('li');
                        li.textContent = f.place_name || '';
                        li.setAttribute('data-lng', String(f.center[0]));
                        li.setAttribute('data-lat', String(f.center[1]));
                        resultsList.appendChild(li);
                    });
                    resultsList.style.display = resultsList.children.length ? 'block' : 'none';
                })
                .catch(function () {
                    resultsList.style.display = 'none';
                });
        };

        WpmbGeocoderControl.prototype.onRemove = function () {
            if (this._container && this._container.parentNode) {
                this._container.parentNode.removeChild(this._container);
            }
            this._map = null;
        };

        containers.forEach(function (container) {
            var id = parseInt(container.getAttribute('data-map-id'), 10) || 0;
            if (!id || !mapsConfig[id]) {
                return;
            }

            var mapConfig = mapsConfig[id];

            // Listing layout : récupère la colonne cards si elle existe
            var listingLayout = container.closest('.wpmb-layout--listing');
            var listingCol = listingLayout ? listingLayout.querySelector('.wpmb-listing-col') : null;

            if (!mapConfig.lat || !mapConfig.lng) {
                return;
            }

            var zoom = mapConfig.zoom || 10;
            var style = mapConfig.style || 'mapbox://styles/mapbox/streets-v11';

            // Si le bloc parent a une hauteur minimale définie via Gutenberg,
            // on applique cette valeur comme hauteur explicite du conteneur
            // pour que Mapbox ajuste correctement la taille du canvas.
            var parentBlock = container.closest('.wp-block-wpmb-mapbox-map');
            if (parentBlock && parentBlock.style && parentBlock.style.minHeight) {
                container.style.height = parentBlock.style.minHeight;
            }

            var map = new mapboxgl.Map({
                container: container,
                style: style,
                center: [mapConfig.lng, mapConfig.lat],
                zoom: zoom
            });

            if (mapConfig.showNavControl) {
                map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            }

            var geocoderLngLat = null;
            var geocoderSearchMarker = null;
            var routeSourceId = 'wpmb-route-src-' + id;
            var routeLayerId = 'wpmb-route-lyr-' + id;

            function wpmbClearRoute() {
                if (map.getLayer(routeLayerId)) { map.removeLayer(routeLayerId); }
                if (map.getSource(routeSourceId)) { map.removeSource(routeSourceId); }
                var prevInfo = container.querySelector('.wpmb-route-info');
                if (prevInfo) { prevInfo.remove(); }
            }

            function wpmbDrawRoute(originLngLat, destLngLat) {
                var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' +
                    originLngLat[0] + ',' + originLngLat[1] + ';' +
                    destLngLat[0] + ',' + destLngLat[1] +
                    '?geometries=geojson&overview=full&access_token=' + encodeURIComponent(token);

                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (!data.routes || !data.routes.length) { return; }
                        var route = data.routes[0];
                        var km = (route.distance / 1000).toFixed(1);
                        var mins = Math.round(route.duration / 60);

                        wpmbClearRoute();

                        map.addSource(routeSourceId, {
                            type: 'geojson',
                            data: { type: 'Feature', properties: {}, geometry: route.geometry }
                        });

                        map.addLayer({
                            id: routeLayerId,
                            type: 'line',
                            source: routeSourceId,
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#4264fb', 'line-width': 4, 'line-opacity': 0.85 }
                        });

                        var routeBounds = new mapboxgl.LngLatBounds();
                        route.geometry.coordinates.forEach(function (c) { routeBounds.extend(c); });
                        map.fitBounds(routeBounds, { padding: 80 });

                        var infoEl = container.querySelector('.wpmb-route-info');
                        if (!infoEl) {
                            infoEl = document.createElement('div');
                            infoEl.className = 'wpmb-route-info';
                            container.appendChild(infoEl);
                        }
                        infoEl.innerHTML =
                            '<span class="wpmb-route-distance">' + km + '\u00a0km</span>' +
                            '<span class="wpmb-route-sep">\u00b7</span>' +
                            '<span class="wpmb-route-duration">' + mins + '\u00a0min</span>' +
                            '<button class="wpmb-route-close" type="button" aria-label="Fermer l\u2019itin\u00e9raire">\u00d7</button>';
                    })
                    .catch(function () {});
            }

            if (mapConfig.geocoderEnabled && token) {
                map.addControl(new WpmbGeocoderControl(token, function (lngLat) {
                    geocoderLngLat = lngLat;
                    if (geocoderSearchMarker) { geocoderSearchMarker.remove(); }
                    geocoderSearchMarker = new mapboxgl.Marker({ color: '#4264fb', scale: 0.9 })
                        .setLngLat(lngLat)
                        .addTo(map);
                    wpmbClearRoute();
                }), 'top-left');
            }

            container.addEventListener('click', function (e) {
                var routeBtn = e.target && e.target.closest('.wpmb-route-btn');
                if (routeBtn) {
                    var popup = routeBtn.closest('.mapboxgl-popup');
                    if (popup) { popup.remove(); }
                    if (!geocoderLngLat) {
                        var hintEl = container.querySelector('.wpmb-route-info');
                        if (!hintEl) {
                            hintEl = document.createElement('div');
                            hintEl.className = 'wpmb-route-info wpmb-route-info--hint';
                            container.appendChild(hintEl);
                        }
                        hintEl.innerHTML =
                            '<span>Recherchez d\u2019abord une adresse dans le champ en haut</span>' +
                            '<button class="wpmb-route-close" type="button" aria-label="Fermer">\u00d7</button>';
                        return;
                    }
                    var destLng = parseFloat(routeBtn.getAttribute('data-dest-lng'));
                    var destLat = parseFloat(routeBtn.getAttribute('data-dest-lat'));
                    wpmbDrawRoute(geocoderLngLat, [destLng, destLat]);
                    return;
                }
                var closeBtn = e.target && e.target.closest('.wpmb-route-close');
                if (closeBtn) { wpmbClearRoute(); }
            });

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
                        html += '<strong>' + wpmbEscapeHtml(title) + '</strong>';
                    }

                    if (text) {
                        if (html) {
                            html += '<br>';
                        }
                        html += wpmbEscapeHtml(text).replace(/\n/g, '<br>');
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
                                pHtml += '<img src="' + wpmbEscapeHtml(props.image) + '" class="wpmb-popup-image" alt="">';
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
                                pHtml += '<a href="' + wpmbEscapeHtml(props.url) + '">Voir la fiche</a>';
                            }

                            if (mapConfig.geocoderEnabled) {
                                if (pHtml) { pHtml += '<br>'; }
                                pHtml += '<button class="wpmb-route-btn" type="button" data-dest-lng="' + coords[0] + '" data-dest-lat="' + coords[1] + '">\ud83d\udccd\u00a0Itin\u00e9raire depuis mon adresse</button>';
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
                                eHtml += '<strong>' + wpmbEscapeHtml(eTitle) + '</strong>';
                            }

                            if (eText) {
                                if (eHtml) {
                                    eHtml += '<br>';
                                }
                                eHtml += wpmbEscapeHtml(eText).replace(/\n/g, '<br>');
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
                            cptHtml += '<img src="' + wpmbEscapeHtml(cptImage) + '" class="wpmb-popup-image" alt="">';
                        }

                        if (cptTitle) {
                            cptHtml += '<strong>' + cptTitle + '</strong>';
                        }

                        if (cptText) {
                            if (cptTitle) {
                                cptHtml += '<br>';
                            }
                            cptHtml += cptText.replace(/\n/g, '<br>');
                        }

                        if (cptUrl) {
                            if (cptTitle || cptText) {
                                cptHtml += '<br>';
                            }
                            cptHtml += '<a href="' + wpmbEscapeHtml(cptUrl) + '">Voir la fiche</a>';
                        }

                        if (mapConfig.geocoderEnabled) {
                            if (cptHtml) { cptHtml += '<br>'; }
                            cptHtml += '<button class="wpmb-route-btn" type="button" data-dest-lng="' + m.lng + '" data-dest-lat="' + m.lat + '">\ud83d\udccd\u00a0Itin\u00e9raire depuis mon adresse</button>';
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

            // --- Interactions listing cards ↔ carte ---
            if (listingCol && mapConfig.showListing && Array.isArray(mapConfig.cpt_markers) && mapConfig.cpt_markers.length) {
                var cptMarkersData = mapConfig.cpt_markers;
                var openListingPopups = [];

                function wpmbCloseListingPopups() {
                    openListingPopups.forEach(function (p) { p.remove(); });
                    openListingPopups = [];
                }

                function wpmbActivateCard(card) {
                    listingCol.querySelectorAll('.wpmb-card').forEach(function (c) {
                        c.classList.remove('wpmb-card--active');
                    });
                    card.classList.add('wpmb-card--active');
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                // Construit le HTML de popup identique au marker CPT de la carte.
                function wpmbBuildCptPopupHtml(m) {
                    var pHtml = '';
                    if (m.image) {
                        pHtml += '<img src="' + wpmbEscapeHtml(m.image) + '" class="wpmb-popup-image" alt="">';
                    }
                    if (m.title) {
                        pHtml += '<strong>' + m.title + '</strong>';
                    }
                    if (m.text) {
                        if (m.title) { pHtml += '<br>'; }
                        pHtml += (m.text + '').replace(/\n/g, '<br>');
                    }
                    if (m.url) {
                        if (m.title || m.text) { pHtml += '<br>'; }
                        pHtml += '<a href="' + wpmbEscapeHtml(m.url) + '">Voir la fiche</a>';
                    }
                    if (mapConfig.geocoderEnabled) {
                        if (pHtml) { pHtml += '<br>'; }
                        pHtml += '<button class="wpmb-route-btn" type="button" data-dest-lng="' + m.lng + '" data-dest-lat="' + m.lat + '">\ud83d\udccd\u00a0Itin\u00e9raire depuis mon adresse</button>';
                    }
                    return pHtml;
                }

                listingCol.addEventListener('click', function (e) {
                    var btn = e.target && e.target.closest('.wpmb-card-locate');
                    if (!btn) { return; }
                    var card = btn.closest('.wpmb-card');
                    if (!card) { return; }
                    var idx = parseInt(card.getAttribute('data-marker-index'), 10);
                    var m = cptMarkersData[idx];
                    if (!m || !m.lat || !m.lng) { return; }

                    wpmbActivateCard(card);
                    wpmbCloseListingPopups();
                    map.flyTo({ center: [m.lng, m.lat], zoom: Math.max(map.getZoom(), 14) });

                    var pHtml = wpmbBuildCptPopupHtml(m);
                    if (pHtml) {
                        var p = new mapboxgl.Popup({ offset: 25 })
                            .setLngLat([m.lng, m.lat])
                            .setHTML(pHtml)
                            .addTo(map);
                        openListingPopups.push(p);
                    }
                });
            }
        });
    });
})();
