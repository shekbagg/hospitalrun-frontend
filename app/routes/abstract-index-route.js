import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import Ember from 'ember';
import PouchDbMixin from 'hospitalrun/mixins/pouchdb';
import ProgressDialog from 'hospitalrun/mixins/progress-dialog';
export default Ember.Route.extend(PouchDbMixin, ProgressDialog, AuthenticatedRouteMixin, {
  database: Ember.inject.service(),
  i18n: Ember.inject.service(),
  filterParams: null,
  firstKey: null,
  hideNewButton: false,
  itemsPerPage: 25,
  modelName: null,
  newButtonAction: null,
  newButtonText: null,
  nextStartKey: null,
  pageTitle: Ember.computed('routeName', function() {
    let i18n = this.get('i18n');
    let route = this.get('routeName').split('.');
    return i18n.t(`${route[0]}.index.title`);
  }),

  _getFilterParams(params) {
    let filterByList = [];
    let filterParams = this.get('filterParams');
    if (!Ember.isEmpty(filterParams)) {
      filterParams.forEach(function(paramName) {
        if (!Ember.isEmpty(params[paramName])) {
          filterByList.push({
            name: paramName,
            value: params[paramName]
          });
        }
      });
    }
    return filterByList;
  },

  _getMaxPouchId() {
    return this.get('database').getMaxPouchId(this.get('modelName').camelize());
  },

  _getMinPouchId() {
    return this.get('database').getMinPouchId(this.get('modelName').camelize());
  },

  _getPouchIdFromItem(item) {
    return this.get('database').getPouchId(item.get('id'), this.get('modelName').camelize());
  },

  _getStartKeyFromItem(item) {
    return item.get('id');
  },

  _modelQueryParams() {
    return {};
  },

  model(params) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      let filterParams = this._getFilterParams(params);
      let modelName = this.get('modelName');
      let itemsPerPage = this.get('itemsPerPage');
      let queryParams = this._modelQueryParams(params);
      if (!Ember.isEmpty(params.sortKey)) {
        queryParams.sortKey = params.sortKey;
        if (!Ember.isEmpty(params.sortDesc)) {
          queryParams.sortDesc = params.sortDesc;
        }
      }
      if (!Ember.isEmpty(filterParams)) {
        queryParams.filterBy = filterParams;
      }
      if (Ember.isEmpty(queryParams.options)) {
        queryParams.options = {};
      }
      queryParams.options.limit = itemsPerPage + 1;
      if (!Ember.isEmpty(params.startKey)) {
        queryParams.options.startkey = params.startKey;
      }
      this.store.query(modelName, queryParams).then(function(model) {
        if (model.get('length') > 0) {
          this.set('firstKey', this._getStartKeyFromItem(model.get('firstObject')));
        }
        if (model.get('length') > itemsPerPage) {
          let lastItem = model.popObject();
          this.set('nextStartKey', this._getStartKeyFromItem(lastItem));
        } else {
          this.set('nextStartKey');
        }
        resolve(model);
      }.bind(this), reject);
    }.bind(this));
  },

  queryParams: {
    sortDesc: { refreshModel: true },
    sortKey: { refreshModel: true },
    startKey: { refreshModel: true }
  },

  setupController(controller, model) {
    let props = this.getProperties('firstKey', 'nextStartKey');
    controller.setProperties(props);
    let sectionDetails = {
      currentScreenTitle: this.get('pageTitle')
    };
    if (this.get('hideNewButton')) {
      sectionDetails.newButtonAction = null;
    } else if (!Ember.isEmpty(this.get('newButtonAction'))) {
      sectionDetails.newButtonAction = this.get('newButtonAction');
    }
    if (!Ember.isEmpty(this.get('newButtonText'))) {
      sectionDetails.newButtonText = this.get('newButtonText');
    }
    this.send('setSectionHeader', sectionDetails);
    this.closeProgressModal();
    this._super(controller, model);
  }
});
