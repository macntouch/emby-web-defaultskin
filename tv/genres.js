﻿define(['cardBuilder', 'imageLoader', 'loading', 'connectionManager', 'apphost', 'layoutManager', 'scrollHelper', 'focusManager', 'lazyLoader', 'globalize', 'dom', 'emby-itemscontainer', 'emby-scroller'], function (cardBuilder, imageLoader, loading, connectionManager, appHost, layoutManager, scrollHelper, focusManager, lazyLoader, globalize, dom) {
    'use strict';

    function GenresTab(view, params) {
        this.view = view;
        this.params = params;
        this.apiClient = connectionManager.getApiClient(params.serverId);

        initEvents(view, params, this.apiClient);
    }

    function initEvents(view, params, apiClient) {

        dom.addEventListener(view, 'click', function (e) {

            var btnMoreFromGenre = dom.parentWithClass(e.target, 'btnMoreFromGenre');
            if (btnMoreFromGenre) {
                var id = btnMoreFromGenre.getAttribute('data-id');

                Emby.Page.showItem(id, apiClient.serverId(), {
                    parentId: params.parentId
                });
            }

        }, {
            passive: true
        });
    }

    function enableScrollX() {
        return !layoutManager.tv;
    }

    function getThumbShape() {
        return enableScrollX() ? 'overflowBackdrop' : 'backdrop';
    }

    function getPortraitShape() {
        return enableScrollX() ? 'overflowPortrait' : 'portrait';
    }

    function renderGenresAsVerticalCategories(instance, view, items) {

        var html = '';

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            html += '<div class="verticalSection">';

            html += '<div class="flex align-items-center padded-left">';
            html += '<h2 class="sectionTitle sectionTitle-cards">';
            html += item.Name;
            html += '</h2>';
            html += '<button style="margin-left:1.5em;" is="emby-button" type="button" class="raised more raised-mini btnMoreFromGenre btnMoreFromGenre' + item.Id + '" data-id="' + item.Id + '">';
            html += '<span>' + globalize.translate('More') + '</span>';
            html += '</button>';
            html += '</div>';

            html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="card" data-horizontal="true">';
            html += '<div is="emby-itemscontainer" class="itemsContainer lazy scrollSlider focuscontainer-x padded-left padded-right" data-id="' + item.Id + '">';
            html += '</div>';

            html += '</div>';

            html += '</div>';
        }

        view.innerHTML = html;

        lazyLoader.lazyChildren(view, fillItemsContainer.bind(instance));
    }

    function fillItemsContainer(elem) {

        var id = elem.getAttribute('data-id');

        var viewStyle = 'Poster';

        var limit = viewStyle === 'Thumb' || viewStyle === 'ThumbCard' ?
            5 :
            8;

        if (enableScrollX()) {
            limit = layoutManager.tv ? 7 : 10;
        }

        var enableImageTypes = viewStyle === 'Thumb' || viewStyle === 'ThumbCard' ?
          "Primary,Backdrop,Thumb" :
          "Primary";

        var query = {
            SortBy: "SortName",
            SortOrder: "Ascending",
            IncludeItemTypes: "Series",
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,MediaSourceCount,BasicSyncInfo",
            ImageTypeLimit: 1,
            EnableImageTypes: enableImageTypes,
            Limit: limit,
            GenreIds: id,
            EnableTotalRecordCount: false,
            ParentId: this.params.parentId
        };

        var apiClient = this.apiClient;

        apiClient.getItems(apiClient.getCurrentUserId(), query).then(function (result) {

            var supportsImageAnalysis = appHost.supports('imageanalysis');

            var showMoreButton = result.Items.length >= query.Limit;

            if (viewStyle === "Thumb") {
                cardBuilder.buildCards(result.Items, {
                    itemsContainer: elem,
                    shape: getThumbShape(),
                    preferThumb: true,
                    showTitle: true,
                    scalable: true,
                    centerText: true,
                    overlayMoreButton: true,
                    allowBottomPadding: false
                });
            }
            else if (viewStyle === "ThumbCard") {

                cardBuilder.buildCards(result.Items, {
                    itemsContainer: elem,
                    shape: getThumbShape(),
                    preferThumb: true,
                    showTitle: true,
                    scalable: true,
                    centerText: false,
                    cardLayout: true,
                    vibrant: supportsImageAnalysis,
                    showSeriesYear: true
                });
            }
            else if (viewStyle === "PosterCard") {
                cardBuilder.buildCards(result.Items, {
                    itemsContainer: elem,
                    shape: getPortraitShape(),
                    showTitle: true,
                    scalable: true,
                    centerText: false,
                    cardLayout: true,
                    vibrant: supportsImageAnalysis,
                    showSeriesYear: true
                });
            }
            else if (viewStyle === "Poster") {
                cardBuilder.buildCards(result.Items, {
                    itemsContainer: elem,
                    shape: getPortraitShape(),
                    scalable: true,
                    overlayMoreButton: true,
                    allowBottomPadding: !enableScrollX()
                });
            }
        });
    }

    function renderGenres(instance, view, items, parentId) {

        view.classList.add('padded-left');
        view.classList.add('padded-right');

        view.innerHTML = '<div is="emby-itemscontainer" class="itemsContainer vertical-wrap focuscontainer-x"></div>';

        var container = view.querySelector('.itemsContainer');

        cardBuilder.buildCards(items, {
            itemsContainer: container,
            items: items,
            shape: "auto",
            centerText: true,
            showTitle: true,
            coverImage: true,
            parentId: parentId
        });
    }

    GenresTab.prototype.onBeforeShow = function (options) {

        var apiClient = this.apiClient;

        if (!options.refresh) {
            this.promises = null;
            return;
        }

        var promises = [];
        var parentId = this.params.parentId;

        promises.push(apiClient.getGenres(apiClient.getCurrentUserId(), {

            SortBy: "SortName",
            SortOrder: "Ascending",
            IncludeItemTypes: "Series",
            Recursive: true,
            EnableTotalRecordCount: false,
            EnableImageTypes: "Primary",
            ImageTypeLimit: 1,
            Fields: "PrimaryImageAspectRatio",
            parentId: parentId
        }));

        this.promises = promises;
    };

    GenresTab.prototype.onShow = function (options) {

        var promises = this.promises;
        if (!promises) {
            return;
        }

        this.promises = [];

        var view = this.view;
        var instance = this;
        var parentId = this.params.parentId;

        promises[0].then(function (result) {

            if (enableScrollX()) {
                return renderGenresAsVerticalCategories(instance, view, result.Items);
            }
            return renderGenres(instance, view, result.Items, parentId);
        });

        Promise.all(promises).then(function () {
            if (options.autoFocus) {
                focusManager.autoFocus(view);
            }
        });
    };

    GenresTab.prototype.onHide = function () {

    };

    GenresTab.prototype.destroy = function () {

        this.view = null;
        this.params = null;
        this.apiClient = null;
        this.promises = null;
    };

    return GenresTab;
});