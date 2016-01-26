(function(root, $, _, Backbone){
  app = root.app || {};

  app.ApplicationView = Backbone.View.extend({
    el: $('#app_container'),
    dataRoot: '/data/',
    apiRoot: '/rest/',
    initialize: function(options){
      this.game_code = options.game_code;
      this.gameDataRoot = this.dataRoot + this.game_code + '/';
      this.quizConfig = options.config;
    },
    loadView: function(view){
      this.view && (this.view.close ? this.view.close() : this.view.remove());
      this.view = view;
      this.$el.append(this.view.render().el);
    },
    prepareQuiz: function(){
      var view = new app.WelcomeView({
        content: this.quizConfig.welcome,
        infoFields: this.quizConfig.info_fields,
        quizId: this.quizConfig.id
      });
      this.listenToOnce(view, 'startQuiz', this.startQuiz);
      this.loadView(view);
    },
    startQuiz: function(args){
      console.log(_.object(args));
      //Todo: send args to server

      var ViewClass, quizType = this.quizConfig['type'];
      switch (quizType) {
        case app.QUIZ_TYPE.ORDINARY:
          console.log(app.QUIZ_TYPE.ORDINARY);
          ViewClass = app.OrdinaryQuizView;
          break;
        case app.QUIZ_TYPE.TIME_LIMIT:
          ViewClass = app.TimeLimitQuizView;
          break;
        case app.QUIZ_TYPE.ORDINARY:
          ViewClass = app.ChallengeQuizView;
          break;
        default: throw new Error('Unknown Quiz Type');
      }
      var view = new ViewClass({
        config: this.quizConfig,
        gameDataRoot: this.gameDataRoot
      });
      this.listenToOnce(view, 'finishQuiz', this.finishQuiz);
      this.loadView(view);
    },
    finishQuiz: function(){
      console.log("结束");
      //Todo: send data to server
      var view = new app.RankView();
      this.loadView(view);
    }
  });

  root.app = app;
  return app;
})(this, $, _, Backbone);
