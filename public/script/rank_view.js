(function(root, _, Backbone){
  app = root.app || {};

  app.RankView = Backbone.View.extend({
    tagName: 'div',
    className: 'rank',
    template: _.template($('#tpl_rank').html()),
  });

  root.app = app;
  return app;
})(this, _, Backbone);
