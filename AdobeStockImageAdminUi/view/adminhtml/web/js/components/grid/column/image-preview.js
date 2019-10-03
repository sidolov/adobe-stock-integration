/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'underscore',
    'jquery',
    'knockout',
    'mage/translate',
    'Magento_AdobeIms/js/action/authorization',
    'Magento_AdobeUi/js/components/grid/column/image-preview',
    'Magento_AdobeStockImageAdminUi/js/model/messages',
    'Magento_AdobeStockImageAdminUi/js/media-gallery',
    'Magento_Ui/js/modal/confirm',
    'Magento_Ui/js/modal/prompt',
    'text!Magento_AdobeStockImageAdminUi/template/modal/adobe-modal-prompt-content.html',
    'Magento_AdobeIms/js/user',
    'Magento_AdobeStockAdminUi/js/config',
    'mage/backend/tabs'
], function (_, $, ko, translate, authorizationAction, imagePreview, messages, mediaGallery, confirmation, prompt, adobePromptContentTmpl, user, config) {
    'use strict';

    return imagePreview.extend({
        defaults: {
            chipsProvider: 'componentType = filtersChips, ns = ${ $.ns }',
            searchChipsProvider: 'componentType = keyword_search, ns = ${ $.ns }',
            filterChipsProvider: 'componentType = filters, ns = ${ $.ns }',
            inputValue: '',
            chipInputValue: '',
            serieFilterValue: '',
            modelFilterValue: '',
            keywordsLimit: 5,
            saveAvailable: true,
            searchValue: null,
            messageDelay: 5,
            statefull: {
                visible: true,
                sorting: true,
                lastOpenedImage: true,
                serieFilterValue: true,
                modelFilterValue: true
            },
            tracks: {
                lastOpenedImage: true
            },
            modules: {
                thumbnailComponent: '${ $.parentName }.thumbnail_url',
                chips: '${ $.chipsProvider }',
                searchChips: '${ $.searchChipsProvider }',
                filterChips: '${ $.filterChipsProvider }'
            },
            listens: {
                '${ $.provider }:params.filters': 'hide',
                '${ $.provider }:params.search': 'hide'
            },
            exports: {
                inputValue: '${ $.provider }:params.search',
                serieFilterValue: '${ $.provider }:params.filters.serie_id',
                modelFilterValue: '${ $.provider }:params.filters.model_id',
                chipInputValue: '${ $.searchChipsProvider }:value'
            }
        },

        /**
         *
         * @param {Object} record
         * @private
         */
        _initRecord: function (record) {
            if (!record.model || !record.series) {
                record.series = ko.observable([]);
                record.model = ko.observable([]);
            }
            record.keywordsLimit = ko.observable(this.keywordsLimit);
            record.canViewMoreKeywords = ko.observable(true);
        },

        /**
         * @inheritDoc
         */
        next: function (record) {
            this.hideAllKeywords(record);
            this._super(record);
        },

        /**
         * @inheritDoc
         */
        prev: function (record) {
            this.hideAllKeywords(record);
            this._super(record);
        },

        /**
         * @inheritDoc
         */
        show: function(record) {
            this._initRecord(record);
            this.hideAllKeywords(record);
            this._super(record);
            this.loadRelatedImages(record);
            this._updateHeight();
        },

        /**
         * Init observable variables
         * @return {Object}
         */
        initObservable: function () {
            this._super()
                .observe([
                    'visibility',
                    'height',
                    'inputValue',
                    'chipInputValue',
                    'serieFilterValue',
                    'modelFilterValue'
                ]);
            this.height.subscribe(function () {
                this.thumbnailComponent().previewHeight(this.height());
            }, this);

            return this;
        },

        /**
         * Get image related image series.
         *
         * @param record
         */
        loadRelatedImages: function (record) {
            $.ajax({
                type: 'GET',
                url: config.relatedImagesUrl,
                dataType: 'json',
                showLoader: true,
                data: {
                    'image_id': record.id,
                    'limit': 4
                }
            }).done(function (data) {
                record.series(data.result.same_series);
                record.model(data.result.same_model);
                this._updateHeight();
            }.bind(this));
        },

        /**
         * Return id of the row.
         *
         * @param record
         * @returns {*}
         */
        getId: function (record) {
            return record.id;
        },

        /**
         * Returns url to given record.
         *
         * @param {Object} record - Data to be preprocessed.
         * @returns {String}
         */
        getUrl: function (record) {
            return record.thumbnail_500_url;
        },

        /**
         * Returns title to given record.
         *
         * @param {Object} record - Data to be preprocessed.
         * @returns {String}
         */
        getTitle: function (record) {
            return record.title || 'Title';
        },

        /**
         * Returns author full name to given record.
         *
         * @param {Object} record - Data to be preprocessed.
         * @returns {String}
         */
        getAuthor: function (record) {
            return record.creator_name || 'Author';
        },

        /**
         * Returns attributes to display under the preview image
         *
         * @param record
         * @returns {*[]}
         */
        getDisplayAttributes: function (record) {
            return [
                {
                    name: 'Dimensions',
                    value: record.width + ' x ' + record.height + ' px'
                },
                {
                    name: 'File type',
                    value: record.content_type.toUpperCase()
                },
                {
                    name: 'Category',
                    value: record.category.name || 'None'
                },
                {
                    name: 'File #',
                    value: record.id
                }
            ];
        },

        /**
         * Returns series to display under the image
         *
         * @param record
         * @returns {*[]}
         */
        getSeries: function (record) {
            return record.series;
        },

        /**
         * Returns model to display under the image
         *
         * @param record
         * @returns {*[]}
         */
        getModel: function (record) {
            return record.model;
        },

        /**
         * Filter images from serie_id
         *
         * @param record
         * @returns {*}
         */
        seeMoreFromSeries: function(record) {
            this.serieFilterValue(record.id);
            this.filterChips().set('applied', {'serie_id' : record.id.toString()})
        },

        /**
         * Filter images from serie_id
         *
         * @param record
         * @returns {*}
         */
        seeMoreFromModel: function(record) {
            this.modelFilterValue(record.id);
            this.filterChips().set('applied', {'model_id' : record.id.toString()})
        },

        /**
         * Returns keywords to display under the attributes image
         *
         * @param record
         * @returns {*[]}
         */
        getKeywords: function (record) {
            return record.keywords;
        },

        /**
         * Returns keywords limit to show no of keywords
         *
         * @param record
         * @returns {*}
         */
        getKeywordsLimit: function (record) {
            if (!record.keywordsLimit) {
                record.keywordsLimit = ko.observable(this.keywordsLimit);
            }
            return record.keywordsLimit();
        },

        /**
         * Show all the related keywords
         *
         * @param record
         * @returns {*}
         */
        viewAllKeywords: function (record) {
            record.keywordsLimit(record.keywords.length);
            record.canViewMoreKeywords(false);
            this._updateHeight();
        },

        /**
         * Hide all the related keywords
         *
         * @param record
         * @returns {*}
         */
        hideAllKeywords: function (record) {
            record.keywordsLimit(this.keywordsLimit);
            record.canViewMoreKeywords(true);
        },

        /**
         * Check if view all button is visible or not
         *
         * @param record
         * @returns {*}
         */
        canViewMoreKeywords: function (record) {
            if (!record.canViewMoreKeywords) {
                record.canViewMoreKeywords = ko.observable(true);
            }
            return record.canViewMoreKeywords();
        },

        /**
         * Drop all filters and initiate search on keyword click event
         */
        searchByKeyWord: function (keyword) {
            _.invoke(this.chips().elems(), 'clear');
            this.inputValue(keyword);
            this.chipInputValue(keyword);
        },

        /**
         * Returns is_downloaded flag as observable for given record
         *
         * @param record
         * @returns {observable}
         */
        isDownloaded: function(record) {
            if (!ko.isObservable((record.is_downloaded))){
                record.is_downloaded = ko.observable(record.is_downloaded);
            }

            return record.is_downloaded;
        },

        /**
         * Get styles for preview
         *
         * @param {Object} record
         * @returns {Object}
         */
        getStyles: function (record) {
            if (!record.previewStyles) {
                record.previewStyles = ko.observable();
            }
            record.previewStyles({
                'margin-top': '-' + this.height()
            });
            return record.previewStyles;
        },

        /**
         * Scroll to preview window
         */
        scrollToPreview: function () {
            $(this.previewImageSelector).get(0).scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        },

        /**
         * Locate downloaded image in media browser
         *
         * @param record
         */
        locate: function (record) {
            $(config.adobeStockModalSelector).trigger('closeModal');
            mediaGallery.locate(record.path);
        },

        /**
         * Save preview
         *
         * @param {Object} record
         * @return {void}
         */
        savePreview: function (record) {
            prompt({
                title: 'Save Preview',
                content: 'File Name',
                value: this.generateImageName(record),
                imageExtension: this.getImageExtension(record),
                promptContentTmpl : adobePromptContentTmpl,
                modalClass: 'adobe-stock-save-preview-prompt',
                validation: true,
                promptField: '[data-role="promptField"]',
                validationRules: ['required-entry'],
                attributesForm: {
                    novalidate: 'novalidate',
                    action: '',
                    onkeydown: 'return event.key != \'Enter\';'
                },
                attributesField: {
                    name: 'name',
                    'data-validate': '{required:true}',
                    maxlength: '128'
                },
                context: this,
                actions: {
                    confirm: function (fileName) {
                        this.save(record, fileName, config.downloadPreviewUrl);
                    }.bind(this)
                },
                buttons: [{
                    text: $.mage.__('Cancel'),
                    class: 'action-secondary action-dismiss'
                }, {
                    text: $.mage.__('Confirm'),
                    class: 'action-primary action-accept'
                }]
            });
        },

        /**
         * Save record as image
         *
         * @param {Object} record
         * @param {String} fileName
         * @param {String} actionURI
         * @return {void}
         */
        save: function (record, fileName, actionURI) {
            var mediaBrowser = $(config.mediaGallerySelector).data('mageMediabrowser'),
                destinationPath = (mediaBrowser.activeNode.path || '') + '/' + fileName + '.' + this.getImageExtension(record);

            $(config.adobeStockModalSelector).trigger('processStart');

            $.ajax({
                type: 'POST',
                url: actionURI,
                dataType: 'json',
                data: {
                    'media_id': record.id,
                    'destination_path': destinationPath
                },
                context: this,
                success: function () {
                    record.is_downloaded(1);
                    record.path = destinationPath;
                    $(config.adobeStockModalSelector).trigger('processStop');
                    $(config.adobeStockModalSelector).trigger('closeModal');
                    mediaBrowser.reload(true);
                },
                error: function (response) {
                    $(config.adobeStockModalSelector).trigger('processStop');
                    messages.add('error', response.responseJSON.message);
                    messages.scheduleCleanup(3);
                }
            });
        },

        /**
         * Generate meaningful name image file
         *
         * @param record
         * @return string
         */
        generateImageName: function (record) {
            var imageName = record.title.substring(0, 32).replace(/\s+/g, '-').toLowerCase();
            return imageName;
        },

        getImageExtension: function (record) {
            var imageType = record.content_type.match(/[^/]{1,4}$/);
            return imageType;
        },

        /**
         * Get messages
         *
         * @return {Array}
         */
        getMessages: function () {
            return messages.get();
        },

        /**
         * License and save image
         *
         * @param {Object} record
         */
        licenseAndSave: function (record) {
            this.save(record, this.generateImageName(record), config.licenseAndDownloadUrl);
        },

        /**
         * Shows license confirmation popup with information about current license quota
         *
         * @param {Object} record
         */
        showLicenseConfirmation: function (record) {
            var licenseAndSave = this.licenseAndSave.bind(this);
            $(config.adobeStockModalSelector).trigger('processStart');
            $.ajax(
                {
                    type: 'POST',
                    url: config.quotaUrl,
                    dataType: 'json',
                    data: {
                        'media_id': record.id
                    },
                    context: this,

                    success: function (response) {
                        var quota = response.result.quota,
                            confirmationContent = $.mage.__('License "' + record.title + '"'),
                            quotaMessage = response.result.message;
                        $(config.adobeStockModalSelector).trigger('processStop');
                        confirmation({
                            title: $.mage.__('License Adobe Stock Image?'),
                            content: confirmationContent + '<p><b>' + quotaMessage + '</b></p>',
                            actions: {
                                confirm: function () {
                                    if (quota > 0) {
                                        licenseAndSave(record);
                                    } else {
                                        window.open(config.buyCreditsUrl);
                                    }
                                }
                            },
                            buttons: [{
                                text: $.mage.__('Cancel'),
                                class: 'action-secondary action-dismiss',
                                click: function () {
                                    this.closeModal();
                                }
                            }, {
                                text: quota > 0 ? $.mage.__('OK') : $.mage.__('Buy Credits'),
                                class: 'action-primary action-accept',
                                click: function () {
                                    this.closeModal();
                                    this.options.actions.confirm();
                                }
                            }]
                        })
                    },

                    error: function (response) {
                        $(config.adobeStockModalSelector).trigger('processStop');
                        messages.add('error', response.responseJSON.message);
                        messages.scheduleCleanup(3);
                    }
                }
            );
        },

        /**
         * Process of license
         *
         * @param {Object} record
         */
        licenseProcess: function (record) {
            if (user.isAuthorized()) {
                this.showLicenseConfirmation(record);

                return;
            }

            /**
             * Opens authorization window of Adobe Stock
             * then starts the authorization process
             */
            authorizationAction()
                .then(function (result) {
                    this.licenseProcess(record);
                    messages.add('success', result.lastAuthSuccessMessage);
                }.bind(this))
                .catch(function (error) {
                    messages.add('error', error.message);
                })
                .finally((function () {
                    messages.scheduleCleanup(this.messageDelay);
                }).bind(this));
        }
    });
});
