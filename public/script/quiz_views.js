(function(root, $, _, Backbone){

  app = root.app || {};

  app.QuizBaseView = Backbone.View.extend({
    tagName: 'div',
    initialize: function(options){
      this.config = options.config;
      this.gameDataRoot = options.gameDataRoot;
      this.questions = new app.QuestionCollection();
    },
    render: function(){
      // init a panel for rendering current points and answered questions number
      this.panelView = new app.QuizPanelView({
        collection: this.questions,
        config: this.config
      });
      this.$el.append(this.panelView.render().el);
      // Once get a question start the quiz
      this.listenToOnce(this.questions, 'add', this.play);
      this.download();
      return this;
    },
    download: function(){
      throw new Error('Not implemented');
    },
    play: function(){
      this.currentQuestion = _.sample(this.questions.filter({'answered': false}));
      this.preQuestion && this.preQuestion();
      this.questionView && this.questionView.remove();
      this.questionView = new app.QuestionView({
        model: this.currentQuestion,
        timeLimit: this.config.time_per_question
      });
      this.listenToOnce(this.questionView, 'finish', this.finishQuestion);
      this.$el.append(this.questionView.render().el);
      console.log(this.currentQuestion.getAnswerCodes().join());
    },
    finishQuestion: function(){
      //Todo: ajax to server
      var current = this.currentQuestion;
      var showAnswer = (this.config.show_answer || false),
          timeout = current.get('timeout'),
          message = timeout ? '亲，回答超时，注意答题时间哦~' : (
            current.isCorrect() ? '亲，答题正确，好厉害哦~' : '亲，答题错误。'
          );
      this.postQuestion && this.postQuestion();
      showAnswer && (message += "正确答案:" + current.getAnswerCodes().join() + '。');
      if(this.hasNext()){
        app.modal({
          message: message,
          button: { text: "下一题" },
          callback: _.bind(this.play, this)
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
      throw new Error('Not implemented');
    }
  });

  app.OrdinaryQuizView = app.QuizBaseView.extend({
    download: _.throttle(function(){
      // save the unloaded files
      if(!this.unloadedFiles){
        var files = _.clone(this.config.question_files);
        this.unloadedFiles = _.mapObject(files, function(val){
          return _.shuffle(val);
        })
      }
      var loadedCount = this.questions.countBy('type');
      var neededType = _.findKey(this.config.count, function(count, type){
        var loaded = loadedCount[type] || 0;
        // console.log('type:' + type +' loaded:'+loaded+' need:'+count);
        return loaded < count;
      });
      if (!neededType) return this.questions;
      // download files only when internet is accessable
      if (navigator.onLine) {
        var neededCount = this.config.count[neededType] - (loadedCount[neededType] || 0);
        var file = this.unloadedFiles[neededType].pop();
        $.ajax({
          dataType: "json",
          url: this.gameDataRoot + file,
          timeout: app.DOWNLOAD_TIMEOUT
        }).done(_.bind(function(data){
          var toAdd = _.sample(data.objects, neededCount);
          this.questions.add(toAdd);
        }, this));
      }
      // download more
      this.download();
    }, app.DOWNLOAD_TIMEOUT + 300),
    hasNext: function(){
      return this.questions.any({'answered': false});
    }
  });

  app.TimeLimitQuizView = app.QuizBaseView.extend({});
  app.ChallengeQuizView = app.QuizBaseView.extend({});

  app.QuizPanelView = Backbone.View.extend({
    tagName: 'div',
    className: 'quiz_panel',
    template: _.template($('#tpl_quiz_panel').html()),
    initialize: function(options){
      this.config = options.config;
      this.listenTo(this.collection, 'change:answered', this.render);
    },
    render: function(){
      var count = this.collection.filter({'answered': true}).length,
          questionPoints = this.config.question_points;
      var points = this.collection.totalPoints(questionPoints);
      this.$el.html(this.template({count: count, points: points}));
      return this;
    },
  });

  root.app = app;
  return app;
})(this, $, _, Backbone);
