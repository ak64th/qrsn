(function(root, _, Backbone){
  app = root.app || {};

  app.RankView = Backbone.View.extend({
    tagName: 'div',
    className: 'rank',
  });

  root.app = app;
  return app;
})(this, _, Backbone);
