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
      this.listenToOnce(this.questions, 'add', this.start);
      this.download();
      return this;
    },
    close: function(){
      this.questionView && this.questionView.close();
      this.panelView.remove();
      this.remove();
    },
    download: function(){
      throw new Error('Not implemented');
    },
    start: function(){
      this.preQuiz && this.preQuiz();
      this.play();
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
      this.postQuestion && this.postQuestion();
      var current = this.currentQuestion;
      var showAnswer = (this.config.show_answer || false),
          timeout = current.get('timeout'),
          message = timeout ? '亲，回答超时，注意答题时间哦~' : (
            current.isCorrect() ? '亲，答题正确，好厉害哦~' : '亲，答题错误。'
          )
          emotion = timeout ? 'sweat' : (
            current.isCorrect() ? 'tongue' : 'tears'
          );
      showAnswer && (message += "正确答案:" + current.getAnswerCodes().join() + '。');
      if(this.hasNext()){
        app.modal({
          message: message,
          button: { text: "下一题" },
          emotion: emotion,
          callback: _.bind(this.play, this)
        });
      } else {
        app.modal({
          message: message + "游戏结束",
          button: { text: "查看结果" },
          emotion: emotion,
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
    }, app.DOWNLOAD_TIMEOUT),
    hasNext: function(){
      return this.questions.any({'answered': false});
    }
  });

  // for those modes which need to download questions continuously
  app.ContinuousQuizView = app.QuizBaseView.extend({
    download: _.throttle(function(){
      if(_.isEmpty(this.unloadedFiles)){
        var files = _.clone(this.config.question_files);
        this.unloadedFiles = _(files).chain().values().flatten().shuffle().value();
      }
      if (navigator.onLine) {
        var file = this.unloadedFiles.pop();
        $.ajax({
          dataType: "json",
          url: this.gameDataRoot + file,
          timeout: app.DOWNLOAD_TIMEOUT
        }).done(_.bind(function(data){
          this.questions.add(data.objects);
        }, this));
      }
    }, app.DOWNLOAD_TIMEOUT),
    postQuestion: function(){
      var unanswered = this.questions.filter({'answered': false});
      if(unanswered.length < app.DOWNLOAD_TRIGGER) this.download();
    },
  });

  app.TimeLimitQuizView = app.ContinuousQuizView.extend({
    preQuiz: function(){
      this.startTime = new Date();
    },
    hasNext: function(){
      var limit = this.config.time_per_quiz;
          current = new Date();
      console.log('time limit', limit, (current - this.startTime)/1000);
      return current - this.startTime < limit * 1000;
    }
  });

  app.ChallengeQuizView = app.ContinuousQuizView.extend({
    hasNext: function(){
      return this.currentQuestion.isCorrect();
    }
  });

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
