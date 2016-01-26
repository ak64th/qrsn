(function(root, Backbone){
  app = root.app || {};

  app.Option = Backbone.Model.extend({});

  app.Question = Backbone.Model.extend({});

  app.Answered = app.Question.extend({
    defaults: {
      "selected": [],
      "timeout":  false
    },
    isCorrect: function(){
      var answer = this.answer;
      var selected = this.selected;
      if(answer && selected && answer.length === selected.length){
        return _.difference(answer, selected).length === 0;
      }
      return false;
    }
  });

  app.OptionCollection = Backbone.Collection.extend({model: app.Option});

  app.QuestionCollection = Backbone.Collection.extend({model: app.Question});

  app.AnsweredCollection = Backbone.Collection.extend({
    model: app.Answered
    totalPoints: function(){
      var total = _(this.models).chain()
      .filter(function(model){
        return model.isCorrect();
      }).map('attributes')
      .pluck('point')
      .reduce(function(sum, point){
        return sum + point;
      }).value;
      return total;
    }
  });

  root.app = app;
  return app;
})(window, Backbone);
