(function(root, $, _, Backbone) {
  app = root.app || {};

  app.ApplicationView = Backbone.View.extend({
    el: $('#app_container'),
    dataRoot: '/data/',
    apiRoot: '/rest/',
    initialize: function(options) {
      this.game_code = options.game_code;
      this.gameDataRoot = this.dataRoot + this.game_code + '/';
      this.quizConfig = options.config;
    },
    run: function() {
      var errorView;
      var used = parseInt(localStorage.getItem(this.game_code + '_count')) || 0,
        max = parseInt(this.quizConfig.max_chances);
      if (used > max) {
        errorView = new app.RejectionNoMoreChanceView();
      } else {
        var now = new Date(),
          start_at = new Date(this.quizConfig.start_at),
          end_at = new Date(this.quizConfig.end_at);
        if (now < start_at) {
          errorView = new app.RejectionTooEarlyView();
        } else if (now > end_at) {
          errorView = new app.RejectionTooLateView();
        }
      };
      if (errorView) {
        this.loadView(errorView);
      } else {
        this.prepareQuiz();
      }
    },
    loadView: function(view) {
      this.view && (this.view.close ? this.view.close() : this.view.remove());
      this.view = view;
      this.$el.append(this.view.render().el);
    },
    loadStyle: function(){
      var style, quizType = this.quizConfig['type'];
      switch (quizType) {
        case app.QUIZ_TYPE.ORDINARY:
          style = 'theme1/style/main.css';
          break;
        case app.QUIZ_TYPE.TIME_LIMIT:
          style = 'theme2/style/main.css';
          break;
        case app.QUIZ_TYPE.CHALLENGE:
          style = 'theme3/style/main.css';
          break;
        default:
          throw new Error('Unknown Quiz Type');
      }
      console.log('style', style);
      $('head').append('<link rel="stylesheet" type="text/css" href="' + style + '"/>');
    },
    prepareQuiz: function() {
      var view = new app.WelcomeView({
        content: this.quizConfig.welcome,
        infoFields: this.quizConfig.info_fields,
        quizId: this.quizConfig.id
      });
      this.listenToOnce(view, 'startQuiz', this.startQuiz);
      this.loadView(view);
    },
    startQuiz: function(args) {
      // console.log(_.object(args));
      //Todo: send args to server

      var ViewClass, quizType = this.quizConfig['type'];
      var style = '';
      switch (quizType) {
        case app.QUIZ_TYPE.ORDINARY:
          ViewClass = app.OrdinaryQuizView;
          break;
        case app.QUIZ_TYPE.TIME_LIMIT:
          ViewClass = app.TimeLimitQuizView;
          break;
        case app.QUIZ_TYPE.CHALLENGE:
          ViewClass = app.ChallengeQuizView;
          break;
        default:
          throw new Error('Unknown Quiz Type');
      }
      var view = new ViewClass({
        config: this.quizConfig,
        gameDataRoot: this.gameDataRoot
      });
      var used = parseInt(localStorage.getItem(this.game_code + '_count')) || 0;
      localStorage.setItem(this.game_code + '_count', used + 1);
      this.listenToOnce(view, 'finishQuiz', this.finishQuiz);
      this.loadView(view);
    },
    finishQuiz: function() {
      console.log("结束");
      //Todo: send data to server
      var view = new app.RankView();
      this.loadView(view);
    }
  });

  root.app = app;
  return app;
})(this, $, _, Backbone);
