var modelsDomain = angular.module('SolariMonitor.models', []);

modelsDomain.factory('DynamicItems', function () {

  function DynamicItems(items) {
    /** @type {!Object<?Array>} Data pages, keyed by page number (0-index). */
    this.loadedPages = {};

    /** @type {number} Total number of items. */
    this.numItems = 0;

    /** @const {number} Number of items to fetch per request. */
    this.PAGE_SIZE = 20;

    /** @type {Array} Items data. */
    this._items = items;

    this.fetchNumItems_();
  };

  // Required.
  DynamicItems.prototype.getItemAtIndex = function (index) {
    var pageNumber = Math.floor(index / this.PAGE_SIZE);
    var page = this.loadedPages[pageNumber];

    if (page) {
      return page[index % this.PAGE_SIZE];
    }

    this.fetchPage_(pageNumber);
    page = this.loadedPages[pageNumber];
    if (page) {
      return page[index % this.PAGE_SIZE];
    }

    return null;
  };

  // Required.
  DynamicItems.prototype.getLength = function () {
    return this.numItems;
  };

  DynamicItems.prototype.fetchPage_ = function (pageNumber) {
    // Set the page to null so we know it is already being fetched.
    this.loadedPages[pageNumber] = null;

    this.loadedPages[pageNumber] = [];
    var pageOffset = pageNumber * this.PAGE_SIZE;
    for (var i = pageOffset; i < pageOffset + this.PAGE_SIZE; i++) {
      this.loadedPages[pageNumber].push(this._items[i]);
    }
  };

  DynamicItems.prototype.fetchNumItems_ = function () {
    this.numItems = this._items.length;
  };

  DynamicItems.prototype.reset = function (items) {
    this._items = items;
    this.loadedPages = {};
    this.fetchNumItems_();
  };

  return DynamicItems;
});
