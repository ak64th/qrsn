var app = (function($, _, Backbone){
  app = {};

  app.QUESTION_TYPE = {
    MULTI: 'multi',
    SINGLE: 'single'
  };

  app.QUIZ_TYPE = {
    ORDINARY: 'ordinary',
    TIME_LIMIT: 'time_limit',
    CHALLENGE: 'challenge'
  };

  app.ModalView = Backbone.View.extend({
    tagName: 'div',
    className: 'modal_container',
    template: _.template($('#tpl_modal').html()),
    events: {
      'click .submit': 'close'
    },
    initialize: function(options){
      this.options = options;
      this.callback = options.callback;
    },
    render: function(){
      this.$el.html(this.template(this.options));
      this.$('.dialogue').css({
        'top': ($(window).height() - this.$el.height()) / 2
      });
      return this;
    },
    close: function(){
      _.isFunction(this.callback) && this.callback();
      this.remove();
    }
  });

  app.modal = function(options){
    var view = new app.ModalView(options);
    $('body').append(view.render().el);
  };

  app.Option = Backbone.Model.extend({});

  app.Question = Backbone.Model.extend({});

  app.Answered = Backbone.Model.extend({});

  app.QuestionCollection = Backbone.Collection.extend({
    model: app.Question
  });

  app.OptionCollection = Backbone.Collection.extend({
    model: app.Option
  });

  app.AnsweredCollection = Backbone.Collection.extend({
    model: app.Answered
  });

  app.QuizView = Backbone.View.extend({
    tagName: 'div',
    initialize: function(options){
      this.config = options.config;
      this.gameDataRoot = options.gameDataRoot;
      this.answered = new app.AnsweredCollection();
      this.panelView = new app.QuizPanelView({answered: this.answered});
      this.$el.append(this.panelView.render().el);
      this.listenTo(this.answered, 'add', function(model, collection, options) {
        console.log('answered', model);
      });
      $.getJSON(data_url_root + '1.json').then(_.bind(function(data){
        this.questions = new app.QuestionCollection(data.objects);
        this.changeQuestion();
      }, this));
    },
    changeQuestion: function(){
      this.currentQuestion = this.questions.shift();
      this.questionView && this.questionView.remove();
      this.startQuestion(this.currentQuestion);
    },
    startQuestion: function(question){
      this.questionView = new app.QuestionView({
        model: question,
        timeLimit: this.config.time_per_question
      });
      this.listenToOnce(this.questionView, 'finish', this.finishQuestion);
      this.listenToOnce(this.questionView, 'timeout', this.questionTimeout)
      this.$el.append(this.questionView.render().el);
    },
    finishQuestion: function(answerOptions, selectedOptions, isCorrect, timeout){
      var point = this.config.question_points[this.currentQuestion.get('type')];
      var a = new app.Answered({
        'question_id': this.currentQuestion.id,
        'selected': _.pluck(selectedOptions, 'id').join(),
        'isCorrect': isCorrect,
        'point': point
      });
      this.answered.add(a);
      var showAnswer = this.config.show_answer || false;
      var timeout = timeout || false;
      var message = timeout ? '亲，回答超时，注意答题时间哦~' : (
        isCorrect ? '亲，答题正确，好厉害哦~' : '亲，答题错误。'
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
    questionTimeout: function(answer){
      this.finishQuestion(answer, [], false, true);
    },
    hasNext: function(){
      return this.questions.length > 0;
    },
    close: function(){
      this.panelView.remove();
      this.remove();
    }
  });

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

  app.QuestionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question',
    template: _.template($('#tpl_question').html()),
    events: {
      'click .submit': 'onSubmit'
    },
    initialize: function(options){
      var optionData = this.model.get('options');
      var questionOptions =  new app.OptionCollection(optionData);
      questionOptions.each(function(model, index){
        model.set('code' , String.fromCharCode(65 + index));
      });
      this.model.set('options', questionOptions);
      this.listenTo(questionOptions, 'change:checked', this.toggleChecked);
      this.timeLimit = options.timeLimit || 0;
    },
    render: function(){
      var data = this.model.toJSON();
      data.timeLimit = this.timeLimit;
      this.$el.html(this.template(data));
      this.renderAllOptions();
      this.startTimer();
      return this;
    },
    renderOption: function(model){
      if(this.model.get('type') == app.QUESTION_TYPE.MULTI){
        var ViewClass = app.MultiSelectionView
      } else {
        var ViewClass = app.SingleSelectionView
      }
      var view = new ViewClass({model:model});
      this.$('.option_list').append(view.render().el);
    },
    renderAllOptions: function(){
      var questionOptions = _.shuffle(this.model.get('options').models);
      _.each(questionOptions, this.renderOption, this);
      return this;
    },
    toggleChecked: function(model){
      if(this.model.get('type') == app.QUESTION_TYPE.MULTI){
        this.selectedOptions = this.model.get('options').filter('checked');
      } else {
        this.selectedOptions = [ model ];
      }
    },
    submit: function(){
      var options = this.model.get('options');
      var answer = this.model.get('answer');
      var selected = _.pluck(this.selectedOptions, 'id');
      var isCorrect = this.checkAnswer(answer, selected);
      this.trigger('finish',
        _(answer).map(function(id){ return options.get(id); }),
        this.selectedOptions, isCorrect);
    },
    onSubmit: function(){
      if (!_.isEmpty(this.selectedOptions)){
        this.timer && clearInterval(this.timer);
        this.submit();
      }
    },
    onTimeout: function(){
      this.timer && clearInterval(this.timer);
      if (_.isEmpty(this.selectedOptions)){
        var answer = this.model.get('answer');
        this.trigger('timeout', answer);
      } else {
        this.submit();
      }
    },
    checkAnswer: function(answer, selected){
      if(answer && selected && answer.length === selected.length){
        return _.difference(answer, selected).length === 0;
      }
      return false;
    },
    startTimer: function(){
      this.timer = this.timeLimit && this.createTimer(this.timeLimit) || null;
      return this.timer;
    },
    createTimer: function(timeLimit){
      var counter = 0;
      var timeLimit = timeLimit;
      var timer = setInterval(_.bind(function(){
        counter++;
        console.log("counter #", counter, timeLimit);
        if (counter >= timeLimit) {
          this.onTimeout();
        };
        this.$('.timer').html( timeLimit - counter );
      }, this), 1000);
      return timer;
    },
    close: function(){
      this.remove();
    }
  });

  app.OptionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question_option',
    events: {
      'change input': 'toggle'
    },
    render: function(){
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    toggle: function(){
      console.log('toggle event triggered');
      var checked = this.model.get('checked');
      this.model.set('checked', !checked);
      console.log(this.model.toJSON());
    },
  });

  app.SingleSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_single').html())
  });

  app.MultiSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_multi').html())
  });

  app.RejectionView = Backbone.View.extend({
    render: function(){
      this.$el.html(this.template());
      return this;
    }
  });

  app.RejectionTooEarlyView = app.RejectionView.extend({
    template: _.template($('#tpl_too_early').html())
  });

  app.RejectionTooLateView = app.RejectionView.extend({
    template: _.template($('#tpl_too_late').html())
  });

  app.RejectionNoMoreChanceView = app.RejectionView.extend({
    template: _.template($('#tpl_no_more_chance').html())
  });

  app.WelcomeView = Backbone.View.extend({
    tagName: 'div',
    className: 'welcome',
    template: _.template($('#tpl_welcome').html()),
    events: {
      'click .submit': 'onSubmit',
    },
    initialize: function(options){
      this.content = options.content;
      this.infoFields = options.infoFields;
      this.quizId = options.quizId;
    },
    render: function(){
      this.$el.html(this.template({
        content: this.content,
        infoFields: this.infoFields
      }));
      return this;
    },
    onSubmit: function(e){
      var field_keys = _.unzip(this.infoFields)[0];
      var validated = false;
      var field_data = [];
      if (field_keys.length){
        validated = _(this.$('input')).chain()
        .filter(function(input){
          return _(field_keys).indexOf(input.name) >= 0;
        }).every(function(input){
          if (input.value.length > 0){
            field_data.push([input.name, input.value])
            localStorage.setItem(input.name, input.value);
            return true;
          }
          return false;
        }).value();
      } else {
        validated = true;
      }
      if(validated){
        this.trigger('startQuiz', field_data);
      } else {
        app.modal({
          message: "亲，需填完信息才能开始哦~",
          button: { text: "关闭" }
        });
      }
    }
  });

  app.RankView = Backbone.View.extend({
    tagName: 'div',
    className: 'rank',
  });

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
      console.log(args);
      var view = new app.QuizView({
        config: this.quizConfig,
        gameDataRoot: this.gameDataRoot
      });
      this.listenToOnce(view, 'finishQuiz', this.finishQuiz);
      this.loadView(view);
    },
    finishQuiz: function(){
      console.log("结束");
    }
  });

  return app;
})($, _, Backbone);
