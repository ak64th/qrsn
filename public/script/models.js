(function(root, Backbone){
  app = root.app || {};

  app.Option = Backbone.Model.extend({});

  app.Question = Backbone.Model.extend({
    defaults: {
      "selected": [],
      "timeout":  false,
      "answered": false
    },
    isCorrect: function(){
      if (!this.get('answered')) return false;
      var answer = this.get('answer');
      var selected = _(this.get('selected')).pluck('id');
      if(answer && selected && answer.length === selected.length){
        return _.difference(answer, selected).length === 0;
      }
      return false;
    }
  });

  app.OptionCollection = Backbone.Collection.extend({model: app.Option});

  app.QuestionCollection = Backbone.Collection.extend({
    model: app.Question,
    totalPoints: function(){
      var total = _(this.models).chain()
      .filter(function(model){
        return model.isCorrect();
      }).map('attributes')
      .pluck('point')
      .reduce(function(sum, point){
        return sum + point;
      }).value();
      return total;
    }
  });

  root.app = app;
  return app;
})(window, Backbone);
