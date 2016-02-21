(function(root, $, _, Backbone){

  app = root.app || {};

  app.QuizBaseView = Backbone.View.extend({
    tagName: 'div',
    className: 'quiz',
    template: _.template($('#tpl_quiz').html()),
    initialize: function(options){
      this.config = options.config;
      this.gameDataRoot = options.gameDataRoot;
      this.questions = new app.QuestionCollection();
      this.timeLimit = this.config.time_per_question || null;
    },
    render: function(){
      this.$el.html(this.template({timeLimit: this.timeLimit}));
      // Once get a question start the quiz
      this.listenToOnce(this.questions, 'add', this.start);
      this.listenTo(this.questions, 'change:answered', this.updatePanel);
      this.download();
      return this;
    },
    close: function(){
      this.questionView && this.questionView.close();
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
      this.questionView = new app.QuestionView({model: this.currentQuestion});
      this.listenToOnce(this.questionView, 'finish', this.finishQuestion);
      this.$el.append(this.questionView.render().el);
      if(this.timeLimit) this.startTimer();
      console.log(this.currentQuestion.getAnswerCodes().join());
    },
    updatePanel: function(){
      var count = this.questions.filter({'answered': true}).length,
          questionPoints = this.config.question_points;
      var points = this.questions.totalPoints(questionPoints);
      this.$('#count').html(count);
      this.$('#points').html(points);
      console.log('update panel', count, points);
    },
    finishQuestion: function(){
      //Todo: ajax to server
      this.clearTimer();
      this.postQuestion && this.postQuestion();
      var current = this.currentQuestion,
          showAnswer = (this.config.show_answer || false),
          timeout = current.get('timeout'),
          message = current.isCorrect() ? '亲，答题正确，好厉害哦~' : (
             timeout ? '亲，回答超时，注意答题时间哦~' : '亲，答题错误。'
          ),
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
    startTimer: function(){
      var counter = 0, timeLimit = this.timeLimit;
      var callback = function(){
        remaining = timeLimit - ++counter;
        function formatSeconds(seconds){
          var minutes = parseInt(seconds / 60);
          var seconds = seconds % 60;
          var formated = _.map([minutes, seconds], function(s){
            if (s > 9) return '' + s;
            return '0' + s;
          })
          return formated.join(':');
        }
        this.$('#timer').html( formatSeconds(remaining) );
        if (remaining < 1) this.timeout();
      };
      this.timer = setInterval(_.bind(callback, this), 1000);
    },
    timeout: function(){
      this.clearTimer();
      this.questionView.trigger('timeout');
    },
    clearTimer: function(){
      this.timer && clearInterval(this.timer);
      this.timer = null;
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

  root.app = app;
  return app;
})(this, $, _, Backbone);
