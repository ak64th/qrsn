(function(root, _, Backbone){
  app = root.app || {};

  app.RankView = Backbone.View.extend({
    tagName: 'div',
    className: 'rank',
    template: _.template($('#tpl_rank').html()),
    render: function(){
      this.$el.html(this.template({
        points:0,
        maxPoints:0,
        bestPoints:100,
        rank:2,
        bestRank:1
      }));
      return this;
    }
  });

  root.app = app;
  return app;
})(this, _, Backbone);
