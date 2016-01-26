(function(root, $, _, Backbone){

  app = root.app || {};

  app.QuizBaseView = Backbone.View.extend({
    tagName: 'div',
    initialize: function(options){
      this.config = options.config;
      this.gameDataRoot = options.gameDataRoot;
      this.questions = new app.QuestionCollection();
      this.answered = new app.QuestionCollection();
    },
    render: function(){
      // init a panel for rendering current points and answered questions number
      this.panelView = new app.QuizPanelView({answered: this.answered});
      this.$el.append(this.panelView.render().el);
      // Once get a question start the quiz
      this.listenToOnce(this.questions, 'add', this.play);
      this.download();
      return this;
    },
    answer: function(model, collection, options) {
      console.log('answered', model);
      //Todo: ajax to server
    },
    download: function(){
      throw new Error('Unimplemented method');
    },
    play: function(){
      this.currentQuestion = this.questions.shift();
      this.preQuestion && this.preQuestion(this.currentQuestion);
      this.questionView = new app.QuestionView({
        model: this.currentQuestion,
        timeLimit: this.config.time_per_question
      });
      this.listenToOnce(this.questionView, 'answered', answered);
    },
    answered: function(answered){
      this.postQuestion && this.postQuestion(answered);
      this.answered.add(answered);
      var showAnswer = this.config.show_answer || false;
      var timeout = answered.timeout || false;
      var message = timeout ? '亲，回答超时，注意答题时间哦~' : (
        answered.isCorrect ? '亲，答题正确，好厉害哦~' : '亲，答题错误。'
      );
      if(showAnswer){
        message += "正确答案:" + _.map(answerOptions, function(model){
          return model.get('code');
        }).join() + '。';
      }
      if(this.hasNext()){
        app.modal({
          message: message,
          button: { text: "下一题" },
          callback: _.bind(this.changeQuestion, this)
        });
      } else {
        app.modal({
          message: message + "游戏结束",
          button: { text: "查看结果" },
          callback: _.bind(function(){
            this.trigger('finishQuiz');
          }, this)
        });
      }
    },
    hasNext: function(){
      throw new Error('Unimplemented method');
    }
  });

  app.OrdinaryQuizView = app.QuizBaseView.extend({

  });
  app.TimeLimitQuizView = app.QuizBaseView.extend({});
  app.ChallengeQuizView = app.QuizBaseView.extend({});

  app.QuizPanelView = Backbone.View.extend({
    tagName: 'div',
    className: 'quiz_panel',
    template: _.template($('#tpl_quiz_panel').html()),
    initialize: function(options){
      this.answered = options.answered
      this.listenTo(this.answered, 'update', this.render);
    },
    render: function(){
      console.log(this.answered.filter({'isCorrect': true}));
      this.$el.html(this.template({answered: this.answered}));
      return this;
    }
  });

  root.app = app;
  return app;
})(this, $, _, Backbone);
